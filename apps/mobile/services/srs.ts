/**
 * SM-2 Spaced Repetition Algorithm
 *
 * The SM-2 algorithm calculates optimal review intervals based on how well
 * a user recalls an item. It adjusts the "ease factor" (how easy the card is)
 * and the interval between reviews.
 *
 * Quality ratings (0-5):
 *   0 - Complete blackout, no recall at all
 *   1 - Incorrect, but upon seeing the answer, remembered
 *   2 - Incorrect, but the answer seemed easy to recall
 *   3 - Correct, but with significant difficulty
 *   4 - Correct, with some hesitation
 *   5 - Perfect recall, no hesitation
 *
 * Algorithm steps:
 *   1. If quality < 3 → reset repetitions & interval to 1 day (failed recall)
 *   2. If quality >= 3 → increase interval based on repetition count:
 *      - 1st successful: interval = 1 day
 *      - 2nd successful: interval = 6 days
 *      - Subsequent: interval = previous_interval × ease_factor
 *   3. Update ease factor: EF' = EF + (0.1 - (5 - q) × (0.08 + (5 - q) × 0.02))
 *   4. Ease factor minimum is 1.3
 */

export interface SRSInput {
  /** User's quality rating of recall: 0 (blackout) to 5 (perfect) */
  quality: number;
  /** Current ease factor (default 2.5 for new cards) */
  easeFactor: number;
  /** Current interval in days between reviews */
  interval: number;
  /** Number of consecutive successful recalls */
  repetitions: number;
}

export interface SRSOutput {
  /** Updated ease factor */
  newEaseFactor: number;
  /** New interval in days until next review */
  newInterval: number;
  /** Updated consecutive successful recall count */
  newRepetitions: number;
  /** ISO date string for the next scheduled review */
  nextReviewDate: string;
}

/** Default ease factor for brand-new cards */
export const DEFAULT_EASE_FACTOR = 2.5;
/** Minimum ease factor — cards never become "harder" than this */
const MIN_EASE_FACTOR = 1.3;

/**
 * Calculates the next review schedule using the SM-2 algorithm.
 */
export function calculateSRS(input: SRSInput): SRSOutput {
  const { quality, easeFactor, interval, repetitions } = input;

  // Clamp quality to valid range
  const q = Math.max(0, Math.min(5, Math.round(quality)));

  let newInterval: number;
  let newRepetitions: number;
  let newEaseFactor: number;

  if (q < 3) {
    // Failed recall → reset to beginning
    newRepetitions = 0;
    newInterval = 1;
  } else {
    // Successful recall → advance schedule
    newRepetitions = repetitions + 1;

    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
  }

  // Update ease factor using SM-2 formula:
  // EF' = EF + (0.1 - (5 - q) × (0.08 + (5 - q) × 0.02))
  newEaseFactor =
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  // Enforce minimum ease factor
  if (newEaseFactor < MIN_EASE_FACTOR) {
    newEaseFactor = MIN_EASE_FACTOR;
  }

  // Round ease factor to 2 decimal places for clean storage
  newEaseFactor = Math.round(newEaseFactor * 100) / 100;

  // Calculate the next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);
  const nextReviewDate = nextReview.toISOString();

  return {
    newEaseFactor,
    newInterval,
    newRepetitions,
    nextReviewDate,
  };
}
