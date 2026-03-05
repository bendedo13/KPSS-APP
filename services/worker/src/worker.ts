import { Worker } from 'bullmq';
import { Pool } from 'pg';
import IORedis from 'ioredis';
import { generateQuestion, verifyQuestion } from './llm_client';

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

const AUTO_PUBLISH_RATE = parseFloat(process.env.AUTO_PUBLISH_RATE ?? '0.05');

// Levenshtein similarity stub for duplicate detection
function similarity(a: string, b: string): number {
  // TODO(perf): Replace with pg_trgm similarity query for production — O(1) indexed lookup.
  // Track at: https://github.com/your-org/KPSS-APP/issues (create issue before shipping)
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  // Simple character overlap ratio as stub
  const matches = shorter.split('').filter(c => longer.includes(c)).length;
  return matches / longer.length;
}

const worker = new Worker(
  'generate_questions',
  async (job) => {
    const { ai_job_id, topic, subtopic, difficulty } = job.data;

    console.log(`[worker] Processing job ${job.id} — ai_job_id=${ai_job_id}`);

    // Idempotency: check if already processed
    const existing = await db.query(
      `SELECT id, status FROM ai_jobs WHERE id = $1`,
      [ai_job_id]
    );
    if (existing.rows.length > 0 && existing.rows[0].status !== 'pending') {
      console.log(`[worker] Job ${ai_job_id} already processed (status=${existing.rows[0].status}), skipping`);
      return { skipped: true };
    }

    // Mark as processing
    await db.query(
      `UPDATE ai_jobs SET status='processing', started_at=NOW() WHERE id=$1`,
      [ai_job_id]
    );

    // Log attempt
    const attempt = await db.query(
      `INSERT INTO ai_job_attempts (ai_job_id, attempt_number, started_at)
       VALUES ($1, $2, NOW()) RETURNING id`,
      [ai_job_id, job.attemptsMade + 1]
    );
    const attemptId = attempt.rows[0].id;

    try {
      // 1. Generate question via LLM
      const question = await generateQuestion({ topic, subtopic, difficulty });

      // 2. Verify via verifier LLM
      const verification = await verifyQuestion(question);

      // 3. Duplicate detection stub
      const recent = await db.query(
        `SELECT text FROM questions WHERE topic_id IN (SELECT id FROM topics WHERE name = $1) ORDER BY created_at DESC LIMIT 100`,
        [topic]
      );
      const isDuplicate = recent.rows.some((r: any) => similarity(r.text, question.text) > 0.85);

      if (!verification.valid || isDuplicate) {
        await db.query(
          `UPDATE ai_jobs SET status='failed', error=$2, finished_at=NOW() WHERE id=$1`,
          [ai_job_id, JSON.stringify({ verification, isDuplicate })]
        );
        await db.query(
          `UPDATE ai_job_attempts SET status='failed', finished_at=NOW(), error=$2 WHERE id=$1`,
          [attemptId, JSON.stringify({ verification, isDuplicate })]
        );
        return { success: false, reason: 'verification_failed' };
      }

      // 4. Determine status based on canary rate
      const autoAccept = Math.random() < AUTO_PUBLISH_RATE;
      const questionStatus = autoAccept ? 'active' : 'pending_review';

      // 5. Get or create topic
      let topicRow = await db.query(`SELECT id FROM topics WHERE name = $1`, [topic]);
      if (topicRow.rows.length === 0) {
        topicRow = await db.query(
          `INSERT INTO topics (name) VALUES ($1) RETURNING id`, [topic]
        );
      }
      const topicId = topicRow.rows[0].id;

      // 6. Insert question
      await db.query(
        `INSERT INTO questions (ai_job_id, topic_id, text, options, correct_option, difficulty,
           explanation, source, status, estimated_time_seconds)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          ai_job_id, topicId, question.text, JSON.stringify(question.options),
          question.correct_option, question.difficulty, question.explanation,
          question.source, questionStatus, question.estimated_time_seconds,
        ]
      );

      // 7. Update job status
      const finalStatus = autoAccept ? 'accepted' : 'pending_review';
      await db.query(
        `UPDATE ai_jobs SET status=$2, finished_at=NOW() WHERE id=$1`,
        [ai_job_id, finalStatus]
      );
      await db.query(
        `UPDATE ai_job_attempts SET status='success', finished_at=NOW() WHERE id=$1`,
        [attemptId]
      );

      // Sentry stub — replace with real Sentry SDK
      if (process.env.SENTRY_DSN) {
        console.log(`[sentry-stub] Job ${ai_job_id} completed: ${finalStatus}`);
      }

      console.log(`[worker] Job ${ai_job_id} done — status=${finalStatus}`);
      return { success: true, status: finalStatus };
    } catch (err: any) {
      await db.query(
        `UPDATE ai_jobs SET status='failed', error=$2, finished_at=NOW() WHERE id=$1`,
        [ai_job_id, err.message]
      );
      await db.query(
        `UPDATE ai_job_attempts SET status='failed', finished_at=NOW(), error=$2 WHERE id=$1`,
        [attemptId, err.message]
      );
      throw err; // BullMQ will retry
    }
  },
  {
    connection: redis,
    concurrency: 3,
    limiter: { max: 10, duration: 60_000 }, // 10 jobs per minute
  }
);

worker.on('failed', (job, err) => {
  console.error(`[worker] Job ${job?.id} failed: ${err.message}`);
});

worker.on('completed', (job) => {
  console.log(`[worker] Job ${job.id} completed`);
});

// Metrics to stdout (Prometheus scrape via /metrics endpoint on backend)
setInterval(() => {
  worker.getWorkerInfo().then((info: any) => {
    console.log(`[metrics] worker_active=${info?.activeCount ?? 0}`);
  }).catch(() => {});
}, 30_000);

console.log('[worker] KPSS AI worker started');
