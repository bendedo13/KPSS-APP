import { FastifyInstance } from "fastify";
import { z } from "zod";
import pool from "../lib/db.js";

const CreateTestSchema = z.object({
  user_id: z.string().uuid(),
  topic_id: z.string().uuid().optional(),
  question_count: z.number().int().min(1).max(100),
});

const SubmitAnswerEntry = z.object({
  question_id: z.string().uuid(),
  selected_option: z.number().int().min(0),
});

const SubmitTestSchema = z.object({
  user_id: z.string().uuid(),
  answers: z.array(SubmitAnswerEntry).min(1),
});

export default async function testRoutes(app: FastifyInstance): Promise<void> {
  app.post("/tests/create", async (request, reply) => {
    const parsed = CreateTestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Validation failed", details: parsed.error.issues });
    }

    const { user_id, topic_id, question_count } = parsed.data;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Fetch random questions, optionally filtered by topic
      const questionQuery = topic_id
        ? `SELECT id, text, options FROM questions WHERE topic_id = $1 ORDER BY random() LIMIT $2`
        : `SELECT id, text, options FROM questions ORDER BY random() LIMIT $1`;
      const questionParams = topic_id ? [topic_id, question_count] : [question_count];

      const { rows: questions } = await client.query<{
        id: string;
        text: string;
        options: string[];
      }>(questionQuery, questionParams);

      if (questions.length === 0) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "No questions found" });
      }

      const questionIds = questions.map((q) => q.id);

      // Insert the test record
      const { rows: testRows } = await client.query<{ id: string }>(
        `INSERT INTO tests (user_id, question_ids, status, created_at)
         VALUES ($1, $2, 'in_progress', NOW())
         RETURNING id`,
        [user_id, JSON.stringify(questionIds)],
      );

      const test_id = testRows[0].id;

      await client.query("COMMIT");

      return reply.code(201).send({
        test_id,
        questions: questions.map((q) => ({ id: q.id, text: q.text, options: q.options })),
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  app.post<{ Params: { id: string } }>("/tests/:id/submit", async (request, reply) => {
    const testId = request.params.id;

    const parsed = SubmitTestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Validation failed", details: parsed.error.issues });
    }

    const { user_id, answers } = parsed.data;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Verify the test exists and belongs to the user
      const { rows: testRows } = await client.query<{ id: string; status: string }>(
        `SELECT id, status FROM tests WHERE id = $1 AND user_id = $2`,
        [testId, user_id],
      );

      if (testRows.length === 0) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "Test not found" });
      }

      if (testRows[0].status === "completed") {
        await client.query("ROLLBACK");
        return reply.code(409).send({ error: "Test already submitted" });
      }

      // Fetch correct answers for all submitted questions
      const questionIds = answers.map((a) => a.question_id);
      const { rows: correctRows } = await client.query<{
        id: string;
        correct_answer: number;
        explanation: string;
        text: string;
      }>(
        `SELECT id, correct_answer, explanation, text
         FROM questions
         WHERE id = ANY($1)`,
        [questionIds],
      );

      const correctMap = new Map(
        correctRows.map((r) => [r.id, { correct_answer: r.correct_answer, explanation: r.explanation, text: r.text }]),
      );

      let score = 0;
      const wrongQuestions: {
        question_id: string;
        user_answer: number;
        correct_answer: number;
        explanation: string;
      }[] = [];

      for (const answer of answers) {
        const correct = correctMap.get(answer.question_id);
        if (!correct) continue;

        if (answer.selected_option === correct.correct_answer) {
          score++;
        } else {
          wrongQuestions.push({
            question_id: answer.question_id,
            user_answer: answer.selected_option,
            correct_answer: correct.correct_answer,
            explanation: correct.explanation,
          });

          // Insert into wrong_book
          await client.query(
            `INSERT INTO wrong_book (user_id, question_id, user_answer, correct_answer, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (user_id, question_id) DO UPDATE SET
               user_answer = EXCLUDED.user_answer,
               correct_answer = EXCLUDED.correct_answer,
               created_at = NOW()`,
            [user_id, answer.question_id, answer.selected_option, correct.correct_answer],
          );
        }
      }

      const total = answers.length;
      const percentage = Math.round((score / total) * 100 * 100) / 100;

      // Update the test record
      await client.query(
        `UPDATE tests
         SET answers = $1, score = $2, status = 'completed', completed_at = NOW()
         WHERE id = $3`,
        [JSON.stringify(answers), score, testId],
      );

      await client.query("COMMIT");

      return reply.send({
        test_id: testId,
        score,
        total,
        percentage,
        wrong_questions: wrongQuestions,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });
}
