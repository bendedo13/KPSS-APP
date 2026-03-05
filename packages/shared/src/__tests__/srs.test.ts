import { calculateNextReview } from '../utils/srs';

describe('calculateNextReview (SM-2)', () => {
  it('resets interval to 1 when quality is below 3', () => {
    const result = calculateNextReview(2, 5, 2.5, 14);
    expect(result.nextInterval).toBe(1);
    expect(result.nextRepetitions).toBe(0);
  });

  it('sets interval to 1 on first successful review', () => {
    const result = calculateNextReview(4, 0, 2.5, 1);
    expect(result.nextInterval).toBe(1);
    expect(result.nextRepetitions).toBe(1);
  });

  it('sets interval to 3 on second successful review', () => {
    const result = calculateNextReview(4, 1, 2.5, 1);
    expect(result.nextInterval).toBe(3);
    expect(result.nextRepetitions).toBe(2);
  });

  it('increases ease factor for perfect quality', () => {
    const result = calculateNextReview(5, 2, 2.5, 7);
    expect(result.nextEaseFactor).toBeGreaterThan(2.5);
  });

  it('decreases ease factor for poor quality', () => {
    const result = calculateNextReview(3, 2, 2.5, 7);
    expect(result.nextEaseFactor).toBeLessThan(2.5);
  });

  it('never sets ease factor below 1.3', () => {
    const result = calculateNextReview(3, 2, 1.3, 1);
    expect(result.nextEaseFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('sets nextReviewAt in the future', () => {
    const result = calculateNextReview(5, 3, 2.5, 7);
    expect(new Date(result.nextReviewAt).getTime()).toBeGreaterThan(Date.now());
  });
});
