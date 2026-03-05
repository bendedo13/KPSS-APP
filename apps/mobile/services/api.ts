/**
 * KPSS Mobile API Client
 *
 * SECURITY NOTE: API_BASE_URL is configured via EXP_URL env var at build time.
 * NEVER embed API keys or secrets in mobile app code.
 */

import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// API base URL from build-time env variable
// Set EXPO_PUBLIC_API_URL in .env.local or EAS build environment
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  Constants.expoConfig?.extra?.apiUrl ??
  'http://localhost:3001';

const TOKEN_KEY = 'kpss_auth_token';

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  task_type: string;
  target_count: number;
  completed_count: number;
  is_completed: boolean;
}

export interface TestQuestion {
  id: string;
  text: string;
  options: Array<{ label: string; text: string }>;
  difficulty: string;
}

export interface TestSubmitResult {
  test_id: string;
  score: number;
  total_questions: number;
  score_percent: number;
  wrongs_added: number;
  wrongs: WrongBookEntry[];
}

export interface WrongBookEntry {
  question_id: string;
  text: string;
  selected_option: string;
  correct_option: string;
  review_count: number;
  last_seen_at: string;
  topic?: string;
}

export const apiClient = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string; role: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
      false,
    ),

  // Daily tasks
  getDailyTasks: () =>
    request<{ date: string; tasks: DailyTask[] }>('/daily-tasks'),

  completeTask: (taskId: string) =>
    request<{ success: boolean }>(`/daily-tasks/${taskId}/complete`, { method: 'POST' }),

  // Tests
  createTest: (params: { topic_id?: string; question_count?: number; difficulty?: string }) =>
    request<{ test_id: string; questions: TestQuestion[] }>('/tests/create', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  submitTest: (testId: string, answers: Array<{ question_id: string; selected_option: string }>) =>
    request<TestSubmitResult>(
      `/tests/${testId}/submit`,
      { method: 'POST', body: JSON.stringify({ answers }) },
    ),

  // Wrong book
  getWrongBook: () =>
    request<{ wrongs: WrongBookEntry[] }>('/wrong-book'),
};
