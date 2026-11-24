import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Compass,
  GraduationCap,
  Info,
  Sparkles,
} from 'lucide-react';
import { CAREER_CATALOG, VERIFIED_RESOURCES } from '../data/catalog.ts';
import type { CareerEntry } from '../types/domain.ts';

interface CareerDetailPageProps {
  career: CareerEntry;
  onBack: () => void;
  onSelectCareer: (slug: string) => void;
  onBuildRoadmap: (career: CareerEntry) => void;
}

function formatMoney(n: number) {
  return n === 0 ? '$0' : `$${n.toLocaleString('en-US')}`;
}

export const CareerDetailPage: React.FC<CareerDetailPageProps> = ({
  career,
  onBack,
  onSelectCareer,
  onBuildRoadmap,
}) => {
  const related = CAREER_CATALOG.filter((c) => career.relatedSlugs.includes(c.slug));
  const matchingResources = VERIFIED_RESOURCES.filter((r) => {
    const key = r.skillCategory.toLowerCase();
    return (
      career.title.toLowerCase().includes(key.split(' ')[0]) ||
      career.requiredSkills.some((s) => s.name.toLowerCase().includes(key.split(' ')[0]))
    );
  }).slice(0, 4);

  return (
    <article className="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Career Explorer
        </button>

        <button
          type="button"
          onClick={() => onBuildRoadmap(career)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#8B5CF6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7C3AED] transition-colors whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          Build My {career.title} Roadmap
        </button>
      </div>

      {/* Hero Header */}
      <header className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6 sm:p-8">
        <div className="text-xs font-medium text-[#6366F1] dark:text-[#38BDF8]">
          {career.category} · {career.difficulty} · {career.estimatedMonthsRange}
        </div>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          {career.title}
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-600 dark:text-zinc-300 leading-relaxed">
          {career.overview}
        </p>

        <div className="mt-6 grid gap-4 border-t border-black/10 dark:border-white/10 pt-6 sm:grid-cols-3 text-sm">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
              <GraduationCap className="w-3.5 h-3.5" />
              Typical Education
            </div>
            <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
              {career.educationRequirement}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
              <Building2 className="w-3.5 h-3.5" />
              Work Environments
            </div>
            <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
              {career.workEnvironments.join(' · ')}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
              <Briefcase className="w-3.5 h-3.5" />
              Entry-Level Roles
            </div>
            <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
              {career.entryLevelOpportunities.slice(0, 2).join(' · ')}
            </div>
          </div>
        </div>
      </header>

      {/* Responsibilities & Skills */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Typical Daily Responsibilities
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-zinc-300">
            {career.dailyResponsibilities.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Core Technical &amp; Interpersonal Skills
          </h2>
          <div className="mt-4 divide-y divide-black/5 dark:divide-white/5">
            {career.requiredSkills.map((sk) => (
              <div key={sk.name} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium text-slate-900 dark:text-slate-100">{sk.name}</span>
                <span className="font-mono text-xs text-slate-500 dark:text-zinc-400">
                  {sk.level} · {sk.type}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Pathways, Portfolio & Progression */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Educational Pathways
          </h2>
          <ul className="mt-3 space-y-2.5 text-sm text-slate-600 dark:text-zinc-300">
            {career.educationalPathways.map((p, i) => (
              <li key={i} className="leading-relaxed">
                {i + 1}. {p}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Portfolio Recommendations
          </h2>
          <ul className="mt-3 space-y-2.5 text-sm text-slate-600 dark:text-zinc-300">
            {career.portfolioRecommendations.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#38BDF8] shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Progression &amp; Misconceptions
          </h2>
          <p className="mt-3 text-sm font-medium text-slate-800 dark:text-zinc-200">
            {career.careerProgression[0]}
          </p>
          <div className="mt-4 space-y-2 border-t border-black/5 dark:border-white/5 pt-3 text-xs text-slate-600 dark:text-zinc-400">
            {career.commonMisconceptions.map((m, i) => (
              <p key={i}>Note: {m}</p>
            ))}
          </div>
        </section>
      </div>

      {/* Transparent Salary & Outlook */}
      <section className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Compensation Benchmarks &amp; Employment Outlook
          </h2>
          <span className="font-mono text-xs text-slate-500 dark:text-zinc-400">
            {career.salary.region} · As of {career.salary.asOf}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-4">
            <div className="text-xs text-slate-500 dark:text-zinc-400">Entry / Early Career</div>
            <div className="mt-1 font-mono text-lg font-semibold text-slate-900 dark:text-white tabular-nums">
              {formatMoney(career.salary.entryMin)} – {formatMoney(career.salary.entryMax)}
            </div>
          </div>
          <div className="rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-4">
            <div className="text-xs text-slate-500 dark:text-zinc-400">Mid-Level</div>
            <div className="mt-1 font-mono text-lg font-semibold text-slate-900 dark:text-white tabular-nums">
              {formatMoney(career.salary.midMin)} – {formatMoney(career.salary.midMax)}
            </div>
          </div>
          <div className="rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-4">
            <div className="text-xs text-slate-500 dark:text-zinc-400">Senior / Principal</div>
            <div className="mt-1 font-mono text-lg font-semibold text-slate-900 dark:text-white tabular-nums">
              {formatMoney(career.salary.seniorMin)} – {formatMoney(career.salary.seniorMax)}
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
          {career.outlookNote}
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-3.5 text-xs text-slate-500 dark:text-zinc-400">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#38BDF8]" />
          <div>
            <strong>Source:</strong> {career.salary.source}. {career.salary.uncertaintyNote}
          </div>
        </div>
      </section>

      {/* Related Resources & Related Careers */}
      <div className="grid gap-6 lg:grid-cols-2">
        {matchingResources.length > 0 && (
          <section className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Verified Starter Resources
            </h2>
            <div className="mt-4 space-y-2.5">
              {matchingResources.map((r) => (
                <a
                  key={r.id}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-black/10 dark:border-white/10 p-3 text-sm hover:border-[#8B5CF6] transition-colors"
                >
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{r.title}</div>
                    <div className="text-xs text-slate-500 dark:text-zinc-400">
                      {r.provider} · {r.cost} · {r.durationLabel}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#101018] p-6">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Related Career Options
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Skills overlap across disciplines—explore adjacent paths freely.
          </p>
          <div className="mt-4 space-y-2.5">
            {related.map((rel) => (
              <button
                key={rel.slug}
                type="button"
                onClick={() => onSelectCareer(rel.slug)}
                className="flex w-full items-center justify-between rounded-xl border border-black/10 dark:border-white/10 p-3 text-left text-sm hover:border-[#8B5CF6] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{rel.title}</div>
                    <div className="text-xs text-slate-500 dark:text-zinc-400">
                      {rel.category} · {rel.estimatedMonthsRange}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
};
