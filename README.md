# SkillPath AI — Nexora Studios

> *Your ambition. Your roadmap. Your future.*

SkillPath AI is a full-stack career exploration and personalized learning platform built with React 19, Vite, Express, Node's built-in SQLite (`node:sqlite`), Three.js, React Flow (`@xyflow/react`), and server-side Gemini AI integration (`@google/genai`).

## Architecture Overview

- **Frontend (`src/`)**:
  - **Public Landing (`LandingPage.tsx`)**: 7-section scroll storytelling experience with an interactive Three.js 3D skill-node constellation (`HeroConstellation3D.tsx`), live roadmap explorer, clearly labeled AI mentor demonstration, Bento grid, and live career search.
  - **Career Detail Pages (`CareerDetailPage.tsx`)**: Public `/careers/:slug` pages detailing daily work, technical/interpersonal skills, educational pathways, and regional salary benchmarks with citations and uncertainty notes.
  - **Onboarding Wizard (`OnboardingWizard.tsx`)**: 8-step skippable personalization flow generating either a schema-validated AI roadmap or a curated foundation blueprint.
  - **Authenticated Workspace (`DashboardWorkspace.tsx`, `DashboardSubViews.tsx`)**: Overview Bento grid, Career Explorer, My Roadmap (version history, restore, weekly pacing), Interactive Skill Tree (`SkillTreeGraph.tsx` with graph + accessible list view), streaming AI Mentor (`SafeMarkdown.tsx`), Learning Hub, Projects Kanban + AI Project Generator, Skill Assessments, Career Comparison Engine, Personal Analytics (`AnalyticsCharts.tsx`), and Settings (Dark/Light/System theme, JSON export, account deletion).
  - **Global Command Palette (`CommandPalette.tsx`)**: Keyboard-accessible (`Cmd+K` / `Ctrl+K`) navigation across careers, skills, pages, resources, and themes.
  - **PWA & SEO**: `vite-plugin-pwa` offline precaching + install button, `robots.txt`, `sitemap.xml`, OpenGraph tags, and JSON-LD `WebApplication` schema.

- **Backend (`server.ts`, `src/db/`, `src/server/`)**:
  - Express API + Vite dev middleware on port `3000`.
  - 23-table relational SQLite schema (`src/db/schema.sql`) persisted to `skillpath.db` with foreign keys enabled.
  - `scryptSync` + `timingSafeEqual` password hashing, HMAC-SHA256 bearer + `HttpOnly; SameSite=None; Partitioned` cookies, origin validation (`verifyMutationOrigin`), and per-route rate limiting.
  - Server-side Gemini proxy routes (`/api/roadmaps/generate`, `/api/projects/generate`, `/api/mentor/chat` SSE streaming) keeping `GEMINI_API_KEY` off the client.

## Environment Variables

Copy `.env.example` and configure as needed:

- `GEMINI_API_KEY` — Server-side Google Gemini API key for live AI roadmap generation, AI project specs, and AI Mentor streaming. When omitted, curated foundation blueprints remain fully functional and AI routes honestly report unconfigured status (`503`).
- `SESSION_SECRET` — Secret used to sign session tokens (auto-generated ephemeral dev fallback if omitted in development).
- `APP_URL` — Optional origin allowlist URL.

## Running Locally

```bash
npm install
npm run dev       # Starts Express + Vite dev server on http://localhost:3000
npm run lint      # Runs TypeScript type-check (tsc --noEmit)
npm run build     # Builds production client bundle into dist/
npm start         # Runs production server on port 3000
```
