# ============================================
# KPSS APP - PRODUCTION SETUP INSTRUCTIONS
# ============================================

## 📋 ADIM ADIM ENTEGRASYON GUİDİ

### ADIM 1: ENV Dosyasını Hazırla

```bash
# .env.production.example dosyasını .env.production olarak kopyala
cp .env.production.example .env.production

# Dosyayı text editor ile aç ve doldur
nano .env.production
# veya
code .env.production
```

---

### ADIM 2: PostgreSQL Veritabanını Hazırla

**Nereden alacaksın**: Sunucu yöneticisi / Hosting paneli

**Bilgileri topla**:
```
✓ DB Host (sunucu adresi)
✓ DB Port (varsayılan: 5432)
✓ DB Name (veritabanı adı)
✓ DB User (admin kullanıcı)
✓ DB Password (şifre)
```

**Veritabanına bağlan**:
```bash
psql -h your-db-host.com -U your_db_user -d kpss_production
```

**Kontrol et**: Veritabanı boş mı?
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

Eğer tablo yoksa, migration'ları çalıştır:

```bash
# Backend dizinine git
cd services/backend

# Tüm migration'ları çalıştır
npm run migrate
# veya PostgreSQL üzerinden directly
psql -f ../../migrations/001_init.sql
psql -f ../../migrations/002_*.sql
psql -f ../../migrations/003_*.sql
...
psql -f ../../migrations/008_admin_panel.sql
```

---

### ADIM 3: İlk Admin Kullanıcılarını Oluştur

Migration 008'i çalıştırdıktan sonra, bu SQL script'ini çalıştır:

```sql
-- Super Admin Kullanıcısı (bendedo13@gmail.com)
INSERT INTO admins (email, password_hash, full_name, role, is_active)
VALUES (
  'bendedo13@gmail.com',
  'hashed_password_from_bcrypt',
  'Bendetto Dedo',
  'super_admin',
  true
);

-- İçerik Yönetim Admin
INSERT INTO admins (email, password_hash, full_name, role, is_active)
VALUES (
  'admin@kpss-app.com',
  'hashed_password_from_bcrypt',
  'İçerik Yöneticisi',
  'content_manager',
  true
);

-- Analitik Admin
INSERT INTO admins (email, password_hash, full_name, role, is_active)
VALUES (
  'analytics@kpss-app.com',
  'hashed_password_from_bcrypt',
  'Analitik Yöneticisi',
  'analytics_manager',
  true
);
```

**NOT**: `hashed_password_from_bcrypt` yerine, Node.js'te şu şekilde hash'le:

```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('Benalan.1', 10));"
```

Çıktıyı kopyalayıp SQL'e yapıştır.

---

### ADIM 4: JWT Secret Key Oluştur

PowerShell'de çalıştır:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($bytes)
$key = [Convert]::ToBase64String($bytes)
Write-Host "Kopyala: $key"
```

Çıktıyı `.env.production` dosyasında `JWT_SECRET=` satırına yapıştır.

---

### ADIM 5: SMTP/Email Ayarlarını Doldur

**3 seçeneğin var**:

#### Option 1: Gmail (Ücretsiz)
1. Google hesabına gir: myaccount.google.com
2. Security → 2-Step Verification'ı aç
3. Security → App Passwords
4. App olarak "Mail" seç, Device olarak "Windows Computer" seç
5. 16 haneli password'ü kopyala

`.env.production` dosyasında doldur:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=senin-email@gmail.com
SMTP_PASS=16-haneli-app-password
EMAIL_FROM_ADDRESS=senin-email@gmail.com
```

#### Option 2: SendGrid (Önerilir - Daha güvenli)
1. sendgrid.com'a git
2. Sign up → Email API seç
3. Settings → API Keys
4. "Create API Key" → Full Access → Kopyala

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your_sendgrid_key_xxx
```

#### Option 3: Office 365
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@company.com
SMTP_PASS=your-office365-password
```

**Test et**:
```bash
npm run test:email
```

---

### ADIM 6: SSL Certificate Oluştur (Production)

**Let's Encrypt kullanarak**:

```bash
# SSH ile sunucuya bağlan
ssh user@your-server.com

# certbot yükle
sudo apt-get install certbot python3-certbot-nginx

# Certificate oluştur
sudo certbot certonly --standalone \
  -d admin.your-domain.com \
  -d api.your-domain.com

# Dosya locatinoları .env.production'a ekle:
# SSL_CERT_PATH=/etc/letsencrypt/live/admin.your-domain.com/fullchain.pem
# SSL_KEY_PATH=/etc/letsencrypt/live/admin.your-domain.com/privkey.pem
```

---

### ADIM 7: Admin Panel Tests

**Backend API test**:
```bash
cd services/backend

# TypeScript check
npm run typecheck

# Tests çalıştır
npm test

# Dev server başlat
npm run dev
```

**Admin Login test**:
```bash
curl -X POST http://localhost:4000/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bendedo13@gmail.com",
    "password": "Benalan.1"
  }'
```

**Admin Frontend test**:
```bash
cd apps/admin

# Dependencies yükle
npm install

# Dev server başlat
npm run dev

# http://localhost:3000 aç ve login et
```

---

### ADIM 8: Production Deploy

```bash
# Build backend
cd services/backend
npm run build

# Build admin frontend
cd apps/admin
npm run build

# Nginx config (örnek):
sudo cp nginx.conf /etc/nginx/sites-available/kpss-admin

# Nginx restart
sudo systemctl restart nginx

# PM2 ile backend başlat
pm2 start dist/server.js --name "kpss-api"
pm2 start apps/admin/dist/index.js --name "kpss-admin"
PM2 save
```

---

## 🔗 BENİ İÇİN ALMAMAN GEREKEN VERİLER

| # | Veri | Nerede Alacaksın | Link |
|---|------|-----|-----|
| **1** | PostgreSQL Host | Hosting Support | N/A |
| **2** | DB Credentials | Hosting Paneli | N/A |
| **SMTP 1** | Gmail App Password | myaccount.google.com | https://myaccount.google.com/security |
| **SMTP 2** | SendGrid API Key | sendgrid.com | https://sendgrid.com/account/integrations/api |
| **SMTP 3** | Office 365 | admin.microsoft.com | https://admin.microsoft.com |
| **SSL** | Let's Encrypt | certbot | https://certbot.eff.org/ |
| **Sentry** | Error Tracking (opsiyonel) | sentry.io | https://sentry.io/signup/ |
| **Datadog** | Monitoring (opsiyonel) | datadog.com | https://www.datadoghq.com/ |
| **Slack** | Webhook (opsiyonel) | slack.com | https://api.slack.com/messaging/webhooks |
| **Logo** | Şirket Logosu | Şirket | N/A |

---

## 📝 CHECKLIST

- [ ] PostgreSQL bağlantısı sağlandı
- [ ] .env.production dosyası dolduruldu
- [ ] Migration'lar çalıştırıldı
- [ ] İlk admin kullanıcısı oluşturuldu
- [ ] JWT Secret Key oluşturuldu
- [ ] SMTP ayarları yapılandırıldı
- [ ] Backend login testi tamam
- [ ] Admin Panel login testi tamam
- [ ] SSL sertifikası oluşturuldu
- [ ] Production'a deploy edildi

---

## 🆘 Sorunlar

| Problem | Çözüm |
|---------|-------|
| "Cannot connect to database" | DB credentials kontrol et, firewall'u kontrol et |
| "JWT_SECRET not defined" | .env.production'da JWT_SECRET doldur |
| "Email not sending" | SMTP credentials kontrol et, 2FA 임 aç (Gmail) |
| "SSL certificate error" | certbot ile yeniden oluştur, auto-renew ayarla |

---

Generated: 2024-03-06 | KPSS Admin Panel Setup
