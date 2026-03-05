import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../server';

const reviewSchema = z.object({
  action: z.enum(['accept', 'reject']),
  reviewer_notes: z.string().optional(),
});

export async function adminRoutes(app: FastifyInstance) {
  // Admin-only auth hook
  app.addHook('onRequest', async (req, reply) => {
    try {
      await req.jwtVerify();
      const user = req.user as { role: string };
      if (user.role !== 'admin') {
        return reply.status(403).send({ error: 'Forbidden' });
      }
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // GET /admin/ai-jobs — List provisional questions pending review
  app.get('/ai-jobs', async (_req, reply) => {
    const result = await db.query(
      `SELECT aj.id, aj.status, aj.topic, aj.created_at,
              q.id AS question_id, q.text, q.options, q.difficulty, q.subtopic
       FROM ai_jobs aj
       LEFT JOIN questions q ON q.ai_job_id = aj.id
       WHERE aj.status = 'pending_review'
       ORDER BY aj.created_at DESC
       LIMIT 50`,
    );
    return reply.send({ jobs: result.rows });
  });

  // POST /admin/ai-jobs/:id/review — Accept or reject a provisional question
  app.post('/ai-jobs/:id/review', async (req, reply) => {
    const { id: jobId } = req.params as { id: string };
    const body = reviewSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid input', details: body.error.issues });
    }

    const { action, reviewer_notes } = body.data;
    const reviewer = req.user as { sub: string };

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    const questionStatus = action === 'accept' ? 'published' : 'rejected';

    await db.query(
      `UPDATE ai_jobs
       SET status = $1, reviewer_id = $2, reviewer_notes = $3, reviewed_at = NOW()
       WHERE id = $4`,
      [newStatus, reviewer.sub, reviewer_notes ?? null, jobId],
    );

    await db.query(
      `UPDATE questions SET status = $1 WHERE ai_job_id = $2`,
      [questionStatus, jobId],
    );

    return reply.send({ success: true, status: newStatus });
  });
}
