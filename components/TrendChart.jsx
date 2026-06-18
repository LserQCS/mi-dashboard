import { useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

function agruparSemana(rows) {
  const map = {};
  rows.forEach((r) => {
    const d = new Date(r.fecha);
    // Lunes de esa semana
    const day = d.getDay() || 7;
    const lunes = new Date(d); lunes.setDate(d.getDate() - day + 1);
    const key = lunes.toISOString().slice(0, 10);
    if (!map[key]) map[key] = { fecha: key, total: 0, dentro_obj: 0, fuera_obj: 0, sum_min: 0, n: 0 };
    map[key].total      += r.total;
    map[key].dentro_obj += r.dentro_obj;
    map[key].fuera_obj  += r.fuera_obj;
    map[key].sum_min    += (r.avg_min || 0) * r.total;
    map[key].n          += r.total;
  });
  return Object.values(map).map((w) => ({
    ...w,
    avg_min: w.n > 0 ? (w.sum_min / w.n).toFixed(1) : 0,
  })).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function fmt(fecha, gran) {
  if (!fecha) return "";
  const [y, m, d] = fecha.split("-");
  return gran === "semana" ? `Sem ${d}/${m}` : `${d}/${m}`;
}

export default function TrendChart({ data = [] }) {
  const [gran, setGran] = useState("dia");
  if (!data.length) return <div className="empty">Sin datos de tendencia</div>;

  const rows = gran === "semana" ? agruparSemana(data) : data;
  const formatted = rows.map((r) => ({
    ...r,
    name: fmt(r.fecha, gran),
    pct:  r.total > 0 ? +((r.dentro_obj / r.total) * 100).toFixed(1) : 0,
  }));

  const tabStyle = (g) => ({
    padding: "4px 12px", borderRadius: 6, border: "1px solid var(--border)",
    cursor: "pointer", fontSize: 12, fontWeight: 600,
    background: gran === g ? "var(--accent)" : "var(--surface)",
    color: gran === g ? "#fff" : "var(--muted)",
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 12 }}>
        <button style={tabStyle("dia")}    onClick={() => setGran("dia")}>Diario</button>
        <button style={tabStyle("semana")} onClick={() => setGran("semana")}>Semanal</button>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={formatted} margin={{ top: 4, right: 20, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
          <XAxis dataKey="name" tick={{ fill: "#8892a4", fontSize: 11 }} angle={-40} textAnchor="end" interval={0} />
          <YAxis yAxisId="vol" tick={{ fill: "#8892a4", fontSize: 11 }} />
          <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: "#8892a4", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 8 }}
            labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
            formatter={(v, name) => {
              if (name === "pct") return [`${v}%`, "% Cumplimiento"];
              if (name === "dentro_obj") return [v, "Dentro objetivo"];
              if (name === "fuera_obj")  return [v, "Fuera objetivo"];
              return [v, name];
            }}
          />
          <Legend wrapperStyle={{ color: "#8892a4", fontSize: 12 }}
            formatter={(v) => v === "pct" ? "% Cumplimiento" : v === "dentro_obj" ? "Dentro obj." : "Fuera obj."} />
          <Bar yAxisId="vol" dataKey="dentro_obj" stackId="a" fill="#22c55e" />
          <Bar yAxisId="vol" dataKey="fuera_obj"  stackId="a" fill="#ef4444" radius={[3,3,0,0]} />
          <Line yAxisId="pct" type="monotone" dataKey="pct" stroke="#4f8ef7" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
