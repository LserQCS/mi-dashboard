/**
 * AnalisisTab — Análisis Operacional embebido como componente.
 * Recibe desde/hasta como props y hace su propio fetch a /api/Analisis.
 */
import { useState, useEffect, useMemo } from "react";
import RechazosTab from "./RechazosTab";

// ─── Paleta (dark) ────────────────────────────────────────────────────────────
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

const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "1.25rem 1.5rem" };

function pct(num, den) { return (!den || den === 0) ? 0 : Math.round((num / den) * 100); }
function fmt1(n) { return (n == null || isNaN(n)) ? "—" : Number(n).toFixed(1); }

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, sub, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "1.5rem 0 0.75rem", paddingBottom: "0.5rem", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: "1.1rem" }}>{icon}</span>
      <div>
        <div style={{ color: TEXT, fontWeight: 700, fontSize: "0.9rem" }}>{title}</div>
        {sub && <div style={{ color: MUTED, fontSize: "0.68rem", marginTop: 1 }}>{sub}</div>}
      </div>
      {action && <div style={{ marginLeft: "auto", fontSize: "0.68rem", color: MUTED }}>{action}</div>}
    </div>
  );
}

// ─── Bar ──────────────────────────────────────────────────────────────────────
function Bar({ pct: p, color = BLUE, height = 8 }) {
  return (
    <div style={{ background: "#334155", borderRadius: 99, overflow: "hidden", height }}>
      <div style={{ width: `${Math.min(100, Math.max(0, p))}%`, height, background: color, borderRadius: 99, transition: "width 0.4s" }} />
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = TEXT }) {
  return (
    <div style={{ ...card, flex: 1, minWidth: 130 }}>
      <div style={{ color: MUTED, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: "1.7rem", fontWeight: 700, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: MUTED, fontSize: "0.7rem", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ─── Causa Card ───────────────────────────────────────────────────────────────
function CausaCard({ icon, label, count, pctVal, totalFuera, color }) {
  return (
    <div style={{ ...card, flex: 1, minWidth: 140, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: "1.3rem", marginBottom: 4 }}>{icon}</div>
      <div style={{ color: TEXT, fontWeight: 600, fontSize: "0.82rem", marginBottom: 2 }}>{label}</div>
      <div style={{ color, fontWeight: 700, fontSize: "1.5rem", lineHeight: 1 }}>{pctVal}%</div>
      <div style={{ color: MUTED, fontSize: "0.68rem", marginTop: 2 }}>{count} de {totalFuera}</div>
      <div style={{ marginTop: 8 }}><Bar pct={pctVal} color={color} /></div>
    </div>
  );
}

const ALL_SEMANAS_BRECHA = []; // populated dynamically from tareo

// ─── Config por etapa ─────────────────────────────────────────────────────────
const ETAPAS_CFG = [
  { key: "asig",   label: "🔄 Asignación driver",    avgKey: "avg_asig",   pctKey: "pct_asig",   kpiCausa: "causa_asignacion", threshold: 5,  color: "#f97316" },
  { key: "prep",   label: "🏪 Preparación en tienda", avgKey: "avg_prep",   pctKey: "pct_prep",   kpiCausa: "causa_tienda",     threshold: 25, color: "#ef4444" },
  { key: "viaje",  label: "🛣️ Viaje al local",        avgKey: "avg_viaje",  pctKey: "pct_viaje",  kpiCausa: "causa_viaje",      threshold: 10, color: "#eab308" },
  { key: "pickup", label: "📦 Entrega al driver",     avgKey: "avg_pickup", pctKey: "pct_pickup", kpiCausa: "causa_pickup",     threshold: 5,  color: "#a78bfa" },
  { key: "rep",    label: "🛵 Entrega a cliente",     avgKey: "avg_rep",    pctKey: "pct_rep",    kpiCausa: "causa_reparto",    threshold: 12, color: "#3b82f6" },
];

// ─── Tabla detalle de pedidos ─────────────────────────────────────────────────
function PedidosTable({ pedidos }) {
  const [filtro, setFiltro] = useState("Todos");
  const G = "#22c55e", R = "#ef4444", M = "#94a3b8", T = "#f1f5f9", BRD = "#334155";
  const pedidosFilt = filtro === "Cumplieron"
    ? pedidos.filter((r) => r.cumplimiento === "ok")
    : filtro === "Tarde"
    ? pedidos.filter((r) => r.cumplimiento !== "ok")
    : pedidos;
  const fmt = (v, thr) => {
    const n = parseFloat(v);
    if (v == null || isNaN(n)) return <span style={{color:M}}>—</span>;
    return <span style={{color: n > thr ? R : M}}>{n}</span>;
  };
  const tsHM = (v) => {
    if (!v) return <span style={{color:M,fontSize:"0.65rem"}}>—</span>;
    const s = String(v);
    const match = s.match(/[T ](\d{2}:\d{2})/);
    return <span style={{color:"#64748b",fontSize:"0.65rem"}}>{match ? match[1] : s.slice(0,5)}</span>;
  };
  const hdrs = ["Fecha","Hora","# Orden","Local","Driver","Total","TS Asig","Prep","TS Acept","Asig","TS C.Ti","Viaje","TS Rec","Recojo","TS C.En","TS Dest","Entrega","TS Fin","Min","T.Ret","Nueva Disp"];
  return (
    <div style={{background:"#1e293b",border:"1px solid "+BRD,borderRadius:12,padding:"1.25rem 1.5rem",marginTop:"1rem",overflowX:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem",flexWrap:"wrap",gap:8}}>
        <span style={{color:T,fontWeight:700,fontSize:"0.95rem"}}>📋 Detalle de Pedidos</span>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {["Todos","Cumplieron","Tarde"].map((f) => (
            <button key={f} onClick={() => setFiltro(f)} style={{
              padding:"3px 12px", borderRadius:16, fontSize:"0.7rem", cursor:"pointer",
              border: filtro === f
                ? `1px solid ${f==="Cumplieron"?"#22c55e":f==="Tarde"?"#ef4444":"#3b82f6"}`
                : "1px solid #334155",
              background: filtro === f
                ? f==="Cumplieron"?"rgba(34,197,94,0.15)":f==="Tarde"?"rgba(239,68,68,0.15)":"rgba(59,130,246,0.15)"
                : "transparent",
              color: filtro === f
                ? f==="Cumplieron"?"#4ade80":f==="Tarde"?"#f87171":"#93c5fd"
                : "#94a3b8",
            }}>{f}</button>
          ))}
          <span style={{color:M,fontSize:"0.7rem",marginLeft:4}}>{pedidosFilt.length.toLocaleString()} de {pedidos.length.toLocaleString()}</span>
        </div>
      </div>
      {pedidosFilt.length === 0
        ? <p style={{color:M,fontSize:"0.8rem",margin:0}}>Sin registros para el período y filtros seleccionados.</p>
        : (
          <div style={{maxHeight:420,overflowY:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.73rem"}}>
              <thead style={{position:"sticky",top:0,background:"#1e293b",zIndex:1}}>
                <tr style={{borderBottom:"1px solid "+BRD}}>
                  {hdrs.map((h,i)=>(
                    <th key={h} style={{padding:"6px 8px",textAlign:i>=6?"right":"left",color:M,fontWeight:500,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidosFilt.map((r,i)=>{
                  const min = parseFloat(r.min_entrega);
                  const ok  = r.cumplimiento === "ok";
                  return (
                    <tr key={i} style={{borderBottom:"1px solid "+BRD,background:i%2===0?"transparent":"rgba(255,255,255,0.02)"}}>
                      <td style={{padding:"5px 8px",color:M,whiteSpace:"nowrap"}}>{r.fecha_creacion ?? "—"}</td>
                      <td style={{padding:"5px 8px",color:M,whiteSpace:"nowrap"}}>{String(r.hora_creacion ?? "").slice(0,5)}</td>
                      <td style={{padding:"5px 8px",color:T,whiteSpace:"nowrap"}}>{r.no_orden ?? "—"}</td>
                      <td style={{padding:"5px 8px",color:T}}>{r.local ?? "—"}</td>
                      <td style={{padding:"5px 8px",color:T}}>{r.nombre_conductor ?? "—"}</td>
                      <td style={{padding:"5px 8px",textAlign:"right",fontWeight:700,color:ok?G:R}}>{isNaN(min)?"—":min}</td>
                      <td style={{padding:"5px 8px",textAlign:"right"}}>{tsHM(r.ts_asignando)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right"}}>{fmt(r.min_prep,25)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right"}}>{tsHM(r.ts_pickup)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right"}}>{fmt(r.min_asignacion,5)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right"}}>{tsHM(r.ts_camino_tienda)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right"}}>{fmt(r.min_viaje,10)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right"}}>{tsHM(r.ts_recibiendo)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right"}}>{fmt(r.min_pickup,5)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right"}}>{tsHM(r.ts_camino_entrega)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right"}}>{tsHM(r.ts_entregando)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right"}}>{fmt(r.min_reparto,12)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right"}}>{tsHM(r.ts_finalizado)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right",fontWeight:700,color:ok?G:R}}>{isNaN(min)?"—":min}</td>
                      <td style={{padding:"5px 8px",textAlign:"right",color:"#64748b",fontSize:"0.68rem"}}>{r.min_retorno_est != null ? `${r.min_retorno_est} min` : "—"}</td>
                      <td style={{padding:"5px 8px",textAlign:"right"}}>{tsHM(r.ts_disponible)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}

// ─── MultiSelect dropdown ─────────────────────────────────────────────────────
function MultiSelect({ label, options, selected, onChange, getLabel = (o) => o, getValue = (o) => o, placeholder = "Todos" }) {
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen((v) => !v);
  const selectAll = () => onChange([]);
  const toggleOpt = (val) =>
    onChange(selected.includes(val) ? selected.filter((s) => s !== val) : [...selected, val]);

  const displayLabel = selected.length === 0
    ? <span style={{ color: MUTED }}>{placeholder}</span>
    : <span style={{ color: TEXT }}>{selected.length === 1
        ? (options.find((o) => getValue(o) === selected[0]) ? getLabel(options.find((o) => getValue(o) === selected[0])) : selected[0])
        : `${selected.length} selec.`}</span>;

  return (
    <div style={{ position: "relative" }} onMouseLeave={() => setOpen(false)}>
      <button onClick={toggle} style={{
        display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
        background: selected.length > 0 ? "rgba(59,130,246,0.15)" : CARD,
        border: `1px solid ${selected.length > 0 ? BLUE : BORDER}`,
        borderRadius: 6, fontSize: "0.73rem", cursor: "pointer", minWidth: 130, justifyContent: "space-between",
      }}>
        <span style={{ fontSize: "0.65rem", color: MUTED, marginRight: 2 }}>{label}</span>
        {displayLabel}
        <span style={{ color: MUTED, fontSize: "0.6rem", marginLeft: 2 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 300,
          background: "#1a2540", border: `1px solid ${BORDER}`, borderRadius: 8,
          minWidth: 200, maxHeight: 260, overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
          <div
            onClick={selectAll}
            style={{ padding: "7px 12px", fontSize: "0.7rem", color: selected.length === 0 ? BLUE : MUTED, cursor: "pointer", borderBottom: `1px solid ${BORDER}`, fontWeight: 600 }}
          >
            ✓ Todos
          </div>
          {options.map((opt) => {
            const val = getValue(opt);
            const lbl = getLabel(opt);
            const checked = selected.includes(val);
            return (
              <div key={val} onClick={() => toggleOpt(val)} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
                cursor: "pointer", fontSize: "0.72rem", color: checked ? TEXT : MUTED,
                background: checked ? "rgba(59,130,246,0.08)" : "transparent",
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  border: `1px solid ${checked ? BLUE : BORDER}`,
                  background: checked ? BLUE : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {checked && <span style={{ color: "#fff", fontSize: "0.55rem", lineHeight: 1 }}>✓</span>}
                </div>
                {lbl}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AnalisisTab({ desde, hasta, selSemanas: extSemanas, selCiudad = "Todos" }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const selSemanas = extSemanas ?? ALL_SEMANAS_BRECHA;
  const [showCond, setShowCond] = useState(false);

  // Pending = lo que el usuario está seleccionando (no dispara fetch)
  const [pendingPols,    setPendingPols]    = useState([]);
  const [pendingMarcas,  setPendingMarcas]  = useState([]);
  const [pendingTiendas, setPendingTiendas] = useState([]);

  // Applied = lo que se mandó a la API (dispara fetch)
  const [appliedPols,    setAppliedPols]    = useState([]);
  const [appliedMarcas,  setAppliedMarcas]  = useState([]);
  const [appliedTiendas, setAppliedTiendas] = useState([]);

  const hasChanges =
    JSON.stringify(pendingPols)    !== JSON.stringify(appliedPols)    ||
    JSON.stringify(pendingMarcas)  !== JSON.stringify(appliedMarcas)  ||
    JSON.stringify(pendingTiendas) !== JSON.stringify(appliedTiendas);

  const applyFilters = () => {
    setAppliedPols([...pendingPols]);
    setAppliedMarcas([...pendingMarcas]);
    setAppliedTiendas([...pendingTiendas]);
  };

  const clearFilters = () => {
    setPendingPols([]); setPendingMarcas([]); setPendingTiendas([]);
    setAppliedPols([]); setAppliedMarcas([]); setAppliedTiendas([]);
  };

  // Reset filtros cuando cambia ciudad
  useEffect(() => { clearFilters(); }, [selCiudad]); // eslint-disable-line

  // Fetch — solo cuando applied* cambia
  useEffect(() => {
    if (!desde || !hasta) return;
    setLoading(true); setError(null);
    const qs = new URLSearchParams({ desde, hasta });
    if (selCiudad !== "Todos")         qs.set("ciudad",   selCiudad);
    if (appliedPols.length > 0)        qs.set("poligono", appliedPols.join(","));
    if (appliedTiendas.length > 0)     qs.set("locales",  appliedTiendas.join(","));
    else if (appliedMarcas.length > 0) qs.set("marcas",   appliedMarcas.join(","));
    fetch(`/api/Analisis?${qs.toString()}`)
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [desde, hasta, selCiudad, appliedPols, appliedMarcas, appliedTiendas]); // eslint-disable-line

  // ── Hooks de cascada — deben ir ANTES de cualquier return condicional ──────
  const marcaMap = data?.marcaMap ?? [];

  const allPoligonos = useMemo(() =>
    [...new Set(marcaMap.flatMap((m) => m.tiendas.map((t) => t.poligono).filter(Boolean)))].sort(),
    [marcaMap]);

  const availableMarcas = useMemo(() => {
    if (pendingPols.length === 0) return marcaMap.map((m) => m.marca);
    return marcaMap.filter((m) => m.tiendas.some((t) => pendingPols.includes(t.poligono))).map((m) => m.marca);
  }, [marcaMap, pendingPols]);

  const availableTiendas = useMemo(() => {
    const marcasFiltro = pendingMarcas.length > 0 ? pendingMarcas : availableMarcas;
    return marcaMap
      .filter((m) => marcasFiltro.includes(m.marca))
      .flatMap((m) => m.tiendas.filter((t) => pendingPols.length === 0 || pendingPols.includes(t.poligono)))
      .sort((a, b) => a.tienda.localeCompare(b.tienda));
  }, [marcaMap, pendingMarcas, pendingPols, availableMarcas]);

  // Auto-deselect cascade
  useEffect(() => {
    setPendingMarcas((prev) => prev.filter((m) => availableMarcas.includes(m)));
  }, [JSON.stringify(availableMarcas)]); // eslint-disable-line
  useEffect(() => {
    const locSet = new Set(availableTiendas.map((t) => t.local));
    setPendingTiendas((prev) => prev.filter((l) => locSet.has(l)));
  }, [JSON.stringify(availableTiendas)]); // eslint-disable-line

  // ── Early returns DESPUÉS de todos los hooks ──────────────────────────────
  if (loading) return <div style={{ textAlign: "center", padding: "3rem", color: MUTED }}>Cargando análisis…</div>;
  if (error)   return <div style={{ color: RED, padding: "1rem" }}>Error: {error}</div>;
  if (!data)   return null;

  const k          = data.kpis ?? {};
  const totalPed   = Number(k.total_pedidos) || 0;
  const totalFuera = Number(k.fuera_obj)     || 0;
  const cumplPct   = pct(Number(k.dentro_obj), totalPed);
  const avgMin     = Number(k.avg_min_entrega) || 0;

  const cT = Number(k.causa_tienda)     || 0;
  const cA = Number(k.causa_asignacion) || 0;
  const cV = Number(k.causa_viaje)      || 0;
  const cP = Number(k.causa_pickup)     || 0;
  const cR = Number(k.causa_reparto)    || 0;

  const porPol  = data.porPoligono ?? [];
  const porHora = data.porHora     ?? [];
  const rechazos = data.rechazos   ?? [];

  // Hora chart
  const horaMap = {};
  for (const r of porHora) horaMap[Number(r.hora)] = r;
  const horaFull = Array.from({ length: 24 }, (_, i) => horaMap[i] ?? { hora: i, total: 0, dentro_obj: 0 });
  const maxHora  = Math.max(...horaFull.map((r) => Number(r.total)), 1);

  // ─── Bottleneck detection ──────────────────────────────────────────────────
  // La etapa con mayor # de pedidos tardíos vinculados = cuello de botella
  const bottleneckKey = (() => {
    const counts = ETAPAS_CFG.map(e => ({ key: e.key, count: Number(k[e.kpiCausa]) || 0 }));
    const max = counts.reduce((a, b) => b.count > a.count ? b : a, counts[0]);
    return max && max.count > 0 ? max.key : null;
  })();

  return (
    <div style={{ paddingTop: "1rem" }}>

      {/* ── Filtros: Polígono / Marca / Tienda ────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <span style={{ color: MUTED, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 2 }}>Filtrar</span>

        <MultiSelect
          label="Polígono"
          options={allPoligonos}
          selected={pendingPols}
          onChange={setPendingPols}
          placeholder="Todos los polígonos"
        />

        <MultiSelect
          label="Marca"
          options={availableMarcas}
          selected={pendingMarcas}
          onChange={setPendingMarcas}
          placeholder="Todas las marcas"
        />

        {(pendingMarcas.length > 0 || pendingPols.length > 0) && availableTiendas.length > 1 && (
          <MultiSelect
            label="Tienda"
            options={availableTiendas}
            selected={pendingTiendas}
            onChange={setPendingTiendas}
            getLabel={(t) => t.tienda}
            getValue={(t) => t.local}
            placeholder="Todas las tiendas"
          />
        )}

        {hasChanges && (
          <button onClick={applyFilters} style={{
            padding: "4px 14px", borderRadius: 6, border: "none",
            background: BLUE, color: "#fff", fontSize: "0.73rem",
            cursor: "pointer", fontWeight: 700,
          }}>
            Aplicar
          </button>
        )}

        {(appliedPols.length > 0 || appliedMarcas.length > 0 || appliedTiendas.length > 0) && !hasChanges && (
          <button onClick={clearFilters} style={{
            padding: "4px 10px", borderRadius: 6,
            border: `1px solid ${BORDER}`, background: "transparent",
            color: MUTED, fontSize: "0.7rem", cursor: "pointer",
          }}>
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BLOQUE 0 — Resumen general
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionHeader
        icon="📊"
        title="Resumen general"
        sub="Pulso del período — ¿cómo estamos?"
        action={`${desde} → ${hasta}`}
      />

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
        <KpiCard label="Total pedidos"        value={totalPed.toLocaleString()} sub={`${desde} → ${hasta}`} />
        <KpiCard label="Cumplimiento ≤45 min" value={`${cumplPct}%`}
          sub={`${Number(k.dentro_obj)||0} dentro / ${totalFuera} tardíos`}
          color={cumplPct >= 60 ? GREEN : cumplPct >= 40 ? YELLOW : RED} />
        <KpiCard label="Tiempo prom. entrega" value={`${fmt1(avgMin)} min`}
          color={avgMin <= 45 ? GREEN : avgMin <= 60 ? YELLOW : RED} />
        <KpiCard label="Avg asignación"
          value={`${fmt1(Number(k.avg_asignacion))} min`}
          sub="objetivo ≤5 min"
          color={Number(k.avg_asignacion) <= 5 ? GREEN : Number(k.avg_asignacion) <= 10 ? YELLOW : RED} />
        <KpiCard label="Pedidos asig >5 min"
          value={totalFuera > 0 ? `${pct(cA, totalPed)}%` : "—"}
          sub={`${cA} de ${totalPed} pedidos`}
          color={pct(cA, totalPed) <= 10 ? GREEN : pct(cA, totalPed) <= 25 ? YELLOW : RED} />
        <KpiCard label="Drivers activos" value={Number(k.drivers_activos) || "—"} />
      </div>

      {/* Causas + Horas */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 10, marginBottom: "0.5rem" }}>

        {/* Árbol de causas */}
        <div style={{ ...card }}>
          <h3 style={{ margin: "0 0 0.25rem", fontSize: "0.95rem", fontWeight: 700 }}>🔍 ¿Por qué llegan tarde?</h3>
          <p style={{ margin: "0 0 0.75rem", color: MUTED, fontSize: "0.75rem" }}>
            {totalFuera} pedidos fuera de objetivo — un pedido puede tener más de una causa
          </p>
          {totalFuera === 0 ? (
            <div style={{ color: GREEN }}>✅ Sin pedidos tardíos en el período</div>
          ) : (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <CausaCard icon="🏪" label="Tienda (>25 min)"       count={cT} pctVal={pct(cT, totalFuera)} totalFuera={totalFuera} color={RED}    />
              <CausaCard icon="🔄" label="Asignación (>5 min)"    count={cA} pctVal={pct(cA, totalFuera)} totalFuera={totalFuera} color={ORANGE} />
              <CausaCard icon="🛣️" label="Viaje al local (>10)"   count={cV} pctVal={pct(cV, totalFuera)} totalFuera={totalFuera} color={YELLOW} />
              <CausaCard icon="🛍️" label="Entrega al driver (>5)" count={cP} pctVal={pct(cP, totalFuera)} totalFuera={totalFuera} color={BLUE}   />
              <CausaCard icon="📦" label="Entrega cliente (>12)"  count={cR} pctVal={pct(cR, totalFuera)} totalFuera={totalFuera} color={VIOLET} />
            </div>
          )}
        </div>

        {/* Pedidos por hora */}
        <div style={{ ...card }}>
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700 }}>🕐 Pedidos por hora</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 110 }}>
            {horaFull.map((r) => {
              const tot  = Number(r.total);
              const barH = tot === 0 ? 0 : Math.max(3, Math.round((tot / maxHora) * 100));
              const p45  = tot === 0 ? 0 : pct(Number(r.dentro_obj), tot);
              const col  = tot === 0 ? BORDER : p45 >= 70 ? GREEN : p45 >= 40 ? YELLOW : p45 >= 20 ? ORANGE : RED;
              return (
                <div key={r.hora} title={`${r.hora}h: ${tot} pedidos, ${p45}% ≤45 min`}
                  style={{ flex: 1, height: barH, background: col, borderRadius: "2px 2px 0 0", minHeight: tot > 0 ? 3 : 0 }} />
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 2, borderTop: `1px solid ${BORDER}`, paddingTop: 2 }}>
            {horaFull.map((r) => (
              <div key={r.hora} style={{ flex: 1, textAlign: "center" }}>
                {r.hora % 3 === 0 && <span style={{ fontSize: "0.5rem", color: MUTED }}>{r.hora}</span>}
              </div>
            ))}
          </div>
          <div style={{ fontSize: "0.68rem", color: MUTED, marginTop: 6 }}>
            Color = % cumplimiento &nbsp;
            <span style={{ color: GREEN }}>■</span> ≥70% &nbsp;
            <span style={{ color: YELLOW }}>■</span> 40–70% &nbsp;
            <span style={{ color: ORANGE }}>■</span> 20–40% &nbsp;
            <span style={{ color: RED }}>■</span> &lt;20%
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BLOQUE 1 — Análisis por etapa
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionHeader
        icon="⏱️"
        title="Análisis por etapa"
        sub="¿En qué paso exacto se pierde tiempo? — el cuello de botella se recalcula con cada filtro"
      />

      {ETAPAS_CFG.map(({ key, label, avgKey, pctKey, kpiCausa, threshold, color: etapaColor }) => {
        const tendRows = data.tendEtapas ?? [];
        const drvRows  = (data.driverEtapas ?? [])
          .filter(r => parseFloat(r[avgKey]) > 0)
          .sort((a, b) => parseFloat(b[avgKey]) - parseFloat(a[avgKey]))
          .slice(0, 15);
        const etapaHoraMap = {};
        for (const r of (data.etapasPorHora ?? [])) etapaHoraMap[Number(r.hora)] = r;
        const etapaHoraFull = Array.from({ length: 24 }, (_, i) => etapaHoraMap[i] ?? { hora: i, [avgKey]: 0, total: 0 });
        const maxEtapaHora  = Math.max(...etapaHoraFull.map(r => parseFloat(r[avgKey]) || 0), 1);
        const maxDrv   = Math.max(...drvRows.map(r => parseFloat(r[avgKey]) || 0), 1);
        const avgGlobal = (() => {
          const totalW = tendRows.reduce((s, r) => s + (Number(r.total) || 0), 0);
          const sumW   = tendRows.reduce((s, r) => s + (parseFloat(r[avgKey]) || 0) * (Number(r.total) || 0), 0);
          return totalW > 0 ? sumW / totalW : 0;
        })();
        const causaPct  = totalFuera > 0 ? pct(Number(k[kpiCausa]), totalFuera) : 0;
        const isBottleneck = key === bottleneckKey;

        return (
          <div key={key} style={{ ...card, marginBottom: "1rem", borderTop: `3px solid ${etapaColor}`, position: "relative" }}>

            {/* Badge cuello de botella */}
            {isBottleneck && (
              <div style={{
                position: "absolute", top: 12, right: 14,
                background: "rgba(239,68,68,0.12)", border: "1px solid #ef4444",
                borderRadius: 6, padding: "2px 10px",
                fontSize: "0.63rem", color: "#ef4444", fontWeight: 700,
              }}>
                ⚠️ Cuello de botella
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem", flexWrap: "wrap", gap: 8 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>{label}</h3>
                <p style={{ margin: "2px 0 0", color: MUTED, fontSize: "0.72rem" }}>
                  objetivo ≤{threshold} min · avg global:{" "}
                  <span style={{ color: avgGlobal > threshold ? RED : avgGlobal > threshold * 0.7 ? ORANGE : GREEN, fontWeight: 700 }}>{fmt1(avgGlobal)} min</span>
                </p>
              </div>
              {causaPct > 0 && (
                <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "4px 12px", textAlign: "center" }}>
                  <div style={{ color: etapaColor, fontWeight: 700, fontSize: "1.1rem" }}>{causaPct}%</div>
                  <div style={{ color: MUTED, fontSize: "0.6rem" }}>de tardíos</div>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "1rem" }}>

              {/* Gráfico 1: % etapa lenta por día */}
              <div>
                <div style={{ color: MUTED, fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  % pedidos &gt;{threshold} min en esta etapa — por día
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 130 }}>
                  {tendRows.map(r => {
                    const v = parseFloat(r[pctKey]) || 0;
                    const barH = v === 0 ? 2 : Math.max(4, Math.round((v / 100) * 126));
                    const col = v >= 60 ? RED : v >= 30 ? ORANGE : v >= 10 ? YELLOW : GREEN;
                    return (
                      <div key={r.fecha} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%", height: 130 }}>
                          <div title={`${String(r.fecha).slice(5)}: ${v}% · avg ${r[avgKey]} min`}
                            style={{ width: "100%", height: barH, background: col, borderRadius: "3px 3px 0 0" }} />
                        </div>
                        <span style={{ fontSize: "0.48rem", color: MUTED, marginTop: 2, writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                          {String(r.fecha ?? "").slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: "0.61rem", color: MUTED, marginTop: 14 }}>
                  <span style={{ color: GREEN }}>■</span> &lt;10% &nbsp;
                  <span style={{ color: YELLOW }}>■</span> 10-30% &nbsp;
                  <span style={{ color: ORANGE }}>■</span> 30-60% &nbsp;
                  <span style={{ color: RED }}>■</span> &gt;60%
                </div>
              </div>

              {/* Gráfico 2: avg por hora */}
              <div>
                <div style={{ color: MUTED, fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Avg minutos en esta etapa — por hora del día
                </div>
                <div style={{ display: "flex", gap: 2, height: 130, alignItems: "flex-end" }}>
                  {etapaHoraFull.map(r => {
                    const a = parseFloat(r[avgKey]) || 0;
                    const barH = a === 0 ? 0 : Math.max(3, Math.round((a / maxEtapaHora) * 126));
                    const col = a > threshold ? RED : a > threshold * 0.6 ? ORANGE : a > 0 ? GREEN : "transparent";
                    return (
                      <div key={r.hora} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end" }}>
                        <div title={`${r.hora}h: ${a} min`}
                          style={{ width: "100%", height: barH, background: col, borderRadius: "2px 2px 0 0" }} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                  {etapaHoraFull.map(r => (
                    <div key={r.hora} style={{ flex: 1, textAlign: "center", height: 12 }}>
                      {r.hora % 3 === 0 && <span style={{ fontSize: "0.5rem", color: MUTED }}>{r.hora}</span>}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: "0.61rem", color: MUTED, marginTop: 2 }}>
                  <span style={{ color: GREEN }}>■</span> OK &nbsp;
                  <span style={{ color: ORANGE }}>■</span> Cerca del límite &nbsp;
                  <span style={{ color: RED }}>■</span> Excede {threshold} min
                </div>
              </div>
            </div>

            {/* Tabla de drivers más lentos en esta etapa */}
            {drvRows.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <div style={{ color: MUTED, fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Drivers con mayor tiempo en esta etapa
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {["Driver", "Pedidos", `Avg (min)`, `% >${threshold}min`, "% OK ≤45", "Barra"].map(h => (
                        <th key={h} style={{ padding: "5px 8px", textAlign: h === "Driver" ? "left" : "right", color: MUTED, fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drvRows.map((r, i) => {
                      const avg  = parseFloat(r[avgKey])  || 0;
                      const pctL = parseFloat(r[pctKey])  || 0;
                      const pctK = parseFloat(r.pct_ok)   || 0;
                      const colA = avg > threshold ? RED : avg > threshold * 0.7 ? ORANGE : GREEN;
                      return (
                        <tr key={r.nombre_conductor} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                          <td style={{ padding: "5px 8px", color: TEXT }}>{r.nombre_conductor}</td>
                          <td style={{ padding: "5px 8px", textAlign: "right", color: MUTED }}>{Number(r.total)}</td>
                          <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, color: colA }}>{avg}</td>
                          <td style={{ padding: "5px 8px", textAlign: "right", color: pctL >= 50 ? RED : pctL >= 25 ? ORANGE : YELLOW }}>{pctL}%</td>
                          <td style={{ padding: "5px 8px", textAlign: "right", color: pctK >= 70 ? GREEN : pctK >= 40 ? YELLOW : RED }}>{pctK}%</td>
                          <td style={{ padding: "5px 8px", width: 90 }}>
                            <div style={{ background: BORDER, borderRadius: 4, height: 6, overflow: "hidden" }}>
                              <div style={{ width: `${Math.min(100, (avg / maxDrv) * 100)}%`, height: 6, background: colA }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* ══════════════════════════════════════════════════════════════════════
          BLOQUE 2 — Drivers
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionHeader
        icon="🚗"
        title="Bloque driver"
        sub="¿A quién entrenar o reasignar? — rendimiento individual con etapas fallidas identificadas"
      />

      {(data.driverEtapas?.length > 0) && (() => {
        const drivers = data.driverEtapas;
        const maxTotal = Math.max(...drivers.map(r => Number(r.total)), 1);
        const etapaCols = [
          { key: "avg_asig",   label: "Asig",    thr: 5  },
          { key: "avg_prep",   label: "Prep",    thr: 25 },
          { key: "avg_viaje",  label: "Viaje",   thr: 10 },
          { key: "avg_pickup", label: "Pickup",  thr: 5  },
          { key: "avg_rep",    label: "Entrega", thr: 12 },
        ];
        return (
          <div style={{ ...card, marginBottom: "1rem", overflowX: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>🚀 Performance por Conductor</h3>
                <p style={{ margin: "2px 0 0", color: MUTED, fontSize: "0.7rem" }}>
                  Tiempos promedio por etapa · rojo = excede objetivo · "Problema" = etapas fallidas
                </p>
              </div>
              <button onClick={() => setShowCond(v => !v)}
                style={{ fontSize: "0.68rem", color: MUTED, background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
                {showCond ? "Ver menos" : `Ver todos (${drivers.length})`}
              </button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th style={{ padding: "5px 8px", textAlign: "left",  color: MUTED, fontWeight: 500 }}>#</th>
                  <th style={{ padding: "5px 8px", textAlign: "left",  color: MUTED, fontWeight: 500 }}>Conductor</th>
                  <th style={{ padding: "5px 8px", textAlign: "right", color: MUTED, fontWeight: 500 }}>Pedidos</th>
                  <th style={{ padding: "5px 8px", textAlign: "right", color: MUTED, fontWeight: 500 }}>% ≤45</th>
                  <th style={{ padding: "5px 8px", textAlign: "right", color: MUTED, fontWeight: 500 }}>Total avg</th>
                  {etapaCols.map(c => <th key={c.key} style={{ padding: "5px 8px", textAlign: "right", color: MUTED, fontWeight: 500 }}>{c.label}</th>)}
                  <th style={{ padding: "5px 8px", textAlign: "left",  color: MUTED, fontWeight: 500 }}>Problema</th>
                  <th style={{ padding: "5px 8px",                     color: MUTED, fontWeight: 500 }}>Carga</th>
                </tr>
              </thead>
              <tbody>
                {(showCond ? drivers : drivers.slice(0, 15)).map((r, i) => {
                  const pct_ok = parseFloat(r.pct_ok) || 0;
                  const cOk = pct_ok >= 70 ? GREEN : pct_ok >= 40 ? YELLOW : RED;
                  const avg = parseFloat(r.avg_entrega) || 0;
                  const problemas = etapaCols.filter(c => (parseFloat(r[c.key]) || 0) > c.thr).map(c => c.label);
                  return (
                    <tr key={r.nombre_conductor} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                      <td style={{ padding: "5px 8px", color: MUTED }}>{i + 1}</td>
                      <td style={{ padding: "5px 8px", color: TEXT, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.nombre_conductor}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right", color: MUTED }}>{Number(r.total)}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, color: cOk }}>{pct_ok}%</td>
                      <td style={{ padding: "5px 8px", textAlign: "right", color: avg > 45 ? RED : avg > 35 ? YELLOW : GREEN, fontWeight: 600 }}>{fmt1(avg)}</td>
                      {etapaCols.map(c => {
                        const v = parseFloat(r[c.key]) || 0;
                        const col = v > c.thr ? RED : v > c.thr * 0.7 ? ORANGE : MUTED;
                        return <td key={c.key} style={{ padding: "5px 8px", textAlign: "right", color: col }}>{v > 0 ? fmt1(v) : "—"}</td>;
                      })}
                      <td style={{ padding: "5px 8px" }}>
                        {problemas.length === 0
                          ? <span style={{ color: GREEN, fontSize: "0.65rem" }}>✓ OK</span>
                          : <span style={{ color: RED, fontSize: "0.65rem", fontWeight: 600 }}>{problemas.join(" + ")}</span>
                        }
                      </td>
                      <td style={{ padding: "5px 8px", width: 80 }}>
                        <div style={{ background: BORDER, borderRadius: 4, height: 5, overflow: "hidden" }}>
                          <div style={{ width: `${(Number(r.total) / maxTotal) * 100}%`, height: 5, background: BLUE }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          BLOQUE 3 — Marca / Tienda
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionHeader
        icon="🏷️"
        title="Bloque marca / tienda"
        sub="¿Qué clientes generan más tardanzas? — drill-down de marca a tiendas específicas"
      />
      <SegmentosTabs data={data} />

      {/* ══════════════════════════════════════════════════════════════════════
          BLOQUE 4 — Polígono
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionHeader
        icon="🗺️"
        title="Bloque polígono"
        sub="¿En qué zona geográfica se concentra el problema? — refuerzo de flota por zona"
      />

      {porPol.length > 0 ? (
        <div style={{ ...card, marginBottom: "1rem", overflowX: "auto" }}>
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700 }}>🗺️ Rendimiento por Polígono</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Polígono","Pedidos","% OK","Avg min","Tienda","Asig.","Viaje","Entrega"].map((h) => (
                  <th key={h} style={{ padding: "5px 8px", textAlign: h === "Polígono" ? "left" : "right", color: MUTED, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {porPol.map((r, i) => {
                const p45 = pct(Number(r.dentro_obj), Number(r.total));
                const c45 = p45 >= 60 ? GREEN : p45 >= 40 ? YELLOW : RED;
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                    <td style={{ padding: "6px 8px", color: TEXT }}>{r.poligono ?? "—"}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: MUTED }}>{Number(r.total).toLocaleString()}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}><span style={{ color: c45, fontWeight: 700 }}>{p45}%</span></td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: Number(r.avg_min) > 45 ? RED : GREEN }}>{fmt1(r.avg_min)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: RED    }}>{pct(Number(r.causa_tienda),     Number(r.fuera_obj))}%</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: ORANGE }}>{pct(Number(r.causa_asignacion), Number(r.fuera_obj))}%</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: YELLOW }}>{pct(Number(r.causa_viaje),      Number(r.fuera_obj))}%</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: VIOLET }}>{pct(Number(r.causa_reparto),    Number(r.fuera_obj))}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ ...card, marginBottom: "1rem", color: MUTED, fontSize: "0.8rem" }}>
          Sin datos de polígono para el período.
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          BLOQUE 5 — Rechazos
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionHeader
        icon="🚫"
        title="Bloque rechazos"
        sub="¿Quién disponible no tomó pedidos? — oportunidades perdidas de asignación"
      />

      {rechazos.length > 0 ? (
        <div style={{ ...card, marginBottom: "1rem" }}>
          <h3 style={{ margin: "0 0 0.25rem", fontSize: "0.95rem", fontWeight: 700 }}>
            Disponibles que no tomaron pedidos
          </h3>
          <p style={{ margin: "0 0 0.75rem", color: MUTED, fontSize: "0.73rem" }}>
            Pedidos con asig &gt;5 min donde había drivers en turno, disponibles, sin entrega activa y que no aceptaron
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1rem" }}>
            {/* Bar chart por driver */}
            <div>
              <div style={{ color: MUTED, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                Drivers con más rechazos detectados
              </div>
              {(() => {
                const map = new Map();
                for (const r of rechazos) for (const d of r.no_tomaron) map.set(d, (map.get(d) || 0) + 1);
                const top = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
                const maxV = top[0]?.[1] || 1;
                return top.map(([name, cnt]) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{ color: TEXT, fontSize: "0.72rem", minWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                    <div style={{ flex: 1, background: BORDER, borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div style={{ width: `${(cnt / maxV) * 100}%`, height: 8, background: RED, borderRadius: 4 }} />
                    </div>
                    <span style={{ color: RED, fontWeight: 700, fontSize: "0.72rem", minWidth: 24, textAlign: "right" }}>{cnt}</span>
                  </div>
                ));
              })()}
            </div>

            {/* Rechazos por polígono */}
            <div>
              <div style={{ color: MUTED, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                Rechazos por polígono
              </div>
              {(() => {
                const map = new Map();
                for (const r of rechazos) map.set(r.poligono || "—", (map.get(r.poligono || "—") || 0) + 1);
                const rows = [...map.entries()].sort((a, b) => b[1] - a[1]);
                const maxV = rows[0]?.[1] || 1;
                return rows.map(([pol, cnt]) => (
                  <div key={pol} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{ color: TEXT, fontSize: "0.72rem", minWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pol}</span>
                    <div style={{ flex: 1, background: BORDER, borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div style={{ width: `${(cnt / maxV) * 100}%`, height: 8, background: ORANGE, borderRadius: 4 }} />
                    </div>
                    <span style={{ color: ORANGE, fontWeight: 700, fontSize: "0.72rem", minWidth: 24, textAlign: "right" }}>{cnt}</span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Detalle completo */}
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "0.75rem" }}>
            <RechazosTab rechazos={rechazos} />
          </div>
        </div>
      ) : (
        <div style={{ ...card, marginBottom: "1rem", color: MUTED, fontSize: "0.8rem" }}>
          ✅ Sin rechazos detectados en el período.
        </div>
      )}

      {/* ── Detalle de Pedidos ─────────────────────────────────────────────── */}
      <PedidosTable pedidos={data.pedidos ?? []} />

    </div>
  );
}

// ─── SegmentosTabs: Por Marca / Por Tienda ───────────────────────────────────
function SegmentosTabs({ data }) {
  const [tab, setTab] = useState("marca");

  const porLocal = data.porLocal ?? [];
  const porMarca = data.porMarca ?? [];

  const datasets = {
    marca:  { rows: porMarca, nameKey: "marca", nameLabel: "Marca" },
    tienda: { rows: porLocal, nameKey: "local", nameLabel: "Tienda / Local" },
  };

  const { rows, nameKey, nameLabel } = datasets[tab];

  const fuera = (r) => Number(r.fuera_obj) || (Number(r.total) - Number(r.dentro_obj));
  const pctOk = (r) => {
    const t = Number(r.total) || 0;
    const d = Number(r.dentro_obj) || 0;
    return t > 0 ? Math.round((d / t) * 100) : 0;
  };
  const causaPrincipal = (r) => {
    const f = fuera(r) || 1;
    const causas = [
      { label: "Tienda",  val: Number(r.causa_tienda)     || 0, color: RED    },
      { label: "Asig",    val: Number(r.causa_asignacion) || 0, color: ORANGE },
      { label: "Viaje",   val: Number(r.causa_viaje)      || 0, color: YELLOW },
      { label: "Pickup",  val: Number(r.causa_pickup)     || 0, color: VIOLET },
      { label: "Entrega", val: Number(r.causa_reparto)    || 0, color: BLUE   },
    ];
    const top = causas.reduce((a, b) => b.val > a.val ? b : a, causas[0]);
    return { ...top, pct: Math.round((top.val / f) * 100) };
  };

  const thStyle = { padding: "5px 8px", textAlign: "right", color: MUTED, fontWeight: 500, fontSize: "0.68rem", whiteSpace: "nowrap" };
  const tdS = (right = true) => ({ padding: "5px 8px", textAlign: right ? "right" : "left", fontSize: "0.7rem" });

  return (
    <div style={{ ...card, marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>🏪 Rendimiento por Segmento</h3>
          <p style={{ margin: "2px 0 0", color: MUTED, fontSize: "0.7rem" }}>
            Identifica dónde aplicar mejoras — por marca o tienda
          </p>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { key: "marca",  label: "Por Marca"  },
            { key: "tienda", label: "Por Tienda" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: "4px 12px", fontSize: "0.68rem", borderRadius: 6, cursor: "pointer",
              border: tab === key ? `1px solid ${BLUE}` : `1px solid ${BORDER}`,
              background: tab === key ? "rgba(59,130,246,0.18)" : "transparent",
              color: tab === key ? "#93c5fd" : MUTED, fontWeight: tab === key ? 600 : 400,
            }}>{label}</button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p style={{ color: MUTED, fontSize: "0.78rem" }}>Sin datos para este período.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th style={{ ...thStyle, textAlign: "left" }}>{nameLabel}</th>
                {tab === "tienda" && <th style={thStyle}>Polígono</th>}
                <th style={thStyle}>Pedidos</th>
                <th style={thStyle}>% ≤45</th>
                <th style={thStyle}>Avg total</th>
                <th style={thStyle}>Asig</th>
                <th style={thStyle}>Prep</th>
                <th style={thStyle}>Viaje</th>
                <th style={thStyle}>Pickup</th>
                <th style={thStyle}>Entrega</th>
                <th style={thStyle}>Causa principal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const ok   = pctOk(r);
                const cOk  = ok >= 70 ? GREEN : ok >= 40 ? YELLOW : RED;
                const avg  = parseFloat(r.avg_min) || 0;
                const cAvg = avg > 50 ? RED : avg > 45 ? ORANGE : GREEN;
                const cp   = causaPrincipal(r);
                const etapaAvgs = [
                  { v: parseFloat(r.avg_asig)   || 0, thr: 5  },
                  { v: parseFloat(r.avg_prep)   || 0, thr: 25 },
                  { v: parseFloat(r.avg_viaje)  || 0, thr: 10 },
                  { v: parseFloat(r.avg_pickup) || 0, thr: 5  },
                  { v: parseFloat(r.avg_rep)    || 0, thr: 12 },
                ];
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                    <td style={{ ...tdS(false), color: TEXT, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                      {r[nameKey] ?? "—"}
                    </td>
                    {tab === "tienda" && <td style={{ ...tdS(false), color: MUTED, fontSize: "0.65rem" }}>{r.poligono ?? "—"}</td>}
                    <td style={{ ...tdS(), color: MUTED }}>{Number(r.total).toLocaleString()}</td>
                    <td style={{ ...tdS() }}><span style={{ color: cOk, fontWeight: 700 }}>{ok}%</span></td>
                    <td style={{ ...tdS(), color: cAvg, fontWeight: 600 }}>{fmt1(avg)}</td>
                    {etapaAvgs.map((e, j) => (
                      <td key={j} style={{ ...tdS(), color: e.v > e.thr ? RED : e.v > e.thr * 0.7 ? ORANGE : MUTED }}>
                        {e.v > 0 ? fmt1(e.v) : "—"}
                      </td>
                    ))}
                    <td style={{ ...tdS() }}>
                      <span style={{ color: cp.color, fontWeight: 600, fontSize: "0.65rem" }}>
                        {cp.label} {cp.pct > 0 ? `(${cp.pct}%)` : ""}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               