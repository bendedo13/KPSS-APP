import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ExamSimulationRepository } from '../db/exam-simulation.repository';
import { SolutionExplanationRepository } from '../db/solution-explanation.repository';
import { GamificationRepository } from '../db/gamification.repository';
import { requireAuth } from '../middleware/auth';

export async function registerAdvancedRoutes(fastify: FastifyInstance) {
  // ExamSimulation
  fastify.post('/exams/start', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { exam_type = 'full_mock', total_questions = 100 } = request.body as any;
      const session = await ExamSimulationRepository.createSession(request.user.id, exam_type, total_questions, 180);
      return reply.status(201).send(session);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  fastify.post('/exams/:sessionId/end', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { score, accuracy } = request.body as any;
      const session = await ExamSimulationRepository.endSession((request.params as any).sessionId, score, accuracy);
      const results = await ExamSimulationRepository.getSessionResults((request.params as any).sessionId);
      return reply.send({ session, results });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Solutions
  fastify.get('/questions/:id/solution', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const solution = await SolutionExplanationRepository.findByQuestionId((request.params as any).id);
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
  fastify.get('/user/streak', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const streak = await GamificationRepository.getOrCreateStreak(request.user.id);
      return reply.send(streak);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  fastify.put('/user/update-streak', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const updated = await GamificationRepository.updateStreak(request.user.id);
      return reply.send(updated);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  fastify.get('/user/badges', { onRequest: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const badges = await GamificationRepository.getUserBadges(request.user.id);
      return reply.send(badges);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });
}
