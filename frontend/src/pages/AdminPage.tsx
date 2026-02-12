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
];

export function AdminPage() {
  const navigate = useNavigate();

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 }}>Admin</h1>
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
