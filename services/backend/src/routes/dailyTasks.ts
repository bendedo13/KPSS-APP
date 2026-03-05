import type { FastifyInstance } from 'fastify';
import { db } from '../server';

export async function dailyTasksRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // GET /daily-tasks
  app.get('/', async (req, reply) => {
    const user = req.user as { sub: string };
    const today = new Date().toISOString().split('T')[0];

    const result = await db.query(
      `SELECT t.id, t.title, t.description, t.task_type, t.target_count,
              COALESCE(up.completed_count, 0) AS completed_count,
              COALESCE(up.is_completed, false) AS is_completed
       FROM tasks t
       LEFT JOIN user_progress up
         ON up.task_id = t.id AND up.user_id = $1 AND up.date = $2
       WHERE t.active = true
       ORDER BY t.sort_order ASC`,
      [user.sub, today],
    );

    return reply.send({ date: today, tasks: result.rows });
  });

  // POST /daily-tasks/:id/complete
  app.post('/:id/complete', async (req, reply) => {
    const { id: taskId } = req.params as { id: string };
    const user = req.user as { sub: string };
    const today = new Date().toISOString().split('T')[0];

    await db.query(
      `INSERT INTO user_progress (user_id, task_id, date, is_completed, completed_count, completed_at)
       VALUES ($1, $2, $3, true, 1, NOW())
       ON CONFLICT (user_id, task_id, date) DO UPDATE
         SET is_completed = true,
             completed_count = user_progress.completed_count + 1,
             completed_at = NOW()`,
      [user.sub, taskId, today],
    );

    return reply.send({ success: true });
  });
}
