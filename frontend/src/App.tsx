import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConvexProvider, ConvexReactClient, useQuery } from "convex/react";
import { AuthProvider, ProtectedRoute, useAuth } from "./auth";
import { LoginPage } from "./pages/LoginPage";
import { ConfirmPage } from "./pages/ConfirmPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { CONVEX_URL } from "./convex";
import { api } from "../../convex/_generated/api";

const convex = new ConvexReactClient(CONVEX_URL);

function Dashboard() {
  const { user, logout } = useAuth();
  const dbUser = useQuery(api.users.getByCognitoSub, user ? { cognitoSub: user.userId } : "skip");

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/logo.svg" alt="Harbor Works" width={36} height={36} />
          <span
            style={{
              fontSize: "1.35rem",
              fontWeight: 700,
              letterSpacing: "-0.025em",
            }}
          >
            Harbor Works
          </span>
        </div>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
          Signed in as {user?.email}
        </p>
        {dbUser && (
          <div
            style={{
              padding: "12px 20px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              fontSize: "0.9rem",
              textAlign: "center",
            }}
          >
            <p style={{ fontWeight: 600 }}>{dbUser.name}</p>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", marginTop: 4 }}>
              {dbUser.isSuperAdmin ? "✦ Super Admin" : "Member"}
            </p>
          </div>
        )}
        {dbUser === null && (
          <p style={{ color: "#f87171", fontSize: "0.85rem" }}>
            No user record found in database
          </p>
        )}
        <button
          onClick={() => logout()}
          style={{
            padding: "8px 20px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "transparent",
            color: "#fff",
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    </>
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
        path="/*"
        element={
          <ProtectedRoute>
            <Dashboard />
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
