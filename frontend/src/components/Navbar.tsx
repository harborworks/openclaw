import { useState, useRef, useEffect } from "react";
import { useAuth } from "../auth";

export function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img src="/logo.svg" alt="Harbor Works" width={28} height={28} />
        <span className="navbar-title">Harbor Works</span>
      </div>
      {user && (
        <div className="navbar-menu" ref={menuRef}>
          <button className="navbar-menu-trigger" onClick={() => setOpen(!open)}>
            {"jbenjamincook@gmail.com"}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 6 }}>
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {open && (
            <div className="navbar-dropdown">
              <button className="navbar-dropdown-item" onClick={() => { setOpen(false); logout(); }}>
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
