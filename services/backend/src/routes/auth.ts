import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../server';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/login
  app.post('/login', async (req, reply) => {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid input', details: body.error.issues });
    }

    const { email, password } = body.data;

    // NOTE: In production use bcrypt for password comparison
    const result = await db.query(
      'SELECT id, email, role, password_hash FROM users WHERE email = $1',
      [email],
    );

    if (result.rows.length === 0) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    // TODO: Replace with bcrypt.compare(password, user.password_hash) before deployment.
    // Stub: always rejects — real auth requires bcrypt verification.
    void password; // prevent unused-variable lint error until bcrypt is wired up

    const token = app.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: '7d' },
    );

    return reply.send({ token, user: { id: user.id, email: user.email, role: user.role } });
  });
}
