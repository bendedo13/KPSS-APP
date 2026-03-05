import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../server';

const reviewSchema = z.object({
  flashcard_id: z.string().uuid(),
  correct: z.boolean(),
});

export async function flashcardsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // GET /flashcards/due — get cards due for review today
  app.get('/due', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req, reply) => {
    const user = req.user as { sub: string };
    const today = new Date().toISOString().split('T')[0];

    const result = await db.query(
      `SELECT f.id, f.front, f.back, f.topic_id,
              COALESCE(p.interval_days, 1) AS interval_days,
              COALESCE(p.ease_factor, 2.5) AS ease_factor,
              COALESCE(p.review_count, 0) AS review_count
       FROM flashcards f
       LEFT JOIN user_flashcard_progress p
         ON p.flashcard_id = f.id AND p.user_id = $1
       WHERE COALESCE(p.due_date, CURRENT_DATE) <= $2::date
       ORDER BY COALESCE(p.due_date, CURRENT_DATE) ASC
       LIMIT 50`,
      [user.sub, today],
    );

    return reply.send({ flashcards: result.rows });
  });

  // POST /flashcards/review — record SRS result and update interval
  app.post('/review', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = reviewSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid input', details: body.error.issues });
    }

    const { flashcard_id, correct } = body.data;
    const user = req.user as { sub: string };

    // Fetch current progress
    const current = await db.query(
      `SELECT interval_days, ease_factor FROM user_flashcard_progress
       WHERE user_id = $1 AND flashcard_id = $2`,
      [user.sub, flashcard_id],
    );

    const prev = current.rows[0] ?? { interval_days: 1, ease_factor: 2.5 };

    // SM-2 algorithm (simplified)
    let newInterval: number;
    let newEaseFactor: number;

    if (correct) {
      newInterval = Math.round(prev.interval_days * prev.ease_factor);
      newEaseFactor = Math.min(3.0, parseFloat(prev.ease_factor) + 0.1);
    } else {
      newInterval = 1;
      newEaseFactor = Math.max(1.3, parseFloat(prev.ease_factor) - 0.2);
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + newInterval);

    await db.query(
      `INSERT INTO user_flashcard_progress
         (user_id, flashcard_id, interval_days, ease_factor, due_date, review_count, last_reviewed)
       VALUES ($1, $2, $3, $4, $5, 1, NOW())
       ON CONFLICT (user_id, flashcard_id) DO UPDATE
         SET interval_days = $3,
             ease_factor = $4,
             due_date = $5,
             review_count = user_flashcard_progress.review_count + 1,
             last_reviewed = NOW()`,
      [user.sub, flashcard_id, newInterval, newEaseFactor, dueDate.toISOString().split('T')[0]],
    );

    return reply.send({
      flashcard_id,
      next_review_in_days: newInterval,
      new_ease_factor: newEaseFactor,
    });
  });
}
