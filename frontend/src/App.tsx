import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, ProtectedRoute, useAuth } from "./auth";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ConfirmPage } from "./pages/ConfirmPage";

function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <>
      <style>{`
        :root {
          --navy: #0a1628;
          --white: #ffffff;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          color: var(--white);
          background: var(--navy);
          -webkit-font-smoothing: antialiased;
        }
      `}</style>
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
        path="/register"
        element={user ? <Navigate to="/" replace /> : <RegisterPage />}
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
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
