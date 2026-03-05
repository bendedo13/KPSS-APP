-- KPSS Preparation Platform — Initial Schema
-- Run: psql $DATABASE_URL -f migrations/001_init.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ─── Questions ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS questions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text                    TEXT NOT NULL,
  options                 JSONB NOT NULL,
  correct_option          TEXT NOT NULL,
  difficulty              TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  topic                   TEXT NOT NULL,
  subtopic                TEXT NOT NULL,
  estimated_time_seconds  INT NOT NULL DEFAULT 60,
  explanation             TEXT NOT NULL,
  source                  TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('ai/generated', 'manual')),
  status                  TEXT NOT NULL DEFAULT 'pending_review'
                            CHECK (status IN ('pending_review', 'auto_accepted', 'approved', 'rejected')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_topic    ON questions (topic);
CREATE INDEX IF NOT EXISTS idx_questions_status   ON questions (status);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions (difficulty);

-- ─── Tests ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  topic            TEXT,
  score            INT,
  total_questions  INT NOT NULL DEFAULT 0,
  correct_count    INT,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tests_user_id ON tests (user_id);

CREATE TABLE IF NOT EXISTS test_answers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id              UUID NOT NULL REFERENCES tests (id) ON DELETE CASCADE,
  question_id          UUID NOT NULL REFERENCES questions (id),
  user_answer          TEXT NOT NULL,
  is_correct           BOOLEAN NOT NULL,
  time_spent_seconds   INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_answers_test_id     ON test_answers (test_id);
CREATE INDEX IF NOT EXISTS idx_test_answers_question_id ON test_answers (question_id);

-- ─── Flashcards (SRS) ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flashcards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
  next_review_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  interval        INT NOT NULL DEFAULT 1,
  ease_factor     NUMERIC(4, 2) NOT NULL DEFAULT 2.5,
  repetitions     INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_flashcards_user_review ON flashcards (user_id, next_review_at);

-- ─── Wrong Answer Notebook ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wrong_book (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  question_id  UUID NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_wrong_book_user_id ON wrong_book (user_id);

-- ─── AI Jobs ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_jobs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type              TEXT NOT NULL DEFAULT 'generate_questions',
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payload               JSONB NOT NULL DEFAULT '{}',
  last_idempotency_key  TEXT UNIQUE,
  attempts              INT NOT NULL DEFAULT 0,
  result_question_id    UUID REFERENCES questions (id),
  error_message         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_job_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES ai_jobs (id) ON DELETE CASCADE,
  attempt_num   INT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_status     ON ai_jobs (status);
CREATE INDEX IF NOT EXISTS idx_ai_job_attempts_id ON ai_job_attempts (job_id);

-- ─── User Progress ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  topic        TEXT NOT NULL,
  total_seen   INT NOT NULL DEFAULT 0,
  correct      INT NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress (user_id);
