import { FastifyInstance } from 'fastify';
import { db } from '../server';

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
      if ((request.user as any).role !== 'admin') {
        reply.status(403).send({ error: 'Admin only' });
      }
    } catch {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // List pending AI jobs
  app.get('/ai-jobs', async (request) => {
    const { status = 'pending_review', page = 1, limit = 20 } = request.query as any;
    const offset = (Number(page) - 1) * Number(limit);
    const result = await db.query(
      `SELECT j.id, j.job_type, j.status, j.created_at, j.idempotency_key,
              q.id as question_id, q.text, q.options, q.correct_option,
              q.difficulty, q.topic_id, q.explanation
       FROM ai_jobs j
       LEFT JOIN questions q ON q.ai_job_id = j.id
       WHERE j.status = $1
       ORDER BY j.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );
    return { jobs: result.rows, page: Number(page) };
  });

  // Accept a question from AI job
  app.post('/ai-jobs/:id/accept', async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.query(`UPDATE ai_jobs SET status='accepted', reviewed_at=NOW() WHERE id=$1`, [id]);
    await db.query(`UPDATE questions SET status='active' WHERE ai_job_id=$1`, [id]);
    return { success: true };
  });

  // Reject a question from AI job
  app.post('/ai-jobs/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = (request.body as any) || {};
    await db.query(
      `UPDATE ai_jobs SET status='rejected', reviewed_at=NOW(), reject_reason=$2 WHERE id=$1`,
      [id, reason || null]
    );
    await db.query(`UPDATE questions SET status='rejected' WHERE ai_job_id=$1`, [id]);
    return { success: true };
  });
}
