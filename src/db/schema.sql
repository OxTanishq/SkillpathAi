PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  plan_tier TEXT NOT NULL DEFAULT 'free',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'Exploring',
  interests_json TEXT NOT NULL DEFAULT '[]',
  existing_skills_json TEXT NOT NULL DEFAULT '[]',
  desired_career TEXT NOT NULL DEFAULT 'ai-engineer',
  weekly_hours INTEGER NOT NULL DEFAULT 8,
  learning_style TEXT NOT NULL DEFAULT 'Hands-on projects',
  objectives_json TEXT NOT NULL DEFAULT '[]',
  preferred_language TEXT NOT NULL DEFAULT 'English',
  resource_cost_preference TEXT NOT NULL DEFAULT 'both',
  theme TEXT NOT NULL DEFAULT 'dark',
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  weekly_digest INTEGER NOT NULL DEFAULT 1,
  gentle_break_reminders INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS careers (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  short_description TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS career_skills (
  career_id TEXT NOT NULL REFERENCES careers(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  skill_type TEXT NOT NULL,
  PRIMARY KEY (career_id, skill_id)
);

CREATE TABLE IF NOT EXISTS roadmaps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  career_slug TEXT NOT NULL,
  career_title TEXT NOT NULL,
  objective TEXT NOT NULL,
  active_version INTEGER NOT NULL DEFAULT 1,
  is_ai_generated INTEGER NOT NULL DEFAULT 0,
  source_label TEXT NOT NULL,
  estimated_duration_range TEXT NOT NULL,
  weekly_hours_target INTEGER NOT NULL DEFAULT 8,
  weekly_schedule_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roadmap_versions (
  id TEXT PRIMARY KEY,
  roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT 'Initial version',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roadmap_stages (
  id TEXT PRIMARY KEY,
  roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_weeks TEXT NOT NULL,
  milestone TEXT NOT NULL,
  assessment_objective TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_dependencies (
  roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  skill_node_id TEXT NOT NULL,
  prerequisite_node_id TEXT NOT NULL,
  PRIMARY KEY (roadmap_id, skill_node_id, prerequisite_node_id)
);

CREATE TABLE IF NOT EXISTS skill_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  skill_node_id TEXT NOT NULL,
  stage_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  node_payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (roadmap_id, skill_node_id)
);

CREATE TABLE IF NOT EXISTS learning_resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  provider TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  cost TEXT NOT NULL,
  level TEXT NOT NULL,
  duration_label TEXT NOT NULL,
  language TEXT NOT NULL,
  skill_category TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,
  roadmap_stage INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, resource_id)
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  career_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  required_skills_json TEXT NOT NULL DEFAULT '[]',
  technologies_json TEXT NOT NULL DEFAULT '[]',
  estimated_hours INTEGER NOT NULL DEFAULT 12,
  deliverables_json TEXT NOT NULL DEFAULT '[]',
  evaluation_criteria_json TEXT NOT NULL DEFAULT '[]',
  portfolio_notes TEXT NOT NULL DEFAULT '',
  is_ai_generated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  career_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  questions_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assessment_id TEXT NOT NULL,
  title TEXT NOT NULL,
  career_slug TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  weak_skills_json TEXT NOT NULL DEFAULT '[]',
  recommendations_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  career_slug TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  citations_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS learning_activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  activity_date TEXT NOT NULL,
  minutes_spent INTEGER NOT NULL,
  activity_type TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_roadmaps_user ON roadmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_progress_user ON skill_progress(user_id, roadmap_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_user_date ON learning_activity(user_id, activity_date);
