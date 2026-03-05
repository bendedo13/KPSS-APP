import { z } from 'zod';

export const createGoalSchema = z.object({
  target_score: z.number().int().min(0).max(120).describe('Target KPSS score (0-120)'),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Target exam date (YYYY-MM-DD)'),
  focus_topics: z.array(z.string()).min(0).describe('Topics to focus on'),
  difficulty_preference: z
    .enum(['easy', 'medium', 'hard', 'mixed'])
    .default('mixed')
    .describe('Preferred question difficulty'),
  daily_goal_minutes: z.number().int().min(10).max(480).default(60).describe('Daily study goal in minutes'),
});

export const updateGoalSchema = z.object({
  target_score: z.number().int().min(0).max(120).optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  focus_topics: z.array(z.string()).min(0).optional(),
  difficulty_preference: z.enum(['easy', 'medium', 'hard', 'mixed']).optional(),
  daily_goal_minutes: z.number().int().min(10).max(480).optional(),
  status: z.enum(['active', 'paused', 'completed', 'abandoned']).optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
