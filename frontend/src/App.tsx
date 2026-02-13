import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { AuthProvider, ProtectedRoute, useAuth } from "./auth";
import { LoginPage } from "./pages/LoginPage";
import { ConfirmPage } from "./pages/ConfirmPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { Layout } from "./components/Layout";
import { AdminRoute, SuperAdminRoute } from "./components/AdminRoute";
import { AdminPage } from "./pages/AdminPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminOrgsPage } from "./pages/admin/AdminOrgsPage";
import { AdminMembersPage } from "./pages/admin/AdminMembersPage";
import { AdminHarborsPage } from "./pages/admin/AdminHarborsPage";
import { AdminPromptsPage } from "./pages/admin/AdminPromptsPage";
import { AdminPromptEditPage } from "./pages/admin/AdminPromptEditPage";
import { SecretsPage } from "./pages/SecretsPage";
import { AgentsPage } from "./pages/AgentsPage";
import { ModelsPage } from "./pages/ModelsPage";
import { PromptsPage } from "./pages/PromptsPage";
import { HarborProvider } from "./contexts/HarborContext";
import { HarborRedirect } from "./components/HarborRedirect";
import { CONVEX_URL } from "./convex";

const convex = new ConvexReactClient(CONVEX_URL);

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      {/* Auth routes */}
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

      {/* Admin routes */}
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
        path="/admin/prompts"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <SuperAdminRoute>
                <Layout>
                  <AdminPromptsPage />
                </Layout>
              </SuperAdminRoute>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/prompts/:fileKey"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <SuperAdminRoute>
                <Layout>
                  <AdminPromptEditPage />
                </Layout>
              </SuperAdminRoute>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      {/* Harbor routes: /:orgSlug/:harborSlug/... */}
      <Route
        path="/:orgSlug/:harborSlug/*"
        element={
          <ProtectedRoute>
            <HarborProvider>
              <Layout>
                <HarborRoutes />
              </Layout>
            </HarborProvider>
          </ProtectedRoute>
        }
      />

      {/* Root: redirect to first org/harbor */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <HarborRedirect />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all: redirect to root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Sub-routes within a harbor context */
function HarborRoutes() {
  return (
    <Routes>
      <Route path="agents" element={<AgentsPage />} />
      <Route path="models" element={<ModelsPage />} />
      <Route path="prompts" element={<PromptsPage />} />
      <Route path="secrets" element={<SecretsPage />} />
      <Route index element={<Navigate to="agents" replace />} />
      <Route path="*" element={<Navigate to="agents" replace />} />
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
