import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";

import { useAuth } from "./auth";
import { Navbar } from "./components/Navbar";
import { getDefaultRedirect } from "./api/admin";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const SecretsPage = lazy(() => import("./pages/SecretsPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000,
    },
  },
});

const PageLoader = () => (
  <div className="flex justify-center items-center p-8 h-[50vh]">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
  </div>
);

function DefaultRedirect() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDefaultRedirect()
      .then(({ orgSlug, harborSlug }) => {
        navigate(`/${orgSlug}/${harborSlug}/secrets`, { replace: true });
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.message ||
          "No organization or harbor found. Contact an admin.";
        setError(msg);
      });
  }, [navigate]);

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-2">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return <PageLoader />;
}

export default function App() {
  const { authenticated, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (!authenticated) {
    return (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex-1">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<DefaultRedirect />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route
                path="/:orgSlug/:harborSlug/secrets"
                element={<SecretsPage />}
              />
              <Route path="*" element={<DefaultRedirect />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </QueryClientProvider>
  );
}
