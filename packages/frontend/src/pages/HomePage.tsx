import { useAuth } from "react-oidc-context";

import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";

interface HomePageProps {
  auth: ReturnType<typeof useAuth>;
  userInfo: { email: string; superadmin: boolean } | null;
  loading: boolean;
  error: string;
}

export default function HomePage({
  auth,
  userInfo,
  loading,
  error,
}: HomePageProps) {
  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (auth.error) {
    console.error("Auth error details:", auth.error);
    return null;
  }

  if (auth.isAuthenticated) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
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
                  Welcome, <span className="font-bold">{userInfo?.email}</span>
                  {userInfo?.superadmin && (
                    <p className="text-sm text-muted-foreground mt-1">
                      You have superadmin privileges
                    </p>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center pt-3 pb-4">
              <Button size="sm" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="w-full shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-center">Sign In</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 min-h-[80px] flex items-center justify-center px-6">
            <p className="text-center text-muted-foreground">
              Please sign in to continue
            </p>
          </CardContent>
          <CardFooter className="flex justify-center pt-3 pb-4">
            <Button size="sm" onClick={() => auth.signinRedirect()}>
              Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
