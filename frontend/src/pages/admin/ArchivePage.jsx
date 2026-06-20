import { useState, useEffect } from "react";
import { apiFetch } from "../../api";
import { History, ChevronLeft, ChevronRight } from "lucide-react";

const ENTITY_COLORS = {
  lead:   { bg: "#EDE9FE", color: "#5B21B6" },
  ticket: { bg: "#FEF3C7", color: "#92400E" },
};

export default function ArchivePage() {
  const [rows, setRows]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [users, setUsers]   = useState([]);

  const [filters, setFilters] = useState({
    entity_type: "",
    entity_id: "",
    user_id: "",
    from_date: "",
    to_date: "",
  });

  useEffect(() => {
    apiFetch("/admin/users").then(setUsers).catch(() => {});
  }, []);

  useEffect(() => { fetchRows(1); }, [filters]);

  async function fetchRows(p = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, size: 50 });
      if (filters.entity_type) params.set("entity_type", filters.entity_type);
      if (filters.entity_id)   params.set("entity_id",   filters.entity_id);
      if (filters.user_id)     params.set("user_id",     filters.user_id);
      if (filters.from_date)   params.set("from_date",   filters.from_date);
      if (filters.to_date)     params.set("to_date",     filters.to_date);
      const data = await apiFetch(`/admin/archive?${params}`);
      setRows(data.rows);
      setTotal(data.total);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }

  const f = (field) => (e) => setFilters(v => ({ ...v, [field]: e.target.value }));
  const totalPages = Math.ceil(total / 50);

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
        <History size={20} color="#0D9488" />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#134E4A", margin: 0 }}>Archive Viewer</h1>
        <span style={{ fontSize: 13, color: "#6B7280" }}>— immutable status history</span>
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E8F1F4", padding: "1rem", marginBottom: "1.25rem", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <FilterField label="Entity type">
          <select value={filters.entity_type} onChange={f("entity_type")} style={sel}>
            <option value="">All</option>
            <option value="lead">Lead</option>
            <option value="ticket">Ticket</option>
          </select>
        </FilterField>

        <FilterField label="Entity ID">
          <input type="number" value={filters.entity_id} onChange={f("entity_id")}
            placeholder="e.g. 3" style={{ ...sel, width: 90 }} />
        </FilterField>

        <FilterField label="Changed by">
          <select value={filters.user_id} onChange={f("user_id")} style={sel}>
            <option value="">Anyone</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </FilterField>

        <FilterField label="From date">
          <input type="date" value={filters.from_date} onChange={f("from_date")} style={sel} />
        </FilterField>

        <FilterField label="To date">
          <input type="date" value={filters.to_date} onChange={f("to_date")} style={sel} />
        </FilterField>

        {Object.values(filters).some(Boolean) && (
          <button
            onClick={() => setFilters({ entity_type: "", entity_id: "", user_id: "", from_date: "", to_date: "" })}
            style={{ padding: "0.4rem 0.875rem", background: "#fff", color: "#374151", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 13, cursor: "pointer", alignSelf: "flex-end" }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Results summary */}
      <div style={{ fontSize: 13, color: "#6B7280", marginBottom: "0.75rem" }}>
        {loading ? "Loading…" : `${total} record${total !== 1 ? "s" : ""} found`}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E8F1F4", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F0FDFA", borderBottom: "1px solid #D1FAE5" }}>
              {["Type", "ID", "From status", "To status", "Changed by", "When", "Note"].map(h => (
                <th key={h} style={{ padding: "0.6rem 1rem", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#065F46", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#9CA3AF" }}>
                  {loading ? "Loading…" : "No history records match the current filters."}
                </td>
              </tr>
            ) : rows.map(r => {
              const ec = ENTITY_COLORS[r.entity_type] || ENTITY_COLORS.ticket;
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid #F9FAFB" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                  <td style={{ padding: "0.6rem 1rem" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: ec.bg, color: ec.color }}>
                      {r.entity_type}
                    </span>
                  </td>
                  <td style={{ padding: "0.6rem 1rem", color: "#374151", fontWeight: 600 }}>#{r.entity_id}</td>
                  <td style={{ padding: "0.6rem 1rem", color: "#9CA3AF", fontStyle: r.from_status ? "normal" : "italic" }}>
                    {r.from_status ?? "—"}
                  </td>
                  <td style={{ padding: "0.6rem 1rem" }}>
                    <span style={{ fontWeight: 600, color: "#065F46" }}>{r.to_status}</span>
                  </td>
                  <td style={{ padding: "0.6rem 1rem", color: "#374151" }}>{r.changed_by_name}</td>
                  <td style={{ padding: "0.6rem 1rem", color: "#6B7280", whiteSpace: "nowrap" }}>
                    {new Date(r.changed_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td style={{ padding: "0.6rem 1rem", color: "#6B7280", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.note ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: "1rem", justifyContent: "flex-end" }}>
          <button onClick={() => fetchRows(page - 1)} disabled={page === 1} style={pageBtn}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 13, color: "#374151" }}>Page {page} / {totalPages}</span>
          <button onClick={() => fetchRows(page + 1)} disabled={page === totalPages} style={pageBtn}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      {children}
    </div>
  );
}

const sel = { padding: "0.4rem 0.65rem", border: "1px solid #D1FAE5", borderRadius: 8, fontSize: 13, color: "#134E4A", background: "#fff", fontFamily: "inherit", cursor: "pointer" };
const pageBtn = { display: "flex", alignItems: "center", padding: "4px 8px", border: "1px solid #D1FAE5", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#374151" };
