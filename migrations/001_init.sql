-- KPSS Platform — Initial Database Migration
-- Run with: psql $DATABASE_URL -f migrations/001_init.sql
--
-- LEGAL NOTE: Do NOT import paywalled exam books or copyrighted content
-- without a valid licensing agreement. Maintain audit logs of all
-- human approvals for AI-generated content.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'reviewer')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─── Topics ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS topics (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    parent_id   UUID REFERENCES topics(id),
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topics_name ON topics(name);

-- ─── Questions ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS questions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_job_id               UUID,
    text                    TEXT NOT NULL,
    options                 JSONB NOT NULL,         -- [{"label":"A","text":"..."}]
    correct_option          CHAR(1) NOT NULL,
    difficulty              TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    topic_id                UUID REFERENCES topics(id),
    subtopic                TEXT,
    estimated_time_seconds  INTEGER NOT NULL DEFAULT 60,
    explanation             TEXT,
    source                  TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'ai/generated'
    status                  TEXT NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'auto_accepted')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_ai_job_id ON questions(ai_job_id);

-- ─── Flashcards ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flashcards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id        UUID REFERENCES topics(id),
    front           TEXT NOT NULL,
    back            TEXT NOT NULL,
    difficulty      TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    source          TEXT NOT NULL DEFAULT 'manual',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_flashcard_progress (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flashcard_id    UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    interval_days   INTEGER NOT NULL DEFAULT 1,
    ease_factor     NUMERIC(4,2) NOT NULL DEFAULT 2.5,
    due_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    review_count    INTEGER NOT NULL DEFAULT 0,
    last_reviewed   TIMESTAMPTZ,
    PRIMARY KEY (user_id, flashcard_id)
);

CREATE INDEX IF NOT EXISTS idx_ufp_due_date ON user_flashcard_progress(user_id, due_date);

-- ─── Tasks ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    description TEXT,
    task_type   TEXT NOT NULL DEFAULT 'questions', -- 'questions' | 'flashcards' | 'video' | 'reading'
    target_count INTEGER NOT NULL DEFAULT 10,
    active      BOOLEAN NOT NULL DEFAULT true,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_progress (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    date            DATE NOT NULL DEFAULT CURRENT_DATE,
    is_completed    BOOLEAN NOT NULL DEFAULT false,
    completed_count INTEGER NOT NULL DEFAULT 0,
    completed_at    TIMESTAMPTZ,
    PRIMARY KEY (user_id, task_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_date ON user_progress(user_id, date);

-- ─── Tests ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    total_questions INTEGER NOT NULL DEFAULT 0,
    score           INTEGER,
    score_percent   INTEGER,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tests_user_id ON tests(user_id);
CREATE INDEX IF NOT EXISTS idx_tests_created_at ON tests(created_at DESC);

-- ─── Wrong Book ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wrong_book (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_option CHAR(1) NOT NULL,
    correct_option  CHAR(1) NOT NULL,
    review_count    INTEGER NOT NULL DEFAULT 1,
    added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_wrong_book_user_id ON wrong_book(user_id);

-- ─── AI Jobs ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_jobs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic                   TEXT NOT NULL,
    subtopic                TEXT,
    difficulty              TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    requested_count         INTEGER NOT NULL DEFAULT 5,
    status                  TEXT NOT NULL DEFAULT 'queued'
                                CHECK (status IN ('queued', 'processing', 'pending_review', 'accepted', 'rejected', 'failed')),
    requested_by            UUID REFERENCES users(id),
    reviewer_id             UUID REFERENCES users(id),
    reviewer_notes          TEXT,
    reviewed_at             TIMESTAMPTZ,
    last_idempotency_key    TEXT,   -- BullMQ job ID for idempotency
    completed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_created_at ON ai_jobs(created_at DESC);

-- ─── AI Job Attempts ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_job_attempts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_job_id       UUID NOT NULL REFERENCES ai_jobs(id) ON DELETE CASCADE,
    attempt_number  INTEGER NOT NULL,
    bull_job_id     TEXT,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    success         BOOLEAN,
    error_message   TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_job_attempts_job_id ON ai_job_attempts(ai_job_id);

-- ─── Seed default tasks ─────────────────────────────────────────────────────

INSERT INTO tasks (title, description, task_type, target_count, active, sort_order)
VALUES
    ('Günlük Sorular', 'Bugün 10 soru çöz', 'questions', 10, true, 1),
    ('Flashcard Tekrarı', 'Bekleyen flashcard''ları tekrar et', 'flashcards', 20, true, 2),
    ('Yanlış Defteri', 'Dünkü yanlış soruları gözden geçir', 'questions', 5, true, 3)
ON CONFLICT DO NOTHING;
