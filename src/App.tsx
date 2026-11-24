import React, { useCallback, useEffect, useState } from 'react';
import { CAREER_CATALOG } from './data/catalog.ts';
import { useTheme } from './context/ThemeContext.tsx';
import { apiFetch, setInMemoryAuthToken } from './utils/api.ts';
import { AuthModal } from './components/AuthModal.tsx';
import { CareerDetailPage } from './components/CareerDetailPage.tsx';
import { CommandPalette } from './components/CommandPalette.tsx';
import { DashboardWorkspace, type DashboardTab } from './components/DashboardWorkspace.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { OnboardingWizard } from './components/OnboardingWizard.tsx';
import { OfflineIndicator } from './components/PWAInstallButton.tsx';
import type {
  AssessmentAttempt,
  AuthUser,
  CareerEntry,
  CareerProject,
  LearningActivityEntry,
  MentorConversation,
  RoadmapData,
  UserPreferences,
} from './types/domain.ts';

interface WorkspacePayload {
  user: AuthUser;
  preferences: UserPreferences;
  activeRoadmap: RoadmapData | null;
  bookmarks: string[];
  projects: CareerProject[];
  assessmentAttempts: AssessmentAttempt[];
  conversations: MentorConversation[];
  learningActivity: LearningActivityEntry[];
  aiConfigured: boolean;
}

const DEFAULT_PREFS: UserPreferences = {
  stage: 'Self-Taught Explorer',
  interests: [],
  existingSkills: [],
  desiredCareer: 'ai-engineer',
  weeklyHours: 8,
  learningStyle: 'Hands-on projects',
  objectives: [],
  preferredLanguage: 'English',
  resourceCostPreference: 'free',
  theme: 'dark',
  notificationsEnabled: true,
  weeklyDigest: true,
  gentleBreakReminders: true,
  onboardingCompleted: false,
};

export default function App() {
  const { setTheme } = useTheme();
  const [pathname, setPathname] = useState<string>(() => window.location.pathname || '/');
  const [bootLoading, setBootLoading] = useState(true);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFS);
  const [activeRoadmap, setActiveRoadmap] = useState<RoadmapData | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [projects, setProjects] = useState<CareerProject[]>([]);
  const [assessmentAttempts, setAssessmentAttempts] = useState<AssessmentAttempt[]>([]);
  const [conversations, setConversations] = useState<MentorConversation[]>([]);
  const [learningActivity, setLearningActivity] = useState<LearningActivityEntry[]>([]);
  const [aiConfigured, setAiConfigured] = useState(false);

  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('overview');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [pendingGoal, setPendingGoal] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);

  const navigate = useCallback((nextPath: string) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setPathname(nextPath);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const hydrateWorkspace = useCallback(async () => {
    try {
      const data = await apiFetch<WorkspacePayload>('/api/workspace');
      setUser(data.user);
      setPreferences(data.preferences);
      setActiveRoadmap(data.activeRoadmap);
      setBookmarks(data.bookmarks);
      setProjects(data.projects);
      setAssessmentAttempts(data.assessmentAttempts);
      setConversations(data.conversations);
      setLearningActivity(data.learningActivity);
      setAiConfigured(data.aiConfigured);
      if (data.preferences.theme) {
        setTheme(data.preferences.theme);
      }
      return data;
    } catch {
      return null;
    }
  }, [setTheme]);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname || '/');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const health = await apiFetch<{ aiConfigured: boolean }>('/api/health');
        if (active) setAiConfigured(health.aiConfigured);
        const me = await apiFetch<{ user: AuthUser | null }>('/api/auth/me');
        if (active && me.user) {
          await hydrateWorkspace();
        }
      } catch {
        // stay unauthenticated cleanly
      } finally {
        if (active) setBootLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [hydrateWorkspace]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleStartRoadmap = (goal: string) => {
    setPendingGoal(goal);
    if (user) {
      navigate('/onboarding');
    } else {
      setAuthModalMode('register');
      setAuthModalOpen(true);
    }
  };

  const handleAuthenticated = async (authedUser: AuthUser, isNewAccount: boolean) => {
    setUser(authedUser);
    setAuthModalOpen(false);
    const data = await hydrateWorkspace();
    if (isNewAccount || pendingGoal || !data?.preferences.onboardingCompleted) {
      navigate('/onboarding');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // clear client state regardless
    }
    setInMemoryAuthToken(null);
    setUser(null);
    setActiveRoadmap(null);
    navigate('/');
  };

  const handleAccountDeleted = () => {
    setInMemoryAuthToken(null);
    setUser(null);
    setActiveRoadmap(null);
    navigate('/');
  };

  const careerSlugMatch = pathname.match(/^\/careers\/([a-z0-9-]+)$/i);
  const activeCareerEntry: CareerEntry | null = careerSlugMatch
    ? CAREER_CATALOG.find((c) => c.slug === careerSlugMatch[1]) ?? null
    : null;

  if (bootLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFC] dark:bg-[#050507] text-slate-500 dark:text-zinc-400 text-xs font-mono">
        Loading SkillPath AI...
      </div>
    );
  }

  return (
    <>
      {activeCareerEntry ? (
        <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#050507] text-slate-900 dark:text-[#F8FAFC]">
          <CareerDetailPage
            career={activeCareerEntry}
            onBack={() => navigate(user ? '/dashboard' : '/')}
            onSelectCareer={(slug) => navigate(`/careers/${slug}`)}
            onBuildRoadmap={(career) => handleStartRoadmap(career.title)}
          />
        </div>
      ) : pathname === '/onboarding' && user ? (
        <OnboardingWizard
          initialGoal={pendingGoal ?? undefined}
          initialPreferences={preferences}
          aiConfigured={aiConfigured}
          onComplete={(nextPrefs, newRoadmap) => {
            setPreferences(nextPrefs);
            setActiveRoadmap(newRoadmap);
            setPendingGoal(null);
            setDashboardTab('overview');
            navigate('/dashboard');
          }}
          onSkipToDashboard={() => {
            setPendingGoal(null);
            navigate('/dashboard');
          }}
        />
      ) : pathname === '/dashboard' && user ? (
        <DashboardWorkspace
          user={user}
          preferences={preferences}
          activeRoadmap={activeRoadmap}
          bookmarks={bookmarks}
          projects={projects}
          assessmentAttempts={assessmentAttempts}
          conversations={conversations}
          learningActivity={learningActivity}
          aiConfigured={aiConfigured}
          activeTab={dashboardTab}
          onChangeTab={setDashboardTab}
          onOpenCommandPalette={() => setCommandOpen(true)}
          onOpenCareerDetail={(slug) => navigate(`/careers/${slug}`)}
          onNavigateLanding={() => navigate('/')}
          onRoadmapUpdated={setActiveRoadmap}
          onPreferencesUpdated={setPreferences}
          onBookmarksUpdated={setBookmarks}
          onProjectCreated={(proj) => setProjects((prev) => [proj, ...prev])}
          onProjectUpdated={(proj) =>
            setProjects((prev) => prev.map((p) => (p.id === proj.id ? proj : p)))
          }
          onAttemptSaved={(attempt) => setAssessmentAttempts((prev) => [attempt, ...prev])}
          onConversationAdded={(conv) => setConversations((prev) => [conv, ...prev])}
          onActivityAdded={(entry) => setLearningActivity((prev) => [entry, ...prev])}
          onUserUpdated={setUser}
          onLogout={handleLogout}
          onAccountDeleted={handleAccountDeleted}
        />
      ) : (
        <LandingPage
          user={user}
          onStartRoadmap={handleStartRoadmap}
          onOpenAuth={(mode) => {
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
          onOpenDashboard={(tab) => {
            if (tab) setDashboardTab(tab as DashboardTab);
            navigate('/dashboard');
          }}
          onOpenCareer={(slug) => navigate(`/careers/${slug}`)}
          onOpenCommandPalette={() => setCommandOpen(true)}
        />
      )}

      <AuthModal
        open={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        isAuthenticated={Boolean(user)}
        activeRoadmap={activeRoadmap}
        onNavigateDashboard={(tab) => {
          setDashboardTab(tab as DashboardTab);
          navigate('/dashboard');
        }}
        onOpenCareer={(slug) => navigate(`/careers/${slug}`)}
        onSelectTheme={(nextTheme) => {
          setTheme(nextTheme);
          if (user) {
            apiFetch<{ preferences: UserPreferences }>('/api/preferences', {
              method: 'PATCH',
              body: JSON.stringify({ theme: nextTheme }),
            })
              .then((res) => setPreferences(res.preferences))
              .catch(() => {});
          }
        }}
      />

      <OfflineIndicator />
    </>
  );
}
