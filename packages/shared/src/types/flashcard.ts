export type SrsInterval = 1 | 3 | 7 | 14 | 30;

export interface Flashcard {
  id: string;
  userId: string;
  questionId: string;
  nextReviewAt: string;
  interval: SrsInterval;
  easeFactor: number;
  repetitions: number;
  createdAt: string;
  updatedAt: string;
}

export type FlashcardReviewInput = {
  flashcardId: string;
  quality: 0 | 1 | 2 | 3 | 4 | 5;
};

export interface SrsResult {
  nextInterval: SrsInterval;
  nextEaseFactor: number;
  nextRepetitions: number;
  nextReviewAt: string;
}
