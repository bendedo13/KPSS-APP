# Live Issue Recheck Report

Bu rapor, repodaki güncel konfigürasyonun canlı ortamda hâlâ 404/"NOT FOUND" üretme ihtimalini kontrol eder ve **çözülmemiş riskleri** listeler.

## İnceleme Özeti

### 1) Next.js API rewrite hedefi canlıda hâlâ kritik
- Frontend istemci tarafı istekleri `/api` tabanına gönderiyor (env yoksa varsayılan `/api`).【F:frontend/lib/api.ts†L4-L32】
- Next.js `rewrites()` kuralı `/api` isteklerini `SERVER_API_URL` değerine yönlendiriyor; env yoksa `http://localhost:8000` kullanıyor.【F:frontend/next.config.mjs†L7-L14】

**Risk:** Canlıda `SERVER_API_URL` yanlış/boş ise `/api/auth/register` 404 döner. Bu, hâlâ devam eden 404 semptomunu açıklıyor.

### 2) Backend prod’da SECRET_KEY boşsa hiç kalkmıyor
- `DEBUG=false` iken `SECRET_KEY` boşsa backend RuntimeError ile kapanıyor.【F:backend/main.py†L61-L62】
- Docker compose varsayılanı boş bırakıyor (`${SECRET_KEY:-}`), bu nedenle prod’da ayarlanmadıysa API ayağa kalkmaz.【F:docker-compose.yml†L21-L25】

**Risk:** Backend çalışmıyorsa Next.js proxy 404/502 verir.

### 3) Postgres parolası yoksa DB container başlamaz
- `POSTGRES_PASSWORD` için default yok ve env dosyası verilmezse DB container’ı başarısız olabilir.【F:docker-compose.yml†L4-L7】

**Risk:** DB yoksa auth/register işlemleri hata verir.

### 4) Test ve dokümantasyon hâlâ eski dosyaları referanslıyor
- Testler `next.config.ts` ve sabit `http://127.0.0.1:8000` hedefini bekliyor.【F:frontend/__tests__/config.test.ts†L1-L25】
- Dokümantasyon `next.config.ts` üzerinden yönlendirme anlatıyor; gerçek dosya `next.config.mjs` ve `SERVER_API_URL` kullanıyor.【F:frontend/README_AUTH_FIX.md†L7-L35】【F:frontend/next.config.mjs†L7-L14】

**Risk:** Ekip yanlış dosyayı düzenleyebilir, regressions tekrar oluşur.

## Sonuç
Repo içindeki yapı, canlıdaki 404/"NOT FOUND" problemlerini **tamamen çözdüğünü garanti etmiyor**. Özellikle `SERVER_API_URL`, `SECRET_KEY` ve DB parolası canlıda doğru ayarlanmadıysa problem devam eder. Ayrıca test/dokümantasyon uyumsuzlukları hatalı güven yaratıyor.
