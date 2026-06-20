import { useEffect, useState } from "react";
import { apiFetch } from "../../api";
import { UserPlus, CheckCircle, XCircle } from "lucide-react";

const ROLES = ["sales", "product", "admin"];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "sales" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchUsers() {
    try {
      const data = await apiFetch("/users");
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function createUser(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await apiFetch("/users", { method: "POST", body: JSON.stringify(form) });
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "sales" });
      fetchUsers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user) {
    await apiFetch(`/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    fetchUsers();
  }

  async function changeRole(user, role) {
    await apiFetch(`/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    fetchUsers();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#134E4A", margin: 0 }}>Users</h1>
        <button onClick={() => setShowForm(v => !v)} style={btnStyle}>
          <UserPlus size={15} /> Add User
        </button>
      </div>

      {showForm && (
        <form onSubmit={createUser} style={{
          background: "#fff", border: "1px solid #99F6E4", borderRadius: 12,
          padding: "1.5rem", marginBottom: "1.5rem",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem",
        }}>
          <div style={{ gridColumn: "span 2", fontWeight: 600, color: "#134E4A" }}>New User</div>
          {[["name","Name","text"],["email","Email","email"],["password","Password","password"]].map(([field, label, type]) => (
            <div key={field}>
              <label style={labelStyle}>{label} <span style={{ color: "#DC2626" }}>*</span></label>
              <input type={type} required value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                style={inputStyle} />
            </div>
          ))}
          <div>
            <label style={labelStyle}>Role <span style={{ color: "#DC2626" }}>*</span></label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inputStyle}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {formError && (
            <div role="alert" style={{ gridColumn: "span 2", color: "#DC2626", fontSize: 13 }}>{formError}</div>
          )}
          <div style={{ gridColumn: "span 2", display: "flex", gap: 10 }}>
            <button type="submit" disabled={saving} style={btnStyle}>{saving ? "Saving…" : "Create"}</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ ...btnStyle, background: "#fff", color: "#374151", border: "1px solid #D1FAE5" }}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: "#6B7280" }}>Loading…</p>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #99F6E4", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#F0FDFA", borderBottom: "1px solid #99F6E4" }}>
                {["Name","Email","Role","Status","Actions"].map(h => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#134E4A" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid #F0FDFA" }}>
                  <td style={tdStyle}>{u.name}</td>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>
                    <select value={u.role} onChange={e => changeRole(u, e.target.value)}
                      style={{ border: "1px solid #D1FAE5", borderRadius: 6, padding: "2px 6px", fontSize: 13, color: "#134E4A", background: "#F0FDFA", cursor: "pointer" }}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 20,
                      background: u.is_active ? "#DCFCE7" : "#FEE2E2",
                      color: u.is_active ? "#166534" : "#991B1B",
                    }}>
                      {u.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => toggleActive(u)} style={{
                      fontSize: 12, padding: "4px 12px", borderRadius: 6, cursor: "pointer",
                      background: u.is_active ? "#FEE2E2" : "#DCFCE7",
                      color: u.is_active ? "#991B1B" : "#166534",
                      border: "none", fontWeight: 600,
                    }}>
                      {u.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 };
const inputStyle = { width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #D1FAE5", borderRadius: 8, fontSize: 14, color: "#134E4A", background: "#F0FDFA", boxSizing: "border-box" };
const btnStyle = { display: "inline-flex", alignItems: "center", gap: 6, padding: "0.5rem 1rem", background: "#0D9488", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" };
const tdStyle = { padding: "0.75rem 1rem", color: "#374151" };
