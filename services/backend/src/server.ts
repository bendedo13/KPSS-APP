import Fastify from 'fastify';
import fastifyJWT from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { testsRoutes } from './routes/tests';
import { authRoutes } from './routes/auth';
import { dailyTasksRoutes } from './routes/dailyTasks';
import { adminRoutes } from './routes/admin';
import { flashcardsRoutes } from './routes/flashcards';
import { wrongBookRoutes } from './routes/wrongBook';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    ...(process.env.NODE_ENV === 'development' && {
      transport: { target: 'pino-pretty' },
    }),
  },
});

async function bootstrap() {
  // Fail fast in production if JWT_SECRET is not configured
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable must be set in production');
  }

  // Plugins
  await app.register(fastifyHelmet);
  await app.register(fastifyCors, {
    origin: process.env.CORS_ORIGIN ?? false,
    credentials: true,
  });
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });
  await app.register(fastifyJWT, {
    secret: process.env.JWT_SECRET ?? 'change-me-in-production',
  });

  // Health check
  app.get('/health', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (_req, reply) => {
    const status: Record<string, string> = { api: 'ok' };
    try {
      await db.query('SELECT 1');
      status['db'] = 'ok';
    } catch {
      status['db'] = 'error';
    }
    try {
      await redis.ping();
      status['redis'] = 'ok';
    } catch {
      status['redis'] = 'error';
    }
    // Prometheus-friendly metrics endpoint hint
    status['metrics'] = '/metrics';
    const healthy = Object.values(status).every((v) => v === 'ok' || v === '/metrics');
    return reply.status(healthy ? 200 : 503).send(status);
  });

  // Metrics endpoint (Prometheus-friendly stub)
  app.get('/metrics', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (_req, reply) => {
    return reply.type('text/plain').send(
      '# HELP kpss_api_requests_total Total API requests\n' +
      '# TYPE kpss_api_requests_total counter\n' +
      'kpss_api_requests_total 0\n',
    );
  });

  // Routes
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(testsRoutes, { prefix: '/tests' });
  await app.register(dailyTasksRoutes, { prefix: '/daily-tasks' });
  await app.register(adminRoutes, { prefix: '/admin' });
  await app.register(flashcardsRoutes, { prefix: '/flashcards' });
  await app.register(wrongBookRoutes, { prefix: '/wrong-book' });

  // Verify DB connectivity (query instead of connect() to avoid leaking a client)
  await db.query('SELECT 1');
  await redis.connect();

  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Backend running on ${HOST}:${PORT}`);
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
