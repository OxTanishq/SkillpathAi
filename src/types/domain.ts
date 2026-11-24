import { z } from 'zod';

export type ThemePreference = 'dark' | 'light' | 'system';

export type SkillNodeStatus =
  | 'not_started'
  | 'available'
  | 'in_progress'
  | 'completed'
  | 'optional_milestone';

export type ProjectStatus = 'planned' | 'in_progress' | 'testing' | 'completed';

export interface SalaryRange {
  region: string;
  currency: string;
  entryMin: number;
  entryMax: number;
  midMin: number;
  midMax: number;
  seniorMin: number;
  seniorMax: number;
  source: string;
  asOf: string;
  uncertaintyNote: string;
}

export interface CareerEntry {
  id: string;
  slug: string;
  title: string;
  category:
    | 'AI & Data'
    | 'Software & Security'
    | 'Engineering & Robotics'
    | 'Medicine & Science'
    | 'Design & Games'
    | 'Business & Architecture';
  shortDescription: string;
  overview: string;
  dailyResponsibilities: string[];
  requiredSkills: { name: string; level: 'Core' | 'Intermediate' | 'Advanced'; type: 'Technical' | 'Interpersonal' }[];
  educationalPathways: string[];
  portfolioRecommendations: string[];
  entryLevelOpportunities: string[];
  careerProgression: string[];
  commonMisconceptions: string[];
  relatedSlugs: string[];
  workEnvironments: string[];
  difficulty: 'Beginner-Friendly' | 'Moderate' | 'Rigorous' | 'Highly Rigorous';
  estimatedMonthsRange: string;
  educationRequirement: string;
  outlookNote: string;
  salary: SalaryRange;
  imageUrl?: string;
}

export interface LearningResource {
  id: string;
  title: string;
  provider: string;
  url: string;
  type: 'Video' | 'Documentation' | 'Course' | 'Book' | 'Article' | 'Interactive' | 'Practice' | 'Repository';
  cost: 'Free' | 'Freemium' | 'Paid';
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  durationLabel: string;
  language: string;
  skillCategory: string;
  verified: boolean;
  description: string;
}

export interface SkillNodeData {
  id: string;
  title: string;
  stageNumber: number;
  stageTitle: string;
  summary: string;
  whyItMatters: string;
  prerequisites: string[];
  estimatedHours: number;
  status: SkillNodeStatus;
  isOptional: boolean;
  practiceExercises: string[];
  projectIdeas: string[];
  resourceIds: string[];
}

export interface RoadmapStage {
  stageNumber: number;
  title: string;
  description: string;
  estimatedWeeks: string;
  milestone: string;
  assessmentObjective: string;
  skills: SkillNodeData[];
}

export interface WeeklyScheduleItem {
  day: string;
  focus: string;
  hours: number;
  activityType: 'Study' | 'Practice' | 'Project' | 'Review';
}

export interface RoadmapData {
  id: string;
  careerSlug: string;
  careerTitle: string;
  objective: string;
  version: number;
  isAiGenerated: boolean;
  sourceLabel: string;
  estimatedDurationRange: string;
  weeklyHoursTarget: number;
  createdAt: string;
  updatedAt: string;
  stages: RoadmapStage[];
  weeklySchedule: WeeklyScheduleItem[];
}

export interface ProjectMilestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface CareerProject {
  id: string;
  title: string;
  objective: string;
  careerSlug: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  status: ProjectStatus;
  requiredSkills: string[];
  technologies: string[];
  estimatedHours: number;
  deliverables: string[];
  evaluationCriteria: string[];
  portfolioNotes: string;
  milestones: ProjectMilestone[];
  isAiGenerated: boolean;
  createdAt: string;
}

export interface AssessmentQuestion {
  id: string;
  type: 'multiple_choice' | 'conceptual' | 'scenario' | 'coding';
  prompt: string;
  codeSnippet?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  skillTag: string;
}

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  title: string;
  careerSlug: string;
  score: number;
  total: number;
  weakSkills: string[];
  recommendations: string[];
  createdAt: string;
}

export interface MentorMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
  createdAt: string;
}

export interface MentorConversation {
  id: string;
  title: string;
  careerSlug: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningActivityEntry {
  id: string;
  activityDate: string; // YYYY-MM-DD
  minutesSpent: number;
  activityType: 'skill_completed' | 'assessment' | 'project' | 'study_session';
  label: string;
}

export interface UserPreferences {
  stage: string;
  interests: string[];
  existingSkills: string[];
  desiredCareer: string;
  weeklyHours: number;
  learningStyle: string;
  objectives: string[];
  preferredLanguage: string;
  resourceCostPreference: 'free' | 'paid' | 'both';
  theme: ThemePreference;
  notificationsEnabled: boolean;
  weeklyDigest: boolean;
  gentleBreakReminders: boolean;
  onboardingCompleted: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  emailVerified: boolean;
  planTier: 'free' | 'plus';
  createdAt: string;
}

export const GeneratedRoadmapSchema = z.object({
  careerTitle: z.string().min(2).max(120),
  objective: z.string().min(5).max(500),
  estimatedDurationRange: z.string().min(3).max(80),
  stages: z
    .array(
      z.object({
        stageNumber: z.number().int().min(1).max(12),
        title: z.string().min(2).max(120),
        description: z.string().min(5).max(400),
        estimatedWeeks: z.string().min(2).max(60),
        milestone: z.string().min(3).max(240),
        assessmentObjective: z.string().min(3).max(240),
        skills: z
          .array(
            z.object({
              id: z.string().min(2).max(80),
              title: z.string().min(2).max(100),
              summary: z.string().min(5).max(320),
              whyItMatters: z.string().min(5).max(320),
              prerequisites: z.array(z.string()).max(6),
              estimatedHours: z.number().int().min(1).max(300),
              isOptional: z.boolean(),
              practiceExercises: z.array(z.string()).min(1).max(5),
              projectIdeas: z.array(z.string()).min(1).max(4),
              recommendedResourceTitles: z.array(z.string()).max(4).optional(),
            })
          )
          .min(2)
          .max(6),
      })
    )
    .min(4)
    .max(8),
  weeklySchedule: z
    .array(
      z.object({
        day: z.string().min(2).max(24),
        focus: z.string().min(2).max(160),
        hours: z.number().min(0.5).max(12),
        activityType: z.enum(['Study', 'Practice', 'Project', 'Review']),
      })
    )
    .min(3)
    .max(7),
});

export const GeneratedProjectSchema = z.object({
  title: z.string().min(3).max(120),
  objective: z.string().min(10).max(400),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  requiredSkills: z.array(z.string()).min(2).max(8),
  technologies: z.array(z.string()).min(2).max(8),
  estimatedHours: z.number().int().min(2).max(200),
  deliverables: z.array(z.string()).min(2).max(6),
  evaluationCriteria: z.array(z.string()).min(2).max(6),
  portfolioNotes: z.string().min(5).max(300),
  milestones: z.array(z.string()).min(3).max(7),
});
