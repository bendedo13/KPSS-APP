'use client';
import { useState, useEffect } from 'react';

interface AIJob {
  id: string;
  status: string;
  created_at: string;
  question_id?: string;
  text?: string;
  options?: Array<{ label: string; text: string }>;
  correct_option?: string;
  difficulty?: string;
  explanation?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function fetchJobs(token: string): Promise<AIJob[]> {
  const res = await fetch(`${API_URL}/admin/ai-jobs?status=pending_review`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch jobs');
  const data = await res.json();
  return data.jobs ?? [];
}

async function reviewJob(id: string, action: 'accept' | 'reject', token: string, reason?: string) {
  const res = await fetch(`${API_URL}/admin/ai-jobs/${id}/${action}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: action === 'reject' ? JSON.stringify({ reason }) : undefined,
  });
  if (!res.ok) throw new Error(`Failed to ${action} job`);
}

export default function AIJobsPage() {
  const [jobs, setJobs] = useState<AIJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('kpss_token') ?? '' : '';
    setToken(stored);
    if (stored) {
      fetchJobs(stored).then(setJobs).catch(e => setError(e.message)).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleAction = async (id: string, action: 'accept' | 'reject') => {
    try {
      await reviewJob(id, action, token, action === 'reject' ? rejectReason : undefined);
      setJobs(prev => prev.filter(j => j.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  if (!token) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Giriş Gerekli</h2>
        <input
          placeholder="JWT Token"
          style={{ width: '400px', marginRight: '1rem' }}
          onChange={e => {
            localStorage.setItem('kpss_token', e.target.value);
            setToken(e.target.value);
          }}
        />
      </div>
    );
  }

  if (loading) return <div style={{ padding: '2rem' }}>Yükleniyor...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>Hata: {error}</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>AI Soru İnceleme ({jobs.length} bekliyor)</h1>
      {jobs.length === 0 && <p>İncelenecek soru yok.</p>}
      {jobs.map(job => (
        <div key={job.id} style={{
          border: '1px solid #ccc', borderRadius: '8px',
          padding: '1rem', marginBottom: '1rem',
        }}>
          <p><strong>Soru:</strong> {job.text ?? '—'}</p>
          <p><strong>Zorluk:</strong> {job.difficulty} | <strong>Doğru cevap:</strong> {job.correct_option}</p>
          {job.options && (
            <ul>
              {job.options.map(o => (
                <li key={o.label} style={{ fontWeight: o.label === job.correct_option ? 'bold' : 'normal' }}>
                  {o.label}) {o.text}
                </li>
              ))}
            </ul>
          )}
          <p><strong>Açıklama:</strong> {job.explanation ?? '—'}</p>
          <div style={{ marginTop: '1rem' }}>
            <button
              onClick={() => handleAction(job.id, 'accept')}
              style={{ background: '#22c55e', color: '#fff', padding: '0.5rem 1rem', marginRight: '1rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              ✓ Kabul Et
            </button>
            <input
              placeholder="Reddetme nedeni (isteğe bağlı)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              style={{ marginRight: '0.5rem', padding: '0.4rem' }}
            />
            <button
              onClick={() => handleAction(job.id, 'reject')}
              style={{ background: '#ef4444', color: '#fff', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              ✗ Reddet
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
