/**
 * Notifications Routes
 * GET /notifications - Get user notifications
 * GET /notifications/unread - Get unread notifications
 * PUT /notifications/:id/read - Mark as read
 * PUT /notifications/read-all - Mark all as read
 * DELETE /notifications/:id - Delete notification
 * GET /notifications/preferences - Get notification preferences
 * PUT /notifications/preferences - Update preferences
 */

import type { FastifyInstance } from 'fastify';
import { notificationRepository } from '../db/notification.repository';
import { requireAuth } from '../middleware/auth';

export async function registerNotificationsRoutes(fastify: FastifyInstance) {
  // Get user notifications
  fastify.get('/notifications', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const page = parseInt((request.query as any).page) || 1;
      const limit = parseInt((request.query as any).limit) || 20;

      const notifications = await notificationRepository.findByUserId(request.user.id, { page, limit });
      return reply.send(notifications);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch notifications',
      });
    }
  });

  // Get unread notifications
  fastify.get('/notifications/unread', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const unread = await notificationRepository.findUnread(request.user.id);
      const unreadCount = await notificationRepository.getUnreadCount(request.user.id);

      return reply.send({
        unread_count: unreadCount,
        notifications: unread,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch unread notifications',
      });
    }
  });

  // Mark notification as read
  fastify.put('/notifications/:id/read', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const notificationId = (request.params as any).id;
      const notification = await notificationRepository.findById(notificationId);

      if (!notification || notification.user_id !== request.user.id) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Notification not found',
        });
      }

      const updated = await notificationRepository.markAsRead(notificationId);
      return reply.send(updated);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update notification',
      });
    }
  });

  // Mark all as read
  fastify.put('/notifications/read-all', { onRequest: requireAuth }, async (request, reply) => {
    try {
      await notificationRepository.markAllAsRead(request.user.id);
      return reply.send({ message: 'All notifications marked as read' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update notifications',
      });
    }
  });

  // Delete notification
  fastify.delete('/notifications/:id', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const notificationId = (request.params as any).id;
      const notification = await notificationRepository.findById(notificationId);

      if (!notification || notification.user_id !== request.user.id) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Notification not found',
        });
      }

      await notificationRepository.delete(notificationId);
      return reply.send({ message: 'Notification deleted' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to delete notification',
      });
    }
  });

  // Get notification preferences
  fastify.get('/notifications/preferences', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const preferences = await notificationRepository.getPreferences(request.user.id);
      return reply.send(preferences);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch preferences',
      });
    }
  });

  // Update notification preferences
  fastify.put('/notifications/preferences', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const body = request.body as Record<string, any>;
      const updated = await notificationRepository.updatePreferences(request.user.id, body);
      return reply.send(updated);
    } catch (error) {
      if ((error as any).message.includes('not found')) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Preferences not found',
        });
      }
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update preferences',
      });
    }
  });
}
