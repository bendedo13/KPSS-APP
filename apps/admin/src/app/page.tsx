const sections = [
  {
    title: "AI Jobs",
    description: "Review and approve AI-generated questions",
    href: "/admin/ai-jobs",
  },
  {
    title: "Questions",
    description: "Manage the question bank",
    href: "/admin/questions",
  },
  {
    title: "Users",
    description: "Manage user accounts and roles",
    href: "/admin/users",
  },
];

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  borderRadius: "8px",
  padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  textDecoration: "none",
  color: "inherit",
  display: "block",
  transition: "box-shadow 0.15s",
};

export default function DashboardPage() {
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        {sections.map((s) => (
          <a key={s.href} href={s.href} style={cardStyle}>
            <h3 style={{ margin: "0 0 8px" }}>{s.title}</h3>
            <p style={{ margin: 0, color: "#64748b" }}>{s.description}</p>
          </a>
        ))}
      </div>
    </>
  );
}
