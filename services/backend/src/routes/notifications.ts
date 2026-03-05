import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { NotificationRepository } from '../db/notification.repository';
import { requireAuth } from '../middleware/auth';

export async function registerNotificationRoutes(fastify: FastifyInstance) {
  // Get all notifications for user
  fastify.get('/notifications', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const limit = (request.query as any).limit || 20;
      const notifications = await NotificationRepository.findByUserId(request.user.id, parseInt(limit));
      return reply.send({ notifications });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Get unread notifications
  fastify.get('/notifications/unread', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const unread = await NotificationRepository.findUnread(request.user.id);
      return reply.send({ notifications: unread, count: unread.length });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Get single notification
  fastify.get('/notifications/:id', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const notification = await NotificationRepository.findById((request.params as any).id);
      if (!notification) {
        return reply.status(404).send({ error: 'NOT_FOUND' });
      }
      return reply.send(notification);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Mark notification as read
  fastify.put('/notifications/:id/read', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const notification = await NotificationRepository.markAsRead((request.params as any).id);
      if (!notification) {
        return reply.status(404).send({ error: 'NOT_FOUND' });
      }
      return reply.send(notification);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Mark all notifications as read
  fastify.put('/notifications/read-all', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await NotificationRepository.markAllAsRead(request.user.id);
      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Delete notification
  fastify.delete('/notifications/:id', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await NotificationRepository.delete((request.params as any).id);
      return reply.status(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Get notification preferences
  fastify.get('/notification-preferences', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      let prefs = await NotificationRepository.getPreferences(request.user.id);
      if (!prefs) {
        prefs = await NotificationRepository.createDefaultPreferences(request.user.id);
      }
      return reply.send(prefs);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Update notification preferences
  fastify.put('/notification-preferences', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const updates = request.body as any;
      const prefs = await NotificationRepository.updatePreferences(request.user.id, updates);
      return reply.send(prefs);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });
}
