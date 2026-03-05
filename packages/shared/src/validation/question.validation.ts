import { z } from 'zod';

export const questionOptionSchema = z.object({
  label: z.string().length(1, 'Option label must be a single character'),
  text: z.string().min(1, 'Option text cannot be empty'),
});

export const createQuestionSchema = z.object({
  text: z.string().min(10, 'Question text must be at least 10 characters'),
  options: z
    .array(questionOptionSchema)
    .min(2, 'At least 2 options are required')
    .max(5, 'At most 5 options are allowed'),
  correctOption: z.string().length(1, 'Correct option must be a single label'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  topic: z.string().min(1, 'Topic is required'),
  subtopic: z.string().min(1, 'Subtopic is required'),
  estimatedTimeSeconds: z.number().int().min(10).max(300),
  explanation: z.string().min(1, 'Explanation is required'),
  source: z.enum(['ai_generated', 'manual']),
  status: z.enum(['pending_review', 'auto_accepted', 'approved', 'rejected']),
});

export type CreateQuestionSchema = z.infer<typeof createQuestionSchema>;
