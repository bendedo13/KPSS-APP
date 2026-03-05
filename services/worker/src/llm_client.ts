// LLM Client — all API keys are server-side only.
// When LLM_DRY_RUN=true (default), returns mock data.
// NEVER import or expose OPENAI_API_KEY in frontend code.

export interface GenerateQuestionPayload {
  topic: string;
  subtopic?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  count?: number;
}

export interface LLMQuestion {
  question_id: null;
  text: string;
  options: Array<{ label: string; text: string }>;
  correct_option: string;
  difficulty: string;
  topic: string;
  subtopic: string;
  estimated_time_seconds: number;
  explanation: string;
  source: string;
  confidence?: number;
}

export interface VerifyResult {
  valid: boolean;
  issues: string[];
  correct_answer_check: boolean;
  confidence: number;
}

const DRY_RUN = process.env.LLM_DRY_RUN !== 'false';

export async function generateQuestion(payload: GenerateQuestionPayload): Promise<LLMQuestion> {
  if (DRY_RUN) {
    return {
      question_id: null,
      text: `[MOCK] ${payload.topic} konusunda örnek soru?`,
      options: [
        { label: 'A', text: 'Şık A' },
        { label: 'B', text: 'Şık B' },
        { label: 'C', text: 'Şık C' },
        { label: 'D', text: 'Şık D' },
        { label: 'E', text: 'Şık E' },
      ],
      correct_option: 'A',
      difficulty: payload.difficulty,
      topic: payload.topic,
      subtopic: payload.subtopic ?? payload.topic,
      estimated_time_seconds: 60,
      explanation: '[MOCK] Bu örnek bir açıklamadır.',
      source: 'ai/generated',
      confidence: 0.9,
    };
  }

  // Real LLM call — requires OPENAI_API_KEY in server env
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: GEN_Q_V1_SYSTEM },
        { role: 'user', content: buildGenPrompt(payload) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json() as any;
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    throw new Error(`Failed to parse LLM generateQuestion response: ${data.choices?.[0]?.message?.content}`);
  }
}

export async function verifyQuestion(question: LLMQuestion): Promise<VerifyResult> {
  if (DRY_RUN) {
    return { valid: true, issues: [], correct_answer_check: true, confidence: 0.95 };
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: VERIFY_Q_V1_SYSTEM },
        { role: 'user', content: JSON.stringify(question) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json() as any;
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    throw new Error(`Failed to parse LLM verifyQuestion response: ${data.choices?.[0]?.message?.content}`);
  }
}

// Prompt templates (also stored in docs/llm_prompts.md)
const GEN_Q_V1_SYSTEM = `You are an expert Turkish civil service exam (KPSS) question writer. Generate questions strictly in JSON format with no extra text. Schema: {"question_id":null,"text":"...","options":[{"label":"A","text":"..."},...],"correct_option":"A","difficulty":"easy|medium|hard","topic":"...","subtopic":"...","estimated_time_seconds":60,"explanation":"...","source":"ai/generated","confidence":0.0-1.0}. Rules: (1) Do NOT hallucinate citations; if uncertain set confidence<0.7 and it will be flagged for review. (2) source must be "ai/generated". (3) Write in Turkish. (4) Provide exactly 5 options A-E. (5) Only include real, verifiable knowledge.`;

const VERIFY_Q_V1_SYSTEM = `You are a strict KPSS exam question verifier. Given a JSON question object, verify it and return JSON: {"valid":true/false,"issues":["..."],"correct_answer_check":true/false,"confidence":0.0-1.0}. Check: (1) Is the correct_option actually correct? (2) Are all options plausible? (3) Is the question clear and unambiguous? (4) Is the explanation accurate? (5) Flag any potential IP/copyright issues.`;

function buildGenPrompt(payload: GenerateQuestionPayload): string {
  return `Generate 1 KPSS question. Topic: ${payload.topic}. Subtopic: ${payload.subtopic ?? payload.topic}. Difficulty: ${payload.difficulty}. Return JSON only.`;
}
