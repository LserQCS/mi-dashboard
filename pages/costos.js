import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, LabelList,
} from "recharts";

// ─── Tema ─────────────────────────────────────────────────────────────────────
const BG     = "#0f1117";
const CARD   = "#1a1d27";
const CARD2  = "#1f2235";
const TEXT   = "#e2e8f0";
const TEXT2  = "#8892a4";
const BORDER = "#2d3148";
const GREEN  = "#10b981";
const RED    = "#ef4444";
const BLUE   = "#3b82f6";
const AMBER  = "#f59e0b";
const PURPLE = "#8b5cf6";

const GRUPO_COLOR = {
  Lima:      "#3b82f6",
  Provincia: "#8b5cf6",
  NoFoods:   "#f59e0b",
  Wosak:     "#10b981",
  Otros:     "#6b7280",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const S = n => typeof n === "number" ? n.toLocaleString("es-PE") : n;
const pen = n => `S/ ${Math.round(n).toLocaleString("es-PE")}`;
const pct = n => (n * 100).toFixed(1) + "%";

function margenColor(m) {
  if (m >= 0.15) return GREEN;
  if (m >= 0.05) return AMBER;
  return RED;
}

// ─── KpiCard ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = BLUE, inverse = false }) {
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
      padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4,
    }}>
      <span style={{ fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ fontSize: 26, fontWeight: 700, color }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: TEXT2 }}>{sub}</span>}
    </div>
  );
}

// ─── ChartCard ────────────────────────────────────────────────────────────────

function ChartCard({ title, children, style = {} }) {
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
      padding: "20px 24px", ...style,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT2, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

// ─── Tooltip custom ───────────────────────────────────────────────────────────

function TooltipPEN({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: TEXT, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginTop: 2 }}>
          {p.name}: {pen(p.value)}
        </div>
      ))}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CostosPage() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // Filtros
  const [selGrupo, setSelGrupo]   = useState("Todos");
  const [selSemIni, setSelSemIni] = useState(1);
  const [selSemFin, setSelSemFin] = useState(24);

  useEffect(() => {
    fetch("/api/CostosGanancias")
      .then(r => r.json())
      .then(d => {
        setData(d);
        if (d.semanas?.length) {
          setSelSemIni(d.semanas[0]);
          setSelSemFin(d.semanas[d.semanas.length - 1]);
        }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // Semanas disponibles
  const semanas = useMemo(() => data?.semanas ?? [], [data]);

  // Evolución filtrada por semana
  const evolucion = useMemo(() => {
    if (!data) return [];
    return data.evolucionSemanal.filter(e => e.semana >= selSemIni && e.semana <= selSemFin);
  }, [data, selSemIni, selSemFin]);

  // Resumen clientes filtrado por grupo y semana
  const clientesFiltrados = useMemo(() => {
    if (!data) return [];
    // Si hay filtro de semana, necesitamos recalcular por semana
    // Usamos los datos de evolucionSemanal por cliente — en su defecto, resumenClientes global
    let rows = data.resumenClientes;
    if (selGrupo !== "Todos") rows = rows.filter(c => c.grupo === selGrupo);
    return rows;
  }, [data, selGrupo]);

  // Totales del período filtrado
  const totalesPeriodo = useMemo(() => {
    const ing  = evolucion.reduce((s, e) => s + e.ingreso, 0);
    const cos  = evolucion.reduce((s, e) => s + e.costo, 0);
    const yan  = evolucion.reduce((s, e) => s + e.costoYango, 0);
    const mar  = ing > 0 ? (ing - cos - yan) / ing : 0;
    return { ingreso: ing, costo: cos, costoYango: yan, margen: mar, utilidad: ing - cos - yan };
  }, [evolucion]);

  // Grupos disponibles
  const grupos = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.resumenClientes.map(c => c.grupo))].sort();
  }, [data]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Head><title>Costos y Ganancias · Danke</title></Head>
      <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "Inter, system-ui, sans-serif" }}>

        {/* Header */}
        <div style={{
          background: CARD, borderBottom: `1px solid ${BORDER}`,
          padding: "14px 32px", display: "flex", alignItems: "center",
          justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Danke · Dashboard</span>
            <nav style={{ display: "flex", gap: 4 }}>
              {[
                { href: "/",          label: "Disponibilidad" },
                { href: "/operacional", label: "Operacional"    },
                { href: "/costos",      label: "Costos"         },
              ].map(({ href, label }) => {
                const active = href === "/costos";
                return (
                  <Link key={href} href={href} style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                    textDecoration: "none",
                    background: active ? BLUE : "transparent",
                    color: active ? "#fff" : TEXT2,
                    border: active ? "none" : "1px solid transparent",
                  }}>
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 12, color: TEXT2, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: GREEN, display: "inline-block" }} />
              Control de Costos y Ganancias 2026
            </div>
            <Link href="/tabla" style={{
              fontSize: 12, fontWeight: 600, color: "#93c5fd",
              textDecoration: "none", padding: "4px 12px", borderRadius: 6,
              border: "1px solid #1e3a5f", background: "rgba(59,130,246,0.1)",
            }}>
              Tabla por semana →
            </Link>
          </div>
        </div>

        {/* Body */}
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 32px" }}>

          {loading && (
            <div style={{ color: TEXT2, textAlign: "center", padding: 80, fontSize: 14 }}>
              Cargando datos…
            </div>
          )}

          {error && (
            <div style={{
              background: "#1f0a0a", border: `1px solid ${RED}`, borderRadius: 10,
              padding: "16px 20px", color: RED, fontSize: 13,
            }}>
              Error: {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Filtros */}
              <div style={{
                display: "flex", gap: 12, flexWrap: "wrap",
                marginBottom: 24, alignItems: "center",
              }}>
                {/* Semana inicio */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: TEXT2 }}>Desde</span>
                  <select
                    value={selSemIni}
                    onChange={e => setSelSemIni(Number(e.target.value))}
                    style={{ background: CARD2, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 8, padding: "6px 10px", fontSize: 13 }}
                  >
                    {semanas.map(s => <option key={s} value={s}>S{s}</option>)}
                  </select>
                </div>
                {/* Semana fin */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: TEXT2 }}>Hasta</span>
                  <select
                    value={selSemFin}
                    onChange={e => setSelSemFin(Number(e.target.value))}
                    style={{ background: CARD2, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 8, padding: "6px 10px", fontSize: 13 }}
                  >
                    {semanas.map(s => <option key={s} value={s}>S{s}</option>)}
                  </select>
                </div>
                {/* Grupo */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: TEXT2 }}>Grupo</span>
                  <select
                    value={selGrupo}
                    onChange={e => setSelGrupo(e.target.value)}
                    style={{ background: CARD2, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 8, padding: "6px 10px", fontSize: 13 }}
                  >
                    <option value="Todos">Todos</option>
                    {grupos.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                {data.totales?.ingreso === 0 && (
                  <div style={{
                    marginLeft: "auto", fontSize: 11, color: AMBER, background: "#1c1500",
                    border: `1px solid ${AMBER}`, borderRadius: 6, padding: "4px 10px",
                  }}>
                    ⚠ Ingresos = 0: faltan env vars GSHEETS_NO_FOODS_URL y/o GSHEETS_YANGO_CSV_URL
                  </div>
                )}
              </div>

              {/* KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
                <KpiCard
                  label="Ingreso Total"
                  value={pen(totalesPeriodo.ingreso)}
                  sub={`S${selSemIni}–S${selSemFin}`}
                  color={BLUE}
                />
                <KpiCard
                  label="Costo Driver"
                  value={pen(totalesPeriodo.costo)}
                  sub="Sin Yango"
                  color={RED}
                />
                <KpiCard
                  label="Costo Yango"
                  value={pen(totalesPeriodo.costoYango)}
                  sub="Plataforma"
                  color={AMBER}
                />
                <KpiCard
                  label="Margen Neto"
                  value={pct(totalesPeriodo.margen)}
                  sub={`Utilidad: ${pen(totalesPeriodo.utilidad)}`}
                  color={margenColor(totalesPeriodo.margen)}
                />
              </div>

              {/* Evolución semanal */}
              <ChartCard title="Evolución Semanal — Ingreso vs Costo" style={{ marginBottom: 24 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={evolucion} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis dataKey="label" tick={{ fill: TEXT2, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: TEXT2, fontSize: 11 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `S/${(v/1000).toFixed(0)}k`} width={60} />
                    <Tooltip content={<TooltipPEN />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: TEXT2 }} />
                    <Line type="monotone" dataKey="ingreso"    name="Ingreso"    stroke={BLUE}   strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="costo"      name="Costo Driver" stroke={RED}  strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="costoYango" name="Costo Yango"  stroke={AMBER} strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Ingreso vs Costo por cliente */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                <ChartCard title="Ingreso vs Costo por Cliente">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={clientesFiltrados.slice(0, 12).map(c => ({
                        ...c, label: c.cliente,
                      }))}
                      layout="vertical"
                      margin={{ top: 4, right: 60, left: 0, bottom: 0 }}
                      barSize={10}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false} />
                      <XAxis type="number" tick={{ fill: TEXT2, fontSize: 10 }} axisLine={false} tickLine={false}
                        tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <YAxis dataKey="label" type="category" width={110}
                        tick={{ fill: TEXT2, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<TooltipPEN />} />
                      <Legend wrapperStyle={{ fontSize: 12, color: TEXT2 }} />
                      <Bar dataKey="ingreso" name="Ingreso"     fill={BLUE} radius={[0,4,4,0]} />
                      <Bar dataKey="costo"   name="Costo Driver" fill={RED} radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Margen % por cliente */}
                <ChartCard title="Margen Neto % por Cliente">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={clientesFiltrados
                        .filter(c => c.ingreso > 0)
                        .sort((a, b) => b.margenConYango - a.margenConYango)
                        .slice(0, 12)
                        .map(c => ({
                          label:  c.cliente,
                          margen: parseFloat((c.margenConYango * 100).toFixed(1)),
                          color:  margenColor(c.margenConYango),
                        }))}
                      layout="vertical"
                      margin={{ top: 4, right: 60, left: 0, bottom: 0 }}
                      barSize={12}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false} />
                      <XAxis type="number" tick={{ fill: TEXT2, fontSize: 10 }} axisLine={false} tickLine={false}
                        tickFormatter={v => v + "%"} domain={["auto", "auto"]} />
                      <YAxis dataKey="label" type="category" width={110}
                        tick={{ fill: TEXT2, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
                              <div style={{ color: TEXT, fontWeight: 600 }}>{label}</div>
                              <div style={{ color: payload[0]?.fill, marginTop: 4 }}>Margen: {payload[0]?.value}%</div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="margen" name="Margen %" radius={[0,4,4,0]}>
                        {clientesFiltrados
                          .filter(c => c.ingreso > 0)
                          .sort((a, b) => b.margenConYango - a.margenConYango)
                          .slice(0, 12)
                          .map((c, i) => (
                            <rect key={i} fill={margenColor(c.margenConYango)} />
                          ))}
                        <LabelList dataKey="margen" position="right"
                          style={{ fill: TEXT2, fontSize: 10, fontWeight: 600 }}
                          formatter={v => v + "%"} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* Tabla resumen */}
              <ChartCard title="Detalle por Cliente">
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                        {["Cliente", "Grupo", "Ingreso", "Costo Driver", "Costo Yango", "Utilidad", "Margen"].map(h => (
                          <th key={h} style={{ textAlign: h === "Cliente" || h === "Grupo" ? "left" : "right", padding: "8px 14px", color: TEXT2, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {clientesFiltrados.map((c, i) => {
                        const utilidad = c.ingreso - c.costo - c.costoYango;
                        return (
                          <tr key={c.cliente} style={{
                            borderBottom: i < clientesFiltrados.length - 1 ? `1px solid ${BORDER}` : "none",
                            background: i % 2 === 0 ? "transparent" : "#12151f",
                          }}>
                            <td style={{ padding: "10px 14px", color: TEXT, fontWeight: 600 }}>{c.cliente}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{
                                background: GRUPO_COLOR[c.grupo] + "22",
                                color: GRUPO_COLOR[c.grupo],
                                border: `1px solid ${GRUPO_COLOR[c.grupo]}44`,
                                borderRadius: 5, padding: "2px 8px", fontSize: 11,
                              }}>{c.grupo}</span>
                            </td>
                            <td style={{ padding: "10px 14px", color: BLUE, textAlign: "right" }}>{pen(c.ingreso)}</td>
                            <td style={{ padding: "10px 14px", color: RED, textAlign: "right" }}>{pen(c.costo)}</td>
                            <td style={{ padding: "10px 14px", color: AMBER, textAlign: "right" }}>{pen(c.costoYango)}</td>
                            <td style={{ padding: "10px 14px", color: utilidad >= 0 ? GREEN : RED, textAlign: "right", fontWeight: 600 }}>
                              {pen(utilidad)}
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "right" }}>
                              <span style={{
                                color: margenColor(c.margenConYango),
                                fontWeight: 700, fontSize: 13,
                              }}>
                                {pct(c.margenConYango)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Footer totales */}
                    <tfoot>
                      <tr style={{ borderTop: `2px solid ${BORDER}`, background: CARD2 }}>
                        <td colSpan={2} style={{ padding: "10px 14px", fontWeight: 700, color: TEXT }}>Total</td>
                        <td style={{ padding: "10px 14px", color: BLUE, textAlign: "right", fontWeight: 700 }}>
                          {pen(clientesFiltrados.reduce((s, c) => s + c.ingreso, 0))}
                        </td>
                        <td style={{ padding: "10px 14px", color: RED, textAlign: "right", fontWeight: 700 }}>
                          {pen(clientesFiltrados.reduce((s, c) => s + c.costo, 0))}
                        </td>
                        <td style={{ padding: "10px 14px", color: AMBER, textAlign: "right", fontWeight: 700 }}>
                          {pen(clientesFiltrados.reduce((s, c) => s + c.costoYango, 0))}
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700 }}>
                          {(() => {
                            const u = clientesFiltrados.reduce((s, c) => s + c.ingreso - c.costo - c.costoYango, 0);
                            return <span style={{ color: u >= 0 ? GREEN : RED }}>{pen(u)}</span>;
                          })()}
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700 }}>
                          {(() => {
                            const ing = clientesFiltrados.reduce((s, c) => s + c.ingreso, 0);
                            const cos = clientesFiltrados.reduce((s, c) => s + c.costo + c.costoYango, 0);
                            const m = ing > 0 ? (ing - cos) / ing : 0;
                            return <span style={{ color: margenColor(m) }}>{pct(m)}</span>;
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </ChartCard>

            </>
          )}
        </div>
      </div>
    </>
  );
}
