import type { Pool } from 'pg';
import { BaseRepository } from '../db/repository';
import type { Test, TestResult, SubmitTestInput } from '@kpss/shared';

interface TestRow {
  id: string;
  user_id: string;
  topic: string | null;
  score: number | null;
  total_questions: number;
  correct_count: number | null;
  completed_at: string | null;
  created_at: string;
}

export class TestRepository extends BaseRepository<TestRow> {
  constructor(db: Pool) {
    super(db, 'tests');
  }

  async create(userId: string, topic?: string): Promise<TestRow> {
    const result = await this.db.query<TestRow>(
      `INSERT INTO tests (user_id, topic) VALUES ($1, $2) RETURNING *`,
      [userId, topic ?? null],
    );
    return result.rows[0] as TestRow;
  }

  async submit(
    testId: string,
    input: SubmitTestInput,
    questions: Array<{ id: string; correctOption: string }>,
  ): Promise<TestResult> {
    let correctCount = 0;
    const wrongQuestionIds: string[] = [];

    for (const answer of input.answers) {
      const question = questions.find((q) => q.id === answer.questionId);
      const isCorrect = question?.correctOption === answer.answer;
      if (isCorrect) {
        correctCount++;
      } else {
        wrongQuestionIds.push(answer.questionId);
      }

      await this.db.query(
        `INSERT INTO test_answers (test_id, question_id, user_answer, is_correct, time_spent_seconds)
         VALUES ($1, $2, $3, $4, $5)`,
        [testId, answer.questionId, answer.answer, isCorrect, answer.timeSpentSeconds],
      );
    }

    const total = input.answers.length;
    const score = Math.round((correctCount / total) * 100);

    await this.db.query(
      `UPDATE tests SET score = $1, correct_count = $2, total_questions = $3, completed_at = NOW()
       WHERE id = $4`,
      [score, correctCount, total, testId],
    );

    if (wrongQuestionIds.length > 0) {
      const values = wrongQuestionIds
        .map((qId, i) => `($1, $${i + 2})`)
        .join(', ');
      await this.db.query(
        `INSERT INTO wrong_book (user_id, question_id)
         SELECT user_id, unnest($2::uuid[]) FROM tests WHERE id = $1
         ON CONFLICT (user_id, question_id) DO UPDATE SET updated_at = NOW()`,
        [testId, wrongQuestionIds],
      );
    }

    return { testId, score, correctCount, totalQuestions: total, wrongQuestionIds };
  }
}

export type { Test, TestResult };
