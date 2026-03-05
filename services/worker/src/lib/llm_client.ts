/**
 * Worker LLM Client — re-uses the same interface as the backend
 * SECURITY: LLM_API_KEY must be set server-side in .env
 * LEGAL: Do NOT scrape paywalled exam content without a licensing agreement.
 */

export interface GenerateQuestionPayload {
  topic: string;
  subtopic?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  count?: number;
}

export interface GeneratedQuestion {
  question_id: null;
  text: string;
  options: Array<{ label: string; text: string }>;
  correct_option: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  subtopic: string;
  estimated_time_seconds: number;
  explanation: string;
  source: 'ai/generated';
  confidence?: 'low' | 'medium' | 'high';
}

export interface VerificationResult {
  valid: boolean;
  issues: string[];
  correct_answer_check: boolean;
  confidence: number;
}

const MOCK_QUESTION: GeneratedQuestion = {
  question_id: null,
  text: 'Türkiye Cumhuriyeti kaç yılında kurulmuştur?',
  options: [
    { label: 'A', text: '1919' },
    { label: 'B', text: '1923' },
    { label: 'C', text: '1920' },
    { label: 'D', text: '1918' },
  ],
  correct_option: 'B',
  difficulty: 'easy',
  topic: 'Tarih',
  subtopic: 'Türk İnkılap Tarihi',
  estimated_time_seconds: 30,
  explanation: 'Türkiye Cumhuriyeti, 29 Ekim 1923 tarihinde ilan edilmiştir.',
  source: 'ai/generated',
  confidence: 'high',
};

export async function generateQuestion(payload: GenerateQuestionPayload): Promise<GeneratedQuestion[]> {
  if (process.env.LLM_DRY_RUN !== 'false') {
    return [{ ...MOCK_QUESTION, topic: payload.topic, difficulty: payload.difficulty }];
  }
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('LLM_API_KEY not set');
  // TODO: Implement with GEN_Q_V1 prompt template (see docs/llm_prompts.md)
  throw new Error('Real LLM not implemented');
}

export async function verifyQuestion(question: GeneratedQuestion): Promise<VerificationResult> {
  if (process.env.LLM_DRY_RUN !== 'false') {
    return { valid: true, issues: [], correct_answer_check: true, confidence: 0.95 };
  }
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('LLM_API_KEY not set');
  // TODO: Implement with VERIFY_Q_V1 prompt template (see docs/llm_prompts.md)
  throw new Error('Real LLM not implemented');
}
