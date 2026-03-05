-- Exam Simulation & Advanced Features
-- Run after previous migrations

-- Exam Sessions (Gerçekçi zaman kazılı test seansları)
CREATE TABLE IF NOT EXISTS exam_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  exam_type        TEXT NOT NULL CHECK (exam_type IN ('full_mock', 'section', 'time_trial')),
  total_questions  INT NOT NULL DEFAULT 100,
  duration_seconds INT NOT NULL DEFAULT 10800, -- 3 hours default
  time_started     TIMESTAMPTZ NOT NULL,
  time_ended       TIMESTAMPTZ,
  is_completed     BOOLEAN NOT NULL DEFAULT FALSE,
  score            INT,
  accuracy_percent INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_user_id ON exam_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_created_at ON exam_sessions (created_at);

-- Exam Session Answers (Detaylı cevap verisi)
CREATE TABLE IF NOT EXISTS exam_session_answers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           UUID NOT NULL REFERENCES exam_sessions (id) ON DELETE CASCADE,
  question_id          UUID NOT NULL REFERENCES questions (id),
  user_answer          TEXT,
  is_correct           BOOLEAN,
  time_spent_seconds   INT NOT NULL DEFAULT 0,
  time_limit_exceeded  BOOLEAN NOT NULL DEFAULT FALSE,
  answered_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_session_answers_session_id ON exam_session_answers (session_id);

-- Solution Explanations (Açıklamalı çözüm)
CREATE TABLE IF NOT EXISTS solution_explanations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id      UUID NOT NULL UNIQUE REFERENCES questions (id) ON DELETE CASCADE,
  short_explanation TEXT NOT NULL,
  long_explanation TEXT NOT NULL,
  key_points       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  similar_questions UUID[],
  video_url        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solution_explanations_question_id ON solution_explanations (question_id);

-- Study Streak
CREATE TABLE IF NOT EXISTS study_streaks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  current_streak   INT NOT NULL DEFAULT 0,
  longest_streak   INT NOT NULL DEFAULT 0,
  last_studied_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Badges/Achievements
CREATE TABLE IF NOT EXISTS badges (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_type       TEXT NOT NULL UNIQUE CHECK (badge_type IN (
    'first_test', 'milestone_100', 'milestone_500', 'perfect_score',
    'week_streak_7', 'accuracy_80', 'master_topic', 'speedster'
  )),
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  icon             TEXT NOT NULL,
  requirement      JSONB NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Badges (Kullanıcı kazandığı badge'ler)
CREATE TABLE IF NOT EXISTS user_badges (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  badge_id         UUID NOT NULL REFERENCES badges (id) ON DELETE CASCADE,
  earned_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges (user_id);
