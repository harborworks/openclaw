import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";

import * as api from "./api";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Skeleton } from "./components/ui/skeleton";

const handleSignOut = async (auth: any) => {
  try {
    await auth.removeUser();
  } catch (error) {
    console.error("Error during sign out:", error);
  }
  window.location.href = "/";
};

function App() {
  const auth = useAuth();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMessage = async () => {
      if (!auth.user?.access_token) {
        return;
      }
      try {
        setLoading(true);
        const user = await api.hello(auth.user?.access_token);
        setMessage(user.email);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchMessage();
  }, [auth.user?.access_token]);

  // Common layout wrapper for both authenticated and unauthenticated states
  const PageLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );

  if (auth.isLoading) {
    return (
      <PageLayout>
        <Skeleton className="h-[250px] w-full rounded-lg" />
      </PageLayout>
    );
  }

  if (auth.error) {
    console.error("Auth error details:", auth.error);
    handleSignOut(auth);
    return null;
  }

  if (auth.isAuthenticated) {
    return (
      <PageLayout>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">Authenticated App</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 min-h-[100px] flex items-center justify-center">
            {loading ? (
              <Skeleton className="h-8 w-full" />
            ) : error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <div className="text-center">
                Welcome, <span className="font-bold">{message}</span>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center pt-4 pb-6">
            <Button onClick={() => handleSignOut(auth)}>Sign Out</Button>
          </CardFooter>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">Sign In</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 min-h-[100px] flex items-center justify-center">
          <p>Please sign in to continue</p>
        </CardContent>
        <CardFooter className="flex justify-center pt-4 pb-6">
          <Button onClick={() => auth.signinRedirect()} className="w-[120px]">
            Sign In
          </Button>
        </CardFooter>
      </Card>
    </PageLayout>
  );
}

export default App;
