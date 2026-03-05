'use client';

import { useEffect, useState } from 'react';

interface AIJob {
  id: string;
  status: string;
  topic: string;
  created_at: string;
  question_id?: string;
  text?: string;
  options?: Array<{ label: string; text: string }>;
  difficulty?: string;
  subtopic?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function AIJobsPage() {
  const [jobs, setJobs] = useState<AIJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const savedToken = localStorage.getItem('kpss_admin_token') ?? '';
    setToken(savedToken);
    if (savedToken) fetchJobs(savedToken);
    else setLoading(false);
  }, []);

  async function fetchJobs(authToken: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/ai-jobs`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(jobId: string, action: 'accept' | 'reject') {
    const notes = action === 'reject' ? prompt('Rejection reason (optional):') ?? '' : '';
    try {
      const res = await fetch(`${API_URL}/admin/ai-jobs/${jobId}/review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, reviewer_notes: notes }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchJobs(token);
    } catch (err) {
      alert(`Error: ${err}`);
    }
  }

  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const t = (form.elements.namedItem('token') as HTMLInputElement).value.trim();
    localStorage.setItem('kpss_admin_token', t);
    setToken(t);
    fetchJobs(t);
  }

  if (!token) {
    return (
      <div>
        <h2>Admin Login</h2>
        <p>Paste your JWT token to authenticate:</p>
        <form onSubmit={handleLogin}>
          <input name="token" type="password" placeholder="JWT Token" style={{ width: '400px', padding: '0.5rem' }} />
          {' '}
          <button type="submit">Login</button>
        </form>
      </div>
    );
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div>
      <h2>AI Jobs — Pending Review ({jobs.length})</h2>
      {jobs.length === 0 && <p>No pending jobs. All questions reviewed!</p>}
      {jobs.map((job) => (
        <div key={job.id} style={{ border: '1px solid #ddd', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <strong>Topic:</strong> {job.topic}
              {job.subtopic && <span> / {job.subtopic}</span>}
              {' '}
              <span style={{ background: '#f0f0f0', padding: '0.2rem 0.5rem', borderRadius: '3px', fontSize: '0.85em' }}>
                {job.difficulty}
              </span>
            </div>
            <small style={{ color: '#999' }}>{new Date(job.created_at).toLocaleString('tr-TR')}</small>
          </div>
          {job.text && (
            <div style={{ margin: '0.75rem 0' }}>
              <p><strong>Question:</strong> {job.text}</p>
              {job.options && (
                <ul>
                  {job.options.map((opt) => (
                    <li key={opt.label}><strong>{opt.label}.</strong> {opt.text}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              onClick={() => handleReview(job.id, 'accept')}
              style={{ background: '#22c55e', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
            >
              ✓ Accept
            </button>
            <button
              onClick={() => handleReview(job.id, 'reject')}
              style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
            >
              ✗ Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
