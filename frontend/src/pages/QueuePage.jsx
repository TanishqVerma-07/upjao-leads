import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { addWSListener } from "../ws";
import TicketCard from "../components/TicketCard";
import PriorityBadge from "../components/PriorityBadge";
import { Inbox } from "lucide-react";

export default function QueuePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const endpoint = user?.role === "sales" ? "/queues/sales" : "/queues/product";

  async function fetchQueue() {
    setLoading(true);
    try { setTickets(await apiFetch(endpoint)); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchQueue(); }, [user?.role]);

  useEffect(() => {
    return addWSListener((event) => {
      if (event.type === "queue_update") fetchQueue();
    });
  }, []);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
        <Inbox size={20} color="#0D9488" />
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#134E4A" }}>
          {user?.role === "sales" ? "Sales Queue" : "Product Queue"}
        </h1>
        <span style={{ fontSize: 13, color: "#6B7280", marginLeft: 4 }}>
          {tickets.length} open ticket{tickets.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <p style={{ color: "#6B7280" }}>Loading…</p>
      ) : tickets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6B7280" }}>
          <Inbox size={36} color="#D1FAE5" style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: 16, fontWeight: 600 }}>Queue is clear</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>No open tickets assigned to your team.</p>
        </div>
      ) : (
        <div>
          {tickets.map(ticket => (
            <div key={ticket.id} style={{ marginBottom: 8 }}>
              {/* Lead context header */}
              <div
                onClick={() => navigate(`/leads/${ticket.lead_id}`)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", cursor: "pointer" }}
              >
                <PriorityBadge priority={ticket.lead_priority} />
                <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{ticket.lead_client}</span>
              </div>
              <TicketCard ticket={ticket} onRefresh={fetchQueue} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
