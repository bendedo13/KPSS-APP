-- Admin Panel Schema
-- Yöneticiler için izin ve rol sistemi

-- Admin tablosu
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin', -- admin, super_admin, content_manager, analytics_manager
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin permissions (rol-tabanlı erişim kontrol)
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '{}', -- {"users:read", "users:write", "questions:read", etc.}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin activity log (tüm admin işlemlerinin kaydı)
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL, -- create, update, delete, export, etc.
  resource_type VARCHAR(100) NOT NULL, -- users, questions, tests, etc.
  resource_id VARCHAR(255),
  changes JSONB, -- eski ve yeni değerleri sakla
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(50) DEFAULT 'success', -- success, error, warning
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sistem ayarları (admin tarafından yönetilen)
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(255) NOT NULL UNIQUE,
  setting_value JSONB,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  updated_by UUID REFERENCES admins(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content moderation queue
CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(100) NOT NULL, -- question, news, user_report
  content_id VARCHAR(255) NOT NULL,
  submitted_by UUID NOT NULL REFERENCES users(id),
  submission_data JSONB,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, flagged
  assigned_to UUID REFERENCES admins(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP
);

-- Varsayılan admin rol oluştur
INSERT INTO admin_roles (role_name, description, permissions) VALUES
('admin', 'Tam admin erişimi', '{"users:read","users:write","users:delete","questions:read","questions:write","questions:delete","tests:read","analytics:read","admins:manage","settings:write"}'),
('super_admin', 'Süper admin - tüm yetkiler', '{"*:*"}'),
('content_manager', 'İçerik yönetimi', '{"questions:read","questions:write","questions:delete","news:read","news:write","news:delete","moderation:review"}'),
('analytics_manager', 'Analytics ve raporlar', '{"analytics:read","users:read","reports:generate","exports:create"}')
ON CONFLICT (role_name) DO NOTHING;

-- Varsayılan sistem ayarları
INSERT INTO system_settings (setting_key, setting_value, description, is_public) VALUES
('app_name', '"KPSS Platform"', 'Uygulamanın adı', true),
('app_version', '"2.0.0"', 'Uygulamanın versiyonu', true),
('max_users', '100000', 'Maksimum kullanıcı sayısı', false),
('maintenance_mode', 'false', 'Bakım modunda olup olmadığını belirtir', false),
('notifications_enabled', 'true', 'Bildirimlerin aktif olup olmadığını belirtir', false),
('max_file_upload_size', '10485760', '10MB - Maksimum dosya boyutu', false)
ON CONFLICT (setting_key) DO NOTHING;

-- İndeksleri oluştur (performans için)
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_content_type ON moderation_queue(content_type);
