# Salen Hocam - KPSS Hazırlık Platformu

**Salen Hocam**, Kamu Personeli Seçme Sınavı (KPSS) hazırlığı için geliştirilmiş, mobil öncelikli modern öğrenme platformudur. Mikro öğrenme, aralıklı tekrar sistemi (SRS), yapay zeka destekli soru üretimi, yanlış defter ve detaylı analitikler sunar.

> 📚 Projeyi Türkçe okumak için: [BENI_OKU.md](BENI_OKU.md)

## Monorepo Structure

```
.
├── apps/
│   └── mobile/          # Expo + React Native (TypeScript, Expo Router)
├── packages/
│   └── shared/          # ⬅ Shared types, validation schemas, API helpers, SRS algorithm
│                        #   The single source of truth — consumed by backend and mobile
│                        #   to eliminate code duplication
├── services/
│   └── backend/         # Fastify + TypeScript REST API
└── migrations/
    └── 001_init.sql     # PostgreSQL schema
```

## Key Design Decision — Shared Package

The `packages/shared` package is the central refactoring artifact.

Before the refactoring, the following code would have been **duplicated** across `services/backend` and `apps/mobile`:

| What                          | Location in `packages/shared`                |
|-------------------------------|----------------------------------------------|
| `Question`, `Test`, `User`, `Flashcard` types | `src/types/`           |
| Zod validation schemas        | `src/validation/`                            |
| `ApiResponse<T>` type + helpers | `src/api/response.ts`                      |
| Error codes & messages        | `src/api/errors.ts`                          |
| Pagination helpers            | `src/utils/pagination.ts`                    |
| SM-2 SRS algorithm            | `src/utils/srs.ts`                           |

The `services/backend` additionally uses a `BaseRepository<T>` class
(`services/backend/src/db/repository.ts`) to eliminate duplicated CRUD boilerplate
(findById, findAll, deleteById) that would otherwise be copy-pasted for every entity.

## Quick Start

### Prerequisites

- Node.js ≥ 20
- PostgreSQL ≥ 14
- npm ≥ 9 (workspaces)

### Setup

```bash
# 1. Install all workspace dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# 3. Run database migrations
psql $DATABASE_URL -f migrations/001_init.sql

# 4. Build shared package
npm run build -w packages/shared

# 5. Start backend (dev mode)
npm run dev -w services/backend

# 6. In another terminal, start mobile app
npm run start -w apps/mobile
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Backend
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/salen_hocam
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=3000
NODE_ENV=development

# Mobile
EXPO_PUBLIC_API_URL=http://localhost:3000
```

See [.env.example](.env.example) for all available options.

## 🚀 Production Deployment (VPS)

### Prerequisites
- Docker & Docker Compose installed on VPS
- SSL certificates (optional, but recommended)
- Domain name pointing to VPS

### Deployment Steps

1. **Clone the repository**
```bash
git clone https://github.com/bendedo13/KPSS-APP.git
cd KPSS-APP
```

2. **Configure environment**
```bash
cp .env.production.example .env
# Edit .env with production values:
# - Strong JWT_SECRET (64+ characters)
# - Secure database password
# - Correct CORS_ORIGIN domains
# - Unique ports (BACKEND_PORT, POSTGRES_PORT)
```

3. **Deploy with Docker Compose**

**Linux/Mac:**
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh production
```

**Windows:**
```cmd
scripts\deploy.bat production
```

4. **Verify deployment**
```bash
# Check health endpoint
curl http://localhost:3001/health

# View logs
docker-compose -p salen_hocam logs -f backend
```

### Port Configuration

To avoid conflicts with other VPS projects, configure custom ports in `.env`:

```env
BACKEND_PORT=3001      # Backend API (external)
POSTGRES_PORT=5433     # PostgreSQL (external)
```

These ports are mapped from internal container ports (3000, 5432).

### Managing the Service

```bash
# Start services
docker-compose -p salen_hocam up -d

# Stop services
docker-compose -p salen_hocam down

# View logs
docker-compose -p salen_hocam logs -f

# Restart services
docker-compose -p salen_hocam restart

# Update and redeploy
git pull
docker-compose -p salen_hocam down
docker-compose -p salen_hocam build --no-cache
docker-compose -p salen_hocam up -d
```

### Nginx Reverse Proxy (Optional)

For SSL and domain mapping:

```nginx
server {
    listen 80;
    server_name api.salenhocam.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then enable SSL with Let's Encrypt:
```bash
certbot --nginx -d api.salenhocam.com
```

## Legal & Licensing

- Do **not** import paywalled exam books or third-party question banks without a
  licensing agreement.
- Maintain audit logs of human approvals for AI-generated questions
  (`ai_jobs` and `ai_job_attempts` tables).
- AI-generated questions are stored with `status = 'pending_review'` until
  a human reviewer approves them.
