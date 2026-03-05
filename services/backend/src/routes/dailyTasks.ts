import { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../lib/db.js";

const DailyTasksQuerySchema = z.object({
  user_id: z.string().uuid(),
});

interface DailyTask {
  id: string;
  user_id: string;
  task_type: string;
  title: string;
  description: string;
  is_completed: boolean;
  due_date: string;
}

const DEFAULT_TASKS: { task_type: string; title: string; description: string }[] = [
  {
    task_type: "flashcard_review",
    title: "Review Flashcards",
    description: "Review your daily set of flashcards to reinforce memorization.",
  },
  {
    task_type: "mini_test",
    title: "Complete Mini-Test",
    description: "Take a short 10-question mini-test to assess your knowledge.",
  },
  {
    task_type: "wrong_book_review",
    title: "Review Wrong Book",
    description: "Go over previously incorrect answers and study the explanations.",
  },
];

export default async function dailyTaskRoutes(app: FastifyInstance): Promise<void> {
  app.get("/daily-tasks", async (request, reply) => {
    const parsed = DailyTasksQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Validation failed", details: parsed.error.issues });
    }

    const { user_id } = parsed.data;
    const today = new Date().toISOString().slice(0, 10);

    // Check for existing tasks for today
    const { rows: existing } = await query<DailyTask>(
      `SELECT id, user_id, task_type, title, description, is_completed, due_date::text
       FROM tasks
       WHERE user_id = $1 AND due_date::date = $2
       ORDER BY created_at`,
      [user_id, today],
    );

    if (existing.length > 0) {
      return reply.send({ tasks: existing });
    }

    // Auto-generate today's tasks
    const insertedTasks: DailyTask[] = [];

    for (const task of DEFAULT_TASKS) {
      const { rows } = await query<DailyTask>(
        `INSERT INTO tasks (user_id, task_type, title, description, is_completed, due_date, created_at)
         VALUES ($1, $2, $3, $4, false, $5, NOW())
         RETURNING id, user_id, task_type, title, description, is_completed, due_date::text`,
        [user_id, task.task_type, task.title, task.description, today],
      );
      insertedTasks.push(rows[0]);
    }

    return reply.code(201).send({ tasks: insertedTasks });
  });
}
