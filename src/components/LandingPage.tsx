import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Compass,
  Menu,
  Moon,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { CAREER_CATALOG, buildDefaultStagesForCareer } from '../data/catalog.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import { filterCareers } from '../utils/roadmapLogic.ts';
import { BrandMark } from './BrandMark.tsx';
import { HeroConstellation3D } from './HeroConstellation3D.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import type { AuthUser, CareerEntry } from '../types/domain.ts';

interface LandingPageProps {
  user: AuthUser | null;
  onStartRoadmap: (goal: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenDashboard: (tab?: string) => void;
  onOpenCareer: (slug: string) => void;
  onOpenCommandPalette: () => void;
}

const SUGGESTION_CAREERS = [
  { label: 'AI Engineer', key: 'ai-engineer' },
  { label: 'Game Developer', key: 'game-developer' },
  { label: 'Entrepreneur', key: 'entrepreneur' },
  { label: 'Doctor', key: 'physician' },
  { label: 'Robotics Engineer', key: 'robotics-engineer' },
  { label: 'Software Developer', key: 'software-developer' },
  { label: 'Architect', key: 'architect' },
];

const CATEGORY_CARDS = [
  {
    title: 'Artificial Intelligence & Data',
    categoryFilter: 'AI & Data',
    description:
      'Machine learning systems, statistics, LLM evaluation, and applied research pathways.',
    image: '/src/assets/images/cat_ai_software_1795521685421.jpg',
    fallbackAccent: 'from-violet-600/30 to-indigo-600/20',
  },
  {
    title: 'Robotics & Engineering',
    categoryFilter: 'Engineering & Robotics',
    description:
      'Control systems, embedded hardware, autonomous perception, and physical engineering.',
    image: '/src/assets/images/cat_robotics_eng_1795521686535.jpg',
    fallbackAccent: 'from-sky-500/30 to-indigo-600/20',
  },
  {
    title: 'Medicine & Life Sciences',
    categoryFilter: 'Medicine & Science',
    description:
      'Pre-clinical sciences, accredited medical pathways, diagnostics, and patient care.',
    image: '/src/assets/images/cat_medicine_bio_1795521686982.jpg',
    fallbackAccent: 'from-emerald-500/25 to-sky-500/20',
  },
  {
    title: 'Architecture, Design & Games',
    categoryFilter: 'Design & Games',
    description:
      'Spatial environments, visual typography systems, interactive 3D worlds, and architecture.',
    image: '/src/assets/images/cat_design_game_1795521687988.jpg',
    fallbackAccent: 'from-amber-500/25 to-violet-600/20',
  },
];

const JOURNEY_STAGES = [
  {
    step: '01',
    title: 'Discover',
    summary: 'Explore diverse disciplines, daily realities, and realistic entry pathways without locking into a single box.',
  },
  {
    step: '02',
    title: 'Learn',
    summary: 'Follow staged skill trees linking prerequisites, verified open resources, and sustainable weekly schedules.',
  },
  {
    step: '03',
    title: 'Build',
    summary: 'Turn concepts into verifiable real-world projects tracked through structured milestones and rubrics.',
  },
  {
    step: '04',
    title: 'Grow',
    summary: 'Assess your grasp, reflect with an AI mentor, and adapt your roadmap as your goals evolve.',
  },
];

const DEMO_MENTOR_CONVERSATION = [
  {
    role: 'user' as const,
    text: 'I want to become an AI engineer, but I only have 7 hours a week alongside school. Where should I begin?',
  },
  {
    role: 'assistant' as const,
    text: 'Start with Stage 1 (Python & Testing) before jumping into neural networks. With 7 hours/week, dedicate two 2-hour sessions to Python data structures and one 3-hour weekend block to building a tested CLI script. Once those prerequisites are complete, Stage 2 introduces the linear algebra used directly inside PyTorch.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  user,
  onStartRoadmap,
  onOpenAuth,
  onOpenDashboard,
  onOpenCareer,
  onOpenCommandPalette,
}) => {
  const { resolvedTheme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [goalInput, setGoalInput] = useState('');
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(0);
  const [activeJourneyStage, setActiveJourneyStage] = useState(0);

  // Section 3 demo roadmap state
  const demoStages = useMemo(() => buildDefaultStagesForCareer('ai-engineer').slice(0, 4), []);
  const [expandedDemoSkillId, setExpandedDemoSkillId] = useState<string>('ai-py-core');

  // Section 6 career search state
  const [careerQuery, setCareerQuery] = useState('');
  const [careerCategory, setCareerCategory] = useState('All');

  // Legal / Info modal
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | 'accessibility' | 'contact' | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (goalInput.trim().length > 0) return;
    const timer = window.setInterval(() => {
      setActiveSuggestionIdx((idx) => (idx + 1) % SUGGESTION_CAREERS.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [goalInput]);

  const activeSuggestion = SUGGESTION_CAREERS[activeSuggestionIdx];

  const matchedCareers = useMemo(
    () =>
      filterCareers(CAREER_CATALOG, {
        query: careerQuery,
        category: careerCategory,
      }),
    [careerQuery, careerCategory]
  );

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = goalInput.trim() || activeSuggestion.label;
    onStartRoadmap(target);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#050507] text-slate-900 dark:text-[#F8FAFC]">
      {/* Floating Centered Glass Navbar */}
      <header className="fixed top-4 left-0 right-0 z-40 px-4">
        <div
          className={`mx-auto flex items-center justify-between gap-6 rounded-2xl transition-all duration-300 glass-surface ${
            scrolled ? 'max-w-4xl px-4 py-2.5 shadow-xl' : 'max-w-6xl px-5 py-3 shadow-lg'
          }`}
        >
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2.5 font-display text-base font-bold tracking-tight whitespace-nowrap shrink-0"
          >
            <BrandMark className="w-6 h-6" />
            <span>SkillPath AI</span>
          </a>

          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-zinc-300">
            <a
              href="#explore-careers"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('explore-careers');
              }}
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Explore Careers
            </a>
            <a
              href="#roadmap-demo"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('roadmap-demo');
              }}
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Roadmap
            </a>
            <a
              href="#mentor-demo"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('mentor-demo');
              }}
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              AI Mentor
            </a>
            <a
              href="#capabilities"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('capabilities');
              }}
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Resources
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
              className="hidden sm:inline-flex items-center justify-center rounded-xl p-2 text-slate-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <button
                type="button"
                onClick={() => onOpenDashboard('overview')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7C3AED] transition-colors whitespace-nowrap shrink-0"
              >
                Open Workspace
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="hidden sm:inline-flex px-3 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:text-slate-950 dark:hover:text-white whitespace-nowrap shrink-0"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B5CF6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7C3AED] transition-colors whitespace-nowrap shrink-0"
                >
                  Get Started
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
              className="inline-flex md:hidden items-center justify-center rounded-xl p-2 text-slate-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="mx-auto mt-2 max-w-4xl rounded-2xl p-4 glass-surface md:hidden space-y-2 shadow-2xl">
            <button
              type="button"
              onClick={() => scrollToSection('explore-careers')}
              className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5"
            >
              Explore Careers
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('roadmap-demo')}
              className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5"
            >
              Roadmap
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('mentor-demo')}
              className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5"
            >
              AI Mentor
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('capabilities')}
              className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5"
            >
              Resources
            </button>
            <div className="flex items-center justify-between border-t border-black/10 dark:border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-zinc-300"
              >
                {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {resolvedTheme === 'dark' ? 'Light theme' : 'Dark theme'}
              </button>
              {!user && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="text-xs font-semibold text-[#8B5CF6]"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Full-Screen Hero Section */}
      <section
        id="top"
        className="relative flex min-h-screen items-center overflow-hidden pt-28 pb-20 px-4 sm:px-6"
      >
        <HeroConstellation3D activeCareerKey={activeSuggestion.key} resolvedTheme={resolvedTheme} />

        {/* Subtle legibility scrim behind hero copy */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#FAFAFC]/90 via-[#FAFAFC]/60 to-transparent dark:from-[#050507]/90 dark:via-[#050507]/55 dark:to-transparent"
        />

        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-medium tracking-[0.18em] text-[#6366F1] dark:text-[#38BDF8]">
              THE INTELLIGENT CAREER PLATFORM
            </p>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-950 dark:text-white leading-[1.08] [text-wrap:balance]">
              Your future starts with a path.
            </h1>
            <p className="mt-5 max-w-xl text-base sm:text-lg text-slate-600 dark:text-zinc-300 leading-relaxed">
              Discover your potential, master the right skills and build your future with a personalized AI-powered career roadmap.
            </p>

            {/* Interactive Ambition Input */}
            <form onSubmit={handleHeroSubmit} className="mt-8">
              <label htmlFor="hero-ambition-input" className="sr-only">
                What do you want to become?
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl border border-black/15 dark:border-white/15 bg-white/95 dark:bg-[#101018]/92 p-2 shadow-xl">
                <div className="flex flex-1 items-center gap-2.5 px-3">
                  <Sparkles className="w-4 h-4 text-[#8B5CF6] shrink-0" aria-hidden="true" />
                  <input
                    id="hero-ambition-input"
                    type="text"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    placeholder={`What do you want to become? Try "${activeSuggestion.label}"`}
                    className="w-full bg-transparent py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B5CF6] px-5 py-3 text-sm font-semibold text-white hover:bg-[#7C3AED] transition-colors whitespace-nowrap shrink-0"
                >
                  Build My Roadmap
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Rotating Interactive Career Presets */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-zinc-400 mr-1">Explore paths:</span>
              {SUGGESTION_CAREERS.map((item, idx) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setActiveSuggestionIdx(idx);
                    setGoalInput(item.label);
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    idx === activeSuggestionIdx
                      ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-slate-950 dark:text-white'
                      : 'border-black/10 dark:border-white/10 bg-white/60 dark:bg-[#101018]/75 text-slate-600 dark:text-zinc-300 hover:border-[#8B5CF6]/50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Secondary Actions */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => scrollToSection('explore-careers')}
                className="inline-flex items-center gap-2 rounded-xl border border-black/15 dark:border-white/15 bg-white/85 dark:bg-[#101018]/85 px-5 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 hover:border-[#38BDF8]/60 transition-colors"
              >
                <Compass className="w-4 h-4 text-[#38BDF8]" />
                Explore Careers
              </button>
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                Quick search
                <kbd className="rounded border border-black/10 dark:border-white/10 px-1.5 py-0.5 font-mono text-[10px]">
                  ⌘K
                </kbd>
              </button>
              <PWAInstallButton compact />
            </div>
          </div>
        </div>
      </section>

      {/* Section 1 — Discover your future */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-24">
        <div className="max-w-2xl">
          <p className="font-mono text-xs text-[#6366F1] dark:text-[#38BDF8]">01 · Career Universes</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight [text-wrap:balance]">
            Discover your future across disciplines
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-zinc-400">
            Explore authentic day-to-day responsibilities, skill trees, and multiple entry pathways without boxing yourself into one path.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_CARDS.map((card) => (
            <motion.div
              key={card.title}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.18 }}
              className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018]"
            >
              <div className={`relative aspect-[4/3] overflow-hidden bg-gradient-to-br ${card.fallbackAccent}`}>
                <img
                  src={card.image}
                  alt={card.title}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                    {card.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCareerCategory(card.categoryFilter);
                    scrollToSection('explore-careers');
                  }}
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#6366F1] dark:text-[#38BDF8] hover:gap-2.5 transition-all"
                >
                  Explore field
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Section 2 — From ambition to achievement */}
      <section className="border-y border-black/5 dark:border-white/5 bg-black/[0.015] dark:bg-[#0A0A10] py-24 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="font-mono text-xs text-[#6366F1] dark:text-[#38BDF8]">02 · Structured Progression</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight [text-wrap:balance]">
              From ambition to achievement
            </h2>
            <p className="mt-3 text-base text-slate-600 dark:text-zinc-400">
              Every goal moves through four transparent stages designed to keep learning sustainable and verifiable.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-4 relative">
            {JOURNEY_STAGES.map((stage, idx) => {
              const active = idx <= activeJourneyStage;
              return (
                <button
                  key={stage.step}
                  type="button"
                  onClick={() => setActiveJourneyStage(idx)}
                  className={`relative rounded-2xl border p-6 text-left transition-all ${
                    active
                      ? 'border-[#8B5CF6]/60 bg-white dark:bg-[#101018] shadow-lg'
                      : 'border-black/10 dark:border-white/10 bg-white/60 dark:bg-[#101018]/50 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[#8B5CF6]">{stage.step}</span>
                    {idx < JOURNEY_STAGES.length - 1 && (
                      <ChevronRight
                        className={`hidden md:block w-4 h-4 ${
                          idx < activeJourneyStage ? 'text-[#38BDF8]' : 'text-slate-400 dark:text-zinc-600'
                        }`}
                      />
                    )}
                  </div>
                  <h3 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white">
                    {stage.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                    {stage.summary}
                  </p>
                  <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        active ? 'w-full bg-gradient-to-r from-[#6366F1] to-[#38BDF8]' : 'w-0'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 3 — Interactive roadmap demonstration */}
      <section id="roadmap-demo" className="mx-auto max-w-6xl px-4 sm:px-6 py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="font-mono text-xs text-[#6366F1] dark:text-[#38BDF8]">03 · Interactive Preview</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight [text-wrap:balance]">
              Inspect a live career roadmap before signing up
            </h2>
            <p className="mt-3 text-base text-slate-600 dark:text-zinc-400">
              Expand any skill node below to see prerequisites, estimated study hours, and practical exercises for AI Engineering.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onStartRoadmap('AI Engineer')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#8B5CF6] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#7C3AED] whitespace-nowrap shrink-0"
          >
            Personalize This Roadmap
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-3">
            {demoStages.map((stage) => (
              <div
                key={stage.stageNumber}
                className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-4"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-zinc-400">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Stage {stage.stageNumber}: {stage.title}
                  </span>
                  <span className="font-mono">{stage.estimatedWeeks}</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {stage.skills.map((skill) => {
                    const selected = expandedDemoSkillId === skill.id;
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => setExpandedDemoSkillId(skill.id)}
                        className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs transition-colors ${
                          selected
                            ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 text-slate-950 dark:text-white'
                            : 'border-black/10 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:border-black/25 dark:hover:border-white/25'
                        }`}
                      >
                        <span className="font-medium truncate pr-2">{skill.title}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                            selected ? 'rotate-180 text-[#8B5CF6]' : 'text-slate-400'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-5">
            {(() => {
              const allDemoSkills = demoStages.flatMap((s) => s.skills);
              const active = allDemoSkills.find((s) => s.id === expandedDemoSkillId) ?? allDemoSkills[0];
              return (
                <div className="sticky top-24 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6 shadow-sm">
                  <div className="text-xs font-mono text-[#6366F1] dark:text-[#38BDF8]">
                    Stage {active.stageNumber} · {active.estimatedHours} estimated hours
                  </div>
                  <h3 className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-white">
                    {active.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                    {active.summary}
                  </p>
                  <div className="mt-5 border-t border-black/5 dark:border-white/5 pt-4">
                    <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                      Why it matters
                    </div>
                    <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{active.whyItMatters}</p>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                      Prerequisites
                    </div>
                    <p className="mt-1 text-xs font-mono text-slate-600 dark:text-zinc-400">
                      {active.prerequisites.length === 0
                        ? 'None — safe starting point'
                        : active.prerequisites
                            .map((pid) => allDemoSkills.find((s) => s.id === pid)?.title ?? pid)
                            .join(' · ')}
                    </p>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                      Sample Practice &amp; Project
                    </div>
                    <ul className="mt-1.5 space-y-1 text-xs text-slate-700 dark:text-zinc-300">
                      <li>• {active.practiceExercises[0]}</li>
                      <li>• Project: {active.projectIdeas[0]}</li>
                    </ul>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Section 4 — Your personal AI mentor */}
      <section
        id="mentor-demo"
        className="border-y border-black/5 dark:border-white/5 bg-black/[0.015] dark:bg-[#0A0A10] py-24 px-4 sm:px-6"
      >
        <div className="mx-auto max-w-6xl grid gap-10 lg:grid-cols-12 items-center">
          <div className="lg:col-span-5">
            <p className="font-mono text-xs text-[#6366F1] dark:text-[#38BDF8]">
              04 · AI Mentor Demonstration
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight [text-wrap:balance]">
              Guidance grounded in your actual roadmap
            </h2>
            <p className="mt-3 text-base text-slate-600 dark:text-zinc-400 leading-relaxed">
              Ask your AI Mentor to unpack tough concepts, simplify study schedules around school or work, review project ideas, or prepare for interviews—while encouraging real-world mentorship with teachers and advisors.
            </p>
            <button
              type="button"
              onClick={() => (user ? onOpenDashboard('mentor') : onOpenAuth('register'))}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-black/15 dark:border-white/15 bg-white dark:bg-[#101018] px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white hover:border-[#8B5CF6]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
              {user ? 'Open AI Mentor' : 'Try AI Mentor in Workspace'}
            </button>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3 text-xs text-slate-500 dark:text-zinc-400">
                <span className="font-medium text-slate-900 dark:text-white">
                  Sample Mentor Session (Demonstration)
                </span>
                <span className="font-mono">Context: AI Engineer · 7 hrs/wk</span>
              </div>

              <div className="mt-4 space-y-4">
                {DEMO_MENTOR_CONVERSATION.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl p-4 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'ml-8 bg-[#8B5CF6]/12 text-slate-900 dark:text-slate-100'
                        : 'mr-4 border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-[#050507] text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="mb-1 text-[11px] font-mono text-slate-500 dark:text-zinc-500">
                      {msg.role === 'user' ? 'Learner (Example)' : 'SkillPath AI Mentor (Example)'}
                    </div>
                    {msg.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5 — Everything you need in one place (Bento Grid with Micro-Visualizations) */}
      <section id="capabilities" className="mx-auto max-w-6xl px-4 sm:px-6 py-24">
        <div className="max-w-2xl">
          <p className="font-mono text-xs text-[#6366F1] dark:text-[#38BDF8]">05 · Integrated Platform</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight [text-wrap:balance]">
            Everything you need in one cohesive system
          </h2>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-6">
          {/* 1. Career Discovery (col-span-3) */}
          <div className="md:col-span-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
            <h3 className="font-display text-base font-semibold">Career Discovery Engine</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
              Filter fields by education, difficulty, and work environment with cited benchmarks.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-xs font-mono">
              {['AI & Data', 'Robotics', 'Medicine'].map((item, i) => (
                <div
                  key={item}
                  className="rounded-lg border border-black/10 dark:border-white/10 p-2.5 bg-black/[0.02] dark:bg-[#050507]"
                >
                  <div className="text-[10px] text-slate-400">Field 0{i + 1}</div>
                  <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{item}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. AI-Generated Roadmaps (col-span-3) */}
          <div className="md:col-span-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
            <h3 className="font-display text-base font-semibold">Interactive Skill Tree &amp; Roadmaps</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
              Zoomable dependency graphs with version history and accessible list alternatives.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {['Python', 'Linear Algebra', 'PyTorch', 'LLMs'].map((node, i) => (
                <React.Fragment key={node}>
                  <div
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium ${
                      i === 0
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : i === 1
                          ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-slate-900 dark:text-white'
                          : 'border-black/10 dark:border-white/10 text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    {node}
                  </div>
                  {i < 3 && <div className="h-px flex-1 bg-black/15 dark:bg-white/15" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* 3. Skill Assessments (col-span-2) */}
          <div className="md:col-span-2 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
            <h3 className="font-display text-base font-semibold">Skill Assessments</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
              Conceptual, scenario, and code diagnostics with clear answer explanations.
            </p>
            <div className="mt-5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Data Leakage Check</span>
                <span className="font-mono text-emerald-500">Explained</span>
              </div>
              <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10">
                <div className="h-full w-4/5 rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>

          {/* 4. Project Recommendations (col-span-2) */}
          <div className="md:col-span-2 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
            <h3 className="font-display text-base font-semibold">Project Kanban &amp; Generator</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
              Move portfolio builds across Planned, In Progress, Testing, and Completed.
            </p>
            <div className="mt-5 grid grid-cols-4 gap-1.5">
              {['Plan', 'Build', 'Test', 'Done'].map((col, idx) => (
                <div
                  key={col}
                  className="rounded-lg border border-black/10 dark:border-white/10 p-1.5 text-center font-mono text-[10px]"
                >
                  <div className="text-slate-400">{col}</div>
                  <div
                    className={`mt-1.5 h-2 rounded ${
                      idx === 1 ? 'bg-[#8B5CF6]' : idx === 3 ? 'bg-emerald-500' : 'bg-black/10 dark:bg-white/10'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 5. Learning Resources (col-span-2) */}
          <div className="md:col-span-2 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
            <h3 className="font-display text-base font-semibold">Verified Resource Hub</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
              Filter official docs, courses, and practice labs by cost, level, and time.
            </p>
            <div className="mt-5 space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Python Official Tutorial · Free</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span>PyTorch Tutorials · Free</span>
              </div>
            </div>
          </div>

          {/* 6. Progress Analytics (col-span-2) */}
          <div className="md:col-span-2 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
            <h3 className="font-display text-base font-semibold">Personal Analytics</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
              Real activity heatmaps and milestone velocity supporting sustainable habits.
            </p>
            <svg viewBox="0 0 180 42" className="mt-5 w-full h-10" aria-hidden="true">
              <polyline
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2"
                points="4,34 32,28 60,30 88,18 116,22 144,10 176,6"
              />
            </svg>
          </div>

          {/* 7. AI Mentor (col-span-2) */}
          <div className="md:col-span-2 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
            <h3 className="font-display text-base font-semibold">Context-Aware AI Mentor</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
              Streaming explanations, code snippets, and quick study-plan adjustments.
            </p>
            <div className="mt-5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-[#050507] p-2.5 text-xs text-slate-500 dark:text-zinc-400">
              “Explain PyTorch autograd simply” →
            </div>
          </div>

          {/* 8. Career Comparison (col-span-2) */}
          <div className="md:col-span-2 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
            <h3 className="font-display text-base font-semibold">Side-by-Side Comparison</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
              Compare education, daily work, and regional compensation transparently.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="rounded-lg border border-black/10 dark:border-white/10 p-2">
                AI Engineer
              </div>
              <div className="rounded-lg border border-black/10 dark:border-white/10 p-2">
                Robotics
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6 — Interactive Career Exploration */}
      <section
        id="explore-careers"
        className="border-t border-black/5 dark:border-white/5 bg-black/[0.015] dark:bg-[#0A0A10] py-24 px-4 sm:px-6"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-[#6366F1] dark:text-[#38BDF8]">
                06 · Public Career Directory
              </p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight">
                Search real career pathways
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={careerQuery}
                  onChange={(e) => setCareerQuery(e.target.value)}
                  placeholder="Search careers or skills..."
                  aria-label="Search careers"
                  className="w-64 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>
              <select
                value={careerCategory}
                onChange={(e) => setCareerCategory(e.target.value)}
                aria-label="Filter by career category"
                className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] px-3 py-2 text-sm text-slate-900 dark:text-white"
              >
                <option value="All">All Categories</option>
                <option value="AI & Data">AI &amp; Data</option>
                <option value="Software & Security">Software &amp; Security</option>
                <option value="Engineering & Robotics">Engineering &amp; Robotics</option>
                <option value="Medicine & Science">Medicine &amp; Science</option>
                <option value="Design & Games">Design &amp; Games</option>
                <option value="Business & Architecture">Business &amp; Architecture</option>
              </select>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {matchedCareers.map((career: CareerEntry) => (
              <div
                key={career.slug}
                className="flex flex-col justify-between rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-5"
              >
                <div>
                  <div className="text-xs text-slate-500 dark:text-zinc-400">
                    {career.category} · {career.difficulty}
                  </div>
                  <h3 className="mt-1.5 font-display text-lg font-bold text-slate-900 dark:text-white">
                    {career.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                    {career.shortDescription}
                  </p>
                  <div className="mt-3 text-xs text-slate-500 dark:text-zinc-500">
                    Key skills: {career.requiredSkills.slice(0, 3).map((s) => s.name).join(' · ')}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-4 text-xs">
                  <span className="font-mono text-slate-500 dark:text-zinc-400">
                    {career.estimatedMonthsRange}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenCareer(career.slug)}
                    className="inline-flex items-center gap-1 font-semibold text-[#6366F1] dark:text-[#38BDF8] hover:underline"
                  >
                    View Pathway
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-slate-500 dark:text-zinc-500">
            Occupational outlooks and compensation benchmarks cite U.S. Bureau of Labor Statistics (OEWS 2024–2025) and public industry surveys; figures represent broad estimates rather than guarantees.
          </p>
        </div>
      </section>

      {/* Section 7 — Final Call to Action */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-28 text-center">
        <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-slate-950 dark:text-white [text-wrap:balance]">
          The future isn&apos;t found. It&apos;s built.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-600 dark:text-zinc-400">
          Turn curiosity into a structured, adaptable learning plan with verified resources and practical milestones.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => (user ? onOpenDashboard('overview') : onOpenAuth('register'))}
            className="inline-flex items-center gap-2 rounded-xl bg-[#8B5CF6] px-6 py-3 text-sm font-semibold text-white hover:bg-[#7C3AED] transition-colors"
          >
            {user ? 'Go to Workspace' : 'Get Started Free'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-black/10 dark:border-white/10 py-10 px-4 sm:px-6 text-xs text-slate-500 dark:text-zinc-400">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white">
              <BrandMark className="w-5 h-5" />
              SkillPath AI
            </div>
            <p className="mt-1.5">Your ambition. Your roadmap. Your future.</p>
            <p className="mt-1 text-slate-400 dark:text-zinc-500">
              Designed and developed by Nexora Studios.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <button type="button" onClick={() => scrollToSection('explore-careers')} className="hover:text-slate-900 dark:hover:text-white">
              Careers
            </button>
            <button type="button" onClick={() => setLegalModal('privacy')} className="hover:text-slate-900 dark:hover:text-white">
              Privacy Policy
            </button>
            <button type="button" onClick={() => setLegalModal('terms')} className="hover:text-slate-900 dark:hover:text-white">
              Terms
            </button>
            <button type="button" onClick={() => setLegalModal('accessibility')} className="hover:text-slate-900 dark:hover:text-white">
              Accessibility
            </button>
            <button type="button" onClick={() => setLegalModal('contact')} className="hover:text-slate-900 dark:hover:text-white">
              Contact
            </button>
          </div>
        </div>
      </footer>

      {legalModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setLegalModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold capitalize">{legalModal} Information</h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                aria-label="Close modal"
                className="rounded-lg p-1 text-slate-500 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 text-sm text-slate-600 dark:text-zinc-300 leading-relaxed space-y-2">
              {legalModal === 'privacy' && (
                <p>
                  SkillPath AI stores only the profile, preference, roadmap, and learning progress records needed to personalize your workspace. You can export all your data as JSON or permanently delete your account anytime from Settings.
                </p>
              )}
              {legalModal === 'terms' && (
                <p>
                  Career roadmaps, study estimates, and AI mentor guidance are educational planning aids. They do not guarantee employment, admissions, licensure, or specific compensation. Always confirm regulated requirements (such as medicine or architecture) with accredited institutions.
                </p>
              )}
              {legalModal === 'accessibility' && (
                <p>
                  SkillPath AI targets WCAG 2.2 AA contrast, keyboard navigation (including Ctrl/Cmd+K command palette), reduced-motion fallbacks for 3D visualizations, and an accessible list alternative to the interactive skill tree graph.
                </p>
              )}
              {legalModal === 'contact' && (
                <p>
                  Developed by Nexora Studios. For feedback, educator partnerships, or accessibility requests, reach out via your Nexora Studios workspace administrator or support@nexorastudios.example.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
