import { z } from 'zod';

export const createTestSchema = z.object({
  topic: z.string().optional(),
  questionCount: z.number().int().min(5).max(50).default(10),
});

export const submitTestSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid('questionId must be a valid UUID'),
        answer: z.string().length(1, 'Answer must be a single option label'),
        timeSpentSeconds: z.number().int().min(0),
      }),
    )
    .min(1, 'At least one answer is required'),
});

export type CreateTestSchema = z.infer<typeof createTestSchema>;
export type SubmitTestSchema = z.infer<typeof submitTestSchema>;
