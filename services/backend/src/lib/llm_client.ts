/**
 * LLM Client — Safe stub/real implementation
 *
 * SECURITY NOTE: LLM API keys are stored server-side only.
 * Never expose LLM_API_KEY to frontend code.
 *
 * Set LLM_DRY_RUN=false in server .env to enable real LLM calls.
 * Default: LLM_DRY_RUN=true (returns mock data).
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

/**
 * Generate KPSS question(s) using the GEN_Q_V1 prompt template.
 * In dry-run mode, returns mock data without calling the LLM.
 */
export async function generateQuestion(
  payload: GenerateQuestionPayload,
): Promise<GeneratedQuestion[]> {
  if (process.env.LLM_DRY_RUN !== 'false') {
    console.log('[LLM_CLIENT] dry-run: generateQuestion', payload);
    return [{ ...MOCK_QUESTION, topic: payload.topic, difficulty: payload.difficulty }];
  }

  // Real implementation — requires LLM_API_KEY in environment
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error('LLM_API_KEY not set. Cannot call LLM.');
  }

  // TODO: Replace with actual LLM API call using GEN_Q_V1 template from docs/llm_prompts.md
  throw new Error('Real LLM call not implemented. Set LLM_DRY_RUN=true for testing.');
}

/**
 * Verify a generated question using the VERIFY_Q_V1 prompt template.
 */
export async function verifyQuestion(
  question: GeneratedQuestion,
): Promise<VerificationResult> {
  if (process.env.LLM_DRY_RUN !== 'false') {
    console.log('[LLM_CLIENT] dry-run: verifyQuestion', question.text.slice(0, 50));
    return { valid: true, issues: [], correct_answer_check: true, confidence: 0.95 };
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error('LLM_API_KEY not set. Cannot call LLM.');
  }

  // TODO: Replace with actual LLM API call using VERIFY_Q_V1 template from docs/llm_prompts.md
  throw new Error('Real LLM call not implemented. Set LLM_DRY_RUN=true for testing.');
}
