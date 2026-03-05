import { getDb } from './index';

export interface LearningPlan {
  id: number;
  goal_id: number;
  user_id: number;
  planned_questions: number;
  planned_min_accuracy: number;
  daily_study_minutes: number;
  plan_start_date: string;
  plan_end_date: string;
  completed_questions: number;
  actual_accuracy: number | null;
  actual_study_minutes: number | null;
  status: 'pending' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
}

export const LearningPlanRepository = {
  async create(
    goalId: number,
    userId: number,
    plannedQuestions: number,
    plannedMinAccuracy: number,
    dailyStudyMinutes: number,
    planStartDate: string,
    planEndDate: string
  ): Promise<LearningPlan> {
    const db = getDb();
    const result = await db.query(
      `INSERT INTO learning_plans 
       (goal_id, user_id, planned_questions, planned_min_accuracy, daily_study_minutes, plan_start_date, plan_end_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       RETURNING *`,
      [goalId, userId, plannedQuestions, plannedMinAccuracy, dailyStudyMinutes, planStartDate, planEndDate]
    );
    return result.rows[0];
  },

  async findById(id: number): Promise<LearningPlan | null> {
    const db = getDb();
    const result = await db.query('SELECT * FROM learning_plans WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByGoalId(goalId: number): Promise<LearningPlan[]> {
    const db = getDb();
    const result = await db.query(
      'SELECT * FROM learning_plans WHERE goal_id = $1 ORDER BY created_at DESC',
      [goalId]
    );
    return result.rows;
  },

  async findCurrentPlan(goalId: number): Promise<LearningPlan | null> {
    const db = getDb();
    const result = await db.query(
      'SELECT * FROM learning_plans WHERE goal_id = $1 AND status = $2 LIMIT 1',
      [goalId, 'active']
    );
    return result.rows[0] || null;
  },

  async update(id: number, updates: Partial<LearningPlan>): Promise<LearningPlan> {
    const db = getDb();
    const allowedFields = [
      'planned_questions',
      'planned_min_accuracy',
      'daily_study_minutes',
      'plan_start_date',
      'plan_end_date',
      'completed_questions',
      'actual_accuracy',
      'actual_study_minutes',
      'status',
    ];

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (typeof value !== 'undefined') {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(snakeKey)) {
          fields.push(`${snakeKey} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }
    }

    if (fields.length === 0) {
      return (await this.findById(id)) as LearningPlan;
    }

    values.push(id);
    const query = `UPDATE learning_plans SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                   WHERE id = $${paramIndex} RETURNING *`;
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async delete(id: number): Promise<boolean> {
    const db = getDb();
    const result = await db.query('DELETE FROM learning_plans WHERE id = $1', [id]);
    return result.rowCount > 0;
  },

  async getWeeklySummary(goalId: number): Promise<{
    totalPlanned: number;
    totalCompleted: number;
    completionPercent: number;
    daysActive: number;
  }> {
    const db = getDb();
    const result = await db.query(
      `SELECT 
        SUM(planned_questions) as total_planned,
        SUM(completed_questions) as total_completed,
        COUNT(DISTINCT DATE(plan_start_date)) as days_active
       FROM learning_plans
       WHERE goal_id = $1 AND plan_start_date >= CURRENT_DATE - INTERVAL '7 days'`,
      [goalId]
    );

    const row = result.rows[0];
    const totalPlanned = parseInt(row.total_planned) || 0;
    const totalCompleted = parseInt(row.total_completed) || 0;
    const daysActive = parseInt(row.days_active) || 0;

    return {
      totalPlanned,
      totalCompleted,
      completionPercent: totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0,
      daysActive,
    };
  },

  async generateAdaptiveDailyPlan(
    goalId: number,
    userId: number,
    daysRemaining: number,
    scoreGap: number
  ): Promise<LearningPlan> {
    const db = getDb();
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
    
    // Calculate optimal daily questions (increase if score gap is large)
    const baseDailyQuestions = 20;
    const plannedQuestions = Math.min(baseDailyQuestions + Math.floor(scoreGap / 10), 40);

    const result = await db.query(
      `INSERT INTO learning_plans 
       (goal_id, user_id, planned_questions, planned_min_accuracy, daily_study_minutes, plan_start_date, plan_end_date, status)
       VALUES ($1, $2, $3, 70, 90, $4, $5, 'active')
       RETURNING *`,
      [
        goalId,
        userId,
        plannedQuestions,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
      ]
    );
    return result.rows[0];
  },
};
