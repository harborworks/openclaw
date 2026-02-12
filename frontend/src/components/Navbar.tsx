import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { OrgHarborSwitcher } from "./OrgHarborSwitcher";
import { Dropdown, ChevronDown } from "./Dropdown";

export function Navbar() {
  const { user, logout } = useAuth();
  const dbUser = useCurrentUser();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img src="/logo.svg" alt="Harbor Works" width={28} height={32} />
        <span className="navbar-title">Harbor Works</span>
      </div>
      {user && <OrgHarborSwitcher />}
      <div style={{ flex: 1 }} />
      {user && (
        <Dropdown
          className="navbar-menu"
          align="right"
          trigger={() => (
            <button className="navbar-menu-trigger">
              {user.email}
              <ChevronDown />
            </button>
          )}
        >
          {(close) => (
            <>
              {dbUser?.isSuperAdmin && (
                <button
                  className="navbar-dropdown-item"
                  onClick={() => { close(); navigate("/admin"); }}
                >
                  Admin
                </button>
              )}
              <button
                className="navbar-dropdown-item"
                onClick={() => { close(); logout(); }}
              >
                Sign out
              </button>
            </>
          )}
        </Dropdown>
      )}
    </nav>
  );
}
