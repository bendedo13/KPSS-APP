export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  label: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
  correctOption: string;
  difficulty: Difficulty;
  topic: string;
  subtopic: string;
  estimatedTimeSeconds: number;
  explanation: string;
  source: 'ai/generated' | 'manual';
  status: 'pending_review' | 'auto_accepted' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export type CreateQuestionInput = Omit<Question, 'id' | 'createdAt' | 'updatedAt'>;
