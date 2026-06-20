const COLORS = {
  new:     { bg: "#F3F4F6", color: "#374151" },
  active:  { bg: "#D1FAE5", color: "#065F46" },
  idle:    { bg: "#FEF3C7", color: "#92400E" },
  won:     { bg: "#DCFCE7", color: "#166534" },
  lost:    { bg: "#FEE2E2", color: "#991B1B" },
  dropped: { bg: "#E5E7EB", color: "#6B7280" },
};

export default function StatusBadge({ status }) {
  const c = COLORS[status] || COLORS.new;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20,
      background: c.bg, color: c.color, textTransform: "capitalize",
    }}>
      {status}
    </span>
  );
}
