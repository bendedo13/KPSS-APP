import type { FastifyInstance } from 'fastify';
import {
  createQuestionSchema,
  successResponse,
  errorResponse,
  paginatedResponse,
  parsePaginationQuery,
  ErrorCode,
} from '@kpss/shared';
import { requireAdmin } from '../middleware/auth';
import { QuestionRepository } from '../db/question.repository';
import { getDb } from '../db';

export async function questionsRoutes(fastify: FastifyInstance): Promise<void> {
  const db = getDb();
  const repo = new QuestionRepository(db);

  fastify.get(
    '/questions',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const pagination = parsePaginationQuery(
        request.query as Record<string, unknown>,
      );
      const { rows, total } = await repo.findAll(pagination);
      return reply.send(
        paginatedResponse(rows, total, pagination.page, pagination.pageSize),
      );
    },
  );

  fastify.post(
    '/questions',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const parsed = createQuestionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send(errorResponse(ErrorCode.VALIDATION_ERROR, 'Invalid input', parsed.error.format()));
      }
      const question = await repo.create(parsed.data);
      return reply.code(201).send(successResponse(question));
    },
  );

  fastify.get<{ Params: { id: string } }>(
    '/questions/:id',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const question = await repo.findById(request.params.id);
      if (!question) {
        return reply
          .code(404)
          .send(errorResponse(ErrorCode.NOT_FOUND, 'Question not found.'));
      }
      return reply.send(successResponse(question));
    },
  );
}
