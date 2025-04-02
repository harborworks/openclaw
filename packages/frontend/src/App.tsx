import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";

import * as api from "./api";
import { Navbar } from "./components/Navbar";
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

  const MainContent = () => {
    if (auth.isLoading) {
      return <Skeleton className="h-[200px] w-full rounded-lg" />;
    }

    if (auth.error) {
      console.error("Auth error details:", auth.error);
      return null;
    }

    if (auth.isAuthenticated) {
      return (
        <Card className="w-full shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-center">Authenticated App</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 min-h-[80px] flex items-center justify-center px-6">
            {loading ? (
              <Skeleton className="h-6 w-full" />
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
          <CardFooter className="flex justify-center pt-3 pb-4">
            <Button size="sm" onClick={() => (window.location.href = "/")}>
              Home
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return (
      <Card className="w-full shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-center">Sign In</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 min-h-[80px] flex items-center justify-center px-6">
          <p className="text-center text-muted-foreground">
            Please sign in to continue
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <MainContent />
        </div>
      </div>
    </div>
  );
}

export default App;
