/**
 * Learning Goals Routes
 * POST /goals - Create new goal
 * GET /goals - Get user's current goal
 * PUT /goals/:id - Update goal
 * DELETE /goals/:id - Delete goal
 * GET /goals/:id/estimated-score - Get estimated score and progress
 * POST /goals/:id/generate-plan - Auto-generate adaptive daily plan
 */

import type { FastifyInstance } from 'fastify';
import { createGoalSchema, updateGoalSchema } from '@kpss/shared';
import { learningGoalRepository } from '../db/learning-goal.repository';
import { learningPlanRepository } from '../db/learning-plan.repository';
import { requireAuth } from '../middleware/auth';

export async function registerGoalsRoutes(fastify: FastifyInstance) {
  // Create new learning goal
  fastify.post('/goals', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const userId = request.user.id;
      const body = createGoalSchema.parse(request.body);

      // Check if user already has an active goal, update it instead
      const existingGoal = await learningGoalRepository.findByUserId(userId);
      if (existingGoal && existingGoal.status === 'active') {
        const updated = await learningGoalRepository.update(existingGoal.id, {
          ...body,
          status: 'active',
        });
        return reply.send(updated);
      }

      const goal = await learningGoalRepository.create(userId, body);
      return reply.status(201).send(goal);
    } catch (error) {
      if (error instanceof Error && error.message.includes('parse')) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid goal data',
          details: error.message,
        });
      }
      throw error;
    }
  });

  // Get user's current goal
  fastify.get('/goals', { onRequest: requireAuth }, async (request, reply) => {
    const userId = request.user.id;
    const goal = await learningGoalRepository.findByUserId(userId);

    if (!goal) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'No active learning goal found',
      });
    }

    return reply.send(goal);
  });

  // Get goal by ID
  fastify.get('/goals/:id', { onRequest: requireAuth }, async (request, reply) => {
    const goal = await learningGoalRepository.findById((request.params as any).id);

    if (!goal || goal.user_id !== request.user.id) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Goal not found',
      });
    }

    return reply.send(goal);
  });

  // Update goal
  fastify.put('/goals/:id', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const goalId = (request.params as any).id;
      const goal = await learningGoalRepository.findById(goalId);

      if (!goal || goal.user_id !== request.user.id) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Goal not found',
        });
      }

      const body = updateGoalSchema.parse(request.body);
      const updated = await learningGoalRepository.update(goalId, body);

      return reply.send(updated);
    } catch (error) {
      if (error instanceof Error && error.message.includes('parse')) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid goal data',
        });
      }
      throw error;
    }
  });

  // Delete goal
  fastify.delete('/goals/:id', { onRequest: requireAuth }, async (request, reply) => {
    const goalId = (request.params as any).id;
    const goal = await learningGoalRepository.findById(goalId);

    if (!goal || goal.user_id !== request.user.id) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Goal not found',
      });
    }

    await learningGoalRepository.delete(goalId);
    return reply.send({ message: 'Goal deleted' });
  });

  // Get estimated score and progress
  fastify.get('/goals/:id/estimated-score', { onRequest: requireAuth }, async (request, reply) => {
    const goalId = (request.params as any).id;
    const goal = await learningGoalRepository.findById(goalId);

    if (!goal || goal.user_id !== request.user.id) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Goal not found',
      });
    }

    const { estimated_score, progress_percent } = await learningGoalRepository.updateEstimatedScore(
      request.user.id
    );

    return reply.send({
      goal_id: goalId,
      target_score: goal.target_score,
      estimated_score,
      progress_percent,
      gap: goal.target_score - estimated_score,
    });
  });

  // Generate adaptive daily plan
  fastify.post('/goals/:id/generate-plan', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const goalId = (request.params as any).id;
      const goal = await learningGoalRepository.findById(goalId);

      if (!goal || goal.user_id !== request.user.id) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Goal not found',
        });
      }

      // Check if today's plan already exists
      const existingPlan = await learningPlanRepository.findCurrentPlan(goalId, 'daily');
      if (existingPlan) {
        return reply.send({
          message: 'Plan already exists for today',
          plan: existingPlan,
        });
      }

      const plan = await learningPlanRepository.generateAdaptiveDailyPlan(goalId, request.user.id);

      return reply.status(201).send(plan);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: error.message,
        });
      }
      throw error;
    }
  });
}
