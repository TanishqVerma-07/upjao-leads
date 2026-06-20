import { useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { X } from "lucide-react";

const TYPES_BY_ROLE = {
  sales:   ["analysis_request", "new_commodity", "new_variety", "quality_mismatch", "accuracy_issue", "general"],
  product: ["sample_request", "quality_mismatch", "accuracy_issue", "general"],
  admin:   ["general"],
};

const TYPE_LABELS = {
  analysis_request: "Analysis Request (→ Product)",
  sample_request:   "Sample Request (→ Sales)",
  new_commodity:    "New Commodity (→ Product)",
  new_variety:      "New Variety (→ Product)",
  quality_mismatch: "Quality Mismatch (→ Product)",
  accuracy_issue:   "Accuracy Issue (→ Product)",
  general:          "General",
};

export default function CreateTicketModal({ leadId, onClose, onCreated }) {
  const { user } = useAuth();
  const [type, setType]       = useState(TYPES_BY_ROLE[user?.role]?.[0] || "general");
  const [body, setBody]       = useState("");
  const [toTeam, setToTeam]   = useState("sales");
  const [rawKg, setRawKg]     = useState("");
  const [cleanedG, setCleanedG] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [error, setError]     = useState("");
  const [saving, setSaving]   = useState(false);

  const availableTypes = TYPES_BY_ROLE[user?.role] || ["general"];

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = { type, body };
      if (type === "general") payload.to_team = toTeam;
      if (type === "sample_request") {
        if (rawKg) payload.sample_raw_kg = parseFloat(rawKg);
        if (cleanedG) payload.sample_cleaned_g = parseFloat(cleanedG);
        if (neededBy) payload.needed_by = neededBy;
      }
      const ticket = await apiFetch(`/leads/${leadId}/tickets`, { method: "POST", body: JSON.stringify(payload) });
      onCreated(ticket);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
      <div style={{ background:"#fff", borderRadius:16, padding:"1.75rem", width:460, boxShadow:"0 8px 32px rgba(0,0,0,0.15)", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:"#134E4A" }}>New Ticket</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#6B7280" }}><X size={18}/></button>
        </div>

        <form onSubmit={submit}>
          <Field label="Ticket Type *">
            <select value={type} onChange={e => setType(e.target.value)} style={sel} required>
              {availableTypes.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </Field>

          {type === "general" && (
            <Field label="Route to *">
              <select value={toTeam} onChange={e => setToTeam(e.target.value)} style={sel} required>
                <option value="sales">Sales</option>
                <option value="product">Product</option>
              </select>
            </Field>
          )}

          <Field label="Description *">
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} required
              style={{ ...inp, resize:"vertical" }} placeholder="Describe what's needed…" />
          </Field>

          {type === "sample_request" && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
                <Field label="Raw Quantity (kg)">
                  <input type="number" value={rawKg} onChange={e => setRawKg(e.target.value)} style={inp} placeholder="e.g. 5" />
                </Field>
                <Field label="Cleaned Quantity (g)">
                  <input type="number" value={cleanedG} onChange={e => setCleanedG(e.target.value)} style={inp} placeholder="e.g. 200" />
                </Field>
              </div>
              <Field label="Needed By">
                <input type="date" value={neededBy} onChange={e => setNeededBy(e.target.value)} style={inp} />
              </Field>
            </>
          )}

          {error && (
            <div role="alert" style={{ color:"#DC2626", fontSize:13, marginBottom:"0.75rem", background:"#FEF2F2", padding:"0.5rem 0.75rem", borderRadius:8 }}>
              {error}
            </div>
          )}

          <div style={{ display:"flex", gap:10, marginTop:"0.5rem" }}>
            <button type="submit" disabled={saving || !body.trim()} style={{ flex:1, padding:"0.625rem", background:"#0D9488", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>
              {saving ? "Sending…" : "Send as Ticket"}
            </button>
            <button type="button" onClick={onClose} style={{ flex:1, padding:"0.625rem", background:"#fff", color:"#374151", border:"1px solid #D1FAE5", borderRadius:8, fontSize:14, cursor:"pointer" }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:"0.875rem" }}>
      <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:4 }}>{label}</label>
      {children}
    </div>
  );
}

const inp = { width:"100%", padding:"0.5rem 0.75rem", border:"1px solid #D1FAE5", borderRadius:8, fontSize:14, color:"#134E4A", background:"#F0FDFA", boxSizing:"border-box", fontFamily:"inherit" };
const sel = { ...inp, cursor:"pointer" };
