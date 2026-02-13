import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";

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
  const dbUser = useCurrentUser();
  const isSuperAdmin = dbUser?.isSuperAdmin === true;

  const visibleSections = adminSections.filter(
    (s) => s.path !== "/admin/prompts" || isSuperAdmin
  );

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 }}>Admin</h1>
      <p style={{ color: "var(--text-muted)", fontSize: "var(--font-size-base)", marginBottom: 24 }}>
        Manage your workspace from here.
      </p>
      <div className="admin-cards">
        {visibleSections.map((section) => (
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
