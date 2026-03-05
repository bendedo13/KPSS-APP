import type { Pool } from 'pg';
import { BaseRepository } from '../db/repository';
import type { Question, CreateQuestionInput } from '@kpss/shared';

export class QuestionRepository extends BaseRepository<Question> {
  constructor(db: Pool) {
    super(db, 'questions');
  }

  async create(input: CreateQuestionInput): Promise<Question> {
    const result = await this.db.query<Question>(
      `INSERT INTO questions
         (text, options, correct_option, difficulty, topic, subtopic,
          estimated_time_seconds, explanation, source, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        input.text,
        JSON.stringify(input.options),
        input.correctOption,
        input.difficulty,
        input.topic,
        input.subtopic,
        input.estimatedTimeSeconds,
        input.explanation,
        input.source,
        input.status,
      ],
    );
    return result.rows[0] as Question;
  }

  async findByTopic(
    topic: string,
    limit = 10,
  ): Promise<Question[]> {
    const result = await this.db.query<Question>(
      `SELECT * FROM questions
       WHERE topic = $1 AND status = 'approved'
       ORDER BY RANDOM()
       LIMIT $2`,
      [topic, limit],
    );
    return result.rows;
  }
}
