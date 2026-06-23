import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { addWSListener } from "../ws";
import { apiFetch } from "../api";
import { LogOut, LayoutDashboard, Users, Inbox, Bell, CheckCheck, FlaskConical, History, BarChart3 } from "lucide-react";

const NAV = {
  sales: [
    { to: "/", label: "Leads", icon: LayoutDashboard },
    { to: "/queue", label: "My Queue", icon: Inbox },
  ],
  product: [
    { to: "/", label: "Leads", icon: LayoutDashboard },
    { to: "/queue", label: "My Queue", icon: Inbox },
    { to: "/capabilities", label: "Capabilities", icon: FlaskConical },
  ],
  tech: [
    { to: "/", label: "Leads", icon: LayoutDashboard },
    { to: "/queue", label: "My Queue", icon: Inbox },
    { to: "/capabilities", label: "Capabilities", icon: FlaskConical },
  ],
  admin: [
    { to: "/", label: "Leads", icon: LayoutDashboard },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/capabilities", label: "Capabilities", icon: FlaskConical },
    { to: "/admin/archive", label: "Archive", icon: History },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  ],
};

const TYPE_ICON = {
  new_ticket:    "🎫",
  status_change: "🔄",
  comment:       "💬",
  sla_breach:    "⚠️",
  hold_resurfaced: "🔔",
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = NAV[user?.role] ?? [];

  const [notifs, setNotifs]       = useState([]);
  const [bellOpen, setBellOpen]   = useState(false);
  const bellRef                   = useRef(null);

  const unread = notifs.filter(n => !n.is_read).length;

  async function fetchNotifs() {
    try { setNotifs(await apiFetch("/notifications")); } catch {}
  }

  useEffect(() => { fetchNotifs(); }, []);

  // Live: new notification arrives over WS
  useEffect(() => {
    return addWSListener((event) => {
      if (event.type === "notification") {
        setNotifs(prev => [{
          id: event.id,
          type: event.notif_type,
          message: event.message,
          lead_id: event.lead_id,
          ticket_id: event.ticket_id,
          is_read: false,
          created_at: new Date().toISOString(),
        }, ...prev].slice(0, 50));
      }
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function markRead(id) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
  }

  async function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    await apiFetch("/notifications/read-all", { method: "PATCH" });
  }

  function handleNotifClick(n) {
    markRead(n.id);
    setBellOpen(false);
    if (n.lead_id) navigate(`/leads/${n.lead_id}`);
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: "#134E4A", color: "#fff",
        display: "flex", flexDirection: "column", padding: "1.5rem 0",
        position: "fixed", top: 0, left: 0, bottom: 0,
      }}>
        <div style={{ padding: "0 1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#5EEAD4" }}>Upjao Leads</div>
          <div style={{ fontSize: 12, color: "#99F6E4", marginTop: 2, textTransform: "capitalize" }}>
            {user?.name} · {user?.role}
          </div>
        </div>

        <nav style={{ flex: 1, padding: "1rem 0" }}>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 10,
              padding: "0.6rem 1.25rem", textDecoration: "none",
              color: isActive ? "#FFFFFF" : "#99F6E4",
              background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
              borderLeft: isActive ? "3px solid #5EEAD4" : "3px solid transparent",
              fontSize: 14, fontWeight: isActive ? 600 : 400,
              transition: "all 150ms ease",
            })}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bell button */}
        <div ref={bellRef} style={{ position: "relative", margin: "0 1rem 0.75rem" }}>
          <button
            onClick={() => setBellOpen(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "0.6rem 0.75rem", background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8,
              color: "#99F6E4", cursor: "pointer", fontSize: 14,
              position: "relative",
            }}
          >
            <Bell size={16} />
            Notifications
            {unread > 0 && (
              <span style={{
                marginLeft: "auto", minWidth: 20, height: 20, borderRadius: 10,
                background: "#EA580C", color: "#fff", fontSize: 11, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 5px",
              }}>
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {bellOpen && (
            <div style={{
              position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0,
              background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              zIndex: 200, maxHeight: 420, display: "flex", flexDirection: "column",
              minWidth: 280,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 1rem 0.5rem", borderBottom: "1px solid #F3F4F6" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#134E4A" }}>
                  Notifications {unread > 0 && <span style={{ fontSize: 12, color: "#EA580C" }}>({unread} new)</span>}
                </span>
                {unread > 0 && (
                  <button onClick={markAllRead} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#0D9488", fontWeight: 600 }}>
                    <CheckCheck size={13} /> Mark all read
                  </button>
                )}
              </div>

              <div style={{ overflowY: "auto", flex: 1 }}>
                {notifs.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#9CA3AF", padding: "1.5rem 1rem", textAlign: "center" }}>No notifications yet</p>
                ) : notifs.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10, width: "100%",
                      padding: "0.75rem 1rem", border: "none", cursor: "pointer", textAlign: "left",
                      background: n.is_read ? "#fff" : "#F0FDFA",
                      borderBottom: "1px solid #F9FAFB",
                      transition: "background 150ms",
                    }}
                  >
                    <span style={{ fontSize: 16, lineHeight: 1, marginTop: 1 }}>{TYPE_ICON[n.type] || "🔔"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.4, margin: 0, fontWeight: n.is_read ? 400 : 600 }}>
                        {n.message}
                      </p>
                      <p style={{ fontSize: 11, color: "#9CA3AF", margin: "3px 0 0" }}>
                        {new Date(n.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span style={{ width: 8, height: 8, borderRadius: 4, background: "#EA580C", marginTop: 5, flexShrink: 0 }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button onClick={handleLogout} style={{
          display: "flex", alignItems: "center", gap: 10,
          margin: "0 1rem", padding: "0.6rem 0.75rem",
          background: "transparent", border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 8, color: "#99F6E4", cursor: "pointer",
          fontSize: 14, transition: "all 150ms ease",
        }}>
          <LogOut size={16} /> Sign out
        </button>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 220, flex: 1, padding: "2rem", background: "#F0FDFA", minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
