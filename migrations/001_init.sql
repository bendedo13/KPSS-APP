-- ============================================================================
-- Migration 001: Initial Schema
-- Description: Creates the foundational tables for the KPSS study application
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- Custom ENUM Types
-- ----------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('user', 'admin');

CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

CREATE TYPE question_status AS ENUM (
    'pending_review',
    'auto_accepted',
    'approved',
    'rejected'
);

CREATE TYPE test_status AS ENUM ('in_progress', 'completed', 'abandoned');

CREATE TYPE ai_job_status AS ENUM (
    'queued',
    'processing',
    'completed',
    'failed',
    'cancelled'
);

-- ----------------------------------------------------------------------------
-- Table: users
-- Core user accounts for the application.
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR     NOT NULL UNIQUE,
    password_hash   VARCHAR     NOT NULL,
    display_name    VARCHAR,
    role            user_role   NOT NULL DEFAULT 'user',
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Table: topics
-- Hierarchical topic tree. parent_topic_id enables nesting (e.g. KPSS > Eğitim Bilimleri > Gelişim Psikolojisi).
-- ----------------------------------------------------------------------------
CREATE TABLE topics (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR     NOT NULL,
    parent_topic_id UUID        REFERENCES topics (id) ON DELETE SET NULL,
    description     TEXT,
    sort_order      INT         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Table: questions
-- Question bank. Options stored as JSONB for flexible answer formats.
-- created_by_job_id links AI-generated questions back to their originating job.
-- last_idempotency_key prevents duplicate inserts from retried AI jobs.
-- ----------------------------------------------------------------------------
CREATE TABLE questions (
    id                      UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id                UUID              NOT NULL REFERENCES topics (id) ON DELETE CASCADE,
    subtopic                VARCHAR,
    text                    TEXT              NOT NULL,
    options                 JSONB             NOT NULL,
    correct_option          VARCHAR           NOT NULL,
    difficulty              difficulty_level  NOT NULL DEFAULT 'medium',
    explanation             TEXT,
    source                  VARCHAR           NOT NULL DEFAULT 'ai/generated',
    estimated_time_seconds  INT               NOT NULL DEFAULT 60,
    confidence              NUMERIC(3,2)      CHECK (confidence >= 0 AND confidence <= 1),
    status                  question_status   NOT NULL DEFAULT 'pending_review',
    created_by_job_id       UUID,
    last_idempotency_key    VARCHAR,
    created_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Table: flashcards
-- Spaced-repetition flashcards tied to a user and question.
-- ease_factor, interval_days, and repetitions drive the SM-2 scheduling algorithm.
-- ----------------------------------------------------------------------------
CREATE TABLE flashcards (
    id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    question_id     UUID           NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    front_text      TEXT           NOT NULL,
    back_text       TEXT           NOT NULL,
    ease_factor     NUMERIC(4,2)   NOT NULL DEFAULT 2.5,
    interval_days   INT            NOT NULL DEFAULT 1,
    repetitions     INT            NOT NULL DEFAULT 0,
    next_review_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Table: user_progress
-- Aggregated per-topic progress for each user.
-- The unique constraint on (user_id, topic_id) ensures one row per user+topic pair.
-- ----------------------------------------------------------------------------
CREATE TABLE user_progress (
    id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id              UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    topic_id             UUID        NOT NULL REFERENCES topics (id) ON DELETE CASCADE,
    total_questions_seen INT         NOT NULL DEFAULT 0,
    correct_count        INT         NOT NULL DEFAULT 0,
    streak               INT         NOT NULL DEFAULT 0,
    last_activity_at     TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, topic_id)
);

-- ----------------------------------------------------------------------------
-- Table: tasks
-- User-facing study tasks / to-do items with optional due dates.
-- ----------------------------------------------------------------------------
CREATE TABLE tasks (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    task_type       VARCHAR     NOT NULL,
    title           VARCHAR     NOT NULL,
    description     TEXT,
    is_completed    BOOLEAN     NOT NULL DEFAULT FALSE,
    due_date        TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Table: tests
-- Practice tests / quizzes. question_ids and answers stored as JSONB arrays
-- so tests can be serialised and resumed.
-- ----------------------------------------------------------------------------
CREATE TABLE tests (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    topic_id        UUID          REFERENCES topics (id) ON DELETE SET NULL,
    question_ids    JSONB         NOT NULL,
    answers         JSONB,
    score           NUMERIC(5,2),
    total_questions INT           NOT NULL,
    completed_at    TIMESTAMPTZ,
    status          test_status   NOT NULL DEFAULT 'in_progress',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Table: wrong_book
-- Tracks every incorrect answer so users can revisit their mistakes.
-- The unique constraint on (user_id, question_id, test_id) prevents duplicate entries
-- for the same wrong answer within the same test.
-- ----------------------------------------------------------------------------
CREATE TABLE wrong_book (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    question_id     UUID        NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    test_id         UUID        REFERENCES tests (id) ON DELETE SET NULL,
    user_answer     VARCHAR     NOT NULL,
    correct_answer  VARCHAR     NOT NULL,
    reviewed        BOOLEAN     NOT NULL DEFAULT FALSE,
    review_count    INT         NOT NULL DEFAULT 0,
    next_review_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, question_id, test_id)
);

-- ----------------------------------------------------------------------------
-- Table: ai_jobs
-- Background AI content-generation jobs (e.g. bulk question creation).
-- auto_publish_rate controls what fraction of results are auto-accepted.
-- last_idempotency_key prevents duplicate job submissions.
-- ----------------------------------------------------------------------------
CREATE TABLE ai_jobs (
    id                    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type              VARCHAR         NOT NULL,
    topic_id              UUID            REFERENCES topics (id) ON DELETE SET NULL,
    parameters            JSONB           NOT NULL DEFAULT '{}',
    status                ai_job_status   NOT NULL DEFAULT 'queued',
    result                JSONB,
    error_message         TEXT,
    attempt_count         INT             NOT NULL DEFAULT 0,
    max_attempts          INT             NOT NULL DEFAULT 3,
    last_idempotency_key  VARCHAR         UNIQUE,
    auto_publish_rate     NUMERIC(5,4)    NOT NULL DEFAULT 0.05
                          CHECK (auto_publish_rate >= 0 AND auto_publish_rate <= 1),
    created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    completed_at          TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- Table: ai_job_attempts
-- Immutable audit log for every attempt made by an ai_job.
-- ----------------------------------------------------------------------------
CREATE TABLE ai_job_attempts (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    ai_job_id         UUID        NOT NULL REFERENCES ai_jobs (id) ON DELETE CASCADE,
    attempt_number    INT         NOT NULL,
    status            VARCHAR     NOT NULL,
    started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at      TIMESTAMPTZ,
    error_message     TEXT,
    response_payload  JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- questions: speed up filtering by topic, review status, and idempotency lookups
CREATE INDEX idx_questions_topic_id             ON questions (topic_id);
CREATE INDEX idx_questions_status               ON questions (status);
CREATE INDEX idx_questions_last_idempotency_key ON questions (last_idempotency_key);

-- flashcards: fetch a user's cards due for review
CREATE INDEX idx_flashcards_user_id        ON flashcards (user_id);
CREATE INDEX idx_flashcards_next_review_at ON flashcards (next_review_at);

-- user_progress: look up progress by user or topic
CREATE INDEX idx_user_progress_user_id  ON user_progress (user_id);
CREATE INDEX idx_user_progress_topic_id ON user_progress (topic_id);

-- tasks: list a user's tasks, ordered / filtered by due date
CREATE INDEX idx_tasks_user_id  ON tasks (user_id);
CREATE INDEX idx_tasks_due_date ON tasks (due_date);

-- tests: list a user's tests, filtered by status
CREATE INDEX idx_tests_user_id ON tests (user_id);
CREATE INDEX idx_tests_status  ON tests (status);

-- wrong_book: fetch unreviewed items and those due for review
CREATE INDEX idx_wrong_book_user_id        ON wrong_book (user_id);
CREATE INDEX idx_wrong_book_reviewed       ON wrong_book (reviewed);
CREATE INDEX idx_wrong_book_next_review_at ON wrong_book (next_review_at);

-- ai_jobs: queue polling and idempotency checks
CREATE INDEX idx_ai_jobs_status               ON ai_jobs (status);
CREATE INDEX idx_ai_jobs_last_idempotency_key ON ai_jobs (last_idempotency_key);

-- ai_job_attempts: list attempts for a given job
CREATE INDEX idx_ai_job_attempts_ai_job_id ON ai_job_attempts (ai_job_id);

COMMIT;
