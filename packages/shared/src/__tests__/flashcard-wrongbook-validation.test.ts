import {
  createFlashcardSchema,
  reviewFlashcardSchema,
  addWrongBookSchema,
} from '../validation';

describe('Flashcard Validation', () => {
  describe('createFlashcardSchema', () => {
    it('should validate valid UUID', () => {
      const result = createFlashcardSchema.safeParse({
        questionId: '550e8400-e29b-41d4-a716-446655440000',
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = createFlashcardSchema.safeParse({
        questionId: 'not-a-uuid',
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject missing questionId', () => {
      const result = createFlashcardSchema.safeParse({});
      
      expect(result.success).toBe(false);
    });
  });

  describe('reviewFlashcardSchema', () => {
    it('should validate valid review input', () => {
      const result = reviewFlashcardSchema.safeParse({
        flashcardId: '550e8400-e29b-41d4-a716-446655440000',
        quality: 4,
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject quality < 0', () => {
      const result = reviewFlashcardSchema.safeParse({
        flashcardId: '550e8400-e29b-41d4-a716-446655440000',
        quality: -1,
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject quality > 5', () => {
      const result = reviewFlashcardSchema.safeParse({
        flashcardId: '550e8400-e29b-41d4-a716-446655440000',
        quality: 6,
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject non-integer quality', () => {
      const result = reviewFlashcardSchema.safeParse({
        flashcardId: '550e8400-e29b-41d4-a716-446655440000',
        quality: 3.5,
      });
      
      expect(result.success).toBe(false);
    });
  });
});

describe('Wrong Book Validation', () => {
  describe('addWrongBookSchema', () => {
    it('should validate valid UUID', () => {
      const result = addWrongBookSchema.safeParse({
        questionId: '550e8400-e29b-41d4-a716-446655440000',
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = addWrongBookSchema.safeParse({
        questionId: 'invalid',
      });
      
      expect(result.success).toBe(false);
    });
  });
});
