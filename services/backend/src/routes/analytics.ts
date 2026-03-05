/**
 * Analytics Routes
 * GET /analytics - Get comprehensive analytics
 * GET /analytics/heatmap - Get topic heatmap
 * GET /analytics/topics/:topic - Get topic-specific analysis
 * GET /analytics/recommendations - Get personalized recommendations
 * GET /analytics/progress - Get progress trends
 */

import type { FastifyInstance } from 'fastify';
import { analyticsRepository } from '../db/analytics.repository';
import { requireAuth } from '../middleware/auth';

export async function registerAnalyticsRoutes(fastify: FastifyInstance) {
  // Get comprehensive analytics
  fastify.get('/analytics', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const analytics = await analyticsRepository.getDetailedAnalytics(request.user.id);
      return reply.send(analytics);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch analytics',
      });
    }
  });

  // Get topic heatmap (konu başına hata ısısı)
  fastify.get('/analytics/heatmap', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const heatmap = await analyticsRepository.getTopicHeatmap(request.user.id);
      return reply.send({
        heatmap,
        total_topics: heatmap.length,
        average_accuracy: heatmap.length > 0 ? Math.round(heatmap.reduce((sum, t) => sum + t.accuracy_percent, 0) / heatmap.length) : 0,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch heatmap',
      });
    }
  });

  // Get difficulty breakdown
  fastify.get('/analytics/difficulty', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const breakdown = await analyticsRepository.getDifficultyBreakdown(request.user.id);
      return reply.send({
        breakdown,
        total_difficulties: breakdown.length,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch difficulty breakdown',
      });
    }
  });

  // Get time management analysis
  fastify.get('/analytics/time-management', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const timeAnalysis = await analyticsRepository.getTimeManagementAnalysis(request.user.id);
      return reply.send(timeAnalysis);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch time management analysis',
      });
    }
  });

  // Get progress trends
  fastify.get('/analytics/progress', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const days = parseInt((request.query as any).days) || 30;
      const trends = await analyticsRepository.getProgressTrends(request.user.id, days);

      return reply.send({
        period_days: days,
        trends,
        total_data_points: trends.length,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch progress trends',
      });
    }
  });

  // Get weak topics
  fastify.get('/analytics/weak-topics', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const limit = parseInt((request.query as any).limit) || 5;
      const weakTopics = await analyticsRepository.getWeakTopics(request.user.id, limit);

      return reply.send({
        weak_topics: weakTopics,
        total_weak_topics: weakTopics.length,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch weak topics',
      });
    }
  });

  // Get topic-specific analysis
  fastify.get('/analytics/topics/:topic', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const topic = (request.params as any).topic;
      const analysis = await analyticsRepository.getTopicAnalysis(request.user.id, topic);

      if (!analysis) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: `No data found for topic: ${topic}`,
        });
      }

      return reply.send(analysis);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch topic analysis',
      });
    }
  });

  // Get personalized recommendations
  fastify.get('/analytics/recommendations', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const recommendations = await analyticsRepository.getRecommendations(request.user.id);

      return reply.send({
        recommendations,
        total_recommendations: recommendations.length,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch recommendations',
      });
    }
  });
}
