# API Examples (PART 12)

Complete curl examples demonstrating the full API flow. All examples assume the backend is running on `http://localhost:30003`.

---

## 1. Authentication

### Login

```bash
curl -X POST http://localhost:30003/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "test123"}'

# Response:
# {
#   "token": "eyJhbG...",
#   "user": {
#     "id": "uuid",
#     "email": "user@example.com"
#   }
# }
```

Save the token for subsequent requests:

```bash
TOKEN="eyJhbG..."
```

---

## 2. Create Test

Generate a new test for a specific topic.

```bash
curl -X POST http://localhost:30003/tests/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"user_id": "<USER_ID>", "topic_id": "<TOPIC_ID>", "question_count": 10}'

# Response:
# {
#   "test_id": "uuid",
#   "questions": [
#     {
#       "id": "q1",
#       "text": "Aşağıdakilerden hangisi ...",
#       "options": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."]
#     },
#     ...
#   ]
# }
```

---

## 3. Submit Test

Submit answers and receive scored results.

```bash
curl -X POST http://localhost:30003/tests/<TEST_ID>/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "user_id": "<USER_ID>",
    "answers": [
      {"question_id": "q1", "selected_option": "A"},
      {"question_id": "q2", "selected_option": "C"},
      {"question_id": "q3", "selected_option": "B"}
    ]
  }'

# Response:
# {
#   "test_id": "uuid",
#   "score": 7,
#   "total": 10,
#   "percentage": 70,
#   "wrong_questions": [
#     {
#       "question_id": "q3",
#       "user_answer": "B",
#       "correct_answer": "D",
#       "explanation": "Doğru cevap D'dir çünkü ..."
#     }
#   ]
# }
```

---

## 4. Get Daily Tasks

Retrieve the list of daily tasks for a user.

```bash
curl -X GET "http://localhost:30003/daily-tasks?user_id=<USER_ID>" \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "tasks": [
#     {
#       "id": "uuid",
#       "title": "Review 5 flashcards",
#       "is_completed": false
#     },
#     {
#       "id": "uuid",
#       "title": "Complete 1 practice test",
#       "is_completed": false
#     }
#   ]
# }
```

---

## 5. Get Wrong Book

Retrieve the user's wrong-answer book for review.

```bash
curl -X GET "http://localhost:30003/wrong-book?user_id=<USER_ID>" \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "items": [
#     {
#       "question_id": "q3",
#       "user_answer": "B",
#       "correct_answer": "D",
#       "review_count": 0
#     },
#     {
#       "question_id": "q7",
#       "user_answer": "A",
#       "correct_answer": "C",
#       "review_count": 2
#     }
#   ]
# }
```

---

## 6. Admin: Review AI Jobs

### List Pending Questions

```bash
curl -X GET "http://localhost:30003/admin/ai-jobs?status=pending_review" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Response:
# {
#   "jobs": [
#     {
#       "id": "job-uuid",
#       "status": "pending_review",
#       "question": { "text": "...", "options": [...], "correct_answer": "B" },
#       "created_at": "2025-01-01T00:00:00Z"
#     }
#   ]
# }
```

### Accept a Question

```bash
curl -X POST "http://localhost:30003/admin/ai-jobs/<JOB_ID>/accept" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Response:
# {
#   "id": "job-uuid",
#   "status": "accepted",
#   "published": true
# }
```

### Reject a Question

```bash
curl -X POST "http://localhost:30003/admin/ai-jobs/<JOB_ID>/reject" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"reason": "Incorrect answer explanation"}'

# Response:
# {
#   "id": "job-uuid",
#   "status": "rejected",
#   "reason": "Incorrect answer explanation"
# }
```
