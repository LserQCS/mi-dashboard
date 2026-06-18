import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

const GREEN  = "#22c55e";
const RED    = "#ef4444";

export default function CumplimientoChart({ data = [] }) {
  if (!data.length) return <div className="empty">Sin datos de polígono</div>;

  // Recortar nombres largos
  const formatted = data.map((d) => ({
    ...d,
    name: d.poligono?.length > 18 ? d.poligono.slice(0, 16) + "…" : d.poligono,
    pct_ok: d.total > 0 ? Math.round((d.dentro_45 / d.total) * 100) : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formatted} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
        <XAxis
          dataKey="name"
          tick={{ fill: "#8892a4", fontSize: 11 }}
          angle={-40}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fill: "#8892a4", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 8 }}
          labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
          itemStyle={{ color: "#e2e8f0" }}
          formatter={(v, name) => [v, name === "dentro_45" ? "≤ 45 min" : "> 45 min"]}
        />
        <Legend
          formatter={(v) => v === "dentro_45" ? "≤ 45 min" : "> 45 min"}
          wrapperStyle={{ color: "#8892a4", fontSize: 12 }}
        />
        <Bar dataKey="dentro_45" stackId="a" fill={GREEN} radius={[0, 0, 0, 0]} />
        <Bar dataKey="fuera_45"  stackId="a" fill={RED}   radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
