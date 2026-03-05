# Scaling & Cost Control (PART 13)

Guidelines for scaling the platform efficiently while keeping costs under control.

---

## LLM Batching

- **Group generation requests:** collect up to N questions per batch before dispatching to the LLM (configurable via `WORKER_BATCH_SIZE`, default 10).
- **Parallelize verification calls:** once a batch of questions is generated, fan out verification requests concurrently.
- **Queue prioritization:** use priority queues in Redis so that admin-requested generations run before scheduled background jobs.

---

## Caching Strategy

| What | Where | TTL | Notes |
|---|---|---|---|
| Embedding vectors | Redis | 24 hours | Avoids recomputing embeddings for the same text |
| RAG retrieval results | Redis | 24 hours | Caches context chunks used for generation |
| LLM responses | Redis | 72 hours | Keyed by SHA-256 hash of the full prompt input |
| API responses | HTTP | ETag-based | Clients use `If-None-Match` to avoid redundant transfers |

---

## Rate Limiting

| Scope | Limit | Window |
|---|---|---|
| Per-user API requests | 100 requests | 1 minute |
| Per-user LLM generations | 10 requests | 1 hour |
| Global LLM calls | 1,000 requests | 1 hour |
| Worker queue throughput | Configurable | Rolling window |

- Rate limits are enforced at the API gateway layer (Fastify plugin) and at the worker queue level.
- Queue-based throttling prevents the worker from overwhelming the LLM provider during burst traffic.

---

## Vector Storage

- **Extension:** Use the `pgvector` PostgreSQL extension for storing and querying embeddings locally.
- **Duplicate detection:** Before publishing any AI-generated question, compute its embedding and perform a nearest-neighbor search against existing questions. If cosine similarity exceeds the threshold (`VECTOR_SIMILARITY_THRESHOLD`, default 0.92), flag it as a potential duplicate.
- **Impact:** Reduces repeated LLM calls by approximately 40% by catching duplicate or near-duplicate generation requests early.

---

## Cost Estimates

Approximate costs per 1,000 questions generated (generation + verification):

| Model | Generation Cost | Verification Cost | Total per 1K Questions |
|---|---|---|---|
| GPT-4 | ~$30 | ~$15 | ~$45 |
| GPT-4 Turbo | ~$15 | ~$7.50 | ~$22.50 |
| GPT-3.5 Turbo | ~$2 | ~$1 | ~$3 |
| Local model (Mistral 7B) | ~$0 (compute only) | ~$0 (compute only) | Hardware cost only |

### Recommendations

- **Development / testing:** Use GPT-3.5 Turbo or a local model to minimize costs.
- **Production (quality-critical):** Use GPT-4 or GPT-4 Turbo for generation; GPT-3.5 Turbo is acceptable for verification.
- **High volume:** Consider a local model for first-pass generation and GPT-4 for verification only, reducing costs by ~60%.

---

## Legal & Licensing Checklist

- [ ] Verify no paywalled content is being scraped
- [ ] Ensure all imported questions have proper licensing
- [ ] Maintain audit trail for AI-generated content
- [ ] Human review required for >5% of questions
- [ ] KVKK (Turkish GDPR) compliance for user data
- [ ] Regular content audits scheduled
- [ ] IP violation monitoring in place

> **TODO:** Add content licensing agreements before production use.

> ⚠️ **WARNING:** Do not scrape paywalled exam books or courses without an explicit licensing agreement. Violation may result in legal action and platform takedown.
