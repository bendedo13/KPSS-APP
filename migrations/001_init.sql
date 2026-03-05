-- KPSS Platform — Initial Database Migration
-- PostgreSQL 14+. Use UUID PKs throughout.

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For trigram similarity (duplicate detection)

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    -- SECURITY NOTE: password_hash uses SHA-256 in bootstrap script.
    -- For production, migrate to bcrypt/argon2 via app-level auth.
    role            TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    display_name    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ============================================================
-- TOPICS
-- ============================================================
CREATE TABLE IF NOT EXISTS topics (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_id   UUID REFERENCES topics(id) ON DELETE SET NULL,
    sort_order  INT  NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_topics_parent ON topics(parent_id);

-- ============================================================
-- AI JOBS (must exist before questions FK)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_jobs (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type             TEXT NOT NULL DEFAULT 'generate_question',
    status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','processing','pending_review','accepted','rejected','failed')),
    idempotency_key      TEXT UNIQUE,          -- prevents duplicate job processing
    last_idempotency_key TEXT,                 -- last successfully processed key
    input_payload        JSONB,
    error                TEXT,
    reject_reason        TEXT,
    auto_publish_rate    FLOAT NOT NULL DEFAULT 0.05,
    started_at           TIMESTAMPTZ,
    finished_at          TIMESTAMPTZ,
    reviewed_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_idempotency ON ai_jobs(idempotency_key);

-- ============================================================
-- AI JOB ATTEMPTS (retry log)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_job_attempts (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ai_job_id      UUID NOT NULL REFERENCES ai_jobs(id) ON DELETE CASCADE,
    attempt_number INT  NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','success','failed')),
    error          TEXT,
    started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at    TIMESTAMPTZ,
    UNIQUE(ai_job_id, attempt_number)
);
CREATE INDEX IF NOT EXISTS idx_job_attempts_job ON ai_job_attempts(ai_job_id);

-- ============================================================
-- QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS questions (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ai_job_id              UUID REFERENCES ai_jobs(id) ON DELETE SET NULL,
    topic_id               UUID REFERENCES topics(id) ON DELETE SET NULL,
    text                   TEXT NOT NULL,
    options                JSONB NOT NULL,   -- [{"label":"A","text":"..."},...]
    correct_option         TEXT NOT NULL,
    difficulty             TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
    explanation            TEXT,
    source                 TEXT NOT NULL DEFAULT 'ai/generated',
    status                 TEXT NOT NULL DEFAULT 'pending_review'
                           CHECK (status IN ('pending_review','active','rejected','archived')),
    estimated_time_seconds INT  NOT NULL DEFAULT 60,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
-- Trigram index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_questions_text_trgm ON questions USING GIN (text gin_trgm_ops);

-- ============================================================
-- FLASHCARDS
-- ============================================================
CREATE TABLE IF NOT EXISTS flashcards (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id    UUID REFERENCES topics(id) ON DELETE SET NULL,
    front       TEXT NOT NULL,
    back        TEXT NOT NULL,
    tags        TEXT[] DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic ON flashcards(topic_id);

-- ============================================================
-- USER PROGRESS (SRS state per user per flashcard)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_progress (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flashcard_id      UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    interval_days     INT  NOT NULL DEFAULT 1,
    ease_factor       FLOAT NOT NULL DEFAULT 2.5,  -- SM-2 ease factor
    repetitions       INT  NOT NULL DEFAULT 0,
    next_review_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    last_quality      INT,                          -- 0-5 quality rating
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, flashcard_id)
);
CREATE INDEX IF NOT EXISTS idx_user_progress_review ON user_progress(user_id, next_review_date);

-- ============================================================
-- TASKS (daily task definitions)
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       TEXT NOT NULL,
    description TEXT,
    task_type   TEXT NOT NULL CHECK (task_type IN ('quiz','flashcard','video','reading','custom')),
    metadata    JSONB DEFAULT '{}',
    active      BOOLEAN NOT NULL DEFAULT true,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USER TASKS (daily task completion per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_tasks (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','skipped')),
    completed_at  TIMESTAMPTZ,
    UNIQUE(user_id, task_id, assigned_date)
);
CREATE INDEX IF NOT EXISTS idx_user_tasks_date ON user_tasks(user_id, assigned_date);

-- ============================================================
-- TESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tests (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_ids UUID[] NOT NULL,
    answers      JSONB,              -- [{"question_id":"...","selected_option":"A"},...]
    score        INT,
    status       TEXT NOT NULL DEFAULT 'in_progress'
                 CHECK (status IN ('in_progress','completed','abandoned')),
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tests_user ON tests(user_id);
CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status);

-- ============================================================
-- WRONG BOOK
-- ============================================================
CREATE TABLE IF NOT EXISTS wrong_book (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    wrong_count  INT NOT NULL DEFAULT 1,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_wrong_book_user ON wrong_book(user_id);
CREATE INDEX IF NOT EXISTS idx_wrong_book_last_seen ON wrong_book(user_id, last_seen_at DESC);

-- ============================================================
-- SEED: Default topics for KPSS
-- ============================================================
INSERT INTO topics (name, description, sort_order) VALUES
  ('Genel Yetenek', 'Sayısal ve Sözel Yetenek', 1),
  ('Genel Kültür', 'Türkçe, Matematik, Tarih, Coğrafya, Vatandaşlık, Güncel Bilgi', 2),
  ('Türkçe', 'Dil bilgisi ve anlama', 3),
  ('Matematik', 'Temel matematik', 4),
  ('Tarih', 'Türk ve Dünya tarihi', 5),
  ('Coğrafya', 'Türkiye ve Dünya coğrafyası', 6),
  ('Vatandaşlık', 'Anayasa ve hukuk', 7)
ON CONFLICT (name) DO NOTHING;
