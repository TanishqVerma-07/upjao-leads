import { useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { Send, Lock } from "lucide-react";

export default function FeedComposer({ leadId, tickets, onComment, onNewTicket }) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState("shared");
  const [attachedTicketId, setAttachedTicketId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canPrivate = user?.role === "sales" || user?.role === "admin";
  const openTickets = (tickets || []).filter(t => !["Done", "Received", "Closed", "Rejected"].includes(t.status));

  async function sendComment() {
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/leads/${leadId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          body: body.trim(),
          visibility,
          attached_ticket_id: attachedTicketId ? parseInt(attachedTicketId) : null,
        }),
      });
      setBody("");
      setAttachedTicketId("");
      setVisibility("shared");
      onComment();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      background: "#fff", borderRadius: 12,
      border: "1px solid #D1FAE5", padding: "1rem",
      marginTop: "1rem",
    }}>
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={3}
        placeholder="Write a comment or note…"
        style={{
          width: "100%", padding: "0.625rem 0.75rem",
          border: "1px solid #E5E7EB", borderRadius: 8,
          fontSize: 14, fontFamily: "inherit", resize: "vertical",
          boxSizing: "border-box", outline: "none",
          transition: "border-color 0.15s",
        }}
        onFocus={e => e.target.style.borderColor = "#0D9488"}
        onBlur={e => e.target.style.borderColor = "#E5E7EB"}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        {/* Visibility toggle — Sales/Admin only */}
        {canPrivate && (
          <button
            onClick={() => setVisibility(v => v === "shared" ? "sales_private" : "shared")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: "pointer", border: "1px solid",
              background: visibility === "sales_private" ? "#FEF3C7" : "#F0FDFA",
              color: visibility === "sales_private" ? "#92400E" : "#0D9488",
              borderColor: visibility === "sales_private" ? "#FDE68A" : "#A7F3D0",
            }}
          >
            <Lock size={11} />
            {visibility === "sales_private" ? "Private (Sales only)" : "Shared (all teams)"}
          </button>
        )}

        {/* Attach to ticket */}
        {openTickets.length > 0 && (
          <select
            value={attachedTicketId}
            onChange={e => setAttachedTicketId(e.target.value)}
            style={{
              padding: "4px 8px", border: "1px solid #D1FAE5", borderRadius: 6,
              fontSize: 12, color: attachedTicketId ? "#134E4A" : "#9CA3AF",
              background: "#F0FDFA", fontFamily: "inherit",
            }}
          >
            <option value="">Attach to ticket…</option>
            {openTickets.map(t => (
              <option key={t.id} value={t.id}>
                #{t.id} {t.type.replace(/_/g, " ")} — {t.status}
              </option>
            ))}
          </select>
        )}

        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          {user?.role !== "admin" && (
            <button
              onClick={onNewTicket}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "0.4rem 0.875rem", background: "#fff", color: "#0D9488",
                border: "1px solid #0D9488", borderRadius: 8, fontSize: 13,
                fontWeight: 600, cursor: "pointer",
              }}
            >
              + New Ticket
            </button>
          )}
          <button
            onClick={sendComment}
            disabled={busy || !body.trim()}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "0.4rem 0.875rem", borderRadius: 8, fontSize: 13,
              fontWeight: 600, cursor: busy || !body.trim() ? "not-allowed" : "pointer",
              background: busy || !body.trim() ? "#D1FAE5" : "#0D9488",
              color: "#fff", border: "none",
            }}
          >
            <Send size={13} />
            {busy ? "Sending…" : "Send Comment"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" style={{ fontSize: 12, color: "#DC2626", marginTop: 6 }}>{error}</p>
      )}
    </div>
  );
}
