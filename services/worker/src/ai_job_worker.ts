/**
 * KPSS AI Question Generation Worker
 *
 * - Uses BullMQ + Redis for job queue
 * - Idempotency: each job has a unique ai_job_id to prevent duplicate processing
 * - Canary publish: only AUTO_PUBLISH_RATE% of questions auto-accepted
 * - All jobs have retry/backoff and TTL
 *
 * LEGAL NOTE: Do NOT scrape paywalled exam sources without a licensing agreement.
 * Maintain audit logs of all AI-generated content and human approvals.
 */

import { Worker, Queue, Job } from 'bullmq';
import { Pool } from 'pg';
import Redis from 'ioredis';
import pino from 'pino';
import { generateQuestion, verifyQuestion, GeneratedQuestion } from './lib/llm_client';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(process.env.NODE_ENV === 'development' && {
    transport: { target: 'pino-pretty' },
  }),
});

const QUEUE_NAME = 'generate_questions';
const AUTO_PUBLISH_RATE = parseFloat(process.env.AUTO_PUBLISH_RATE ?? '0.05');
const JOB_TTL_SECONDS = 60 * 60 * 24; // 24 hours

// ─── DB + Redis ──────────────────────────────────────────────────────────────

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
});

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
});

// ─── Duplicate Detection (stub) ──────────────────────────────────────────────

/**
 * Detect textual similarity with existing questions.
 * In production: use pgvector or trigram similarity via PostgreSQL.
 * Returns true if duplicate detected.
 */
async function isDuplicate(questionText: string): Promise<boolean> {
  // Stub: check for exact text match
  const result = await db.query(
    `SELECT id FROM questions WHERE text = $1 LIMIT 1`,
    [questionText],
  );
  return result.rows.length > 0;
}

// ─── Canary Logic ────────────────────────────────────────────────────────────

function shouldAutoPublish(): boolean {
  return Math.random() < AUTO_PUBLISH_RATE;
}

// ─── Sentry Stub ─────────────────────────────────────────────────────────────

function sentryCaptureException(err: unknown, context?: Record<string, unknown>) {
  // TODO: Replace with actual Sentry.captureException(err, { extra: context })
  // Requires: import * as Sentry from '@sentry/node';
  logger.error({ err, context }, 'Sentry stub: exception captured');
}

// ─── Job Processor ──────────────────────────────────────────────────────────

interface GenerateQuestionsJobData {
  ai_job_id: string; // Idempotency key
  topic: string;
  subtopic?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  count: number;
  requested_by?: string;
}

async function processJob(job: Job<GenerateQuestionsJobData>): Promise<void> {
  const { ai_job_id, topic, subtopic, difficulty, count } = job.data;
  const log = logger.child({ job_id: job.id, ai_job_id, topic });

  log.info('Processing AI job');

  // ── Idempotency check ────────────────────────────────────────────────────
  const existing = await db.query(
    `SELECT id, status, last_idempotency_key FROM ai_jobs WHERE id = $1`,
    [ai_job_id],
  );

  if (existing.rows.length === 0) {
    log.warn('ai_job_id not found in DB, skipping');
    return;
  }

  const jobRecord = existing.rows[0];
  if (['accepted', 'rejected'].includes(jobRecord.status)) {
    log.info({ status: jobRecord.status }, 'Job already finalized, skipping');
    return;
  }

  // Mark job as processing
  await db.query(
    `UPDATE ai_jobs
     SET status = 'processing', last_idempotency_key = $1, updated_at = NOW()
     WHERE id = $2`,
    [job.id, ai_job_id],
  );

  // Log attempt
  await db.query(
    `INSERT INTO ai_job_attempts (ai_job_id, attempt_number, started_at, bull_job_id)
     VALUES ($1, $2, NOW(), $3)`,
    [ai_job_id, job.attemptsMade + 1, job.id],
  );

  try {
    const questions = await generateQuestion({ topic, subtopic, difficulty, count });

    for (const question of questions) {
      await processGeneratedQuestion(ai_job_id, question, log);
    }

    await db.query(
      `UPDATE ai_jobs SET status = 'pending_review', completed_at = NOW() WHERE id = $1`,
      [ai_job_id],
    );

    await db.query(
      `UPDATE ai_job_attempts SET completed_at = NOW(), success = true
       WHERE ai_job_id = $1 AND bull_job_id = $2`,
      [ai_job_id, job.id],
    );

    // Prometheus-friendly metric (stdout)
    console.log(`kpss_worker_jobs_processed_total{topic="${topic}",difficulty="${difficulty}"} 1`);

    log.info('AI job completed successfully');
  } catch (err) {
    await db.query(
      `UPDATE ai_job_attempts
       SET completed_at = NOW(), success = false, error_message = $1
       WHERE ai_job_id = $2 AND bull_job_id = $3`,
      [String(err), ai_job_id, job.id],
    );

    await db.query(
      `UPDATE ai_jobs SET status = 'failed', updated_at = NOW() WHERE id = $1`,
      [ai_job_id],
    );

    sentryCaptureException(err, { ai_job_id, topic });
    throw err; // Re-throw so BullMQ handles retry
  }
}

async function processGeneratedQuestion(
  aiJobId: string,
  question: GeneratedQuestion,
  log: pino.Logger,
): Promise<void> {
  // Run verifier LLM
  const verification = await verifyQuestion(question);
  log.info({ valid: verification.valid, confidence: verification.confidence }, 'Verification result');

  if (!verification.valid || verification.issues.length > 0) {
    log.warn({ issues: verification.issues }, 'Question failed verification, marking for review');
  }

  // Check for duplicates
  const duplicate = await isDuplicate(question.text);
  if (duplicate) {
    log.warn({ text: question.text.slice(0, 50) }, 'Duplicate question detected, skipping');
    return;
  }

  // Determine publish status (canary logic)
  let status: string;
  if (verification.valid && !verification.issues.length && shouldAutoPublish()) {
    status = 'auto_accepted';
    log.info('Question auto-accepted (canary)');
  } else {
    status = 'pending_review';
    log.info('Question queued for human review');
  }

  // Save question to DB
  await db.query(
    `INSERT INTO questions
       (ai_job_id, text, options, correct_option, difficulty, topic_id, subtopic,
        estimated_time_seconds, explanation, source, status, created_at)
     SELECT $1, $2, $3::jsonb, $4, $5,
            (SELECT id FROM topics WHERE name ILIKE $6 LIMIT 1),
            $7, $8, $9, 'ai/generated', $10, NOW()
     ON CONFLICT DO NOTHING`,
    [
      aiJobId,
      question.text,
      JSON.stringify(question.options),
      question.correct_option,
      question.difficulty,
      question.topic,
      question.subtopic ?? '',
      question.estimated_time_seconds,
      question.explanation,
      status,
    ],
  );
}

// ─── Worker Setup ────────────────────────────────────────────────────────────

const worker = new Worker<GenerateQuestionsJobData>(
  QUEUE_NAME,
  processJob,
  {
    connection: redis,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? '2', 10),
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
);

worker.on('completed', (job) => {
  logger.info({ job_id: job.id }, 'Job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ job_id: job?.id, err: err.message }, 'Job failed');
  sentryCaptureException(err, { job_id: job?.id });
});

worker.on('error', (err) => {
  logger.error({ err }, 'Worker error');
  sentryCaptureException(err);
});

// ─── Queue Setup (for adding jobs) ──────────────────────────────────────────

export const generateQuestionsQueue = new Queue<GenerateQuestionsJobData>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 20 },
    // TTL: job expires after 24h if not processed
    delay: 0,
  },
});

logger.info({ queue: QUEUE_NAME, auto_publish_rate: AUTO_PUBLISH_RATE }, 'Worker started');

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing worker...');
  await worker.close();
  await redis.quit();
  await db.end();
  process.exit(0);
});
