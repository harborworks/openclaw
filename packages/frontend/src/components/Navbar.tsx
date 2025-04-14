import { useAuth } from "react-oidc-context";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";

interface NavbarProps {
  userInfo: { email: string; superadmin: boolean; orgAdmin?: boolean } | null;
}

const handleSignOut = async (auth: any) => {
  try {
    await auth.removeUser();
  } catch (error) {
    console.error("Error during sign out:", error);
  }
  window.location.href = "/";
};

export function Navbar({ userInfo }: NavbarProps) {
  const auth = useAuth();

  return (
    <nav className="border-b w-full bg-background shadow-sm">
      <div className="container mx-auto px-4 flex h-12 items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link to="/" className="font-semibold">
            Sparrow Tags
          </Link>

          {userInfo?.superadmin && (
            <Link
              to="/admin"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Admin
            </Link>
          )}

          {auth.isAuthenticated && (
            <Link
              to="/jobs"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Jobs
            </Link>
          )}
        </div>

        <div>
          {auth.isAuthenticated ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSignOut(auth)}
            >
              Sign Out
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => auth.signinRedirect()}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
