import { z } from 'zod';

export const createFlashcardSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
});

export const reviewFlashcardSchema = z.object({
  flashcardId: z.string().uuid('Invalid flashcard ID'),
  quality: z
    .number()
    .int()
    .min(0, 'Quality must be between 0 and 5')
    .max(5, 'Quality must be between 0 and 5'),
});

export type CreateFlashcardInput = z.infer<typeof createFlashcardSchema>;
export type ReviewFlashcardInput = z.infer<typeof reviewFlashcardSchema>;
