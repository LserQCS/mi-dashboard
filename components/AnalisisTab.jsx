/**
 * AnalisisTab — Análisis Operacional embebido como componente.
 * Recibe desde/hasta como props y hace su propio fetch a /api/Analisis.
 */
import { useState, useEffect } from "react";

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

// ─── Etapa Row ────────────────────────────────────────────────────────────────
function EtapaRow({ label, avg, benchmark }) {
  const over = avg > benchmark;
  const maxB = Math.max(avg, benchmark) * 1.2 || 1;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: TEXT, fontSize: "0.8rem" }}>{label}</span>
        <span style={{ color: over ? RED : GREEN, fontWeight: 700, fontSize: "0.8rem" }}>
          {fmt1(avg)} min <span style={{ color: MUTED, fontWeight: 400 }}>(≤{benchmark})</span>
        </span>
      </div>
      <div style={{ position: "relative", height: 10 }}>
        <div style={{ background: "#334155", borderRadius: 99, height: 10 }}>
          <div style={{ width: `${Math.min(100, (avg / maxB) * 100)}%`, height: 10, background: over ? RED : GREEN, borderRadius: 99 }} />
        </div>
        <div style={{ position: "absolute", top: -2, left: `${Math.min(100, (benchmark / maxB) * 100)}%`, width: 2, height: 14, background: YELLOW, borderRadius: 2 }} />
      </div>
    </div>
  );
}

const ALL_SEMANAS_BRECHA = [21, 22, 23, 24];


// ─── Tabla detalle de pedidos ─────────────────────────────────────────────────
function PedidosTable({ pedidos }) {
  const G = "#22c55e", R = "#ef4444", M = "#94a3b8", T = "#f1f5f9", BRD = "#334155";
  const fmt = (v, thr) => {
    const n = parseFloat(v);
    if (v == null || isNaN(n)) return <span style={{color:M}}>—</span>;
    return <span style={{color: n > thr ? R : M}}>{n}</span>;
  };
  const hdrs = ["Fecha","Hora","# Orden","Local","Driver","Tipo","Total","Prep","Asig","Viaje","Rep"];
  return (
    <div style={{background:"#1e293b",border:"1px solid "+BRD,borderRadius:12,padding:"1.25rem 1.5rem",marginTop:"1rem",overflowX:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
        <span style={{color:T,fontWeight:700,fontSize:"0.95rem"}}>📋 Detalle de Pedidos</span>
        <span style={{color:M,fontSize:"0.7rem"}}>{pedidos.length.toLocaleString()} registros</span>
      </div>
      {pedidos.length === 0
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
                {pedidos.map((r,i)=>{
                  const min = parseFloat(r.min_entrega);
                  const ok  = r.cumplimiento === "ok";
                  return (
                    <tr key={i} style={{borderBottom:"1px solid "+BRD,background:i%2===0?"transparent":"rgba(255,255,255,0.02)"}}>
                      <td style={{padding:"5px 8px",color:M,whiteSpace:"nowrap"}}>{r.fecha_creacion ?? "—"}</td>
                      <td style={{padding:"5px 8px",color:M,whiteSpace:"nowrap"}}>{String(r.hora_creacion ?? "").slice(0,5)}</td>
                      <td style={{padding:"5px 8px",color:T,whiteSpace:"nowrap"}}>{r.no_orden ?? "—"}</td>
                      <td style={{padding:"5px 8px",color:T}}>{r.local ?? "—"}</td>
                      <td style={{padding:"5px 8px",color:T}}>{r.nombre_conductor ?? "—"}</td>
                      <td style={{padding:"5px 8px",color:M}}>{r.tipo_orden ?? "—"}</td>
                      <td style={{padding:"5px 8px",textAlign:"right",fontWeight:700,color:ok?G:R}}>{isNaN(min)?"—":min}</td>
                      <td style={{padding:"5px 8px",textAlign:"right"}}>{fmt(r.min_prep,25)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right"}}>{fmt(r.min_asignacion,5)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right"}}>{fmt(r.min_viaje,10)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right"}}>{fmt(r.min_reparto,12)}</td>
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

export default function AnalisisTab({ desde, hasta, selSemanas: extSemanas, selCiudad = "Todos" }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const selSemanas = extSemanas ?? ALL_SEMANAS_BRECHA;
  const [showCond, setShowCond] = useState(false);
  const [selLocal, setSelLocal] = useState("Todos");

  // Reset local cuando cambia ciudad
  useEffect(() => { setSelLocal("Todos"); }, [selCiudad]);

  useEffect(() => {
    if (!desde || !hasta) return;
    setLoading(true); setError(null);
    const qs = new URLSearchParams({ desde, hasta });
    if (selCiudad !== "Todos") qs.set("ciudad", selCiudad);
    if (selLocal  !== "Todos") qs.set("local",  selLocal);
    fetch(`/api/Analisis?${qs.toString()}`)
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [desde, hasta, selCiudad, selLocal]);

  if (loading) return <div style={{ textAlign: "center", padding: "3rem", color: MUTED }}>Cargando análisis…</div>;
  if (error)   return <div style={{ color: RED, padding: "1rem" }}>Error: {error}</div>;
  if (!data)   return null;

  const locales = data.locales ?? [];

  const k           = data.kpis ?? {};
  const totalPed    = Number(k.total_pedidos) || 0;
  const totalFuera  = Number(k.fuera_obj)     || 0;
  const cumplPct    = pct(Number(k.dentro_obj), totalPed);
  const avgMin      = Number(k.avg_min_entrega) || 0;

  const cT = Number(k.causa_tienda)     || 0;
  const cA = Number(k.causa_asignacion) || 0;
  const cV = Number(k.causa_viaje)      || 0;
  const cR = Number(k.causa_reparto)    || 0;

  const porPol  = data.porPoligono ?? [];
  const porHora = data.porHora     ?? [];
  const condTop = (data.conductores ?? []).slice(0, 20);
  const maxCond = Math.max(...condTop.map((r) => Number(r.total)), 1);

  // Brecha filtrada por semanas
  const brechaFilt = (data.brecha ?? []).filter((r) => {
    const n = parseInt(r.semana.replace(/\D/g, ""), 10);
    return selSemanas.includes(n);
  });
  const brechaPol = {};
  for (const r of brechaFilt) {
    if (!brechaPol[r.poligono]) brechaPol[r.poligono] = { prog: 0, asist: 0 };
    brechaPol[r.poligono].prog  += r.programados;
    brechaPol[r.poligono].asist += r.asistentes;
  }
  const brechaRows = Object.entries(brechaPol)
    .map(([pol, v]) => ({ pol, prog: v.prog, asist: v.asist, aus: pct(v.prog - v.asist, v.prog) }))
    .sort((a, b) => b.aus - a.aus);

  // Hora chart
  const horaMap = {};
  for (const r of porHora) horaMap[Number(r.hora)] = r;
  const horaFull = Array.from({ length: 24 }, (_, i) => horaMap[i] ?? { hora: i, total: 0, dentro_obj: 0 });
  const maxHora  = Math.max(...horaFull.map((r) => Number(r.total)), 1);

  const etapas = [
    { label: "🏪 Prep. en tienda",   avg: Number(k.avg_prep)       || 0, benchmark: 25 },
    { label: "🔄 Asignación driver",  avg: Number(k.avg_asignacion) || 0, benchmark: 5  },
    { label: "🛣️ Viaje al local",      avg: Number(k.avg_viaje)      || 0, benchmark: 10 },
    { label: "📦 Reparto a cliente",  avg: Number(k.avg_reparto)    || 0, benchmark: 12 },
  ];

  return (
    <div style={{ paddingTop: "1rem" }}>

      {/* ── Filtro Local ──────────────────────────────────────────────────── */}
      {locales.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ color: MUTED, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Local</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["Todos", ...locales].map((loc) => (
              <button key={loc} onClick={() => setSelLocal(loc)} style={{
                padding: "4px 12px", borderRadius: 16,
                border: selLocal === loc ? "1px solid #3b82f6" : "1px solid #334155",
                background: selLocal === loc ? "rgba(59,130,246,0.18)" : "transparent",
                color: selLocal === loc ? "#93c5fd" : MUTED,
                fontSize: "0.73rem", fontWeight: selLocal === loc ? 600 : 400,
                cursor: "pointer", whiteSpace: "nowrap",
              }}>{loc}</button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
        <KpiCard label="Total pedidos"         value={totalPed.toLocaleString()} sub={`${desde} → ${hasta}`} />
        <KpiCard label="Cumplimiento ≤45 min"  value={`${cumplPct}%`}
          sub={`${Number(k.dentro_obj)||0} dentro / ${totalFuera} tardíos`}
          color={cumplPct >= 60 ? GREEN : cumplPct >= 40 ? YELLOW : RED} />
        <KpiCard label="Tiempo prom. entrega"  value={`${fmt1(avgMin)} min`}
          color={avgMin <= 45 ? GREEN : avgMin <= 60 ? YELLOW : RED} />
        <KpiCard label="Drivers activos"       value={Number(k.drivers_activos) || "—"} />
        <KpiCard label="Proveedores"           value={Number(k.proveedores) || "—"} />
      </div>

      {/* Árbol de causas */}
      <div style={{ ...card, marginBottom: "1rem" }}>
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "0.95rem", fontWeight: 700 }}>🔍 ¿Por qué llegan tarde?</h3>
        <p style={{ margin: "0 0 0.75rem", color: MUTED, fontSize: "0.75rem" }}>
          {totalFuera} pedidos fuera de objetivo — un pedido puede tener más de una causa
        </p>
        {totalFuera === 0 ? (
          <div style={{ color: GREEN }}>✅ Sin pedidos tardíos en el período</div>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <CausaCard icon="🏪" label="Tienda (>25 min)"      count={cT} pctVal={pct(cT, totalFuera)} totalFuera={totalFuera} color={RED}    />
            <CausaCard icon="🔄" label="Asignación (>5 min)"   count={cA} pctVal={pct(cA, totalFuera)} totalFuera={totalFuera} color={ORANGE} />
            <CausaCard icon="🛣️" label="Viaje al local (>10)"  count={cV} pctVal={pct(cV, totalFuera)} totalFuera={totalFuera} color={YELLOW} />
            <CausaCard icon="📦" label="Reparto (>12 min)"      count={cR} pctVal={pct(cR, totalFuera)} totalFuera={totalFuera} color={VIOLET} />
          </div>
        )}
      </div>

      {/* Etapas + Horas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1rem" }}>
        <div style={{ ...card }}>
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700 }}>⏱️ Tiempos por etapa</h3>
          {etapas.map((e) => <EtapaRow key={e.label} {...e} />)}
          <div style={{ fontSize: "0.68rem", color: MUTED, marginTop: 4 }}>
            <span style={{ color: YELLOW }}>│</span> Objetivo &nbsp;
            <span style={{ color: GREEN }}>■</span> Dentro &nbsp;
            <span style={{ color: RED }}>■</span> Excede
          </div>
        </div>

        <div style={{ ...card }}>
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700 }}>🕐 Pedidos por hora</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 110 }}>
            {horaFull.map((r) => {
              const tot  = Number(r.total);
              const barH = tot === 0 ? 0 : Math.max(3, Math.round((tot / maxHora) * 100));
              const p45  = tot === 0 ? 0 : pct(Number(r.dentro_obj), tot);
              const col  = p45 >= 60 ? GREEN : p45 >= 40 ? YELLOW : tot === 0 ? BORDER : RED;
              return (
                <div key={r.hora} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  <div title={`${r.hora}h: ${tot} pedidos, ${p45}% ≤45 min`}
                    style={{ width: "100%", height: barH, background: col, borderRadius: "2px 2px 0 0", minHeight: tot > 0 ? 3 : 0 }} />
                  {r.hora % 3 === 0 && <span style={{ fontSize: "0.52rem", color: MUTED }}>{r.hora}</span>}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: "0.68rem", color: MUTED, marginTop: 6 }}>
            Color = % cumplimiento &nbsp;
            <span style={{ color: GREEN }}>■</span> ≥60% &nbsp;
            <span style={{ color: YELLOW }}>■</span> 40–60% &nbsp;
            <span style={{ color: RED }}>■</span> &lt;40%
          </div>
        </div>
      </div>

      {/* Por polígono */}
      {porPol.length > 0 && (
        <div style={{ ...card, marginBottom: "1rem", overflowX: "auto" }}>
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700 }}>🗺️ Rendimiento por Polígono</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Polígono","Pedidos","% OK","Avg min","Tienda","Asig.","Viaje","Reparto"].map((h) => (
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
      )}

      {/* Brecha de turnos */}
      <div style={{ ...card, marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>👥 Brecha de Turnos</h3>
          <span style={{ color: MUTED, fontSize: "0.7rem" }}>
            Semanas: {selSemanas.map(s => `S${s}`).join(", ")}
          </span>
        </div>
        {brechaRows.length === 0 ? (
          <p style={{ color: MUTED, fontSize: "0.78rem" }}>Sin datos para las semanas seleccionadas.</p>
        ) : (() => {
          const totalProg  = brechaRows.reduce((s, r) => s + r.prog,  0);
          const totalAsist = brechaRows.reduce((s, r) => s + r.asist, 0);
          const totalAus   = totalProg - totalAsist;
          const ausPct     = totalProg > 0 ? ((totalAus / totalProg) * 100).toFixed(1) : "0.0";
          const conProblema = brechaRows.filter((r) => r.prog - r.asist > 0).sort((a, b) => b.aus - a.aus);
          return (
            <>
              {/* KPI cards resumen */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: "1rem" }}>
                {[
                  { label: "Programados",       val: totalProg,    color: TEXT   },
                  { label: "Asistentes",         val: totalAsist,   color: GREEN  },
                  { label: "Ausentes",           val: totalAus,     color: totalAus > 0 ? RED : GREEN },
                  { label: "Ausentismo global",  val: `${ausPct}%`, color: parseFloat(ausPct) >= 15 ? RED : parseFloat(ausPct) >= 8 ? YELLOW : GREEN },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: "0.68rem", color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 700, color }}>{val}</div>
                  </div>
                ))}
              </div>
              {/* Tabla solo con polígonos con ausentes */}
              {conProblema.length === 0 ? (
                <p style={{ color: GREEN, fontSize: "0.78rem" }}>✓ Sin ausentes en las semanas seleccionadas.</p>
              ) : (
                <>
                  <div style={{ fontSize: "0.68rem", color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Polígonos con ausentes ({conProblema.length})
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                        {["Polígono","Prog.","Asist.","Ausentes","Ausentismo"].map((h) => (
                          <th key={h} style={{ padding: "5px 8px", textAlign: h === "Polígono" ? "left" : "right", color: MUTED, fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {conProblema.map((r, i) => {
                        const aus = r.prog - r.asist;
                        const col = r.aus >= 20 ? RED : r.aus >= 10 ? YELLOW : GREEN;
                        return (
                          <tr key={r.pol} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                            <td style={{ padding: "6px 8px", color: TEXT }}>{r.pol}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right", color: MUTED }}>{r.prog}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right", color: GREEN }}>{r.asist}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right", color: RED, fontWeight: 600 }}>{aus}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right" }}><span style={{ color: col, fontWeight: 700 }}>{r.aus}%</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </>
          );
        })()}
      </div>

      {/* Conductores */}
      {condTop.length > 0 && (
        <div style={{ ...card }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>🚀 Performance por Conductor</h3>
            <button onClick={() => setShowCond((v) => !v)}
              style={{ fontSize: "0.7rem", color: MUTED, background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
              {showCond ? "Ver menos" : "Ver todos"}
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["#","Conductor","Pedidos","% ≤Obj","Avg min","Actividad"].map((h) => (
                  <th key={h} style={{ padding: "5px 8px", textAlign: h === "Conductor" ? "left" : "right", color: MUTED, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(showCond ? condTop : condTop.slice(0, 8)).map((r, i) => {
                const p = Number(r.pct_ok) || 0;
                const c = p >= 60 ? GREEN : p >= 40 ? YELLOW : RED;
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: MUTED }}>{i + 1}</td>
                    <td style={{ padding: "6px 8px", color: TEXT }}>{r.nombre_conductor}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: MUTED }}>{Number(r.total)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}><span style={{ color: c, fontWeight: 700 }}>{p}%</span></td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: Number(r.avg_min) > 45 ? RED : GREEN }}>{fmt1(r.avg_min)}</td>
                    <td style={{ padding: "6px 8px", width: 100 }}><Bar pct={(Number(r.total) / maxCond) * 100} color={BLUE} height={5} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Detalle de Pedidos ─────────────────────────────────────────────── */}
      <PedidosTable pedidos={data.pedidos ?? []} />

    </div>
  );
}
