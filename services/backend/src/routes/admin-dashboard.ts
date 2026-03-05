/**
 * Admin Dashboard Routes
 * İstatistikler, yönetim ve raporlar
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AdminRepository } from '../db/admin.repository';
import { adminAuth, logAdminAction } from '../middleware/admin-auth';
import { getDb } from '../db/index';

export async function registerAdminDashboardRoutes(fastify: FastifyInstance) {
  // Dashboard Statistics
  fastify.get('/admin/dashboard/stats', { onRequest: adminAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await AdminRepository.getDashboardStats();

      return reply.status(200).send(stats);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // User Management - List
  fastify.get('/admin/users/list', { onRequest: adminAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const admin = (request as any).admin;
      if (!['admin', 'super_admin'].includes(admin.role)) {
        return reply.status(403).send({ error: 'INSUFFICIENT_PERMISSIONS' });
      }

      const db = getDb();
      const { page = 1, limit = 20, search = '' } = request.query as any;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = 'SELECT id, email, name, created_at, last_activity FROM users';
      const params: any[] = [];

      if (search) {
        query += ' WHERE email ILIKE $1 OR name ILIKE $1';
        params.push(`%${search}%`);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      return reply.status(200).send({ users: result.rows });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Question Management - List
  fastify.get('/admin/questions/list', { onRequest: adminAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const admin = (request as any).admin;
      if (!['admin', 'super_admin', 'content_manager'].includes(admin.role)) {
        return reply.status(403).send({ error: 'INSUFFICIENT_PERMISSIONS' });
      }

      const db = getDb();
      const { page = 1, limit = 20, status = 'all', topic = 'all' } = request.query as any;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = 'SELECT id, text, difficulty, topic, status, created_at FROM questions WHERE 1=1';
      const params: any[] = [];

      if (status !== 'all') {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }

      if (topic !== 'all') {
        params.push(topic);
        query += ` AND topic = $${params.length}`;
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      return reply.status(200).send({ questions: result.rows });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Approve/Reject Question
  fastify.put('/admin/questions/:id/approve', { onRequest: adminAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const admin = (request as any).admin;
      if (!['admin', 'super_admin', 'content_manager'].includes(admin.role)) {
        return reply.status(403).send({ error: 'INSUFFICIENT_PERMISSIONS' });
      }

      const { id } = request.params as any;
      const { status, feedback } = request.body as any;

      const db = getDb();
      const result = await db.query(
        `UPDATE questions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, id]
      );

      await logAdminAction(request, 'update', 'question', id, { status, feedback });

      return reply.status(200).send({ question: result.rows[0] });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Get Admin Logs
  fastify.get('/admin/logs', { onRequest: adminAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const admin = (request as any).admin;
      if (admin.role !== 'super_admin' && admin.role !== 'admin') {
        return reply.status(403).send({ error: 'INSUFFICIENT_PERMISSIONS' });
      }

      const { page = 1, limit = 50 } = request.query as any;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const logs = await AdminRepository.getAllLogs(parseInt(limit), offset);

      return reply.status(200).send({ logs });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Get System Settings
  fastify.get('/admin/settings', { onRequest: adminAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const settings = await AdminRepository.getAllSettings(false);

      return reply.status(200).send({ settings });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Update System Setting
  fastify.put('/admin/settings/:key', { onRequest: adminAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const admin = (request as any).admin;
      if (admin.role !== 'super_admin') {
        return reply.status(403).send({ error: 'INSUFFICIENT_PERMISSIONS' });
      }

      const { key } = request.params as any;
      const { value } = request.body as any;

      const setting = await AdminRepository.updateSetting(key, value, admin.id);

      await logAdminAction(request, 'update', 'setting', key, { value });

      return reply.status(200).send({ setting });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Moderation Queue
  fastify.get('/admin/moderation', { onRequest: adminAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const admin = (request as any).admin;
      if (!['admin', 'super_admin', 'content_manager'].includes(admin.role)) {
        return reply.status(403).send({ error: 'INSUFFICIENT_PERMISSIONS' });
      }

      const { status = 'pending' } = request.query as any;
      const queue = await AdminRepository.getModerationQueue(status);

      return reply.status(200).send({ queue });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Review Moderation Item
  fastify.put('/admin/moderation/:id', { onRequest: adminAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const admin = (request as any).admin;
      if (!['admin', 'super_admin', 'content_manager'].includes(admin.role)) {
        return reply.status(403).send({ error: 'INSUFFICIENT_PERMISSIONS' });
      }

      const { id } = request.params as any;
      const { status, notes } = request.body as any;

      const result = await AdminRepository.reviewModeration(id, status, admin.id, notes);

      await logAdminAction(request, 'review', 'moderation', id, { status, notes });

      return reply.status(200).send({ moderation: result });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Analytics - Question Stats
  fastify.get('/admin/analytics/questions', { onRequest: adminAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const admin = (request as any).admin;
      if (!['admin', 'super_admin', 'analytics_manager'].includes(admin.role)) {
        return reply.status(403).send({ error: 'INSUFFICIENT_PERMISSIONS' });
      }

      const stats = await AdminRepository.getQuestionStats();
      const byDifficulty = await AdminRepository.getQuestionsByDifficulty();
      const byTopic = await AdminRepository.getQuestionsByTopic();

      return reply.status(200).send({ stats, by_difficulty: byDifficulty, by_topic: byTopic });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Analytics - User Stats
  fastify.get('/admin/analytics/users', { onRequest: adminAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const admin = (request as any).admin;
      if (!['admin', 'super_admin', 'analytics_manager'].includes(admin.role)) {
        return reply.status(403).send({ error: 'INSUFFICIENT_PERMISSIONS' });
      }

      const stats = await AdminRepository.getUserStats();
      const topUsers = await AdminRepository.getTopPerformingUsers(10);

      return reply.status(200).send({ stats, top_users: topUsers });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Export Data (CSV)
  fastify.get('/admin/export/users', { onRequest: adminAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const admin = (request as any).admin;
      if (!['admin', 'super_admin'].includes(admin.role)) {
        return reply.status(403).send({ error: 'INSUFFICIENT_PERMISSIONS' });
      }

      const db = getDb();
      const result = await db.query('SELECT id, email, name, created_at FROM users ORDER BY created_at DESC');

      const csv = [
        'ID,Email,Name,Created At',
        ...result.rows.map((r: any) => `${r.id},${r.email},${r.name},${r.created_at}`),
      ].join('\n');

      await logAdminAction(request, 'export', 'users', null, {});

      return reply.type('text/csv').send(csv);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Export Questions
  fastify.get('/admin/export/questions', { onRequest: adminAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const admin = (request as any).admin;
      if (!['admin', 'super_admin', 'content_manager'].includes(admin.role)) {
        return reply.status(403).send({ error: 'INSUFFICIENT_PERMISSIONS' });
      }

      const db = getDb();
      const result = await db.query(
        'SELECT id, text, difficulty, topic, status, created_at FROM questions ORDER BY created_at DESC'
      );

      const csv = [
        'ID,Text,Difficulty,Topic,Status,Created At',
        ...result.rows.map((r: any) => `${r.id},"${r.text.replace(/"/g, '""')}",${r.difficulty},${r.topic},${r.status},${r.created_at}`),
      ].join('\n');

      await logAdminAction(request, 'export', 'questions', null, {});

      return reply.type('text/csv').send(csv);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });
}
