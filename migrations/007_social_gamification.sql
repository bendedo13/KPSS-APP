-- Part 14: Sosyal & Gamification (Leaderboards & Social Sharing)
CREATE TABLE leaderboards (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank INT,
  total_score INT DEFAULT 0,
  tests_completed INT DEFAULT 0,
  avg_accuracy FLOAT DEFAULT 0,
  streak_count INT DEFAULT 0,
  badges_earned INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE leaderboard_periods (
  id SERIAL PRIMARY KEY,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'all-time')),
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank INT,
  score INT,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shared_achievements (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  achievement_data JSONB,
  shared_text VARCHAR(500),
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE achievement_likes (
  id SERIAL PRIMARY KEY,
  achievement_id INT NOT NULL REFERENCES shared_achievements(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(achievement_id, user_id)
);

CREATE TABLE achievement_comments (
  id SERIAL PRIMARY KEY,
  achievement_id INT NOT NULL REFERENCES shared_achievements(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  commented_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE social_follows (
  id SERIAL PRIMARY KEY,
  follower_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, following_id)
);

CREATE INDEX idx_leaderboards_rank ON leaderboards(rank);
CREATE INDEX idx_leaderboards_user ON leaderboards(user_id);
CREATE INDEX idx_leaderboard_periods_type_rank ON leaderboard_periods(period_type, rank);
CREATE INDEX idx_shared_achievements_user ON shared_achievements(user_id);
CREATE INDEX idx_shared_achievements_created ON shared_achievements(created_at DESC);
CREATE INDEX idx_social_follows_follower ON social_follows(follower_id);
CREATE INDEX idx_social_follows_following ON social_follows(following_id);
