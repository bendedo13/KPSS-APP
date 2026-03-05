# KPSS Hazırlık Platformu

Türkiye'deki KPSS (Kamu Personeli Seçme Sınavı) sınavına hazırlık için üretim kalitesinde monorepo.

## Mimari

```
apps/
  mobile/     # Expo + React Native mobil uygulama
  admin/      # Next.js yönetim paneli
services/
  backend/    # Fastify + TypeScript REST API
  worker/     # BullMQ AI soru üretme worker'ı
infra/
  docker/     # Docker Compose + deploy betikleri
  nginx/      # Nginx konfigürasyon şablonları
migrations/   # PostgreSQL SQL migration'ları
scripts/      # Yardımcı betikler
```

## VPS Güvenli Dağıtım Kılavuzu

### 1. Ön Kontroller

```bash
# Disk alanını kontrol et (en az 5GB önerilir)
df -h

# Docker sürümünü kontrol et
docker --version  # 24.x+ önerilir
docker compose version  # 2.x+

# Mevcut projeleri kontrol et
docker ps --format '{{.Names}} {{.Ports}}'
ls /etc/nginx/sites-available/
```

### 2. Depoyu Klonla

```bash
git clone https://github.com/bendedo13/KPSS-APP.git /apps/kpss
cd /apps/kpss
```

### 3. Dry-Run — Plan Oluştur

```bash
cd infra/docker
./deploy_safe.sh dry-run
# .deploy/plan.json dosyasını incele
cat ../../.deploy/plan.json
```

### 4. Port Çakışması Kontrolü

```bash
./deploy_safe.sh check
# Çakışma varsa, plan.json'u manuel düzelt veya dry-run'ı tekrar çalıştır
```

### 5. .env Yapılandırması

```bash
cp .env.example ../../.env
nano ../../.env
# Şu değerleri mutlaka değiştir:
# - POSTGRES_PASSWORD
# - JWT_SECRET
# - NEXTAUTH_SECRET
# - LLM_DRY_RUN=false (gerçek LLM için)
# - OPENAI_API_KEY (gerçek LLM için)
```

> ⚠️ **Güvenlik Uyarısı:** `.env` dosyasını asla git'e ekleme!
> LLM anahtarları yalnızca sunucu tarafında kalmalıdır.
> İsteğe bağlı: HashiCorp Vault veya AWS Secrets Manager kullan.

### 6. Dağıtımı Başlat

```bash
./deploy_safe.sh start --confirm
```

### 7. Nginx Konfigürasyonu

```bash
# Dry-run çıktısını gör
../../scripts/generate_nginx_conf.sh

# Uygula (nginx'in kurulu olması gerekir)
../../scripts/generate_nginx_conf.sh --apply
```

### 8. Veritabanı & Admin Kullanıcı

```bash
# Migrasyonlar Docker başladığında otomatik çalışır
# Admin kullanıcı oluştur:
DATABASE_URL=postgres://kpss:PASSWORD@localhost:PORT/kpss \
  ../../scripts/bootstrap_admin_user.sh admin@example.com SIFRE
```

## Geri Alma & Temizlik

```bash
# Durdur
./deploy_safe.sh stop

# Tamamen temizle (veritabanı dahil)
./deploy_safe.sh cleanup
```

## Yerel Geliştirme

```bash
# Backend
cd services/backend && npm install && npm run dev

# Worker
cd services/worker && npm install && npm run dev

# Admin panel
cd apps/admin && npm install && npm run dev

# Mobil uygulama
cd apps/mobile && npm install && npx expo start
```

## ⚖️ İçerik Lisansı Uyarısı

> **ÖNEMLİ:** Üçüncü taraf sınav kitapları, yayınevi materyalleri veya
> telif hakkıyla korunan KPSS soruları **lisans anlaşması olmadan**
> sisteme yüklenmemelidir. AI ile üretilen sorular kendi içeriğimizdir.
> Tüm insan onayları denetim günlüğüne kaydedilmelidir.

## Güvenlik

- LLM/servis anahtarları asla frontend koduna yerleştirilmemelidir
- Tüm anahtarlar `.env` (sunucu tarafı) veya Vault'ta saklanmalıdır
- Prometheus `/metrics` ucu nginx'te iç ağa kısıtlanmalıdır
- AI sorular varsayılan olarak %5 oran ile otomatik yayınlanır (`AUTO_PUBLISH_RATE`)

## Operatör Kontrol Listesi

- [ ] `./infra/docker/deploy_safe.sh dry-run` çalıştır
- [ ] Gerekirse port çakışmalarını düzelt
- [ ] `./infra/docker/deploy_safe.sh check` çalıştır
- [ ] `.env` dosyasını güçlü şifrelerle doldur
- [ ] `./infra/docker/deploy_safe.sh start --confirm` çalıştır
- [ ] `http://localhost:BACKEND_PORT/health` adresini ziyaret et
- [ ] Admin panele giriş yap: `http://localhost:ADMIN_PORT`
- [ ] Nginx konfigürasyonunu uygula
