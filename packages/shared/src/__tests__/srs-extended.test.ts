import { calculateNextReview } from '../utils/srs';

describe('SRS Algorithm (SM-2)', () => {
  describe('calculateNextReview', () => {
    it('should reset card when quality < 3', () => {
      const result = calculateNextReview(2, 5, 2.5, 14);
      
      expect(result.nextRepetitions).toBe(0);
      expect(result.nextInterval).toBe(1);
      expect(result.nextEaseFactor).toBeLessThan(2.5);
    });

    it('should progress card when quality >= 3', () => {
      const result = calculateNextReview(4, 2, 2.5, 7);
      
      expect(result.nextRepetitions).toBe(3);
      expect(result.nextInterval).toBeGreaterThan(7);
      expect(result.nextEaseFactor).toBeGreaterThanOrEqual(2.5);
    });

    it('should set interval to 1 for first repetition', () => {
      const result = calculateNextReview(5, 0, 2.5, 1);
      
      expect(result.nextInterval).toBe(1);
      expect(result.nextRepetitions).toBe(1);
    });

    it('should set interval to 3 for second repetition', () => {
      const result = calculateNextReview(5, 1, 2.5, 1);
      
      expect(result.nextInterval).toBe(3);
      expect(result.nextRepetitions).toBe(2);
    });

    it('should maintain minimum ease factor of 1.3', () => {
      const result = calculateNextReview(0, 10, 1.3, 30);
      
      expect(result.nextEaseFactor).toBeGreaterThanOrEqual(1.3);
    });

    it('should return valid ISO date string for nextReviewAt', () => {
      const result = calculateNextReview(4, 2, 2.5, 7);
      
      expect(new Date(result.nextReviewAt).toISOString()).toBe(result.nextReviewAt);
      expect(new Date(result.nextReviewAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle perfect quality (5)', () => {
      const result = calculateNextReview(5, 5, 2.8, 30);
      
      expect(result.nextRepetitions).toBe(6);
      expect(result.nextInterval).toBe(30); // Max interval
      expect(result.nextEaseFactor).toBeGreaterThan(2.8);
    });

    it('should handle worst quality (0)', () => {
      const result = calculateNextReview(0, 10, 2.5, 30);
      
      expect(result.nextRepetitions).toBe(0);
      expect(result.nextInterval).toBe(1);
    });
  });
});
