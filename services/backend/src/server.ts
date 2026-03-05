import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import { testsRoutes } from './routes/tests';
import { authRoutes } from './routes/auth';
import { questionsRoutes } from './routes/questions';
import { getDb, closeDb } from './db';

const app = Fastify({ logger: true });

app.register(fastifyJwt, {
  secret: process.env['JWT_SECRET'] ?? 'change-me-in-production',
});

app.register(fastifyRateLimit, {
  global: true,
  max: 100,
  timeWindow: '1 minute',
});

app.register(authRoutes);
app.register(testsRoutes);
app.register(questionsRoutes);

app.get('/health', {
  config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
}, async (_request, reply) => {
  const db = getDb();
  try {
    await db.query('SELECT 1');
    reply.send({ status: 'ok', db: 'ok' });
  } catch {
    reply.code(503).send({ status: 'error', db: 'unavailable' });
  }
});

const start = async (): Promise<void> => {
  try {
    const port = parseInt(process.env['PORT'] ?? '3000', 10);
    await app.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    await closeDb();
    process.exit(1);
  }
};

start();
