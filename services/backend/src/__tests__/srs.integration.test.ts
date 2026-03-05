import { calculateNextReview } from '@kpss/shared';

describe('SRS Utils Integration', () => {
  it('should calculate next review correctly', () => {
    const result = calculateNextReview(4, 2, 2.5, 7);
    
    expect(result).toHaveProperty('nextInterval');
    expect(result).toHaveProperty('nextEaseFactor');
    expect(result).toHaveProperty('nextRepetitions');
    expect(result).toHaveProperty('nextReviewAt');
  });

  it('should handle edge cases', () => {
    // First review
    const firstReview = calculateNextReview(5, 0, 2.5, 1);
    expect(firstReview.nextInterval).toBe(1);
    
    // Failed review
    const failedReview = calculateNextReview(2, 10, 2.8, 30);
    expect(failedReview.nextRepetitions).toBe(0);
    expect(failedReview.nextInterval).toBe(1);
  });
});
