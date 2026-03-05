# Salen Hocam - KPSS Hazırlık Platformu

## 🎯 Proje Özeti

**Salen Hocam**, Türkiye'deki Kamu Personeli Seçme Sınavı (KPSS) hazırlığı için geliştirilmiş modern, mobil öncelikli bir öğrenme platformudur. Mikro öğrenme, aralıklı tekrar sistemi (Spaced Repetition System - SRS), yapay zeka destekli soru üretimi ve kişiselleştirilmiş öğrenme analitikleri sunar.

## 🏗️ Mimari Yapı

Proje **monorepo** yapısında organize edilmiştir ve üç ana bileşenden oluşur:

```
KPSS-APP/
├── apps/
│   └── mobile/              # React Native + Expo mobil uygulaması
├── packages/
│   └── shared/              # Ortak tip tanımları, validasyon ve yardımcı fonksiyonlar
└── services/
    └── backend/             # Fastify + TypeScript REST API sunucusu
```

### Bileşen Açıklamaları

#### 1. **Mobile App** (`apps/mobile/`)
- **Teknolojiler**: React Native, Expo, TypeScript, Expo Router
- **Özellikler**:
  - Kullanıcı kimlik doğrulama (kayıt/giriş)
  - Dashboard ile test geçmişi ve istatistikler
  - Mini test modülü (10 soruluk hızlı testler)
  - Flashcard sistemi (aralıklı tekrar ile)
  - Yanlış Defteri (wrong book)
  - Gerçek zamanlı skor hesaplama

#### 2. **Backend Service** (`services/backend/`)
- **Teknolojiler**: Fastify, TypeScript, PostgreSQL, JWT, bcryptjs
- **Sorumluluklar**:
  - RESTful API endpoint'leri
  - Kullanıcı kimlik doğrulama ve yetkilendirme
  - Soru bankası yönetimi
  - Test oluşturma ve değerlendirme
  - Flashcard SRS algoritması uygulama
  - Rate limiting ve güvenlik
- **Veritabanı**: PostgreSQL 14+
- **ORM**: Raw SQL queries + Repository pattern

#### 3. **Shared Package** (`packages/shared/`)
- **Amaç**: Kod tekrarını önlemek ve tip güvenliğini sağlamak
- **İçerik**:
  - TypeScript tip tanımları (User, Question, Test, Flashcard, vb.)
  - Zod validation şemaları
  - API yanıt tipleri ve yardımcılar
  - Hata kodları ve mesajları
  - Pagination yardımcıları
  - SM-2 SRS algoritması implementasyonu

## 📊 Veritabanı Şeması

### Temel Tablolar

1. **users**: Kullanıcı hesapları (öğrenci/admin)
2. **questions**: Soru bankası (metin, seçenekler, açıklama, zorluk, konu)
3. **tests**: Kullanıcı testleri
4. **test_answers**: Test cevapları ve süre takibi
5. **flashcards**: SRS kartları (interval, ease_factor, repetitions)
6. **wrong_book**: Yanlış cevaplanan sorular

### Özel Özellikler

- UUID primary keys
- Timestamp tracking (created_at, updated_at)
- Cascade delete ilişkileri
- İndekslenmiş arama alanları
- JSONB sütunları (soru seçenekleri)

## 🎓 Spaced Repetition System (SRS)

**SM-2 Algoritması** kullanılır:
- **Quality**: 0-5 arası kullanıcı performans değerlendirmesi
- **Interval**: Kartın bir sonraki gösterim aralığı (gün)
- **Ease Factor**: Kart öğrenme kolaylığı katsayısı (2.5 başlangıç)
- **Repetitions**: Başarılı tekrar sayısı

### SRS Mantığı
```
Quality 0-2: Kartı sıfırla (interval = 1)
Quality 3+: Sonraki tekrar = interval × ease_factor
Ease factor güncelleme: EF' = EF + (0.1 - (5 - quality) × (0.08 + (5 - quality) × 0.02))
```

## 🔐 Güvenlik

### Kimlik Doğrulama
- **JWT**: JSON Web Tokens ile stateless auth
- **Bcrypt**: Şifre hashleme (cost factor: 12)
- **Rate Limiting**: 
  - Global: 100 req/dakika
  - Auth endpoints: 10 req/dakika
  - Health: 60 req/dakika

### Yetkilendirme Rolleri
- **student**: Normal kullanıcı (test çözme, flashcard)
- **admin**: Soru ekleme/düzenleme/onaylama

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- Node.js ≥ 20
- PostgreSQL ≥ 14
- npm ≥ 9

### Adımlar

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Veritabanı migration'ı çalıştır
psql $DATABASE_URL -f migrations/001_init.sql

# 3. Shared package'ı build et
npm run build -w packages/shared

# 4. Backend'i başlat (development)
npm run dev -w services/backend

# 5. Mobile app'i başlat
npm run start -w apps/mobile
```

### Environment Variables

Backend için gerekli `.env` değişkenleri:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/kpss
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=3000
NODE_ENV=development
```

Mobile için gerekli değişkenler:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## 📱 Mobil Uygulama Özellikleri

### Ana Ekranlar

1. **Dashboard**: Son testler, genel istatistikler, progress tracking
2. **Mini Test**: Hızlı 10 soruluk testler, gerçek zamanlı puanlama
3. **Flashcards**: SRS tabanlı kart tekrarı, quality rating
4. **Wrong Book**: Yanlış cevaplanan soruların listesi ve analizi
5. **Profile**: Kullanıcı bilgileri ve ayarlar

### Navigation
- **Bottom Tab Navigation**: Ana ekranlar arası geçiş
- **Expo Router**: File-based routing

## 🧪 Test Stratejisi

### Unit Testler
- Shared package: SRS algoritması, pagination, validation
- Backend: Repository methods, middleware
- Mobile: Component tests, API client

### Çalıştırma
```bash
# Tüm testler
npm test

# Sadece shared package
npm test -w packages/shared

# Sadece backend
npm test -w services/backend
```

## 📦 API Endpoint'leri

### Kimlik Doğrulama
- `POST /auth/register` - Yeni kullanıcı kaydı
- `POST /auth/login` - Kullanıcı girişi

### Testler
- `POST /tests/create` - Yeni test oluştur
- `POST /tests/:id/submit` - Test cevaplarını gönder
- `GET /tests` - Kullanıcının testlerini listele (paginated)

### Sorular (Admin)
- `GET /questions` - Soru listesi (paginated)
- `POST /questions` - Yeni soru ekle
- `GET /questions/:id` - Soru detayı

### Flashcards
- `GET /flashcards` - Kullanıcının flashcard'ları
- `POST /flashcards/review` - Flashcard review yap (SRS güncelle)

### Wrong Book
- `GET /wrong-book` - Yanlış cevaplanan sorular
- `POST /wrong-book` - Yanlış soruyu ekle
- `DELETE /wrong-book/:id` - Yanlış soruyu kaldır

### Sistem
- `GET /health` - Sunucu ve veritabanı sağlık kontrolü

## 🎨 Tasarım Prensipleri

### Code Organization
1. **Repository Pattern**: Veritabanı işlemleri için tek kaynak
2. **Shared Types**: Frontend-backend arası tip güvenliği
3. **Validation**: Zod ile runtime type checking
4. **Error Handling**: Merkezi hata yönetimi ve kod sistemi

### API Response Format
```typescript
// Başarılı yanıt
{
  success: true,
  data: { ... }
}

// Hata yanıtı
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid input",
    details: { ... }
  }
}

// Paginated yanıt
{
  success: true,
  data: {
    items: [...],
    total: 100,
    page: 1,
    pageSize: 20,
    totalPages: 5
  }
}
```

## 🔄 Repository Pattern

`BaseRepository<T>` sınıfı ortak CRUD işlemlerini sağlar:
- `findById(id)`: ID ile kayıt bulma
- `findAll(pagination)`: Tüm kayıtları listeleme (paginated)
- `create(data)`: Yeni kayıt oluşturma
- `update(id, data)`: Kayıt güncelleme
- `deleteById(id)`: Kayıt silme

Alt sınıflar (`QuestionRepository`, `TestRepository`, vb.) özel sorguları implement eder.

## ⚖️ Yasal ve Lisanslama

- Telif hakkı korumalı soru bankalarını lisans anlaşması olmadan kullanmayın
- AI üretilen sorular `status = 'pending_review'` ile başlar
- İnsan onayı gerekir (approved/rejected)
- `ai_jobs` ve `ai_job_attempts` tabloları audit log tutar

## 🎯 Gelecek Özellikler

- [ ] AI soru üretimi API entegrasyonu
- [ ] Detaylı analytics dashboard
- [ ] Sosyal öğrenme (liderboard, arkadaş sistemi)
- [ ] Video açıklamalar
- [ ] Offline mode (mobile)
- [ ] Push notifications (test hatırlatma)
- [ ] Tema desteği (dark/light mode)
- [ ] Multi-language support

## 👥 Katkıda Bulunma

1. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
2. Değişikliklerinizi commit edin (`git commit -m 'feat: add amazing feature'`)
3. Branch'inizi push edin (`git push origin feature/amazing-feature`)
4. Pull Request açın

## 📝 Commit Convention

Conventional Commits kullanıyoruz:
- `feat:` Yeni özellik
- `fix:` Bug düzeltme
- `docs:` Dokümantasyon
- `refactor:` Kod refactoring
- `test:` Test ekleme/güncelleme
- `chore:` Bakım işleri

## 📞 İletişim ve Destek

Proje sahibi: bendedo13
Repository: https://github.com/bendedo13/KPSS-APP

---

**Salen Hocam** ile KPSS sınavına hazırlanmak artık daha etkili! 🎓✨
