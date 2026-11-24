import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBalancedWeeklySchedule,
  calculateAnalyticsSummary,
  calculateRoadmapProgress,
  filterCareers,
  nextStatusCycle,
  resolveSkillAvailability,
} from './roadmapLogic.ts';
import type { CareerEntry, RoadmapData } from '../types/domain.ts';

const sampleRoadmap: RoadmapData = {
  id: 'rm-1',
  careerSlug: 'ai-engineer',
  careerTitle: 'AI Engineer',
  objective: 'Become an AI Engineer',
  version: 1,
  isAiGenerated: false,
  sourceLabel: 'Curated Foundation',
  estimatedDurationRange: '6-9 months',
  weeklyHoursTarget: 10,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  weeklySchedule: [],
  stages: [
    {
      stageNumber: 1,
      title: 'Foundations',
      description: 'Core programming',
      estimatedWeeks: 'Weeks 1-4',
      milestone: 'Build CLI tool',
      assessmentObjective: 'Pass Python basics check',
      skills: [
        {
          id: 'sk-1',
          title: 'Python Fundamentals',
          stageNumber: 1,
          stageTitle: 'Foundations',
          summary: 'Syntax and data structures',
          whyItMatters: 'Primary ML language',
          prerequisites: [],
          estimatedHours: 20,
          status: 'completed',
          isOptional: false,
          practiceExercises: ['Write parser'],
          projectIdeas: ['Log analyzer'],
          resourceIds: [],
        },
        {
          id: 'sk-2',
          title: 'Linear Algebra',
          stageNumber: 1,
          stageTitle: 'Foundations',
          summary: 'Vectors and matrices',
          whyItMatters: 'Core of neural nets',
          prerequisites: ['sk-1'],
          estimatedHours: 15,
          status: 'not_started',
          isOptional: false,
          practiceExercises: ['Matrix multiply'],
          projectIdeas: ['PCA visualizer'],
          resourceIds: [],
        },
        {
          id: 'sk-3',
          title: 'Deep Learning',
          stageNumber: 1,
          stageTitle: 'Foundations',
          summary: 'Backpropagation',
          whyItMatters: 'Model training',
          prerequisites: ['sk-2'],
          estimatedHours: 30,
          status: 'not_started',
          isOptional: false,
          practiceExercises: ['Train MLP'],
          projectIdeas: ['Image classifier'],
          resourceIds: [],
        },
      ],
    },
  ],
};

test('resolveSkillAvailability unlocks skills whose prerequisites are completed', () => {
  const resolved = resolveSkillAvailability(sampleRoadmap.stages[0].skills);
  assert.equal(resolved[0].status, 'completed');
  assert.equal(resolved[1].status, 'available');
  assert.equal(resolved[2].status, 'not_started');
});

test('calculateRoadmapProgress computes percentage, hours, and next recommended skill', () => {
  const progress = calculateRoadmapProgress(sampleRoadmap);
  assert.equal(progress.totalSkills, 3);
  assert.equal(progress.completedSkills, 1);
  assert.equal(progress.percentComplete, 33);
  assert.equal(progress.totalHours, 65);
  assert.equal(progress.completedHours, 20);
  assert.equal(progress.nextRecommendedSkill?.id, 'sk-2');
});

test('buildBalancedWeeklySchedule distributes hours cleanly within target', () => {
  const schedule = buildBalancedWeeklySchedule(10, 'Python');
  assert.equal(schedule.length, 5);
  const sum = schedule.reduce((acc, s) => acc + s.hours, 0);
  assert.ok(sum >= 9 && sum <= 11);
});

test('calculateAnalyticsSummary aggregates real user activity without fabricated metrics', () => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const summary = calculateAnalyticsSummary({
    roadmap: sampleRoadmap,
    projects: [],
    attempts: [
      {
        id: 'a1',
        assessmentId: 'as1',
        title: 'Python Check',
        careerSlug: 'ai-engineer',
        score: 4,
        total: 5,
        weakSkills: [],
        recommendations: [],
        createdAt: todayStr,
      },
    ],
    activity: [
      {
        id: 'act1',
        activityDate: todayStr,
        minutesSpent: 45,
        activityType: 'study_session',
        label: 'Studied Python',
      },
    ],
  });
  assert.equal(summary.averageAssessmentPercent, 80);
  assert.equal(summary.totalMinutesLogged, 45);
  assert.equal(summary.activeDaysCount, 1);
  assert.equal(summary.weeklyMinutesSeries[6].minutes, 45);
});

test('filterCareers matches query and category accurately', () => {
  const careers = [
    {
      id: '1',
      slug: 'ai-engineer',
      title: 'AI Engineer',
      category: 'AI & Data',
      shortDescription: 'Build intelligent models',
      overview: '',
      dailyResponsibilities: [],
      requiredSkills: [{ name: 'PyTorch', level: 'Core', type: 'Technical' }],
      educationalPathways: [],
      portfolioRecommendations: [],
      entryLevelOpportunities: [],
      careerProgression: [],
      commonMisconceptions: [],
      relatedSlugs: [],
      workEnvironments: ['Remote / Hybrid'],
      difficulty: 'Rigorous',
      estimatedMonthsRange: '9-14 months',
      educationRequirement: "Bachelor's or equivalent portfolio",
      outlookNote: '',
      salary: {
        region: 'US',
        currency: 'USD',
        entryMin: 1,
        entryMax: 2,
        midMin: 2,
        midMax: 3,
        seniorMin: 3,
        seniorMax: 4,
        source: 'BLS',
        asOf: '2025',
        uncertaintyNote: '',
      },
    },
  ] satisfies CareerEntry[];

  assert.equal(filterCareers(careers, { query: 'pytorch' }).length, 1);
  assert.equal(filterCareers(careers, { category: 'Medicine & Science' }).length, 0);
});

test('nextStatusCycle transitions cleanly through learning states', () => {
  assert.equal(nextStatusCycle('available'), 'in_progress');
  assert.equal(nextStatusCycle('in_progress'), 'completed');
  assert.equal(nextStatusCycle('completed'), 'available');
});
