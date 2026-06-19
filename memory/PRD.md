# Hireginie LMS - Product Requirements Document

## Original Problem Statement
Enterprise-grade LMS for HR Recruitment Consultancy "Hireginie" to train recruiters, TA specialists, HR professionals & hiring managers. Three roles (SuperAdmin AD###, Trainer, Learner 1001-1500), 6 learning domains, modules + content + quizzes + assignments, certifications, gamification, analytics, AI features.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor async). JWT auth with bcrypt.
- **Frontend**: React 19 + React Router 7 + Shadcn UI + Tailwind + Recharts.
- **AI**: Emergent LLM key (gpt-5.4) for chatbot, summarization, quiz generation, recommendations.
- **Storage**: Local file uploads under /app/backend/uploads served via `/api/files/{name}`.

## Auth & Roles
- Admin login IDs: AD001, AD002, ... auto-generated.
- Learner login IDs: 4-digit numeric (1001-1500); range configurable in admin panel (next phase UI).
- First-login forces password change + policy acceptance.
- Roles: `admin`, `trainer`, `learner` with RBAC at endpoint level.

## Implemented (Feb 2026 - MVP)
- JWT auth, login, change password, role-based routing
- User management (CRUD + bulk CSV upload + reset password + activate/deactivate)
- Departments
- Courses across 6 categories with seeded sample content
- Modules, Lessons (video / YouTube / PDF / notes / docs)
- Quiz engine (single/multiple/true-false/fill, timed, pass %, negative marking, attempt history)
- Assignments + Submissions + Evaluation
- Auto-issued Certificates (>=90% completion + quiz passed) with verify code
- Gamification (points for lessons/quiz/assignment/daily login, leaderboard daily/weekly/monthly/overall)
- Notifications
- Search (courses/modules/lessons)
- Analytics: KPIs, top performers, course engagement, department reports
- AI: Chatbot, course summary, MCQ generation from text, course recommendation
- Learner dashboard + Admin dashboard with charts

## Pre-seeded Data
- 2 admin-type accounts (AD001, AD002), 8 learners (1001-1008)
- 17 courses across 6 categories, each with 2 modules × 3 lessons + 1 quiz + 1 assignment
- 4 courses assigned to each learner

## Backlog / Next Phases
- P1: PDF certificate generation with QR code (currently HTML view)
- P1: Bulk-upload UI page in admin
- P1: Two-factor auth
- P2: Real-time notifications (WebSocket)
- P2: Video streaming via CDN, content version control
- P2: Excel export for analytics
- P2: Department-wise reporting UI charts
- P2: Configurable employee-code range UI

## Test Credentials
See `/app/memory/test_credentials.md`
