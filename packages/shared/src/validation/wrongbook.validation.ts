import { z } from 'zod';

export const addWrongBookSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
});

export const removeWrongBookSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
});

export type AddWrongBookInput = z.infer<typeof addWrongBookSchema>;
export type RemoveWrongBookInput = z.infer<typeof removeWrongBookSchema>;
