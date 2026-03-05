import client from 'prom-client';

const register = new client.Registry();

client.collectDefaultMetrics({ register });

export const jobsProcessed = new client.Counter({
  name: 'worker_jobs_processed_total',
  help: 'Total number of AI jobs processed successfully',
  labelNames: ['status'] as const,
  registers: [register],
});

export const jobsFailed = new client.Counter({
  name: 'worker_jobs_failed_total',
  help: 'Total number of AI jobs that failed',
  registers: [register],
});

export const jobDuration = new client.Histogram({
  name: 'worker_job_duration_seconds',
  help: 'Duration of AI job processing in seconds',
  buckets: [0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600],
  registers: [register],
});

export { register };
