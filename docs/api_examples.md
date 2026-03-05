# API Examples — Full Flow with curl

Replace `API_URL`, `EMAIL`, and `PASSWORD` with your actual values.

```bash
API_URL="http://localhost:3001"
EMAIL="student@example.com"
PASSWORD="securepassword123"
```

---

## Step 1 — Login and get token

```bash
TOKEN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${EMAIL}\", \"password\": \"${PASSWORD}\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "Token: ${TOKEN}"
```

---

## Step 2 — Check health

```bash
curl -s "${API_URL}/health" | python3 -m json.tool
```

Expected response:
```json
{
  "api": "ok",
  "db": "ok",
  "redis": "ok",
  "metrics": "/metrics"
}
```

---

## Step 3 — Get daily tasks

```bash
curl -s "${API_URL}/daily-tasks" \
  -H "Authorization: Bearer ${TOKEN}" \
  | python3 -m json.tool
```

---

## Step 4 — Create a test (10 mixed-difficulty questions)

```bash
TEST_RESPONSE=$(curl -s -X POST "${API_URL}/tests/create" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"question_count": 10, "difficulty": "mixed"}')

echo "${TEST_RESPONSE}" | python3 -m json.tool

TEST_ID=$(echo "${TEST_RESPONSE}" | python3 -c "import sys,json; print(json.load(sys.stdin)['test_id'])")
echo "Test ID: ${TEST_ID}"
```

Expected response:
```json
{
  "test_id": "550e8400-e29b-41d4-a716-446655440000",
  "questions": [
    {
      "id": "question-uuid-1",
      "text": "Türkiye Cumhuriyeti kaç yılında kurulmuştur?",
      "options": [
        {"label": "A", "text": "1919"},
        {"label": "B", "text": "1923"},
        {"label": "C", "text": "1920"},
        {"label": "D", "text": "1918"}
      ],
      "difficulty": "easy",
      "topic_id": "topic-uuid",
      "estimated_time_seconds": 30
    }
  ]
}
```

Note: `correct_option` is NOT included in the response for security.

---

## Step 5 — Submit answers

```bash
curl -s -X POST "${API_URL}/tests/${TEST_ID}/submit" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"answers\": [
      {\"question_id\": \"question-uuid-1\", \"selected_option\": \"B\"},
      {\"question_id\": \"question-uuid-2\", \"selected_option\": \"A\"}
    ]
  }" | python3 -m json.tool
```

Expected response:
```json
{
  "test_id": "550e8400-e29b-41d4-a716-446655440000",
  "score": 8,
  "total_questions": 10,
  "score_percent": 80,
  "wrongs_added": 2,
  "wrongs": [
    {
      "question_id": "question-uuid-2",
      "selected_option": "A",
      "correct_option": "C"
    }
  ]
}
```

Wrong questions are automatically added to the user's `wrong_book` (upsert with review count increment).

---

## Admin — Review AI jobs

```bash
ADMIN_TOKEN="your-admin-jwt-token"

# List pending AI jobs
curl -s "${API_URL}/admin/ai-jobs" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  | python3 -m json.tool

# Accept a question
JOB_ID="ai-job-uuid"
curl -s -X POST "${API_URL}/admin/ai-jobs/${JOB_ID}/review" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action": "accept"}' \
  | python3 -m json.tool

# Reject a question with notes
curl -s -X POST "${API_URL}/admin/ai-jobs/${JOB_ID}/review" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action": "reject", "reviewer_notes": "Incorrect correct_option, misleading options"}' \
  | python3 -m json.tool
```
