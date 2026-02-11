import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../auth";
import { Button } from "./ui/button";

function Logo() {
  return (
    <svg viewBox="-2 -1 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
      <path d="M14 2L2 8v4c0 8.5 5.1 16.4 12 18 6.9-1.6 12-9.5 12-18V8L14 2z" fill="rgba(37,99,235,0.2)" stroke="#2563eb" strokeWidth="1.5"/>
      <path d="M8 14h12M8 10h12M10 18h8" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function Navbar() {
  const { logout } = useAuth();
  const location = useLocation();

  // Extract org/harbor from URL path
  const parts = location.pathname.split("/").filter(Boolean);
  const orgSlug = parts.length >= 2 && parts[1] !== "admin" ? parts[0] : null;
  const harborSlug = parts.length >= 2 && parts[1] !== "admin" ? parts[1] : null;
  const base = orgSlug && harborSlug ? `/${orgSlug}/${harborSlug}` : "";

  return (
    <nav className="border-b w-full bg-background shadow-sm">
      <div className="container mx-auto px-4 flex h-12 items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Logo />
            Harbor Works
          </Link>
          {orgSlug && harborSlug && (
            <>
              <span className="text-sm text-muted-foreground">
                {orgSlug} / {harborSlug}
              </span>
              <Link
                to={`${base}/secrets`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Secrets
              </Link>
            </>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={logout}>
          Sign Out
        </Button>
      </div>
    </nav>
  );
}
