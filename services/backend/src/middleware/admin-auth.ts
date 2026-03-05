import type { FastifyRequest, FastifyReply } from 'fastify';
import { AdminRepository } from '../db/admin.repository';

/**
 * Admin Authentication Middleware
 * Admin JWT token doğrulaması ve yetkilendirmesi
 */

export async function adminAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : '';

    if (!token) {
      return reply.status(401).send({ error: 'NO_TOKEN' });
    }

    // Verify JWT using fastify-jwt plugin
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'INVALID_TOKEN' });
    }

    const payload = request.user as any;
    const admin = await AdminRepository.findAdminById(payload.sub);

    if (!admin || !admin.is_active) {
      return reply.status(401).send({ error: 'INVALID_ADMIN' });
    }

    (request as any).admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    };
  } catch (error) {
    return reply.status(401).send({ error: 'INVALID_TOKEN' });
  }
}

// Role-based access control
export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await adminAuth(request, reply);

    const admin = (request as any).admin;
    if (!admin || !roles.includes(admin.role)) {
      return reply.status(403).send({ error: 'INSUFFICIENT_PERMISSIONS' });
    }
  };
}

export async function checkAdminPermission(adminId: string, permission: string): Promise<boolean> {
  const admin = await AdminRepository.findAdminById(adminId);

  if (!admin) {
    return false;
  }

  // Super admin has all permissions
  if (admin.role === 'super_admin') {
    return true;
  }

  // TODO: Implement permission checking based on role
  return true;
}

export async function logAdminAction(
  request: FastifyRequest,
  action: string,
  resourceType: string,
  resourceId: string | null,
  changes: any
) {
  const admin = (request as any).admin;
  if (!admin) return;

  const ip = request.ip || 'unknown';
  const userAgent = (request.headers && (request.headers['user-agent'] as string)) || 'unknown';

  await AdminRepository.logAdminAction(
    admin.id,
    action,
    resourceType,
    resourceId,
    changes,
    ip,
    userAgent,
    'success'
  );
}
