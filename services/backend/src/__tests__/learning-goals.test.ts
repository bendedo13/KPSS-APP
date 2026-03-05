import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getDb } from '../db';

describe('Learning Goals & Plans', () => {
  const db = getDb();

  beforeEach(async () => {
    // Setup: Create test user
    await db.query('DELETE FROM learning_goals WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [
      'test-goals@example.com',
    ]);
    await db.query('DELETE FROM users WHERE email = $1', ['test-goals@example.com']);

    await db.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)`,
      ['test-goals@example.com', 'hash', 'Test Goals']
    );
  });

  afterEach(async () => {
    // Cleanup
    await db.query('DELETE FROM learning_goals WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [
      'test-goals@example.com',
    ]);
    await db.query('DELETE FROM users WHERE email = $1', ['test-goals@example.com']);
  });

  describe('Learning Goals', () => {
    it('should create a learning goal', async () => {
      const userResult = await db.query('SELECT id FROM users WHERE email = $1', ['test-goals@example.com']);
      const userId = userResult.rows[0].id;

      const result = await db.query(
        `INSERT INTO learning_goals 
         (user_id, target_score, target_date, focus_topics, difficulty_preference, daily_goal_minutes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, 100, '2026-12-31', ['Türk Dili', 'Tarih'], 'mixed', 60]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].target_score).toBe(100);
      expect(result.rows[0].target_date).toBe('2026-12-31');
      expect(result.rows[0].status).toBe('active');
    });

    it('should calculate estimated score', async () => {
      const userResult = await db.query('SELECT id FROM users WHERE email = $1', ['test-goals@example.com']);
      const userId = userResult.rows[0].id;

      // Create goal
      const goalResult = await db.query(
        `INSERT INTO learning_goals 
         (user_id, target_score, target_date, focus_topics)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [userId, 100, '2026-12-31', ['Türk Dili']]
      );
      const goalId = goalResult.rows[0].id;

      // Add progress data
      await db.query(
        `INSERT INTO goal_progress (goal_id, user_id, topic, total_attempted, total_correct)
         VALUES ($1, $2, $3, $4, $5)`,
        [goalId, userId, 'Türk Dili', 50, 40]
      );

      // Calculate
      const progressResult = await db.query<{ total_attempted: number; total_correct: number }>(
        `SELECT 
          COALESCE(SUM(total_attempted), 0) as total_attempted,
          COALESCE(SUM(total_correct), 0) as total_correct
         FROM goal_progress WHERE goal_id = $1`,
        [goalId]
      );

      const { total_attempted, total_correct } = progressResult.rows[0];
      expect(total_attempted).toBe(50);
      expect(total_correct).toBe(40);

      // Estimated score = (40/50) * 100 = 80
      const estimatedScore = (total_correct / total_attempted) * 100;
      expect(estimatedScore).toBe(80);
    });
  });

  describe('Learning Plans', () => {
    it('should create a learning plan', async () => {
      const userResult = await db.query('SELECT id FROM users WHERE email = $1', ['test-goals@example.com']);
      const userId = userResult.rows[0].id;

      // Create goal first
      const goalResult = await db.query(
        `INSERT INTO learning_goals (user_id, target_score, target_date, focus_topics)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [userId, 100, '2026-12-31', ['Türk Dili']]
      );
      const goalId = goalResult.rows[0].id;

      // Create plan
      const planResult = await db.query(
        `INSERT INTO learning_plans 
         (goal_id, user_id, plan_type, start_date, end_date, planned_questions_count, planned_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [goalId, userId, 'daily', '2026-03-06', '2026-03-07', 30, 60]
      );

      expect(planResult.rows).toHaveLength(1);
      expect(planResult.rows[0].plan_type).toBe('daily');
      expect(planResult.rows[0].planned_questions_count).toBe(30);
    });

    it('should calculate plan completion percentage', async () => {
      const userResult = await db.query('SELECT id FROM users WHERE email = $1', ['test-goals@example.com']);
      const userId = userResult.rows[0].id;

      const goalResult = await db.query(
        `INSERT INTO learning_goals (user_id, target_score, target_date, focus_topics)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [userId, 100, '2026-12-31', ['Türk Dili']]
      );
      const goalId = goalResult.rows[0].id;

      const planResult = await db.query(
        `INSERT INTO learning_plans 
         (goal_id, user_id, plan_type, start_date, end_date, planned_questions_count, planned_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [goalId, userId, 'daily', '2026-03-06', '2026-03-07', 30, 60]
      );
      const planId = planResult.rows[0].id;

      // Complete 20 out of 30 questions
      const updateResult = await db.query(
        `UPDATE learning_plans 
         SET completed_questions_count = $1,
             completion_percent = ROUND(($1::NUMERIC / planned_questions_count) * 100)
         WHERE id = $2
         RETURNING completion_percent`,
        [20, planId]
      );

      expect(updateResult.rows[0].completion_percent).toBe(67);
    });

    it('should find current plan within date range', async () => {
      const userResult = await db.query('SELECT id FROM users WHERE email = $1', ['test-goals@example.com']);
      const userId = userResult.rows[0].id;

      const goalResult = await db.query(
        `INSERT INTO learning_goals (user_id, target_score, target_date, focus_topics)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [userId, 100, '2026-12-31', ['Türk Dili']]
      );
      const goalId = goalResult.rows[0].id;

      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      // Create today's plan
      await db.query(
        `INSERT INTO learning_plans 
         (goal_id, user_id, plan_type, start_date, end_date, planned_questions_count, planned_minutes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')`,
        [goalId, userId, 'daily', today, tomorrow, 30, 60]
      );

      // Find current plan
      const foundPlan = await db.query<{ plan_type: string }>(
        `SELECT * FROM learning_plans 
         WHERE goal_id = $1 
         AND plan_type = 'daily'
         AND start_date <= CURRENT_DATE 
         AND end_date >= CURRENT_DATE
         AND status IN ('active', 'completed')
         LIMIT 1`,
        [goalId]
      );

      expect(foundPlan.rows).toHaveLength(1);
      expect(foundPlan.rows[0].plan_type).toBe('daily');
    });
  });
});
