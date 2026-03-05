interface GenerateQuestionPayload {
  topic: string;
  subtopic?: string;
  difficulty: string;
}

interface GeneratedQuestion {
  text: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  difficulty: string;
  topic: string;
  subtopic?: string;
}

interface VerifyResult {
  valid: boolean;
  issues: string[];
  correct_answer_check: boolean;
  confidence: number;
}

export async function generateQuestion(
  payload: GenerateQuestionPayload,
): Promise<GeneratedQuestion> {
  if (process.env.LLM_DRY_RUN !== "false") {
    return {
      text: `Mock question about ${payload.topic}${payload.subtopic ? ` / ${payload.subtopic}` : ""}`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct_answer: 0,
      explanation: "This is a mock explanation for dry-run mode.",
      difficulty: payload.difficulty,
      topic: payload.topic,
      subtopic: payload.subtopic,
    };
  }

  // TODO: Replace with actual HTTP call to LLM API.
  // Use process.env.LLM_API_URL and process.env.LLM_API_KEY (never log the key).
  // Example:
  //   const response = await fetch(process.env.LLM_API_URL!, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Authorization: `Bearer ${process.env.LLM_API_KEY}`,
  //     },
  //     body: JSON.stringify(payload),
  //   });
  //   return response.json();
  throw new Error("LLM API integration not yet implemented");
}

export async function verifyQuestion(
  _question: object,
): Promise<VerifyResult> {
  if (process.env.LLM_DRY_RUN !== "false") {
    return {
      valid: true,
      issues: [],
      correct_answer_check: true,
      confidence: 0.95,
    };
  }

  // TODO: Replace with actual HTTP call to LLM verification endpoint.
  throw new Error("LLM verification API integration not yet implemented");
}
