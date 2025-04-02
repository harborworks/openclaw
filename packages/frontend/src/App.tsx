import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { Navigate, Route, Routes } from "react-router-dom";

import * as api from "./api";
import { Navbar } from "./components/Navbar";

// Lazy load page components
const HomePage = lazy(() => import("./pages/HomePage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="flex justify-center items-center p-8 h-[50vh]">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
  </div>
);

function App() {
  const auth = useAuth();
  const [userInfo, setUserInfo] = useState<{
    email: string;
    superadmin: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      if (!auth.user?.access_token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const user = await api.hello(auth.user?.access_token);
        setUserInfo({
          email: user.email,
          superadmin: user.superadmin || false,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [auth.user?.access_token]);

  // Route guard for admin-only pages
  const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    if (auth.isLoading || loading) {
      return <div className="flex justify-center p-8">Loading...</div>;
    }

    if (!auth.isAuthenticated) {
      return <Navigate to="/" replace />;
    }

    if (!userInfo?.superadmin) {
      return <Navigate to="/" replace />;
    }

    return <>{children}</>;
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar userInfo={userInfo} />
      <div className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  auth={auth}
                  userInfo={userInfo}
                  loading={loading}
                  error={error}
                />
              }
            />
            <Route
              path="/admin/*"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

export default App;
