import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import PriorityBadge from "../components/PriorityBadge";
import StatusBadge from "../components/StatusBadge";
import { Plus, Clock, Ticket } from "lucide-react";

const STATUSES = ["new", "active", "idle", "won", "lost", "dropped"];
const PRIORITIES = ["P1", "P2", "P3", "P4"];

export default function LeadsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ crop: "", status: "", priority: "" });

  async function fetchLeads() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.crop) params.set("crop", filters.crop);
      if (filters.status) params.set("status", filters.status);
      if (filters.priority) params.set("priority", filters.priority);
      const data = await apiFetch(`/leads?${params}`);
      setLeads(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLeads(); }, [filters]);

  const f = (field) => (e) => setFilters((v) => ({ ...v, [field]: e.target.value }));

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#134E4A" }}>Leads</h1>
        {user?.role === "sales" && (
          <button onClick={() => navigate("/leads/new")} style={primaryBtn}>
            <Plus size={15} /> New Lead
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <input placeholder="Filter by crop…" value={filters.crop} onChange={f("crop")}
          style={{ ...filterInput, width: 180 }} />
        <select value={filters.status} onChange={f("status")} style={filterInput}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.priority} onChange={f("priority")} style={filterInput}>
          <option value="">All priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {(filters.crop || filters.status || filters.priority) && (
          <button onClick={() => setFilters({ crop: "", status: "", priority: "" })} style={ghostBtn}>Clear</button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <p style={{ color: "#6B7280" }}>Loading…</p>
      ) : leads.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6B7280" }}>
          <p style={{ fontSize: 16 }}>No leads found.</p>
          {user?.role === "sales" && (
            <button onClick={() => navigate("/leads/new")} style={{ ...primaryBtn, marginTop: 12 }}>
              <Plus size={15} /> Create your first lead
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {leads.map(lead => (
            <div key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)}
              style={{
                background: "#fff", borderRadius: 12, border: "1px solid #E8F1F4",
                padding: "1rem 1.25rem", cursor: "pointer",
                display: "grid", gridTemplateColumns: "1fr auto",
                gap: "0.5rem", alignItems: "center",
                transition: "box-shadow 150ms ease, border-color 150ms ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(13,148,136,0.10)"; e.currentTarget.style.borderColor = "#99F6E4"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#E8F1F4"; }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <PriorityBadge priority={lead.priority} />
                  <StatusBadge status={lead.status} />
                  {lead.capability_match === "needs_model" && (
                    <span style={{ fontSize: 11, background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>
                      Needs model
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#134E4A" }}>{lead.client_name}</div>
                <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                  {lead.crop} · {lead.variety}
                  {lead.value_inr && <> · ₹{Number(lead.value_inr).toLocaleString("en-IN")}</>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: lead.days_left < 7 ? "#DC2626" : "#6B7280" }}>
                  <Clock size={13} />
                  {lead.days_left < 0 ? "Overdue" : `${lead.days_left}d left`}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#6B7280" }}>
                  <Ticket size={13} />
                  {lead.ticket_count} ticket{lead.ticket_count !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const primaryBtn = { display: "inline-flex", alignItems: "center", gap: 6, padding: "0.5rem 1rem", background: "#0D9488", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" };
const ghostBtn = { padding: "0.5rem 0.875rem", background: "#fff", color: "#374151", border: "1px solid #D1FAE5", borderRadius: 8, fontSize: 13, cursor: "pointer" };
const filterInput = { padding: "0.45rem 0.75rem", border: "1px solid #D1FAE5", borderRadius: 8, fontSize: 13, color: "#134E4A", background: "#fff", fontFamily: "inherit" };
