import type { Pool } from 'pg';
import { BaseRepository } from './repository';
import type { PaginationParams } from '@kpss/shared';
import { toPaginationOffset } from '@kpss/shared';

export interface WrongBookEntry {
  id: string;
  userId: string;
  questionId: string;
  createdAt: string;
  updatedAt: string;
}

interface WrongBookRow {
  id: string;
  user_id: string;
  question_id: string;
  created_at: string;
  updated_at: string;
}

export interface WrongBookWithQuestion extends WrongBookEntry {
  question: {
    id: string;
    text: string;
    topic: string;
    subtopic: string;
    difficulty: string;
    options: unknown;
    correctOption: string;
    explanation: string;
  };
}

export class WrongBookRepository extends BaseRepository<WrongBookRow> {
  constructor(db: Pool) {
    super(db, 'wrong_book');
  }

  /**
   * Get all wrong book entries for a user
   */
  async findAllForUser(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ rows: WrongBookEntry[]; total: number }> {
    const { limit, offset } = toPaginationOffset(pagination);

    const [rows, count] = await Promise.all([
      this.db.query<WrongBookRow>(
        `SELECT * FROM wrong_book 
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      ),
      this.db.query<{ count: string }>(
        `SELECT COUNT(*)::text FROM wrong_book WHERE user_id = $1`,
        [userId],
      ),
    ]);

    return {
      rows: rows.rows.map(this.mapToWrongBookEntry),
      total: parseInt(count.rows[0]?.count ?? '0', 10),
    };
  }

  /**
   * Get wrong book entries with full question details
   */
  async findAllWithQuestionsForUser(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ rows: WrongBookWithQuestion[]; total: number }> {
    const { limit, offset } = toPaginationOffset(pagination);

    const [rows, count] = await Promise.all([
      this.db.query<WrongBookRow & {
        question_text: string;
        question_topic: string;
        question_subtopic: string;
        question_difficulty: string;
        question_options: unknown;
        question_correct_option: string;
        question_explanation: string;
      }>(
        `SELECT 
          wb.*,
          q.text as question_text,
          q.topic as question_topic,
          q.subtopic as question_subtopic,
          q.difficulty as question_difficulty,
          q.options as question_options,
          q.correct_option as question_correct_option,
          q.explanation as question_explanation
         FROM wrong_book wb
         JOIN questions q ON wb.question_id = q.id
         WHERE wb.user_id = $1
         ORDER BY wb.updated_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      ),
      this.db.query<{ count: string }>(
        `SELECT COUNT(*)::text FROM wrong_book WHERE user_id = $1`,
        [userId],
      ),
    ]);

    return {
      rows: rows.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        questionId: row.question_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        question: {
          id: row.question_id,
          text: row.question_text,
          topic: row.question_topic,
          subtopic: row.question_subtopic,
          difficulty: row.question_difficulty,
          options: row.question_options,
          correctOption: row.question_correct_option,
          explanation: row.question_explanation,
        },
      })),
      total: parseInt(count.rows[0]?.count ?? '0', 10),
    };
  }

  /**
   * Add a question to wrong book (or update if exists)
   */
  async addOrUpdate(userId: string, questionId: string): Promise<WrongBookEntry> {
    const result = await this.db.query<WrongBookRow>(
      `INSERT INTO wrong_book (user_id, question_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, question_id) 
       DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [userId, questionId],
    );
    return this.mapToWrongBookEntry(result.rows[0] as WrongBookRow);
  }

  /**
   * Remove a question from wrong book
   */
  async removeByUserAndQuestion(userId: string, questionId: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM wrong_book WHERE user_id = $1 AND question_id = $2`,
      [userId, questionId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get statistics for user's wrong book
   */
  async getStats(userId: string): Promise<{
    total: number;
    byTopic: Array<{ topic: string; count: number }>;
    byDifficulty: Array<{ difficulty: string; count: number }>;
  }> {
    const [totalResult, topicResult, difficultyResult] = await Promise.all([
      this.db.query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM wrong_book WHERE user_id = $1`,
        [userId],
      ),
      this.db.query<{ topic: string; count: string }>(
        `SELECT q.topic, COUNT(*)::text as count
         FROM wrong_book wb
         JOIN questions q ON wb.question_id = q.id
         WHERE wb.user_id = $1
         GROUP BY q.topic
         ORDER BY count DESC`,
        [userId],
      ),
      this.db.query<{ difficulty: string; count: string }>(
        `SELECT q.difficulty, COUNT(*)::text as count
         FROM wrong_book wb
         JOIN questions q ON wb.question_id = q.id
         WHERE wb.user_id = $1
         GROUP BY q.difficulty
         ORDER BY count DESC`,
        [userId],
      ),
    ]);

    return {
      total: parseInt(totalResult.rows[0]?.count ?? '0', 10),
      byTopic: topicResult.rows.map((r) => ({
        topic: r.topic,
        count: parseInt(r.count, 10),
      })),
      byDifficulty: difficultyResult.rows.map((r) => ({
        difficulty: r.difficulty,
        count: parseInt(r.count, 10),
      })),
    };
  }

  /**
   * Map database row to WrongBookEntry (camelCase conversion)
   */
  private mapToWrongBookEntry(row: WrongBookRow): WrongBookEntry {
    return {
      id: row.id,
      userId: row.user_id,
      questionId: row.question_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
