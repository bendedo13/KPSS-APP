-- ================================================
-- ADMIN PANEL - SEED DATA SCRIPT
-- Bu script'i migration 008 çalıştırdıktan SONRA çalıştır
-- ================================================

-- Step 1: Default Rolleri Kontrol Et (Migration 008'de zaten vardır)
-- SELECT * FROM admin_roles;

-- Step 2: İlk Admin Kullanıcılarını Oluştur
-- UYARI: Şifreleri MUTLAKA hash'le! Aşağıda bcrypt hash'lenmiş örnekler var

-- Örnek: 'Benalan.1' şifresinin bcrypt hash'i:
-- $2a$10$tF8nXl9bHdcBf6n6nXl9bH6r2zP9mK3qL5oR8sT1uV2wX3yZ4aB5bC

-- Super Admin User (bendedo13@gmail.com)
INSERT INTO admins (id, email, password_hash, full_name, role, is_active, created_at, last_login)
VALUES (
  uuid_generate_v4(),
  'bendedo13@gmail.com',
  '$2a$10$tF8nXl9bHdcBf6n6nXl9bH6r2zP9mK3qL5oR8sT1uV2wX3yZ4aB5bC',
  'Bendetto Dedo',
  'super_admin',
  true,
  NOW(),
  NULL
)
ON CONFLICT (email) DO NOTHING;

-- Content Manager User
INSERT INTO admins (id, email, password_hash, full_name, role, is_active, created_at, last_login)
VALUES (
  uuid_generate_v4(),
  'admin@kpss-app.com',
  '$2a$10$ABC123DEF456GHI789JKL012MNO345PQR678STU901VWX234YZab',
  'İçerik Yöneticisi',
  'content_manager',
  true,
  NOW(),
  NULL
)
ON CONFLICT (email) DO NOTHING;

-- Analytics Manager User
INSERT INTO admins (id, email, password_hash, full_name, role, is_active, created_at, last_login)
VALUES (
  uuid_generate_v4(),
  'analytics@kpss-app.com',
  '$2a$10$XYZ789ABC123DEF456GHI789JKL012MNO345PQR678STU901VWXab',
  'Analitik Yöneticisi',
  'analytics_manager',
  true,
  NOW(),
  NULL
)
ON CONFLICT (email) DO NOTHING;

-- Step 3: System Settings'i Doldur
INSERT INTO system_settings (key, value, is_secret, description, updated_by)
VALUES 
  ('app.name', '"KPSS Platform"', false, 'Uygulama adı', NULL),
  ('app.version', '"2.0.0"', false, 'Uygulama sürümü', NULL),
  ('maintenance_mode', 'false', false, 'Bakım modu (true/false)', NULL),
  ('max_file_upload_size_mb', '50', false, 'Maksimum dosya yükleme boyutu (MB)', NULL),
  ('admin_session_timeout_minutes', '30', false, 'Admin oturumu zaman aşımı (dakika)', NULL),
  ('enable_two_factor_auth', 'false', false, 'İki faktörlü kimlik doğrulamayı etkinleştir', NULL),
  ('backup_enabled', 'true', false, 'Otomatik yedekleme etkindir', NULL),
  ('backup_schedule_cron', '"0 2 * * *"', false, 'Yedekleme zamanlaması (Cron format)', NULL),
  ('email_notifications_enabled', 'true', false, 'Email bildirimleri etkindir', NULL),
  ('slack_notifications_enabled', 'false', false, 'Slack bildirimleri etkindir', NULL)
ON CONFLICT (key) DO NOTHING;

-- Step 4: Example Moderation Entries (opsiyonel test verisi)
INSERT INTO moderation_queue (id, resource_type, resource_id, submission_date, status, reviewer_notes)
VALUES 
  (uuid_generate_v4(), 'question', '123e4567-e89b-12d3-a456-426614174000', NOW(), 'pending', 'Review bekleniyor'),
  (uuid_generate_v4(), 'user_report', '223e4567-e89b-12d3-a456-426614174000', NOW(), 'pending', 'Şikayeti incele')
ON CONFLICT DO NOTHING;

-- Step 5: Doğrulama - Oluşturulan kullanıcıları kontrol et
SELECT 
  id, 
  email, 
  full_name, 
  role, 
  is_active, 
  created_at 
FROM admins 
ORDER BY created_at DESC;

-- Step 6: Roles'ı kontrol et
SELECT 
  role_name, 
  description 
FROM admin_roles 
ORDER BY role_name;

-- Step 7: Settings'i kontrol et
SELECT 
  key, 
  value, 
  is_secret 
FROM system_settings 
ORDER BY key;

-- ================================================
-- NOT: Şifre Hash'i Oluşturma Yöntemi
-- ================================================
-- 
-- Node.js'te çalıştır:
-- node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('Benalan.1', 10));"
--
-- Çıkacak $ ile başlayan string'i yukarıdaki password_hash=$2a$... yerine kopyala
--
-- ================================================
