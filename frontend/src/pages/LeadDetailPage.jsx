import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { addWSListener } from "../ws";
import PriorityBadge from "../components/PriorityBadge";
import StatusBadge from "../components/StatusBadge";
import TicketCard from "../components/TicketCard";
import CreateTicketModal from "../components/CreateTicketModal";
import FeedComposer from "../components/FeedComposer";
import AttachmentsList from "../components/AttachmentsList";
import { ArrowLeft, Clock, Trophy, X, AlertTriangle, Lock, MessageSquare, CheckCircle2, Paperclip } from "lucide-react";

const TERMINAL = new Set(["Done", "Received", "Closed", "Rejected"]);

function getCurrentStatus(feed) {
  const tickets = feed.filter(i => i.kind === "ticket").map(i => i.ticket);
  if (!tickets.length) return null;

  const priority = [
    { check: t => t.status === "Partial Sample",                                      label: "Partial Sample Pending",  color: "#92400E", bg: "#FFFBEB" },
    { check: t => t.status === "AI Analysing",                                        label: "AI Analysing",            color: "#5B21B6", bg: "#EDE9FE" },
    { check: t => t.status === "Contacted Lead",                                      label: "Sample Being Arranged",   color: "#0369A1", bg: "#E0F2FE" },
    { check: t => t.status === "Accepted",                                            label: "Analysis Accepted",       color: "#065F46", bg: "#D1FAE5" },
    { check: t => t.status === "New" && t.type === "analysis_request",                label: "Analysis Requested",      color: "#374151", bg: "#F3F4F6" },
    { check: t => t.status === "New" && t.type === "sample_request",                  label: "Sample Requested",        color: "#374151", bg: "#F3F4F6" },
    { check: t => t.status === "Done"     && t.type === "analysis_request",           label: "AI Analysis Done",        color: "#065F46", bg: "#D1FAE5" },
    { check: t => t.status === "Received" && t.type === "sample_request",             label: "Sample Received",         color: "#065F46", bg: "#D1FAE5" },
  ];

  for (const { check, label, color, bg } of priority) {
    if (tickets.some(check)) return { label, color, bg };
  }
  return null;
}

const PRIORITIES = ["P1", "P2", "P3", "P4"];
const OUTCOMES = ["won", "lost", "dropped"];

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editPriority, setEditPriority] = useState(false);
  const [newPriority, setNewPriority] = useState("");
  const [outcomeModal, setOutcomeModal] = useState(false);
  const [feed, setFeed] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ticketModal, setTicketModal] = useState(false);
  const [outcome, setOutcome] = useState({ status: "won", reason: "" });
  const [outcomeError, setOutcomeError] = useState("");
  const [saving, setSaving] = useState(false);
  const [leadAttachments, setLeadAttachments] = useState([]);

  const fetchFeed = useCallback(async () => {
    try {
      const items = await apiFetch(`/leads/${id}/feed`);
      setFeed(items);
      // keep a flat tickets list for the composer's attach selector
      setTickets(items.filter(i => i.kind === "ticket").map(i => i.ticket));
    } catch {}
  }, [id]);

  async function fetchLead() {
    try {
      const data = await apiFetch(`/leads/${id}`);
      setLead(data);
      setNewPriority(data.priority);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLead();
    fetchFeed();
    apiFetch(`/leads/${id}/attachments`).then(setLeadAttachments).catch(() => {});
  }, [id]);

  // Live updates — re-fetch feed when another user posts on this lead
  useEffect(() => {
    return addWSListener((event) => {
      if (event.type === "feed_update" && String(event.lead_id) === String(id)) {
        fetchFeed();
        fetchLead();
      }
    });
  }, [id]);

  async function savePriority() {
    setSaving(true);
    try {
      const updated = await apiFetch(`/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ priority: newPriority }),
      });
      setLead(updated);
      setEditPriority(false);
    } finally {
      setSaving(false);
    }
  }

  async function submitOutcome() {
    if (!outcome.reason.trim()) { setOutcomeError("Reason is required."); return; }
    setSaving(true);
    setOutcomeError("");
    try {
      const updated = await apiFetch(`/leads/${id}/outcome`, {
        method: "POST",
        body: JSON.stringify(outcome),
      });
      setLead(updated);
      setOutcomeModal(false);
    } catch (err) {
      setOutcomeError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function refresh() {
    await Promise.all([fetchLead(), fetchFeed()]);
  }

  if (loading) return <p style={{ color: "#6B7280" }}>Loading…</p>;
  if (!lead) return <p style={{ color: "#DC2626" }}>Lead not found.</p>;

  const isTerminal = ["won", "lost", "dropped"].includes(lead.status);
  const isSales = user?.role === "sales";

  const currentStatus = getCurrentStatus(feed);
  const doneItems    = feed.filter(i => i.kind === "ticket" && TERMINAL.has(i.ticket.status));
  const activeItems  = feed.filter(i => !(i.kind === "ticket" && TERMINAL.has(i.ticket.status)));

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Back */}
      <button onClick={() => navigate("/")} style={ghostBtn}>
        <ArrowLeft size={14} /> Back to Leads
      </button>

      {/* Header card */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #99F6E4", padding: "1.5rem", margin: "1rem 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              {editPriority ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <select value={newPriority} onChange={e => setNewPriority(e.target.value)} style={selectStyle}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <button onClick={savePriority} disabled={saving} style={tinyBtn("#0D9488", "#fff")}>Save</button>
                  <button onClick={() => setEditPriority(false)} style={tinyBtn("#fff", "#374151", "#D1FAE5")}>✕</button>
                </div>
              ) : (
                <span onClick={() => isSales && !isTerminal && setEditPriority(true)}
                  style={{ cursor: isSales && !isTerminal ? "pointer" : "default" }}
                  title={isSales && !isTerminal ? "Click to edit priority" : ""}>
                  <PriorityBadge priority={lead.priority} />
                </span>
              )}
              <StatusBadge status={lead.status} />
              <CapBadge match={lead.capability_match} />
              {lead.suggested_priority && lead.suggested_priority !== lead.priority && (
                <span style={{ fontSize: 11, color: "#6B7280" }}>
                  Suggested: <strong style={{ color: "#0D9488" }}>{lead.suggested_priority}</strong>
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#134E4A", marginBottom: 4 }}>{lead.client_name}</h1>
            <p style={{ fontSize: 14, color: "#6B7280" }}>{lead.crop} · {lead.variety}</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 14, color: lead.days_left < 7 ? "#DC2626" : "#374151", fontWeight: 600 }}>
              <Clock size={14} />
              {lead.days_left < 0 ? "Overdue" : `${lead.days_left} days left`}
            </div>
            {lead.value_inr && (
              <div style={{ fontSize: 13, color: "#6B7280" }}>₹{Number(lead.value_inr).toLocaleString("en-IN")}</div>
            )}
            {lead.value_mt && (
              <div style={{ fontSize: 13, color: "#6B7280" }}>{lead.value_mt} MT</div>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid #F0FDFA" }}>
          {currentStatus && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Current Status</div>
              <span style={{ fontSize: 13, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: currentStatus.bg, color: currentStatus.color }}>
                {currentStatus.label}
              </span>
            </div>
          )}
          <Meta label="Win Probability" value={<span style={{ textTransform: "capitalize" }}>{lead.win_probability}</span>} />
          <Meta label="Deadline" value={new Date(lead.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />
          {lead.lead_source && <Meta label="Source" value={lead.lead_source} />}
          {lead.contact_name && <Meta label="Contact" value={`${lead.contact_name}${lead.contact_phone ? " · " + lead.contact_phone : ""}`} />}
          <Meta label="Items" value={`${feed.length} item${feed.length !== 1 ? "s" : ""}`} />
          <Meta label="Created by" value={lead.creator_name || "—"} />
        </div>

        {/* Terminal outcome banner */}
        {isTerminal && (
          <div style={{ marginTop: "1rem", background: "#F0FDFA", borderRadius: 8, padding: "0.75rem 1rem", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Trophy size={16} style={{ color: "#0D9488", marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 700, color: "#134E4A", textTransform: "capitalize" }}>{lead.status}</div>
              <div style={{ fontSize: 13, color: "#6B7280" }}>{lead.terminal_reason}</div>
            </div>
          </div>
        )}

        {/* Won/Lost/Dropped button */}
        {isSales && !isTerminal && (
          <div style={{ marginTop: "1.25rem" }}>
            <button onClick={() => setOutcomeModal(true)} style={{
              padding: "0.5rem 1rem", background: "#fff", color: "#DC2626",
              border: "1px solid #FECACA", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              Mark Outcome (Won / Lost / Dropped)
            </button>
          </div>
        )}
      </div>

      {/* Lead-level files */}
      {(leadAttachments.length > 0 || !isTerminal) && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E8F1F4", padding: "1.25rem 1.5rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Paperclip size={14} color="#0D9488" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#134E4A" }}>
              Files
              {leadAttachments.length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 400, color: "#6B7280", marginLeft: 4 }}>
                  ({leadAttachments.length})
                </span>
              )}
            </span>
          </div>
          <AttachmentsList
            attachments={leadAttachments}
            uploadPath={`/leads/${id}/attachments`}
            defaultKind="general"
            canUpload={!isTerminal}
            onUploaded={att => setLeadAttachments(prev => [att, ...prev])}
            onDeleted={attId => setLeadAttachments(prev => prev.filter(a => a.id !== attId))}
            currentUserId={user?.id}
            currentUserRole={user?.role}
          />
        </div>
      )}

      {/* Feed section */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E8F1F4", padding: "1.5rem" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#134E4A", marginBottom: "1rem" }}>
          Activity Feed
          <span style={{ fontSize: 13, fontWeight: 400, color: "#6B7280", marginLeft: 6 }}>({feed.length})</span>
        </div>

        {feed.length === 0 ? (
          <p style={{ color: "#9CA3AF", fontSize: 13 }}>No activity yet. Raise a ticket or leave a comment to start.</p>
        ) : (
          <div>
            {/* Completed tickets — floated to top, desaturated */}
            {doneItems.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <CheckCircle2 size={13} color="#9CA3AF" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Completed ({doneItems.length})
                  </span>
                </div>
                {doneItems.map((item, i) => (
                  <FeedEntry key={`done-${item.ticket?.id}-${i}`} item={item} onRefresh={refresh} dimmed />
                ))}
              </div>
            )}

            {/* Active feed — tickets in progress + all comments */}
            {activeItems.length > 0 && (
              <div>
                {doneItems.length > 0 && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Active
                  </div>
                )}
                {activeItems.map((item, i) => (
                  <FeedEntry key={`active-${item.kind}-${item.kind === "ticket" ? item.ticket?.id : item.comment?.id}-${i}`} item={item} onRefresh={refresh} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Composer */}
        {!isTerminal && (
          <FeedComposer
            leadId={id}
            tickets={tickets}
            onComment={refresh}
            onNewTicket={() => setTicketModal(true)}
          />
        )}
      </div>

      {ticketModal && (
        <CreateTicketModal
          leadId={id}
          onClose={() => setTicketModal(false)}
          onCreated={async () => { setTicketModal(false); await refresh(); }}
        />
      )}

      {/* Outcome modal */}
      {outcomeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "1.75rem", width: 420, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#134E4A" }}>Set Outcome</h2>
              <button onClick={() => setOutcomeModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}><X size={18} /></button>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Outcome *</label>
              <select value={outcome.status} onChange={e => setOutcome(v => ({ ...v, status: e.target.value }))} style={{ ...selectStyle, width: "100%" }}>
                {OUTCOMES.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Reason * <span style={{ color: "#DC2626" }}>(required)</span></label>
              <textarea rows={3} value={outcome.reason} onChange={e => setOutcome(v => ({ ...v, reason: e.target.value }))}
                placeholder="Why was this lead won / lost / dropped?"
                style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #D1FAE5", borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
            </div>

            {outcomeError && (
              <div role="alert" style={{ color: "#DC2626", fontSize: 13, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: 4 }}>
                <AlertTriangle size={13} /> {outcomeError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={submitOutcome} disabled={saving} style={{ flex: 1, padding: "0.625rem", background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                {saving ? "Saving…" : "Confirm"}
              </button>
              <button onClick={() => setOutcomeModal(false)} style={{ flex: 1, padding: "0.625rem", background: "#fff", color: "#374151", border: "1px solid #D1FAE5", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedEntry({ item, onRefresh, dimmed = false }) {
  if (item.kind === "ticket") {
    return (
      <div style={{ marginBottom: 8 }}>
        <TicketCard ticket={item.ticket} onRefresh={onRefresh} dimmed={dimmed} />
      </div>
    );
  }

  // comment
  const c = item.comment;
  const isPrivate = c.visibility === "sales_private";
  const ts = new Date(c.created_at).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div style={{
      marginBottom: 8, padding: "0.875rem 1rem",
      background: isPrivate ? "#FFFBEB" : "#F9FAFB",
      border: `1px solid ${isPrivate ? "#FDE68A" : "#E5E7EB"}`,
      borderLeft: `3px solid ${isPrivate ? "#F59E0B" : "#0D9488"}`,
      borderRadius: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <MessageSquare size={13} color={isPrivate ? "#F59E0B" : "#0D9488"} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{c.author_name || "Unknown"}</span>
        {isPrivate && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: "#92400E", background: "#FEF3C7", padding: "1px 6px", borderRadius: 20 }}>
            <Lock size={9} /> Private
          </span>
        )}
        {c.attached_ticket_id && (
          <span style={{ fontSize: 11, color: "#6B7280" }}>re: Ticket #{c.attached_ticket_id}</span>
        )}
        <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: "auto" }}>{ts}</span>
      </div>
      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>{c.body}</p>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>{value}</div>
    </div>
  );
}

function CapBadge({ match }) {
  if (!match || match === "unknown") return null;
  const supported = match === "supported";
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: supported ? "#D1FAE5" : "#FEF3C7", color: supported ? "#065F46" : "#92400E" }}>
      {supported ? "Supported" : "Needs model"}
    </span>
  );
}

const ghostBtn = { display: "inline-flex", alignItems: "center", gap: 6, padding: "0.4rem 0.875rem", background: "#fff", color: "#374151", border: "1px solid #D1FAE5", borderRadius: 8, fontSize: 13, cursor: "pointer", marginBottom: 4 };
const selectStyle = { padding: "0.4rem 0.6rem", border: "1px solid #D1FAE5", borderRadius: 6, fontSize: 13, color: "#134E4A", background: "#F0FDFA", fontFamily: "inherit" };
const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 };
const tinyBtn = (bg, color, border = "none") => ({ padding: "3px 10px", background: bg, color, border: border !== "none" ? `1px solid ${border}` : "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" });
