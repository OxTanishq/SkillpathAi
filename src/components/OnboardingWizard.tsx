import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { CAREER_CATALOG } from '../data/catalog.ts';
import { apiFetch } from '../utils/api.ts';
import type { RoadmapData, UserPreferences } from '../types/domain.ts';

interface OnboardingWizardProps {
  initialGoal?: string;
  initialPreferences: UserPreferences;
  aiConfigured: boolean;
  onComplete: (prefs: UserPreferences, roadmap: RoadmapData) => void;
  onSkipToDashboard: () => void;
}

const STAGES = [
  'High School Student',
  'University / College Student',
  'Early Career Professional',
  'Career Switcher',
  'Self-Taught Explorer',
];

const INTEREST_OPTIONS = [
  'Artificial Intelligence',
  'Software Engineering',
  'Game Development',
  'Robotics & Hardware',
  'Cybersecurity',
  'Medicine & Biology',
  'Architecture & Spatial Design',
  'Entrepreneurship',
  'Graphic & Product Design',
  'Data Science & Statistics',
];

const EXISTING_SKILLS_OPTIONS = [
  'None yet (starting fresh)',
  'Python basics',
  'JavaScript / TypeScript',
  'Mathematics & Statistics',
  'UI / Visual Design',
  'Research & Technical Writing',
  'Hardware / Electronics',
  'Team Leadership',
];

const LEARNING_STYLES = [
  'Hands-on projects',
  'Structured theory then practice',
  'Visual diagrams & videos',
  'Reading documentation & exercises',
];

const OBJECTIVE_OPTIONS = [
  'Land an entry-level role',
  'Build a verifiable portfolio',
  'Prepare for university studies',
  'Launch an independent project',
  'Explore multiple fields first',
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialGoal,
  initialPreferences,
  aiConfigured,
  onComplete,
  onSkipToDashboard,
}) => {
  const [step, setStep] = useState(0);
  const [stage, setStage] = useState(initialPreferences.stage || STAGES[0]);
  const [interests, setInterests] = useState<string[]>(initialPreferences.interests);
  const [existingSkills, setExistingSkills] = useState<string[]>(initialPreferences.existingSkills);
  const [desiredCareer, setDesiredCareer] = useState(initialGoal || initialPreferences.desiredCareer || 'AI Engineer');
  const [weeklyHours, setWeeklyHours] = useState(initialPreferences.weeklyHours || 8);
  const [learningStyle, setLearningStyle] = useState(initialPreferences.learningStyle || LEARNING_STYLES[0]);
  const [objectives, setObjectives] = useState<string[]>(initialPreferences.objectives);
  const [preferredLanguage, setPreferredLanguage] = useState(initialPreferences.preferredLanguage || 'English');
  const [resourceCostPreference, setResourceCostPreference] = useState<'free' | 'paid' | 'both'>(
    initialPreferences.resourceCostPreference || 'free'
  );

  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { title: 'Current stage', required: true },
    { title: 'Areas of interest', required: false },
    { title: 'Existing skills', required: false },
    { title: 'Desired career', required: true },
    { title: 'Weekly learning time', required: true },
    { title: 'Learning style', required: false },
    { title: 'Learning objectives', required: false },
    { title: 'Language & resources', required: false },
  ];

  const toggleItem = (list: string[], setList: (v: string[]) => void, value: string) => {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  const handleGenerate = async (mode: 'ai' | 'curated') => {
    setError(null);
    setGenerating(true);
    setStatusMessage(
      mode === 'ai'
        ? 'Saving your preferences and generating a personalized AI roadmap...'
        : 'Saving your preferences and assembling a structured foundation roadmap...'
    );

    try {
      const matchedCareer = CAREER_CATALOG.find(
        (c) =>
          c.slug === desiredCareer.toLowerCase() ||
          c.title.toLowerCase() === desiredCareer.trim().toLowerCase()
      );

      const prefRes = await apiFetch<{ preferences: UserPreferences }>('/api/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          stage,
          interests,
          existingSkills,
          desiredCareer: matchedCareer?.slug ?? desiredCareer,
          weeklyHours,
          learningStyle,
          objectives,
          preferredLanguage,
          resourceCostPreference,
          onboardingCompleted: true,
        }),
      });

      setStatusMessage(
        mode === 'ai'
          ? 'Validating stages, skill prerequisites, and weekly schedule against schema...'
          : 'Mapping skill tree prerequisites and verified learning resources...'
      );

      const rmRes = await apiFetch<{ roadmap: RoadmapData }>('/api/roadmaps/generate', {
        method: 'POST',
        body: JSON.stringify({
          careerGoal: matchedCareer?.title ?? desiredCareer,
          careerSlug: matchedCareer?.slug,
          mode,
        }),
      });

      onComplete(prefRes.preferences, rmRes.roadmap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate roadmap.');
      setGenerating(false);
    }
  };

  if (generating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFC] dark:bg-[#050507] px-4">
        <div className="w-full max-w-lg rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-8 text-center shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8B5CF6]/15 text-[#8B5CF6]">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-bold text-slate-900 dark:text-white">
            Building your personalized path
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">{statusMessage}</p>
          <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#38BDF8] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(((step + 1) / steps.length) * 100);

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#050507] text-slate-900 dark:text-slate-50 px-4 py-10 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-3">
          <span className="font-mono tabular-nums">
            Step {step + 1} of {steps.length} · {steps[step].title}
          </span>
          <button
            type="button"
            onClick={onSkipToDashboard}
            className="hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Exit to workspace
          </button>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10 mb-8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#38BDF8] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6 sm:p-8 shadow-sm">
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300"
            >
              <p>{error}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleGenerate('curated')}
                  className="rounded-lg bg-slate-900 dark:bg-white px-3 py-1.5 text-xs font-semibold text-white dark:text-slate-900"
                >
                  Use Curated Blueprint Instead
                </button>
              </div>
            </div>
          )}

          {step === 0 && (
            <div>
              <h2 className="font-display text-2xl font-bold">What best describes your current stage?</h2>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-zinc-400">
                This helps tailor explanations and pacing—you can change it anytime in Settings.
              </p>
              <div className="mt-6 grid gap-3">
                {STAGES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStage(option)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors ${
                      stage === option
                        ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 text-slate-900 dark:text-white'
                        : 'border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25'
                    }`}
                  >
                    <span>{option}</span>
                    {stage === option && <Check className="w-4 h-4 text-[#8B5CF6]" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="font-display text-2xl font-bold">Which areas spark your curiosity?</h2>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-zinc-400">
                Select one or multiple interests. SkillPath AI keeps multiple career doors open.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {INTEREST_OPTIONS.map((item) => {
                  const active = interests.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleItem(interests, setInterests, item)}
                      className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors ${
                        active
                          ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-slate-900 dark:text-white'
                          : 'border-black/10 dark:border-white/10 text-slate-600 dark:text-zinc-300 hover:border-black/25 dark:hover:border-white/25'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-display text-2xl font-bold">What skills do you already bring?</h2>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-zinc-400">
                Optional — helps avoid repeating fundamentals you already know.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {EXISTING_SKILLS_OPTIONS.map((item) => {
                  const active = existingSkills.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleItem(existingSkills, setExistingSkills, item)}
                      className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors ${
                        active
                          ? 'border-[#38BDF8] bg-[#38BDF8]/15 text-slate-900 dark:text-white'
                          : 'border-black/10 dark:border-white/10 text-slate-600 dark:text-zinc-300 hover:border-black/25 dark:hover:border-white/25'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-display text-2xl font-bold">What do you want to become?</h2>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-zinc-400">
                Enter any career goal or pick a starting direction below.
              </p>
              <input
                type="text"
                value={desiredCareer}
                onChange={(e) => setDesiredCareer(e.target.value)}
                placeholder="e.g., AI Engineer, Robotics Engineer, Architect, Doctor..."
                aria-label="Desired career goal"
                className="mt-5 w-full rounded-xl border border-black/15 dark:border-white/15 bg-black/5 dark:bg-[#0A0A10] px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-[#8B5CF6] focus:outline-none"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {CAREER_CATALOG.slice(0, 7).map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setDesiredCareer(c.title)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      desiredCareer.toLowerCase() === c.title.toLowerCase()
                        ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-slate-900 dark:text-white'
                        : 'border-black/10 dark:border-white/10 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="font-display text-2xl font-bold">How many hours per week can you study?</h2>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-zinc-400">
                Choose a sustainable pace with built-in rest days rather than overcommitting.
              </p>
              <div className="mt-6 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-slate-600 dark:text-zinc-300">
                    Weekly study budget
                  </span>
                  <span className="font-mono text-2xl font-bold text-[#8B5CF6] tabular-nums">
                    {weeklyHours} hrs / wk
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={35}
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(Number(e.target.value))}
                  aria-label="Weekly learning hours"
                  className="mt-4 w-full accent-[#8B5CF6]"
                />
                <div className="mt-2 flex justify-between font-mono text-[11px] text-slate-500 dark:text-zinc-500">
                  <span>2h · Light pace</span>
                  <span>10h · Balanced</span>
                  <span>25h+ · Intensive</span>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="font-display text-2xl font-bold">How do you learn most effectively?</h2>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-zinc-400">
                Optional — guides resource recommendations and project cadence.
              </p>
              <div className="mt-6 grid gap-3">
                {LEARNING_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setLearningStyle(style)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors ${
                      learningStyle === style
                        ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 text-slate-900 dark:text-white'
                        : 'border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25'
                    }`}
                  >
                    <span>{style}</span>
                    {learningStyle === style && <Check className="w-4 h-4 text-[#8B5CF6]" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div>
              <h2 className="font-display text-2xl font-bold">What are your primary objectives?</h2>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-zinc-400">
                Optional — select any goals that resonate today.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {OBJECTIVE_OPTIONS.map((obj) => {
                  const active = objectives.includes(obj);
                  return (
                    <button
                      key={obj}
                      type="button"
                      onClick={() => toggleItem(objectives, setObjectives, obj)}
                      className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors ${
                        active
                          ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-slate-900 dark:text-white'
                          : 'border-black/10 dark:border-white/10 text-slate-600 dark:text-zinc-300'
                      }`}
                    >
                      {obj}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold">Language &amp; resource preferences</h2>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-zinc-400">
                  Final optional step before generating your personalized roadmap.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="pref-lang" className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Preferred language
                  </label>
                  <select
                    id="pref-lang"
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0A0A10] px-3 py-2.5 text-sm"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Japanese">Japanese</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="pref-cost" className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                    Resource budget preference
                  </label>
                  <select
                    id="pref-cost"
                    value={resourceCostPreference}
                    onChange={(e) =>
                      setResourceCostPreference(e.target.value as 'free' | 'paid' | 'both')
                    }
                    className="mt-1.5 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0A0A10] px-3 py-2.5 text-sm"
                  >
                    <option value="free">Free open resources only</option>
                    <option value="both">Both free and paid</option>
                    <option value="paid">Structured paid courses welcome</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 dark:border-white/10 pt-5">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-xs font-medium text-slate-600 dark:text-zinc-300 disabled:opacity-40"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="flex items-center gap-2.5">
              {!steps[step].required && step < steps.length - 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="rounded-xl px-3.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  Skip
                </button>
              )}

              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={step === 3 && desiredCareer.trim().length < 2}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#8B5CF6] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#7C3AED] disabled:opacity-50"
                >
                  Continue
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerate('curated')}
                    className="rounded-xl border border-black/10 dark:border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    Use Curated Blueprint
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerate('ai')}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#8B5CF6] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#7C3AED]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {aiConfigured ? 'Generate AI Roadmap' : 'Try AI Roadmap'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
