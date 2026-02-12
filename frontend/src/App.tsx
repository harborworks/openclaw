import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { AuthProvider, ProtectedRoute, useAuth } from "./auth";
import { LoginPage } from "./pages/LoginPage";
import { ConfirmPage } from "./pages/ConfirmPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { Layout } from "./components/Layout";
import { AdminRoute } from "./components/AdminRoute";
import { AdminPage } from "./pages/AdminPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminOrgsPage } from "./pages/admin/AdminOrgsPage";
import { AdminMembersPage } from "./pages/admin/AdminMembersPage";
import { AdminHarborsPage } from "./pages/admin/AdminHarborsPage";
import { SecretsPage } from "./pages/SecretsPage";
import { CONVEX_URL } from "./convex";

const convex = new ConvexReactClient(CONVEX_URL);

function Dashboard() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 56px)" }}>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.95rem" }}>
        Welcome to Harbor Works
      </p>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/forgot-password"
        element={user ? <Navigate to="/" replace /> : <ForgotPasswordPage />}
      />
      <Route
        path="/confirm"
        element={user ? <Navigate to="/" replace /> : <ConfirmPage />}
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <AdminPage />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <AdminUsersPage />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/orgs"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <AdminOrgsPage />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/members"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <AdminMembersPage />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/harbors"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <AdminHarborsPage />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/secrets"
        element={
          <ProtectedRoute>
            <Layout>
              <SecretsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ConvexProvider>
  );
}

export default App;
