-- Notifications System
-- Run after previous migrations

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN (
    'weak_topic',           -- Weak topic should be reviewed
    'daily_goal_reminder',  -- Daily study reminder
    'srs_review',          -- SRS due cards
    'test_completed',      -- Test completion summary
    'goal_progress',       -- Goal progress update
    'streak_reminder',     -- Study streak reminder
    'ui_update'            -- Important UI update
  )),
  title            TEXT NOT NULL,
  message          TEXT NOT NULL,
  data             JSONB DEFAULT '{}',
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  action_url       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (user_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at);

-- Notification Preferences (User can opt-in/out)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  weak_topic_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  daily_goal_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  srs_review_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  test_completed_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  goal_progress_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  streak_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  daily_reminder_time   TEXT DEFAULT '08:00', -- HH:MM format
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences (user_id);
