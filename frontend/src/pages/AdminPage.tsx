import { useNavigate } from "react-router-dom";

const adminSections = [
  {
    title: "Users",
    description: "Manage platform users and permissions",
    path: "/admin/users",
    icon: "👤",
  },
  {
    title: "Organizations",
    description: "Create and manage organizations",
    path: "/admin/orgs",
    icon: "🏢",
  },
  {
    title: "Members",
    description: "Manage organization memberships",
    path: "/admin/members",
    icon: "👥",
  },
  {
    title: "Harbors",
    description: "Manage agent harbors",
    path: "/admin/harbors",
    icon: "⚓",
  },
  {
    title: "Prompt Templates",
    description: "Manage platform-wide prompt templates",
    path: "/admin/prompts",
    icon: "📝",
  },
];

export function AdminPage() {
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <button className="admin-back" onClick={() => navigate("/")}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Admin</h1>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "var(--font-size-base)", marginBottom: 24 }}>
        Manage your workspace from here.
      </p>
      <div className="admin-cards">
        {adminSections.map((section) => (
          <button
            key={section.path}
            className="admin-card"
            onClick={() => navigate(section.path)}
          >
            <span className="admin-card-icon">{section.icon}</span>
            <span className="admin-card-title">{section.title}</span>
            <span className="admin-card-desc">{section.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
