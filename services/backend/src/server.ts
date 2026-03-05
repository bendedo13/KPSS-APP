import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCors from '@fastify/cors';
import { testsRoutes } from './routes/tests';
import { authRoutes } from './routes/auth';
import { questionsRoutes } from './routes/questions';
import { flashcardsRoutes } from './routes/flashcards';
import { wrongBookRoutes } from './routes/wrong-book';
import { registerGoalsRoutes } from './routes/learning-goals';
import { registerPlansRoutes } from './routes/learning-plans';
import { registerAnalyticsRoutes } from './routes/analytics';
import { registerNotificationsRoutes } from './routes/notifications';
import { registerAdvancedRoutes } from './routes/advanced';
import { getDb, closeDb } from './db';
import { errorResponse, ErrorCode } from '@kpss/shared';

const app = Fastify({ 
  logger: true,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'reqId',
});

// CORS configuration
app.register(fastifyCors, {
  origin: process.env['CORS_ORIGIN']?.split(',') ?? [
    'http://localhost:3000',
    'http://localhost:19006', // Expo default
    'exp://localhost:19000',  // Expo Go
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});

// JWT authentication
app.register(fastifyJwt, {
  secret: process.env['JWT_SECRET'] ?? 'change-me-in-production',
});

// Rate limiting
app.register(fastifyRateLimit, {
  global: true,
  max: parseInt(process.env['RATE_LIMIT_MAX'] ?? '100', 10),
  timeWindow: process.env['RATE_LIMIT_TIME_WINDOW'] ?? '1 minute',
});

// Global error handler
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  
  // JWT verification errors
  if (error.name === 'UnauthorizedError' || error.statusCode === 401) {
    return reply.code(401).send(
      errorResponse(ErrorCode.UNAUTHORIZED, 'Invalid or expired token'),
    );
  }
  
  // Validation errors
  if (error.validation) {
    return reply.code(400).send(
      errorResponse(ErrorCode.VALIDATION_ERROR, 'Validation failed', error.validation),
    );
  }
  
  // Rate limit errors
  if (error.statusCode === 429) {
    return reply.code(429).send(
      errorResponse(ErrorCode.RATE_LIMIT_EXCEEDED, 'Too many requests'),
    );
  }
  
  // Database errors
  if (error.code?.startsWith('23')) {
    return reply.code(409).send(
      errorResponse(ErrorCode.CONFLICT, 'Database constraint violation'),
    );
  }
  
  // Default internal server error
  const statusCode = error.statusCode ?? 500;
  return reply.code(statusCode).send(
    errorResponse(
      ErrorCode.INTERNAL_ERROR,
      process.env['NODE_ENV'] === 'production' 
        ? 'Internal server error' 
        : error.message,
    ),
  );
});

// Register routes
app.register(authRoutes);
app.register(testsRoutes);
app.register(questionsRoutes);
app.register(flashcardsRoutes);
app.register(wrongBookRoutes);
app.register(registerGoalsRoutes);
app.register(registerPlansRoutes);
app.register(registerAnalyticsRoutes);
app.register(registerNotificationsRoutes);
app.register(registerAdvancedRoutes);

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
