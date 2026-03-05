import { createQuestionSchema } from '../validation/question.validation';
import { createTestSchema, submitTestSchema } from '../validation/test.validation';
import { loginSchema, registerSchema } from '../validation/user.validation';

describe('createQuestionSchema', () => {
  const valid = {
    text: 'What is the capital of Turkey?',
    options: [
      { label: 'A', text: 'Istanbul' },
      { label: 'B', text: 'Ankara' },
    ],
    correctOption: 'B',
    difficulty: 'easy',
    topic: 'Geography',
    subtopic: 'Capitals',
    estimatedTimeSeconds: 30,
    explanation: 'Ankara is the capital since 1923.',
    source: 'manual',
    status: 'approved',
  };

  it('accepts valid question input', () => {
    expect(() => createQuestionSchema.parse(valid)).not.toThrow();
  });

  it('rejects question text shorter than 10 chars', () => {
    expect(() => createQuestionSchema.parse({ ...valid, text: 'Short' })).toThrow();
  });

  it('rejects fewer than 2 options', () => {
    expect(() => createQuestionSchema.parse({ ...valid, options: [{ label: 'A', text: 'Only one' }] })).toThrow();
  });
});

describe('createTestSchema', () => {
  it('accepts empty body using defaults', () => {
    const result = createTestSchema.parse({});
    expect(result.questionCount).toBe(10);
  });

  it('rejects questionCount below 5', () => {
    expect(() => createTestSchema.parse({ questionCount: 2 })).toThrow();
  });
});

describe('submitTestSchema', () => {
  it('accepts valid answers', () => {
    const input = {
      answers: [
        { questionId: '123e4567-e89b-12d3-a456-426614174000', answer: 'A', timeSpentSeconds: 15 },
      ],
    };
    expect(() => submitTestSchema.parse(input)).not.toThrow();
  });

  it('rejects empty answers array', () => {
    expect(() => submitTestSchema.parse({ answers: [] })).toThrow();
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expect(() => loginSchema.parse({ email: 'user@example.com', password: 'pass' })).not.toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => loginSchema.parse({ email: 'not-an-email', password: 'pass' })).toThrow();
  });
});

describe('registerSchema', () => {
  it('accepts valid registration data', () => {
    expect(() =>
      registerSchema.parse({ email: 'user@example.com', password: 'Password1', name: 'Alice' }),
    ).not.toThrow();
  });

  it('rejects weak password without uppercase', () => {
    expect(() =>
      registerSchema.parse({ email: 'user@example.com', password: 'password1', name: 'Alice' }),
    ).toThrow();
  });

  it('rejects weak password without digit', () => {
    expect(() =>
      registerSchema.parse({ email: 'user@example.com', password: 'Password', name: 'Alice' }),
    ).toThrow();
  });
});
