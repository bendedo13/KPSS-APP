import { FastifyInstance } from "fastify";
import pool from "../lib/db.js";
import redis from "../lib/redis.js";

export default async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_request, reply) => {
    let dbOk = false;
    let redisOk = false;

    try {
      await pool.query("SELECT 1");
      dbOk = true;
    } catch {
      /* db unreachable */
    }

    try {
      const pong = await redis.ping();
      redisOk = pong === "PONG";
    } catch {
      /* redis unreachable */
    }

    const status = dbOk && redisOk ? "ok" : dbOk || redisOk ? "degraded" : "down";
    const code = status === "down" ? 503 : 200;

    return reply.code(code).send({
      status,
      db: dbOk,
      redis: redisOk,
      timestamp: new Date().toISOString(),
    });
  });
}
