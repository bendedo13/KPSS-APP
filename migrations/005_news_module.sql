-- Part 12: Güncel Bilgi (News & Current Information Module)
CREATE TABLE news (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('mevzuat', 'haberler', 'sınav-takvimi', 'öğrendimi-ipuçları')),
  source VARCHAR(255),
  source_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  important BOOLEAN DEFAULT FALSE,
  views_count INT DEFAULT 0
);

CREATE TABLE user_news_reads (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  news_id INT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, news_id)
);

CREATE TABLE news_bookmarks (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  news_id INT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  bookmarked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, news_id)
);

CREATE INDEX idx_news_category_date ON news(category, published_at DESC);
CREATE INDEX idx_news_important ON news(important) WHERE important = TRUE;
CREATE INDEX idx_user_news_reads_user ON user_news_reads(user_id);
CREATE INDEX idx_news_bookmarks_user ON news_bookmarks(user_id);
