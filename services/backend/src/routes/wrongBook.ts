import type { FastifyInstance } from 'fastify';
import { db } from '../server';

export async function wrongBookRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // GET /wrong-book — list user's wrong answers
  app.get('/', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req, reply) => {
    const user = req.user as { sub: string };

    const result = await db.query(
      `SELECT wb.question_id, q.text, wb.selected_option, wb.correct_option,
              wb.review_count, wb.added_at, wb.last_seen_at,
              t.name AS topic
       FROM wrong_book wb
       JOIN questions q ON q.id = wb.question_id
       LEFT JOIN topics t ON t.id = q.topic_id
       WHERE wb.user_id = $1
       ORDER BY wb.last_seen_at DESC
       LIMIT 100`,
      [user.sub],
    );

    return reply.send({ wrongs: result.rows });
  });

  // DELETE /wrong-book/:questionId — remove from wrong book
  app.delete('/:questionId', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { questionId } = req.params as { questionId: string };
    const user = req.user as { sub: string };

    await db.query(
      `DELETE FROM wrong_book WHERE user_id = $1 AND question_id = $2`,
      [user.sub, questionId],
    );

    return reply.send({ success: true });
  });
}
