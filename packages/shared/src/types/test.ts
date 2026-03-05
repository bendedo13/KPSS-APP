import type { Question } from './question';

export interface TestQuestion {
  questionId: string;
  question: Question;
  userAnswer: string | null;
  isCorrect: boolean | null;
  timeSpentSeconds: number | null;
}

export interface Test {
  id: string;
  userId: string;
  topic: string | null;
  questions: TestQuestion[];
  score: number | null;
  totalQuestions: number;
  correctCount: number | null;
  completedAt: string | null;
  createdAt: string;
}

export type CreateTestInput = {
  userId: string;
  topic?: string;
  questionCount?: number;
};

export type SubmitTestInput = {
  answers: Array<{ questionId: string; answer: string; timeSpentSeconds: number }>;
};

export interface TestResult {
  testId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  wrongQuestionIds: string[];
}
