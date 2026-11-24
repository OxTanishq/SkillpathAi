import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  FolderKanban,
  GitCompare,
  GraduationCap,
  History,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  Map as MapIcon,
  MessageSquare,
  Mic,
  MicOff,
  Moon,
  MoreHorizontal,
  Network,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { CAREER_CATALOG, VERIFIED_RESOURCES } from '../data/catalog.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import { apiFetch, streamMentorChat } from '../utils/api.ts';
import {
  calculateAnalyticsSummary,
  calculateRoadmapProgress,
  filterCareers,
  nextStatusCycle,
} from '../utils/roadmapLogic.ts';
import {
  ActivityHeatmap,
  CircularProgressRing,
  StageProgressLineChart,
  WeeklyActivityBarChart,
} from './AnalyticsCharts.tsx';
import { BrandMark } from './BrandMark.tsx';
import {
  AssessmentsView,
  CareerComparisonView,
  LearningHubView,
  ProjectsView,
  SettingsView,
} from './DashboardSubViews.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { SafeMarkdown } from './SafeMarkdown.tsx';
import { SkillTreeGraph } from './SkillTreeGraph.tsx';
import type {
  AssessmentAttempt,
  AuthUser,
  CareerEntry,
  CareerProject,
  LearningActivityEntry,
  MentorConversation,
  MentorMessage,
  RoadmapData,
  SkillNodeData,
  SkillNodeStatus,
  UserPreferences,
} from '../types/domain.ts';

export type DashboardTab =
  | 'overview'
  | 'explorer'
  | 'roadmap'
  | 'skill-tree'
  | 'mentor'
  | 'resources'
  | 'projects'
  | 'assessments'
  | 'compare'
  | 'analytics'
  | 'settings';

interface WorkspaceProps {
  user: AuthUser;
  preferences: UserPreferences;
  activeRoadmap: RoadmapData | null;
  bookmarks: string[];
  projects: CareerProject[];
  assessmentAttempts: AssessmentAttempt[];
  conversations: MentorConversation[];
  learningActivity: LearningActivityEntry[];
  aiConfigured: boolean;
  activeTab: DashboardTab;
  onChangeTab: (tab: DashboardTab) => void;
  onOpenCommandPalette: () => void;
  onOpenCareerDetail: (slug: string) => void;
  onNavigateLanding: () => void;
  onRoadmapUpdated: (roadmap: RoadmapData) => void;
  onPreferencesUpdated: (prefs: UserPreferences) => void;
  onBookmarksUpdated: (bookmarks: string[]) => void;
  onProjectCreated: (project: CareerProject) => void;
  onProjectUpdated: (project: CareerProject) => void;
  onAttemptSaved: (attempt: AssessmentAttempt) => void;
  onConversationAdded: (conv: MentorConversation) => void;
  onActivityAdded: (entry: LearningActivityEntry) => void;
  onUserUpdated: (user: AuthUser) => void;
  onLogout: () => Promise<void>;
  onAccountDeleted: () => void;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const NAV_ITEMS: Array<{ id: DashboardTab; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4 shrink-0" /> },
  { id: 'explorer', label: 'Career Explorer', icon: <Compass className="w-4 h-4 shrink-0" /> },
  { id: 'roadmap', label: 'My Roadmap', icon: <MapIcon className="w-4 h-4 shrink-0" /> },
  { id: 'skill-tree', label: 'Skill Tree', icon: <Network className="w-4 h-4 shrink-0" /> },
  { id: 'mentor', label: 'AI Mentor', icon: <MessageSquare className="w-4 h-4 shrink-0" /> },
  { id: 'resources', label: 'Learning Hub', icon: <BookOpen className="w-4 h-4 shrink-0" /> },
  { id: 'projects', label: 'Projects', icon: <FolderKanban className="w-4 h-4 shrink-0" /> },
  { id: 'assessments', label: 'Assessments', icon: <GraduationCap className="w-4 h-4 shrink-0" /> },
  { id: 'compare', label: 'Compare Paths', icon: <GitCompare className="w-4 h-4 shrink-0" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4 shrink-0" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4 shrink-0" /> },
];

export const DashboardWorkspace: React.FC<WorkspaceProps> = ({
  user,
  preferences,
  activeRoadmap,
  bookmarks,
  projects,
  assessmentAttempts,
  conversations,
  learningActivity,
  aiConfigured,
  activeTab,
  onChangeTab,
  onOpenCommandPalette,
  onOpenCareerDetail,
  onNavigateLanding,
  onRoadmapUpdated,
  onPreferencesUpdated,
  onBookmarksUpdated,
  onProjectCreated,
  onProjectUpdated,
  onAttemptSaved,
  onConversationAdded,
  onActivityAdded,
  onUserUpdated,
  onLogout,
  onAccountDeleted,
}) => {
  const { resolvedTheme, setTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  // Career Explorer filters
  const [expQuery, setExpQuery] = useState('');
  const [expCategory, setExpCategory] = useState('All');
  const [expDifficulty, setExpDifficulty] = useState('All');
  const [expEnvironment, setExpEnvironment] = useState('All');
  const [expEducation, setExpEducation] = useState('All');

  // Roadmap management state
  const [expandedStages, setExpandedStages] = useState<number[]>([1, 2]);
  const [weeklyTargetInput, setWeeklyTargetInput] = useState(activeRoadmap?.weeklyHoursTarget ?? preferences.weeklyHours);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState<Array<{ version_number: number; change_note: string; created_at: string }>>([]);
  const [regenModalOpen, setRegenModalOpen] = useState(false);
  const [regenGoal, setRegenGoal] = useState(activeRoadmap?.careerTitle ?? 'AI Engineer');
  const [regenLoading, setRegenLoading] = useState(false);
  const [roadmapFeedback, setRoadmapFeedback] = useState<string | null>(null);

  // AI Mentor state
  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversations[0]?.id);
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [mentorInput, setMentorInput] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentText, setAttachmentText] = useState<string>('');
  const [streamingReply, setStreamingReply] = useState('');
  const [sendingMentor, setSendingMentor] = useState(false);
  const [mentorError, setMentorError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Study logger state
  const [studyMinutes, setStudyMinutes] = useState(30);
  const [studyLabel, setStudyLabel] = useState('');
  const [loggingActivity, setLoggingActivity] = useState(false);

  useEffect(() => {
    if (activeRoadmap) {
      setWeeklyTargetInput(activeRoadmap.weeklyHoursTarget);
    }
  }, [activeRoadmap]);

  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    apiFetch<{ messages: MentorMessage[] }>(`/api/mentor/conversations/${activeConvId}/messages`)
      .then((res) => setMessages(res.messages))
      .catch(() => {
        // silent fallback
      });
  }, [activeConvId]);

  const progress = useMemo(() => calculateRoadmapProgress(activeRoadmap), [activeRoadmap]);
  const analytics = useMemo(
    () =>
      calculateAnalyticsSummary({
        roadmap: activeRoadmap,
        projects,
        attempts: assessmentAttempts,
        activity: learningActivity,
      }),
    [activeRoadmap, projects, assessmentAttempts, learningActivity]
  );

  const explorerResults = useMemo(
    () =>
      filterCareers(CAREER_CATALOG, {
        query: expQuery,
        category: expCategory,
        difficulty: expDifficulty,
        environment: expEnvironment,
        education: expEducation,
      }),
    [expQuery, expCategory, expDifficulty, expEnvironment, expEducation]
  );

  const handleUpdateSkillStatus = async (skillId: string, status: SkillNodeStatus) => {
    if (!activeRoadmap) return;
    const res = await apiFetch<{ roadmap: RoadmapData }>(
      `/api/roadmaps/${activeRoadmap.id}/skills/${skillId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
    onRoadmapUpdated(res.roadmap);
    if (status === 'completed') {
      const skillTitle =
        activeRoadmap.stages.flatMap((s) => s.skills).find((s) => s.id === skillId)?.title ?? skillId;
      const act = await apiFetch<{ entry: LearningActivityEntry }>('/api/activity', {
        method: 'POST',
        body: JSON.stringify({
          minutesSpent: 25,
          label: `Completed skill: ${skillTitle}`,
          activityType: 'skill_completed',
        }),
      });
      onActivityAdded(act.entry);
    }
  };

  const handleSaveSchedule = async () => {
    if (!activeRoadmap) return;
    setSavingSchedule(true);
    setRoadmapFeedback(null);
    try {
      const res = await apiFetch<{ roadmap: RoadmapData }>(
        `/api/roadmaps/${activeRoadmap.id}/schedule`,
        {
          method: 'PATCH',
          body: JSON.stringify({ weeklyHoursTarget: weeklyTargetInput }),
        }
      );
      onRoadmapUpdated(res.roadmap);
      setRoadmapFeedback(`Schedule updated to ${weeklyTargetInput} hrs/week (new version saved).`);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleLoadVersions = async () => {
    if (!activeRoadmap) return;
    const res = await apiFetch<{
      versions: Array<{ version_number: number; change_note: string; created_at: string }>;
    }>(`/api/roadmaps/${activeRoadmap.id}/versions`);
    setVersions(res.versions);
    setVersionsOpen(true);
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!activeRoadmap) return;
    const res = await apiFetch<{ roadmap: RoadmapData }>(
      `/api/roadmaps/${activeRoadmap.id}/restore`,
      {
        method: 'POST',
        body: JSON.stringify({ versionNumber }),
      }
    );
    onRoadmapUpdated(res.roadmap);
    setVersionsOpen(false);
    setRoadmapFeedback(`Restored roadmap version v${versionNumber}.`);
  };

  const handleRegenerateRoadmap = async (mode: 'ai' | 'curated', goalOverride?: string, slugOverride?: string) => {
    setRegenLoading(true);
    setRoadmapFeedback(null);
    try {
      const res = await apiFetch<{ roadmap: RoadmapData }>('/api/roadmaps/generate', {
        method: 'POST',
        body: JSON.stringify({
          careerGoal: goalOverride ?? regenGoal,
          careerSlug: slugOverride,
          mode,
        }),
      });
      onRoadmapUpdated(res.roadmap);
      setRegenModalOpen(false);
      onChangeTab('roadmap');
      setRoadmapFeedback(`Switched active roadmap to ${res.roadmap.careerTitle} (${res.roadmap.sourceLabel}).`);
    } catch (err) {
      setRoadmapFeedback(err instanceof Error ? err.message : 'Unable to generate roadmap.');
    } finally {
      setRegenLoading(false);
    }
  };

  const handleToggleBookmark = async (resourceId: string) => {
    const res = await apiFetch<{ bookmarks: string[] }>('/api/bookmarks/toggle', {
      method: 'POST',
      body: JSON.stringify({ resourceId }),
    });
    onBookmarksUpdated(res.bookmarks);
  };

  const handleUpdatePreferences = async (patch: Partial<UserPreferences>) => {
    const res = await apiFetch<{ preferences: UserPreferences }>('/api/preferences', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    onPreferencesUpdated(res.preferences);
  };

  const handleLogStudyActivity = async (labelText: string, minutes = 30) => {
    setLoggingActivity(true);
    try {
      const res = await apiFetch<{ entry: LearningActivityEntry }>('/api/activity', {
        method: 'POST',
        body: JSON.stringify({
          minutesSpent: minutes,
          label: labelText,
          activityType: 'study_session',
        }),
      });
      onActivityAdded(res.entry);
      setStudyLabel('');
    } finally {
      setLoggingActivity(false);
    }
  };

  const sendMentorMessage = async (overrideText?: string) => {
    const text = (overrideText ?? mentorInput).trim();
    if (!text || sendingMentor) return;

    setMentorError(null);
    setSendingMentor(true);
    if (!overrideText) setMentorInput('');

    const optimisticUser: MentorMessage = {
      id: `local-${Date.now()}`,
      conversationId: activeConvId ?? 'pending',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setStreamingReply('');

    let accumulated = '';
    let resolvedConvId = activeConvId;

    await streamMentorChat(
      {
        conversationId: activeConvId,
        message: text,
        attachmentText: attachmentText || undefined,
      },
      {
        onMeta: (convId) => {
          resolvedConvId = convId;
          setActiveConvId(convId);
          if (!conversations.some((c) => c.id === convId)) {
            onConversationAdded({
              id: convId,
              title: text.slice(0, 60),
              careerSlug: activeRoadmap?.careerSlug ?? 'ai-engineer',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        },
        onChunk: (chunk) => {
          accumulated += chunk;
          setStreamingReply(accumulated);
        },
        onDone: (msgId) => {
          setMessages((prev) => [
            ...prev,
            {
              id: msgId,
              conversationId: resolvedConvId ?? 'done',
              role: 'assistant',
              content: accumulated,
              createdAt: new Date().toISOString(),
            },
          ]);
          setStreamingReply('');
          setAttachmentName(null);
          setAttachmentText('');
          setSendingMentor(false);
        },
        onError: (errMsg) => {
          setMentorError(errMsg);
          setStreamingReply('');
          setSendingMentor(false);
        },
      }
    );
  };

  const handleFileAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 120_000) {
      setMentorError('Please attach plain text, markdown, JSON, or CSV files under 120 KB.');
      return;
    }
    const content = await file.text();
    setAttachmentName(file.name);
    setAttachmentText(content.slice(0, 5800));
  };

  const toggleVoiceInput = () => {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setMentorError('Voice dictation is not supported in this browser.');
      return;
    }
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = (evt) => {
      const transcript = evt.results[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setMentorInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const openSkillInMentor = (skill: SkillNodeData) => {
    onChangeTab('mentor');
    setMentorInput(
      `Help me master "${skill.title}" from Stage ${skill.stageNumber} (${skill.stageTitle}). Explain the core concept clearly and give me one practical drill.`
    );
  };

  const activeNavMeta = NAV_ITEMS.find((n) => n.id === activeTab) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-screen flex bg-[#FAFAFC] dark:bg-[#050507] text-slate-900 dark:text-[#F8FAFC]">
      {/* Desktop Collapsible Left Sidebar */}
      <aside
        aria-label="Workspace navigation"
        className={`hidden md:flex flex-col border-r border-black/10 dark:border-white/10 bg-white dark:bg-[#0A0A10] transition-all duration-200 shrink-0 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-60'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-black/10 dark:border-white/10 px-4">
          <button
            type="button"
            onClick={onNavigateLanding}
            className="inline-flex items-center gap-2.5 font-display text-sm font-bold tracking-tight overflow-hidden"
          >
            <BrandMark className="w-6 h-6 shrink-0" />
            {!sidebarCollapsed && <span className="truncate">SkillPath AI</span>}
          </button>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rounded-lg p-1 text-slate-500 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#8B5CF6]/15 text-[#7C3AED] dark:text-white'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className={active ? 'text-[#8B5CF6]' : ''}>{item.icon}</span>
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-black/10 dark:border-white/10 p-3 space-y-2">
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={onNavigateLanding}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <Home className="w-3.5 h-3.5" />
              Public Landing Page
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-zinc-400 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex flex-1 flex-col min-w-0 pb-20 md:pb-0">
        {/* Top Context Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-black/10 dark:border-white/10 bg-white/90 dark:bg-[#0A0A10]/90 backdrop-blur-md px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onNavigateLanding}
              aria-label="SkillPath AI Home"
              className="md:hidden inline-flex items-center"
            >
              <BrandMark className="w-6 h-6" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-sm sm:text-base font-bold truncate">
                {activeNavMeta.label}
              </h1>
              {activeRoadmap && (
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                  {activeRoadmap.careerTitle} · {progress.percentComplete}% complete
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-1.5 text-xs text-slate-500 dark:text-zinc-400 hover:border-[#8B5CF6]"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="font-mono text-[10px]">⌘K</kbd>
            </button>

            <PWAInstallButton compact />

            <button
              type="button"
              onClick={() => {
                const next = resolvedTheme === 'dark' ? 'light' : 'dark';
                setTheme(next);
                handleUpdatePreferences({ theme: next }).catch(() => {});
              }}
              aria-label="Toggle theme"
              className="rounded-xl border border-black/10 dark:border-white/10 p-2 text-slate-600 dark:text-zinc-300 hover:border-[#8B5CF6]"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => onChangeTab('settings')}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs font-medium"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8B5CF6] text-[10px] font-bold text-white">
                {user.fullName.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-[110px] truncate">{user.fullName}</span>
            </button>
          </div>
        </header>

        {/* Active View Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* 1. OVERVIEW BENTO GRID */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-[#6366F1] dark:text-[#38BDF8]">
                    {preferences.stage} · {activeRoadmap?.weeklyHoursTarget ?? preferences.weeklyHours} hrs/wk target
                  </p>
                  <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight">
                    Welcome back, {user.fullName.split(' ')[0]}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeTab('skill-tree')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-xs font-semibold hover:border-[#8B5CF6]"
                  >
                    <Network className="w-3.5 h-3.5 text-[#38BDF8]" />
                    Open Skill Tree
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeTab('mentor')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7C3AED]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Ask AI Mentor
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-12">
                {/* Current Objective & Progress */}
                <div className="md:col-span-7 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6 flex flex-col justify-between gap-5">
                  <div>
                    <div className="text-xs font-mono text-slate-500 dark:text-zinc-400">
                      Active Objective · {activeRoadmap?.sourceLabel ?? 'Foundation Blueprint'}
                    </div>
                    <h3 className="mt-1.5 font-display text-xl font-bold">
                      {activeRoadmap?.careerTitle ?? 'Select a Career Path'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
                      {activeRoadmap?.objective ?? 'Explore careers to create a structured learning plan.'}
                    </p>
                  </div>

                  <CircularProgressRing
                    percent={progress.percentComplete}
                    label={`${progress.completedSkills} of ${progress.totalSkills} skills mastered`}
                    sublabel={`${progress.completedHours} / ${progress.totalHours} estimated hours completed · ${activeRoadmap?.estimatedDurationRange ?? ''}`}
                  />
                </div>

                {/* Next Recommended Skill */}
                <div className="md:col-span-5 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-mono text-[#8B5CF6]">Next Recommended Focus</div>
                    {progress.nextRecommendedSkill ? (
                      <>
                        <h3 className="mt-2 font-display text-lg font-bold">
                          {progress.nextRecommendedSkill.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                          Stage {progress.nextRecommendedSkill.stageNumber} ·{' '}
                          {progress.nextRecommendedSkill.estimatedHours} hrs estimated
                        </p>
                        <p className="mt-3 text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                          {progress.nextRecommendedSkill.summary}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
                        All core skills completed—check your portfolio projects or explore an adjacent career!
                      </p>
                    )}
                  </div>

                  {progress.nextRecommendedSkill && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateSkillStatus(
                            progress.nextRecommendedSkill!.id,
                            progress.nextRecommendedSkill!.status === 'in_progress'
                              ? 'completed'
                              : 'in_progress'
                          )
                        }
                        className="rounded-xl bg-[#8B5CF6] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#7C3AED]"
                      >
                        {progress.nextRecommendedSkill.status === 'in_progress'
                          ? 'Mark Completed'
                          : 'Start Skill'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openSkillInMentor(progress.nextRecommendedSkill!)}
                        className="rounded-xl border border-black/10 dark:border-white/10 px-3.5 py-2 text-xs font-medium hover:border-[#38BDF8]"
                      >
                        Explain with AI
                      </button>
                    </div>
                  )}
                </div>

                {/* Weekly Schedule */}
                <div className="md:col-span-6 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-semibold flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#38BDF8]" />
                      Weekly Schedule
                    </h3>
                    <button
                      type="button"
                      onClick={() => onChangeTab('roadmap')}
                      className="text-xs font-medium text-[#6366F1] dark:text-[#38BDF8] hover:underline"
                    >
                      Adjust hours
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {(activeRoadmap?.weeklySchedule ?? []).map((item) => (
                      <div
                        key={item.day}
                        className="flex items-center justify-between rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-[#050507] px-3.5 py-2 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono font-semibold text-[#8B5CF6] w-8 shrink-0">
                            {item.day}
                          </span>
                          <span className="truncate text-slate-700 dark:text-zinc-200">{item.focus}</span>
                        </div>
                        <span className="font-mono text-slate-500 dark:text-zinc-400 shrink-0 ml-2 tabular-nums">
                          {item.hours}h · {item.activityType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Saved Resources & Quick Study Log */}
                <div className="md:col-span-6 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6 flex flex-col justify-between gap-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-base font-semibold">Saved Resources</h3>
                      <button
                        type="button"
                        onClick={() => onChangeTab('resources')}
                        className="text-xs font-medium text-[#6366F1] dark:text-[#38BDF8] hover:underline"
                      >
                        Browse all
                      </button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {VERIFIED_RESOURCES.filter((r) => bookmarks.includes(r.id))
                        .slice(0, 3)
                        .map((r) => (
                          <a
                            key={r.id}
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between rounded-xl border border-black/5 dark:border-white/5 p-2.5 text-xs hover:border-[#8B5CF6]"
                          >
                            <span className="font-medium truncate pr-2">{r.title}</span>
                            <span className="font-mono text-[11px] text-slate-500 shrink-0">
                              {r.provider}
                            </span>
                          </a>
                        ))}
                      {bookmarks.length === 0 && (
                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                          Bookmark courses or docs in the Learning Hub to pin them here.
                        </p>
                      )}
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!studyLabel.trim()) return;
                      handleLogStudyActivity(studyLabel.trim(), studyMinutes);
                    }}
                    className="border-t border-black/5 dark:border-white/5 pt-4 space-y-2"
                  >
                    <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Quick Log Study Session
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={studyLabel}
                        onChange={(e) => setStudyLabel(e.target.value)}
                        placeholder="What did you practice today?"
                        className="flex-1 min-w-[160px] rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-1.5 text-xs"
                      />
                      <select
                        value={studyMinutes}
                        onChange={(e) => setStudyMinutes(Number(e.target.value))}
                        aria-label="Study minutes"
                        className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-2.5 py-1.5 text-xs font-mono"
                      >
                        <option value={15}>15m</option>
                        <option value={30}>30m</option>
                        <option value={45}>45m</option>
                        <option value={60}>60m</option>
                        <option value={90}>90m</option>
                      </select>
                      <button
                        type="submit"
                        disabled={loggingActivity || !studyLabel.trim()}
                        className="rounded-xl bg-[#8B5CF6] px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Log
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* 2. CAREER EXPLORER */}
          {activeTab === 'explorer' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold">Career Explorer</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
                  Filter careers by field, educational pathway, difficulty, and work environment.
                </p>
              </div>

              <div className="grid gap-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="relative lg:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={expQuery}
                    onChange={(e) => setExpQuery(e.target.value)}
                    placeholder="Search roles or skills..."
                    aria-label="Filter careers"
                    className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] pl-9 pr-3 py-2 text-xs"
                  />
                </div>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  aria-label="Category"
                  className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-xs"
                >
                  <option value="All">All Categories</option>
                  <option value="AI & Data">AI &amp; Data</option>
                  <option value="Software & Security">Software &amp; Security</option>
                  <option value="Engineering & Robotics">Engineering &amp; Robotics</option>
                  <option value="Medicine & Science">Medicine &amp; Science</option>
                  <option value="Design & Games">Design &amp; Games</option>
                  <option value="Business & Architecture">Business &amp; Architecture</option>
                </select>
                <select
                  value={expDifficulty}
                  onChange={(e) => setExpDifficulty(e.target.value)}
                  aria-label="Difficulty"
                  className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-xs"
                >
                  <option value="All">All Difficulties</option>
                  <option value="Beginner-Friendly">Beginner-Friendly</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Rigorous">Rigorous</option>
                  <option value="Highly Rigorous">Highly Rigorous</option>
                </select>
                <div className="flex gap-2">
                  <select
                    value={expEnvironment}
                    onChange={(e) => setExpEnvironment(e.target.value)}
                    aria-label="Work environment"
                    className="w-1/2 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-2 py-2 text-xs"
                  >
                    <option value="All">Any Environment</option>
                    <option value="Remote">Remote</option>
                    <option value="Studio">Studio</option>
                    <option value="Lab">Lab / Clinical</option>
                  </select>
                  <select
                    value={expEducation}
                    onChange={(e) => setExpEducation(e.target.value)}
                    aria-label="Education filter"
                    className="w-1/2 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-2 py-2 text-xs"
                  >
                    <option value="All">Any Education</option>
                    <option value="Portfolio">Portfolio / Self-taught</option>
                    <option value="Bachelor">Bachelor&apos;s</option>
                    <option value="Doctorate">Doctorate / MD</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {explorerResults.map((c: CareerEntry) => (
                  <div
                    key={c.slug}
                    className="flex flex-col justify-between rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-5"
                  >
                    <div>
                      <div className="text-xs font-mono text-[#6366F1] dark:text-[#38BDF8]">
                        {c.category} · {c.difficulty}
                      </div>
                      <h3 className="mt-1.5 font-display text-lg font-bold">{c.title}</h3>
                      <p className="mt-2 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                        {c.shortDescription}
                      </p>
                      <div className="mt-3 text-[11px] text-slate-500 dark:text-zinc-400">
                        {c.educationRequirement} · {c.estimatedMonthsRange}
                      </div>
                    </div>

                    <div className="mt-5 flex items-center gap-2 border-t border-black/5 dark:border-white/5 pt-4">
                      <button
                        type="button"
                        onClick={() => onOpenCareerDetail(c.slug)}
                        className="flex-1 rounded-xl border border-black/10 dark:border-white/10 py-2 text-xs font-medium hover:border-[#38BDF8]"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegenerateRoadmap('curated', c.title, c.slug)}
                        className="flex-1 rounded-xl bg-[#8B5CF6] py-2 text-xs font-semibold text-white hover:bg-[#7C3AED]"
                      >
                        Build Roadmap
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. MY ROADMAP */}
          {activeTab === 'roadmap' && activeRoadmap && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-mono text-[#6366F1] dark:text-[#38BDF8]">
                    v{activeRoadmap.version} · {activeRoadmap.sourceLabel} · {activeRoadmap.estimatedDurationRange}
                  </div>
                  <h2 className="mt-1 font-display text-2xl font-bold">{activeRoadmap.careerTitle}</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">{activeRoadmap.objective}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadVersions}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 px-3.5 py-2 text-xs font-medium hover:border-[#38BDF8]"
                  >
                    <History className="w-3.5 h-3.5" />
                    Version History
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegenModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7C3AED]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate / Switch Path
                  </button>
                </div>
              </div>

              {roadmapFeedback && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                  {roadmapFeedback}
                </div>
              )}

              {/* Weekly Hours Adjuster */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-4">
                <div className="flex items-center gap-3 text-xs">
                  <Clock className="w-4 h-4 text-[#8B5CF6]" />
                  <span>Weekly study commitment:</span>
                  <input
                    type="range"
                    min={2}
                    max={35}
                    value={weeklyTargetInput}
                    onChange={(e) => setWeeklyTargetInput(Number(e.target.value))}
                    aria-label="Weekly hours target"
                    className="w-32 accent-[#8B5CF6]"
                  />
                  <span className="font-mono font-bold tabular-nums">{weeklyTargetInput} hrs/wk</span>
                </div>
                <button
                  type="button"
                  disabled={savingSchedule || weeklyTargetInput === activeRoadmap.weeklyHoursTarget}
                  onClick={handleSaveSchedule}
                  className="rounded-xl border border-black/10 dark:border-white/10 px-3.5 py-1.5 text-xs font-semibold hover:border-[#8B5CF6] disabled:opacity-40"
                >
                  {savingSchedule ? 'Updating...' : 'Update Weekly Plan'}
                </button>
              </div>

              {/* Stages */}
              <div className="space-y-4">
                {activeRoadmap.stages.map((stage) => {
                  const isOpen = expandedStages.includes(stage.stageNumber);
                  const completedInStage = stage.skills.filter((s) => s.status === 'completed').length;
                  return (
                    <div
                      key={stage.stageNumber}
                      className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedStages((prev) =>
                            prev.includes(stage.stageNumber)
                              ? prev.filter((n) => n !== stage.stageNumber)
                              : [...prev, stage.stageNumber]
                          )
                        }
                        className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-black/[0.015] dark:hover:bg-white/[0.02]"
                      >
                        <div>
                          <div className="font-mono text-xs text-[#6366F1] dark:text-[#38BDF8]">
                            Stage {stage.stageNumber} · {stage.estimatedWeeks} · {completedInStage}/{stage.skills.length} completed
                          </div>
                          <h3 className="mt-1 font-display text-lg font-bold">{stage.title}</h3>
                          <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">{stage.description}</p>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 shrink-0 text-slate-400 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="border-t border-black/5 dark:border-white/5 p-5 space-y-4">
                          <div className="rounded-xl bg-black/[0.02] dark:bg-[#050507] p-3 text-xs text-slate-600 dark:text-zinc-300">
                            <strong>Stage Milestone:</strong> {stage.milestone}
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            {stage.skills.map((skill) => (
                              <div
                                key={skill.id}
                                className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-2.5"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-display text-sm font-bold">{skill.title}</div>
                                    <div className="font-mono text-[11px] text-slate-500">
                                      {skill.estimatedHours}h · {skill.status.replace('_', ' ')}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateSkillStatus(skill.id, nextStatusCycle(skill.status))
                                    }
                                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                                      skill.status === 'completed'
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                        : skill.status === 'in_progress'
                                          ? 'bg-[#8B5CF6]/15 text-[#8B5CF6]'
                                          : 'border border-black/10 dark:border-white/10 text-slate-600 dark:text-zinc-300'
                                    }`}
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    {skill.status === 'completed'
                                      ? 'Completed'
                                      : skill.status === 'in_progress'
                                        ? 'In Progress'
                                        : 'Start'}
                                  </button>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                                  {skill.summary}
                                </p>
                                <div className="flex items-center justify-between pt-1 text-[11px]">
                                  <button
                                    type="button"
                                    onClick={() => onChangeTab('skill-tree')}
                                    className="text-[#6366F1] dark:text-[#38BDF8] hover:underline"
                                  >
                                    Inspect in Tree
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openSkillInMentor(skill)}
                                    className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                  >
                                    Ask AI Mentor →
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. INTERACTIVE SKILL TREE */}
          {activeTab === 'skill-tree' && activeRoadmap && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-2xl font-bold">Interactive Skill Tree</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
                  Click any node to view prerequisites, verified study links, practice exercises, and update completion.
                </p>
              </div>
              <SkillTreeGraph
                roadmap={activeRoadmap}
                onUpdateSkillStatus={handleUpdateSkillStatus}
                onAskMentorAboutSkill={openSkillInMentor}
              />
            </div>
          )}

          {/* 5. STREAMING AI MENTOR */}
          {activeTab === 'mentor' && (
            <div className="grid gap-4 lg:grid-cols-12 h-[calc(100vh-11rem)] min-h-[540px]">
              {/* Conversation History Sidebar */}
              <div className="lg:col-span-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-3 flex flex-col">
                <button
                  type="button"
                  onClick={() => {
                    setActiveConvId(undefined);
                    setMessages([]);
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#8B5CF6] py-2 text-xs font-semibold text-white hover:bg-[#7C3AED]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Mentor Chat
                </button>
                <div className="mt-3 flex-1 overflow-y-auto space-y-1.5">
                  {conversations.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveConvId(c.id)}
                      className={`w-full rounded-xl px-3 py-2 text-left text-xs truncate transition-colors ${
                        activeConvId === c.id
                          ? 'bg-[#8B5CF6]/15 font-semibold text-slate-900 dark:text-white'
                          : 'text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      {c.title}
                    </button>
                  ))}
                  {conversations.length === 0 && (
                    <p className="px-2 py-4 text-xs text-slate-400">
                      Conversations are saved to your workspace automatically.
                    </p>
                  )}
                </div>
              </div>

              {/* Chat Workspace */}
              <div className="lg:col-span-9 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] flex flex-col overflow-hidden">
                <div className="border-b border-black/10 dark:border-white/10 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-display text-sm font-bold">SkillPath AI Mentor</div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Grounded in {activeRoadmap?.careerTitle ?? 'your profile'} ({progress.percentComplete}% complete)
                    </div>
                  </div>
                  {!aiConfigured && (
                    <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400">
                      GEMINI_API_KEY unconfigured on server
                    </span>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 overflow-x-auto border-b border-black/5 dark:border-white/5 px-4 py-2.5">
                  {[
                    'Explain this skill',
                    'What should I learn next?',
                    'Create a practice project',
                    'Test my knowledge',
                    'Simplify this explanation',
                    'Adjust my roadmap',
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMentorMessage(prompt)}
                      className="rounded-lg border border-black/10 dark:border-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-zinc-300 hover:border-[#8B5CF6] whitespace-nowrap shrink-0"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Message Feed */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {messages.length === 0 && !streamingReply && (
                    <div className="mx-auto max-w-md py-12 text-center space-y-2">
                      <Sparkles className="mx-auto w-7 h-7 text-[#8B5CF6]" />
                      <h3 className="font-display text-base font-bold">Ask anything about your learning path</h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                        Try asking for a beginner-friendly breakdown of your next skill node, a 1-weekend practice project, or feedback on study notes you attach below.
                      </p>
                    </div>
                  )}

                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-2xl p-4 ${
                        m.role === 'user'
                          ? 'ml-auto max-w-[82%] bg-[#8B5CF6]/15 text-slate-900 dark:text-slate-100'
                          : 'mr-auto max-w-[90%] border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-[#050507]'
                      }`}
                    >
                      <div className="mb-1 font-mono text-[10px] text-slate-500 dark:text-zinc-500">
                        {m.role === 'user' ? user.fullName : 'SkillPath AI Mentor'}
                      </div>
                      {m.role === 'assistant' ? (
                        <SafeMarkdown content={m.content} />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                  ))}

                  {streamingReply && (
                    <div className="mr-auto max-w-[90%] rounded-2xl border border-[#8B5CF6]/40 bg-black/[0.02] dark:bg-[#050507] p-4">
                      <div className="mb-1 font-mono text-[10px] text-[#8B5CF6]">
                        SkillPath AI Mentor · streaming...
                      </div>
                      <SafeMarkdown content={streamingReply} />
                    </div>
                  )}

                  {mentorError && (
                    <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                      {mentorError}
                    </div>
                  )}
                </div>

                {/* Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMentorMessage();
                  }}
                  className="border-t border-black/10 dark:border-white/10 p-3 space-y-2"
                >
                  {attachmentName && (
                    <div className="flex items-center justify-between rounded-lg bg-[#38BDF8]/10 px-3 py-1.5 text-xs text-sky-700 dark:text-sky-300">
                      <span>Attached notes (untrusted context): {attachmentName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachmentName(null);
                          setAttachmentText('');
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label
                      title="Attach .txt, .md, .json, or .csv notes"
                      className="cursor-pointer rounded-xl border border-black/10 dark:border-white/10 p-2.5 text-slate-500 hover:border-[#8B5CF6]"
                    >
                      <Paperclip className="w-4 h-4" />
                      <input
                        type="file"
                        accept=".txt,.md,.json,.csv"
                        onChange={handleFileAttachment}
                        className="sr-only"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      aria-label={listening ? 'Stop voice dictation' : 'Start voice dictation'}
                      className={`rounded-xl border p-2.5 transition-colors ${
                        listening
                          ? 'border-rose-500 bg-rose-500/15 text-rose-500'
                          : 'border-black/10 dark:border-white/10 text-slate-500 hover:border-[#8B5CF6]'
                      }`}
                    >
                      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <input
                      type="text"
                      value={mentorInput}
                      onChange={(e) => setMentorInput(e.target.value)}
                      placeholder="Ask your AI Mentor about skills, study plans, or code..."
                      aria-label="Message AI Mentor"
                      className="flex-1 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3.5 py-2.5 text-sm focus:border-[#8B5CF6] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={sendingMentor || !mentorInput.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#7C3AED] disabled:opacity-50"
                    >
                      {sendingMentor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 6. LEARNING HUB */}
          {activeTab === 'resources' && (
            <LearningHubView
              bookmarks={bookmarks}
              onToggleBookmark={handleToggleBookmark}
              onLogStudyNote={(label) => handleLogStudyActivity(label, 20)}
            />
          )}

          {/* 7. PROJECTS */}
          {activeTab === 'projects' && (
            <ProjectsView
              projects={projects}
              activeRoadmap={activeRoadmap}
              aiConfigured={aiConfigured}
              onProjectCreated={onProjectCreated}
              onProjectUpdated={onProjectUpdated}
            />
          )}

          {/* 8. ASSESSMENTS */}
          {activeTab === 'assessments' && (
            <AssessmentsView
              activeRoadmap={activeRoadmap}
              attempts={assessmentAttempts}
              onAttemptSaved={onAttemptSaved}
              onJumpToMentor={(prompt) => {
                onChangeTab('mentor');
                setMentorInput(prompt);
              }}
            />
          )}

          {/* 9. COMPARE CAREERS */}
          {activeTab === 'compare' && (
            <CareerComparisonView
              onOpenCareerDetail={onOpenCareerDetail}
              onStartRoadmapForCareer={(c) => handleRegenerateRoadmap('curated', c.title, c.slug)}
            />
          )}

          {/* 10. ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold">Personal Learning Analytics</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
                  Measured strictly from your logged sessions, completed skill nodes, projects, and diagnostic checks.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-5">
                  <div className="text-xs text-slate-500 dark:text-zinc-400">Skills Mastered</div>
                  <div className="mt-1 font-mono text-2xl font-bold tabular-nums">
                    {analytics.skillsCompleted} / {analytics.totalSkills}
                  </div>
                </div>
                <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-5">
                  <div className="text-xs text-slate-500 dark:text-zinc-400">Projects Completed</div>
                  <div className="mt-1 font-mono text-2xl font-bold tabular-nums">
                    {analytics.projectsCompleted} / {analytics.totalProjects}
                  </div>
                </div>
                <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-5">
                  <div className="text-xs text-slate-500 dark:text-zinc-400">Logged Study Time</div>
                  <div className="mt-1 font-mono text-2xl font-bold tabular-nums">
                    {Math.round((analytics.totalMinutesLogged / 60) * 10) / 10} hrs
                  </div>
                </div>
                <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-5">
                  <div className="text-xs text-slate-500 dark:text-zinc-400">Avg Diagnostic Score</div>
                  <div className="mt-1 font-mono text-2xl font-bold tabular-nums">
                    {analytics.averageAssessmentPercent !== null
                      ? `${analytics.averageAssessmentPercent}%`
                      : 'No checks yet'}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
                  <h3 className="font-display text-sm font-semibold mb-4">Overall Roadmap Progress</h3>
                  <CircularProgressRing
                    percent={analytics.roadmapPercent}
                    label="Core Stage Readiness"
                    sublabel={`${analytics.activeDaysCount} active learning day(s) recorded`}
                  />
                </div>
                <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
                  <h3 className="font-display text-sm font-semibold mb-2">7-Day Study Minutes</h3>
                  <WeeklyActivityBarChart data={analytics.weeklyMinutesSeries} />
                </div>
                <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
                  <h3 className="font-display text-sm font-semibold mb-3">28-Day Consistency Heatmap</h3>
                  <ActivityHeatmap entries={learningActivity} />
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
                <h3 className="font-display text-sm font-semibold mb-3">Stage-by-Stage Completion</h3>
                <StageProgressLineChart stages={analytics.stageCompletionSeries} />
              </div>
            </div>
          )}

          {/* 11. SETTINGS */}
          {activeTab === 'settings' && (
            <SettingsView
              user={user}
              preferences={preferences}
              onUpdatePreferences={handleUpdatePreferences}
              onUserUpdated={onUserUpdated}
              onAccountDeleted={onAccountDeleted}
            />
          )}
        </main>
      </div>

      {/* Compact Mobile Bottom Navigation Bar (keeps height ~60px, well under 15% of viewport) */}
      <nav
        aria-label="Mobile workspace navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden items-center justify-around border-t border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#0A0A10]/95 backdrop-blur-md h-14 px-2"
      >
        {(
          [
            { id: 'overview', label: 'Home', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'skill-tree', label: 'Tree', icon: <Network className="w-4 h-4" /> },
            { id: 'mentor', label: 'Mentor', icon: <MessageSquare className="w-4 h-4" /> },
            { id: 'projects', label: 'Projects', icon: <FolderKanban className="w-4 h-4" /> },
          ] as const
        ).map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMobileMoreOpen(false);
                onChangeTab(item.id);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-[10px] font-medium ${
                active ? 'text-[#8B5CF6]' : 'text-slate-500 dark:text-zinc-400'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMoreOpen((m) => !m)}
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-[10px] font-medium text-slate-500 dark:text-zinc-400"
        >
          <MoreHorizontal className="w-4 h-4" />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile More Drawer */}
      {mobileMoreOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-black/55 flex items-end"
          onClick={() => setMobileMoreOpen(false)}
        >
          <div
            className="w-full rounded-t-2xl border-t border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-5 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2">
              <span className="font-display text-sm font-bold">All Workspace Tools</span>
              <button type="button" onClick={() => setMobileMoreOpen(false)} aria-label="Close menu">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChangeTab(item.id);
                    setMobileMoreOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium ${
                    activeTab === item.id
                      ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#8B5CF6]'
                      : 'border-black/10 dark:border-white/10'
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 py-2.5 text-xs font-semibold text-rose-500"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {versionsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setVersionsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Roadmap Version History</h3>
              <button type="button" onClick={() => setVersionsOpen(false)} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 max-h-72 overflow-y-auto space-y-2.5">
              {versions.map((v) => (
                <div
                  key={v.version_number}
                  className="flex items-center justify-between gap-3 rounded-xl border border-black/10 dark:border-white/10 p-3 text-xs"
                >
                  <div>
                    <div className="font-mono font-semibold">v{v.version_number}</div>
                    <div className="text-slate-600 dark:text-zinc-400">{v.change_note}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(v.created_at).toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestoreVersion(v.version_number)}
                    className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 font-semibold hover:border-[#8B5CF6]"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Regenerate / Switch Roadmap Modal */}
      {regenModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setRegenModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Generate or Switch Roadmap</h3>
              <button type="button" onClick={() => setRegenModalOpen(false)} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Career Goal</label>
              <input
                type="text"
                value={regenGoal}
                onChange={(e) => setRegenGoal(e.target.value)}
                placeholder="e.g., Robotics Engineer, AI Engineer, Product Designer..."
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CAREER_CATALOG.slice(0, 6).map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setRegenGoal(c.title)}
                  className="rounded-lg border border-black/10 dark:border-white/10 px-2.5 py-1 text-[11px] hover:border-[#8B5CF6]"
                >
                  {c.title}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                disabled={regenLoading || regenGoal.trim().length < 2}
                onClick={() => handleRegenerateRoadmap('curated')}
                className="rounded-xl border border-black/10 dark:border-white/10 py-2.5 text-xs font-semibold hover:border-[#38BDF8] disabled:opacity-50"
              >
                {regenLoading ? 'Working...' : 'Curated Blueprint'}
              </button>
              <button
                type="button"
                disabled={regenLoading || regenGoal.trim().length < 2}
                onClick={() => handleRegenerateRoadmap('ai')}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#8B5CF6] py-2.5 text-xs font-semibold text-white hover:bg-[#7C3AED] disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {regenLoading ? 'Generating...' : 'AI Roadmap'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
