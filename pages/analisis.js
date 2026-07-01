/**
 * /analisis — Dashboard de Análisis Operacional
 * Integra datos de BigQuery (entregas) + Google Sheets (programación)
 * para identificar causas de demora y brechas de disponibilidad.
 */

import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import NavBar from "../components/NavBar";
import RechazosTab from "../components/RechazosTab";

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtDate = (d) => (d instanceof Date ? d.toISOString().split("T")[0] : d);

function defaultRange() {
  const today = new Date();
  const hasta = fmtDate(today);
  const d14 = new Date(today);
  d14.setDate(d14.getDate() - 14);
  const desde = fmtDate(d14);
  return { desde, hasta };
}

function pct(num, den) {
  if (!den || den === 0) return 0;
  return Math.round((num / den) * 100);
}

function fmt1(n) {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toFixed(1);
}

// ─── Estilos base ────────────────────────────────────────────────────────────
const BG     = "#0f172a";
const CARD   = "#1e293b";
const BORDER = "#334155";
const TEXT   = "#f1f5f9";
const MUTED  = "#94a3b8";
const BLUE   = "#3b82f6";
const GREEN  = "#22c55e";
const RED    = "#ef4444";
const YELLOW = "#eab308";
const ORANGE = "#f97316";
const VIOLET = "#a78bfa";

const card = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: "1.25rem 1.5rem",
};

// ─── Bar (CSS) ───────────────────────────────────────────────────────────────
function Bar({ pct: p, color = BLUE, height = 8 }) {
  return (
    <div style={{ background: "#334155", borderRadius: 99, overflow: "hidden", height }}>
      <div style={{ width: `${Math.min(100, Math.max(0, p))}%`, height, background: color, borderRadius: 99, transition: "width 0.4s" }} />
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = TEXT }) {
  return (
    <div style={{ ...card, flex: 1 }}>
      <div style={{ color: MUTED, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: "1.9rem", fontWeight: 700, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: MUTED, fontSize: "0.72rem", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ─── Causa Card ──────────────────────────────────────────────────────────────
function CausaCard({ icon, label, count, pctVal, totalFuera, color }) {
  return (
    <div style={{ ...card, flex: 1, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>{icon}</div>
      <div style={{ color: TEXT, fontWeight: 600, fontSize: "0.85rem", marginBottom: 2 }}>{label}</div>
      <div style={{ color, fontWeight: 700, fontSize: "1.7rem", lineHeight: 1 }}>{pctVal}%</div>
      <div style={{ color: MUTED, fontSize: "0.7rem", marginTop: 3 }}>
        {count} de {totalFuera} tardíos
      </div>
      <div style={{ marginTop: 10 }}>
        <Bar pct={pctVal} color={color} />
      </div>
    </div>
  );
}

// ─── Etapa Row ───────────────────────────────────────────────────────────────
function EtapaRow({ label, avg, benchmark, color }) {
  const over = avg > benchmark;
  const maxBar = Math.max(avg, benchmark) * 1.2;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: TEXT, fontSize: "0.82rem" }}>{label}</span>
        <span style={{ color: over ? RED : GREEN, fontWeight: 700, fontSize: "0.82rem" }}>
          {fmt1(avg)} min
          <span style={{ color: MUTED, fontWeight: 400, marginLeft: 6 }}>
            (objetivo ≤{benchmark})
          </span>
        </span>
      </div>
      <div style={{ position: "relative", height: 10 }}>
        <div style={{ background: "#334155", borderRadius: 99, height: 10, overflow: "visible" }}>
          <div style={{
            width: `${Math.min(100, (avg / maxBar) * 100)}%`,
            height: 10,
            background: over ? RED : GREEN,
            borderRadius: 99,
            position: "relative",
          }} />
        </div>
        {/* Benchmark line */}
        <div style={{
          position: "absolute",
          top: -2,
          left: `${Math.min(100, (benchmark / maxBar) * 100)}%`,
          width: 2,
          height: 14,
          background: YELLOW,
          borderRadius: 2,
        }} />
      </div>
    </div>
  );
}

// ─── Semana selector ─────────────────────────────────────────────────────────
const ALL_SEMANAS = [21, 22, 23, 24];

export default function Analisis() {
  const [range, setRange]       = useState(defaultRange);
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [selSemanas, setSelSemanas] = useState([23, 24]);
  const [showConductores, setShowConductores] = useState(false);
  const [activeTab, setActiveTab] = useState("analisis"); // "analisis" | "rechazos"

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const load = useCallback(async (r) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/Analisis?desde=${r.desde}&hasta=${r.hasta}`);
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(range); }, []); // eslint-disable-line

  // ─── Quick date buttons ───────────────────────────────────────────────────
  const quick = (days) => {
    const today = new Date();
    const hasta = fmtDate(today);
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    const desde = fmtDate(d);
    const r = { desde, hasta };
    setRange(r);
    load(r);
  };

  function toggleSem(s) {
    setSelSemanas((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  // ─── Derived ─────────────────────────────────────────────────────────────
  const kpis        = data?.kpis        ?? {};
  const porPoligono = data?.porPoligono ?? [];
  const porHora     = data?.porHora     ?? [];
  const conductores = data?.conductores ?? [];
  const brecha      = data?.brecha      ?? [];
  const rechazos    = data?.rechazos    ?? [];

  const totalFuera   = Number(kpis.fuera_obj)      || 0;
  const totalPedidos = Number(kpis.total_pedidos)   || 0;
  const cumplPct     = pct(Number(kpis.dentro_obj), totalPedidos);
  const avgMin       = Number(kpis.avg_min_entrega) || 0;

  // Causas de demora (sobre pedidos fuera de objetivo)
  const cTienda  = Number(kpis.causa_tienda)      || 0;
  const cAsig    = Number(kpis.causa_asignacion)   || 0;
  const cViaje   = Number(kpis.causa_viaje)        || 0;
  const cReparto = Number(kpis.causa_reparto)      || 0;

  // Brecha filtrada por semanas seleccionadas
  const brechaFilt = brecha.filter((r) => {
    const numS = parseInt(r.semana.replace(/[^\d]/g, ""), 10);
    return selSemanas.includes(numS);
  });

  // Agregar brecha por polígono (suma de semanas seleccionadas)
  const brechaByPol = {};
  for (const r of brechaFilt) {
    if (!brechaByPol[r.poligono]) brechaByPol[r.poligono] = { prog: 0, asist: 0 };
    brechaByPol[r.poligono].prog  += r.programados;
    brechaByPol[r.poligono].asist += r.asistentes;
  }
  const brechaRows = Object.entries(brechaByPol)
    .map(([pol, v]) => ({ poligono: pol, programados: v.prog, asistentes: v.asist, ausentismo: pct(v.prog - v.asist, v.prog) }))
    .sort((a, b) => b.ausentismo - a.ausentismo);

  // Hora: rellenar gaps 0-23
  const horaMap = {};
  for (const r of porHora) horaMap[Number(r.hora)] = r;
  const horaFull = Array.from({ length: 24 }, (_, i) => horaMap[i] ?? { hora: i, total: 0, dentro_obj: 0, avg_min: null });
  const maxHoraPedidos = Math.max(...horaFull.map((r) => Number(r.total)), 1);

  // Conductores
  const condTop    = conductores.slice(0, 20);
  const maxCondTotal = Math.max(...condTop.map((r) => Number(r.total)), 1);

  // Etapas
  const etapas = [
    { label: "🏪 Preparación en tienda",    avg: Number(kpis.avg_prep)         || 0, benchmark: 25 },
    { label: "🔄 Asignación de driver",      avg: Number(kpis.avg_asignacion)   || 0, benchmark: 5  },
    { label: "🛣️ Viaje al local",             avg: Number(kpis.avg_viaje)        || 0, benchmark: 10 },
    { label: "📦 Reparto a cliente",          avg: Number(kpis.avg_reparto)      || 0, benchmark: 12 },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Head><title>Análisis Operacional — Logística</title></Head>
      <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Inter', system-ui, sans-serif" }}>
        <NavBar />

        <div style={{ maxWidth: 1300, margin: "0 auto", padding: "1.5rem 1.5rem 3rem" }}>

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700 }}>📈 Análisis Operacional</h1>
              <p style={{ margin: "4px 0 0", color: MUTED, fontSize: "0.8rem" }}>
                Diagnóstico de demoras y brecha de disponibilidad de drivers
              </p>
            </div>

            {/* Filtro de fechas */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {[7, 14, 30].map((d) => (
                <button key={d} onClick={() => quick(d)} style={{
                  padding: "4px 12px", borderRadius: 6, border: `1px solid ${BORDER}`,
                  background: "transparent", color: MUTED, fontSize: "0.75rem", cursor: "pointer",
                }}>
                  {d}d
                </button>
              ))}
              <input
                type="date" value={range.desde}
                onChange={(e) => setRange((r) => ({ ...r, desde: e.target.value }))}
                style={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 6, padding: "4px 8px", fontSize: "0.78rem" }}
              />
              <span style={{ color: MUTED, fontSize: "0.78rem" }}>→</span>
              <input
                type="date" value={range.hasta}
                onChange={(e) => setRange((r) => ({ ...r, hasta: e.target.value }))}
                style={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 6, padding: "4px 8px", fontSize: "0.78rem" }}
              />
              <button
                onClick={() => load(range)}
                style={{ padding: "4px 14px", borderRadius: 6, border: "none", background: BLUE, color: "#fff", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600 }}
              >
                Aplicar
              </button>
            </div>
          </div>

          {/* ── Tab switcher ──────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 4, marginBottom: "1.25rem", borderBottom: `1px solid ${BORDER}`, paddingBottom: "0" }}>
            {[
              { key: "analisis", label: "📈 Análisis Operacional" },
              { key: "rechazos", label: `🚫 Rechazos Detectados${rechazos.length ? ` (${rechazos.length})` : ""}` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: "7px 18px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                  border: "none", borderBottom: activeTab === key ? `2px solid ${BLUE}` : "2px solid transparent",
                  background: "transparent",
                  color: activeTab === key ? TEXT : MUTED,
                  marginBottom: "-1px",
                  transition: "color 0.2s",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background: "#450a0a", border: `1px solid ${RED}`, borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.8rem", color: "#fca5a5" }}>
              Error: {error}
            </div>
          )}

          {loading && (
            <div style={{ textAlign: "center", padding: "3rem", color: MUTED }}>
              Cargando datos…
            </div>
          )}

          {/* ── Rechazos tab ──────────────────────────────────────────── */}
          {!loading && activeTab === "rechazos" && (
            <div style={{ ...card }}>
              <RechazosTab rechazos={rechazos} />
            </div>
          )}

          {!loading && data && activeTab === "analisis" && (
            <>
              {/* ── 1. KPI Cards ─────────────────────────────────────────── */}
              <div style={{ display: "flex", gap: 12, marginBottom: "1.25rem", flexWrap: "wrap" }}>
                <KpiCard label="Total pedidos" value={totalPedidos.toLocaleString()} sub={`${range.desde} → ${range.hasta}`} />
                <KpiCard
                  label="Cumplimiento ≤45 min"
                  value={`${cumplPct}%`}
                  sub={`${Number(kpis.dentro_obj) || 0} dentro / ${totalFuera} tardíos`}
                  color={cumplPct >= 60 ? GREEN : cumplPct >= 40 ? YELLOW : RED}
                />
                <KpiCard
                  label="Tiempo promedio entrega"
                  value={`${fmt1(avgMin)} min`}
                  sub="pedidos con entrega registrada"
                  color={avgMin <= 45 ? GREEN : avgMin <= 60 ? YELLOW : RED}
                />
                <KpiCard label="Drivers activos" value={Number(kpis.drivers_activos) || "—"} sub="conductores únicos con entregas" />
                <KpiCard label="Proveedores" value={Number(kpis.proveedores) || "—"} sub="Flota + Yango" />
              </div>

              {/* ── 2. Árbol de causas ──────────────────────────────────── */}
              <div style={{ ...card, marginBottom: "1.25rem" }}>
                <h2 style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 700 }}>
                  🔍 ¿Por qué llegan tarde?
                </h2>
                <p style={{ margin: "0 0 1rem", color: MUTED, fontSize: "0.78rem" }}>
                  {totalFuera} pedidos fuera de objetivo — un pedido puede tener más de una causa
                </p>

                {totalFuera === 0 ? (
                  <div style={{ color: GREEN, padding: "1rem 0" }}>✅ Sin pedidos tardíos en el período</div>
                ) : (
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <CausaCard icon="🏪" label="Tienda (prep >25 min)"     count={cTienda}  pctVal={pct(cTienda, totalFuera)}  totalFuera={totalFuera} color={RED}    />
                    <CausaCard icon="🔄" label="Asignación (>5 min)"       count={cAsig}    pctVal={pct(cAsig, totalFuera)}    totalFuera={totalFuera} color={ORANGE} />
                    <CausaCard icon="🛣️" label="Viaje al local (>10 min)"  count={cViaje}   pctVal={pct(cViaje, totalFuera)}   totalFuera={totalFuera} color={YELLOW} />
                    <CausaCard icon="📦" label="Reparto (>12 min)"          count={cReparto} pctVal={pct(cReparto, totalFuera)} totalFuera={totalFuera} color={VIOLET} />
                  </div>
                )}
              </div>

              {/* ── 3. Etapas + Horas ───────────────────────────────────── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.25rem" }}>

                {/* Tiempos por etapa */}
                <div style={{ ...card }}>
                  <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>⏱️ Tiempos promedio por etapa</h2>
                  {etapas.map((e) => (
                    <EtapaRow key={e.label} {...e} />
                  ))}
                  <div style={{ marginTop: 8, fontSize: "0.7rem", color: MUTED }}>
                    <span style={{ color: YELLOW }}>│</span> Objetivo &nbsp;
                    <span style={{ color: GREEN }}>■</span> Dentro &nbsp;
                    <span style={{ color: RED }}>■</span> Excede
                  </div>
                </div>

                {/* Distribución por hora */}
                <div style={{ ...card }}>
                  <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>🕐 Pedidos por hora del día</h2>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 120 }}>
                    {horaFull.map((r) => {
                      const tot = Number(r.total);
                      const barH = tot === 0 ? 0 : Math.max(4, Math.round((tot / maxHoraPedidos) * 110));
                      const p45  = tot === 0 ? 0 : pct(Number(r.dentro_obj), tot);
                      const col  = p45 >= 60 ? GREEN : p45 >= 40 ? YELLOW : tot === 0 ? BORDER : RED;
                      return (
                        <div key={r.hora} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <div
                            title={`${r.hora}h: ${tot} pedidos, ${p45}% ≤45 min`}
                            style={{ width: "100%", height: barH, background: col, borderRadius: "3px 3px 0 0", minHeight: tot > 0 ? 4 : 0, cursor: "default" }}
                          />
                          {r.hora % 3 === 0 && (
                            <span style={{ fontSize: "0.55rem", color: MUTED }}>{r.hora}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 8, fontSize: "0.7rem", color: MUTED }}>
                    Color = % cumplimiento ≤45 min &nbsp;
                    <span style={{ color: GREEN }}>■</span> ≥60% &nbsp;
                    <span style={{ color: YELLOW }}>■</span> 40-60% &nbsp;
                    <span style={{ color: RED }}>■</span> &lt;40%
                  </div>
                </div>
              </div>

              {/* ── 4. Por Polígono ─────────────────────────────────────── */}
              {porPoligono.length > 0 && (
                <div style={{ ...card, marginBottom: "1.25rem" }}>
                  <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>🗺️ Rendimiento por Polígono</h2>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                          {["Polígono","Pedidos","≤45 min","% OK","Avg min","Drivers","Causa Tienda","Causa Asig.","Causa Viaje","Causa Reparto"].map((h) => (
                            <th key={h} style={{ padding: "6px 10px", textAlign: h === "Polígono" ? "left" : "right", color: MUTED, fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {porPoligono.map((r, i) => {
                          const p45 = pct(Number(r.dentro_obj), Number(r.total));
                          const color45 = p45 >= 60 ? GREEN : p45 >= 40 ? YELLOW : RED;
                          return (
                            <tr key={r.poligono ?? i} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                              <td style={{ padding: "7px 10px", color: TEXT }}>{r.poligono ?? "—"}</td>
                              <td style={{ padding: "7px 10px", textAlign: "right", color: MUTED }}>{Number(r.total).toLocaleString()}</td>
                              <td style={{ padding: "7px 10px", textAlign: "right", color: GREEN }}>{Number(r.dentro_obj).toLocaleString()}</td>
                              <td style={{ padding: "7px 10px", textAlign: "right" }}>
                                <span style={{ color: color45, fontWeight: 700 }}>{p45}%</span>
                              </td>
                              <td style={{ padding: "7px 10px", textAlign: "right", color: Number(r.avg_min) > 45 ? RED : GREEN }}>
                                {fmt1(r.avg_min)}
                              </td>
                              <td style={{ padding: "7px 10px", textAlign: "right", color: MUTED }}>{Number(r.drivers_activos)}</td>
                              <td style={{ padding: "7px 10px", textAlign: "right", color: RED }}>{pct(Number(r.causa_tienda), Number(r.fuera_obj))}%</td>
                              <td style={{ padding: "7px 10px", textAlign: "right", color: ORANGE }}>{pct(Number(r.causa_asignacion), Number(r.fuera_obj))}%</td>
                              <td style={{ padding: "7px 10px", textAlign: "right", color: YELLOW }}>{pct(Number(r.causa_viaje), Number(r.fuera_obj))}%</td>
                              <td style={{ padding: "7px 10px", textAlign: "right", color: VIOLET }}>{pct(Number(r.causa_reparto), Number(r.fuera_obj))}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {data?.errors?.find((e) => e.source === "poligono") && (
                    <p style={{ color: YELLOW, fontSize: "0.72rem", marginTop: 8 }}>
                      ⚠️ No se pudo cargar datos por polígono: {data.errors.find((e) => e.source === "poligono").msg}
                    </p>
                  )}
                </div>
              )}

              {/* ── 5. Brecha de Turnos ─────────────────────────────────── */}
              <div style={{ ...card, marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: 8 }}>
                  <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>👥 Brecha de Turnos — Programados vs Asistentes</h2>
                  <div style={{ display: "flex", gap: 6 }}>
                    {ALL_SEMANAS.map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleSem(s)}
                        style={{
                          padding: "3px 12px", borderRadius: 6, fontSize: "0.72rem",
                          border: `1px solid ${selSemanas.includes(s) ? BLUE : BORDER}`,
                          background: selSemanas.includes(s) ? "rgba(59,130,246,0.2)" : "transparent",
                          color: selSemanas.includes(s) ? "#93c5fd" : MUTED,
                          cursor: "pointer",
                        }}
                      >
                        S{s}
                      </button>
                    ))}
                  </div>
                </div>

                {brechaRows.length === 0 ? (
                  <p style={{ color: MUTED, fontSize: "0.8rem" }}>Sin datos de programación para las semanas seleccionadas.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                          {["Polígono","Programados","Asistentes","Ausentes","Ausentismo","Cobertura"].map((h) => (
                            <th key={h} style={{ padding: "6px 10px", textAlign: h === "Polígono" ? "left" : "right", color: MUTED, fontWeight: 500 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {brechaRows.map((r, i) => {
                          const ausentes = r.programados - r.asistentes;
                          const cob = pct(r.asistentes, r.programados);
                          const colAus = r.ausentismo >= 20 ? RED : r.ausentismo >= 10 ? YELLOW : GREEN;
                          return (
                            <tr key={r.poligono} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                              <td style={{ padding: "7px 10px", color: TEXT }}>{r.poligono}</td>
                              <td style={{ padding: "7px 10px", textAlign: "right", color: MUTED }}>{r.programados}</td>
                              <td style={{ padding: "7px 10px", textAlign: "right", color: GREEN }}>{r.asistentes}</td>
                              <td style={{ padding: "7px 10px", textAlign: "right", color: ausentes > 0 ? RED : MUTED }}>{ausentes}</td>
                              <td style={{ padding: "7px 10px", textAlign: "right" }}>
                                <span style={{ color: colAus, fontWeight: 700 }}>{r.ausentismo}%</span>
                              </td>
                              <td style={{ padding: "7px 10px", width: 140 }}>
                                <Bar pct={cob} color={cob >= 90 ? GREEN : cob >= 80 ? YELLOW : RED} height={7} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── 6. Conductores ──────────────────────────────────────── */}
              {conductores.length > 0 && (
                <div style={{ ...card, marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>🚀 Performance por Conductor</h2>
                    <button
                      onClick={() => setShowConductores((v) => !v)}
                      style={{ fontSize: "0.72rem", color: MUTED, background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}
                    >
                      {showConductores ? "Mostrar menos" : "Ver todos"}
                    </button>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                          {["#","Conductor","Pedidos","% ≤Obj","Avg min","Actividad"].map((h) => (
                            <th key={h} style={{ padding: "6px 10px", textAlign: h === "Conductor" ? "left" : "right", color: MUTED, fontWeight: 500 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(showConductores ? condTop : condTop.slice(0, 10)).map((r, i) => {
                          const pctOk = Number(r.pct_ok) || 0;
                          const colOk = pctOk >= 60 ? GREEN : pctOk >= 40 ? YELLOW : RED;
                          const tot   = Number(r.total);
                          return (
                            <tr key={r.nombre_conductor} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                              <td style={{ padding: "7px 10px", textAlign: "right", color: MUTED }}>{i + 1}</td>
                              <td style={{ padding: "7px 10px", color: TEXT }}>{r.nombre_conductor}</td>
                              <td style={{ padding: "7px 10px", textAlign: "right", color: MUTED }}>{tot}</td>
                              <td style={{ padding: "7px 10px", textAlign: "right" }}>
                                <span style={{ color: colOk, fontWeight: 700 }}>{pctOk}%</span>
                              </td>
                              <td style={{ padding: "7px 10px", textAlign: "right", color: Number(r.avg_min) > 45 ? RED : GREEN }}>
                                {fmt1(r.avg_min)}
                              </td>
                              <td style={{ padding: "7px 10px", width: 120 }}>
                                <Bar pct={(tot / maxCondTotal) * 100} color={BLUE} height={6} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── 7. Proveedor split ──────────────────────────────────── */}
              {data?.proveedor?.length > 0 && (
                <div style={{ ...card }}>
                  <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>🏢 Cumplimiento por Proveedor</h2>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {data.proveedor.map((r) => {
                      const p45 = pct(Number(r.dentro_obj), Number(r.total));
                      return (
                        <div key={`${r.proveedor}-${r.tipo_orden}`} style={{
                          background: BG, border: `1px solid ${BORDER}`, borderRadius: 8,
                          padding: "0.75rem 1rem", minWidth: 180,
                        }}>
                          <div style={{ color: MUTED, fontSize: "0.7rem", marginBottom: 4 }}>
                            {r.proveedor} · {r.tipo_orden ?? "—"}
                          </div>
                          <div style={{ color: p45 >= 60 ? GREEN : p45 >= 40 ? YELLOW : RED, fontSize: "1.5rem", fontWeight: 700 }}>
                            {p45}%
                          </div>
                          <div style={{ color: MUTED, fontSize: "0.68rem", marginTop: 2 }}>
                            {Number(r.total).toLocaleString()} pedidos · avg {fmt1(r.avg_min)} min
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Errores de carga parcial */}
              {data?.errors?.length > 0 && (
                <div style={{ marginTop: "1rem", fontSize: "0.72rem", color: MUTED }}>
                  ⚠️ Algunos datos no se cargaron correctamente:{" "}
                  {data.errors.map((e) => e.source).join(", ")}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
