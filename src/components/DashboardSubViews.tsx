import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Bookmark,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  Download,
  ExternalLink,
  Laptop,
  Loader2,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { ASSESSMENT_BANK, CAREER_CATALOG, VERIFIED_RESOURCES } from '../data/catalog.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import { apiFetch, getInMemoryAuthToken } from '../utils/api.ts';
import type {
  AssessmentAttempt,
  AuthUser,
  CareerEntry,
  CareerProject,
  ProjectStatus,
  RoadmapData,
  ThemePreference,
  UserPreferences,
} from '../types/domain.ts';

/* ============================================================================
   1. LEARNING HUB VIEW
============================================================================ */

export const LearningHubView: React.FC<{
  bookmarks: string[];
  onToggleBookmark: (resourceId: string) => Promise<void>;
  onLogStudyNote: (label: string) => Promise<void>;
}> = ({ bookmarks, onToggleBookmark, onLogStudyNote }) => {
  const [query, setQuery] = useState('');
  const [costFilter, setCostFilter] = useState<'All' | 'Free' | 'Freemium' | 'Paid'>('All');
  const [levelFilter, setLevelFilter] = useState<'All' | 'Beginner' | 'Intermediate' | 'Advanced'>('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState<string | null>(null);

  const types = useMemo(
    () => ['All', ...Array.from(new Set(VERIFIED_RESOURCES.map((r) => r.type)))],
    []
  );
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(VERIFIED_RESOURCES.map((r) => r.skillCategory)))],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return VERIFIED_RESOURCES.filter((r) => {
      if (onlyBookmarked && !bookmarks.includes(r.id)) return false;
      if (costFilter !== 'All' && r.cost !== costFilter) return false;
      if (levelFilter !== 'All' && r.level !== levelFilter) return false;
      if (typeFilter !== 'All' && r.type !== typeFilter) return false;
      if (categoryFilter !== 'All' && r.skillCategory !== categoryFilter) return false;
      if (
        q &&
        !r.title.toLowerCase().includes(q) &&
        !r.provider.toLowerCase().includes(q) &&
        !r.description.toLowerCase().includes(q) &&
        !r.skillCategory.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [query, costFilter, levelFilter, typeFilter, categoryFilter, onlyBookmarked, bookmarks]);

  const handleTrackResource = async (title: string) => {
    await onLogStudyNote(`Started resource: ${title}`);
    setPinnedMessage(`Added "${title}" to your study activity log.`);
    window.setTimeout(() => setPinnedMessage(null), 3200);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Verified Learning Hub
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Curated documentation, open university courses, and interactive practice labs with transparent cost &amp; level metadata.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOnlyBookmarked((b) => !b)}
          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            onlyBookmarked
              ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-slate-900 dark:text-white'
              : 'border-black/10 dark:border-white/10 text-slate-600 dark:text-zinc-300'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 text-[#8B5CF6]" />
          Saved ({bookmarks.length})
        </button>
      </div>

      {pinnedMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
          {pinnedMessage}
        </div>
      )}

      {/* Filter Bar */}
      <div className="grid gap-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, docs, providers..."
            aria-label="Search learning resources"
            className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:border-[#8B5CF6] focus:outline-none"
          />
        </div>
        <select
          value={costFilter}
          onChange={(e) => setCostFilter(e.target.value as typeof costFilter)}
          aria-label="Filter by cost"
          className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-xs"
        >
          <option value="All">All Pricing</option>
          <option value="Free">Free</option>
          <option value="Freemium">Freemium</option>
          <option value="Paid">Paid</option>
        </select>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as typeof levelFilter)}
          aria-label="Filter by difficulty level"
          className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-xs"
        >
          <option value="All">All Levels</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by format"
            className="w-1/2 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-2.5 py-2 text-xs"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t === 'All' ? 'All Formats' : t}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by skill category"
            className="w-1/2 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-2.5 py-2 text-xs"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Skills' : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Resource Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((res) => {
          const isSaved = bookmarks.includes(res.id);
          return (
            <div
              key={res.id}
              className="flex flex-col justify-between rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs font-mono text-[#6366F1] dark:text-[#38BDF8]">
                    {res.provider} · {res.type} · {res.cost}
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleBookmark(res.id)}
                    aria-label={isSaved ? `Remove bookmark for ${res.title}` : `Bookmark ${res.title}`}
                    className={`rounded-lg p-1.5 transition-colors ${
                      isSaved
                        ? 'bg-[#8B5CF6]/15 text-[#8B5CF6]'
                        : 'text-slate-400 hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <h3 className="mt-2 font-display text-base font-bold text-slate-900 dark:text-white">
                  {res.title}
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  {res.description}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 dark:border-white/5 pt-3.5 text-xs">
                <span className="font-mono text-slate-500 dark:text-zinc-400">
                  {res.level} · {res.durationLabel}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTrackResource(res.title)}
                    className="rounded-lg border border-black/10 dark:border-white/10 px-2.5 py-1.5 font-medium text-slate-700 dark:text-zinc-300 hover:border-[#8B5CF6]"
                  >
                    Log Study
                  </button>
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-[#8B5CF6] px-3 py-1.5 font-semibold text-white hover:bg-[#7C3AED]"
                  >
                    Open
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] py-12 text-center text-sm text-slate-500 dark:text-zinc-400">
          No resources match the current filters. Try clearing one of your selections.
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   2. PROJECTS KANBAN + AI GENERATOR + PORTFOLIO EXPORT
============================================================================ */

const KANBAN_COLUMNS: Array<{ id: ProjectStatus; label: string; accent: string }> = [
  { id: 'planned', label: 'Planned', accent: 'text-slate-600 dark:text-zinc-400' },
  { id: 'in_progress', label: 'In Progress', accent: 'text-[#8B5CF6]' },
  { id: 'testing', label: 'Testing', accent: 'text-[#38BDF8]' },
  { id: 'completed', label: 'Completed', accent: 'text-emerald-500' },
];

export const ProjectsView: React.FC<{
  projects: CareerProject[];
  activeRoadmap: RoadmapData | null;
  aiConfigured: boolean;
  onProjectCreated: (project: CareerProject) => void;
  onProjectUpdated: (project: CareerProject) => void;
}> = ({ projects, activeRoadmap, aiConfigured, onProjectCreated, onProjectUpdated }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [aiTopic, setAiTopic] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Custom form state
  const [customTitle, setCustomTitle] = useState('');
  const [customObjective, setCustomObjective] = useState('');
  const [customDifficulty, setCustomDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [customSkills, setCustomSkills] = useState('Python, Testing');
  const [customTech, setCustomTech] = useState('TypeScript, SQLite');
  const [customHours, setCustomHours] = useState(12);
  const [customMilestones, setCustomMilestones] = useState(
    'Design architecture & schema\nImplement core functionality\nWrite automated tests & documentation'
  );
  const [savingCustom, setSavingCustom] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  const handleStatusChange = async (projectId: string, status: ProjectStatus) => {
    try {
      const res = await apiFetch<{ project: CareerProject }>(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      onProjectUpdated(res.project);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update project status.');
    }
  };

  const handleMilestoneToggle = async (projectId: string, milestoneId: string) => {
    try {
      const res = await apiFetch<{ project: CareerProject }>(
        `/api/projects/${projectId}/milestones/${milestoneId}`,
        { method: 'PATCH' }
      );
      onProjectUpdated(res.project);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update milestone.');
    }
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCustom(true);
    setErrorMsg(null);
    try {
      const milestones = customMilestones
        .split('\n')
        .map((m) => m.trim())
        .filter(Boolean);
      const res = await apiFetch<{ project: CareerProject }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: customTitle.trim(),
          objective: customObjective.trim(),
          careerSlug: activeRoadmap?.careerSlug ?? 'ai-engineer',
          difficulty: customDifficulty,
          requiredSkills: customSkills.split(',').map((s) => s.trim()).filter(Boolean),
          technologies: customTech.split(',').map((s) => s.trim()).filter(Boolean),
          estimatedHours: customHours,
          deliverables: ['Working repository', 'Architecture README'],
          evaluationCriteria: ['Passes edge-case tests', 'Clear documentation'],
          portfolioNotes: 'Created in SkillPath AI workspace',
          milestones: milestones.length > 0 ? milestones : ['Define scope', 'Build prototype', 'Document results'],
        }),
      });
      onProjectCreated(res.project);
      setShowCustomModal(false);
      setCustomTitle('');
      setCustomObjective('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not create project.');
    } finally {
      setSavingCustom(false);
    }
  };

  const handleGenerateAiProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAi(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch<{ project: CareerProject }>('/api/projects/generate', {
        method: 'POST',
        body: JSON.stringify({
          difficulty: aiDifficulty,
          focusTopic: aiTopic.trim() || undefined,
        }),
      });
      onProjectCreated(res.project);
      setShowAiModal(false);
      setAiTopic('');
      setSelectedProjectId(res.project.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'AI project generation failed.');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleExportPortfolio = () => {
    const mdLines = [
      `# SkillPath AI Portfolio Showcase`,
      `Target Career: ${activeRoadmap?.careerTitle ?? 'General Exploration'}`,
      `Exported: ${new Date().toISOString().slice(0, 10)}`,
      '',
      ...projects.map((p) =>
        [
          `## ${p.title} (${p.difficulty} · ${p.status.replace('_', ' ')})`,
          `**Objective:** ${p.objective}`,
          `**Technologies:** ${p.technologies.join(', ')}`,
          `**Milestones (${p.milestones.filter((m) => m.completed).length}/${p.milestones.length}):**`,
          ...p.milestones.map((m) => `- [${m.completed ? 'x' : ' '}] ${m.title}`),
          p.portfolioNotes ? `**Reflection:** ${p.portfolioNotes}` : '',
          '',
        ].join('\n')
      ),
    ];
    const blob = new Blob([mdLines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skillpath-portfolio-showcase.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Applied Portfolio Projects
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Move real builds from concept to verified portfolio case studies across Kanban stages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportPortfolio}
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:border-[#38BDF8] whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export Portfolio
          </button>
          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-white hover:border-[#8B5CF6] whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Custom Project
          </button>
          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7C3AED] whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Project Generator
          </button>
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid gap-4 lg:grid-cols-4">
        {KANBAN_COLUMNS.map((col) => {
          const items = projects.filter((p) => p.status === col.id);
          return (
            <div
              key={col.id}
              className="flex flex-col rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.015] dark:bg-[#0A0A10] p-3.5"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <span className={`font-display text-xs font-bold uppercase tracking-wider ${col.accent}`}>
                  {col.label}
                </span>
                <span className="font-mono text-xs text-slate-500 dark:text-zinc-500 tabular-nums">
                  {items.length}
                </span>
              </div>

              <div className="space-y-3">
                {items.map((proj) => {
                  const doneCount = proj.milestones.filter((m) => m.completed).length;
                  return (
                    <div
                      key={proj.id}
                      className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                        <span>{proj.difficulty}</span>
                        <span>{proj.estimatedHours}h</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedProjectId(proj.id)}
                        className="mt-1.5 text-left font-display text-sm font-bold text-slate-900 dark:text-white hover:text-[#8B5CF6] transition-colors"
                      >
                        {proj.title}
                      </button>
                      <p className="mt-1.5 text-xs text-slate-600 dark:text-zinc-400 line-clamp-2">
                        {proj.objective}
                      </p>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                        <span className="font-mono tabular-nums">
                          {doneCount}/{proj.milestones.length} milestones
                        </span>
                        {proj.isAiGenerated && (
                          <span className="text-[#8B5CF6] font-medium">AI Spec</span>
                        )}
                      </div>

                      <div className="mt-3 border-t border-black/5 dark:border-white/5 pt-2.5 flex items-center justify-between gap-2">
                        <select
                          value={proj.status}
                          aria-label={`Move ${proj.title} stage`}
                          onChange={(e) => handleStatusChange(proj.id, e.target.value as ProjectStatus)}
                          className="rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-2 py-1 text-[11px]"
                        >
                          {KANBAN_COLUMNS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setSelectedProjectId(proj.id)}
                          className="text-[11px] font-semibold text-[#6366F1] dark:text-[#38BDF8] hover:underline"
                        >
                          Milestones
                        </button>
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <div className="rounded-xl border border-dashed border-black/10 dark:border-white/10 py-6 text-center text-xs text-slate-400 dark:text-zinc-600">
                    Empty stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Project Detail & Milestones Modal */}
      {selectedProject && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedProjectId(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-[#6366F1] dark:text-[#38BDF8]">
                  {selectedProject.difficulty} · {selectedProject.estimatedHours} hrs · {selectedProject.technologies.join(', ')}
                </div>
                <h3 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
                  {selectedProject.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProjectId(null)}
                aria-label="Close project detail"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
              {selectedProject.objective}
            </p>

            <div className="mt-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Milestones Checklist
              </h4>
              <div className="mt-2.5 space-y-2">
                {selectedProject.milestones.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleMilestoneToggle(selectedProject.id, m.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-black/10 dark:border-white/10 px-3.5 py-2.5 text-left text-sm hover:border-[#8B5CF6] transition-colors"
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md border shrink-0 ${
                        m.completed
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-black/20 dark:border-white/20'
                      }`}
                    >
                      {m.completed && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span className={m.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}>
                      {m.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-black/10 dark:border-white/10 p-4">
                <div className="font-semibold text-slate-900 dark:text-white">Deliverables</div>
                <ul className="mt-2 space-y-1 text-slate-600 dark:text-zinc-400">
                  {selectedProject.deliverables.map((d, i) => (
                    <li key={i}>• {d}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-black/10 dark:border-white/10 p-4">
                <div className="font-semibold text-slate-900 dark:text-white">Evaluation Criteria</div>
                <ul className="mt-2 space-y-1 text-slate-600 dark:text-zinc-400">
                  {selectedProject.evaluationCriteria.map((c, i) => (
                    <li key={i}>• {c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Project Modal */}
      {showCustomModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowCustomModal(false)}
        >
          <form
            onSubmit={handleCreateCustom}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Add Custom Portfolio Project</h3>
              <button type="button" onClick={() => setShowCustomModal(false)} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Project title</label>
              <input
                type="text"
                required
                minLength={3}
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g., Local Telemetry Dashboard"
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Objective</label>
              <textarea
                required
                minLength={8}
                rows={3}
                value={customObjective}
                onChange={(e) => setCustomObjective(e.target.value)}
                placeholder="What problem does this project solve and verify?"
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Difficulty</label>
                <select
                  value={customDifficulty}
                  onChange={(e) => setCustomDifficulty(e.target.value as typeof customDifficulty)}
                  className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-sm"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Estimated hours</label>
                <input
                  type="number"
                  min={2}
                  max={200}
                  value={customHours}
                  onChange={(e) => setCustomHours(Number(e.target.value))}
                  className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={customSkills}
                  onChange={(e) => setCustomSkills(e.target.value)}
                  className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Technologies</label>
                <input
                  type="text"
                  value={customTech}
                  onChange={(e) => setCustomTech(e.target.value)}
                  className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Milestones (one per line)</label>
              <textarea
                rows={3}
                value={customMilestones}
                onChange={(e) => setCustomMilestones(e.target.value)}
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={savingCustom}
              className="w-full rounded-xl bg-[#8B5CF6] py-2.5 text-sm font-semibold text-white hover:bg-[#7C3AED]"
            >
              {savingCustom ? 'Saving...' : 'Create Project'}
            </button>
          </form>
        </div>
      )}

      {/* AI Project Generator Modal */}
      {showAiModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowAiModal(false)}
        >
          <form
            onSubmit={handleGenerateAiProject}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">AI Project Generator</h3>
              <button type="button" onClick={() => setShowAiModal(false)} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Generates a custom portfolio project spec aligned with your{' '}
              <strong>{activeRoadmap?.careerTitle ?? 'active career'}</strong> progress.
            </p>
            {!aiConfigured && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                Server `GEMINI_API_KEY` is currently unconfigured. Configure it in Secrets to run live AI generation, or use Custom Project.
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1">Difficulty</label>
              <select
                value={aiDifficulty}
                onChange={(e) => setAiDifficulty(e.target.value as typeof aiDifficulty)}
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-sm"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Focus topic (optional)</label>
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="e.g., RAG evaluation, robotics kinematics, accessible UI"
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loadingAi}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B5CF6] py-2.5 text-sm font-semibold text-white hover:bg-[#7C3AED] disabled:opacity-60"
            >
              {loadingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loadingAi ? 'Generating spec...' : 'Generate Project Spec'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   3. SKILL ASSESSMENTS VIEW
============================================================================ */

export const AssessmentsView: React.FC<{
  activeRoadmap: RoadmapData | null;
  attempts: AssessmentAttempt[];
  onAttemptSaved: (attempt: AssessmentAttempt) => void;
  onJumpToMentor: (prompt: string) => void;
}> = ({ activeRoadmap, attempts, onAttemptSaved, onJumpToMentor }) => {
  const defaultTrack =
    activeRoadmap?.careerSlug && ASSESSMENT_BANK[activeRoadmap.careerSlug]
      ? activeRoadmap.careerSlug
      : 'ai-engineer';
  const [selectedBankKey, setSelectedBankKey] = useState<string>(defaultTrack);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submittedAttempt, setSubmittedAttempt] = useState<AssessmentAttempt | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const bank = ASSESSMENT_BANK[selectedBankKey] ?? ASSESSMENT_BANK['general'];
  const answeredCount = bank.questions.filter((q) => answers[q.id] !== undefined).length;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      let score = 0;
      const weakSet = new Set<string>();
      for (const q of bank.questions) {
        if (answers[q.id] === q.correctIndex) {
          score += 1;
        } else {
          weakSet.add(q.skillTag);
        }
      }
      const weakSkills = Array.from(weakSet);
      const recommendations =
        weakSkills.length === 0
          ? ['Great conceptual clarity—apply these concepts inside a Projects Kanban build.']
          : weakSkills.map((sk) => `Review "${sk}" in your Skill Tree and try 1 practice exercise.`);

      const res = await apiFetch<{ attempt: AssessmentAttempt }>('/api/assessments/attempt', {
        method: 'POST',
        body: JSON.stringify({
          assessmentId: bank.id,
          title: bank.title,
          careerSlug: selectedBankKey,
          score,
          total: bank.questions.length,
          weakSkills,
          recommendations,
        }),
      });
      setSubmittedAttempt(res.attempt);
      onAttemptSaved(res.attempt);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Skill Assessments &amp; Diagnostics
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Practice conceptual, scenario, and code-reading questions to pinpoint where study time helps most.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {Object.entries(ASSESSMENT_BANK).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSelectedBankKey(key);
                setAnswers({});
                setSubmittedAttempt(null);
              }}
              className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedBankKey === key
                  ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-slate-900 dark:text-white'
                  : 'border-black/10 dark:border-white/10 text-slate-600 dark:text-zinc-400'
              }`}
            >
              {item.title.split(' ')[0]} Check
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-5">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {bank.title}
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">{bank.description}</p>
          </div>

          {bank.questions.map((q, idx) => {
            const chosen = answers[q.id];
            const showReview = submittedAttempt !== null;
            return (
              <div
                key={q.id}
                className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-5 space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                  <span className="font-mono">
                    Q{idx + 1} · {q.type.replace('_', ' ')}
                  </span>
                  <span>{q.skillTag}</span>
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                  {q.prompt}
                </p>
                {q.codeSnippet && (
                  <pre className="overflow-x-auto rounded-xl bg-[#050507] p-3.5 font-mono text-xs text-slate-200 border border-white/10">
                    <code>{q.codeSnippet}</code>
                  </pre>
                )}

                <div className="space-y-2 pt-1">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = chosen === optIdx;
                    const isCorrect = q.correctIndex === optIdx;
                    let cls =
                      'border-black/10 dark:border-white/10 hover:border-[#8B5CF6]/50 text-slate-700 dark:text-zinc-300';
                    if (showReview) {
                      if (isCorrect) {
                        cls = 'border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
                      } else if (isSelected && !isCorrect) {
                        cls = 'border-rose-500/60 bg-rose-500/10 text-rose-700 dark:text-rose-300';
                      }
                    } else if (isSelected) {
                      cls = 'border-[#8B5CF6] bg-[#8B5CF6]/12 text-slate-900 dark:text-white';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={showReview}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                        className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left text-xs transition-colors ${cls}`}
                      >
                        <span className="font-mono font-semibold shrink-0">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {showReview && (
                  <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-[#050507] p-3 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                    <strong className="text-slate-900 dark:text-white">Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex items-center justify-between rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-4">
            <span className="font-mono text-xs text-slate-500 dark:text-zinc-400 tabular-nums">
              {answeredCount} of {bank.questions.length} answered
            </span>
            {submittedAttempt ? (
              <button
                type="button"
                onClick={() => {
                  setAnswers({});
                  setSubmittedAttempt(null);
                }}
                className="rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-xs font-semibold hover:border-[#8B5CF6]"
              >
                Retake Diagnostic
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting || answeredCount < bank.questions.length}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 rounded-xl bg-[#8B5CF6] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#7C3AED] disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {submitting ? 'Scoring...' : 'Check Answers & Save'}
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Summary & Past Attempts */}
        <div className="lg:col-span-4 space-y-4">
          {submittedAttempt && (
            <div className="rounded-2xl border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 p-5 space-y-3">
              <div className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-white">
                <Award className="w-5 h-5 text-[#8B5CF6]" />
                Score: {submittedAttempt.score} / {submittedAttempt.total}
              </div>
              <div className="space-y-1.5 text-xs text-slate-700 dark:text-zinc-200">
                {submittedAttempt.recommendations.map((rec, i) => (
                  <p key={i}>• {rec}</p>
                ))}
              </div>
              {submittedAttempt.weakSkills.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onJumpToMentor(
                      `I missed questions on ${submittedAttempt.weakSkills.join(', ')} in my diagnostic check. Can you walk me through those concepts with an example?`
                    )
                  }
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#8B5CF6] py-2 text-xs font-semibold text-white hover:bg-[#7C3AED]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Review Weak Areas with AI
                </button>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-5">
            <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Recent Diagnostic History
            </h4>
            {attempts.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
                Complete a check to track concept mastery over time.
              </p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {attempts.slice(0, 6).map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-[#050507] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between font-medium text-slate-900 dark:text-slate-100">
                      <span className="truncate pr-2">{a.title}</span>
                      <span className="font-mono text-[#38BDF8] tabular-nums">
                        {a.score}/{a.total}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-slate-500">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   4. CAREER COMPARISON ENGINE
============================================================================ */

export const CareerComparisonView: React.FC<{
  onOpenCareerDetail: (slug: string) => void;
  onStartRoadmapForCareer: (career: CareerEntry) => void;
}> = ({ onOpenCareerDetail, onStartRoadmapForCareer }) => {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([
    'ai-engineer',
    'robotics-engineer',
    'software-developer',
  ]);

  const toggleCareer = (slug: string) => {
    if (selectedSlugs.includes(slug)) {
      if (selectedSlugs.length <= 2) return;
      setSelectedSlugs(selectedSlugs.filter((s) => s !== slug));
    } else {
      if (selectedSlugs.length >= 3) {
        setSelectedSlugs([...selectedSlugs.slice(1), slug]);
      } else {
        setSelectedSlugs([...selectedSlugs, slug]);
      }
    }
  };

  const compared = selectedSlugs
    .map((slug) => CAREER_CATALOG.find((c) => c.slug === slug))
    .filter((c): c is CareerEntry => Boolean(c));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Career Comparison Engine
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
          Select 2 or 3 pathways to compare training time, daily work, core skills, and cited regional salary benchmarks side by side.
        </p>
      </div>

      {/* Career Selector Chips */}
      <div className="flex flex-wrap gap-2">
        {CAREER_CATALOG.map((c) => {
          const active = selectedSlugs.includes(c.slug);
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => toggleCareer(c.slug)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-slate-900 dark:text-white'
                  : 'border-black/10 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:border-black/25 dark:hover:border-white/25'
              }`}
            >
              {c.title}
            </button>
          );
        })}
      </div>

      {/* Comparison Matrix */}
      <div className="grid gap-4 lg:grid-cols-3">
        {compared.map((c) => (
          <div
            key={c.slug}
            className="flex flex-col justify-between rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-5 space-y-5"
          >
            <div className="space-y-4">
              <div>
                <div className="text-xs font-mono text-[#6366F1] dark:text-[#38BDF8]">
                  {c.category} · {c.difficulty}
                </div>
                <h3 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
                  {c.title}
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  {c.shortDescription}
                </p>
              </div>

              <div className="space-y-2 border-t border-black/5 dark:border-white/5 pt-3 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Timeline</span>
                  <span className="font-mono font-medium">{c.estimatedMonthsRange}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Education</span>
                  <span className="text-right font-medium">{c.educationRequirement}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Environments</span>
                  <span className="text-right">{c.workEnvironments.slice(0, 2).join(', ')}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Mid-Level Range</span>
                  <span className="font-mono font-semibold tabular-nums">
                    ${c.salary.midMin.toLocaleString()}–${c.salary.midMax.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="border-t border-black/5 dark:border-white/5 pt-3">
                <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Core Skills</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.requiredSkills.slice(0, 4).map((s) => (
                    <span
                      key={s.name}
                      className="rounded-md bg-black/5 dark:bg-white/5 px-2 py-1 text-[11px] text-slate-700 dark:text-zinc-300"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-black/5 dark:border-white/5 pt-3 text-xs text-slate-600 dark:text-zinc-400">
                <div className="font-semibold text-slate-700 dark:text-zinc-300 mb-1">Daily Focus</div>
                {c.dailyResponsibilities[0]}
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-black/5 dark:border-white/5 pt-4">
              <button
                type="button"
                onClick={() => onOpenCareerDetail(c.slug)}
                className="flex-1 rounded-xl border border-black/10 dark:border-white/10 py-2 text-xs font-medium hover:border-[#38BDF8]"
              >
                Full Guide
              </button>
              <button
                type="button"
                onClick={() => onStartRoadmapForCareer(c)}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-[#8B5CF6] py-2 text-xs font-semibold text-white hover:bg-[#7C3AED]"
              >
                Set Path
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500 dark:text-zinc-500">
        Disclaimer: Side-by-side comparisons and salary ranges cite public labor data ({compared[0]?.salary.source ?? 'BLS OEWS'}) for exploratory learning only and are not predictive of individual hiring or compensation.
      </p>
    </div>
  );
};

/* ============================================================================
   5. SETTINGS VIEW
============================================================================ */

export const SettingsView: React.FC<{
  user: AuthUser;
  preferences: UserPreferences;
  onUpdatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;
  onUserUpdated: (user: AuthUser) => void;
  onAccountDeleted: () => void;
}> = ({ user, preferences, onUpdatePreferences, onUserUpdated, onAccountDeleted }) => {
  const { theme, setTheme } = useTheme();
  const [stage, setStage] = useState(preferences.stage);
  const [desiredCareer, setDesiredCareer] = useState(preferences.desiredCareer);
  const [weeklyHours, setWeeklyHours] = useState(preferences.weeklyHours);
  const [learningStyle, setLearningStyle] = useState(preferences.learningStyle);
  const [preferredLanguage, setPreferredLanguage] = useState(preferences.preferredLanguage);
  const [resourceCostPreference, setResourceCostPreference] = useState(preferences.resourceCostPreference);

  const [verifyCode, setVerifyCode] = useState('');
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [errorNote, setErrorNote] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSavePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusNote(null);
    setErrorNote(null);
    try {
      await onUpdatePreferences({
        stage,
        desiredCareer,
        weeklyHours,
        learningStyle,
        preferredLanguage,
        resourceCostPreference,
      });
      setStatusNote('Learning preferences updated.');
    } catch (err) {
      setErrorNote(err instanceof Error ? err.message : 'Unable to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeSelect = async (next: ThemePreference) => {
    setTheme(next);
    await onUpdatePreferences({ theme: next });
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNote(null);
    try {
      const res = await apiFetch<{ user: AuthUser }>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ code: verifyCode }),
      });
      onUserUpdated(res.user);
      setStatusNote('Email verified successfully.');
      setVerifyCode('');
    } catch (err) {
      setErrorNote(err instanceof Error ? err.message : 'Invalid verification code.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await apiFetch('/api/account', { method: 'DELETE' });
      onAccountDeleted();
    } catch (err) {
      setErrorNote(err instanceof Error ? err.message : 'Unable to delete account.');
    }
  };

  const handleExportJson = async () => {
    setErrorNote(null);
    try {
      const token = getInMemoryAuthToken();
      const res = await fetch('/api/account/export', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Unable to export data.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'skillpath-ai-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorNote(err instanceof Error ? err.message : 'Unable to export data.');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Workspace Settings
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
          Manage your profile, theme, pacing preferences, data exports, and account security.
        </p>
      </div>

      {statusNote && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
          {statusNote}
        </div>
      )}
      {errorNote && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
          {errorNote}
        </div>
      )}

      {/* Theme Selector */}
      <section className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
        <h3 className="font-display text-base font-semibold">Appearance &amp; Theme</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
          Choose OLED dark, daylight light, or match your operating system preference.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {(
            [
              { id: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
              { id: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
              { id: 'system', label: 'System', icon: <Laptop className="w-4 h-4" /> },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleThemeSelect(t.id)}
              className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-colors ${
                theme === t.id
                  ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-slate-900 dark:text-white'
                  : 'border-black/10 dark:border-white/10 text-slate-600 dark:text-zinc-400'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* Onboarding & Pacing Preferences */}
      <form
        onSubmit={handleSavePrefs}
        className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6 space-y-4"
      >
        <h3 className="font-display text-base font-semibold">Learning Preferences</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium mb-1">Current stage</label>
            <input
              type="text"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Primary career goal</label>
            <input
              type="text"
              value={desiredCareer}
              onChange={(e) => setDesiredCareer(e.target.value)}
              className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Weekly hours ({weeklyHours}h)</label>
            <input
              type="range"
              min={2}
              max={35}
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(Number(e.target.value))}
              className="mt-2 w-full accent-[#8B5CF6]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Learning style</label>
            <input
              type="text"
              value={learningStyle}
              onChange={(e) => setLearningStyle(e.target.value)}
              className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Language</label>
            <input
              type="text"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Resource preference</label>
            <select
              value={resourceCostPreference}
              onChange={(e) =>
                setResourceCostPreference(e.target.value as UserPreferences['resourceCostPreference'])
              }
              className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-[#050507] px-3 py-2 text-sm"
            >
              <option value="free">Free open resources</option>
              <option value="both">Both free &amp; paid</option>
              <option value="paid">Paid structured courses</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#8B5CF6] px-5 py-2 text-xs font-semibold text-white hover:bg-[#7C3AED]"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </form>

      {/* Notifications */}
      <section className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6 space-y-3">
        <h3 className="font-display text-base font-semibold">Notifications &amp; Well-being</h3>
        {(
          [
            {
              key: 'notificationsEnabled',
              label: 'Workspace milestone notifications',
              desc: 'Show gentle in-app summaries when stages unlock.',
            },
            {
              key: 'weeklyDigest',
              label: 'Weekly study pace recap',
              desc: 'Track consistency without stressful streak penalties.',
            },
            {
              key: 'gentleBreakReminders',
              label: 'Rest-day reminders',
              desc: 'Encourage recovery days to sustain long-term curiosity.',
            },
          ] as const
        ).map((item) => {
          const checked = Boolean(preferences[item.key]);
          return (
            <label
              key={item.key}
              className="flex items-center justify-between gap-4 rounded-xl border border-black/5 dark:border-white/5 p-3 cursor-pointer"
            >
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-slate-500 dark:text-zinc-400">{item.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onUpdatePreferences({ [item.key]: e.target.checked })}
                className="h-4 w-4 accent-[#8B5CF6]"
              />
            </label>
          );
        })}
      </section>

      {/* Account, Verification, Export & Deletion */}
      <section className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold">Account &amp; Data Controls</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Signed in as {user.email} · {user.emailVerified ? 'Verified' : 'Verification pending'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 px-3.5 py-2 text-xs font-medium hover:border-[#38BDF8]"
          >
            <Download className="w-3.5 h-3.5" />
            Export My Data (JSON)
          </button>
        </div>

        {!user.emailVerified && (
          <form onSubmit={handleVerifyEmail} className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <input
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              placeholder="Enter 6-digit verification code"
              className="flex-1 min-w-[180px] rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#050507] px-3 py-1.5 font-mono text-xs"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-semibold text-white"
            >
              Verify Email
            </button>
          </form>
        )}

        <div className="border-t border-black/10 dark:border-white/10 pt-4">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Permanently Delete Account
            </button>
          ) : (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 space-y-3">
              <div className="flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  This permanently deletes your profile, saved roadmaps, projects, assessments, and mentor history. This cannot be undone.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Confirm Permanent Deletion
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
