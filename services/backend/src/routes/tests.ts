import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../server';

const createTestSchema = z.object({
  topic_id: z.string().uuid().optional(),
  question_count: z.number().int().min(1).max(50).default(10),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).default('mixed'),
});

const submitTestSchema = z.object({
  answers: z.array(
    z.object({
      question_id: z.string().uuid(),
      selected_option: z.string().length(1),
    }),
  ),
});

export async function testsRoutes(app: FastifyInstance) {
  // Authentication hook
  app.addHook('onRequest', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // POST /tests/create
  app.post('/create', async (req, reply) => {
    const body = createTestSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid input', details: body.error.issues });
    }

    const { topic_id, question_count, difficulty } = body.data;
    const user = req.user as { sub: string };

    let questionQuery: string;
    let queryParams: (string | number)[];

    if (difficulty === 'mixed') {
      questionQuery = `
        SELECT id, text, options, correct_option, difficulty, topic_id, estimated_time_seconds
        FROM questions
        WHERE status = 'published'
          AND ($1::uuid IS NULL OR topic_id = $1)
        ORDER BY RANDOM()
        LIMIT $2
      `;
      queryParams = [topic_id ?? null, question_count];
    } else {
      questionQuery = `
        SELECT id, text, options, correct_option, difficulty, topic_id, estimated_time_seconds
        FROM questions
        WHERE status = 'published'
          AND difficulty = $1
          AND ($2::uuid IS NULL OR topic_id = $2)
        ORDER BY RANDOM()
        LIMIT $3
      `;
      queryParams = [difficulty, topic_id ?? null, question_count];
    }

    const questionsResult = await db.query(questionQuery, queryParams);

    if (questionsResult.rows.length === 0) {
      return reply.status(404).send({ error: 'No questions available for the given criteria' });
    }

    // Create test record
    const testResult = await db.query(
      `INSERT INTO tests (user_id, status, total_questions, created_at)
       VALUES ($1, 'in_progress', $2, NOW())
       RETURNING id`,
      [user.sub, questionsResult.rows.length],
    );

    const testId = testResult.rows[0].id;

    // Strip correct answers from response
    const questions = questionsResult.rows.map(({ correct_option: _co, ...q }) => q);

    return reply.status(201).send({ test_id: testId, questions });
  });

  // POST /tests/:id/submit
  app.post('/:id/submit', async (req, reply) => {
    const { id: testId } = req.params as { id: string };
    const body = submitTestSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid input', details: body.error.issues });
    }

    const user = req.user as { sub: string };
    const { answers } = body.data;

    // Verify test belongs to user and is in_progress
    const testResult = await db.query(
      `SELECT id, user_id, status FROM tests WHERE id = $1 AND user_id = $2`,
      [testId, user.sub],
    );

    if (testResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Test not found' });
    }
    if (testResult.rows[0].status !== 'in_progress') {
      return reply.status(409).send({ error: 'Test already submitted' });
    }

    // Fetch correct answers
    const questionIds = answers.map((a) => a.question_id);
    const correctResult = await db.query(
      `SELECT id, correct_option, topic_id FROM questions WHERE id = ANY($1::uuid[])`,
      [questionIds],
    );

    const correctMap = new Map(correctResult.rows.map((r) => [r.id, r]));

    let score = 0;
    const wrongs: { question_id: string; selected_option: string; correct_option: string }[] = [];

    for (const answer of answers) {
      const question = correctMap.get(answer.question_id);
      if (!question) continue;

      if (answer.selected_option === question.correct_option) {
        score++;
      } else {
        wrongs.push({
          question_id: answer.question_id,
          selected_option: answer.selected_option,
          correct_option: question.correct_option,
        });
      }
    }

    const totalAnswered = answers.length;
    const scorePercent = totalAnswered > 0 ? Math.round((score / totalAnswered) * 100) : 0;

    // Update test status and score
    await db.query(
      `UPDATE tests
       SET status = 'completed', score = $1, score_percent = $2, completed_at = NOW()
       WHERE id = $3`,
      [score, scorePercent, testId],
    );

    // Insert wrong answers into wrong_book (idempotent: ON CONFLICT DO NOTHING)
    if (wrongs.length > 0) {
      const wrongValues = wrongs
        .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, NOW())`)
        .join(', ');
      const wrongParams = wrongs.flatMap((w) => [user.sub, w.question_id, w.selected_option, w.correct_option]);

      await db.query(
        `INSERT INTO wrong_book (user_id, question_id, selected_option, correct_option, added_at)
         VALUES ${wrongValues}
         ON CONFLICT (user_id, question_id) DO UPDATE
           SET selected_option = EXCLUDED.selected_option,
               correct_option = EXCLUDED.correct_option,
               review_count = wrong_book.review_count + 1,
               last_seen_at = NOW()`,
        wrongParams,
      );
    }

    return reply.send({
      test_id: testId,
      score,
      total_questions: totalAnswered,
      score_percent: scorePercent,
      wrongs_added: wrongs.length,
      wrongs,
    });
  });
}
