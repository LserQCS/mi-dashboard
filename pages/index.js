import { useState, useEffect, useCallback, useMemo } from "react";
import Head from "next/head";
import KPICard           from "../components/KPICard";
import CumplimientoChart from "../components/CumplimientoChart";
import TrendChart        from "../components/TrendChart";
import TareoAnalysis     from "../components/TareoAnalysis";
import AnalisisTab       from "../components/AnalisisTab";
import NavBar            from "../components/NavBar";

// ── Helpers de fecha ───────────────────────────────────────────────────────────
function peruDate(offsetDays = 0) {
  const d = new Date(Date.now() - 5 * 3600_000);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// Calcula el período anterior del mismo largo
function prevPeriod(desde, hasta) {
  const d1 = new Date(desde + "T00:00:00Z");
  const d2 = new Date(hasta + "T00:00:00Z");
  const diffMs = d2 - d1;
  const prevHasta = new Date(d1 - 24 * 3600_000);
  const prevDesde = new Date(prevHasta - diffMs);
  return {
    prevDesde: prevDesde.toISOString().slice(0, 10),
    prevHasta: prevHasta.toISOString().slice(0, 10),
  };
}

// Semana rápida: lunes de la semana actual
function lunesDeHoy() {
  const d = new Date(Date.now() - 5 * 3600_000);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

// ── Fetch hook ─────────────────────────────────────────────────────────────────
function useFetch(url) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(url);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Error del servidor");
      setData(json.data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [url]);
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

// ── Badge de variación ─────────────────────────────────────────────────────────
function VarBadge({ current, prev, invert = false, suffix = "" }) {
  if (current == null || prev == null || prev === 0) return null;
  const delta = current - prev;
  const pct   = ((delta / Math.abs(prev)) * 100).toFixed(1);
  const up    = delta > 0;
  const good  = invert ? !up : up;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, marginLeft: 6,
      color: good ? "#22c55e" : "#ef4444",
    }}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%{suffix}
    </span>
  );
}

// ── Barra de causa ─────────────────────────────────────────────────────────────
function CausaBar({ label, count, total, color }) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
        <span>{label}</span>
        <span style={{ color: "var(--muted)" }}>
          {count?.toLocaleString() ?? "—"} <span style={{ color }}>{pct}%</span>
        </span>
      </div>
      <div className="bar-wrap">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Tarjeta de etapa ───────────────────────────────────────────────────────────
function EtapaCard({ label, avg, umbral, avgPrev }) {
  const ok = avg != null && avg <= umbral;
  return (
    <div className="kpi-card" style={{ flex: "1 1 150px" }}>
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${ok ? "kpi-green" : "kpi-red"}`}>
        {avg ?? "—"} <span style={{ fontSize: 14, fontWeight: 400 }}>min</span>
        <VarBadge current={avg} prev={avgPrev} invert />
      </div>
      <div className="kpi-sub">Umbral: {umbral} min</div>
    </div>
  );
}

// ── Tabla proveedor ────────────────────────────────────────────────────────────
function ProveedorTable({ data = [] }) {
  if (!data.length) return <div className="empty">Sin datos</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Proveedor</th><th>Tipo</th><th>Total</th>
            <th>≤ objetivo</th><th>% OK</th><th>Prom. min</th><th>Prom. asig.</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const pct = row.total > 0 ? ((row.dentro_obj / row.total) * 100).toFixed(0) : 0;
            return (
              <tr key={i}>
                <td>{row.proveedor || "—"}</td>
                <td>{row.tipo_orden || <span style={{ color: "var(--muted)" }}>Simple</span>}</td>
                <td>{row.total}</td>
                <td>{row.dentro_obj}</td>
                <td>
                  <span className={`badge ${pct >= 80 ? "badge-green" : pct >= 60 ? "badge-yellow" : "badge-red"}`}>
                    {pct}%
                  </span>
                </td>
                <td>{row.avg_min ?? "—"}</td>
                <td>{row.avg_min_asignacion ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


// ── Dashboard ──────────────────────────────────────────────────────────────────
const QUICK_FILTERS = [
  { label: "Esta semana",      getRange: () => ({ desde: lunesDeHoy(),                             hasta: peruDate(0) }) },
  { label: "Sem. pasada",      getRange: () => ({ desde: (() => { const d = new Date(lunesDeHoy()+"T00:00:00Z"); d.setDate(d.getDate()-7); return d.toISOString().slice(0,10); })(),
                                                   hasta: (() => { const d = new Date(lunesDeHoy()+"T00:00:00Z"); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })() }) },
  { label: "Últimas 2 sem.",   getRange: () => ({ desde: peruDate(-13), hasta: peruDate(0) }) },
  { label: "Este mes",         getRange: () => ({ desde: (() => { const d = new Date(Date.now()-5*3600_000); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; })(), hasta: peruDate(0) }) },
];

const ALL_SEMANAS = [21, 22, 23, 24];

function Select({ label, value, options, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ color: "var(--muted)", fontSize: "0.72rem" }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ background: "#0a0f1e", border: "1px solid #1f2d45", color: "#f8fafc", borderRadius: 6, padding: "3px 8px", fontSize: "0.72rem", cursor: "pointer" }}>
        <option value="Todos">Todos</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function Dashboard() {
  const [desde,   setDesde]   = useState(peruDate(-13));
  const [hasta,   setHasta]   = useState(peruDate(0));
  const [applied, setApplied] = useState({ desde: peruDate(-13), hasta: peruDate(0) });

  // ── Tabs ────────────────────────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState("disponibilidad");

  // ── Filtros del tareo (GSheets) ─────────────────────────────────────────────
  const [selSemanas,  setSelSemanas]  = useState(ALL_SEMANAS);
  const [selFood,     setSelFood]     = useState("Todos");
  const [selPedidos,  setSelPedidos]  = useState("Todos");
  const [selPoligono, setSelPoligono] = useState("Todos");
  const [selMarca,    setSelMarca]    = useState("Todos");

  const { prevDesde, prevHasta } = prevPeriod(applied.desde, applied.hasta);
  const qs     = `desde=${applied.desde}&hasta=${applied.hasta}`;
  const qsPrev = `desde=${prevDesde}&hasta=${prevHasta}`;

  // Período actual
  const kpis      = useFetch(`/api/BigQueryLogistic?view=kpis&${qs}`);
  const tendencia = useFetch(`/api/BigQueryLogistic?view=tendencia&${qs}`);
  const proveedor = useFetch(`/api/BigQueryLogistic?view=proveedor&${qs}`);
  const tareo     = useFetch(`/api/ProgramacionFoodNoFood?${qs}`);

  // Período anterior (para variaciones)
  const kpisPrev  = useFetch(`/api/BigQueryLogistic?view=kpis&${qsPrev}`);

  const apply = () => setApplied({ desde, hasta });
  const reload = () => { kpis.reload(); tendencia.reload(); proveedor.reload(); tareo.reload(); kpisPrev.reload(); };

  // ── Filtros del tareo ────────────────────────────────────────────────────────
  const allRows = useMemo(() => {
    if (!tareo.data) return [];
    return [...(tareo.data.food || []), ...(tareo.data.no_food || [])];
  }, [tareo.data]);

  const allPoligonos = useMemo(() => [...new Set(allRows.map((r) => r.poligono).filter(Boolean))].sort(), [allRows]);
  const allMarcas    = useMemo(() => [...new Set(allRows.map((r) => r.origen || r.marca).filter(Boolean))].sort(), [allRows]);

  const hasPedidos = (r) => {
    const p = r.poligono || "";
    return p.startsWith("Pol") || p.startsWith("Tori") || p === "Flora y Fauna" || p === "Tottus";
  };

  const tareoFiltrado = useMemo(() => {
    if (!tareo.data) return null;
    const filter = (r) => {
      const semNum = parseInt(r.semana, 10);
      if (!isNaN(semNum) && !selSemanas.includes(semNum)) return false;
      if (selFood    !== "Todos" && r.categoria !== selFood) return false;
      if (selPedidos !== "Todos") {
        if (selPedidos === "Con Pedidos" && !hasPedidos(r)) return false;
        if (selPedidos === "Sin Pedidos" &&  hasPedidos(r)) return false;
      }
      if (selPoligono !== "Todos" && r.poligono !== selPoligono) return false;
      if (selMarca    !== "Todos") {
        const m = r.origen || r.marca || "";
        if (m !== selMarca) return false;
      }
      return true;
    };
    const food    = (tareo.data.food    || []).filter(filter);
    const no_food = (tareo.data.no_food || []).filter(filter);
    return { food, no_food, total: food.length + no_food.length };
  }, [tareo.data, selSemanas, selFood, selPedidos, selPoligono, selMarca]);

  const kd   = kpis.data    ?? {};
  const kp   = kpisPrev.data ?? {};
  const fuera = kd.fuera_obj ?? 0;

  const pctOk     = kd.total_pedidos > 0 ? (kd.dentro_obj / kd.total_pedidos) * 100 : null;
  const pctOkPrev = kp.total_pedidos > 0 ? (kp.dentro_obj / kp.total_pedidos) * 100 : null;

  const pctSimples     = kd.total_pedidos > 0 ? ((kd.total_simples / kd.total_pedidos) * 100).toFixed(1) : "—";
  const pctMulti       = kd.total_pedidos > 0 ? ((kd.total_multi   / kd.total_pedidos) * 100).toFixed(1) : "—";
  const simplesOkPct   = kd.total_simples > 0 ? ((kd.simples_ok    / kd.total_simples) * 100).toFixed(1) : "0.0";
  const multiOkPct     = kd.total_multi   > 0 ? ((kd.multi_ok      / kd.total_multi)   * 100).toFixed(1) : "0.0";

  const quickBtnStyle = (active) => ({
    padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border)",
    cursor: "pointer", fontSize: 12, fontWeight: 600,
    background: active ? "var(--accent)" : "var(--surface)",
    color: active ? "#fff" : "var(--muted)",
  });

  const [activeQuick, setActiveQuick] = useState(null);
  const applyQuick = (idx) => {
    const r = QUICK_FILTERS[idx].getRange();
    setDesde(r.desde); setHasta(r.hasta);
    setApplied(r);
    setActiveQuick(idx);
  };

  return (
    <>
      <Head>
        <title>Dashboard Drivers — Logística</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>
      <NavBar />
      <div className="page">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="page-header">
          <div>
            <div className="page-title">
              {mainTab === "disponibilidad" ? "📦 Disponibilidad Drivers" : "📈 Análisis Operacional"}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
              {applied.desde} → {applied.hasta} · BigQuery + Google Sheets
            </div>
            {/* Tab bar */}
            <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
              {[
                { key: "disponibilidad", label: "📦 Disponibilidad" },
                { key: "analisis",       label: "📈 Análisis"       },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setMainTab(key)} style={{
                  padding: "4px 14px", borderRadius: 6, fontSize: 12, fontWeight: mainTab === key ? 700 : 400,
                  border: `1px solid ${mainTab === key ? "var(--accent)" : "var(--border)"}`,
                  background: mainTab === key ? "var(--accent)" : "transparent",
                  color: mainTab === key ? "#fff" : "var(--muted)", cursor: "pointer",
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            {/* Filtros rápidos */}
            <div style={{ display: "flex", gap: 6 }}>
              {QUICK_FILTERS.map((f, i) => (
                <button key={i} style={quickBtnStyle(activeQuick === i)} onClick={() => applyQuick(i)}>
                  {f.label}
                </button>
              ))}
            </div>
            {/* Date pickers */}
            <div className="controls">
              <label style={{ color: "var(--muted)", fontSize: 12 }}>Desde:</label>
              <input type="date" value={desde} max={hasta} onChange={(e) => { setDesde(e.target.value); setActiveQuick(null); }} />
              <label style={{ color: "var(--muted)", fontSize: 12 }}>Hasta:</label>
              <input type="date" value={hasta} min={desde} max={peruDate(0)} onChange={(e) => { setHasta(e.target.value); setActiveQuick(null); }} />
              <button onClick={apply}>Aplicar</button>
              <button onClick={reload} style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>↻</button>
            </div>
          </div>
        </div>

        {/* ── Filtros del Tareo (solo en tab Disponibilidad) ─────────────────── */}
        {mainTab === "disponibilidad" && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ color: "var(--muted)", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>Filtros Tareo</span>
            <div style={{ width: 1, height: 16, background: "var(--border)" }} />
            {/* Semanas */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>Semana</span>
              {ALL_SEMANAS.map((s) => (
                <button key={s} onClick={() => setSelSemanas((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])}
                  style={{
                    padding: "3px 10px", borderRadius: 16, fontSize: "0.7rem",
                    border: `1px solid ${selSemanas.includes(s) ? "var(--accent)" : "var(--border)"}`,
                    background: selSemanas.includes(s) ? "rgba(59,130,246,0.18)" : "transparent",
                    color: selSemanas.includes(s) ? "#93c5fd" : "var(--muted)", cursor: "pointer",
                  }}>
                  S{s}
                </button>
              ))}
            </div>
            <div style={{ width: 1, height: 16, background: "var(--border)" }} />
            {/* Food/NoFood */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>Tipo</span>
              {["Todos", "Food", "No Food"].map((c) => (
                <button key={c} onClick={() => setSelFood(c)}
                  style={{
                    padding: "3px 10px", borderRadius: 16, fontSize: "0.7rem",
                    border: `1px solid ${selFood === c ? "var(--accent)" : "var(--border)"}`,
                    background: selFood === c ? "rgba(59,130,246,0.18)" : "transparent",
                    color: selFood === c ? "#93c5fd" : "var(--muted)", cursor: "pointer",
                  }}>
                  {c}
                </button>
              ))}
            </div>
            <div style={{ width: 1, height: 16, background: "var(--border)" }} />
            {/* Pedidos */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "var(--muted)", fontSize: "0.7rem" }}>Pedidos</span>
              {["Todos", "Con Pedidos", "Sin Pedidos"].map((c) => (
                <button key={c} onClick={() => setSelPedidos(c)}
                  style={{
                    padding: "3px 10px", borderRadius: 16, fontSize: "0.7rem",
                    border: `1px solid ${selPedidos === c ? "var(--accent)" : "var(--border)"}`,
                    background: selPedidos === c ? "rgba(59,130,246,0.18)" : "transparent",
                    color: selPedidos === c ? "#93c5fd" : "var(--muted)", cursor: "pointer",
                  }}>
                  {c}
                </button>
              ))}
            </div>
            <div style={{ width: 1, height: 16, background: "var(--border)" }} />
            {/* Selects */}
            <Select label="Polígono" value={selPoligono} options={allPoligonos} onChange={setSelPoligono} />
            <Select label="Marca/Origen" value={selMarca} options={allMarcas} onChange={setSelMarca} />
            <button
              onClick={() => { setSelSemanas(ALL_SEMANAS); setSelFood("Todos"); setSelPedidos("Todos"); setSelPoligono("Todos"); setSelMarca("Todos"); }}
              style={{ marginLeft: "auto", padding: "3px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", fontSize: "0.7rem", cursor: "pointer" }}>
              Limpiar
            </button>
          </div>
        )}

        {/* ── Tab Análisis ──────────────────────────────────────────────────── */}
        {mainTab === "analisis" && (
          <AnalisisTab desde={applied.desde} hasta={applied.hasta} />
        )}

        {/* ── Tab Disponibilidad ────────────────────────────────────────────── */}
        {mainTab === "disponibilidad" && <>

        {kpis.error && <div className="error-msg">⚠ BigQuery: {kpis.error}</div>}

        {/* ════════════════════════════════════════════════════════════════════
            BLOQUE 1 — TENDENCIA HISTÓRICA
        ════════════════════════════════════════════════════════════════════ */}
        <div style={{ margin: "0 0 8px", fontSize: 11, letterSpacing: 1, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>
          Bloque 1 · Tendencia histórica
        </div>
        <div className="section" style={{ marginBottom: 28 }}>
          <div className="section-title">Cumplimiento diario / semanal — período seleccionado</div>
          {tendencia.loading ? <div className="spinner" />
           : tendencia.error ? <div className="error-msg">⚠ {tendencia.error}</div>
           : <TrendChart data={tendencia.data ?? []} />}
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            BLOQUE 2 — ANÁLISIS DEL PERÍODO
        ════════════════════════════════════════════════════════════════════ */}
        <div style={{ margin: "0 0 8px", fontSize: 11, letterSpacing: 1, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>
          Bloque 2 · Análisis del período · vs anterior ({prevDesde} → {prevHasta})
        </div>

        {/* KPIs principales */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Total pedidos</div>
            <div className="kpi-value kpi-blue">
              {kpis.loading ? "…" : kd.total_pedidos?.toLocaleString()}
              <VarBadge current={kd.total_pedidos} prev={kp.total_pedidos} />
            </div>
            <div className="