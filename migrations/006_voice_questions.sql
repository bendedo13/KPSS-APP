-- Part 13: Konuşmalı Soru (Voice Questions - Optional Feature)
CREATE TABLE voice_questions (
  id SERIAL PRIMARY KEY,
  test_id INT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  voice_prompt_url VARCHAR(500) NOT NULL,
  voice_prompt_duration_seconds INT,
  voice_prompt_language VARCHAR(10) DEFAULT 'tr',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_voice_answers (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  voice_question_id INT NOT NULL REFERENCES voice_questions(id) ON DELETE CASCADE,
  voice_answer_url VARCHAR(500),
  answer_text VARCHAR(500),
  recognized_text TEXT,
  accuracy_percent INT,
  duration_seconds INT,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE voice_transcriptions (
  id SERIAL PRIMARY KEY,
  voice_answer_id INT NOT NULL REFERENCES user_voice_answers(id) ON DELETE CASCADE,
  original_text TEXT,
  transcribed_text TEXT,
  confidence_score FLOAT,
  language VARCHAR(10) DEFAULT 'tr',
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_voice_questions_test ON voice_questions(test_id);
CREATE INDEX idx_voice_questions_question ON voice_questions(question_id);
CREATE INDEX idx_user_voice_answers_user ON user_voice_answers(user_id);
CREATE INDEX idx_voice_transcriptions_answer ON voice_transcriptions(voice_answer_id);
