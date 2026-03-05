import type { SrsInterval, SrsResult } from '../types/flashcard';

/**
 * SM-2 spaced-repetition algorithm.
 * Centralised so the same scheduling logic is not duplicated
 * in the backend worker and the mobile offline review engine.
 */
export function calculateNextReview(
  quality: number,
  repetitions: number,
  easeFactor: number,
  currentInterval: SrsInterval,
): SrsResult {
  let nextRepetitions: number;
  let nextInterval: SrsInterval;
  let nextEaseFactor: number;

  if (quality < 3) {
    nextRepetitions = 0;
    nextInterval = 1;
  } else {
    nextRepetitions = repetitions + 1;
    if (repetitions === 0) {
      nextInterval = 1;
    } else if (repetitions === 1) {
      nextInterval = 3;
    } else {
      nextInterval = clampInterval(Math.round(currentInterval * easeFactor));
    }
  }

  nextEaseFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
  );

  const nextReviewAt = new Date(
    Date.now() + nextInterval * 24 * 60 * 60 * 1000,
  ).toISOString();

  return { nextInterval, nextEaseFactor, nextRepetitions, nextReviewAt };
}

function clampInterval(value: number): SrsInterval {
  const valid: SrsInterval[] = [1, 3, 7, 14, 30];
  return (valid.find((v) => v >= value) ?? 30) as SrsInterval;
}
