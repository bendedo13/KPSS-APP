import 'dotenv/config';
import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import pg from 'pg';
import { callPrimaryLLM, callVerifierLLM, buildPrompt } from './llm_client.js';
import { checkDuplicate } from './duplicate_checker.js';
import { GEN_Q_V1, VERIFY_Q_V1 } from './prompt_templates.js';
import { jobsProcessed, jobsFailed, jobDuration } from './metrics.js';

const { Pool } = pg;

interface AiJobData {
  idempotency_key: string;
  topic: string;
  subtopic: string;
  difficulty: string;
  job_id: string;
}

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpss';
const AUTO_PUBLISH_RATE = parseFloat(process.env.AUTO_PUBLISH_RATE ?? '0.05');
const JOB_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Use IORedis directly but cast to satisfy BullMQ's bundled type expectations
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null }) as unknown as import('bullmq').ConnectionOptions;

const db = new Pool({ connectionString: DATABASE_URL });

function captureError(error: unknown): void {
  // TODO: Integrate Sentry SDK
  // Sentry.captureException(error);
  console.error('[Sentry stub] Error captured:', error);
}

async function checkIdempotency(
  idempotencyKey: string,
): Promise<boolean> {
  const result = await db.query(
    `SELECT status FROM ai_jobs WHERE last_idempotency_key = $1 AND status = 'completed' LIMIT 1`,
    [idempotencyKey],
  );
  return result.rows.length > 0;
}

async function updateJobStatus(
  jobId: string,
  status: string,
  result?: object,
): Promise<void> {
  if (result) {
    await db.query(
      `UPDATE ai_jobs SET status = $1, result = $2, updated_at = NOW() WHERE id = $3`,
      [status, JSON.stringify(result), jobId],
    );
  } else {
    await db.query(
      `UPDATE ai_jobs SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, jobId],
    );
  }
}

async function incrementAttemptCount(jobId: string): Promise<number> {
  const result = await db.query(
    `UPDATE ai_jobs SET attempt_count = attempt_count + 1, status = 'processing', updated_at = NOW()
     WHERE id = $1 RETURNING attempt_count`,
    [jobId],
  );
  return result.rows[0].attempt_count;
}

async function insertJobAttempt(
  jobId: string,
  attemptNumber: number,
): Promise<string> {
  const result = await db.query(
    `INSERT INTO ai_job_attempts (ai_job_id, attempt_number, started_at)
     VALUES ($1, $2, NOW()) RETURNING id`,
    [jobId, attemptNumber],
  );
  return result.rows[0].id;
}

async function completeJobAttempt(attemptId: string): Promise<void> {
  await db.query(
    `UPDATE ai_job_attempts SET completed_at = NOW() WHERE id = $1`,
    [attemptId],
  );
}

async function insertQuestion(
  questionData: {
    text: string;
    options: { label: string; text: string }[];
    correct_option: string;
    difficulty: string;
    topic: string;
    subtopic: string;
    estimated_time_seconds: number;
    explanation: string;
    source: string;
  },
  status: string,
): Promise<string> {
  const result = await db.query(
    `INSERT INTO questions (text, options, correct_option, difficulty, topic, subtopic,
       estimated_time_seconds, explanation, source, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING id`,
    [
      questionData.text,
      JSON.stringify(questionData.options),
      questionData.correct_option,
      questionData.difficulty,
      questionData.topic,
      questionData.subtopic,
      questionData.estimated_time_seconds,
      questionData.explanation,
      questionData.source,
      status,
    ],
  );
  return result.rows[0].id;
}

async function processJob(job: Job<AiJobData>): Promise<void> {
  const startTime = Date.now();
  const timer = jobDuration.startTimer();
  const { idempotency_key, topic, subtopic, difficulty, job_id } = job.data;

  let attemptId: string | undefined;

  try {
    // Step 1: Idempotency check
    const alreadyCompleted = await checkIdempotency(idempotency_key);
    if (alreadyCompleted) {
      console.log(`Job ${job_id} already completed (idempotency_key=${idempotency_key}), skipping.`);
      return;
    }

    // Step 2: Update status to processing and increment attempt count
    const attemptNumber = await incrementAttemptCount(job_id);

    // Step 3: Insert job attempt record
    attemptId = await insertJobAttempt(job_id, attemptNumber);

    // Step 4: Call primary LLM to generate question
    const genPrompt = buildPrompt(GEN_Q_V1, { topic, subtopic, difficulty });
    const generatedQuestion = await callPrimaryLLM(genPrompt);

    // Step 5: Call verifier LLM
    const verifyPrompt = buildPrompt(VERIFY_Q_V1, {
      question_json: JSON.stringify(generatedQuestion, null, 2),
    });
    const verification = await callVerifierLLM(verifyPrompt);

    // Step 6: Duplicate detection
    const duplicateResult = await checkDuplicate(
      generatedQuestion.text,
      db,
    );

    // Step 7: Determine question status
    let questionStatus: string;
    if (
      verification.valid &&
      verification.confidence > 0.7 &&
      !duplicateResult.isDuplicate
    ) {
      questionStatus =
        Math.random() < AUTO_PUBLISH_RATE ? 'auto_accepted' : 'pending_review';
    } else {
      questionStatus = 'pending_review';
    }

    // Step 8: Insert question
    const questionId = await insertQuestion(generatedQuestion, questionStatus);

    // Step 9: Update ai_jobs with completed status
    const resultPayload = {
      question_id: questionId,
      question_status: questionStatus,
      verification,
      duplicate_check: duplicateResult,
    };
    await updateJobStatus(job_id, 'completed', resultPayload);

    // Step 10: Complete job attempt
    if (attemptId) {
      await completeJobAttempt(attemptId);
    }

    const durationMs = Date.now() - startTime;
    console.log(
      `Job ${job_id} completed in ${durationMs}ms. Question ${questionId} status: ${questionStatus}`,
    );

    jobsProcessed.inc({ status: questionStatus });
    timer();
  } catch (error) {
    captureError(error);
    jobsFailed.inc();
    timer();

    try {
      await updateJobStatus(job_id, 'failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      if (attemptId) {
        await completeJobAttempt(attemptId);
      }
    } catch (dbError) {
      console.error('Failed to update job status on error:', dbError);
    }

    throw error;
  }
}

// Enforce job TTL
function isJobExpired(job: Job<AiJobData>): boolean {
  return Date.now() - job.timestamp > JOB_TTL_MS;
}

const worker = new Worker<AiJobData>(
  'ai_questions',
  async (job) => {
    if (isJobExpired(job)) {
      console.warn(`Job ${job.data.job_id} expired (older than 30 minutes), skipping.`);
      await updateJobStatus(job.data.job_id, 'failed', { error: 'Job expired (TTL exceeded)' });
      return;
    }
    await processJob(job);
  },
  {
    connection,
    concurrency: 1,
    limiter: {
      max: 10,
      duration: 60_000,
    },
    settings: {
      backoffStrategy: (attemptsMade: number) => {
        return Math.pow(2, attemptsMade) * 1000;
      },
    },
  },
);

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
  console.error(`[Worker] Job ${job?.id} failed:`, error.message);
});

worker.on('error', (error) => {
  console.error('[Worker] Worker error:', error);
  captureError(error);
});

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  await worker.close();
  (connection as unknown as IORedis).disconnect();
  await db.end();
  console.log('Worker shut down successfully.');
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

console.log('AI Job Worker started. Listening on queue: ai_questions');
