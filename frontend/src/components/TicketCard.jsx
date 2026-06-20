import { useState, useEffect } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { Clock, Send } from "lucide-react";
import AttachmentsList from "./AttachmentsList";

const TYPE_LABELS = {
  analysis_request: "Analysis Request",
  sample_request:   "Sample Request",
  general:          "General",
  new_commodity:    "New Commodity",
  new_variety:      "New Variety",
  quality_mismatch: "Quality Mismatch",
  accuracy_issue:   "Accuracy Issue",
};

const TYPE_COLORS = {
  analysis_request: { bg: "#EDE9FE", color: "#5B21B6" },
  sample_request:   { bg: "#FEF3C7", color: "#92400E" },
  general:          { bg: "#F3F4F6", color: "#374151" },
  new_commodity:    { bg: "#DBEAFE", color: "#1E40AF" },
  new_variety:      { bg: "#CFFAFE", color: "#155E75" },
  quality_mismatch: { bg: "#FEE2E2", color: "#991B1B" },
  accuracy_issue:   { bg: "#FFE4E6", color: "#9F1239" },
};

// Sales-driven transitions for sample_request
const SAMPLE_SALES_OPTIONS = {
  "New":            [{ value: "Contacted Lead", label: "Contacted Lead — asked for sample" },
                     { value: "Partial Sample", label: "Partial Sample — lead can't send full amount" }],
  "Contacted Lead": [{ value: "Received",       label: "Sample Collected (Done)" },
                     { value: "Partial Sample", label: "Partial Sample — lead can't send full amount" }],
};

// Single-path forward transitions — mirrors backend FORWARD_TRANSITIONS for
// the ticket types that only ever have one "next status" per step.
const FORWARD_MAP = {
  analysis_request: { "New": "Accepted", "Accepted": "AI Analysing", "AI Analysing": "Done" },
  general:          { "Open": "Closed" },
  new_commodity:    { "New": "Under Review", "Under Review": "Approved" },
  new_variety:      { "New": "Under Review", "Under Review": "Approved" },
  quality_mismatch: { "New": "Re-Testing", "Re-Testing": "Resolved" },
  accuracy_issue:   { "New": "Under Review", "Under Review": "Resolved" },
};

// Types Product owns end-to-end — Sales can raise them but not move status forward
const PRODUCT_DRIVEN_TYPES = new Set([
  "analysis_request", "new_commodity", "new_variety", "quality_mismatch", "accuracy_issue",
]);

const TERMINAL = new Set(["Done", "Received", "Closed", "Rejected", "Approved", "Resolved"]);

export default function TicketCard({ ticket, onRefresh, dimmed = false }) {
  const { user } = useAuth();
  const role = user?.role;

  const [selected, setSelected]           = useState("");
  const [partialNote, setPartialNote]     = useState("");
  const [rejectReason, setRejectReason]   = useState("");
  const [replyBody, setReplyBody]         = useState("");
  const [holdUntilOpen, setHoldUntilOpen] = useState(false);
  const [holdDays, setHoldDays]           = useState("");
  const [busy, setBusy]                   = useState(false);
  const [error, setError]                 = useState("");
  const [attachments, setAttachments]     = useState([]);

  useEffect(() => {
    apiFetch(`/tickets/${ticket.id}/attachments`)
      .then(setAttachments)
      .catch(() => {});
  }, [ticket.id]);

  const tc         = TYPE_COLORS[ticket.type] || TYPE_COLORS.general;
  const isTerminal = TERMINAL.has(ticket.status);

  async function act(fn) {
    setBusy(true); setError("");
    try { await fn(); setSelected(""); await onRefresh(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function applyStatus(status, extra = {}) {
    act(() => apiFetch(`/tickets/${ticket.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, ...extra }),
    }));
  }

  async function postReply() {
    if (!replyBody.trim()) return;
    act(async () => {
      await apiFetch(`/leads/${ticket.lead_id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: replyBody.trim(), visibility: "shared", attached_ticket_id: ticket.id }),
      });
      setReplyBody("");
    });
  }

  async function applyHold(on) {
    act(() => apiFetch(`/tickets/${ticket.id}/hold`, { method: "PATCH", body: JSON.stringify({ is_on_hold: on }) }));
  }

  async function setHoldUntilFn() {
    const d = parseInt(holdDays);
    if (!d || d < 1) return;
    act(async () => {
      await apiFetch(`/tickets/${ticket.id}/hold-until`, { method: "PATCH", body: JSON.stringify({ days_left: d }) });
      setHoldUntilOpen(false); setHoldDays("");
    });
  }

  async function clearHoldUntil() {
    act(() => apiFetch(`/tickets/${ticket.id}/hold-until`, { method: "PATCH", body: JSON.stringify({ days_left: null }) }));
  }

  const isSampleRequest  = ticket.type === "sample_request";
  const isPartialSample  = ticket.status === "Partial Sample";
  const salesSeesActions = role === "sales" && isSampleRequest && !isTerminal;
  const productSeesPartialActions = role === "product" && isSampleRequest && isPartialSample;
  // Product-driven types are owned by Product end-to-end; general is open to both; admin is read-only
  const isProductDriven = PRODUCT_DRIVEN_TYPES.has(ticket.type);
  const showGenericDropdown = !isSampleRequest && !isTerminal &&
    !(isProductDriven && role === "sales") &&
    role !== "admin";

  const genericNext = FORWARD_MAP[ticket.type]?.[ticket.status] || null;

  const genericOptions = [];
  if (genericNext) genericOptions.push({ value: genericNext, label: `→ ${genericNext}` });
  if (ticket.is_on_hold) genericOptions.push({ value: "__resume", label: "▶ Resume" });
  else genericOptions.push({ value: "__hold", label: "⏸ On Hold" });
  genericOptions.push({ value: "__reject", label: "✕ Reject" });

  const sampleOptions = SAMPLE_SALES_OPTIONS[ticket.status] || [];

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${ticket.at_risk ? "#FECACA" : "#E8F1F4"}`,
      borderLeft: `4px solid ${ticket.at_risk ? "#DC2626" : tc.color}`,
      borderRadius: 10, padding: "1rem", marginBottom: 8,
      opacity: dimmed ? 0.55 : 1,
      filter: dimmed ? "saturate(0.3)" : "none",
      transition: "opacity 0.2s, filter 0.2s",
    }}>

      {/* ── Header row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: tc.bg, color: tc.color, whiteSpace: "nowrap" }}>
          {TYPE_LABELS[ticket.type]}
        </span>

        <StatusTag ticket={ticket} isTerminal={isTerminal} />

        {ticket.is_on_hold && <span style={pill("#FEF3C7", "#92400E")}>⏸ On Hold</span>}
        {ticket.at_risk    && <span style={pill("#FEE2E2", "#DC2626")}>⚠ At Risk</span>}

        {/* Sales controls on sample_request */}
        {salesSeesActions && sampleOptions.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
            <select
              value={selected}
              onChange={e => { setSelected(e.target.value); setError(""); setPartialNote(""); setRejectReason(""); }}
              disabled={busy}
              style={dropdownStyle(!!selected)}
            >
              <option value="" disabled>Move to…</option>
              {sampleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              <option value={ticket.is_on_hold ? "__resume" : "__hold"}>
                {ticket.is_on_hold ? "▶ Resume" : "⏸ On Hold"}
              </option>
              <option value="__reject">✕ Reject</option>
            </select>
            {selected && selected !== "Partial Sample" && selected !== "__reject" && (
              <button onClick={() => {
                if (selected === "__hold")   applyHold(true);
                else if (selected === "__resume") applyHold(false);
                else applyStatus(selected);
              }} disabled={busy} style={applyBtn}>
                {busy ? "…" : "Apply"}
              </button>
            )}
          </div>
        )}

        {/* Generic dropdown for analysis_request & general */}
        {showGenericDropdown && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
            <select
              value={selected}
              onChange={e => { setSelected(e.target.value); setError(""); setRejectReason(""); }}
              disabled={busy}
              style={dropdownStyle(!!selected)}
            >
              <option value="" disabled>Move to…</option>
              {genericOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {selected && selected !== "__reject" && (
              <button onClick={() => {
                if (selected === "__hold")   applyHold(true);
                else if (selected === "__resume") applyHold(false);
                else applyStatus(selected);
              }} disabled={busy} style={applyBtn}>
                {busy ? "…" : "Apply"}
              </button>
            )}
          </div>
        )}

        {/* Days-left tag */}
        <button
          onClick={() => !isTerminal && setHoldUntilOpen(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600,
            padding: "2px 8px", borderRadius: 20, border: "none",
            cursor: isTerminal ? "default" : "pointer", whiteSpace: "nowrap",
            background: ticket.days_left < 7 ? "#FEE2E2" : "#F0FDFA",
            color: ticket.days_left < 7 ? "#DC2626" : "#0D9488",
          }}
          title={!isTerminal ? "Click to snooze" : ""}
        >
          <Clock size={11} />
          {ticket.days_left < 0 ? "Overdue" : `${ticket.days_left}d left`}
        </button>

        {ticket.hold_until_days_left && (
          <span style={{ fontSize: 11, color: "#6B7280", whiteSpace: "nowrap" }}>
            snoozed until {ticket.hold_until_days_left}d
            <button onClick={clearHoldUntil} style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626", fontSize: 11, marginLeft: 4 }}>✕</button>
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <p style={{ fontSize: 14, color: "#374151", margin: "10px 0 0" }}>{ticket.body}</p>
      {ticket.sample_raw_kg && (
        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
          Raw: {ticket.sample_raw_kg} kg · Cleaned: {ticket.sample_cleaned_g} g
        </div>
      )}

      {/* Partial note — read-only display */}
      {ticket.partial_note && (
        <div style={{ marginTop: 8, padding: "0.5rem 0.75rem", background: "#FFFBEB", borderRadius: 6, border: "1px solid #FDE68A" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#92400E" }}>Partial sample note: </span>
          <span style={{ fontSize: 13, color: "#374151" }}>{ticket.partial_note}</span>
        </div>
      )}

      {/* ── Partial Sample input (Sales writing what lead can provide) ── */}
      {selected === "Partial Sample" && (
        <div style={{ marginTop: 10, padding: "0.75rem", background: "#FFFBEB", borderRadius: 8, border: "1px solid #FDE68A" }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#92400E", display: "block", marginBottom: 6 }}>
            What can the lead provide?
          </label>
          <textarea
            value={partialNote}
            onChange={e => setPartialNote(e.target.value)}
            rows={2}
            placeholder="e.g. Lead can only send 3kg, originally requested 5kg"
            style={{ width: "100%", padding: "5px 10px", border: "1px solid #FDE68A", borderRadius: 6, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={() => applyStatus("Partial Sample", { partial_note: partialNote })}
              disabled={busy || !partialNote.trim()}
              style={smallBtn("#F59E0B", "#fff")}
            >
              {busy ? "…" : "Mark Partial Sample"}
            </button>
            <button onClick={() => { setSelected(""); setPartialNote(""); }} style={smallBtn("#fff", "#374151", "#FDE68A")}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Product panel when Partial Sample ── */}
      {productSeesPartialActions && (
        <div style={{ marginTop: 10, padding: "0.75rem", background: "#F0FDF4", borderRadius: 8, border: "1px solid #BBF7D0" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#065F46", marginBottom: 8 }}>
            Sales flagged a partial sample — accept it or reply to negotiate:
          </p>
          <button
            onClick={() => applyStatus("Received")}
            disabled={busy}
            style={{ ...smallBtn("#0D9488", "#fff"), marginBottom: 10 }}
          >
            {busy ? "…" : "✓ Accept — mark Received"}
          </button>
          <textarea
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
            rows={2}
            placeholder="Reply to Sales, e.g. 3kg won't work — we need at least 4kg…"
            style={{ width: "100%", padding: "5px 10px", border: "1px solid #BBF7D0", borderRadius: 6, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
          />
          <button
            onClick={postReply}
            disabled={busy || !replyBody.trim()}
            style={{ ...smallBtn("#fff", "#0D9488", "#0D9488"), marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <Send size={11} /> Post Reply
          </button>
        </div>
      )}

      {/* ── Hold-until input ── */}
      {holdUntilOpen && !isTerminal && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, padding: "0.6rem", background: "#F0FDFA", borderRadius: 8 }}>
          <span style={{ fontSize: 12, color: "#374151" }}>Hold until</span>
          <input type="number" min="1" value={holdDays} onChange={e => setHoldDays(e.target.value)}
            placeholder="days" style={{ width: 70, padding: "3px 8px", border: "1px solid #D1FAE5", borderRadius: 6, fontSize: 13, fontFamily: "inherit" }} />
          <span style={{ fontSize: 12, color: "#374151" }}>days left</span>
          <button onClick={setHoldUntilFn} disabled={busy} style={smallBtn("#0D9488", "#fff")}>Set</button>
          <button onClick={() => setHoldUntilOpen(false)} style={smallBtn("#fff", "#374151", "#D1FAE5")}>Cancel</button>
        </div>
      )}

      {/* ── Reject reason ── */}
      {selected === "__reject" && (
        <div style={{ marginTop: 10, padding: "0.75rem", background: "#FEF2F2", borderRadius: 8, border: "1px solid #FECACA" }}>
          <input
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (required)"
            style={{ width: "100%", padding: "5px 10px", border: "1px solid #FECACA", borderRadius: 6, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={() => act(async () => {
                await apiFetch(`/tickets/${ticket.id}/status`, { method: "PATCH", body: JSON.stringify({ status: "Rejected", rejected_reason: rejectReason }) });
                setRejectReason("");
              })}
              disabled={busy || !rejectReason.trim()}
              style={smallBtn("#DC2626", "#fff")}
            >
              Confirm Reject
            </button>
            <button onClick={() => { setSelected(""); setRejectReason(""); }} style={smallBtn("#fff", "#374151", "#D1FAE5")}>Cancel</button>
          </div>
        </div>
      )}

      {error && <p role="alert" style={{ fontSize: 12, color: "#DC2626", margin: "6px 0 0" }}>{error}</p>}

      {/* ── Attachments ── */}
      <AttachmentsList
        attachments={attachments}
        uploadPath={`/tickets/${ticket.id}/attachments`}
        defaultKind={ticket.type === "sample_request" ? "grading_report" : "general"}
        allowKindSelect={ticket.type === "sample_request"}
        canUpload={!dimmed}
        onUploaded={att => setAttachments(prev => [att, ...prev])}
        onDeleted={id => setAttachments(prev => prev.filter(a => a.id !== id))}
        currentUserId={user?.id}
        currentUserRole={role}
        compact
      />
    </div>
  );
}

function StatusTag({ ticket, isTerminal }) {
  const isRejected = ticket.status === "Rejected";
  const isPartial  = ticket.status === "Partial Sample";
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, whiteSpace: "nowrap",
      background: isRejected ? "#FEE2E2" : isPartial ? "#FFFBEB" : isTerminal ? "#DCFCE7" : "#D1FAE5",
      color:      isRejected ? "#991B1B"  : isPartial ? "#92400E" : isTerminal ? "#166534" : "#065F46",
    }}>
      {isTerminal && !isRejected && "✓ "}
      {ticket.status}
    </span>
  );
}

const pill = (bg, color) => ({
  fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
  background: bg, color, whiteSpace: "nowrap",
});

const dropdownStyle = (hasValue) => ({
  padding: "0.35rem 0.6rem", border: "1px solid #D1FAE5", borderRadius: 8,
  fontSize: 13, color: hasValue ? "#134E4A" : "#6B7280",
  background: "#F0FDFA", fontFamily: "inherit", cursor: "pointer",
});

const applyBtn = {
  padding: "0.35rem 0.875rem", background: "#0D9488", color: "#fff",
  border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
};

const smallBtn = (bg, color, border) => ({
  padding: "4px 12px", background: bg, color,
  border: border ? `1px solid ${border}` : "none",
  borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
});
