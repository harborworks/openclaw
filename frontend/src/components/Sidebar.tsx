import { NavLink } from "react-router-dom";
import { useOptionalHarborContext } from "../contexts/HarborContext";

const navItems = [
  { path: "agents", label: "Agents", icon: "🤖" },
  { path: "prompts", label: "Prompts", icon: "📝" },
  { path: "secrets", label: "Secrets", icon: "🔑" },
];

export function Sidebar() {
  const harbor = useOptionalHarborContext();

  // Outside HarborProvider (e.g., root redirect, admin pages) — hide sidebar
  if (!harbor) return null;

  const { basePath } = harbor;

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={`${basePath}/${item.path}`}
            className={({ isActive }) =>
              `sidebar-link${isActive ? " sidebar-link-active" : ""}`
            }
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
