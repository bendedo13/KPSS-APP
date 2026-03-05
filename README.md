# KPSS Hazırlık Platformu

Production-ready monorepo for a KPSS (Kamu Personeli Seçme Sınavı) preparation platform with:
- 📱 Mobile app (Expo + React Native)
- 🔧 Backend API (Fastify + TypeScript)
- 🤖 AI Question Generation Worker (BullMQ)
- 🖥️ Admin Panel (Next.js)
- 🐘 PostgreSQL + Redis
- 🐳 Safe Docker deployment

> **LEGAL NOTE**: Do not import paywalled exam books or scrape copyrighted content without a valid
> licensing agreement. Maintain audit logs of all human approvals for AI-generated content.

---

## Repository Structure

```
KPSS-APP/
├── apps/
│   ├── admin/          # Next.js admin panel
│   └── mobile/         # Expo + React Native mobile app
├── services/
│   ├── backend/        # Fastify + TypeScript API
│   └── worker/         # AI question generation worker (BullMQ)
├── infra/
│   ├── docker/         # docker-compose.yml + deploy_safe.sh
│   └── nginx/          # Nginx config templates
├── migrations/         # PostgreSQL SQL migrations
├── scripts/            # Helper scripts
├── docs/               # LLM prompts, API examples, scaling notes
└── .deploy/            # Active deployment state (gitignored)
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- PostgreSQL 15 (or use Docker)
- Redis 7 (or use Docker)

### 1. Clone and set up environment

```bash
git clone https://github.com/your-org/KPSS-APP.git
cd KPSS-APP
cp infra/docker/.env.example infra/docker/.env
# Edit infra/docker/.env with your values
```

### 2. Run database migrations

```bash
psql $DATABASE_URL -f migrations/001_init.sql
```

### 3. Start backend

```bash
cd services/backend
npm install
npm run dev
```

### 4. Start worker

```bash
cd services/worker
npm install
npm run dev
```

### 5. Start admin panel

```bash
cd apps/admin
npm install
npm run dev
```

### 6. Start mobile app

```bash
cd apps/mobile
npm install
npx expo start
```

---

## VPS Deployment

### Safety Checklist (run before deploying)

- [ ] Free disk space: `df -h` (need at least 5GB)
- [ ] Docker version: `docker --version` (need 24+)
- [ ] Existing compose projects: `docker ps --format "{{.Names}}"` (check for conflicts)
- [ ] Existing Nginx configs: `ls /etc/nginx/sites-enabled/` (check for conflicts)
- [ ] Port range 30001-39999 mostly free: `ss -ltnn | grep -E ':3[0-9]{4}'`

### Step-by-step Deployment

#### 1. Dry run — plan ports and project name

```bash
./infra/docker/deploy_safe.sh dry-run
```

This writes the plan to `.deploy/plan.json`. Review it:

```bash
cat .deploy/plan.json
```

Example output:
```json
{
  "compose_project_name": "kpss_a3b9f2",
  "ports": {
    "postgres": 30001,
    "redis": 30002,
    "backend": 30003,
    "admin": 30004
  },
  "volumes": ["kpss_a3b9f2_pgdata"],
  "generated_at": "2024-01-15T10:00:00Z"
}
```

#### 2. Check for port conflicts

```bash
./infra/docker/deploy_safe.sh check
```

Fix any conflicts shown before proceeding.

#### 3. Generate Nginx config

```bash
# Dry run — preview only
API_DOMAIN=api.yourdomain.com ADMIN_DOMAIN=admin.yourdomain.com \
  ./scripts/generate_nginx_conf.sh --dry-run

# Actually write to /etc/nginx/sites-available/
API_DOMAIN=api.yourdomain.com ADMIN_DOMAIN=admin.yourdomain.com \
  ./scripts/generate_nginx_conf.sh

# Enable and reload
sudo ln -sf /etc/nginx/sites-available/kpss.conf /etc/nginx/sites-enabled/kpss.conf
sudo nginx -t && sudo systemctl reload nginx
```

#### 4. Run migrations

```bash
psql "$DATABASE_URL" -f migrations/001_init.sql
```

#### 5. Start with confirm

```bash
# ONLY run this after dry-run and check pass
./infra/docker/deploy_safe.sh start --confirm
```

#### 6. Create admin user

```bash
DATABASE_URL="your-database-url" \
  ./scripts/bootstrap_admin_user.sh admin@example.com yourpassword
```

> ⚠️ Update the password hash with a real bcrypt hash before use in production.

### Rollback and Cleanup

```bash
# Stop and remove containers/volumes (only kpss_ prefixed)
./infra/docker/deploy_safe.sh stop

# Or manually remove all kpss_ resources
./infra/docker/cleanup.sh
```

---

## Environment Variables

See `infra/docker/.env.example` for all required variables.

**Required for production:**
- `POSTGRES_PASSWORD` — Strong database password
- `JWT_SECRET` — At least 32 characters, random
- `LLM_API_KEY` — Your LLM provider API key (server-side only, never in frontend)

**Security notes:**
- All secrets must be stored server-side in `.env` or a secrets manager (HashiCorp Vault, AWS Secrets Manager)
- Never commit `.env` files to version control
- Never expose `LLM_API_KEY` to frontend/mobile code

---

## AI Question Generation

### Canary Publish Policy

By default, only **5%** of AI-generated questions are auto-published. The rest require human review.

Adjust with `AUTO_PUBLISH_RATE=0.05` (0.0 = all require review, 1.0 = all auto-publish).

### Reviewing Questions

1. Visit the admin panel at your configured domain
2. Go to **AI Jobs** → pending questions list
3. Review each question and click **Accept** or **Reject**

---

## Architecture

```
Mobile App (Expo)
    ↓ HTTPS
Nginx Reverse Proxy
    ↓
Fastify API (Backend)  ←→  PostgreSQL
    ↓                  ←→  Redis
BullMQ Worker
    ↓
LLM API (external)
```

---

## CI/CD

GitHub Actions runs lint, build, and test on every push. Docker image builds are checked in CI but **push/deploy is commented out** — enable manually after configuring registry secrets.

See `.github/workflows/ci.yml`.

---

## Scaling Notes

See `docs/scaling_and_legal.md` for detailed recommendations on LLM batching, caching, rate limits, and legal compliance.
