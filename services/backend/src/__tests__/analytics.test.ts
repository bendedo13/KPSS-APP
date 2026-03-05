import { getDb } from '../db';

describe('Analytics', () => {
  const db = getDb();

  beforeEach(async () => {
    // Setup: Create test user and data
    await db.query('DELETE FROM test_answers WHERE test_id IN (SELECT id FROM tests WHERE user_id IN (SELECT id FROM users WHERE email = $1))', [
      'test-analytics@example.com',
    ]);
    await db.query('DELETE FROM tests WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [
      'test-analytics@example.com',
    ]);
    await db.query('DELETE FROM users WHERE email = $1', ['test-analytics@example.com']);

    // Create test user
    await db.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)`,
      ['test-analytics@example.com', 'hash', 'Test Analytics']
    );

    // Get user ID
    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [
      'test-analytics@example.com',
    ]);
    const userId = userResult.rows[0].id;

    // Create questions
    const qResult = await db.query<{ id: string }>(
      `INSERT INTO questions (text, options, correct_option, difficulty, topic, subtopic, explanation, source, status)
       VALUES 
         ('Q1', '["a","b","c"]', 'a', 'easy', 'Türk Dili', 'Gramer', 'Explanation', 'manual', 'approved'),
         ('Q2', '["a","b","c"]', 'b', 'medium', 'Tarih', 'Osmanlı', 'Explanation', 'manual', 'approved'),
         ('Q3', '["a","b","c"]', 'c', 'hard', 'Türk Dili', 'Edebiyat', 'Explanation', 'manual', 'approved')
       RETURNING id`,
      []
    );

    const questionIds = qResult.rows.map((row: { id: string }) => row.id);

    // Create test
    const testResult = await db.query<{ id: string }>(
      `INSERT INTO tests (user_id, topic, score, total_questions, correct_count, completed_at)
       VALUES ($1, 'Türk Dili', 50, 3, 2, NOW())
       RETURNING id`,
      [userId]
    );

    const testId = testResult.rows[0].id;

    // Create test answers
    await db.query(
      `INSERT INTO test_answers (test_id, question_id, user_answer, is_correct, time_spent_seconds)
       VALUES 
         ($1, $2, 'a', true, 45),
         ($1, $3, 'b', true, 60),
         ($1, $4, 'd', false, 90)`,
      [testId, questionIds[0], questionIds[1], questionIds[2]]
    );
  });

  afterEach(async () => {
    // Cleanup
    await db.query('DELETE FROM test_answers WHERE test_id IN (SELECT id FROM tests WHERE user_id IN (SELECT id FROM users WHERE email = $1))', [
      'test-analytics@example.com',
    ]);
    await db.query('DELETE FROM tests WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [
      'test-analytics@example.com',
    ]);
    await db.query(
      'DELETE FROM questions WHERE topic IN ($1, $2)',
      ['Türk Dili', 'Tarih']
    );
    await db.query('DELETE FROM users WHERE email = $1', ['test-analytics@example.com']);
  });

  describe('Topic Heatmap', () => {
    it('should calculate topic accuracy', async () => {
      const userResult = await db.query(
        'SELECT id FROM users WHERE email = $1',
        ['test-analytics@example.com']
      );
      const userId = userResult.rows[0].id;

      const result = await db.query<{ topic: string; accuracy_percent: number; error_count: number }>(
        `SELECT
          q.topic,
          ROUND(SUM(CASE WHEN ta.is_correct THEN 1 ELSE 0 END)::NUMERIC / COUNT(ta.id) * 100) as accuracy_percent,
          SUM(CASE WHEN NOT ta.is_correct THEN 1 ELSE 0 END) as error_count
         FROM test_answers ta
         JOIN questions q ON ta.question_id = q.id
         JOIN tests t ON ta.test_id = t.id
         WHERE t.user_id = $1
         GROUP BY q.topic`,
        [userId]
      );

      expect(result.rows.length).toBeGreaterThan(0);
      result.rows.forEach((row: any) => {
        expect(row.accuracy_percent).toBeGreaterThanOrEqual(0);
        expect(row.accuracy_percent).toBeLessThanOrEqual(100);
      });
    });

    it('should identify weak topics (low accuracy)', async () => {
      const userResult = await db.query(
        'SELECT id FROM users WHERE email = $1',
        ['test-analytics@example.com']
      );
      const userId = userResult.rows[0].id;

      const result = await db.query<{ topic: string; accuracy_percent: number }>(
        `SELECT
          q.topic,
          ROUND(SUM(CASE WHEN ta.is_correct THEN 1 ELSE 0 END)::NUMERIC / COUNT(ta.id) * 100) as accuracy_percent
         FROM test_answers ta
         JOIN questions q ON ta.question_id = q.id
         JOIN tests t ON ta.test_id = t.id
         WHERE t.user_id = $1
         GROUP BY q.topic
         HAVING COUNT(ta.id) >= 1
         ORDER BY accuracy_percent ASC`,
        [userId]
      );

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Time Management Analysis', () => {
    it('should calculate average time per question', async () => {
      const userResult = await db.query(
        'SELECT id FROM users WHERE email = $1',
        ['test-analytics@example.com']
      );
      const userId = userResult.rows[0].id;

      const result = await db.query<{ avg_time: number; total_questions: number }>(
        `SELECT
          ROUND(AVG(ta.time_spent_seconds)) as avg_time,
          COUNT(ta.id) as total_questions
         FROM test_answers ta
         JOIN tests t ON ta.test_id = t.id
         WHERE t.user_id = $1`,
        [userId]
      );

      expect(result.rows[0].total_questions).toBe(3);
      expect(result.rows[0].avg_time).toBeGreaterThan(0);
    });

    it('should count questions answered under/over time', async () => {
      const userResult = await db.query(
        'SELECT id FROM users WHERE email = $1',
        ['test-analytics@example.com']
      );
      const userId = userResult.rows[0].id;

      const result = await db.query<{ under_time: number; over_time: number }>(
        `SELECT
          COUNT(CASE WHEN ta.time_spent_seconds <= q.estimated_time_seconds THEN 1 END) as under_time,
          COUNT(CASE WHEN ta.time_spent_seconds > q.estimated_time_seconds THEN 1 END) as over_time
         FROM test_answers ta
         JOIN questions q ON ta.question_id = q.id
         JOIN tests t ON ta.test_id = t.id
         WHERE t.user_id = $1`,
        [userId]
      );

      expect(result.rows[0].under_time + result.rows[0].over_time).toBe(3);
    });
  });

  describe('Difficulty Breakdown', () => {
    it('should analyze performance by difficulty', async () => {
      const userResult = await db.query(
        'SELECT id FROM users WHERE email = $1',
        ['test-analytics@example.com']
      );
      const userId = userResult.rows[0].id;

      const result = await db.query<{ difficulty: string; accuracy_percent: number }>(
        `SELECT
          q.difficulty,
          ROUND(SUM(CASE WHEN ta.is_correct THEN 1 ELSE 0 END)::NUMERIC / COUNT(ta.id) * 100) as accuracy_percent
         FROM test_answers ta
         JOIN questions q ON ta.question_id = q.id
         JOIN tests t ON ta.test_id = t.id
         WHERE t.user_id = $1
         GROUP BY q.difficulty`,
        [userId]
      );

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });
});
