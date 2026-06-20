const COLORS = {
  P1: { bg: "#FEE2E2", color: "#991B1B" },
  P2: { bg: "#FEF3C7", color: "#92400E" },
  P3: { bg: "#DBEAFE", color: "#1E40AF" },
  P4: { bg: "#F3F4F6", color: "#374151" },
};

export default function PriorityBadge({ priority }) {
  const c = COLORS[priority] || COLORS.P4;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      background: c.bg, color: c.color, letterSpacing: "0.04em",
    }}>
      {priority}
    </span>
  );
}
