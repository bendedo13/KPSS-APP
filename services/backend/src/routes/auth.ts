import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { db } from '../server';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/login — strict rate limit to mitigate brute-force attacks
  app.post('/login', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid input', details: body.error.issues });
    }

    const { email, password } = body.data;

    const result = await db.query(
      'SELECT id, email, role, password_hash FROM users WHERE email = $1',
      [email],
    );

    if (result.rows.length === 0) {
      // Use constant-time comparison even on not-found to prevent user enumeration
      await bcrypt.compare(password, '$2b$12$invalidhashfortimingprotection000000000000000000000000');
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = app.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: '7d' },
    );

    return reply.send({ token, user: { id: user.id, email: user.email, role: user.role } });
  });
}
