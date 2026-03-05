import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>KPSS Admin Panel</h1>
      <nav>
        <ul>
          <li><Link href="/admin/ai-jobs">AI Soru İnceleme</Link></li>
        </ul>
      </nav>
    </main>
  );
}
