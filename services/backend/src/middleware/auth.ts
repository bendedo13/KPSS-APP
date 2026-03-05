import type { FastifyRequest, FastifyReply } from 'fastify';
import { errorResponse, ErrorCode } from '@kpss/shared';

/**
 * Fastify preHandler hook that validates the JWT attached to the request.
 * Defined once here so it is not duplicated across every route file.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    reply
      .code(401)
      .send(errorResponse(ErrorCode.UNAUTHORIZED, 'Authentication required.'));
  }
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await requireAuth(request, reply);
  if (reply.sent) {
    return;
  }
  const payload = request.user as { role?: string };
  if (payload?.role !== 'admin') {
    reply
      .code(403)
      .send(errorResponse(ErrorCode.FORBIDDEN, 'Admin access required.'));
  }
}
