import { FastifyInstance } from 'fastify';
import { db } from '../server';
import { z } from 'zod';

const createTestSchema = z.object({
  topic_id: z.string().uuid().optional(),
  question_count: z.number().int().min(1).max(50).default(10),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).default('mixed'),
});

const submitSchema = z.object({
  answers: z.array(z.object({
    question_id: z.string().uuid(),
    selected_option: z.string().max(1),
  })),
});

export async function testsRoutes(app: FastifyInstance) {
  // Require auth
  app.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify(); } catch {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // POST /tests/create
  app.post('/create', async (request, reply) => {
    const body = createTestSchema.parse(request.body);
    const userId = (request.user as any).sub;

    let questionsQuery = `
      SELECT id, text, options, correct_option, difficulty, topic_id
      FROM questions WHERE status = 'active'
    `;
    const params: unknown[] = [];
    if (body.topic_id) {
      params.push(body.topic_id);
      questionsQuery += ` AND topic_id = $${params.length}`;
    }
    if (body.difficulty !== 'mixed') {
      params.push(body.difficulty);
      questionsQuery += ` AND difficulty = $${params.length}`;
    }
    params.push(body.question_count);
    questionsQuery += ` ORDER BY RANDOM() LIMIT $${params.length}`;

    const questionsResult = await db.query(questionsQuery, params);

    const testResult = await db.query(
      `INSERT INTO tests (user_id, question_ids, status, started_at)
       VALUES ($1, $2, 'in_progress', NOW())
       RETURNING id`,
      [userId, questionsResult.rows.map((q: any) => q.id)]
    );

    // Strip correct answers before returning to client
    const questions = questionsResult.rows.map(({ correct_option: _correct_option, ...q }: any) => q);
    return { test_id: testResult.rows[0].id, questions };
  });

  // POST /tests/:id/submit
  app.post('/:id/submit', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = submitSchema.parse(request.body);
    const userId = (request.user as any).sub;

    const testResult = await db.query(
      `SELECT id, user_id, question_ids, status FROM tests WHERE id = $1`,
      [id]
    );
    if (testResult.rows.length === 0) return reply.status(404).send({ error: 'Test not found' });
    const test = testResult.rows[0];
    if (test.user_id !== userId) return reply.status(403).send({ error: 'Forbidden' });
    if (test.status !== 'in_progress') return reply.status(400).send({ error: 'Test already submitted' });

    // Fetch correct answers
    const qIds = test.question_ids as string[];
    const correctResult = await db.query(
      `SELECT id, correct_option FROM questions WHERE id = ANY($1::uuid[])`,
      [qIds]
    );
    const correctMap = new Map(correctResult.rows.map((r: any) => [r.id, r.correct_option]));

    let score = 0;
    const wrongs: string[] = [];
    for (const answer of body.answers) {
      const correct = correctMap.get(answer.question_id);
      if (correct === answer.selected_option) {
        score++;
      } else {
        wrongs.push(answer.question_id);
      }
    }

    // Update test
    await db.query(
      `UPDATE tests SET status='completed', score=$1, completed_at=NOW(), answers=$2 WHERE id=$3`,
      [score, JSON.stringify(body.answers), id]
    );

    // Add wrongs to wrong_book (upsert)
    for (const qId of wrongs) {
      await db.query(
        `INSERT INTO wrong_book (user_id, question_id, wrong_count, last_seen_at)
         VALUES ($1, $2, 1, NOW())
         ON CONFLICT (user_id, question_id) DO UPDATE
         SET wrong_count = wrong_book.wrong_count + 1, last_seen_at = NOW()`,
        [userId, qId]
      );
    }

    return {
      test_id: id,
      score,
      total: qIds.length,
      percentage: Math.round((score / qIds.length) * 100),
      wrong_question_ids: wrongs,
    };
  });
}
