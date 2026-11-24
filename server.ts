import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { z } from 'zod';
import {
  ASSESSMENT_BANK,
  CAREER_CATALOG,
  VERIFIED_RESOURCES,
  buildDefaultStagesForCareer,
} from './src/data/catalog.ts';
import {
  createUserProject,
  db,
  deleteUserAccount,
  ensureConversation,
  exportAllUserData,
  getActiveUserRoadmap,
  getBookmarkedResourceIds,
  getConversationMessages,
  getRoadmapById,
  getUserById,
  getUserPreferences,
  initDatabase,
  listAssessmentAttempts,
  listConversations,
  listLearningActivity,
  listRoadmapVersions,
  listUserProjects,
  listUserRoadmaps,
  logLearningActivity,
  recordAssessmentAttempt,
  restoreRoadmapVersion,
  saveMentorMessage,
  saveNewRoadmap,
  saveRoadmapVersionSnapshot,
  saveUserPreferences,
  seedStarterWorkspaceForUser,
  toggleBookmark,
  toggleProjectMilestone,
  updateRoadmapSkillStatus,
  updateUserProjectStatus,
} from './src/db/database.ts';
import {
  generateProjectWithAI,
  generateStructuredRoadmapWithAI,
  isGeminiConfigured,
  streamMentorReplyWithAI,
} from './src/server/ai.ts';
import {
  clearUserSession,
  completePasswordReset,
  createUserSession,
  issuePasswordReset,
  registerAccount,
  requireAuth,
  resolveAuthenticatedUser,
  verifyEmailCode,
  verifyMutationOrigin,
  verifyPassword,
  type AuthenticatedRequest,
} from './src/server/auth.ts';
import { buildBalancedWeeklySchedule, calculateRoadmapProgress } from './src/utils/roadmapLogic.ts';

const PORT = Number(process.env.PORT) || 3000;

initDatabase();

const rateMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const record = rateMap.get(key);
    if (!record || record.resetAt < now) {
      rateMap.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (record.count >= maxRequests) {
      res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
      return;
    }
    record.count += 1;
    next();
  };
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', verifyMutationOrigin);

  // Public catalog routes
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, aiConfigured: isGeminiConfigured(), googleAuthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID) });
  });

  app.get('/api/careers', (_req, res) => {
    res.json({ careers: CAREER_CATALOG });
  });

  app.get('/api/careers/:slug', (req, res) => {
    const career = CAREER_CATALOG.find((c) => c.slug === req.params.slug);
    if (!career) {
      res.status(404).json({ error: 'Career not found' });
      return;
    }
    res.json({ career, starterStages: buildDefaultStagesForCareer(career.slug) });
  });

  app.get('/api/resources', (_req, res) => {
    res.json({ resources: VERIFIED_RESOURCES });
  });

  app.get('/api/assessments', (_req, res) => {
    res.json({ assessments: ASSESSMENT_BANK });
  });

  // Authentication routes
  app.get('/api/auth/me', (req, res) => {
    const resolved = resolveAuthenticatedUser(req);
    if (!resolved) {
      res.json({ user: null });
      return;
    }
    res.json({ user: resolved.user });
  });

  const RegisterSchema = z.object({
    email: z.string().email().max(160),
    password: z.string().min(8).max(128),
    fullName: z.string().min(2).max(100),
  });

  app.post('/api/auth/register', rateLimit(15, 60_000), (req, res) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please enter a valid name, email, and password (min 8 chars).' });
      return;
    }
    try {
      const { user, verificationCode } = registerAccount(parsed.data);
      const token = createUserSession(res, user.id);
      res.status(201).json({
        user,
        token,
        previewVerificationCode: verificationCode,
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'EMAIL_EXISTS') {
        res.status(409).json({ error: 'An account with this email already exists.' });
        return;
      }
      res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  });

  const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  app.post('/api/auth/login', rateLimit(20, 60_000), (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const normalized = parsed.data.email.trim().toLowerCase();
    const row = db
      .prepare(`SELECT id, password_hash FROM user_profiles WHERE email = ?`)
      .get(normalized) as { id: string; password_hash: string } | undefined;

    if (!row || !verifyPassword(parsed.data.password, row.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const user = getUserById(row.id);
    if (!user) {
      res.status(401).json({ error: 'Account unavailable.' });
      return;
    }
    seedStarterWorkspaceForUser(user.id, getUserPreferences(user.id).desiredCareer);
    const token = createUserSession(res, user.id);
    res.json({ user, token });
  });

  app.post('/api/auth/logout', (req, res) => {
    clearUserSession(res, req);
    res.json({ ok: true });
  });

  app.post('/api/auth/verify-email', requireAuth, (req: AuthenticatedRequest, res) => {
    const code = typeof req.body?.code === 'string' ? req.body.code : '';
    if (!code) {
      res.status(400).json({ error: 'Verification code is required.' });
      return;
    }
    const ok = verifyEmailCode(req.user!.id, code);
    if (!ok) {
      res.status(400).json({ error: 'Invalid or expired verification code.' });
      return;
    }
    res.json({ user: getUserById(req.user!.id) });
  });

  app.post('/api/auth/request-password-reset', rateLimit(10, 60_000), (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }
    const token = issuePasswordReset(email);
    res.json({
      ok: true,
      message: 'If an account matches that email, reset instructions have been prepared.',
      previewResetToken: token,
    });
  });

  app.post('/api/auth/reset-password', rateLimit(10, 60_000), (req, res) => {
    const schema = z.object({ token: z.string().min(6), newPassword: z.string().min(8).max(128) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Valid reset token and new password (8+ chars) are required.' });
      return;
    }
    const ok = completePasswordReset(parsed.data.token, parsed.data.newPassword);
    if (!ok) {
      res.status(400).json({ error: 'Invalid or expired reset token.' });
      return;
    }
    res.json({ ok: true });
  });

  // Authenticated workspace routes
  app.get('/api/workspace', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const preferences = getUserPreferences(userId);
    seedStarterWorkspaceForUser(userId, preferences.desiredCareer);
    const roadmaps = listUserRoadmaps(userId);
    const activeRoadmap = getActiveUserRoadmap(userId);

    res.json({
      user: req.user,
      preferences,
      roadmaps,
      activeRoadmap,
      bookmarks: getBookmarkedResourceIds(userId),
      projects: listUserProjects(userId),
      assessmentAttempts: listAssessmentAttempts(userId),
      conversations: listConversations(userId),
      learningActivity: listLearningActivity(userId),
      aiConfigured: isGeminiConfigured(),
    });
  });

  app.patch('/api/preferences', requireAuth, (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      stage: z.string().max(80).optional(),
      interests: z.array(z.string().max(80)).max(20).optional(),
      existingSkills: z.array(z.string().max(80)).max(30).optional(),
      desiredCareer: z.string().max(120).optional(),
      weeklyHours: z.number().int().min(1).max(60).optional(),
      learningStyle: z.string().max(80).optional(),
      objectives: z.array(z.string().max(100)).max(15).optional(),
      preferredLanguage: z.string().max(60).optional(),
      resourceCostPreference: z.enum(['free', 'paid', 'both']).optional(),
      theme: z.enum(['dark', 'light', 'system']).optional(),
      notificationsEnabled: z.boolean().optional(),
      weeklyDigest: z.boolean().optional(),
      gentleBreakReminders: z.boolean().optional(),
      onboardingCompleted: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid preferences payload.' });
      return;
    }
    const updated = saveUserPreferences(req.user!.id, parsed.data);
    res.json({ preferences: updated });
  });

  // Roadmap generation & management
  app.post('/api/roadmaps/generate', requireAuth, rateLimit(12, 60_000), async (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      careerGoal: z.string().min(2).max(200),
      careerSlug: z.string().min(2).max(80).optional(),
      mode: z.enum(['ai', 'curated']).default('ai'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please specify a career goal (at least 2 characters).' });
      return;
    }

    const userId = req.user!.id;
    const preferences = getUserPreferences(userId);
    const matchedCareer =
      CAREER_CATALOG.find(
        (c) =>
          c.slug === parsed.data.careerSlug ||
          c.title.toLowerCase() === parsed.data.careerGoal.trim().toLowerCase()
      ) ?? null;

    const careerSlug =
      matchedCareer?.slug ??
      parsed.data.careerSlug ??
      parsed.data.careerGoal
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    if (parsed.data.mode === 'curated') {
      const targetCareer = matchedCareer ?? CAREER_CATALOG[0];
      const stages = buildDefaultStagesForCareer(targetCareer.slug);
      const roadmap = saveNewRoadmap(userId, {
        careerSlug: targetCareer.slug,
        careerTitle: targetCareer.title,
        objective: `Build readiness toward ${targetCareer.title}`,
        isAiGenerated: false,
        sourceLabel: 'Curated Foundation Blueprint',
        estimatedDurationRange: targetCareer.estimatedMonthsRange,
        weeklyHoursTarget: preferences.weeklyHours,
        stages,
        weeklySchedule: buildBalancedWeeklySchedule(
          preferences.weeklyHours,
          stages[0]?.title ?? targetCareer.title
        ),
        changeNote: 'Created curated foundation roadmap',
      });
      res.status(201).json({ roadmap });
      return;
    }

    if (!isGeminiConfigured()) {
      res.status(503).json({
        error:
          'Gemini AI key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets, or switch to the Curated Blueprint builder.',
        code: 'AI_UNCONFIGURED',
      });
      return;
    }

    try {
      const generated = await generateStructuredRoadmapWithAI({
        careerGoal: parsed.data.careerGoal,
        careerSlug,
        preferences,
      });

      const roadmap = saveNewRoadmap(userId, {
        careerSlug,
        careerTitle: generated.careerTitle,
        objective: generated.objective,
        isAiGenerated: true,
        sourceLabel: 'AI-Personalized Roadmap (Validated Schema)',
        estimatedDurationRange: generated.estimatedDurationRange,
        weeklyHoursTarget: preferences.weeklyHours,
        stages: generated.stages,
        weeklySchedule: generated.weeklySchedule,
        changeNote: 'AI-generated personalized roadmap',
      });

      res.status(201).json({ roadmap });
    } catch (err) {
      console.error('AI roadmap generation error:', err);
      res.status(502).json({
        error:
          'AI roadmap generation encountered an upstream error. Please retry, or use the Curated Blueprint option.',
        code: 'AI_GENERATION_FAILED',
      });
    }
  });

  app.get('/api/roadmaps/:id/versions', requireAuth, (req: AuthenticatedRequest, res) => {
    const versions = listRoadmapVersions(req.user!.id, String(req.params.id));
    res.json({ versions });
  });

  app.post('/api/roadmaps/:id/restore', requireAuth, (req: AuthenticatedRequest, res) => {
    const versionNumber = Number(req.body?.versionNumber);
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      res.status(400).json({ error: 'Valid versionNumber is required.' });
      return;
    }
    const restored = restoreRoadmapVersion(req.user!.id, String(req.params.id), versionNumber);
    if (!restored) {
      res.status(404).json({ error: 'Roadmap version not found.' });
      return;
    }
    res.json({ roadmap: restored });
  });

  app.patch('/api/roadmaps/:id/skills/:skillId', requireAuth, (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      status: z.enum([
        'not_started',
        'available',
        'in_progress',
        'completed',
        'optional_milestone',
      ]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid skill status.' });
      return;
    }
    const updated = updateRoadmapSkillStatus(
      req.user!.id,
      String(req.params.id),
      String(req.params.skillId),
      parsed.data.status
    );
    if (!updated) {
      res.status(404).json({ error: 'Skill node not found.' });
      return;
    }
    res.json({ roadmap: updated });
  });

  app.patch('/api/roadmaps/:id/schedule', requireAuth, (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      weeklyHoursTarget: z.number().int().min(1).max(60),
      objective: z.string().min(3).max(400).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid schedule update.' });
      return;
    }
    const current = getRoadmapById(req.user!.id, String(req.params.id));
    if (!current) {
      res.status(404).json({ error: 'Roadmap not found.' });
      return;
    }
    const nextSchedule = buildBalancedWeeklySchedule(
      parsed.data.weeklyHoursTarget,
      current.stages[0]?.title ?? current.careerTitle
    );
    const updated = saveRoadmapVersionSnapshot(
      req.user!.id,
      current.id,
      {
        weeklyHoursTarget: parsed.data.weeklyHoursTarget,
        objective: parsed.data.objective ?? current.objective,
        weeklySchedule: nextSchedule,
      },
      `Adjusted schedule to ${parsed.data.weeklyHoursTarget} hrs/week`
    );
    res.json({ roadmap: updated });
  });

  // Bookmarks
  app.post('/api/bookmarks/toggle', requireAuth, (req: AuthenticatedRequest, res) => {
    const resourceId = typeof req.body?.resourceId === 'string' ? req.body.resourceId : '';
    const exists = VERIFIED_RESOURCES.some((r) => r.id === resourceId);
    if (!exists) {
      res.status(404).json({ error: 'Resource not found.' });
      return;
    }
    const bookmarks = toggleBookmark(req.user!.id, resourceId);
    res.json({ bookmarks });
  });

  // Projects
  app.post('/api/projects', requireAuth, (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      title: z.string().min(3).max(120),
      objective: z.string().min(5).max(400),
      careerSlug: z.string().min(2).max(80),
      difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
      requiredSkills: z.array(z.string()).min(1).max(8),
      technologies: z.array(z.string()).min(1).max(8),
      estimatedHours: z.number().int().min(1).max(200),
      deliverables: z.array(z.string()).min(1).max(6),
      evaluationCriteria: z.array(z.string()).min(1).max(6),
      portfolioNotes: z.string().max(300).default(''),
      milestones: z.array(z.string().min(2).max(160)).min(1).max(8),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid project payload.' });
      return;
    }
    const project = createUserProject(req.user!.id, {
      ...parsed.data,
      milestones: parsed.data.milestones.map((title) => ({ title, completed: false })),
      isAiGenerated: false,
    });
    res.status(201).json({ project });
  });

  app.post('/api/projects/generate', requireAuth, rateLimit(10, 60_000), async (req: AuthenticatedRequest, res) => {
    if (!isGeminiConfigured()) {
      res.status(503).json({
        error: 'Gemini AI key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets, or create a custom project directly.',
      });
      return;
    }
    const schema = z.object({
      difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Intermediate'),
      focusTopic: z.string().max(120).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid project request.' });
      return;
    }

    const roadmap = getActiveUserRoadmap(req.user!.id);
    const completedSkills =
      roadmap?.stages
        .flatMap((s) => s.skills)
        .filter((sk) => sk.status === 'completed')
        .map((sk) => sk.title) ?? [];

    try {
      const generated = await generateProjectWithAI({
        careerTitle: roadmap?.careerTitle ?? 'Software & AI Engineering',
        careerSlug: roadmap?.careerSlug ?? 'ai-engineer',
        completedSkills,
        difficulty: parsed.data.difficulty,
        focusTopic: parsed.data.focusTopic,
      });

      const project = createUserProject(req.user!.id, {
        ...generated,
        isAiGenerated: true,
      });
      res.status(201).json({ project });
    } catch (err) {
      console.error('AI project generation failed:', err);
      res.status(502).json({ error: 'Unable to generate AI project right now. Please retry.' });
    }
  });

  app.patch('/api/projects/:id/status', requireAuth, (req: AuthenticatedRequest, res) => {
    const schema = z.object({ status: z.enum(['planned', 'in_progress', 'testing', 'completed']) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid project status.' });
      return;
    }
    const project = updateUserProjectStatus(req.user!.id, String(req.params.id), parsed.data.status);
    if (!project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    res.json({ project });
  });

  app.patch(
    '/api/projects/:id/milestones/:milestoneId',
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      const project = toggleProjectMilestone(
        req.user!.id,
        String(req.params.id),
        String(req.params.milestoneId)
      );
      if (!project) {
        res.status(404).json({ error: 'Milestone not found.' });
        return;
      }
      res.json({ project });
    }
  );

  // Assessments
  app.post('/api/assessments/attempt', requireAuth, (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      assessmentId: z.string(),
      title: z.string(),
      careerSlug: z.string(),
      score: z.number().int().min(0),
      total: z.number().int().min(1),
      weakSkills: z.array(z.string()),
      recommendations: z.array(z.string()),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid assessment submission.' });
      return;
    }
    const attempt = recordAssessmentAttempt(req.user!.id, parsed.data);
    res.status(201).json({ attempt });
  });

  // AI Mentor
  app.get('/api/mentor/conversations/:id/messages', requireAuth, (req: AuthenticatedRequest, res) => {
    const messages = getConversationMessages(req.user!.id, String(req.params.id));
    res.json({ messages });
  });

  app.post('/api/mentor/chat', requireAuth, rateLimit(25, 60_000), async (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      conversationId: z.string().optional(),
      message: z.string().min(1).max(3000),
      attachmentText: z.string().max(6000).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Message cannot be empty.' });
      return;
    }

    if (!isGeminiConfigured()) {
      res.status(503).json({
        error: 'Gemini AI key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets to chat with the AI Mentor.',
      });
      return;
    }

    const userId = req.user!.id;
    const roadmap = getActiveUserRoadmap(userId);
    const preferences = getUserPreferences(userId);
    const conv = ensureConversation(
      userId,
      parsed.data.conversationId,
      parsed.data.message,
      roadmap?.careerSlug ?? preferences.desiredCareer
    );

    const priorMessages = getConversationMessages(userId, conv.id);
    saveMentorMessage(userId, conv.id, 'user', parsed.data.message);

    const progress = calculateRoadmapProgress(roadmap);
    const roadmapSummary = roadmap
      ? `${roadmap.careerTitle} (${progress.percentComplete}% complete; next skill: ${
          progress.nextRecommendedSkill?.title ?? 'Capstone'
        })`
      : 'No active roadmap selected yet';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ type: 'meta', conversationId: conv.id })}\n\n`);

    let fullReply = '';
    try {
      for await (const chunk of streamMentorReplyWithAI({
        message: parsed.data.message,
        history: priorMessages.map((m) => ({ role: m.role, content: m.content })),
        careerTitle: roadmap?.careerTitle ?? 'Career Exploration',
        roadmapSummary,
        preferences,
        attachmentText: parsed.data.attachmentText,
      })) {
        fullReply += chunk;
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
      }

      const savedAssistant = saveMentorMessage(userId, conv.id, 'assistant', fullReply);
      res.write(`data: ${JSON.stringify({ type: 'done', message: savedAssistant })}\n\n`);
      res.end();
    } catch (err) {
      console.error('AI Mentor streaming error:', err);
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          error: 'AI Mentor encountered an upstream error. Please try again.',
        })}\n\n`
      );
      res.end();
    }
  });

  // Learning Activity Logging
  app.post('/api/activity', requireAuth, (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      minutesSpent: z.number().int().min(5).max(480),
      label: z.string().min(2).max(160),
      activityType: z.enum(['skill_completed', 'assessment', 'project', 'study_session']).default('study_session'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid activity entry.' });
      return;
    }
    const entry = logLearningActivity(req.user!.id, {
      activityDate: new Date().toISOString().slice(0, 10),
      minutesSpent: parsed.data.minutesSpent,
      activityType: parsed.data.activityType,
      label: parsed.data.label,
    });
    res.status(201).json({ entry });
  });

  // Data Export & Account Deletion
  app.get('/api/account/export', requireAuth, (req: AuthenticatedRequest, res) => {
    const bundle = exportAllUserData(req.user!.id);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="skillpath-ai-data-export.json"');
    res.send(JSON.stringify(bundle, null, 2));
  });

  app.delete('/api/account', requireAuth, (req: AuthenticatedRequest, res) => {
    deleteUserAccount(req.user!.id);
    clearUserSession(res, req);
    res.json({ ok: true });
  });

  // Vite / Static Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SkillPath AI server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SkillPath AI server:', err);
  process.exit(1);
});
