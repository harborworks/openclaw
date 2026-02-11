import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { resetPassword, confirmResetPassword } from "aws-amplify/auth";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword({ username: email });
      setStep("confirm");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword,
      });
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <img src="/logo.svg" alt="Harbor Works" width={28} height={28} />
          <span style={styles.logoText}>Harbor Works</span>
        </div>
        {step === "request" ? (
          <>
            <h1 style={styles.title}>Reset password</h1>
            <p style={styles.subtitle}>
              Enter your email and we'll send a verification code.
            </p>
            <form onSubmit={handleRequest} style={styles.form}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
              />
              {error && <p style={styles.error}>{error}</p>}
              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? "Sending…" : "Send code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 style={styles.title}>Enter new password</h1>
            <p style={styles.subtitle}>
              We sent a code to {email}.
            </p>
            <form onSubmit={handleConfirm} style={styles.form}>
              <input
                type="text"
                placeholder="Verification code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoComplete="one-time-code"
                style={styles.input}
              />
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                style={styles.input}
              />
              {error && <p style={styles.error}>{error}</p>}
              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? "Resetting…" : "Reset password"}
              </button>
            </form>
          </>
        )}
        <p style={styles.footer}>
          <Link to="/login" style={styles.link}>Back to sign in</Link>
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
  subtitle: { fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", marginBottom: 20 },
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
