import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./auth";
import { Navbar } from "./components/Navbar";

const BoardPage = lazy(() => import("./pages/BoardPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));

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
              <Route path="/" element={<Navigate to="/board" replace />} />
              <Route path="/board" element={<BoardPage />} />
              <Route path="*" element={<Navigate to="/board" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </QueryClientProvider>
  );
}
