import type { FastifyInstance } from 'fastify';
import {
  createTestSchema,
  submitTestSchema,
  successResponse,
  errorResponse,
  paginatedResponse,
  parsePaginationQuery,
  ErrorCode,
} from '@kpss/shared';
import { requireAuth } from '../middleware/auth';
import { TestRepository } from '../db/test.repository';
import { QuestionRepository } from '../db/question.repository';
import { getDb } from '../db';

export async function testsRoutes(fastify: FastifyInstance): Promise<void> {
  const db = getDb();
  const testRepo = new TestRepository(db);
  const questionRepo = new QuestionRepository(db);

  fastify.post(
    '/tests/create',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = createTestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send(errorResponse(ErrorCode.VALIDATION_ERROR, 'Invalid input', parsed.error.format()));
      }

      const user = request.user as { userId: string };
      const { topic, questionCount } = parsed.data;

      const questions = topic
        ? await questionRepo.findByTopic(topic, questionCount)
        : [];

      const test = await testRepo.create(user.userId, topic);
      return reply.code(201).send(successResponse({ testId: test.id, questions }));
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/tests/:id/submit',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = submitTestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send(errorResponse(ErrorCode.VALIDATION_ERROR, 'Invalid input', parsed.error.format()));
      }

      const questionIds = parsed.data.answers.map((a) => a.questionId);
      const questions = await Promise.all(questionIds.map((id) => questionRepo.findById(id)));
      const validQuestions = questions.filter(Boolean) as Array<{
        id: string;
        correctOption: string;
      }>;

      const result = await testRepo.submit(
        request.params.id,
        parsed.data,
        validQuestions,
      );
      return reply.send(successResponse(result));
    },
  );

  fastify.get(
    '/tests',
    { preHandler: requireAuth },
    async (request, reply) => {
      const pagination = parsePaginationQuery(
        request.query as Record<string, unknown>,
      );
      const { rows, total } = await testRepo.findAll(pagination);
      return reply.send(
        paginatedResponse(rows, total, pagination.page, pagination.pageSize),
      );
    },
  );
}
