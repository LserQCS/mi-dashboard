export default function KPICard({ label, value, sub, color = "" }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${color}`}>{value ?? "—"}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
