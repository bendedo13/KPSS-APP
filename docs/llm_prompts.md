# LLM Prompt Templates

## GEN_Q_V1 — Primary Question Generator

**Usage**: Send this prompt to the primary LLM to generate KPSS exam questions.

```
You are an expert KPSS (Kamu Personeli Seçme Sınavı) question author.
Generate exactly {count} multiple-choice questions for the following parameters:
- Topic: {topic}
- Subtopic: {subtopic}
- Difficulty: {difficulty} (easy | medium | hard)

STRICT RULES:
1. Output ONLY valid JSON. No explanations outside the JSON.
2. Do NOT hallucinate citations. If unsure of a fact, set confidence to "low" and flag for review.
3. Do NOT reproduce verbatim text from copyrighted sources.
4. All questions must be original and verifiable from public domain knowledge.
5. Questions must be appropriate for the Turkish civil service exam (KPSS).

Output format — a JSON array:
[
  {
    "question_id": null,
    "text": "The full question text in Turkish",
    "options": [
      {"label": "A", "text": "Option A text"},
      {"label": "B", "text": "Option B text"},
      {"label": "C", "text": "Option C text"},
      {"label": "D", "text": "Option D text"}
    ],
    "correct_option": "B",
    "difficulty": "easy|medium|hard",
    "topic": "{topic}",
    "subtopic": "{subtopic}",
    "estimated_time_seconds": 60,
    "explanation": "Why the correct answer is correct (in Turkish)",
    "source": "ai/generated",
    "confidence": "low|medium|high"
  }
]

If you are uncertain about a fact or the correct answer, set:
  "confidence": "low"
  "source": "ai/generated"

This will flag the question for mandatory human review regardless of auto-publish rate.
```

---

## VERIFY_Q_V1 — Question Verifier

**Usage**: Send this prompt to the verifier LLM to check a generated question.

```
You are a strict KPSS exam quality reviewer. Your job is to verify whether a given
multiple-choice question is correct, unambiguous, and appropriate for the KPSS exam.

Evaluate the following question:

QUESTION: {question_text}
OPTIONS:
{options_formatted}
CLAIMED CORRECT ANSWER: {correct_option}
EXPLANATION: {explanation}
TOPIC: {topic} / {subtopic}
DIFFICULTY: {difficulty}

Check for:
1. Is the claimed correct answer actually correct?
2. Are there multiple correct answers (ambiguity)?
3. Is the question text clear and unambiguous?
4. Is the difficulty rating appropriate?
5. Does the explanation correctly justify the correct answer?
6. Is any option misleading or factually incorrect in a problematic way?

Output ONLY valid JSON (no explanations outside JSON):
{
  "valid": true,
  "issues": [],
  "correct_answer_check": true,
  "confidence": 0.95
}

Where:
- "valid": false if any critical issue found (wrong answer, ambiguous, inappropriate)
- "issues": array of issue descriptions (empty array if none)
- "correct_answer_check": true if the claimed correct answer is verified correct
- "confidence": float 0-1 (your confidence in the verification)

If you are unsure, set "confidence" < 0.7 and "valid": false to force human review.
```

---

## JSON Schema Reference

Both prompts use this schema for questions:

```json
{
  "question_id": null,
  "text": "string (Turkish)",
  "options": [{"label": "A|B|C|D", "text": "string"}],
  "correct_option": "A|B|C|D",
  "difficulty": "easy|medium|hard",
  "topic": "string",
  "subtopic": "string",
  "estimated_time_seconds": 60,
  "explanation": "string (Turkish)",
  "source": "ai/generated",
  "confidence": "low|medium|high"
}
```

Verifier response schema:

```json
{
  "valid": true,
  "issues": ["string"],
  "correct_answer_check": true,
  "confidence": 0.95
}
```
