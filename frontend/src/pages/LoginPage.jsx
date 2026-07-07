import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../api";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  // Set by api.js when a request 401s — show a one-time "session expired" notice.
  const [expired] = useState(() => {
    const flag = sessionStorage.getItem("upjao_expired");
    if (flag) sessionStorage.removeItem("upjao_expired");
    return !!flag;
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      login(data);
      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#F0FDFA", fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "2.5rem",
        width: "100%", maxWidth: 400,
        boxShadow: "0 4px 24px rgba(13,148,136,0.10)",
        border: "1px solid #99F6E4",
      }}>
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#134E4A" }}>Upjao Leads</div>
          <div style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>Sign in to your account</div>
        </div>

        {expired && !error && (
          <div role="status" style={{
            background: "#FFFBEB", border: "1px solid #FDE68A",
            borderRadius: 8, padding: "0.625rem 0.875rem",
            color: "#92400E", fontSize: 13, marginBottom: "1rem",
          }}>
            Your session expired. Please sign in again.
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input
              id="email" type="email" autoComplete="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              style={inputStyle} placeholder="you@upjao.com"
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="password" type={showPw ? "text" : "password"}
                autoComplete="current-password" required
                value={password} onChange={e => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: "3rem" }}
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "#6B7280", fontSize: 12, padding: 0,
              }}>
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" style={{
              background: "#FEF2F2", border: "1px solid #FECACA",
              borderRadius: 8, padding: "0.625rem 0.875rem",
              color: "#DC2626", fontSize: 13, marginBottom: "1rem",
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "0.75rem",
            background: loading ? "#99F6E4" : "#0D9488",
            color: "#fff", border: "none", borderRadius: 10,
            fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            transition: "background 150ms ease",
          }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block", fontSize: 13, fontWeight: 600,
  color: "#374151", marginBottom: 6,
};

const inputStyle = {
  width: "100%", padding: "0.625rem 0.875rem",
  border: "1px solid #D1FAE5", borderRadius: 8,
  fontSize: 14, color: "#134E4A", background: "#F0FDFA",
  outline: "none", boxSizing: "border-box",
  transition: "border-color 150ms ease",
};
