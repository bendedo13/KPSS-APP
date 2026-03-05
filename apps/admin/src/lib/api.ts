const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:30003";

export interface AIJob {
  id: string;
  text: string;
  topic: string;
  difficulty: string;
  confidence: number;
  source: string;
  status: string;
}

export async function fetchWithAuth(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Placeholder: replace with real token retrieval
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("admin_token")
      : null;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}

export async function getAIJobs(
  status: string = "pending_review",
): Promise<AIJob[]> {
  const res = await fetchWithAuth(
    `/admin/ai-jobs?status=${encodeURIComponent(status)}`,
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch AI jobs: ${res.status}`);
  }
  return res.json();
}

export async function acceptJob(id: string): Promise<void> {
  const res = await fetchWithAuth(`/admin/ai-jobs/${id}/accept`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Failed to accept job ${id}: ${res.status}`);
  }
}

export async function rejectJob(id: string, reason?: string): Promise<void> {
  const res = await fetchWithAuth(`/admin/ai-jobs/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    throw new Error(`Failed to reject job ${id}: ${res.status}`);
  }
}
