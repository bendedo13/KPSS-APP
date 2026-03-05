# Ölçeklendirme, Maliyet Kontrolü ve Hukuki Rehber

## LLM Maliyet Kontrolü

### 1. Toplu İşleme (Batching)
- Soru üretme isteklerini N'li gruplar halinde birleştir (varsayılan N=5).
- BullMQ'da `batch_generate_questions` job tipi ekle, tek API çağrısında birden fazla soru üret.
- Doğrulama işlemlerini de paralel çalıştır (concurrency: 3 worker ayarı).

### 2. Önbellekleme (Caching)
- Embedding ve RAG sonuçlarını Redis'te 24 saat sakla:
  ```
  SETEX embedding:{hash} 86400 {vector_json}
  ```
- Aynı topic+difficulty için son 24 saatte üretilen sorular zaten önbellekte varsa LLM çağrısını atla.

### 3. Hız Sınırlama (Rate Limiting)
- Kullanıcı başına: 3 test/dakika, 50 test/gün
- Global LLM: 100 istek/dakika (OpenAI limit altında kal)
- Admin onay gerektirmeyen auto-accept oranı: %5 (AUTO_PUBLISH_RATE=0.05)

### 4. Vektör Tabanlı Duplicate Tespiti
- `pg_trgm` trigram benzerliği zaten migration'da kurulu.
- Production için `pgvector` ekle:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ALTER TABLE questions ADD COLUMN embedding vector(1536);
  CREATE INDEX ON questions USING ivfflat (embedding vector_cosine_ops);
  ```
- Benzerlik eşiği > 0.85 olan sorular otomatik reddedilir.
- Bu sayede LLM'e tekrarlı soru ürettirme maliyeti azalır.

### 5. Model Seçimi
- Soru üretme: `gpt-4o` (yüksek kalite, moderate maliyet)
- Doğrulama: `gpt-4o-mini` (daha ucuz, yeterince hassas)
- RAG embedding: `text-embedding-3-small`

### 6. Tahmini Aylık Maliyet (1000 soru/gün)
| Bileşen | Token/Soru | $/1K token | Aylık Maliyet |
|---------|-----------|------------|---------------|
| gpt-4o üretme | ~800 | $0.005 | ~$120 |
| gpt-4o-mini doğrulama | ~400 | $0.00015 | ~$1.8 |
| Embedding | ~100 | $0.00002 | ~$0.06 |
| **Toplam** | | | **~$122/ay** |

---

## Gözlemlenebilirlik (Observability)

- **Sentry:** Her worker ve backend'de Sentry SDK entegre et.
  ```bash
  npm install @sentry/node
  # .env: SENTRY_DSN=https://...@sentry.io/...
  ```
- **Prometheus:** `/metrics` endpoint'i zaten aktif (prom-client).
  ```yaml
  # prometheus.yml scrape config
  - job_name: kpss_backend
    static_configs:
      - targets: ['localhost:BACKEND_PORT']
  ```
- **Grafana:** Prometheus veri kaynağı ekle, worker başarı/başarısızlık paneli oluştur.

---

## Canary / Aşamalı Yayın

```bash
# Başlangıç: %5 auto-publish
AUTO_PUBLISH_RATE=0.05

# İlk ay sonunda istatistikler iyi ise %20
AUTO_PUBLISH_RATE=0.20

# 3 ay sonunda tam otomasyon
AUTO_PUBLISH_RATE=0.80
```

---

## ⚖️ Hukuki Rehber ve Lisans Uyarıları

### İçerik Lisansı

> **UYARI:** KPSS soru bankalarından, yayınevlerinden veya telif hakkıyla korunan kaynaklardan
> içerik kopyalamak **fikri mülkiyet ihlalidir**. Aşağıdaki kurallar geçerlidir:

1. **AI üretimi:** Tüm sorular `source: "ai/generated"` etiketiyle işaretlenir.
2. **İnsan onayı:** `pending_review` sorular admin panelinden onaylanmalıdır. Onay denetim kaydına işlenir.
3. **Yasaklı kaynaklar:** Ücretli sınav kitapları, yayınevi soruları, telif hakkıyla korunan içerik **lisans olmadan kullanılamaz**.
4. **Denetim günlüğü:** `ai_jobs.reviewed_at`, `ai_jobs.reject_reason` alanları tüm kararları kaydeder.
5. **Kullanıcı içeriği:** Kullanıcıların yüklediği içerikler için KVKK uyumu gereklidir.

### KVKK (Türk GDPR)

- Kullanıcı verileri (email, test sonuçları) KVKK kapsamındadır.
- Veri saklama politikası tanımlanmalı (önerilen: 2 yıl).
- Silme talebi için API endpoint ekle: `DELETE /users/me`.
- Veri işleme sözleşmesi hazırla.

### Güvenlik Denetim Listesi

- [ ] Tüm sırlar `.env` veya Vault'ta
- [ ] LLM anahtarları frontend'de yok
- [ ] `/metrics` sadece iç ağa açık
- [ ] JWT TTL makul (24 saat)
- [ ] SQL injection: parameterized queries kullanıldı
- [ ] Rate limiting aktif
- [ ] HTTPS zorunlu (nginx SSL terminasyonu)
