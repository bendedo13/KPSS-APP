# API Kullanım Örnekleri (curl)

Bu döküman, tam bir KPSS test akışını göstermektedir.

## Ortam Değişkenleri

```bash
export API_URL="http://localhost:3001"
export TOKEN=""
```

## 1. Giriş — Token Al

```bash
curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"kullanici@example.com","password":"sifre123"}' | jq .

# Yanıt:
# {
#   "token": "eyJhbGciOiJIUzI1NiJ9...",
#   "role": "student"
# }

export TOKEN="eyJhbGciOiJIUzI1NiJ9..."
```

## 2. Günlük Görevleri Getir

```bash
curl -s "$API_URL/daily-tasks" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

## 3. Test Oluştur

```bash
curl -s -X POST "$API_URL/tests/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question_count": 5, "difficulty": "mixed"}' | jq .

# Yanıt:
# {
#   "test_id": "550e8400-e29b-41d4-a716-446655440000",
#   "questions": [
#     {
#       "id": "...",
#       "text": "Türkiye'nin başkenti hangi şehirdir?",
#       "options": [...]
#     }
#   ]
# }

export TEST_ID="550e8400-e29b-41d4-a716-446655440000"
```

## 4. Testi Gönder — Cevaplar

```bash
curl -s -X POST "$API_URL/tests/$TEST_ID/submit" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {"question_id": "Q_ID_1", "selected_option": "B"},
      {"question_id": "Q_ID_2", "selected_option": "A"},
      {"question_id": "Q_ID_3", "selected_option": "C"},
      {"question_id": "Q_ID_4", "selected_option": "D"},
      {"question_id": "Q_ID_5", "selected_option": "E"}
    ]
  }' | jq .

# Yanıt:
# {
#   "test_id": "550e8400-...",
#   "score": 3,
#   "total": 5,
#   "percentage": 60,
#   "wrong_question_ids": ["Q_ID_3", "Q_ID_4"]
# }
# Yanlış sorular otomatik olarak wrong_book tablosuna eklenir.
```

## 5. Admin — AI Sorularını İncele

```bash
# Admin token ile giriş yap
export ADMIN_TOKEN="..."

# Bekleyen soruları listele
curl -s "$API_URL/admin/ai-jobs?status=pending_review" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# Soruyu kabul et
curl -s -X POST "$API_URL/admin/ai-jobs/JOB_ID/accept" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# Soruyu reddet
curl -s -X POST "$API_URL/admin/ai-jobs/JOB_ID/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Yanlış cevap anahtarı"}' | jq .
```
