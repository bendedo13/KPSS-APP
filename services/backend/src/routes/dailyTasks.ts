import { FastifyInstance } from 'fastify';
import { db } from '../server';

export async function dailyTasksRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    try { await request.jwtVerify(); } catch {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  app.get('/', async (request) => {
    const userId = (request.user as any).sub;
    const today = new Date().toISOString().split('T')[0];
    const result = await db.query(
      `SELECT t.id, t.title, t.description, t.task_type, t.metadata,
              ut.completed_at, ut.status
       FROM tasks t
       LEFT JOIN user_tasks ut ON ut.task_id = t.id AND ut.user_id = $1 AND ut.assigned_date = $2
       WHERE t.active = true
       ORDER BY t.sort_order`,
      [userId, today]
    );
    return { date: today, tasks: result.rows };
  });

  app.post('/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request.user as any).sub;
    await db.query(
      `INSERT INTO user_tasks (user_id, task_id, assigned_date, status, completed_at)
       VALUES ($1, $2, CURRENT_DATE, 'completed', NOW())
       ON CONFLICT (user_id, task_id, assigned_date) DO UPDATE SET status='completed', completed_at=NOW()`,
      [userId, id]
    );
    return { success: true };
  });
}
