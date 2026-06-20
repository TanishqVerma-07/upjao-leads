import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../api";

const PRIORITIES = ["P1", "P2", "P3", "P4"];
const WIN_PROBS = ["high", "medium", "low"];

const PRIORITY_WEIGHT = { high: 1.0, medium: 0.6, low: 0.3 };
function suggestPriority(valueInr, winProb) {
  if (!valueInr || !winProb) return null;
  const score = parseFloat(valueInr) * (PRIORITY_WEIGHT[winProb] || 0);
  if (score >= 2000000) return "P1";
  if (score >= 1000000) return "P2";
  if (score >= 400000) return "P3";
  return "P4";
}

export default function CreateLeadPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    client_name: "", crop: "", variety: "", deadline: "",
    value_mt: "", value_inr: "", win_probability: "high", priority: "P2",
    lead_source: "", contact_name: "", contact_phone: "", contact_email: "", notes: "",
  });
  const [capMatch, setCapMatch] = useState(null);
  const [suggestedPriority, setSuggestedPriority] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const f = (field) => (e) => setForm((v) => ({ ...v, [field]: e.target.value }));

  // Recompute suggested priority on value/probability change
  useEffect(() => {
    setSuggestedPriority(suggestPriority(form.value_inr, form.win_probability));
  }, [form.value_inr, form.win_probability]);

  // Check capability match after crop+variety filled
  useEffect(() => {
    if (!form.crop || !form.variety) { setCapMatch(null); return; }
    const timer = setTimeout(async () => {
      try {
        const data = await apiFetch(
          `/leads/0/capability-hint?crop=${encodeURIComponent(form.crop)}&variety=${encodeURIComponent(form.variety)}`
        );
        setCapMatch(data.capability_match);
      } catch { setCapMatch(null); }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.crop, form.variety]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body = {
        ...form,
        value_mt: form.value_mt ? parseFloat(form.value_mt) : null,
        value_inr: form.value_inr ? parseFloat(form.value_inr) : null,
      };
      ["lead_source","contact_name","contact_phone","contact_email","notes"].forEach(k => {
        if (!body[k]) body[k] = null;
      });
      const lead = await apiFetch("/leads", { method: "POST", body: JSON.stringify(body) });
      navigate(`/leads/${lead.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
        <button onClick={() => navigate("/")} style={ghostBtn}>← Back</button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#134E4A" }}>New Lead</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Section title="Client">
          <Row>
            <Field label="Client / Company *" value={form.client_name} onChange={f("client_name")} required />
            <Field label="Lead Source" value={form.lead_source} onChange={f("lead_source")} />
          </Row>
        </Section>

        <Section title="Crop">
          <Row>
            <Field label="Crop *" value={form.crop} onChange={f("crop")} required />
            <div>
              <Field label="Variety *" value={form.variety} onChange={f("variety")} required />
              {capMatch && (
                <div style={{
                  marginTop: 6, fontSize: 12, fontWeight: 600, padding: "3px 10px",
                  borderRadius: 20, display: "inline-block",
                  background: capMatch === "supported" ? "#D1FAE5" : "#FEF3C7",
                  color: capMatch === "supported" ? "#065F46" : "#92400E",
                }}>
                  {capMatch === "supported" ? "✓ Already supported" : "⚠ Needs new model"}
                </div>
              )}
            </div>
          </Row>
        </Section>

        <Section title="Value & Priority">
          <Row>
            <Field label="Deadline *" type="date" value={form.deadline} onChange={f("deadline")} required />
            <Field label="Win Probability *">
              <select value={form.win_probability} onChange={f("win_probability")} style={selectStyle} required>
                {WIN_PROBS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Value (MT)" type="number" value={form.value_mt} onChange={f("value_mt")} placeholder="e.g. 50" />
            <Field label="Value (₹)" type="number" value={form.value_inr} onChange={f("value_inr")} placeholder="e.g. 2500000" />
          </Row>
          <Row>
            <Field label="Priority *">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <select value={form.priority} onChange={f("priority")} style={selectStyle} required>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {suggestedPriority && (
                  <span style={{ fontSize: 12, color: "#6B7280" }}>
                    Suggested: <strong style={{ color: "#0D9488" }}>{suggestedPriority}</strong>
                  </span>
                )}
              </div>
            </Field>
          </Row>
        </Section>

        <Section title="Contact (optional)">
          <Row>
            <Field label="Contact Name" value={form.contact_name} onChange={f("contact_name")} />
            <Field label="Phone" type="tel" value={form.contact_phone} onChange={f("contact_phone")} />
          </Row>
          <Field label="Email" type="email" value={form.contact_email} onChange={f("contact_email")} />
        </Section>

        <Section title="Notes (private)">
          <div>
            <label style={labelStyle}>Internal notes <span style={{ color: "#6B7280", fontWeight: 400 }}>(Sales-only)</span></label>
            <textarea value={form.notes} onChange={f("notes")} rows={3}
              style={{ ...inputStyle, resize: "vertical", width: "100%" }} />
          </div>
        </Section>

        {error && (
          <div role="alert" style={{
            background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
            padding: "0.625rem 0.875rem", color: "#DC2626", fontSize: 13, marginBottom: "1rem",
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={saving} style={primaryBtn}>
            {saving ? "Creating…" : "Create Lead"}
          </button>
          <button type="button" onClick={() => navigate("/")} style={ghostBtn}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #99F6E4", padding: "1.25rem", marginBottom: "1rem" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1rem" }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0.75rem" }}>{children}</div>;
}

function Field({ label, children, value, onChange, type = "text", required, placeholder }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children || (
        <input type={type} value={value} onChange={onChange} required={required}
          placeholder={placeholder} style={inputStyle} />
      )}
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 };
const inputStyle = { width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #D1FAE5", borderRadius: 8, fontSize: 14, color: "#134E4A", background: "#F0FDFA", boxSizing: "border-box", fontFamily: "inherit" };
const selectStyle = { ...{}, padding: "0.5rem 0.75rem", border: "1px solid #D1FAE5", borderRadius: 8, fontSize: 14, color: "#134E4A", background: "#F0FDFA", fontFamily: "inherit", width: "100%" };
const primaryBtn = { padding: "0.6rem 1.25rem", background: "#0D9488", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" };
const ghostBtn = { padding: "0.6rem 1.25rem", background: "#fff", color: "#374151", border: "1px solid #D1FAE5", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" };
