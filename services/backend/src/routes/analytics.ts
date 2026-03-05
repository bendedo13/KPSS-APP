import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AnalyticsRepository } from '../db/analytics.repository';
import { requireAuth } from '../middleware/auth';

export async function registerAnalyticsRoutes(fastify: FastifyInstance) {
  // Get topic heatmap (poor performing topics)
  fastify.get('/analytics/topics', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const topics = await AnalyticsRepository.getTopicHeatmap(request.user.id);
      return reply.send({ topics });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Get difficulty breakdown
  fastify.get('/analytics/difficulty', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const breakdown = await AnalyticsRepository.getDifficultyBreakdown(request.user.id);
      return reply.send({ breakdown });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Get time management analysis
  fastify.get('/analytics/time-management', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const analysis = await AnalyticsRepository.getTimeManagementAnalysis(request.user.id);
      return reply.send(analysis);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Get progress trends
  fastify.get('/analytics/progress-trends', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const limit = (request.query as any).limit || 10;
      const trends = await AnalyticsRepository.getProgressTrends(request.user.id, parseInt(limit));
      return reply.send({ trends });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Get weak topics
  fastify.get('/analytics/weak-topics', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const limit = (request.query as any).limit || 5;
      const weakTopics = await AnalyticsRepository.getWeakTopics(request.user.id, parseInt(limit));
      return reply.send({ weakTopics });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Get topic specific analysis
  fastify.get('/analytics/topics/:topic', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { topic } = request.params as any;
      const analysis = await AnalyticsRepository.getTopicAnalysis(request.user.id, topic);
      return reply.send(analysis);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Get comprehensive analytics dashboard
  fastify.get('/analytics', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const analytics = await AnalyticsRepository.getDetailedAnalytics(request.user.id);
      return reply.send(analytics);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Get study recommendations
  fastify.get('/analytics/recommendations', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const recommendations = await AnalyticsRepository.getRecommendations(request.user.id);
      return reply.send({ recommendations });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });
}
