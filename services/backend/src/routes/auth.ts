import { FastifyInstance } from 'fastify';
import { db } from '../server';
import { z } from 'zod';
import crypto from 'crypto';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await db.query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [body.email]
    );
    if (result.rows.length === 0) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    // NOTE: SHA-256 is used for compatibility with the bootstrap_admin_user.sh script.
    // For new user registration flows, use bcrypt or argon2 instead.
    const hash = crypto.createHash('sha256').update(body.password).digest('hex');
    if (hash !== user.password_hash) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
    const token = app.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: '24h' });
    return { token, role: user.role };
  });
}
