import type {
  AssessmentAttempt,
  CareerEntry,
  CareerProject,
  LearningActivityEntry,
  RoadmapData,
  RoadmapStage,
  SkillNodeData,
  SkillNodeStatus,
  WeeklyScheduleItem,
} from '../types/domain.ts';

export function flattenRoadmapSkills(stages: RoadmapStage[]): SkillNodeData[] {
  return stages.flatMap((stage) => stage.skills);
}

/**
 * Computes effective node statuses taking prerequisite completion into account.
 * Explicit `in_progress` and `completed` statuses are preserved; `not_started`
 * becomes `available` once all prerequisite skills are completed.
 */
export function resolveSkillAvailability(skills: SkillNodeData[]): SkillNodeData[] {
  const completedIds = new Set(
    skills.filter((s) => s.status === 'completed').map((s) => s.id)
  );

  return skills.map((skill) => {
    if (skill.status === 'completed' || skill.status === 'in_progress') {
      return skill;
    }
    const prereqsMet = skill.prerequisites.every((pid) => completedIds.has(pid));
    if (skill.isOptional) {
      return {
        ...skill,
        status: prereqsMet ? 'optional_milestone' : 'not_started',
      };
    }
    return {
      ...skill,
      status: prereqsMet ? 'available' : 'not_started',
    };
  });
}

export function applyResolvedStatusesToRoadmap(roadmap: RoadmapData): RoadmapData {
  const allSkills = resolveSkillAvailability(flattenRoadmapSkills(roadmap.stages));
  const byId = new Map(allSkills.map((s) => [s.id, s]));
  return {
    ...roadmap,
    stages: roadmap.stages.map((stage) => ({
      ...stage,
      skills: stage.skills.map((skill) => byId.get(skill.id) ?? skill),
    })),
  };
}

export function calculateRoadmapProgress(roadmap: RoadmapData | null): {
  totalSkills: number;
  completedSkills: number;
  inProgressSkills: number;
  availableSkills: number;
  percentComplete: number;
  totalHours: number;
  completedHours: number;
  currentStage: RoadmapStage | null;
  nextRecommendedSkill: SkillNodeData | null;
} {
  if (!roadmap) {
    return {
      totalSkills: 0,
      completedSkills: 0,
      inProgressSkills: 0,
      availableSkills: 0,
      percentComplete: 0,
      totalHours: 0,
      completedHours: 0,
      currentStage: null,
      nextRecommendedSkill: null,
    };
  }

  const resolved = applyResolvedStatusesToRoadmap(roadmap);
  const skills = flattenRoadmapSkills(resolved.stages);
  const coreSkills = skills.filter((s) => !s.isOptional);
  const denominator = coreSkills.length > 0 ? coreSkills : skills;

  const completedSkills = denominator.filter((s) => s.status === 'completed').length;
  const inProgressSkills = skills.filter((s) => s.status === 'in_progress').length;
  const availableSkills = skills.filter(
    (s) => s.status === 'available' || s.status === 'optional_milestone'
  ).length;

  const totalHours = skills.reduce((sum, s) => sum + s.estimatedHours, 0);
  const completedHours = skills
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + s.estimatedHours, 0);

  const percentComplete =
    denominator.length === 0
      ? 0
      : Math.round((completedSkills / denominator.length) * 100);

  const currentStage =
    resolved.stages.find((stage) =>
      stage.skills.some((s) => s.status !== 'completed' && !s.isOptional)
    ) ??
    resolved.stages[resolved.stages.length - 1] ??
    null;

  const nextRecommendedSkill =
    skills.find((s) => s.status === 'in_progress') ??
    skills.find((s) => s.status === 'available') ??
    skills.find((s) => s.status === 'optional_milestone') ??
    null;

  return {
    totalSkills: skills.length,
    completedSkills,
    inProgressSkills,
    availableSkills,
    percentComplete,
    totalHours,
    completedHours,
    currentStage,
    nextRecommendedSkill,
  };
}

export function buildBalancedWeeklySchedule(
  weeklyHours: number,
  focusTitle: string
): WeeklyScheduleItem[] {
  const safeHours = Math.max(2, Math.min(45, weeklyHours));
  const weights: Array<{
    day: string;
    ratio: number;
    activityType: WeeklyScheduleItem['activityType'];
    label: string;
  }> = [
    { day: 'Mon', ratio: 0.2, activityType: 'Study', label: `Core concepts: ${focusTitle}` },
    { day: 'Tue', ratio: 0.2, activityType: 'Practice', label: 'Guided exercises & drills' },
    { day: 'Thu', ratio: 0.25, activityType: 'Project', label: 'Applied project milestone' },
    { day: 'Sat', ratio: 0.2, activityType: 'Practice', label: 'Deep focus implementation' },
    { day: 'Sun', ratio: 0.15, activityType: 'Review', label: 'Reflection, notes & rest planning' },
  ];

  return weights.map((item) => ({
    day: item.day,
    focus: item.label,
    hours: Math.max(0.5, Math.round(safeHours * item.ratio * 2) / 2),
    activityType: item.activityType,
  }));
}

export function filterCareers(
  careers: CareerEntry[],
  filters: {
    query?: string;
    category?: string;
    difficulty?: string;
    environment?: string;
    education?: string;
  }
): CareerEntry[] {
  const q = (filters.query ?? '').trim().toLowerCase();
  return careers.filter((career) => {
    if (filters.category && filters.category !== 'All' && career.category !== filters.category) {
      return false;
    }
    if (
      filters.difficulty &&
      filters.difficulty !== 'All' &&
      career.difficulty !== filters.difficulty
    ) {
      return false;
    }
    if (
      filters.environment &&
      filters.environment !== 'All' &&
      !career.workEnvironments.some((env) =>
        env.toLowerCase().includes(filters.environment!.toLowerCase())
      )
    ) {
      return false;
    }
    if (
      filters.education &&
      filters.education !== 'All' &&
      !career.educationRequirement.toLowerCase().includes(filters.education.toLowerCase())
    ) {
      return false;
    }
    if (q) {
      const haystack = [
        career.title,
        career.category,
        career.shortDescription,
        ...career.requiredSkills.map((s) => s.name),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    }
    return true;
  });
}

export function calculateAnalyticsSummary(params: {
  roadmap: RoadmapData | null;
  projects: CareerProject[];
  attempts: AssessmentAttempt[];
  activity: LearningActivityEntry[];
}): {
  roadmapPercent: number;
  skillsCompleted: number;
  totalSkills: number;
  projectsCompleted: number;
  totalProjects: number;
  averageAssessmentPercent: number | null;
  totalMinutesLogged: number;
  activeDaysCount: number;
  weeklyMinutesSeries: Array<{ label: string; minutes: number }>;
  stageCompletionSeries: Array<{ label: string; completed: number; total: number; percent: number }>;
} {
  const progress = calculateRoadmapProgress(params.roadmap);
  const projectsCompleted = params.projects.filter((p) => p.status === 'completed').length;

  let averageAssessmentPercent: number | null = null;
  if (params.attempts.length > 0) {
    const sum = params.attempts.reduce(
      (acc, a) => acc + (a.total > 0 ? (a.score / a.total) * 100 : 0),
      0
    );
    averageAssessmentPercent = Math.round(sum / params.attempts.length);
  }

  const totalMinutesLogged = params.activity.reduce((sum, a) => sum + a.minutesSpent, 0);
  const activeDaysCount = new Set(params.activity.map((a) => a.activityDate)).size;

  const byDate = new Map<string, number>();
  for (const item of params.activity) {
    byDate.set(item.activityDate, (byDate.get(item.activityDate) ?? 0) + item.minutesSpent);
  }

  const today = new Date();
  const weeklyMinutesSeries: Array<{ label: string; minutes: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    weeklyMinutesSeries.push({ label, minutes: byDate.get(key) ?? 0 });
  }

  const stageCompletionSeries = (params.roadmap?.stages ?? []).map((stage) => {
    const total = stage.skills.length;
    const completed = stage.skills.filter((s) => s.status === 'completed').length;
    return {
      label: `Stage ${stage.stageNumber}`,
      completed,
      total,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  });

  return {
    roadmapPercent: progress.percentComplete,
    skillsCompleted: progress.completedSkills,
    totalSkills: progress.totalSkills,
    projectsCompleted,
    totalProjects: params.projects.length,
    averageAssessmentPercent,
    totalMinutesLogged,
    activeDaysCount,
    weeklyMinutesSeries,
    stageCompletionSeries,
  };
}

export function nextStatusCycle(current: SkillNodeStatus): SkillNodeStatus {
  if (current === 'available' || current === 'not_started' || current === 'optional_milestone') {
    return 'in_progress';
  }
  if (current === 'in_progress') {
    return 'completed';
  }
  return 'available';
}
