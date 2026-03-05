import { getDb } from './index';

export interface LearningGoal {
  id: number;
  user_id: number;
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

export const LearningGoalRepository = {
  async create(
    userId: number,
    targetScore: number,
    targetDate: string,
    focusTopics: string[],
    difficultyPreference: string = 'mixed',
    dailyGoalMinutes: number = 60
  ): Promise<LearningGoal> {
    const db = getDb();
    const result = await db.query(
      `INSERT INTO learning_goals 
       (user_id, target_score, target_date, focus_topics, difficulty_preference, daily_goal_minutes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING *`,
      [userId, targetScore, targetDate, JSON.stringify(focusTopics), difficultyPreference, dailyGoalMinutes]
    );
    return result.rows[0];
  },

  async findByUserId(userId: number): Promise<LearningGoal[]> {
    const db = getDb();
    const result = await db.query(
      'SELECT * FROM learning_goals WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  },

  async findById(id: number): Promise<LearningGoal | null> {
    const db = getDb();
    const result = await db.query('SELECT * FROM learning_goals WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findActive(userId: number): Promise<LearningGoal | null> {
    const db = getDb();
    const result = await db.query(
      'SELECT * FROM learning_goals WHERE user_id = $1 AND status = $2 LIMIT 1',
      [userId, 'active']
    );
    return result.rows[0] || null;
  },

  async update(id: number, updates: Partial<LearningGoal>): Promise<LearningGoal> {
    const db = getDb();
    const allowedFields = [
      'target_score',
      'target_date',
      'focus_topics',
      'difficulty_preference',
      'daily_goal_minutes',
      'status',
      'current_estimated_score',
      'current_progress_percent',
    ];

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const entries = Object.entries(updates);
    for (const [key, value] of entries) {
      if (typeof value !== 'undefined') {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(snakeKey)) {
          fields.push(`${snakeKey} = $${paramIndex}`);
          values.push(snakeKey === 'focus_topics' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      }
    }

    if (fields.length === 0) {
      return (await this.findById(id)) as LearningGoal;
    }

    values.push(id);
    const query = `UPDATE learning_goals SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                   WHERE id = $${paramIndex} RETURNING *`;
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async delete(id: number): Promise<boolean> {
    const db = getDb();
    const result = await db.query('DELETE FROM learning_goals WHERE id = $1', [id]);
    return result.rowCount > 0;
  },

  async updateEstimatedScore(id: number, score: number, percentageComplete: number): Promise<LearningGoal> {
    const db = getDb();
    const result = await db.query(
      `UPDATE learning_goals 
       SET current_estimated_score = $1, current_progress_percent = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [score, percentageComplete, id]
    );
    return result.rows[0];
  },

  async findByStatus(userId: number, status: string): Promise<LearningGoal[]> {
    const db = getDb();
    const result = await db.query(
      'SELECT * FROM learning_goals WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC',
      [userId, status]
    );
    return result.rows;
  },
};
