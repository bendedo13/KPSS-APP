import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import {
  loginSchema,
  registerSchema,
  successResponse,
  errorResponse,
  ErrorCode,
} from '@kpss/shared';
import { getDb } from '../db';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const db = getDb();

  fastify.post('/auth/register', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send(errorResponse(ErrorCode.VALIDATION_ERROR, 'Invalid input', parsed.error.format()));
    }

    const { email, password, name } = parsed.data;
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return reply.code(409).send(errorResponse(ErrorCode.CONFLICT, 'Email already registered.'));
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, role, created_at`,
      [email, passwordHash, name],
    );
    const user = result.rows[0];
    const token = fastify.jwt.sign({ userId: user.id, email: user.email, role: user.role });
    return reply.code(201).send(successResponse({ user, accessToken: token }));
  });

  fastify.post('/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send(errorResponse(ErrorCode.VALIDATION_ERROR, 'Invalid input', parsed.error.format()));
    }

    const { email, password } = parsed.data;
    const result = await db.query(
      'SELECT id, email, name, role, password_hash FROM users WHERE email = $1',
      [email],
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash as string))) {
      return reply
        .code(401)
        .send(errorResponse(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password.'));
    }

    const token = fastify.jwt.sign({ userId: user.id, email: user.email, role: user.role });
    return reply.send(
      successResponse({
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        accessToken: token,
      }),
    );
  });
}
