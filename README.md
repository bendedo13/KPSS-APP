# KPSS Hazırlık Platform

Production-ready monorepo for KPSS exam preparation with microlearning, AI question generation, SRS (Spaced Repetition System), and analytics.

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

---

## ⚠️ Legal & Licensing Notice

> **You MUST read and follow these rules before contributing content or deploying this platform.**

- **Do NOT scrape paywalled sources** without a licensing agreement.
- **Do NOT import copyrighted exam book content** without explicit permission from the rights holder.
- **Maintain audit logs** of all human approvals for AI-generated content.
- **All AI-generated questions must be reviewed** by a qualified human before wide publication.

See [PART 13 – Scaling & Legal Notes](docs/scaling-notes.md) for the full legal checklist and compliance details.

---

## Architecture Overview

```
├── apps/
│   ├── admin/          # Next.js admin panel
│   └── mobile/         # Expo React Native app
├── services/
│   ├── backend/        # Fastify API server
│   └── worker/         # AI job orchestrator
├── infra/
│   ├── docker/         # Docker Compose + deploy scripts
│   └── nginx/          # Nginx config templates
├── migrations/         # PostgreSQL migrations
├── scripts/            # Utility scripts
└── docs/               # Documentation
```

---

## Quick Start (Local Development)

1. **Clone the repo**

   ```bash
   git clone <REPO_URL> && cd KPSS-APP
   ```

2. **Copy the environment file and fill in values**

   ```bash
   cp .env.example .env
   # Edit .env with your database credentials, API keys, etc.
   ```

3. **Start infrastructure services**

   ```bash
   docker compose up -d postgres redis
   ```

4. **Run database migrations**

   ```bash
   # From the project root
   npm run migrate        # or the migration command configured in your project
   ```

5. **Start the backend API**

   ```bash
   cd services/backend && npm install && npm run dev
   ```

6. **Start the AI worker**

   ```bash
   cd services/worker && npm install && npm run dev
   ```

7. **Start the admin panel**

   ```bash
   cd apps/admin && npm install && npm run dev
   ```

8. **Start the mobile app**

   ```bash
   cd apps/mobile && npm install && npm start
   ```

---

## 🚀 VPS Deployment (Production)

### Safety Checklist Before Deploy

- [ ] Check free disk space: `df -h`
- [ ] Check Docker version: `docker --version` (requires 24+)
- [ ] Check existing compose projects: `docker compose ls`
- [ ] Check existing Nginx configs: `ls /etc/nginx/sites-enabled/`
- [ ] Verify no port conflicts in 30000-39999 range: `ss -ltnn | grep '3[0-9]{4}'`

### Deployment Steps

```bash
# 1. Run dry-run to see planned configuration
./infra/docker/deploy_safe.sh dry-run

# 2. Inspect the plan
cat .deploy/plan.json

# 3. Run port collision check
./infra/docker/deploy_safe.sh check

# 4. If all clear, deploy with confirmation
./infra/docker/deploy_safe.sh start --confirm

# 5. Generate Nginx config
./scripts/generate_nginx_conf.sh --domain yourdomain.com --write

# 6. Visit admin panel
open http://admin.yourdomain.com
```

### Rollback & Cleanup

```bash
# Stop all services
./infra/docker/deploy_safe.sh stop

# Full cleanup (removes volumes too)
./infra/docker/cleanup.sh

# Or dry-run cleanup first
./infra/docker/cleanup.sh --dry-run
```

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@localhost:5432/kpss` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key for signing JWTs | `super-secret-key` |
| `LLM_API_KEY` | API key for the LLM provider (OpenAI, etc.) | `sk-...` |
| `LLM_MODEL` | Model identifier for question generation | `gpt-4` |
| `LLM_VERIFIER_MODEL` | Model identifier for question verification | `gpt-4` |
| `AUTO_PUBLISH_RATE` | Fraction of AI questions auto-published (canary) | `0.05` |
| `WORKER_CONCURRENCY` | Number of concurrent AI jobs the worker processes | `4` |
| `RATE_LIMIT_PER_USER` | Max API requests per user per minute | `100` |
| `RATE_LIMIT_LLM_USER` | Max LLM generation requests per user per hour | `10` |
| `RATE_LIMIT_LLM_GLOBAL` | Max total LLM calls per hour | `1000` |
| `VECTOR_SIMILARITY_THRESHOLD` | pgvector cosine similarity threshold for duplicates | `0.92` |
| `ADMIN_EMAIL` | Default admin account email | `admin@example.com` |
| `ADMIN_PASSWORD` | Default admin account password | *(set in .env only)* |
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | Backend API listening port | `30003` |

> Refer to `.env.example` for the complete and up-to-date list.

---

## API Documentation

Full curl-based API examples are available in [docs/api-examples.md](docs/api-examples.md) (PART 12).

### Health Check

```
GET /health
→ { "status": "ok", "timestamp": "..." }
```

### Key Routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/login` | Authenticate and receive a JWT |
| `POST` | `/tests/create` | Generate a new test for a user |
| `POST` | `/tests/:id/submit` | Submit answers and receive results |
| `GET`  | `/daily-tasks` | Retrieve today's tasks for a user |
| `GET`  | `/wrong-book` | Retrieve the user's wrong-answer book |
| `GET`  | `/admin/ai-jobs` | List AI-generated questions (admin) |
| `POST` | `/admin/ai-jobs/:id/accept` | Accept an AI question (admin) |
| `POST` | `/admin/ai-jobs/:id/reject` | Reject an AI question (admin) |

---

## AI Question Generation

### Pipeline Overview

```
Job Created
  → Primary LLM (GEN_Q_V1 prompt)
    → Verifier LLM (VERIFY_Q_V1 prompt)
      → Duplicate Check (pgvector cosine similarity)
        → Human Review Queue
          → Published
```

- **Canary rate:** 5% of verified questions are auto-published; the remaining 95% require explicit human review.
- Configurable via the `AUTO_PUBLISH_RATE` environment variable.
- Prompt templates are documented in [docs/llm-prompts.md](docs/llm-prompts.md) (PART 11).

---

## Contributing

1. Fork the repository and create a feature branch.
2. Make your changes.
3. Run lints and tests before submitting:
   ```bash
   npm run lint
   npm test
   ```
4. Open a Pull Request with a clear description of your changes.
5. Ensure CI checks pass before requesting review.

---

## License

This project is licensed under the [Apache License 2.0](LICENSE).
