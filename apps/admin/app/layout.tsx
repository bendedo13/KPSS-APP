import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KPSS Admin',
  description: 'KPSS Platform Admin Panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <nav style={{ padding: '1rem', borderBottom: '1px solid #eee', marginBottom: '1rem' }}>
          <strong>KPSS Admin</strong>
          {' | '}
          <a href="/admin/ai-jobs">AI Jobs</a>
        </nav>
        <main style={{ padding: '1rem' }}>{children}</main>
      </body>
    </html>
  );
}
