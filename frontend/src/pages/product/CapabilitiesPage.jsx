import { useEffect, useState } from "react";
import { apiFetch } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Plus, FlaskConical, CheckCircle2, XCircle, Trash2 } from "lucide-react";

export default function CapabilitiesPage() {
  const { user } = useAuth();
  const isProduct = user?.role === "product";

  const [caps, setCaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ crop: "", variety: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function fetchCaps() {
    setLoading(true);
    try { setCaps(await apiFetch("/capabilities")); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchCaps(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    if (!form.crop.trim() || !form.variety.trim()) {
      setError("Both crop and variety are required.");
      return;
    }
    setSaving(true);
    try {
      const created = await apiFetch("/capabilities", {
        method: "POST",
        body: JSON.stringify({ crop: form.crop.trim(), variety: form.variety.trim() }),
      });
      setCaps(prev => [...prev, created].sort((a, b) =>
        a.crop.localeCompare(b.crop) || a.variety.localeCompare(b.variety)
      ));
      setForm({ crop: "", variety: "" });
      setAdding(false);
    } catch (err) {
      setError(err.message || "Failed to add capability.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(cap) {
    const updated = await apiFetch(`/capabilities/${cap.id}/toggle`, { method: "PATCH" });
    setCaps(prev => prev.map(c => c.id === cap.id ? updated : c));
  }

  async function handleDelete(cap) {
    if (!confirm(`Delete "${cap.crop} / ${cap.variety}" permanently? This cannot be undone.`)) return;
    await apiFetch(`/capabilities/${cap.id}`, { method: "DELETE" });
    setCaps(prev => prev.filter(c => c.id !== cap.id));
  }

  const active = caps.filter(c => c.is_active);
  const inactive = caps.filter(c => !c.is_active);

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.75rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <FlaskConical size={22} color="#0D9488" />
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#134E4A", margin: 0 }}>Capability Catalog</h1>
          </div>
          <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>
            Crop + variety combinations the lab currently supports. Leads are tagged automatically.
          </p>
        </div>
        {isProduct && !adding && (
          <button onClick={() => { setAdding(true); setError(""); }} style={primaryBtn}>
            <Plus size={14} /> Add Entry
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <form onSubmit={handleAdd} style={{
          background: "#fff", border: "1px solid #99F6E4", borderRadius: 12,
          padding: "1.25rem", marginBottom: "1.5rem",
          display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 10, alignItems: "flex-start",
        }}>
          <div>
            <label style={labelStyle}>Crop</label>
            <input
              autoFocus
              placeholder="e.g. Wheat"
              value={form.crop}
              onChange={e => setForm(v => ({ ...v, crop: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Variety</label>
            <input
              placeholder="e.g. HD-2967"
              value={form.variety}
              onChange={e => setForm(v => ({ ...v, variety: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div style={{ paddingTop: 22 }}>
            <button type="submit" disabled={saving} style={primaryBtn}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          <div style={{ paddingTop: 22 }}>
            <button type="button" onClick={() => { setAdding(false); setError(""); }} style={ghostBtn}>
              Cancel
            </button>
          </div>
          {error && (
            <div style={{ gridColumn: "1 / -1", fontSize: 13, color: "#DC2626" }}>{error}</div>
          )}
        </form>
      )}

      {loading ? (
        <p style={{ color: "#6B7280" }}>Loading…</p>
      ) : caps.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6B7280", background: "#fff", borderRadius: 12, border: "1px solid #E8F1F4" }}>
          <FlaskConical size={32} color="#D1FAE5" style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 15, margin: 0 }}>No capabilities yet.</p>
          {isProduct && (
            <button onClick={() => setAdding(true)} style={{ ...primaryBtn, marginTop: 12 }}>
              <Plus size={14} /> Add first entry
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Active capabilities */}
          <Section title="Supported" count={active.length} color="#059669">
            {active.map(cap => (
              <CapRow key={cap.id} cap={cap} isProduct={isProduct}
                onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </Section>

          {/* Inactive */}
          {inactive.length > 0 && (
            <Section title="Inactive" count={inactive.length} color="#9CA3AF" style={{ marginTop: "1.5rem" }}>
              {inactive.map(cap => (
                <CapRow key={cap.id} cap={cap} isProduct={isProduct}
                  onToggle={handleToggle} onDelete={handleDelete} />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, count, color, children, style }) {
  return (
    <div style={style}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.625rem" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {title}
        </span>
        <span style={{ fontSize: 12, background: "#F3F4F6", color: "#6B7280", padding: "1px 7px", borderRadius: 20, fontWeight: 600 }}>
          {count}
        </span>
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E8F1F4", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

function CapRow({ cap, isProduct, onToggle, onDelete }) {
  const [toggling, setToggling] = useState(false);

  async function toggle() {
    setToggling(true);
    try { await onToggle(cap); }
    finally { setToggling(false); }
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", padding: "0.75rem 1rem",
      borderBottom: "1px solid #F9FAFB", gap: 12,
    }}>
      {cap.is_active
        ? <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
        : <XCircle size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
      }

      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: cap.is_active ? "#134E4A" : "#9CA3AF" }}>
          {cap.crop}
        </span>
        <span style={{ fontSize: 14, color: "#9CA3AF", margin: "0 6px" }}>/</span>
        <span style={{ fontSize: 14, color: cap.is_active ? "#374151" : "#9CA3AF" }}>
          {cap.variety}
        </span>
      </div>

      <div style={{ fontSize: 12, color: "#9CA3AF", flexShrink: 0 }}>
        Added by {cap.adder_name ?? "Unknown"} ·{" "}
        {new Date(cap.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </div>

      {isProduct && (
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            onClick={toggle}
            disabled={toggling}
            title={cap.is_active ? "Deactivate" : "Reactivate"}
            style={{
              padding: "4px 10px", border: "1px solid", borderRadius: 6,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: "transparent",
              borderColor: cap.is_active ? "#FCA5A5" : "#6EE7B7",
              color: cap.is_active ? "#DC2626" : "#059669",
              transition: "all 150ms",
            }}
          >
            {toggling ? "…" : cap.is_active ? "Deactivate" : "Reactivate"}
          </button>
          <button
            onClick={() => onDelete(cap)}
            title="Delete permanently"
            style={{
              padding: "4px 8px", border: "1px solid #FCA5A5", borderRadius: 6,
              fontSize: 12, cursor: "pointer", background: "transparent",
              color: "#DC2626", display: "flex", alignItems: "center",
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

const primaryBtn = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "0.5rem 1rem", background: "#0D9488", color: "#fff",
  border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const ghostBtn = {
  padding: "0.5rem 0.875rem", background: "#fff", color: "#374151",
  border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 13, cursor: "pointer",
};
const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4,
};
const inputStyle = {
  width: "100%", padding: "0.45rem 0.75rem",
  border: "1px solid #D1FAE5", borderRadius: 8,
  fontSize: 13, color: "#134E4A", background: "#fff",
  fontFamily: "inherit", boxSizing: "border-box",
};
