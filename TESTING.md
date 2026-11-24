# SkillPath AI — Testing & QA Guide

## Automated Checks

1. **Unit Tests (Pure Roadmap, Progress, Scheduling & Analytics Logic)**:
   ```bash
   npx --yes tsx --test src/utils/roadmapLogic.test.ts
   ```
   Verifies prerequisite skill unlocking (`resolveSkillAvailability`), progress calculation (`calculateRoadmapProgress`), balanced weekly schedule generation (`buildBalancedWeeklySchedule`), multi-criteria career filtering (`filterCareers`), analytics summaries (`calculateAnalyticsSummary`), and skill status cycling (`nextStatusCycle`).

2. **Type Check & Production Build**:
   ```bash
   npm run lint
   npm run build
   ```

## Manual Verification Matrix

### Desktop (`1440x900`) & Mobile (`390x844`)
- **Landing Page**:
  - Verify hero Three.js constellation renders smoothly and updates when clicking career chips (`AI Engineer`, `Robotics Engineer`, etc.).
  - Verify `Explore Careers` search and category filters open `/careers/:slug` cleanly with cited BLS salary tables.
  - Verify `Cmd+K` / `Ctrl+K` opens the Command Palette and navigates across careers, themes, and workspace pages.
- **Authentication & Onboarding**:
  - Register a new account, optionally complete/skip email verification, and complete the 8-step onboarding wizard using Curated Blueprint (or AI Roadmap when `GEMINI_API_KEY` is configured).
  - Verify reload preserves session and active roadmap from SQLite (`skillpath.db`).
- **Workspace Modules**:
  - **Skill Tree**: Toggle between Graph view and Accessible List view; select a node, update status (`In Progress` -> `Completed`), and verify dependent nodes unlock automatically.
  - **My Roadmap**: Adjust weekly hours, verify a new version snapshot appears in Version History, and restore an earlier snapshot.
  - **Projects Kanban**: Move a project across columns (`Planned` -> `In Progress` -> `Testing` -> `Completed`), toggle milestones, create a custom project, and export Markdown portfolio.
  - **Assessments**: Submit answers, review explanations, verify score persistence, and launch weak-skill mentor review.
  - **Theme & Account Controls**: Toggle `Dark` / `Light` / `System` theme, download JSON data export (`/api/account/export`), and verify zero horizontal overflow on mobile (`390x844`).
