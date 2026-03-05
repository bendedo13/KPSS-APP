import type { FastifyInstance } from 'fastify';
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  parsePaginationQuery,
  ErrorCode,
} from '@kpss/shared';
import { requireAuth } from '../middleware/auth';
import { WrongBookRepository } from '../db/wrong-book.repository';
import { getDb } from '../db';

export async function wrongBookRoutes(fastify: FastifyInstance): Promise<void> {
  const db = getDb();
  const repo = new WrongBookRepository(db);

  /**
   * GET /wrong-book - Get all wrong book entries (with question details)
   */
  fastify.get(
    '/wrong-book',
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = request.user as { userId: string };
      const pagination = parsePaginationQuery(
        request.query as Record<string, unknown>,
      );

      const { rows, total } = await repo.findAllWithQuestionsForUser(
        user.userId,
        pagination,
      );

      return reply.send(
        paginatedResponse(rows, total, pagination.page, pagination.pageSize),
      );
    },
  );

  /**
   * GET /wrong-book/simple - Get wrong book entries without question details
   */
  fastify.get(
    '/wrong-book/simple',
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
   * GET /wrong-book/stats - Get wrong book statistics
   */
  fastify.get(
    '/wrong-book/stats',
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = request.user as { userId: string };
      const stats = await repo.getStats(user.userId);
      return reply.send(successResponse(stats));
    },
  );

  /**
   * POST /wrong-book - Add a question to wrong book
   */
  fastify.post<{
    Body: { questionId: string };
  }>(
    '/wrong-book',
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = request.user as { userId: string };
      const { questionId } = request.body;

      if (!questionId) {
        return reply
          .code(400)
          .send(errorResponse(ErrorCode.VALIDATION_ERROR, 'questionId is required'));
      }

      const entry = await repo.addOrUpdate(user.userId, questionId);
      return reply.code(201).send(successResponse(entry));
    },
  );

  /**
   * DELETE /wrong-book/:questionId - Remove a question from wrong book
   */
  fastify.delete<{ Params: { questionId: string } }>(
    '/wrong-book/:questionId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = request.user as { userId: string };
      const { questionId } = request.params;

      const deleted = await repo.removeByUserAndQuestion(user.userId, questionId);
      if (!deleted) {
        return reply
          .code(404)
          .send(
            errorResponse(
              ErrorCode.NOT_FOUND,
              'Entry not found in wrong book',
            ),
          );
      }

      return reply.send(successResponse({ deleted: true }));
    },
  );

  /**
   * DELETE /wrong-book/entry/:id - Delete a wrong book entry by ID
   */
  fastify.delete<{ Params: { id: string } }>(
    '/wrong-book/entry/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const deleted = await repo.deleteById(request.params.id);
      if (!deleted) {
        return reply
          .code(404)
          .send(errorResponse(ErrorCode.NOT_FOUND, 'Entry not found'));
      }
      return reply.send(successResponse({ deleted: true }));
    },
  );
}
