import { useState } from "react";
import { apiFetch } from "../api";
import { X, KeyRound } from "lucide-react";

export default function ChangePasswordModal({ onClose }) {
  const [current, setCurrent] = useState("");
  const [next, setNext]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (next !== confirm) { setError("New passwords don't match."); return; }
    if (next.length < 6)  { setError("New password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      setDone(true);
    } catch (err) {
      setError(err.message || "Failed to change password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "1.75rem", width: 400, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <KeyRound size={18} color="#0D9488" />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#134E4A", margin: 0 }}>Change Password</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}><X size={18} /></button>
        </div>

        {done ? (
          <div>
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "0.75rem 0.875rem", color: "#065F46", fontSize: 14, marginBottom: "1.25rem" }}>
              Password updated. Use your new password next time you sign in.
            </div>
            <button onClick={onClose} style={primaryBtn}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <Field label="Current password">
              <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required autoFocus style={inp} placeholder="••••••••" />
            </Field>
            <Field label="New password">
              <input type="password" value={next} onChange={e => setNext(e.target.value)} required style={inp} placeholder="At least 6 characters" />
            </Field>
            <Field label="Confirm new password">
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={inp} placeholder="••••••••" />
            </Field>

            {error && (
              <div role="alert" style={{ color: "#DC2626", fontSize: 13, marginBottom: "0.75rem", background: "#FEF2F2", padding: "0.5rem 0.75rem", borderRadius: 8 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: "0.25rem" }}>
              <button type="submit" disabled={busy} style={{ ...primaryBtn, flex: 1, opacity: busy ? 0.7 : 1 }}>
                {busy ? "Updating…" : "Update password"}
              </button>
              <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "0.875rem" }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const inp = { width: "100%", padding: "0.55rem 0.75rem", border: "1px solid #D1FAE5", borderRadius: 8, fontSize: 14, color: "#134E4A", background: "#F0FDFA", boxSizing: "border-box", fontFamily: "inherit", outline: "none" };
const primaryBtn = { padding: "0.55rem 1rem", background: "#0D9488", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" };
const ghostBtn = { padding: "0.55rem 1rem", background: "#fff", color: "#374151", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, cursor: "pointer" };
