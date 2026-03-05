import type { Pool } from 'pg';
import { BaseRepository } from './repository';
import { calculateNextReview } from '@kpss/shared';
import type { Flashcard, FlashcardReviewInput, SrsResult, PaginationParams } from '@kpss/shared';
import { toPaginationOffset } from '@kpss/shared';

interface FlashcardRow {
  id: string;
  user_id: string;
  question_id: string;
  next_review_at: string;
  interval: number;
  ease_factor: number;
  repetitions: number;
  created_at: string;
  updated_at: string;
}

export class FlashcardRepository extends BaseRepository<FlashcardRow> {
  constructor(db: Pool) {
    super(db, 'flashcards');
  }

  /**
   * Get all flashcards for a user that are due for review
   */
  async findDueForUser(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ rows: Flashcard[]; total: number }> {
    const { limit, offset } = toPaginationOffset(pagination);
    const now = new Date().toISOString();

    const [rows, count] = await Promise.all([
      this.db.query<FlashcardRow>(
        `SELECT * FROM flashcards 
         WHERE user_id = $1 AND next_review_at <= $2
         ORDER BY next_review_at ASC
         LIMIT $3 OFFSET $4`,
        [userId, now, limit, offset],
      ),
      this.db.query<{ count: string }>(
        `SELECT COUNT(*)::text FROM flashcards 
         WHERE user_id = $1 AND next_review_at <= $2`,
        [userId, now],
      ),
    ]);

    return {
      rows: rows.rows.map(this.mapToFlashcard),
      total: parseInt(count.rows[0]?.count ?? '0', 10),
    };
  }

  /**
   * Get all flashcards for a user (due or not)
   */
  async findAllForUser(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ rows: Flashcard[]; total: number }> {
    const { limit, offset } = toPaginationOffset(pagination);

    const [rows, count] = await Promise.all([
      this.db.query<FlashcardRow>(
        `SELECT * FROM flashcards 
         WHERE user_id = $1
         ORDER BY next_review_at ASC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      ),
      this.db.query<{ count: string }>(
        `SELECT COUNT(*)::text FROM flashcards WHERE user_id = $1`,
        [userId],
      ),
    ]);

    return {
      rows: rows.rows.map(this.mapToFlashcard),
      total: parseInt(count.rows[0]?.count ?? '0', 10),
    };
  }

  /**
   * Create or get a flashcard for a question
   */
  async createOrGet(userId: string, questionId: string): Promise<Flashcard> {
    const result = await this.db.query<FlashcardRow>(
      `INSERT INTO flashcards (user_id, question_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, question_id) DO UPDATE 
       SET updated_at = NOW()
       RETURNING *`,
      [userId, questionId],
    );
    return this.mapToFlashcard(result.rows[0] as FlashcardRow);
  }

  /**
   * Review a flashcard and update SRS values
   */
  async review(flashcardId: string, quality: 0 | 1 | 2 | 3 | 4 | 5): Promise<SrsResult> {
    // Get current flashcard
    const current = await this.db.query<FlashcardRow>(
      `SELECT * FROM flashcards WHERE id = $1 LIMIT 1`,
      [flashcardId],
    );

    if (current.rows.length === 0) {
      throw new Error('Flashcard not found');
    }

    const card = current.rows[0] as FlashcardRow;

    // Calculate next review using SM-2 algorithm
    const srsResult = calculateNextReview(
      quality,
      card.repetitions,
      card.ease_factor,
      card.interval as 1 | 3 | 7 | 14 | 30,
    );

    // Update flashcard with new SRS values
    await this.db.query(
      `UPDATE flashcards 
       SET interval = $1,
           ease_factor = $2,
           repetitions = $3,
           next_review_at = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [
        srsResult.nextInterval,
        srsResult.nextEaseFactor,
        srsResult.nextRepetitions,
        srsResult.nextReviewAt,
        flashcardId,
      ],
    );

    return srsResult;
  }

  /**
   * Get statistics for a user's flashcards
   */
  async getStats(userId: string): Promise<{
    total: number;
    due: number;
    learning: number;
    mastered: number;
  }> {
    const now = new Date().toISOString();

    const result = await this.db.query<{
      total: string;
      due: string;
      learning: string;
      mastered: string;
    }>(
      `SELECT 
        COUNT(*)::text as total,
        COUNT(*) FILTER (WHERE next_review_at <= $2)::text as due,
        COUNT(*) FILTER (WHERE repetitions < 5)::text as learning,
        COUNT(*) FILTER (WHERE repetitions >= 5)::text as mastered
       FROM flashcards 
       WHERE user_id = $1`,
      [userId, now],
    );

    const stats = result.rows[0];
    return {
      total: parseInt(stats?.total ?? '0', 10),
      due: parseInt(stats?.due ?? '0', 10),
      learning: parseInt(stats?.learning ?? '0', 10),
      mastered: parseInt(stats?.mastered ?? '0', 10),
    };
  }

  /**
   * Map database row to Flashcard type (camelCase conversion)
   */
  private mapToFlashcard(row: FlashcardRow): Flashcard {
    return {
      id: row.id,
      userId: row.user_id,
      questionId: row.question_id,
      nextReviewAt: row.next_review_at,
      interval: row.interval as 1 | 3 | 7 | 14 | 30,
      easeFactor: row.ease_factor,
      repetitions: row.repetitions,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
