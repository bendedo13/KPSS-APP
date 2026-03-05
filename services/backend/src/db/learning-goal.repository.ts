/**
 * Learning Goal Repository
 * Manages user learning goals, target scores, and progress tracking
 */

import { BaseRepository } from './repository';
import { db } from './index';
import type { PaginationParams, PaginationResult } from '@kpss/shared';

export interface LearningGoal {
  id: string;
  user_id: string;
  target_score: number;
  target_date: string;
  focus_topics: string[];
  difficulty_preference: 'easy' | 'medium' | 'hard' | 'mixed';
  daily_goal_minutes: number;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  current_estimated_score: number | null;
  current_progress_percent: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalInput {
  target_score: number;
  target_date: string;
  focus_topics: string[];
  difficulty_preference?: 'easy' | 'medium' | 'hard' | 'mixed';
  daily_goal_minutes?: number;
}

export interface UpdateGoalInput {
  target_score?: number;
  target_date?: string;
  focus_topics?: string[];
  difficulty_preference?: 'easy' | 'medium' | 'hard' | 'mixed';
  daily_goal_minutes?: number;
  status?: 'active' | 'paused' | 'completed' | 'abandoned';
  current_estimated_score?: number;
  current_progress_percent?: number;
}

export class LearningGoalRepository extends BaseRepository {
  async create(userId: string, input: CreateGoalInput): Promise<LearningGoal> {
    const result = await db.query<LearningGoal>(
      `INSERT INTO learning_goals 
       (user_id, target_score, target_date, focus_topics, difficulty_preference, daily_goal_minutes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING *`,
      [
        userId,
        input.target_score,
        input.target_date,
        input.focus_topics,
        input.difficulty_preference || 'mixed',
        input.daily_goal_minutes || 60,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create learning goal');
    }

    return result.rows[0];
  }

  async findByUserId(userId: string): Promise<LearningGoal | null> {
    const result = await db.query<LearningGoal>(
      'SELECT * FROM learning_goals WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );

    return result.rows[0] || null;
  }

  async findById(id: string): Promise<LearningGoal | null> {
    const result = await db.query<LearningGoal>(
      'SELECT * FROM learning_goals WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  async update(id: string, input: UpdateGoalInput): Promise<LearningGoal> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.target_score !== undefined) {
      updates.push(`target_score = $${paramCount++}`);
      values.push(input.target_score);
    }
    if (input.target_date !== undefined) {
      updates.push(`target_date = $${paramCount++}`);
      values.push(input.target_date);
    }
    if (input.focus_topics !== undefined) {
      updates.push(`focus_topics = $${paramCount++}`);
      values.push(input.focus_topics);
    }
    if (input.difficulty_preference !== undefined) {
      updates.push(`difficulty_preference = $${paramCount++}`);
      values.push(input.difficulty_preference);
    }
    if (input.daily_goal_minutes !== undefined) {
      updates.push(`daily_goal_minutes = $${paramCount++}`);
      values.push(input.daily_goal_minutes);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(input.status);
    }
    if (input.current_estimated_score !== undefined) {
      updates.push(`current_estimated_score = $${paramCount++}`);
      values.push(input.current_estimated_score);
    }
    if (input.current_progress_percent !== undefined) {
      updates.push(`current_progress_percent = $${paramCount++}`);
      values.push(input.current_progress_percent);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query<LearningGoal>(
      `UPDATE learning_goals SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Learning goal not found');
    }

    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await db.query('DELETE FROM learning_goals WHERE id = $1', [id]);
  }

  // Helper: Calculate estimated score based on performance
  async updateEstimatedScore(userId: string): Promise<{ estimated_score: number; progress_percent: number }> {
    const result = await db.query<{ estimated_score: number; total_attempts: number; correct_count: number }>(
      `SELECT 
        COALESCE(SUM(accuracy_percent * 0.01 * 120), 0)::INT as estimated_score,
        COALESCE(SUM(total_attempted), 0) as total_attempts,
        COALESCE(SUM(total_correct), 0) as correct_count
       FROM goal_progress
       WHERE user_id = $1`,
      [userId]
    );

    const estimatedScore = result.rows[0]?.estimated_score || 0;
    const totalAttempts = result.rows[0]?.total_attempts || 0;

    // Get goal details
    const goalResult = await db.query<{ id: string; target_score: number }>(
      'SELECT id, target_score FROM learning_goals WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    if (goalResult.rows.length === 0) return { estimated_score: estimatedScore, progress_percent: 0 };

    const goal = goalResult.rows[0];
    const progressPercent = goal.target_score > 0 ? Math.round((estimatedScore / goal.target_score) * 100) : 0;

    // Update learning goal
    await db.query(
      'UPDATE learning_goals SET current_estimated_score = $1, current_progress_percent = $2 WHERE id = $3',
      [estimatedScore, progressPercent, goal.id]
    );

    return { estimated_score: estimatedScore, progress_percent: progressPercent };
  }

  // Get all goals with status filter
  async findByStatus(status: string, pagination: PaginationParams): Promise<PaginationResult<LearningGoal>> {
    const offset = (pagination.page - 1) * pagination.limit;

    const countResult = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM learning_goals WHERE status = $1',
      [status]
    );

    const dataResult = await db.query<LearningGoal>(
      `SELECT * FROM learning_goals WHERE status = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
      [status, pagination.limit, offset]
    );

    return {
      data: dataResult.rows,
      pagination: {
        total: countResult.rows[0]?.count || 0,
        page: pagination.page,
        limit: pagination.limit,
        pages: Math.ceil((countResult.rows[0]?.count || 0) / pagination.limit),
      },
    };
  }
}

export const learningGoalRepository = new LearningGoalRepository();
