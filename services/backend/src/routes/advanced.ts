import type { FastifyInstance } from 'fastify';
import { examSimulationRepository } from '../db/exam-simulation.repository';
import { solutionExplanationRepository } from '../db/solution-explanation.repository';
import { gamificationRepository } from '../db/gamification.repository';
import { requireAuth } from '../middleware/auth';

export async function registerAdvancedRoutes(fastify: FastifyInstance) {
  // ExamSimulation
  fastify.post('/exams/start', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const { exam_type = 'full_mock', total_questions = 100 } = request.body as any;
      const session = await examSimulationRepository.createSession(request.user.id, exam_type, total_questions);
      return reply.status(201).send(session);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  fastify.post('/exams/:sessionId/end', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const { score, accuracy } = request.body as any;
      const session = await examSimulationRepository.endSession((request.params as any).sessionId, score, accuracy);
      const results = await examSimulationRepository.getSessionResults((request.params as any).sessionId);
      return reply.send({ session, results });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Solutions
  fastify.get('/questions/:id/solution', async (request, reply) => {
    try {
      const solution = await solutionExplanationRepository.findByQuestionId((request.params as any).id);
      if (!solution) {
        return reply.status(404).send({ error: 'NOT_FOUND' });
      }
      return reply.send(solution);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Gamification
  fastify.get('/user/streak', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const streak = await gamificationRepository.getOrCreateStreak(request.user.id);
      return reply.send(streak);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  fastify.put('/user/update-streak', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const updated = await gamificationRepository.updateStreak(request.user.id);
      return reply.send(updated);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  fastify.get('/user/badges', { onRequest: requireAuth }, async (request, reply) => {
    try {
      const badges = await gamificationRepository.getUserBadges(request.user.id);
      return reply.send(badges);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });
}
