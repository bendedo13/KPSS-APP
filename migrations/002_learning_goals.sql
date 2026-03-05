-- Learning Goals & Adaptive Plans
-- Run after 001_init.sql

-- Learning Goals (Hedef puanlar, tarih, konu tercihleri)
CREATE TABLE IF NOT EXISTS learning_goals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_score     INT NOT NULL CHECK (target_score >= 0 AND target_score <= 120),
  target_date      DATE NOT NULL,
  focus_topics     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  difficulty_preference TEXT NOT NULL DEFAULT 'mixed' 
    CHECK (difficulty_preference IN ('easy', 'medium', 'hard', 'mixed')),
  daily_goal_minutes INT NOT NULL DEFAULT 60,
  status           TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  current_estimated_score INT DEFAULT 0,
  current_progress_percent INT DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_goals_user_id ON learning_goals (user_id);
CREATE INDEX IF NOT EXISTS idx_learning_goals_status ON learning_goals (status);

-- Learning Plans (Haftalık/günlük çalışma planları)
CREATE TABLE IF NOT EXISTS learning_plans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id          UUID NOT NULL REFERENCES learning_goals (id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  plan_type        TEXT NOT NULL CHECK (plan_type IN ('daily', 'weekly', 'monthly')),
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  planned_questions_count INT NOT NULL DEFAULT 0,
  planned_minutes  INT NOT NULL DEFAULT 0,
  completed_questions_count INT DEFAULT 0,
  completed_minutes INT DEFAULT 0,
  completion_percent INT DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'skipped', 'completed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_plans_goal_id ON learning_plans (goal_id);
CREATE INDEX IF NOT EXISTS idx_learning_plans_user_id ON learning_plans (user_id);
CREATE INDEX IF NOT EXISTS idx_learning_plans_dates ON learning_plans (start_date, end_date);

-- Goal Progress Tracking (Her konu için ilerleme)
CREATE TABLE IF NOT EXISTS goal_progress (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id          UUID NOT NULL REFERENCES learning_goals (id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  topic            TEXT NOT NULL,
  total_attempted  INT NOT NULL DEFAULT 0,
  total_correct    INT NOT NULL DEFAULT 0,
  accuracy_percent INT DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (goal_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON goal_progress (goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_user_id ON goal_progress (user_id);

-- Difficulty Prediction (Soru zorluğu tahmini - ML hazırlığı)
CREATE TABLE IF NOT EXISTS difficulty_predictions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  question_id      UUID NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
  predicted_difficulty TEXT NOT NULL CHECK (predicted_difficulty IN ('easy', 'medium', 'hard')),
  confidence_score NUMERIC(3, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  actual_difficulty TEXT,
  was_correct      BOOLEAN,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_difficulty_predictions_user_id ON difficulty_predictions (user_id);
CREATE INDEX IF NOT EXISTS idx_difficulty_predictions_question_id ON difficulty_predictions (question_id);
