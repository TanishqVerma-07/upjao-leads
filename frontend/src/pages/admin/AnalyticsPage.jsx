import { useEffect, useState } from "react";
import { apiFetch } from "../../api";
import { BarChart3, TrendingUp, Ticket, AlertTriangle, Users, Clock } from "lucide-react";

const STATUS_COLORS = {
  new:     "#6B7280",
  active:  "#0D9488",
  idle:    "#F59E0B",
  won:     "#059669",
  lost:    "#DC2626",
  dropped: "#9CA3AF",
};

const PRIORITY_COLORS = { P1: "#DC2626", P2: "#F59E0B", P3: "#0D9488", P4: "#6B7280" };

const TYPE_LABELS = {
  analysis_request: "Analysis",
  sample_request:   "Sample",
  general:          "General",
};

export default function AnalyticsPage() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/admin/analytics")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "#6B7280" }}>Loading analytics…</p>;
  if (!data)   return <p style={{ color: "#DC2626" }}>Failed to load analytics.</p>;

  const activeLeads = (data.lead_counts.active || 0);
  const wonLeads    = (data.lead_counts.won || 0);
  const overallWinRate = data.total_leads
    ? Math.round(wonLeads / data.total_leads * 100)
    : 0;

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.75rem" }}>
        <BarChart3 size={22} color="#0D9488" />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#134E4A", margin: 0 }}>Analytics</h1>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: "1.75rem" }}>
        <StatCard icon={<Users size={18} color="#0D9488" />} label="Total Leads"    value={data.total_leads} />
        <StatCard icon={<TrendingUp size={18} color="#059669" />} label="Active Leads" value={activeLeads} sub={`${data.lead_counts.idle || 0} idle`} />
        <StatCard icon={<Ticket size={18} color="#5B21B6" />}  label="Total Tickets" value={data.total_tickets} sub={data.avg_days_to_done != null ? `avg ${data.avg_days_to_done}d to done` : null} />
        <StatCard icon={<AlertTriangle size={18} color="#DC2626" />} label="At-Risk Tickets" value={data.at_risk_count} accent="#DC2626" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "1.5rem" }}>
        {/* Leads by status */}
        <ChartCard title="Leads by Status">
          <BarChart
            entries={Object.entries(data.lead_counts).map(([k, v]) => ({
              label: k.charAt(0).toUpperCase() + k.slice(1),
              value: v,
              color: STATUS_COLORS[k] || "#9CA3AF",
            }))}
          />
        </ChartCard>

        {/* Leads by priority */}
        <ChartCard title="Leads by Priority">
          <BarChart
            entries={Object.entries(data.priority_counts).map(([k, v]) => ({
              label: k,
              value: v,
              color: PRIORITY_COLORS[k] || "#9CA3AF",
            }))}
          />
        </ChartCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Win rate by crop */}
        <ChartCard title="Win Rate by Crop">
          {data.win_rate_by_crop.length === 0 ? (
            <p style={{ color: "#9CA3AF", fontSize: 13 }}>No closed leads yet.</p>
          ) : (
            <div>
              {data.win_rate_by_crop.map(c => (
                <div key={c.crop} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: "#134E4A" }}>{c.crop}</span>
                    <span style={{ color: "#6B7280" }}>{c.won}/{c.total} won · <strong style={{ color: "#059669" }}>{Math.round(c.rate * 100)}%</strong></span>
                  </div>
                  <div style={{ height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${c.rate * 100}%`, background: "#059669", borderRadius: 3, transition: "width 0.5s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        {/* Ticket types + velocity */}
        <ChartCard title="Ticket Types">
          <BarChart
            entries={Object.entries(data.ticket_type_counts).map(([k, v]) => ({
              label: TYPE_LABELS[k] || k,
              value: v,
              color: k === "analysis_request" ? "#5B21B6" : k === "sample_request" ? "#F59E0B" : "#6B7280",
            }))}
          />
          {data.avg_days_to_done != null && (
            <div style={{ marginTop: 16, padding: "0.75rem", background: "#F0FDFA", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={16} color="#0D9488" />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Avg days — created → done</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#134E4A" }}>{data.avg_days_to_done}<span style={{ fontSize: 13, fontWeight: 400, color: "#6B7280" }}> days</span></div>
              </div>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent = "#134E4A" }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E8F1F4", padding: "1rem 1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E8F1F4", padding: "1.25rem" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#134E4A", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</div>
      {children}
    </div>
  );
}

function BarChart({ entries }) {
  const max = Math.max(...entries.map(e => e.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {entries.map(e => (
        <div key={e.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 72, fontSize: 12, color: "#374151", fontWeight: 500, textAlign: "right", flexShrink: 0 }}>{e.label}</div>
          <div style={{ flex: 1, height: 20, background: "#F3F4F6", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(e.value / max) * 100}%`,
              background: e.color,
              borderRadius: 4,
              minWidth: e.value > 0 ? 4 : 0,
              transition: "width 0.5s ease",
              display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 4,
            }}>
              {e.value > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{e.value}</span>
              )}
            </div>
          </div>
          {e.value === 0 && <span style={{ fontSize: 12, color: "#9CA3AF" }}>0</span>}
        </div>
      ))}
    </div>
  );
}
