import type { ApiResponse, AuthTokens, LoginInput, RegisterInput } from '@kpss/shared';
import type { Test, CreateTestInput, SubmitTestInput, TestResult } from '@kpss/shared';
import type { Flashcard, FlashcardReviewInput, SrsResult } from '@kpss/shared';

const BASE_URL = (process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  return response.json() as Promise<ApiResponse<T>>;
}

export const authApi = {
  login: (input: LoginInput) =>
    request<AuthTokens & { user: { id: string; email: string; name: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(input) },
    ),

  register: (input: RegisterInput) =>
    request<AuthTokens & { user: { id: string; email: string; name: string } }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify(input) },
    ),
};

export const testsApi = {
  create: (input: CreateTestInput) =>
    request<{ testId: string; questions: unknown[] }>('/tests/create', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  submit: (testId: string, input: SubmitTestInput) =>
    request<TestResult>(`/tests/${testId}/submit`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  list: (page = 1, pageSize = 20) =>
    request<{ items: Test[]; total: number }>(`/tests?page=${page}&pageSize=${pageSize}`),
};

export const flashcardsApi = {
  list: (page = 1) =>
    request<{ items: Flashcard[]; total: number }>(`/flashcards?page=${page}`),

  review: (input: FlashcardReviewInput) =>
    request<SrsResult>('/flashcards/review', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};
