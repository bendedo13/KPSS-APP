import type { FastifyInstance } from 'fastify';
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  parsePaginationQuery,
  ErrorCode,
} from '@kpss/shared';
import { requireAuth } from '../middleware/auth';
import { FlashcardRepository } from '../db/flashcard.repository';
import { getDb } from '../db';

export async function flashcardsRoutes(fastify: FastifyInstance): Promise<void> {
  const db = getDb();
  const repo = new FlashcardRepository(db);

  /**
   * GET /flashcards/due - Get flashcards that are due for review
   */
  fastify.get(
    '/flashcards/due',
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = request.user as { userId: string };
      const pagination = parsePaginationQuery(
        request.query as Record<string, unknown>,
      );

      const { rows, total } = await repo.findDueForUser(user.userId, pagination);
      return reply.send(
        paginatedResponse(rows, total, pagination.page, pagination.pageSize),
      );
    },
  );

  /**
   * GET /flashcards - Get all flashcards for the user
   */
  fastify.get(
    '/flashcards',
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = request.user as { userId: string };
      const pagination = parsePaginationQuery(
        request.query as Record<string, unknown>,
      );

      const { rows, total } = await repo.findAllForUser(user.userId, pagination);
      return reply.send(
        paginatedResponse(rows, total, pagination.page, pagination.pageSize),
      );
    },
  );

  /**
   * GET /flashcards/stats - Get flashcard statistics
   */
  fastify.get(
    '/flashcards/stats',
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = request.user as { userId: string };
      const stats = await repo.getStats(user.userId);
      return reply.send(successResponse(stats));
    },
  );

  /**
   * POST /flashcards - Create or get a flashcard for a question
   */
  fastify.post<{
    Body: { questionId: string };
  }>(
    '/flashcards',
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = request.user as { userId: string };
      const { questionId } = request.body;

      if (!questionId) {
        return reply
          .code(400)
          .send(errorResponse(ErrorCode.VALIDATION_ERROR, 'questionId is required'));
      }

      const flashcard = await repo.createOrGet(user.userId, questionId);
      return reply.code(201).send(successResponse(flashcard));
    },
  );

  /**
   * POST /flashcards/review - Review a flashcard and update SRS
   */
  fastify.post<{
    Body: { flashcardId: string; quality: 0 | 1 | 2 | 3 | 4 | 5 };
  }>(
    '/flashcards/review',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { flashcardId, quality } = request.body;

      if (!flashcardId || quality === undefined) {
        return reply
          .code(400)
          .send(
            errorResponse(
              ErrorCode.VALIDATION_ERROR,
              'flashcardId and quality are required',
            ),
          );
      }

      if (![0, 1, 2, 3, 4, 5].includes(quality)) {
        return reply
          .code(400)
          .send(
            errorResponse(
              ErrorCode.VALIDATION_ERROR,
              'quality must be between 0 and 5',
            ),
          );
      }

      try {
        const result = await repo.review(flashcardId, quality);
        return reply.send(successResponse(result));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply
          .code(404)
          .send(errorResponse(ErrorCode.NOT_FOUND, message));
      }
    },
  );

  /**
   * DELETE /flashcards/:id - Delete a flashcard
   */
  fastify.delete<{ Params: { id: string } }>(
    '/flashcards/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const deleted = await repo.deleteById(request.params.id);
      if (!deleted) {
        return reply
          .code(404)
          .send(errorResponse(ErrorCode.NOT_FOUND, 'Flashcard not found'));
      }
      return reply.send(successResponse({ deleted: true }));
    },
  );
}
