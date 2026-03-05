# Scaling, Cost Control & Legal Checklist

## LLM Cost Control

### Batching
- Group question generation requests: instead of 1 API call per question, send N questions per batch (e.g. N=5).
- Configure via `requested_count` in `ai_jobs` table (default 5 per job).
- Worker processes all N questions in a single LLM API call.

### Caching
- Cache LLM responses for identical (topic, subtopic, difficulty) combinations for 24 hours.
- Use Redis with TTL: `SET cache:gen_q:{topic}:{subtopic}:{difficulty} <response> EX 86400`
- Cache RAG (Retrieval Augmented Generation) embeddings for 24 hours.
- Cache vector search results to avoid repeated pgvector queries.

### Rate Limiting
- Per-user limit: max 50 LLM-backed requests per hour (configurable via `USER_LLM_RATE_LIMIT`).
- Global limit: max 500 LLM API calls per hour to control costs (configurable via `GLOBAL_LLM_RATE_LIMIT`).
- Implement backpressure: if BullMQ queue depth > 100, reject new generation requests with 429.

### Vector Similarity (Duplicate Detection)
- Use `pgvector` extension for PostgreSQL to store question embeddings.
- Before inserting a new AI question, do nearest-neighbor search: `SELECT id FROM questions ORDER BY embedding <=> $1 LIMIT 5`.
- If cosine similarity > 0.95, mark as duplicate and skip.
- Self-hosted options: `pgvector` (free), Supabase (hosted pgvector).
- This reduces duplicate LLM calls and avoids repetitive questions.

### Monitoring
- Track per-topic generation costs in `ai_jobs` table.
- Add `llm_tokens_used` and `llm_cost_usd` columns to `ai_jobs` for cost tracking.
- Alert when daily spend exceeds threshold (Sentry or custom webhook).

---

## Scaling Architecture

### Current (single VPS)
- All services on one VPS with Docker Compose.
- Suitable for up to ~10,000 active users.

### Horizontal Scaling (when needed)
1. **Database**: Add read replicas for `SELECT` queries (questions, flashcards). Backend reads from replica, writes to primary.
2. **Worker**: Run multiple worker instances (increase `WORKER_CONCURRENCY` or add more containers). BullMQ handles distributed processing automatically.
3. **Backend**: Add a load balancer (HAProxy or Nginx upstream with multiple backends). Sessions are stateless (JWT), so no sticky sessions needed.
4. **Redis**: Upgrade to Redis Sentinel or Redis Cluster for HA.

### CDN
- Serve mobile app assets through a CDN (Cloudflare, AWS CloudFront).
- Cache API responses for read-heavy endpoints (topic lists, published questions) at CDN level with short TTL (5 minutes).

---

## Legal & Licensing Checklist

> ⚠️ **IMPORTANT**: Failure to comply with copyright law can result in legal liability.

- [ ] **Do NOT** scrape paywalled exam preparation books (Pegem, Yediiklim, etc.) without a valid licensing agreement.
- [ ] **Do NOT** reproduce verbatim text from official ÖSYM exams without authorization.
- [ ] **DO** maintain audit logs of all AI-generated content with:
  - Generation timestamp
  - LLM model version used
  - Human reviewer ID and approval timestamp
  - Original prompt used (stored in `ai_jobs` table)
- [ ] **DO** add `source: "ai/generated"` to all AI-generated questions and make this visible to users.
- [ ] **DO** provide a mechanism for users to report incorrect or inappropriate questions.
- [ ] **DO** obtain explicit consent from content authors if importing licensed materials.
- [ ] **DO** review GDPR/KVKK (Turkish Personal Data Protection Law) compliance for user data storage.
- [ ] **DO** implement a right-to-deletion mechanism for user data (KVKK Article 7).
- [ ] **DO** store minimum necessary user data (email, progress — no unnecessary PII).

### AI Content Disclosure
Add a visible disclaimer in the mobile app:
> "Bu uygulama yapay zeka ile üretilmiş içerikler barındırabilir. Tüm AI sorular insan editörler tarafından onaylanmaktadır."
> ("This app may contain AI-generated content. All AI questions are reviewed by human editors.")

### Content Confidence Levels
- `confidence: "low"` → Always requires human review, never auto-published.
- `confidence: "medium"` → Subject to canary rate (5% auto-publish).
- `confidence: "high"` → Subject to canary rate (5% auto-publish).

---

## Observability

### Sentry Integration
Replace `sentryCaptureException` stubs in worker with:
```typescript
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
```

### Prometheus Metrics
The backend exposes a stub at `/metrics`. Replace with actual counters:
```typescript
import client from 'prom-client';
const requestCounter = new client.Counter({
  name: 'kpss_api_requests_total',
  help: 'Total API requests',
  labelNames: ['method', 'route', 'status'],
});
```

Scrape with Prometheus and visualize with Grafana.
