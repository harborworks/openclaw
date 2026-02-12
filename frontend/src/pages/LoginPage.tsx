import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth";

export function LoginPage() {
  const { login, refresh } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.isSignedIn) {
        navigate("/", { replace: true });
      } else if (
        result.nextStep?.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
      ) {
        setNeedsNewPassword(true);
      } else if (
        result.nextStep?.signInStep === "CONFIRM_SIGN_UP"
      ) {
        navigate("/confirm", { state: { email } });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleNewPassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { confirmSignIn } = await import("aws-amplify/auth");
      const result = await confirmSignIn({ challengeResponse: newPassword });
      if (result.isSignedIn) {
        await refresh();
        navigate("/", { replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setLoading(false);
    }
  }

  if (needsNewPassword) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logoRow}>
            <img src="/logo.svg" alt="Harbor Works" width={28} height={28} />
            <span style={styles.logoText}>Harbor Works</span>
          </div>
          <h1 style={styles.title}>Set new password</h1>
          <p style={styles.subtitle}>Please choose a new password to continue.</p>
          <form onSubmit={handleNewPassword} style={styles.form}>
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={styles.input}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              style={styles.input}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? "Setting password…" : "Set password"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <img src="/logo.svg" alt="Harbor Works" width={28} height={28} />
          <span style={styles.logoText}>Harbor Works</span>
        </div>
        <h1 style={styles.title}>Sign in</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p style={styles.footer}>
          <Link to="/forgot-password" style={styles.link}>Forgot password?</Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
  },
  card: {
    width: 380,
    padding: 32,
    borderRadius: 12,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  logoRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 24 },
  logoText: { fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.025em" },
  title: { fontSize: "1.5rem", fontWeight: 600, marginBottom: 8 },
  subtitle: { color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", marginBottom: 20 },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.07)",
    color: "#fff",
    fontSize: "0.95rem",
    outline: "none",
  },
  error: { color: "#f87171", fontSize: "0.85rem", margin: 0 },
  button: {
    padding: "10px 0",
    borderRadius: 8,
    border: "none",
    background: "#3b82f6",
    color: "#fff",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
  },
  footer: { marginTop: 16, fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" },
  link: { color: "#60a5fa", textDecoration: "none" },
};
