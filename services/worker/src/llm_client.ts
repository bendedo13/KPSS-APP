import { formatPrompt } from './prompt_templates.js';

interface GeneratedQuestion {
  question_id: null;
  text: string;
  options: { label: string; text: string }[];
  correct_option: string;
  difficulty: string;
  topic: string;
  subtopic: string;
  estimated_time_seconds: number;
  explanation: string;
  source: string;
}

interface VerificationResult {
  valid: boolean;
  issues: string[];
  correct_answer_check: boolean;
  confidence: number;
}

const isDryRun = (): boolean => process.env.LLM_DRY_RUN !== 'false';

export async function callPrimaryLLM(prompt: string): Promise<GeneratedQuestion> {
  if (isDryRun()) {
    return {
      question_id: null,
      text: 'Aşağıdakilerden hangisi 1982 Anayasası ile getirilen yeniliklerden biri değildir?',
      options: [
        { label: 'A', text: 'Cumhurbaşkanına kanun hükmünde kararname çıkarma yetkisi verilmesi' },
        { label: 'B', text: 'Devlet Denetleme Kurulunun oluşturulması' },
        { label: 'C', text: 'Siyasi partilere devlet yardımı yapılması' },
        { label: 'D', text: 'Milletvekilliği ile bağdaşmayan işler kapsamının genişletilmesi' },
        { label: 'E', text: 'Çift meclisli yapının benimsenmesi' },
      ],
      correct_option: 'E',
      difficulty: 'medium',
      topic: 'Anayasa Hukuku',
      subtopic: '1982 Anayasası',
      estimated_time_seconds: 60,
      explanation:
        '1982 Anayasası tek meclisli yapıyı benimsemiştir. Çift meclisli yapı 1961 Anayasasına aittir.',
      source: 'ai/generated',
    };
  }

  // TODO: Implement real HTTP call to LLM API (e.g., OpenAI, Anthropic)
  // const response = await fetch(process.env.LLM_API_URL!, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${process.env.LLM_API_KEY}`,
  //   },
  //   body: JSON.stringify({ prompt, max_tokens: 2000 }),
  // });
  // return response.json();
  throw new Error('Real LLM API not configured. Set LLM_DRY_RUN=false only when API is ready.');
}

export async function callVerifierLLM(prompt: string): Promise<VerificationResult> {
  if (isDryRun()) {
    return {
      valid: true,
      issues: [],
      correct_answer_check: true,
      confidence: 0.95,
    };
  }

  // TODO: Implement real HTTP call to verifier LLM API
  throw new Error('Real LLM API not configured. Set LLM_DRY_RUN=false only when API is ready.');
}

export function buildPrompt(
  template: string,
  variables: Record<string, string>,
): string {
  return formatPrompt(template, variables);
}
