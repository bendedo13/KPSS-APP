# 🎯 ENTEGRASYON KONTROL LİSTESİ & VERİ TOPLAMA

Admin panel entegrasyonunu tamamlamak için aşağıdaki kontrol listesini kullan.

---

## ✅ BEN HAZIRLADIĞIM (Kodlama gerekli değil)

### 1. ✅ Setup Güvenlik Dosyaları
- [x] `.env.production.example` - Template dosyası
- [x] `ADMIN_SETUP_GUIDE.md` - Adım adım talimatlar
- [x] `migrations/009_admin_seed_data.sql` - İlk veri eklemesi
- [x] `scripts/generate-password-hash.js` - Şifre hash generator

### 2. ✅ Admin Panel Kodu
- [x] Backend: admin.repository.ts (450+ satır)
- [x] Backend: admin-auth.ts middleware
- [x] Backend: admin-auth.ts routes (6 endpoint)
- [x] Backend: admin-dashboard.ts routes (13 endpoint)
- [x] Frontend: AdminLogin.tsx
- [x] Frontend: AdminDashboard.tsx
- [x] Mobile: SplashScreen.tsx

### 3. ✅ Veritabanı
- [x] Migration 008: Admin panel şeması
- [x] Migration 009: Initial seed data

---

## 🔴 SEN ALMAN GEREKEN VERİLER

Lütfen aşağıdakileri topla ve sana ver. Her bölüm için linkler verdim.

---

### 1. 🗂️ PostgreSQL VERİTABANI BAĞLANTISI

**Nerede**: Sunucu/Hosting sağlayıcısından

**Alman Gereken**:
```
[ ] Database Host (Sunucu Adresi)
    Örn: db.your-provider.com veya 192.168.1.100
    
[ ] Database Port (Varsayılan: 5432)
    
[ ] Database Name (Veritabanı Adı)
    Örn: kpss_production
    
[ ] Database User (Yönetici Kullanıcı)
    Örn: postgres_admin
    
[ ] Database Password (Güçlü Şifre)
    
[ ] Connection String (Opsiyonel)
    Format: postgresql://user:password@host:port/dbname
```

**Kimden İsteyeceksin**:
- Sunucu/VPS sağlayıcı (AWS, DigitalOcean, Linode, vb.)
- Database yöneticisi
- Hosting paneli (cPanel, Plesk, vb.)

**Nerede Bulacaksın**:
- AWS RDS: https://console.aws.amazon.com/rds → Databases → Connection & security
- DigitalOcean: https://cloud.digitalocean.com/databases → Your Cluster → Connection details
- Linode: https://cloud.linode.com/databases → Your Cluster → Connection Strings
- cPanel: cPanel Home → MySQL Databases → View New Database

---

### 2. 🔐 JWT SECRET KEY

✅ **BUNU BEN OLUŞTURABILIRIM!**

Yapacağını şey:
```powershell
cd "c:\Users\win10\Desktop\KPSS APP SALEN\KPSS-APP"

# Bunu çalıştır ve çıktıyı kopyala
$bytes = New-Object byte[] 32; [Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($bytes); $key = [Convert]::ToBase64String($bytes); Write-Host $key
```

Çıkacak `$2a$...` string'ini `.env.production` dosyasında `JWT_SECRET=` kısmına yapıştır.

---

### 3. ✉️ EMAIL / SMTP AYARLARI

**3 SEÇENEĞİN VAR** - Birini seç:

#### 🟢 OPTION 1: Gmail (Ücretsiz, Basit)

**Adımlar**:
1. https://myaccount.google.com/security aç
2. "2-Step Verification" → Aç
3. "App passwords" → Seç "Mail" + "Windows Computer"
4. 16 haneli password'ü kopyala

**Alman Gereken**:
```
[ ] Gmail E-posta Adresi: your-email@gmail.com
[ ] Gmail App Password: (16 haneli kod)
```

**Link**: https://myaccount.google.com/security/apppasswords

---

#### 🟢 OPTION 2: SendGrid (Önerilir, Daha Güvenli)

**Neden**: E-mail deliverability daha yüksek, production'a uygun

**Adımlar**:
1. https://sendgrid.com/signup aç
2. Email API seçini
3. Verify e-posta adresi
4. https://app.sendgrid.com/settings/api_keys
5. "Create API Key" → Full Access
6. Key'i kopyala ve sakla

**Alman Gereken**:
```
[ ] SendGrid API Key: SG.xxxxxxxxxxx...
```

**Link**: https://app.sendgrid.com/settings/api_keys

---

#### 🟢 OPTION 3: Office 365 / Outlook

**Adımlar**:
1. https://admin.microsoft.com aç
2. E-posta hesaplarını yönet
3. SMTP ayarlarını al (genelde outlook.office365.com)

**Alman Gereken**:
```
[ ] Office 365 E-posta: your-email@company.com
[ ] Office 365 Password: (hesap şifren)
```

**Link**: https://admin.microsoft.com

---

### 4. 🌐 DOMAIN / URL BİLGİSİ

**Nerede**: DevOps / Hosting sağlayıcı

**Alman Gereken**:
```
[ ] Admin Panel Domain
    Örn: admin.your-company.com
    
[ ] API Backend Domain
    Örn: api.your-company.com
    
[ ] Main App Domain
    Örn: app.your-company.com  (varsa)
    
[ ] Base Domain
    Örn: your-company.com
```

**Kimden İsteyeceksin**:
- DevOps mühendisi
- Domain yöneticisi
- Sistem yöneticisi

**Doğru şekilde**:
- Her domain için DNS A records ayarlanmış mı?
- SSL sertifikaları domain'e bağlı mı?
- Tüm domainler işaret ediyor mu doğru IP'ye?

---

### 5. 🔒 SSL SERTİFİKASI (Production)

✅ **BEN OLUŞTURABILIRIM VEYA SEN OLUŞTURABILIRSIN**

**OPTION 1: Ben yardım ederim (Let's Encrypt, Ücretsiz)**

SSH'ye erişim varsa:
```bash
ssh user@your-server.com
sudo certbot certonly --standalone -d admin.your-domain.com -d api.your-domain.com
```

**OPTION 2: Senden Al**

```
[ ] SSL Certificate File (.crt veya .cer)
[ ] Private Key File (.key)
[ ] CA Certificate (varsa, .ca-bundle veya .p7b)
[ ] Validity Dates (ne zaman expire?)
```

**Nereden**:
- Hosting paneli (cPanel → SSL/TLS)
- Sertifika sağlayıcı (Sectigo, DigiCert, vb.)
- Let's Encrypt: https://certbot.eff.org/

---

### 6. 🎨 BRANDING & UI KUSTOMİZASYONU

**Alman Gereken**:
```
[ ] Şirket Logosu (PNG, 200x200px, transparent yoksa white bg)
[ ] Şirket Adı (Örn: "KPSS Platform")
[ ] Primary Color (Hex kod, örn: #667eea)
[ ] Secondary Color (Hex kod, örn: #764ba2)
[ ] Footer Metni (Örn: "© 2024 Şirket Adı")
[ ] Support E-posta (support@your-domain.com)
```

**Nuradan**:
- Marketing / Brand tas Ekibi
- Company Style Gide
- Logo dosyalarının bulunduğu klasör

---

### 7. 📊 MONİTORİNG AYARLARI (İsteğe bağlı)

Bu opsiyonel ama production'da TAVSIYE EDİLİR:

#### A) Sentry (Error Tracking)
```
[ ] Sentry DSN: https://your-key@sentry.io/project-id
```
**Link**: https://sentry.io/signup/

#### B) Datadog (Performance Monitoring)
```
[ ] Datadog API Key
[ ] Datadog Site (datadoghq.com veya datadoghq.eu)
```
**Link**: https://www.datadoghq.com/

#### C) New Relic (Application Monitoring)
```
[ ] New Relic License Key
[ ] New Relic Account ID
```
**Link**: https://newrelic.com/

---

### 8. 📱 SLACK/DISCORD (İsteğe bağlı - Alerts için)

Eğer admin'in gönderilecek yerinde Slack/Discord'u istiyorsan:

#### Slack Notifications
```
[ ] Slack Webhook URL: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```
**Nasıl Oluştur**: https://api.slack.com/messaging/webhooks

#### Discord Notifications
```
[ ] Discord Webhook URL: https://discordapp.com/api/webhooks/webhook_id/token
```
**Nasıl Oluştur**: https://discordpy.readthedocs.io/en/stable/ext/tasks/index.html

---

### 9. 💾 BACKUP AYARLARI

**Alman Gereken**:
```
[ ] AWS S3 Bucket Adı
    Örn: kpss-app-backups
    
[ ] AWS Access Key ID
[ ] AWS Secret Access Key
[ ] AWS Region (Örn: eu-west-1)

VEYA

[ ] DigitalOcean Spaces Bucket Adı
[ ] DigitalOcean Spaces Key
```

**Link**: 
- AWS S3: https://console.aws.amazon.com/s3
- DigitalOcean: https://cloud.digitalocean.com/spaces

---

### 10. 📧 BACKUP NOTIFICATION

```
[ ] Backup tamamlandığında kime mail gönderilecek?
    Örn: admin@your-domain.com
```

---

## 📊 KONTROL LİSTESİ TABLOSU

Topladığın verileri buraya işaretle:

| # | Veri | Durumu | Nerede |
|---|------|--------|--------|
| 1 | PostgreSQL Host | ⬜ | |
| 2 | PostgreSQL Port | ⬜ | |
| 3 | PostgreSQL DB Name | ⬜ | |
| 4 | PostgreSQL User | ⬜ | |
| 5 | PostgreSQL Password | ⬜ | |
| 6 | Email Provider | ⬜ | (Gmail/SendGrid/O365) |
| 7 | Email Credentials | ⬜ | |
| 8 | Admin Domain | ⬜ | |
| 9 | API Domain | ⬜ | |
| 10 | SSL Certificate | ⬜ | |
| 11 | Company Logo | ⬜ | |
| 12 | Company Name | ⬜ | |
| 13 | Support Email | ⬜ | |
| 14 | Slack/Discord Webhook | ⬜ | (opsiyonel) |
| 15 | Backup Location | ⬜ | (opsiyonel) |

---

## 📋 VERILERINI VERDİKTEN SONRA YAPMAYANTORİLER

Buraya verilerini kopyalarken yapabileceğim:

1. ✅ `.env.production` dosyasını otomatik doldur
2. ✅ Şifre hash'erini oluştur
3. ✅ Migration script'leri hazırla
4. ✅ Seed data oluştur
5. ✅ Test script'leri çalıştır
6. ✅ Database connection test et
7. ✅ Email sending test et
8. ✅ Admin login test et
9. ✅ Admin Panel frontend test et

---

## 🚀 SONRAKI ADIM

Aşağıdaki biçimde verileri bana ver:

```
📦 ENTEGRASYON VERİLERİ:

🗄️ PostgreSQL:
- Host: 
- Port: 
- Database: 
- User: 
- Password: 

✉️ Email (seç: Gmail/SendGrid/O365):
- Provider: 
- Email: 
- Password/Key: 

🌐 Domains:
- Admin Panel: 
- API Backend: 
- Main App: 

🎨 Branding:
- Company Name: 
- Logo Path: 
- Support Email: 

🔐 SSL:
- Type: (Let's Encrypt/Existing/None for now)
- Certificate Path: (varsa)

📊 Monitoring (opsiyonel):
- Sentry DSN: 
- Datadog API Key:
```

**Tamamlandığında bana gönder!** 🎉
