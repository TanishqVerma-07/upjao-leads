import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#134E4A", margin: 0 }}>Leads</h1>
      <p style={{ color: "#6B7280", marginTop: 6 }}>
        Welcome back, {user?.name}. Leads list coming in Part 3.
      </p>
    </div>
  );
}
