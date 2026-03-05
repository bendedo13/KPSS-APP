import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { collectDefaultMetrics, register } from "prom-client";
import healthRoutes from "./routes/health.js";
import testRoutes from "./routes/tests.js";
import dailyTaskRoutes from "./routes/dailyTasks.js";
import { initSentry, captureException } from "./lib/sentry.js";

initSentry();
collectDefaultMetrics();

const app = Fastify({
  logger: true,
});

async function bootstrap(): Promise<void> {
  await app.register(cors, { origin: true });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? "change-me-in-production",
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // Prometheus metrics endpoint
  app.get("/metrics", async (_request, reply) => {
    const metrics = await register.metrics();
    return reply.type(register.contentType).send(metrics);
  });

  // Register route modules
  await app.register(healthRoutes);
  await app.register(testRoutes);
  await app.register(dailyTaskRoutes);

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST ?? "0.0.0.0";

  await app.listen({ port, host });
  app.log.info(`Server listening on ${host}:${port}`);
}

// Graceful shutdown
function shutdown(signal: string): void {
  app.log.info(`Received ${signal} – shutting down`);
  app.close().then(
    () => process.exit(0),
    (err) => {
      captureException(err);
      process.exit(1);
    },
  );
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

bootstrap().catch((err) => {
  captureException(err);
  console.error("Fatal startup error:", err);
  process.exit(1);
});
