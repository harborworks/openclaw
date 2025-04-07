import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import * as api from "./api";
import { UserMembership } from "./api/self";
import { Navbar } from "./components/Navbar";

// Lazy load page components
const HomePage = lazy(() => import("./pages/HomePage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const JobsPage = lazy(() => import("./pages/jobs/JobsPage"));
const CreateJobPage = lazy(() => import("./pages/jobs/CreateJobPage"));
const JobDetailPage = lazy(() => import("./pages/jobs/JobDetailPage"));

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="flex justify-center items-center p-8 h-[50vh]">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
  </div>
);

// Extended user info type for our app
interface UserInfo {
  id: number;
  email: string;
  superadmin: boolean;
}

export default function App() {
  const auth = useAuth();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
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
        const selfData = await api.getSelf(auth.user?.access_token);

        // Set user info
        setUserInfo({
          id: selfData.user.id,
          email: selfData.user.email,
          superadmin: Boolean(selfData.user.superadmin),
        });

        // Set memberships
        setMemberships(selfData.memberships);
      } catch (err) {
        console.error("Error fetching user info:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [auth.user?.access_token]);

  const AuthenticatedRoute = () => {
    if (auth.isLoading) {
      return null;
    }
    return auth.isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
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
            <Route path="/admin/*" element={<AdminPage />} />
            <Route path="/jobs" element={<AuthenticatedRoute />}>
              <Route index element={<JobsPage />} />
              <Route
                path="/jobs/create"
                element={<CreateJobPage memberships={memberships} />}
              />
              <Route path="/jobs/:jobId" element={<JobDetailPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}
