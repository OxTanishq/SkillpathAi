import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import {
  ASSESSMENT_BANK,
  CAREER_CATALOG,
  STARTER_PROJECTS,
  VERIFIED_RESOURCES,
  buildDefaultStagesForCareer,
} from '../data/catalog.ts';
import type {
  AssessmentAttempt,
  AuthUser,
  CareerProject,
  LearningActivityEntry,
  MentorConversation,
  MentorMessage,
  ProjectStatus,
  RoadmapData,
  RoadmapStage,
  SkillNodeData,
  SkillNodeStatus,
  UserPreferences,
} from '../types/domain.ts';
import {
  applyResolvedStatusesToRoadmap,
  buildBalancedWeeklySchedule,
} from '../utils/roadmapLogic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(process.cwd(), 'skillpath.db');
const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');

export const db = new DatabaseSync(DB_PATH);

export function initDatabase(): void {
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schemaSql);
  seedCatalogData();
}

function seedCatalogData(): void {
  const upsertCareer = db.prepare(`
    INSERT INTO careers (id, slug, title, category, difficulty, short_description, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      title = excluded.title,
      category = excluded.category,
      difficulty = excluded.difficulty,
      short_description = excluded.short_description,
      payload_json = excluded.payload_json
  `);

  const upsertSkill = db.prepare(`
    INSERT INTO skills (id, slug, title, category, summary)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `);

  const upsertCareerSkill = db.prepare(`
    INSERT INTO career_skills (career_id, skill_id, level, skill_type)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(career_id, skill_id) DO UPDATE SET
      level = excluded.level,
      skill_type = excluded.skill_type
  `);

  for (const career of CAREER_CATALOG) {
    upsertCareer.run(
      career.id,
      career.slug,
      career.title,
      career.category,
      career.difficulty,
      career.shortDescription,
      JSON.stringify(career)
    );
    for (const sk of career.requiredSkills) {
      const slug = sk.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const skillId = `skill-${slug}`;
      upsertSkill.run(skillId, slug, sk.name, career.category, `${sk.level} ${sk.type} competency for ${career.title}`);
      upsertCareerSkill.run(career.id, skillId, sk.level, sk.type);
    }
  }

  const upsertResource = db.prepare(`
    INSERT INTO learning_resources (
      id, title, provider, url, type, cost, level, duration_label, language, skill_category, verified, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      provider = excluded.provider,
      url = excluded.url,
      type = excluded.type,
      cost = excluded.cost,
      level = excluded.level,
      duration_label = excluded.duration_label,
      language = excluded.language,
      skill_category = excluded.skill_category,
      verified = excluded.verified,
      description = excluded.description
  `);

  for (const r of VERIFIED_RESOURCES) {
    upsertResource.run(
      r.id,
      r.title,
      r.provider,
      r.url,
      r.type,
      r.cost,
      r.level,
      r.durationLabel,
      r.language,
      r.skillCategory,
      r.verified ? 1 : 0,
      r.description
    );
  }

  const upsertAssessment = db.prepare(`
    INSERT INTO assessments (id, career_slug, title, description, questions_json)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      questions_json = excluded.questions_json
  `);

  for (const [slug, item] of Object.entries(ASSESSMENT_BANK)) {
    upsertAssessment.run(item.id, slug, item.title, item.description, JSON.stringify(item.questions));
  }
}

export function getUserById(userId: string): AuthUser | null {
  const row = db
    .prepare(
      `SELECT id, email, full_name, email_verified, plan_tier, created_at FROM user_profiles WHERE id = ?`
    )
    .get(userId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    fullName: String(row.full_name),
    emailVerified: Number(row.email_verified) === 1,
    planTier: row.plan_tier === 'plus' ? 'plus' : 'free',
    createdAt: String(row.created_at),
  };
}

export function getUserPreferences(userId: string): UserPreferences {
  const pref = db
    .prepare(`SELECT * FROM user_preferences WHERE user_id = ?`)
    .get(userId) as Record<string, unknown> | undefined;
  const notif = db
    .prepare(`SELECT * FROM notification_preferences WHERE user_id = ?`)
    .get(userId) as Record<string, unknown> | undefined;

  if (!pref) {
    return {
      stage: 'Exploring',
      interests: ['Artificial Intelligence', 'Software Development'],
      existingSkills: ['Problem solving'],
      desiredCareer: 'ai-engineer',
      weeklyHours: 8,
      learningStyle: 'Hands-on projects',
      objectives: ['Build practical portfolio', 'Career transition'],
      preferredLanguage: 'English',
      resourceCostPreference: 'both',
      theme: 'dark',
      notificationsEnabled: true,
      weeklyDigest: true,
      gentleBreakReminders: true,
      onboardingCompleted: false,
    };
  }

  return {
    stage: String(pref.stage),
    interests: JSON.parse(String(pref.interests_json || '[]')),
    existingSkills: JSON.parse(String(pref.existing_skills_json || '[]')),
    desiredCareer: String(pref.desired_career),
    weeklyHours: Number(pref.weekly_hours),
    learningStyle: String(pref.learning_style),
    objectives: JSON.parse(String(pref.objectives_json || '[]')),
    preferredLanguage: String(pref.preferred_language),
    resourceCostPreference: (pref.resource_cost_preference as 'free' | 'paid' | 'both') ?? 'both',
    theme: (pref.theme as 'dark' | 'light' | 'system') ?? 'dark',
    notificationsEnabled: notif ? Number(notif.notifications_enabled) === 1 : true,
    weeklyDigest: notif ? Number(notif.weekly_digest) === 1 : true,
    gentleBreakReminders: notif ? Number(notif.gentle_break_reminders) === 1 : true,
    onboardingCompleted: Number(pref.onboarding_completed) === 1,
  };
}

export function saveUserPreferences(userId: string, prefs: Partial<UserPreferences>): UserPreferences {
  const current = getUserPreferences(userId);
  const next = { ...current, ...prefs };

  db.prepare(`
    INSERT INTO user_preferences (
      user_id, stage, interests_json, existing_skills_json, desired_career,
      weekly_hours, learning_style, objectives_json, preferred_language,
      resource_cost_preference, theme, onboarding_completed, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      stage = excluded.stage,
      interests_json = excluded.interests_json,
      existing_skills_json = excluded.existing_skills_json,
      desired_career = excluded.desired_career,
      weekly_hours = excluded.weekly_hours,
      learning_style = excluded.learning_style,
      objectives_json = excluded.objectives_json,
      preferred_language = excluded.preferred_language,
      resource_cost_preference = excluded.resource_cost_preference,
      theme = excluded.theme,
      onboarding_completed = excluded.onboarding_completed,
      updated_at = datetime('now')
  `).run(
    userId,
    next.stage,
    JSON.stringify(next.interests),
    JSON.stringify(next.existingSkills),
    next.desiredCareer,
    next.weeklyHours,
    next.learningStyle,
    JSON.stringify(next.objectives),
    next.preferredLanguage,
    next.resourceCostPreference,
    next.theme,
    next.onboardingCompleted ? 1 : 0
  );

  db.prepare(`
    INSERT INTO notification_preferences (
      user_id, notifications_enabled, weekly_digest, gentle_break_reminders, updated_at
    ) VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      notifications_enabled = excluded.notifications_enabled,
      weekly_digest = excluded.weekly_digest,
      gentle_break_reminders = excluded.gentle_break_reminders,
      updated_at = datetime('now')
  `).run(
    userId,
    next.notificationsEnabled ? 1 : 0,
    next.weeklyDigest ? 1 : 0,
    next.gentleBreakReminders ? 1 : 0
  );

  return getUserPreferences(userId);
}

export function seedStarterWorkspaceForUser(userId: string, careerSlug = 'ai-engineer'): void {
  const existingRoadmaps = db
    .prepare(`SELECT id FROM roadmaps WHERE user_id = ? LIMIT 1`)
    .get(userId);
  if (!existingRoadmaps) {
    const career = CAREER_CATALOG.find((c) => c.slug === careerSlug) ?? CAREER_CATALOG[0];
    const stages = buildDefaultStagesForCareer(career.slug);
    saveNewRoadmap(userId, {
      careerSlug: career.slug,
      careerTitle: career.title,
      objective: `Build practical readiness as a ${career.title}`,
      isAiGenerated: false,
      sourceLabel: 'Curated Foundation Blueprint',
      estimatedDurationRange: career.estimatedMonthsRange,
      weeklyHoursTarget: 8,
      stages,
      weeklySchedule: buildBalancedWeeklySchedule(8, stages[0]?.title ?? career.title),
      changeNote: 'Initial curated roadmap',
    });
  }

  const existingProjects = db
    .prepare(`SELECT id FROM projects WHERE user_id = ? LIMIT 1`)
    .get(userId);
  if (!existingProjects) {
    for (const proj of STARTER_PROJECTS) {
      createUserProject(userId, {
        title: proj.title,
        objective: proj.objective,
        careerSlug: proj.careerSlug,
        difficulty: proj.difficulty,
        status: proj.status,
        requiredSkills: proj.requiredSkills,
        technologies: proj.technologies,
        estimatedHours: proj.estimatedHours,
        deliverables: proj.deliverables,
        evaluationCriteria: proj.evaluationCriteria,
        portfolioNotes: proj.portfolioNotes,
        milestones: proj.milestones.map((m) => ({ title: m.title, completed: m.completed })),
        isAiGenerated: false,
      });
    }
  }

  const existingAct = db
    .prepare(`SELECT id FROM learning_activity WHERE user_id = ? LIMIT 1`)
    .get(userId);
  if (!existingAct) {
    const today = new Date().toISOString().slice(0, 10);
    logLearningActivity(userId, {
      activityDate: today,
      minutesSpent: 25,
      activityType: 'study_session',
      label: 'Initial SkillPath workspace setup & foundation review',
    });
  }
}

export function saveNewRoadmap(
  userId: string,
  input: {
    careerSlug: string;
    careerTitle: string;
    objective: string;
    isAiGenerated: boolean;
    sourceLabel: string;
    estimatedDurationRange: string;
    weeklyHoursTarget: number;
    stages: RoadmapStage[];
    weeklySchedule: RoadmapData['weeklySchedule'];
    changeNote?: string;
  }
): RoadmapData {
  const roadmapId = `rm-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO roadmaps (
      id, user_id, career_slug, career_title, objective, active_version,
      is_ai_generated, source_label, estimated_duration_range, weekly_hours_target,
      weekly_schedule_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    roadmapId,
    userId,
    input.careerSlug,
    input.careerTitle,
    input.objective,
    input.isAiGenerated ? 1 : 0,
    input.sourceLabel,
    input.estimatedDurationRange,
    input.weeklyHoursTarget,
    JSON.stringify(input.weeklySchedule),
    now,
    now
  );

  persistRoadmapStagesAndSkills(userId, roadmapId, input.stages);

  const fullRoadmap = getRoadmapById(userId, roadmapId)!;
  db.prepare(`
    INSERT INTO roadmap_versions (id, roadmap_id, version_number, snapshot_json, change_note, created_at)
    VALUES (?, ?, 1, ?, ?, ?)
  `).run(
    `rv-${crypto.randomUUID()}`,
    roadmapId,
    JSON.stringify(fullRoadmap),
    input.changeNote ?? 'Initial version',
    now
  );

  return fullRoadmap;
}

function persistRoadmapStagesAndSkills(
  userId: string,
  roadmapId: string,
  stages: RoadmapStage[]
): void {
  db.prepare(`DELETE FROM roadmap_stages WHERE roadmap_id = ?`).run(roadmapId);
  db.prepare(`DELETE FROM skill_dependencies WHERE roadmap_id = ?`).run(roadmapId);
  db.prepare(`DELETE FROM skill_progress WHERE roadmap_id = ?`).run(roadmapId);

  const insertStage = db.prepare(`
    INSERT INTO roadmap_stages (id, roadmap_id, stage_number, title, description, estimated_weeks, milestone, assessment_objective)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertDep = db.prepare(`
    INSERT OR IGNORE INTO skill_dependencies (roadmap_id, skill_node_id, prerequisite_node_id)
    VALUES (?, ?, ?)
  `);
  const insertSkill = db.prepare(`
    INSERT INTO skill_progress (id, user_id, roadmap_id, skill_node_id, stage_number, status, node_payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const stage of stages) {
    insertStage.run(
      `stg-${crypto.randomUUID()}`,
      roadmapId,
      stage.stageNumber,
      stage.title,
      stage.description,
      stage.estimatedWeeks,
      stage.milestone,
      stage.assessmentObjective
    );
    for (const skill of stage.skills) {
      for (const prereq of skill.prerequisites) {
        insertDep.run(roadmapId, skill.id, prereq);
      }
      insertSkill.run(
        `sp-${crypto.randomUUID()}`,
        userId,
        roadmapId,
        skill.id,
        stage.stageNumber,
        skill.status,
        JSON.stringify(skill)
      );
    }
  }
}

export function getRoadmapById(userId: string, roadmapId: string): RoadmapData | null {
  const row = db
    .prepare(`SELECT * FROM roadmaps WHERE id = ? AND user_id = ?`)
    .get(roadmapId, userId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const stageRows = db
    .prepare(`SELECT * FROM roadmap_stages WHERE roadmap_id = ? ORDER BY stage_number ASC`)
    .all(roadmapId) as Array<Record<string, unknown>>;

  const skillRows = db
    .prepare(`SELECT * FROM skill_progress WHERE roadmap_id = ? AND user_id = ?`)
    .all(roadmapId, userId) as Array<Record<string, unknown>>;

  const skillsByStage = new Map<number, SkillNodeData[]>();
  for (const sr of skillRows) {
    const payload = JSON.parse(String(sr.node_payload_json)) as SkillNodeData;
    payload.status = sr.status as SkillNodeStatus;
    const stNum = Number(sr.stage_number);
    const list = skillsByStage.get(stNum) ?? [];
    list.push(payload);
    skillsByStage.set(stNum, list);
  }

  const stages: RoadmapStage[] = stageRows.map((st) => ({
    stageNumber: Number(st.stage_number),
    title: String(st.title),
    description: String(st.description),
    estimatedWeeks: String(st.estimated_weeks),
    milestone: String(st.milestone),
    assessmentObjective: String(st.assessment_objective),
    skills: skillsByStage.get(Number(st.stage_number)) ?? [],
  }));

  return applyResolvedStatusesToRoadmap({
    id: String(row.id),
    careerSlug: String(row.career_slug),
    careerTitle: String(row.career_title),
    objective: String(row.objective),
    version: Number(row.active_version),
    isAiGenerated: Number(row.is_ai_generated) === 1,
    sourceLabel: String(row.source_label),
    estimatedDurationRange: String(row.estimated_duration_range),
    weeklyHoursTarget: Number(row.weekly_hours_target),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    stages,
    weeklySchedule: JSON.parse(String(row.weekly_schedule_json || '[]')),
  });
}

export function getActiveUserRoadmap(userId: string): RoadmapData | null {
  const row = db
    .prepare(`SELECT id FROM roadmaps WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`)
    .get(userId) as { id: string } | undefined;
  if (!row) return null;
  return getRoadmapById(userId, row.id);
}

export function listUserRoadmaps(userId: string): RoadmapData[] {
  const rows = db
    .prepare(`SELECT id FROM roadmaps WHERE user_id = ? ORDER BY updated_at DESC`)
    .all(userId) as Array<{ id: string }>;
  return rows.map((r) => getRoadmapById(userId, r.id)).filter((x): x is RoadmapData => x !== null);
}

export function listRoadmapVersions(
  userId: string,
  roadmapId: string
): Array<{ id: string; versionNumber: number; changeNote: string; createdAt: string }> {
  const owns = db
    .prepare(`SELECT id FROM roadmaps WHERE id = ? AND user_id = ?`)
    .get(roadmapId, userId);
  if (!owns) return [];
  const rows = db
    .prepare(
      `SELECT id, version_number, change_note, created_at FROM roadmap_versions WHERE roadmap_id = ? ORDER BY version_number DESC`
    )
    .all(roadmapId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    versionNumber: Number(r.version_number),
    changeNote: String(r.change_note),
    createdAt: String(r.created_at),
  }));
}

export function updateRoadmapSkillStatus(
  userId: string,
  roadmapId: string,
  skillNodeId: string,
  status: SkillNodeStatus
): RoadmapData | null {
  const row = db
    .prepare(
      `SELECT id, node_payload_json FROM skill_progress WHERE roadmap_id = ? AND user_id = ? AND skill_node_id = ?`
    )
    .get(roadmapId, userId, skillNodeId) as { id: string; node_payload_json: string } | undefined;

  if (!row) return null;
  const payload = JSON.parse(row.node_payload_json) as SkillNodeData;
  payload.status = status;

  db.prepare(
    `UPDATE skill_progress SET status = ?, node_payload_json = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(status, JSON.stringify(payload), row.id);

  db.prepare(`UPDATE roadmaps SET updated_at = ? WHERE id = ? AND user_id = ?`).run(
    new Date().toISOString(),
    roadmapId,
    userId
  );

  if (status === 'completed') {
    logLearningActivity(userId, {
      activityDate: new Date().toISOString().slice(0, 10),
      minutesSpent: Math.min(180, Math.max(15, payload.estimatedHours * 3)),
      activityType: 'skill_completed',
      label: `Completed skill: ${payload.title}`,
    });
  }

  return getRoadmapById(userId, roadmapId);
}

export function saveRoadmapVersionSnapshot(
  userId: string,
  roadmapId: string,
  updated: Partial<Pick<RoadmapData, 'objective' | 'weeklyHoursTarget' | 'stages' | 'weeklySchedule'>>,
  changeNote: string
): RoadmapData | null {
  const current = getRoadmapById(userId, roadmapId);
  if (!current) return null;

  const nextVersion = current.version + 1;
  const now = new Date().toISOString();

  if (updated.stages) {
    persistRoadmapStagesAndSkills(userId, roadmapId, updated.stages);
  }

  db.prepare(`
    UPDATE roadmaps SET
      objective = COALESCE(?, objective),
      weekly_hours_target = COALESCE(?, weekly_hours_target),
      weekly_schedule_json = COALESCE(?, weekly_schedule_json),
      active_version = ?,
      updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    updated.objective ?? null,
    updated.weeklyHoursTarget ?? null,
    updated.weeklySchedule ? JSON.stringify(updated.weeklySchedule) : null,
    nextVersion,
    now,
    roadmapId,
    userId
  );

  const refreshed = getRoadmapById(userId, roadmapId)!;
  db.prepare(`
    INSERT INTO roadmap_versions (id, roadmap_id, version_number, snapshot_json, change_note, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(`rv-${crypto.randomUUID()}`, roadmapId, nextVersion, JSON.stringify(refreshed), changeNote, now);

  return refreshed;
}

export function restoreRoadmapVersion(
  userId: string,
  roadmapId: string,
  versionNumber: number
): RoadmapData | null {
  const owns = db
    .prepare(`SELECT id FROM roadmaps WHERE id = ? AND user_id = ?`)
    .get(roadmapId, userId);
  if (!owns) return null;

  const ver = db
    .prepare(
      `SELECT snapshot_json FROM roadmap_versions WHERE roadmap_id = ? AND version_number = ?`
    )
    .get(roadmapId, versionNumber) as { snapshot_json: string } | undefined;
  if (!ver) return null;

  const snapshot = JSON.parse(ver.snapshot_json) as RoadmapData;
  return saveRoadmapVersionSnapshot(
    userId,
    roadmapId,
    {
      objective: snapshot.objective,
      weeklyHoursTarget: snapshot.weeklyHoursTarget,
      stages: snapshot.stages,
      weeklySchedule: snapshot.weeklySchedule,
    },
    `Restored version ${versionNumber}`
  );
}

export function getBookmarkedResourceIds(userId: string): string[] {
  const rows = db
    .prepare(`SELECT resource_id FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC`)
    .all(userId) as Array<{ resource_id: string }>;
  return rows.map((r) => r.resource_id);
}

export function toggleBookmark(userId: string, resourceId: string): string[] {
  const existing = db
    .prepare(`SELECT id FROM bookmarks WHERE user_id = ? AND resource_id = ?`)
    .get(userId, resourceId) as { id: string } | undefined;

  if (existing) {
    db.prepare(`DELETE FROM bookmarks WHERE id = ? AND user_id = ?`).run(existing.id, userId);
  } else {
    db.prepare(
      `INSERT INTO bookmarks (id, user_id, resource_id) VALUES (?, ?, ?)`
    ).run(`bm-${crypto.randomUUID()}`, userId, resourceId);
  }
  return getBookmarkedResourceIds(userId);
}

export function listUserProjects(userId: string): CareerProject[] {
  const rows = db
    .prepare(`SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC`)
    .all(userId) as Array<Record<string, unknown>>;

  const getMilestones = db.prepare(
    `SELECT id, title, completed FROM project_milestones WHERE project_id = ? ORDER BY sort_order ASC`
  );

  return rows.map((r) => {
    const msRows = getMilestones.all(String(r.id)) as Array<Record<string, unknown>>;
    return {
      id: String(r.id),
      title: String(r.title),
      objective: String(r.objective),
      careerSlug: String(r.career_slug),
      difficulty: r.difficulty as CareerProject['difficulty'],
      status: r.status as ProjectStatus,
      requiredSkills: JSON.parse(String(r.required_skills_json || '[]')),
      technologies: JSON.parse(String(r.technologies_json || '[]')),
      estimatedHours: Number(r.estimated_hours),
      deliverables: JSON.parse(String(r.deliverables_json || '[]')),
      evaluationCriteria: JSON.parse(String(r.evaluation_criteria_json || '[]')),
      portfolioNotes: String(r.portfolio_notes || ''),
      milestones: msRows.map((m) => ({
        id: String(m.id),
        title: String(m.title),
        completed: Number(m.completed) === 1,
      })),
      isAiGenerated: Number(r.is_ai_generated) === 1,
      createdAt: String(r.created_at),
    };
  });
}

export function createUserProject(
  userId: string,
  input: {
    title: string;
    objective: string;
    careerSlug: string;
    difficulty: CareerProject['difficulty'];
    status?: ProjectStatus;
    requiredSkills: string[];
    technologies: string[];
    estimatedHours: number;
    deliverables: string[];
    evaluationCriteria: string[];
    portfolioNotes: string;
    milestones: Array<{ title: string; completed?: boolean }>;
    isAiGenerated: boolean;
  }
): CareerProject {
  const projectId = `proj-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO projects (
      id, user_id, career_slug, title, objective, difficulty, status,
      required_skills_json, technologies_json, estimated_hours, deliverables_json,
      evaluation_criteria_json, portfolio_notes, is_ai_generated, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    projectId,
    userId,
    input.careerSlug,
    input.title,
    input.objective,
    input.difficulty,
    input.status ?? 'planned',
    JSON.stringify(input.requiredSkills),
    JSON.stringify(input.technologies),
    input.estimatedHours,
    JSON.stringify(input.deliverables),
    JSON.stringify(input.evaluationCriteria),
    input.portfolioNotes,
    input.isAiGenerated ? 1 : 0,
    now
  );

  const insertMs = db.prepare(
    `INSERT INTO project_milestones (id, project_id, title, completed, sort_order) VALUES (?, ?, ?, ?, ?)`
  );
  input.milestones.forEach((m, idx) => {
    insertMs.run(`ms-${crypto.randomUUID()}`, projectId, m.title, m.completed ? 1 : 0, idx);
  });

  return listUserProjects(userId).find((p) => p.id === projectId)!;
}

export function updateUserProjectStatus(
  userId: string,
  projectId: string,
  status: ProjectStatus
): CareerProject | null {
  const res = db
    .prepare(`UPDATE projects SET status = ? WHERE id = ? AND user_id = ?`)
    .run(status, projectId, userId);
  if (res.changes === 0) return null;

  if (status === 'completed') {
    logLearningActivity(userId, {
      activityDate: new Date().toISOString().slice(0, 10),
      minutesSpent: 60,
      activityType: 'project',
      label: 'Completed portfolio project milestone',
    });
  }

  return listUserProjects(userId).find((p) => p.id === projectId) ?? null;
}

export function toggleProjectMilestone(
  userId: string,
  projectId: string,
  milestoneId: string
): CareerProject | null {
  const owns = db
    .prepare(`SELECT id FROM projects WHERE id = ? AND user_id = ?`)
    .get(projectId, userId);
  if (!owns) return null;

  const ms = db
    .prepare(`SELECT completed FROM project_milestones WHERE id = ? AND project_id = ?`)
    .get(milestoneId, projectId) as { completed: number } | undefined;
  if (!ms) return null;

  db.prepare(`UPDATE project_milestones SET completed = ? WHERE id = ? AND project_id = ?`).run(
    ms.completed === 1 ? 0 : 1,
    milestoneId,
    projectId
  );

  return listUserProjects(userId).find((p) => p.id === projectId) ?? null;
}

export function listAssessmentAttempts(userId: string): AssessmentAttempt[] {
  const rows = db
    .prepare(`SELECT * FROM assessment_attempts WHERE user_id = ? ORDER BY created_at DESC`)
    .all(userId) as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: String(r.id),
    assessmentId: String(r.assessment_id),
    title: String(r.title),
    careerSlug: String(r.career_slug),
    score: Number(r.score),
    total: Number(r.total),
    weakSkills: JSON.parse(String(r.weak_skills_json || '[]')),
    recommendations: JSON.parse(String(r.recommendations_json || '[]')),
    createdAt: String(r.created_at),
  }));
}

export function recordAssessmentAttempt(
  userId: string,
  attempt: Omit<AssessmentAttempt, 'id' | 'createdAt'>
): AssessmentAttempt {
  const id = `att-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO assessment_attempts (
      id, user_id, assessment_id, title, career_slug, score, total, weak_skills_json, recommendations_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    attempt.assessmentId,
    attempt.title,
    attempt.careerSlug,
    attempt.score,
    attempt.total,
    JSON.stringify(attempt.weakSkills),
    JSON.stringify(attempt.recommendations),
    now
  );

  logLearningActivity(userId, {
    activityDate: now.slice(0, 10),
    minutesSpent: 20,
    activityType: 'assessment',
    label: `Completed assessment: ${attempt.title}`,
  });

  return { id, createdAt: now, ...attempt };
}

export function listConversations(userId: string): MentorConversation[] {
  const rows = db
    .prepare(`SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC`)
    .all(userId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    careerSlug: String(r.career_slug),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  }));
}

export function getConversationMessages(userId: string, conversationId: string): MentorMessage[] {
  const rows = db
    .prepare(
      `SELECT * FROM ai_messages WHERE conversation_id = ? AND user_id = ? ORDER BY created_at ASC`
    )
    .all(conversationId, userId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    conversationId: String(r.conversation_id),
    role: r.role === 'assistant' ? 'assistant' : 'user',
    content: String(r.content),
    citations: JSON.parse(String(r.citations_json || '[]')),
    createdAt: String(r.created_at),
  }));
}

export function ensureConversation(
  userId: string,
  conversationId: string | undefined,
  title: string,
  careerSlug: string
): MentorConversation {
  if (conversationId) {
    const row = db
      .prepare(`SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?`)
      .get(conversationId, userId) as Record<string, unknown> | undefined;
    if (row) {
      return {
        id: String(row.id),
        title: String(row.title),
        careerSlug: String(row.career_slug),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      };
    }
  }

  const id = `conv-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO ai_conversations (id, user_id, title, career_slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, userId, title.slice(0, 80), careerSlug, now, now);

  return { id, title: title.slice(0, 80), careerSlug, createdAt: now, updatedAt: now };
}

export function saveMentorMessage(
  userId: string,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  citations: string[] = []
): MentorMessage {
  const id = `msg-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO ai_messages (id, conversation_id, user_id, role, content, citations_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, conversationId, userId, role, content, JSON.stringify(citations), now);

  db.prepare(`UPDATE ai_conversations SET updated_at = ? WHERE id = ? AND user_id = ?`).run(
    now,
    conversationId,
    userId
  );

  return { id, conversationId, role, content, citations, createdAt: now };
}

export function listLearningActivity(userId: string): LearningActivityEntry[] {
  const rows = db
    .prepare(`SELECT * FROM learning_activity WHERE user_id = ? ORDER BY created_at DESC LIMIT 120`)
    .all(userId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    activityDate: String(r.activity_date),
    minutesSpent: Number(r.minutes_spent),
    activityType: r.activity_type as LearningActivityEntry['activityType'],
    label: String(r.label),
  }));
}

export function logLearningActivity(
  userId: string,
  entry: Omit<LearningActivityEntry, 'id'>
): LearningActivityEntry {
  const id = `act-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO learning_activity (id, user_id, activity_date, minutes_spent, activity_type, label)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, entry.activityDate, entry.minutesSpent, entry.activityType, entry.label);
  return { id, ...entry };
}

export function exportAllUserData(userId: string) {
  return {
    exportedAt: new Date().toISOString(),
    profile: getUserById(userId),
    preferences: getUserPreferences(userId),
    roadmaps: listUserRoadmaps(userId),
    bookmarkedResourceIds: getBookmarkedResourceIds(userId),
    projects: listUserProjects(userId),
    assessmentAttempts: listAssessmentAttempts(userId),
    conversations: listConversations(userId).map((c) => ({
      ...c,
      messages: getConversationMessages(userId, c.id),
    })),
    learningActivity: listLearningActivity(userId),
  };
}

export function deleteUserAccount(userId: string): boolean {
  const res = db.prepare(`DELETE FROM user_profiles WHERE id = ?`).run(userId);
  return res.changes > 0;
}
