import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

// ── Helpers ────────────────────────────────────────────────────────────────────
function parseHoras(h) {
  if (!h) return 0;
  const n = parseFloat(String(h).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function fmtFecha(fecha) {
  if (!fecha) return "";
  // Soporta DD/MM/YYYY y YYYY-MM-DD
  if (fecha.includes("/")) {
    const [d, m] = fecha.split("/");
    return `${d}/${m}`;
  }
  const [, m, d] = fecha.split("-");
  return `${d}/${m}`;
}

function toISO(fecha) {
  if (!fecha) return "";
  if (fecha.includes("/")) {
    const [d, m, y] = fecha.split("/");
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  return fecha.slice(0, 10);
}

// ── Agrega tareo por fecha ─────────────────────────────────────────────────────
function agruparPorFecha(rows) {
  const map = {};
  rows.forEach((r) => {
    const key = toISO(r.fecha);
    if (!key) return;
    if (!map[key]) map[key] = { fecha: key, drivers: new Set(), horas: 0, activos: 0, total: 0 };
    const id = r.dni || r.nombre;
    if (id) map[key].drivers.add(id);
    map[key].horas  += parseHoras(r.horas);
    map[key].total  += 1;
    const sl = (r.status || "").toLowerCase();
    if (sl.includes("activ") || sl === "a") map[key].activos += 1;
  });
  return Object.values(map)
    .map((d) => ({ ...d, drivers: d.drivers.size }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// ── Agrega por campo (tipo / status) ──────────────────────────────────────────
function agruparPorCampo(rows, campo) {
  const map = {};
  rows.forEach((r) => {
    const key = r[campo] || "Sin dato";
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

const COLORS = ["#4f8ef7","#22c55e","#f59e0b","#ef4444","#a855f7","#06b6d4","#f97316"];

// ── Componente principal ───────────────────────────────────────────────────────
export default function TareoAnalysis({ tareo, tendencia = [] }) {
  const food    = (tareo?.food    ?? []).filter((r) => r.nombre && r.nombre !== "—");
  const no_food = (tareo?.no_food ?? []).filter((r) => r.nombre && r.nombre !== "—");
  const allRows = [...food, ...no_food];

  if (!allRows.length) return <div className="empty">Sin datos de tareo en el período</div>;

  // ── Métricas globales (Opción B) ─────────────────────────────────────────
  const uniqueDrivers = new Set(allRows.map((r) => r.dni || r.nombre)).size;
  const totalHoras    = allRows.reduce((s, r) => s + parseHoras(r.horas), 0);
  const avgHoras      = uniqueDrivers > 0 ? (totalHoras / allRows.length).toFixed(1) : "—";
  const totalActivos  = allRows.filter((r) => { const sl=(r.status||"").toLowerCase(); return sl.includes("activ")||sl==="a"; }).length;
  const pctActivos    = allRows.length > 0 ? ((totalActivos / allRows.length) * 100).toFixed(0) : 0;

  // ── Por tipo y status ─────────────────────────────────────────────────────
  const porTipo   = agruparPorCampo(allRows, "tipo");
  const porStatus = agruparPorCampo(allRows, "status");

  // ── Cobertura por día (Opción A) ──────────────────────────────────────────
  const tareoByFecha = agruparPorFecha(allRows);

  // Mapa de tendencia BQ por fecha
  const bqMap = {};
  tendencia.forEach((t) => { if (t.fecha) bqMap[t.fecha] = t; });

  // Union de fechas de tareo y BQ
  const allFechas = new Set([
    ...tareoByFecha.map((d) => d.fecha),
    ...Object.keys(bqMap),
  ]);
  const coverage = Array.from(allFechas).sort().map((f) => ({
    name:       fmtFecha(f),
    fecha:      f,
    drivers:    tareoByFecha.find((d) => d.fecha === f)?.drivers ?? 0,
    horas_prog: +(tareoByFecha.find((d) => d.fecha === f)?.horas ?? 0).toFixed(1),
    pedidos:    bqMap[f]?.total ?? 0,
    pedidos_ok: bqMap[f]?.dentro_obj ?? 0,
  }));

  const labelStyle = { color: "var(--muted)", fontSize: 12, marginBottom: 6, fontWeight: 600 };
  const val = (v, sfx="") => (
    <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", lineHeight: 1.1 }}>
      {v}{sfx && <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 4 }}>{sfx}</span>}
    </div>
  );

  return (
    <div>
      {/* ── KPIs turno (Opción B) ─────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div className="kpi-card" style={{ flex: "1 1 130px" }}>
          <div className="kpi-label">Drivers únicos</div>
          {val(uniqueDrivers)}
          <div className="kpi-sub">{allRows.length} turnos registrados</div>
        </div>
        <div className="kpi-card" style={{ flex: "1 1 130px" }}>
          <div className="kpi-label">Total horas prog.</div>
          {val(totalHoras.toFixed(0), "h")}
          <div className="kpi-sub">Prom. {avgHoras} h / turno</div>
        </div>
        <div className="kpi-card" style={{ flex: "1 1 130px" }}>
          <div className="kpi-label">Turnos activos</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#22c55e", lineHeight: 1.1 }}>
            {pctActivos}%
          </div>
          <div className="kpi-sub">{totalActivos} de {allRows.length}</div>
        </div>

        {/* Distribución por tipo */}
        <div className="kpi-card" style={{ flex: "2 1 200px" }}>
          <div className="kpi-label">Distribución por tipo</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {porTipo.map((t, i) => {
              const pct = ((t.value / allRows.length) * 100).toFixed(0);
              return (
                <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], display: "inline-block" }} />
                  <span style={{ color: "var(--muted)" }}>{t.name}</span>
                  <span style={{ fontWeight: 700 }}>{t.value}</span>
                  <span style={{ color: "var(--muted)" }}>({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status */}
        <div className="kpi-card" style={{ flex: "2 1 200px" }}>
          <div className="kpi-label">Estado de turnos</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {porStatus.map((s, i) => {
              const sl  = s.name.toLowerCase();
              const col = sl.includes("activ") || sl === "a" ? "#22c55e"
                        : sl.includes("inactiv") || sl === "i" ? "#ef4444" : "#f59e0b";
              return (
                <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: col, display: "inline-block" }} />
                  <span style={{ color: "var(--muted)" }}>{s.name}</span>
                  <span style={{ fontWeight: 700 }}>{s.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Cobertura vs demanda (Opción A) ──────────────────────────────── */}
      <div style={labelStyle}>Cobertura de drivers vs volumen de pedidos — por día</div>
      {coverage.length === 0
        ? <div className="empty">Sin datos combinados</div>
        : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={coverage} margin={{ top: 4, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
              <XAxis dataKey="name" tick={{ fill: "#8892a4", fontSize: 11 }} angle={-40} textAnchor="end" interval={0} />
              <YAxis yAxisId="ped" tick={{ fill: "#8892a4", fontSize: 11 }} />
              <YAxis yAxisId="drv" orientation="right" tick={{ fill: "#8892a4", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 8 }}
                labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
                formatter={(v, name) => {
                  if (name === "pedidos")    return [v, "Pedidos totales"];
                  if (name === "pedidos_ok") return [v, "Pedidos OK"];
                  if (name === "drivers")    return [v, "Drivers programados"];
                  if (name === "horas_prog") return [`${v}h`, "Horas programadas"];
                  return [v, name];
                }}
              />
              <Legend wrapperStyle={{ color: "#8892a4", fontSize: 12 }}
                formatter={(v) =>
                  v === "pedidos"    ? "Pedidos totales"
                : v === "pedidos_ok" ? "Pedidos OK"
                : v === "drivers"    ? "Drivers programados"
                : v === "horas_prog" ? "Horas programadas" : v}
              />
              <Bar yAxisId="ped" dataKey="pedidos_ok" stackId="a" fill="#22c55e" />
              <Bar yAxisId="ped" dataKey="pedidos"    stackId="a" fill="#2a2d3a" radius={[3,3,0,0]} />
              <Line yAxisId="drv" type="monotone" dataKey="drivers"    stroke="#4f8ef7" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="drv" type="monotone" dataKey="horas_prog" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )
      }

      {/* ── Tabla Food por polígono ────────────────────────────────────────── */}
      {food.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={labelStyle}>Resumen por polígono — Food</div>
          <PoligonoTable rows={food} campo="poligono" />
        </div>
      )}
      {no_food.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={labelStyle}>Resumen por marca — No Food</div>
          <PoligonoTable rows={no_food} campo="marca" />
        </div>
      )}
    </div>
  );
}

// ── Tabla resumen por polígono / marca ─────────────────────────────────────────
function PoligonoTable({ rows, campo }) {
  const map = {};
  rows.forEach((r) => {
    const key = r[campo] || "Sin dato";
    if (!map[key]) map[key] = { nombre: key, drivers: new Set(), horas: 0, activos: 0, total: 0 };
    const id = r.dni || r.nombre;
    if (id) map[key].drivers.add(id);
    map[key].horas  += parseHoras(r.horas);
    map[key].total  += 1;
    const sl = (r.status || "").toLowerCase();
    if (sl.includes("activ") || sl === "a") map[key].activos += 1;
  });

  const filas = Object.values(map)
    .map((d) => ({ ...d, drivers: d.drivers.size }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{campo === "poligono" ? "Polígono" : "Marca"}</th>
            <th>Turnos</th>
            <th>Drivers únicos</th>
            <th>Horas prog.</th>
            <th>Prom. h/turno</th>
            <th>% Activos</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => {
            const pct = f.total > 0 ? ((f.activos / f.total) * 100).toFixed(0) : 0;
            return (
              <tr key={i}>
                <td>{f.nombre}</td>
                <td>{f.total}</td>
                <td>{f.drivers}</td>
                <td>{f.horas.toFixed(1)}h</td>
                <td>{f.total > 0 ? (f.horas / f.total).toFixed(1) : "—"}h</td>
                <td>
                  <span className={`badge ${pct >= 80 ? "badge-green" : pct >= 50 ? "badge-yellow" : "badge-red"}`}>
                    {pct}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
