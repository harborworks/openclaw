import { useAuth } from "react-oidc-context";
import { Button } from "./ui/button";

const handleSignOut = async (auth: any) => {
  try {
    await auth.removeUser();
  } catch (error) {
    console.error("Error during sign out:", error);
  }
  window.location.href = "/";
};

export function Navbar() {
  const auth = useAuth();

  return (
    <nav className="border-b w-full bg-background shadow-sm">
      <div className="container mx-auto px-4 flex h-12 items-center justify-between">
        <div className="font-semibold">Sparrow Tags</div>
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
