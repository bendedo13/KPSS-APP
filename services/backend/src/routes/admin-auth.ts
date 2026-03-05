/**
 * Admin Authentication Routes
 * Admin login, logout ve token yönetimi
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AdminRepository } from '../db/admin.repository';
import { adminAuth, logAdminAction } from '../middleware/admin-auth';

export async function registerAdminAuthRoutes(fastify: FastifyInstance) {
  // Admin Login
  fastify.post('/admin/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, password } = request.body as { email: string; password: string };

      if (!email || !password) {
        return reply.status(400).send({ error: 'MISSING_CREDENTIALS' });
      }

      const admin = await AdminRepository.findAdminByEmail(email);

      if (!admin) {
        return reply.status(401).send({ error: 'INVALID_CREDENTIALS' });
      }

      const passwordValid = await AdminRepository.verifyAdminPassword(admin, password);

      if (!passwordValid) {
        return reply.status(401).send({ error: 'INVALID_CREDENTIALS' });
      }

      if (!admin.is_active) {
        return reply.status(403).send({ error: 'ADMIN_INACTIVE' });
      }

      // Update last login
      await AdminRepository.updateLastLogin(admin.id);

      // Generate JWT token
      const token = fastify.jwt.sign(
        { sub: admin.id, email: admin.email, role: admin.role },
        { expiresIn: '24h' }
      );

      // Log admin login
      await AdminRepository.logAdminAction(
        admin.id,
        'login',
        'admin',
        admin.id,
        { email },
        request.ip,
        request.headers['user-agent']
      );

      return reply.status(200).send({
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          full_name: admin.full_name,
          role: admin.role,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Admin Verify Token
  fastify.get('/admin/auth/verify', { onRequest: adminAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const admin = (request as any).admin;
      const adminRecord = await AdminRepository.findAdminById(admin.id);

      if (!adminRecord) {
        return reply.status(401).send({ error: 'INVALID_ADMIN' });
      }

      return reply.status(200).send({
        admin: {
          id: adminRecord.id,
          email: adminRecord.email,
          full_name: adminRecord.full_name,
          role: adminRecord.role,
          is_active: adminRecord.is_active,
          last_login: adminRecord.last_login,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Admin Logout
  fastify.post('/admin/auth/logout', { onRequest: adminAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const admin = (request as any).admin;
      await AdminRepository.logAdminAction(
        admin.id,
        'logout',
        'admin',
        admin.id,
        {},
        request.ip,
        request.headers['user-agent'] as string
      );

      return reply.status(200).send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Get all admins (super_admin only)
  fastify.get('/admin/users', { onRequest: adminAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const admin = (request as any).admin;
      if (admin.role !== 'super_admin' && admin.role !== 'admin') {
        return reply.status(403).send({ error: 'INSUFFICIENT_PERMISSIONS' });
      }

      const admins = await AdminRepository.getAllAdmins();

      await logAdminAction(request, 'read', 'admins', null, {});

      return reply.status(200).send({ admins });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Create new admin (super_admin only)
  fastify.post('/admin/users', { onRequest: adminAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const admin = (request as any).admin;
      if (admin.role !== 'super_admin') {
        return reply.status(403).send({ error: 'INSUFFICIENT_PERMISSIONS' });
      }

      const { email, password, full_name, role } = request.body as any;

      if (!email || !password || !full_name) {
        return reply.status(400).send({ error: 'MISSING_FIELDS' });
      }

      const newAdmin = await AdminRepository.createAdmin(email, password, full_name, role || 'admin');

      await logAdminAction(request, 'create', 'admin', newAdmin.id, { email, full_name, role });

      return reply.status(201).send({ admin: newAdmin });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });

  // Update admin
  fastify.put('/admin/users/:id', { onRequest: adminAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const admin = (request as any).admin;
      const { id } = request.params as any;

      if (admin.role !== 'super_admin' && admin.id !== id) {
        return reply.status(403).send({ error: 'INSUFFICIENT_PERMISSIONS' });
      }

      const updates = request.body as any;

      const updatedAdmin = await AdminRepository.updateAdmin(id, updates);

      await logAdminAction(request, 'update', 'admin', id, updates);

      return reply.status(200).send({ admin: updatedAdmin });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_ERROR' });
    }
  });
}
