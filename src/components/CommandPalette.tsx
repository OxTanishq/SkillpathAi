import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Compass,
  FolderKanban,
  Laptop,
  Moon,
  Search,
  Sparkles,
  Sun,
} from 'lucide-react';
import { CAREER_CATALOG, VERIFIED_RESOURCES } from '../data/catalog.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import type { RoadmapData } from '../types/domain.ts';

interface CommandAction {
  id: string;
  group: 'Navigation' | 'Careers' | 'Roadmap Skills' | 'Resources' | 'Theme';
  label: string;
  subtitle: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  activeRoadmap: RoadmapData | null;
  onNavigateDashboard: (tab: string) => void;
  onOpenCareer: (slug: string) => void;
  onSelectTheme: (theme: 'dark' | 'light' | 'system') => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  isAuthenticated,
  activeRoadmap,
  onNavigateDashboard,
  onOpenCareer,
  onSelectTheme,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const { theme } = useTheme();

  const actions = useMemo<CommandAction[]>(() => {
    const items: CommandAction[] = [];

    if (isAuthenticated) {
      const navTargets = [
        { id: 'overview', label: 'Overview', sub: 'Dashboard home & weekly schedule' },
        { id: 'explorer', label: 'Career Explorer', sub: 'Search & filter all career paths' },
        { id: 'roadmap', label: 'My Roadmap', sub: 'Stages, duration & version history' },
        { id: 'skill-tree', label: 'Interactive Skill Tree', sub: 'Visual node graph & prerequisites' },
        { id: 'mentor', label: 'AI Mentor', sub: 'Ask questions & plan projects' },
        { id: 'resources', label: 'Learning Hub', sub: 'Verified courses, docs & tutorials' },
        { id: 'projects', label: 'Projects Kanban', sub: 'Track practical portfolio builds' },
        { id: 'assessments', label: 'Skill Assessments', sub: 'Check concepts & get recommendations' },
        { id: 'compare', label: 'Career Comparison', sub: 'Compare pathways side by side' },
        { id: 'analytics', label: 'Personal Analytics', sub: 'Activity, hours & milestones' },
        { id: 'settings', label: 'Settings', sub: 'Preferences, theme & data export' },
      ];
      for (const t of navTargets) {
        items.push({
          id: `nav-${t.id}`,
          group: 'Navigation',
          label: t.label,
          subtitle: t.sub,
          onSelect: () => {
            onNavigateDashboard(t.id);
            onClose();
          },
        });
      }
    }

    if (activeRoadmap) {
      for (const stage of activeRoadmap.stages) {
        for (const sk of stage.skills) {
          items.push({
            id: `skill-${sk.id}`,
            group: 'Roadmap Skills',
            label: sk.title,
            subtitle: `Stage ${stage.stageNumber}: ${stage.title} · ${sk.estimatedHours}h`,
            onSelect: () => {
              onNavigateDashboard('skill-tree');
              onClose();
            },
          });
        }
      }
    }

    for (const c of CAREER_CATALOG) {
      items.push({
        id: `career-${c.slug}`,
        group: 'Careers',
        label: c.title,
        subtitle: `${c.category} · ${c.difficulty}`,
        onSelect: () => {
          onOpenCareer(c.slug);
          onClose();
        },
      });
    }

    for (const r of VERIFIED_RESOURCES.slice(0, 8)) {
      items.push({
        id: `res-${r.id}`,
        group: 'Resources',
        label: r.title,
        subtitle: `${r.provider} · ${r.cost} · ${r.type}`,
        onSelect: () => {
          if (isAuthenticated) {
            onNavigateDashboard('resources');
            onClose();
          } else {
            window.open(r.url, '_blank', 'noopener,noreferrer');
            onClose();
          }
        },
      });
    }

    items.push(
      {
        id: 'theme-dark',
        group: 'Theme',
        label: 'Switch to Dark Theme',
        subtitle: theme === 'dark' ? 'Currently active' : 'Near-black OLED workspace',
        onSelect: () => {
          onSelectTheme('dark');
          onClose();
        },
      },
      {
        id: 'theme-light',
        group: 'Theme',
        label: 'Switch to Light Theme',
        subtitle: theme === 'light' ? 'Currently active' : 'Soft daylight workspace',
        onSelect: () => {
          onSelectTheme('light');
          onClose();
        },
      },
      {
        id: 'theme-system',
        group: 'Theme',
        label: 'Use System Theme',
        subtitle: theme === 'system' ? 'Currently active' : 'Follow OS preference',
        onSelect: () => {
          onSelectTheme('system');
          onClose();
        },
      }
    );

    return items;
  }, [activeRoadmap, isAuthenticated, onClose, onNavigateDashboard, onOpenCareer, onSelectTheme, theme]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions.slice(0, 14);
    return actions
      .filter(
        (a) =>
          a.label.toLowerCase().includes(q) ||
          a.subtitle.toLowerCase().includes(q) ||
          a.group.toLowerCase().includes(q)
      )
      .slice(0, 14);
  }, [actions, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (filtered.length === 0 ? 0 : (prev + 1) % filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) =>
          filtered.length === 0 ? 0 : (prev - 1 + filtered.length) % filtered.length
        );
      } else if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault();
        filtered[activeIndex].onSelect();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, filtered, activeIndex, onClose]);

  if (!open) return null;

  const iconForGroup = (group: CommandAction['group']) => {
    switch (group) {
      case 'Careers':
        return <Compass className="w-4 h-4 text-[#8B5CF6]" />;
      case 'Roadmap Skills':
        return <Sparkles className="w-4 h-4 text-[#38BDF8]" />;
      case 'Resources':
        return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case 'Theme':
        return theme === 'dark' ? (
          <Moon className="w-4 h-4 text-amber-400" />
        ) : theme === 'light' ? (
          <Sun className="w-4 h-4 text-amber-500" />
        ) : (
          <Laptop className="w-4 h-4 text-indigo-400" />
        );
      default:
        return <FolderKanban className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 pt-[12vh] px-4"
      onClick={onClose}
    >
      <div
        className="glass-surface w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-black/10 dark:border-white/10 px-4 py-3.5">
          <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search careers, skills, pages, resources, or themes..."
            aria-label="Command palette search"
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-black/10 dark:border-white/10 px-2 py-0.5 font-mono text-[11px] text-slate-500 dark:text-zinc-400"
          >
            ESC
          </button>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-zinc-400">
              No matching commands found for “{query}”.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const selected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={item.onSelect}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? 'bg-[#8B5CF6]/15 text-slate-900 dark:text-white'
                      : 'text-slate-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0">{iconForGroup(item.group)}</div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{item.label}</div>
                      <div className="truncate text-xs text-slate-500 dark:text-zinc-400">
                        {item.group} · {item.subtitle}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" aria-hidden="true" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
