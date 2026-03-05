# KPSS Preparation Platform

A mobile-first learning platform for KPSS (Kamu Personeli Seçme Sınavı) preparation with
microlearning, spaced-repetition flashcards, AI-assisted question generation, wrong-answer notebook, and analytics.

## Monorepo Structure

```
.
├── apps/
│   └── mobile/          # Expo + React Native (TypeScript, Expo Router)
├── packages/
│   └── shared/          # ⬅ Shared types, validation schemas, API helpers, SRS algorithm
│                        #   The single source of truth — consumed by backend and mobile
│                        #   to eliminate code duplication
├── services/
│   └── backend/         # Fastify + TypeScript REST API
└── migrations/
    └── 001_init.sql     # PostgreSQL schema
```

## Key Design Decision — Shared Package

The `packages/shared` package is the central refactoring artifact.

Before the refactoring, the following code would have been **duplicated** across `services/backend` and `apps/mobile`:

| What                          | Location in `packages/shared`                |
|-------------------------------|----------------------------------------------|
| `Question`, `Test`, `User`, `Flashcard` types | `src/types/`           |
| Zod validation schemas        | `src/validation/`                            |
| `ApiResponse<T>` type + helpers | `src/api/response.ts`                      |
| Error codes & messages        | `src/api/errors.ts`                          |
| Pagination helpers            | `src/utils/pagination.ts`                    |
| SM-2 SRS algorithm            | `src/utils/srs.ts`                           |

The `services/backend` additionally uses a `BaseRepository<T>` class
(`services/backend/src/db/repository.ts`) to eliminate duplicated CRUD boilerplate
(findById, findAll, deleteById) that would otherwise be copy-pasted for every entity.

## Quick Start

### Prerequisites

- Node.js ≥ 20
- PostgreSQL ≥ 14
- npm ≥ 9 (workspaces)

### Setup

```bash
# 1. Install all workspace dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# 3. Run database migrations
psql $DATABASE_URL -f migrations/001_init.sql

# 4. Build shared package
npm run build -w packages/shared

# 5. Start backend (dev mode)
npm run dev -w services/backend
```

### Mobile App

```bash
npm run start -w apps/mobile
```

### Tests

```bash
# Run all tests (all workspaces)
npm test

# Run shared package tests only
npm test -w packages/shared
```

## Environment Variables

See [`.env.example`](.env.example) for all required variables with descriptions.

> **Security notice**: Never commit `.env` to source control.
> Never embed API keys or JWT secrets in frontend/mobile code.

## Legal & Licensing

- Do **not** import paywalled exam books or third-party question banks without a
  licensing agreement.
- Maintain audit logs of human approvals for AI-generated questions
  (`ai_jobs` and `ai_job_attempts` tables).
- AI-generated questions are stored with `status = 'pending_review'` until
  a human reviewer approves them.
