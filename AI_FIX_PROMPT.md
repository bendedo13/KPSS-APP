# Canlıdaki 404 / "NOT FOUND" Sorunları - Gerçek Sorun Analizi ve Tek Prompt

Bu rapor, canlı ortamda **/api** çağrılarının 404/"NOT FOUND" dönmesinin en olası **gerçek** kök nedenlerini kod tabanındaki kanıtlarla listeler ve başka bir yapay zekaya **tek prompt** halinde nasıl düzeltme yaptırılacağını hazırlar.

## 1) API Proxy (Next.js rewrite) canlıda yanlış hedefe gidiyor

Frontend tüm API çağrılarını **/api** üzerinden yapıyor. Bu yüzden **Next.js rewrite** doğru çalışmazsa 404 kaçınılmazdır.

- Frontend istemcisi `/api` tabanını kullanıyor: `NEXT_PUBLIC_API_BASE_URL` yoksa `/api` çağrılır. (Bu çağrı canlıda doğrudan frontend domainine gider.)【F:frontend/lib/api.ts†L4-L32】
- Next.js `rewrites` kuralı `/api/:path*` isteklerini **SERVER_API_URL** değerine yönlendiriyor; env yoksa `http://localhost:8000` kullanıyor.【F:frontend/next.config.mjs†L7-L14】

**Risk:** Canlıda `SERVER_API_URL` yanlış/boşsa veya Nginx/Reverse Proxy `/api` yi backend’e yönlendirmiyorsa **/api/auth/register** 404 döner.

## 2) Backend prod modda hiç başlamıyor olabilir (SECRET_KEY)

Prod’da `DEBUG=false` iken `SECRET_KEY` boşsa backend direkt çöküyor.

- Backend başlarken `SECRET_KEY` yoksa RuntimeError atılıyor.【F:backend/main.py†L61-L62】
- `docker-compose.yml` içinde `SECRET_KEY` boş bırakılabiliyor (varsayılan boş).【F:docker-compose.yml†L21-L25】

**Risk:** Backend hiç ayakta değilse, frontenden gelen tüm `/api` çağrıları **404/502** görünebilir.

## 3) Postgres ayağa kalkmıyor olabilir (POSTGRES_PASSWORD yok)

- `POSTGRES_PASSWORD` için zorunlu değer var ama default yok; `.env` olmadan DB container’ı açılmayabilir.【F:docker-compose.yml†L4-L7】

**Risk:** DB yoksa backend login/register işlemlerinde hata verir veya hiç kalkmaz.

## 4) Test ve dokümanlar mevcut konfigürasyonla uyumsuz (yanıltıcı)

- Testler `next.config.ts` ve sabit `http://127.0.0.1:8000` bekliyor; oysa gerçek config `next.config.mjs` ve `SERVER_API_URL` kullanıyor.【F:frontend/__tests__/config.test.ts†L1-L25】【F:frontend/next.config.mjs†L7-L14】
- README hala `next.config.ts` üzerinden anlatıyor; bu ekipleri yanlış yola sokar.【F:frontend/README_AUTH_FIX.md†L7-L35】

**Risk:** Ekip yanlış dosyayı düzeltmeye çalışır veya testler hatalı güven verir.

---

# ✅ Başka bir yapay zekaya verilecek TEK PROMPT

Aşağıdaki promptu **aynen** ver:

```
Projede canlıda devam eden “NOT FOUND/404” hatalarını gerçek kök nedenleriyle çöz. Aşağıdaki sıralı planı uygula ve her adımı kanıtla:

1) API Proxy/Rewrite doğrula ve düzelt
   - Frontend tüm çağrıları /api üzerinden yapıyor.
   - next.config.mjs içindeki rewrite /api -> SERVER_API_URL.
   - Canlıda SERVER_API_URL doğru mu? Eğer Nginx /api’yi backend’e yönlendirmiyorsa ekle.
   - /api/auth/register çağrısının **gerçek backend**e gittiğini doğrula.

2) Backend prod’da gerçekten ayağa kalkıyor mu kontrol et
   - DEBUG=false iken SECRET_KEY boşsa backend RuntimeError ile çöküyor.
   - SECRET_KEY’i zorunlu kıl ve .env/.env.example içinde açık şekilde belirt.
   - Backend servisinin log’larında startup hatası kalmadığını doğrula.

3) Postgres sağlık kontrolü
   - POSTGRES_PASSWORD boşsa DB container başlamaz.
   - .env/.env.example’e zorunlu değer ekle, docker-compose ve deploy notlarını güncelle.
   - Backend’in DB bağlantı loglarını doğrula.

4) Test + Doküman uyumsuzluğunu gider
   - config.test.ts hâlâ next.config.ts ve 127.0.0.1 bekliyor. Bunu current next.config.mjs + SERVER_API_URL akışına uyumlu yap.
   - README_AUTH_FIX.md dosyasını mevcut gerçeğe göre güncelle.

Çıktı formatı:
- Düzeltilen her dosya için: dosya adı + kısa açıklama.
- Canlı doğrulama: curl ile /api/health ve /api/auth/register örnekleri.
- En az 1 smoke test komutu.
```
