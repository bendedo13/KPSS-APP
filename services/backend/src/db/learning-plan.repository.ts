/**
 * Learning Plan Repository
 * Manages daily/weekly/monthly learning plans
 */

import { BaseRepository } from './repository';
import { db } from './index';
import type { PaginationParams, PaginationResult } from '@kpss/shared';

export interface LearningPlan {
  id: string;
  goal_id: string;
  user_id: string;
  plan_type: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  planned_questions_count: number;
  planned_minutes: number;
  completed_questions_count: number;
  completed_minutes: number;
  completion_percent: number;
  status: 'active' | 'skipped' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface CreatePlanInput {
  goal_id: string;
  plan_type: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  planned_questions_count: number;
  planned_minutes: number;
}

export interface UpdatePlanInput {
  planned_questions_count?: number;
  planned_minutes?: number;
  completed_questions_count?: number;
  completed_minutes?: number;
  status?: 'active' | 'skipped' | 'completed';
}

export class LearningPlanRepository extends BaseRepository {
  async create(userId: string, input: CreatePlanInput): Promise<LearningPlan> {
    const result = await db.query<LearningPlan>(
      `INSERT INTO learning_plans 
       (goal_id, user_id, plan_type, start_date, end_date, planned_questions_count, planned_minutes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       RETURNING *`,
      [input.goal_id, userId, input.plan_type, input.start_date, input.end_date, input.planned_questions_count, input.planned_minutes]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create learning plan');
    }

    return result.rows[0];
  }

  async findById(id: string): Promise<LearningPlan | null> {
    const result = await db.query<LearningPlan>(
      'SELECT * FROM learning_plans WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  async findByGoalId(goalId: string, pagination: PaginationParams): Promise<PaginationResult<LearningPlan>> {
    const offset = (pagination.page - 1) * pagination.limit;

    const countResult = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM learning_plans WHERE goal_id = $1',
      [goalId]
    );

    const dataResult = await db.query<LearningPlan>(
      `SELECT * FROM learning_plans WHERE goal_id = $1 ORDER BY start_date DESC LIMIT $2 OFFSET $3`,
      [goalId, pagination.limit, offset]
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

  async findCurrentPlan(
    goalId: string,
    planType: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<LearningPlan | null> {
    const result = await db.query<LearningPlan>(
      `SELECT * FROM learning_plans 
       WHERE goal_id = $1 
       AND plan_type = $2 
       AND start_date <= CURRENT_DATE 
       AND end_date >= CURRENT_DATE
       AND status IN ('active', 'completed')
       ORDER BY start_date DESC
       LIMIT 1`,
      [goalId, planType]
    );

    return result.rows[0] || null;
  }

  async update(id: string, input: UpdatePlanInput): Promise<LearningPlan> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.planned_questions_count !== undefined) {
      updates.push(`planned_questions_count = $${paramCount++}`);
      values.push(input.planned_questions_count);
    }
    if (input.planned_minutes !== undefined) {
      updates.push(`planned_minutes = $${paramCount++}`);
      values.push(input.planned_minutes);
    }
    if (input.completed_questions_count !== undefined) {
      updates.push(`completed_questions_count = $${paramCount++}`);
      values.push(input.completed_questions_count);
    }
    if (input.completed_minutes !== undefined) {
      updates.push(`completed_minutes = $${paramCount++}`);
      values.push(input.completed_minutes);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(input.status);
    }

    // Calculate completion percentage
    updates.push(
      `completion_percent = CASE 
        WHEN planned_questions_count > 0 THEN ROUND((completed_questions_count::NUMERIC / planned_questions_count) * 100)
        ELSE 0 
       END`
    );

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query<LearningPlan>(
      `UPDATE learning_plans SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Learning plan not found');
    }

    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await db.query('DELETE FROM learning_plans WHERE id = $1', [id]);
  }

  // Generate adaptive daily plan based on goal
  async generateAdaptiveDailyPlan(goalId: string, userId: string): Promise<LearningPlan> {
    // Get goal details
    const goalResult = await db.query<{
      target_score: number;
      target_date: string;
      focus_topics: string[];
      daily_goal_minutes: number;
      current_estimated_score: number;
    }>(
      `SELECT target_score, target_date, focus_topics, daily_goal_minutes, current_estimated_score
       FROM learning_goals WHERE id = $1`,
      [goalId]
    );

    if (goalResult.rows.length === 0) {
      throw new Error('Learning goal not found');
    }

    const goal = goalResult.rows[0];
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // Calculate adaptive questions count
    const daysRemaining = Math.max(
      1,
      Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    );
    const scoreGap = Math.max(0, goal.target_score - (goal.current_estimated_score || 0));
    const adaptiveQuestionsCount = Math.min(50, Math.ceil(scoreGap / daysRemaining / 2));

    return this.create(userId, {
      goal_id: goalId,
      plan_type: 'daily',
      start_date: today,
      end_date: tomorrow,
      planned_questions_count: adaptiveQuestionsCount,
      planned_minutes: goal.daily_goal_minutes,
    });
  }

  // Get weekly summary
  async getWeeklySummary(
    goalId: string
  ): Promise<{
    total_planned: number;
    total_completed: number;
    average_completion: number;
    days_completed: number;
  }> {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await db.query<{
      total_planned: number;
      total_completed: number;
      days_completed: number;
    }>(
      `SELECT 
        COALESCE(SUM(planned_questions_count), 0) as total_planned,
        COALESCE(SUM(completed_questions_count), 0) as total_completed,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as days_completed
       FROM learning_plans
       WHERE goal_id = $1 AND start_date >= $2`,
      [goalId, weekAgo]
    );

    const data = result.rows[0] || { total_planned: 0, total_completed: 0, days_completed: 0 };

    return {
      total_planned: data.total_planned,
      total_completed: data.total_completed,
      average_completion: data.total_planned > 0 ? Math.round((data.total_completed / data.total_planned) * 100) : 0,
      days_completed: data.days_completed,
    };
  }
}

export const learningPlanRepository = new LearningPlanRepository();
