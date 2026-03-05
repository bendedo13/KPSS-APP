/**
 * Learning Plans Routes
 * GET /plans/:goalId - Get plans for a goal
 * GET /plans/:goalId/current - Get current day/week/month plan
 * GET /plans/:goalId/weekly-summary - Get weekly summary
 * POST /plans/:goalId/complete - Mark plan as completed
 */

import type { FastifyInstance } from 'fastify';
import { learningPlanRepository } from '../db/learning-plan.repository';
import { learningGoalRepository } from '../db/learning-goal.repository';
import { requireAuth } from '../middleware/auth';

export async function registerPlansRoutes(fastify: FastifyInstance) {
  // Get plans for a goal
  fastify.get('/plans/:goalId', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const goalId = (request.params as any).goalId;
      const page = parseInt((request.query as any).page) || 1;
      const limit = parseInt((request.query as any).limit) || 10;

      const goal = await learningGoalRepository.findById(goalId);
      if (!goal || goal.user_id !== request.user.id) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Goal not found',
        });
      }

      const plans = await learningPlanRepository.findByGoalId(goalId, { page, limit });
      return reply.send(plans);
    } catch (error) {
      throw error;
    }
  });

  // Get current plan (daily/weekly/monthly)
  fastify.get('/plans/:goalId/current', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const goalId = (request.params as any).goalId;
      const planType = ((request.query as any).type || 'daily') as 'daily' | 'weekly' | 'monthly';

      const goal = await learningGoalRepository.findById(goalId);
      if (!goal || goal.user_id !== request.user.id) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Goal not found',
        });
      }

      const plan = await learningPlanRepository.findCurrentPlan(goalId, planType);

      if (!plan) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: `No active ${planType} plan found`,
        });
      }

      return reply.send(plan);
    } catch (error) {
      throw error;
    }
  });

  // Get weekly summary
  fastify.get('/plans/:goalId/weekly-summary', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const goalId = (request.params as any).goalId;

      const goal = await learningGoalRepository.findById(goalId);
      if (!goal || goal.user_id !== request.user.id) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Goal not found',
        });
      }

      const summary = await learningPlanRepository.getWeeklySummary(goalId);
      return reply.send({
        goal_id: goalId,
        period: 'last_7_days',
        ...summary,
      });
    } catch (error) {
      throw error;
    }
  });

  // Complete/Update plan with progress
  fastify.post('/plans/:planId/complete', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const planId = (request.params as any).planId;
      const body = request.body as { completed_questions_count?: number; completed_minutes?: number };

      const plan = await learningPlanRepository.findById(planId);
      if (!plan || plan.user_id !== request.user.id) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Plan not found',
        });
      }

      const updated = await learningPlanRepository.update(planId, {
        completed_questions_count:
          body.completed_questions_count !== undefined ? body.completed_questions_count : plan.completed_questions_count,
        completed_minutes: body.completed_minutes !== undefined ? body.completed_minutes : plan.completed_minutes,
        status: 'completed',
      });

      return reply.send(updated);
    } catch (error) {
      throw error;
    }
  });
}
