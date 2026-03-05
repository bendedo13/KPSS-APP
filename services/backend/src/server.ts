import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { Pool } from 'pg';
import { collectDefaultMetrics, Registry } from 'prom-client';
import { testsRoutes } from './routes/tests';
import { authRoutes } from './routes/auth';
import { dailyTasksRoutes } from './routes/dailyTasks';
import { adminRoutes } from './routes/admin';

const register = new Registry();
collectDefaultMetrics({ register });

export const db = new Pool({ connectionString: process.env.DATABASE_URL });
export const redis = new (require('ioredis'))(process.env.REDIS_URL);

const app = Fastify({ logger: true });

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : false;
app.register(cors, { origin: allowedOrigins });
app.register(jwt, { secret: process.env.JWT_SECRET! });

// Global rate limiting — protects all routes including auth and DB-heavy endpoints
app.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (request) => request.ip,
});

// Health endpoint
app.get('/health', async () => {
  const dbOk = await db.query('SELECT 1').then(() => true).catch(() => false);
  const redisOk = await redis.ping().then((r: string) => r === 'PONG').catch(() => false);
  return {
    status: dbOk && redisOk ? 'ok' : 'degraded',
    db: dbOk ? 'ok' : 'error',
    redis: redisOk ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
  };
});

// Prometheus metrics endpoint (restrict in nginx to internal IPs)
app.get('/metrics', {
  config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
}, async (_req, reply) => {
  reply.type('text/plain');
  return register.metrics();
});

app.register(authRoutes, { prefix: '/auth' });
app.register(testsRoutes, { prefix: '/tests' });
app.register(dailyTasksRoutes, { prefix: '/daily-tasks' });
app.register(adminRoutes, { prefix: '/admin' });

const port = Number(process.env.PORT) || 3001;
app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
});
