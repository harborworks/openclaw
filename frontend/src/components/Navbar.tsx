import { useAuth } from "../auth";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img src="/logo.svg" alt="Harbor Works" width={28} height={28} />
        <span className="navbar-title">Harbor Works</span>
      </div>
      <div className="navbar-right">
        {user && (
          <>
            <span className="navbar-email">{user.email}</span>
            <button className="navbar-signout" onClick={() => logout()}>
              Sign out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
