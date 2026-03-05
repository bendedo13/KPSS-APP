import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KPSS Admin Panel",
  description: "Administration panel for KPSS application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: "#f5f5f5",
          color: "#1a1a1a",
        }}
      >
        <header
          style={{
            backgroundColor: "#1e293b",
            color: "#fff",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.25rem" }}>KPSS Admin Panel</h1>
          <nav style={{ display: "flex", gap: "16px" }}>
            <a href="/" style={{ color: "#94a3b8", textDecoration: "none" }}>
              Dashboard
            </a>
            <a
              href="/admin/ai-jobs"
              style={{ color: "#94a3b8", textDecoration: "none" }}
            >
              AI Jobs
            </a>
          </nav>
        </header>
        <main style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
