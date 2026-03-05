import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KPSS Admin',
  description: 'KPSS Platform Admin Panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
