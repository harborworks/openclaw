import { Link } from "react-router-dom";

import { useAuth } from "../auth";
import { Button } from "./ui/button";

export function Navbar() {
  const { logout } = useAuth();

  return (
    <nav className="border-b w-full bg-background shadow-sm">
      <div className="container mx-auto px-4 flex h-12 items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link to="/board" className="font-semibold">
            Mission Control
          </Link>
          <Link
            to="/board"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Board
          </Link>
        </div>
        <Button size="sm" variant="outline" onClick={logout}>
          Sign Out
        </Button>
      </div>
    </nav>
  );
}
