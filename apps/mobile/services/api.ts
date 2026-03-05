/**
 * Typed API client for the KPSS backend.
 * Base URL is read from environment or falls back to localhost.
 * No secrets are stored in this file — authentication tokens are
 * passed at runtime after login.
 */

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:30003";

// ─── Response types ──────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface DailyTask {
  id: string;
  title: string;
  type: "flashcard_review" | "mini_test" | "wrong_book_review";
  completed: boolean;
  target: number;
  current: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topicId: string;
  topicName: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
}

export interface TestQuestion {
  id: string;
  text: string;
  options: { label: string; text: string }[];
  topicId: string;
  topicName: string;
}

export interface TestResult {
  testId: string;
  score: number;
  total: number;
  answers: {
    questionId: string;
    selected: string;
    correct: string;
    isCorrect: boolean;
  }[];
}

export interface WrongBookEntry {
  id: string;
  questionId: string;
  questionText: string;
  topicId: string;
  topicName: string;
  userAnswer: string;
  correctAnswer: string;
  reviewedAt: string | null;
  nextReviewDate: string;
}

// ─── Error handling ──────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "Unknown error");
    throw new ApiError(response.status, body);
  }

  return response.json() as Promise<T>;
}

// ─── API methods ─────────────────────────────────────────────────

export function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getDailyTasks(token: string): Promise<DailyTask[]> {
  return request<DailyTask[]>("/api/daily-tasks", {}, token);
}

export function getFlashcards(token: string): Promise<Flashcard[]> {
  return request<Flashcard[]>("/api/flashcards/due", {}, token);
}

export function createTest(
  token: string,
  topicId?: string,
  count: number = 10,
): Promise<{ testId: string; questions: TestQuestion[] }> {
  return request<{ testId: string; questions: TestQuestion[] }>(
    "/api/tests",
    {
      method: "POST",
      body: JSON.stringify({ topicId, count }),
    },
    token,
  );
}

export function submitTest(
  token: string,
  testId: string,
  answers: { questionId: string; selected: string }[],
): Promise<TestResult> {
  return request<TestResult>(
    `/api/tests/${encodeURIComponent(testId)}/submit`,
    {
      method: "POST",
      body: JSON.stringify({ answers }),
    },
    token,
  );
}

export function getWrongBook(
  token: string,
  topicId?: string,
): Promise<WrongBookEntry[]> {
  const query = topicId
    ? `?topicId=${encodeURIComponent(topicId)}`
    : "";
  return request<WrongBookEntry[]>(
    `/api/wrong-book${query}`,
    {},
    token,
  );
}

export function markReviewed(
  token: string,
  entryId: string,
  quality: number,
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(
    `/api/wrong-book/${encodeURIComponent(entryId)}/review`,
    {
      method: "POST",
      body: JSON.stringify({ quality }),
    },
    token,
  );
}
