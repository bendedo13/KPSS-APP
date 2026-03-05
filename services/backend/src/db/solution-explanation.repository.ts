/**
 * Solution Explanations Repository
 * Detailed answers with explanations and mini-lessons
 */

import { getDb } from './index';

export interface SolutionExplanation {
  id: string;
  question_id: string;
  short_explanation: string;
  long_explanation: string;
  key_points: string[];
  similar_questions: string[];
  video_url: string | null;
}

export const SolutionExplanationRepository = {
  async findByQuestionId(questionId: string): Promise<SolutionExplanation | null> {
    const db = getDb();
    const result = await db.query<SolutionExplanation>(
      'SELECT * FROM solution_explanations WHERE question_id = $1',
      [questionId]
    );
    return result.rows[0] || null;
  },

  async create(questionId: string, data: Omit<SolutionExplanation, 'id' | 'question_id'>): Promise<SolutionExplanation> {
    const db = getDb();
    const result = await db.query<SolutionExplanation>(
      `INSERT INTO solution_explanations (question_id, short_explanation, long_explanation, key_points, video_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [questionId, data.short_explanation, data.long_explanation, data.key_points, data.video_url || null]
    );
    return result.rows[0];
  },

  async getSimilarQuestions(questionId: string, topic: string, limit: number = 3): Promise<any[]> {
    const db = getDb();
    const result = await db.query(
      `SELECT id, text, difficulty FROM questions 
       WHERE topic = $1 AND id != $2 AND status = 'approved'
       ORDER BY difficulty ASC
       LIMIT $3`,
      [topic, questionId, limit]
    );
    return result.rows;
  },
};
