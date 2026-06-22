import React, { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
} from "recharts";
import NavBar from "../components/NavBar";

const ALL_SEMANAS = [21, 22, 23, 24];
const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#f97316","#06b6d4","#84cc16","#ec4899","#eab308"];
const BG="#0a0f1e", SURFACE="#111827", CARD="#1a2236";
const BORDER="#1f2d45", BORDER2="#263348", TEXT="#f8fafc", TEXT2="#94a3b8", ACCENT="#3b82f6";
const UP="#10b981", DOWN="#ef4444";

const n = (v) => parseFloat(v) || 0;
const pct = (curr, prev) =>
  prev > 0 ? parseFloat(((curr - prev) / prev * 100).toFixed(1)) : null;

const TT = {
  contentStyle: { backgroundColor: "#0d1626", border: "1px solid #1f2d45", borderRadius: 8, fontSize: 12 },
  labelStyle: { color: TEXT, fontWeight: 600 },
  itemStyle: { color: "#cbd5e1" },
};

const pieLabel = ({ name, percent }) =>
  (percent ?? 0) > 0.04
    ? (name ?? "").replace("Pol ", "") + " " + (((percent ?? 0) * 100).toFixed(0)) + "%"
    : "";

function getFood(pol) {
  if ((pol || "").startsWith("Pol") || (pol || "").startsWith("Tori") || (pol || "").startsWith("Hikari") || (pol || "").startsWith("Linterna")) return "Food";
  return "No Food";
}
function getPedidos(pol) {
  if ((pol || "").startsWith("Pol") || (pol || "").startsWith("Tori") || pol === "Flora y Fauna" || pol === "Tottus") return "Con Pedidos";
  return "Sin Pedidos";
}

function VarLabelTop(props) {
  const { x, y, width, value } = props;
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (isNaN(num)) return null;
  const col = num >= 0 ? UP : DOWN;
  return (
    <text x={(x || 0) + (width || 0) / 2} y={(y || 0) - 16} textAnchor="middle" fill={col} fontSize={9} fontWeight={700}>
      {num >= 0 ? "+" : ""}{num}%
    </text>
  );
}

function VarLabelTopInv(props) {
  const { x, y, width, value } = props;
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (isNaN(num)) return null;
  const col = num >= 0 ? DOWN : UP;
  return (
    <text x={(x || 0) + (width || 0) / 2} y={(y || 0) - 16} textAnchor="middle" fill={col} fontSize={9} fontWeight={700}>
      {num >= 0 ? "+" : ""}{num}%
    </text>
  );
}

function Pill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 14px", borderRadius: 20,
      border: active ? "1px solid " + ACCENT : "1px solid " + BORDER2,
      background: active ? "rgba(59,130,246,0.18)" : "transparent",
      color: active ? "#93c5fd" : TEXT2,
      fontSize: "0.76rem", fontWeight: active ? 600 : 400,
      cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
    }}>{label}</button>
  );
}

function KpiCard({ label, value, sub, color, deltaStr, inverse }) {
  const isUp = deltaStr?.startsWith("▲");
  const deltaColor = inverse ? (isUp ? DOWN : UP) : (isUp ? UP : DOWN);
  return (
    <div style={{ background: CARD, border: "1px solid " + BORDER, borderRadius: 12, padding: "1.25rem 1.5rem", borderTop: "3px solid " + (color || ACCENT) }}>
      <div style={{ color: TEXT2, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
      <div style={{ color: TEXT, fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: TEXT2, fontSize: "0.8rem", marginTop: 6 }}>{sub}</div>}
      {deltaStr && (
        <div style={{ color: deltaColor, fontSize: "0.7rem", marginTop: 6, fontWeight: 600 }}>{deltaStr}</div>
      )}
    </div>
  );
}

function SectionTitle({ title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "1.75rem 0 0.75rem" }}>
      <div style={{ width: 3, height: 18, background: ACCENT, borderRadius: 2 }} />
      <span style={{ color: TEXT2, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: BORDER }} />
    </div>
  );
}

function ChartCard({ title, children, span }) {
  return (
    <div style={{ background: CARD, border: "1px solid " + BORDER, borderRadius: 12, padding: "1.25rem 1.5rem", gridColumn: span ? "span " + span : undefined }}>
      <div style={{ color: TEXT, fontWeight: 600, fontSize: "0.82rem", marginBottom: "1rem", letterSpacing: "0.01em" }}>{title}</div>
      {children}
    </div>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: TEXT2, fontSize: "0.72rem", whiteSpace: "nowrap" }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ background: SURFACE, border: "1px solid " + BORDER2, borderRadius: 8, color: TEXT, fontSize: "0.76rem", padding: "5px 10px", cursor: "pointer", outline: "none" }}>
        <option value="Todos">Todos</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

const mkDelta = (v, prevS) =>
  v === null ? null : `${v >= 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(1)}% vs S${prevS}`;

export default function Operacional() {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selSemanas, setSelSemanas] = useState([22, 23, 24]);
  const [selFood, setSelFood] = useState("Food");
  const [selPedidos, setSelPedidos] = useState("Con Pedidos");
  const [selPoligono, setSelPoligono] = useState("Todos");
  const [selCliente, setSelCliente] = useState("Todos");
  const [selTienda, setSelTienda] = useState("Todos");
  const [selVehi, setSelVehi] = useState("Todos");
  const [activeTab, setActiveTab] = useState("costos");

  const [prog, setProg] = useState([]);
  const [progLoading, setProgLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ProgramacionCobertura")
      .then(r => r.json())
      .then(d => { setProg(Array.isArray(d) ? d : []); setProgLoading(false); })
      .catch(() => setProgLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/DriverCostSinDistribuir")
      .then(r => r.json())
      .then(d => { setRaw(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const base = useMemo(() => raw.filter(r => ALL_SEMANAS.includes(Number(r.Periodo))), [raw]);

  const allPoligonos = useMemo(() => [...new Set(base.map(r => r.Poligono).filter(Boolean))].sort(), [base]);
  const allClientes  = useMemo(() => [...new Set(base.map(r => r.Cliente).filter(Boolean))].sort(),  [base]);
  const allTiendas   = useMemo(() => [...new Set(base.map(r => r.Tienda).filter(Boolean))].sort(),   [base]);
  const allVehiculos = useMemo(() => [...new Set(base.map(r => r.Vehiculo).filter(Boolean))].sort(), [base]);

  const data = useMemo(() => base.filter(r => {
    if (!selSemanas.includes(Number(r.Periodo))) return false;
    const pol = r.Poligono || "";
    if (selFood     !== "Todos" && getFood(pol)    !== selFood)     return false;
    if (selPedidos  !== "Todos" && getPedidos(pol)  !== selPedidos)  return false;
    if (selPoligono !== "Todos" && r.Poligono       !== selPoligono) return false;
    if (selCliente  !== "Todos" && r.Cliente        !== selCliente)  return false;
    if (selTienda   !== "Todos" && r.Tienda         !== selTienda)   return false;
    if (selVehi     !== "Todos" && r.Vehiculo       !== selVehi)     return false;
    return true;
  }), [base, selSemanas, selFood, selPedidos, selPoligono, selCliente, selTienda, selVehi]);

  const poligonos  = useMemo(() => [...new Set(data.map(r => r.Poligono).filter(Boolean))].sort(), [data]);
  const semanas    = useMemo(() => selSemanas.slice().sort((a, b) => a - b), [selSemanas]);
  const lastSemana = useMemo(() => semanas[semanas.length - 1] ?? ALL_SEMANAS[ALL_SEMANAS.length - 1], [semanas]);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalPedidos  = data.reduce((a, r) => a + n(r["Q. Pedidos"]), 0);
    const totalHoras    = data.reduce((a, r) => a + n(r["Horas Real"]), 0);
    const totalCosto    = data.reduce((a, r) => a + n(r["Driver Cost"]), 0);
    const drivers       = new Set(data.map(r => r.Nombre)).size;
    const productividad = totalHoras > 0 ? totalPedidos / totalHoras : 0;
    const costoPorPedido= totalPedidos > 0 ? totalCosto / totalPedidos : 0;
    const planificadas  = data.reduce((a, r) => a + n(r.Horas), 0);
    const ef            = planificadas > 0 ? (totalHoras / planificadas) * 100 : 0;
    return { totalPedidos, totalHoras, totalCosto, drivers, productividad, costoPorPedido, eficiencia: ef };
  }, [data]);

  const kpiDelta = useMemo(() => {
    const lRows = data.filter(r => Number(r.Periodo) === lastSemana);
    const pRows = data.filter(r => Number(r.Periodo) === lastSemana - 1);
    const lPed  = lRows.reduce((a, r) => a + n(r["Q. Pedidos"]), 0);
    const pPed  = pRows.reduce((a, r) => a + n(r["Q. Pedidos"]), 0);
    const lCost = lRows.reduce((a, r) => a + n(r["Driver Cost"]), 0);
    const pCost = pRows.reduce((a, r) => a + n(r["Driver Cost"]), 0);
    const lHrs  = lRows.reduce((a, r) => a + n(r["Horas Real"]), 0);
    const pHrs  = pRows.reduce((a, r) => a + n(r["Horas Real"]), 0);
    const lProd = lHrs  > 0 ? lPed  / lHrs  : 0;
    const pProd = pHrs  > 0 ? pPed  / pHrs  : 0;
    const lCpp  = lPed  > 0 ? lCost / lPed  : 0;
    const pCpp  = pPed  > 0 ? pCost / pPed  : 0;
    const lDrv  = new Set(lRows.map(r => r.Nombre)).size;
    const pDrv  = new Set(pRows.map(r => r.Nombre)).size;
    const lPlan = lRows.reduce((a, r) => a + n(r.Horas), 0);
    const pPlan = pRows.reduce((a, r) => a + n(r.Horas), 0);
    const lEf   = lPlan > 0 ? lHrs / lPlan * 100 : 0;
    const pEf   = pPlan > 0 ? pHrs / pPlan * 100 : 0;
    return {
      pedidos: pRows.length ? pct(lPed,  pPed)  : null,
      costo:   pRows.length ? pct(lCost, pCost) : null,
      horas:   pRows.length ? pct(lHrs,  pHrs)  : null,
      prod:    pRows.length ? pct(lProd, pProd) : null,
      cpp:     pRows.length ? pct(lCpp,  pCpp)  : null,
      drivers: pRows.length ? pct(lDrv,  pDrv)  : null,
      ef:      pRows.length ? pct(lEf,   pEf)   : null,
      lPed, lCost, lHrs, lProd, lCpp, lDrv, lEf,
    };
  }, [data, lastSemana]);

  // ── Cobertura (Programación) ─────────────────────────────────────────────────
  const progFiltrado = useMemo(() => prog.filter(r => {
    if (!selSemanas.includes(Number(r.semana))) return false;
    if (selFood !== "Todos" && r.categoria !== selFood) return false;
    if (selPedidos !== "Todos" && getPedidos(r.poligono) !== selPedidos) return false;
    if (selPoligono !== "Todos" && r.poligono !== selPoligono) return false;
    return true;
  }), [prog, selSemanas, selFood, selPedidos, selPoligono]);

  const coberturaData = useMemo(() => semanas.map((s, i) => {
    const rows       = progFiltrado.filter(r => Number(r.semana) === s);
    const sinAsignar = rows.filter(r => r.nombre.trim() === "" || r.nombre.trim() === "-").length;
    const asignados  = rows.length - sinAsignar;
    const asistio    = rows.filter(r => (r.nombre.trim() !== "" && r.nombre.trim() !== "-") && !r.status.toLowerCase().includes("falta")).length;
    const faltas     = rows.filter(r => (r.nombre.trim() !== "" && r.nombre.trim() !== "-") && r.status.toLowerCase().includes("falta")).length;
    const pctCob     = asignados > 0 ? parseFloat((asistio / asignados * 100).toFixed(1)) : 0;
    const prevRows   = i > 0 ? progFiltrado.filter(r => Number(r.semana) === semanas[i - 1]) : [];
    const prevSinAsi = prevRows.filter(r => r.nombre.trim() === "" || r.nombre.trim() === "-").length;
    const prevAsi    = prevRows.filter(r => (r.nombre.trim() !== "" && r.nombre.trim() !== "-") && !r.status.toLowerCase().includes("falta")).length;
    const prevAsig   = prevRows.length - prevSinAsi;
    const prevPctCob = prevAsig > 0 ? prevAsi / prevAsig * 100 : 0;
    const tot = rows.length;
    return {
      semana: "S" + s, programados: tot, sinAsignar, asistio, faltas,
      pctCobertura: pctCob, varCobertura: i > 0 ? parseFloat((pctCob - prevPctCob).toFixed(1)) : null,
      pctCubierto: tot > 0 ? parseFloat((asistio   / tot * 100).toFixed(1)) : 0,
      pctFaltas:   tot > 0 ? parseFloat((faltas     / tot * 100).toFixed(1)) : 0,
      pctSinAsignar: tot > 0 ? parseFloat((sinAsignar / tot * 100).toFixed(1)) : 0,
    };
  }), [progFiltrado, semanas]);

  const coberturaPorPoligono = useMemo(() => {
    const rows = progFiltrado.filter(r => Number(r.semana) === lastSemana);
    const polMap = {};
    rows.forEach(r => {
      const pol = r.poligono || "Sin Polígono";
      if (!polMap[pol]) polMap[pol] = { total: 0, sinAsignar: 0, asistio: 0, faltas: 0 };
      polMap[pol].total++;
      const sinNombre = r.nombre.trim() === "" || r.nombre.trim() === "-";
      if (sinNombre) { polMap[pol].sinAsignar++; }
      else if (r.status.toLowerCase().includes("falta")) { polMap[pol].faltas++; }
      else { polMap[pol].asistio++; }
    });
    return Object.entries(polMap)
      .map(([pol, v], i) => ({
        pol: pol.replace("Pol ", ""),
        sinAsignar: v.sinAsignar, faltas: v.faltas, asistio: v.asistio, total: v.total,
        pctSinAsignar: v.total > 0 ? parseFloat((v.sinAsignar / v.total * 100).toFixed(1)) : 0,
        pctFaltas: v.total > 0 ? parseFloat((v.faltas / v.total * 100).toFixed(1)) : 0,
        pctCubierto: v.total > 0 ? parseFloat((v.asistio / v.total * 100).toFixed(1)) : 0,
        pct: (v.total - v.sinAsignar) > 0 ? parseFloat((v.asistio / (v.total - v.sinAsignar) * 100).toFixed(1)) : 0,
        color: COLORS[i % COLORS.length],
      }))
      .filter(r => r.sinAsignar + r.faltas > 0)
      .sort((a, b) => (b.pctFaltas + b.pctSinAsignar) - (a.pctFaltas + a.pctSinAsignar));
  }, [progFiltrado, lastSemana]);

  const kpiCobertura = useMemo(() => {
    const isSinAsi = (r) => r.nombre.trim() === "" || r.nombre.trim() === "-";
    const totalRows   = progFiltrado;
    const tSinAsignar = totalRows.filter(isSinAsi).length;
    const tAsignados  = totalRows.length - tSinAsignar;
    const tAsistio    = totalRows.filter(r => !isSinAsi(r) && !r.status.toLowerCase().includes("falta")).length;
    const tFaltas     = totalRows.filter(r => !isSinAsi(r) && r.status.toLowerCase().includes("falta")).length;
    const tPct        = tAsignados > 0 ? parseFloat((tAsistio / tAsignados * 100).toFixed(1)) : 0;
    const lastRows = progFiltrado.filter(r => Number(r.semana) === lastSemana);
    const prevRows = progFiltrado.filter(r => Number(r.semana) === lastSemana - 1);
    const sinAsignar  = lastRows.filter(isSinAsi).length;
    const pSinAsignar = prevRows.filter(isSinAsi).length;
    const asignados   = lastRows.length - sinAsignar;
    const pAsignados  = prevRows.length - pSinAsignar;
    const asistio     = lastRows.filter(r => !isSinAsi(r) && !r.status.toLowerCase().includes("falta")).length;
    const pAsistio    = prevRows.filter(r => !isSinAsi(r) && !r.status.toLowerCase().includes("falta")).length;
    const faltas      = lastRows.filter(r => !isSinAsi(r) && r.status.toLowerCase().includes("falta")).length;
    const pFaltas     = prevRows.filter(r => !isSinAsi(r) && r.status.toLowerCase().includes("falta")).length;
    const p           = asignados  > 0 ? asistio  / asignados  * 100 : 0;
    const pp          = pAsignados > 0 ? pAsistio / pAsignados * 100 : 0;
    const varPct      = prevRows.length > 0 ? parseFloat((p - pp).toFixed(1)) : null;
    const varSinAsi   = prevRows.length > 0 ? sinAsignar - pSinAsignar : null;
    const varFaltas   = prevRows.length > 0 ? faltas - pFaltas : null;
    const varAsistio  = prevRows.length > 0 ? asistio - pAsistio : null;
    const mkAbs = (v, label) =>
      v === null ? null : `${v >= 0 ? "▲" : "▼"} ${Math.abs(v)} ${label} vs S${lastSemana - 1}`;
    const mkPp = (v) =>
      v === null ? null : `${v >= 0 ? "▲" : "▼"} ${Math.abs(v)} pp vs S${lastSemana - 1}`;
    return {
      tPct, tSinAsignar, tFaltas, tAsistio, tTotal: totalRows.length,
      pct: p.toFixed(1), sinAsignar, faltas, asistio, total: lastRows.length,
      varPct, varSinAsi, varFaltas, varAsistio, mkAbs, mkPp,
    };
  }, [progFiltrado, lastSemana]);

  // ── Costos ───────────────────────────────────────────────────────────────────
  const costoTotalSemana = useMemo(() => semanas.map((s, i) => {
    const rows   = data.filter(r => Number(r.Periodo) === s);
    const costo  = parseFloat(rows.reduce((a, r) => a + n(r["Driver Cost"]), 0).toFixed(0));
    const pedidos= rows.reduce((a, r) => a + n(r["Q. Pedidos"]), 0);
    const cpp    = pedidos > 0 ? parseFloat((costo / pedidos).toFixed(2)) : 0;
    const prev   = i > 0 ? data.filter(r => Number(r.Periodo) === semanas[i - 1]) : [];
    const pCosto = prev.reduce((a, r) => a + n(r["Driver Cost"]), 0);
    const pPed   = prev.reduce((a, r) => a + n(r["Q. Pedidos"]), 0);
    const pCpp   = pPed > 0 ? pCosto / pPed : 0;
    return { semana: "S" + s, costo, cpp, varCosto: i > 0 ? pct(costo, pCosto) : null, varCpp: i > 0 ? pct(cpp, pCpp) : null };
  }), [data, semanas]);

  const costoPorCat = useMemo(() => semanas.map((s, i) => {
    const rows   = data.filter(r => Number(r.Periodo) === s);
    const food   = parseFloat(rows.filter(r => getFood(r.Poligono || "") === "Food").reduce((a, r) => a + n(r["Driver Cost"]), 0).toFixed(0));
    const noFood = parseFloat(rows.filter(r => getFood(r.Poligono || "") !== "Food").reduce((a, r) => a + n(r["Driver Cost"]), 0).toFixed(0));
    const prev   = i > 0 ? data.filter(r => Number(r.Periodo) === semanas[i - 1]) : [];
    const pFood  = prev.filter(r => getFood(r.Poligono || "") === "Food").reduce((a, r) => a + n(r["Driver Cost"]), 0);
    const pNoF   = prev.filter(r => getFood(r.Poligono || "") !== "Food").reduce((a, r) => a + n(r["Driver Cost"]), 0);
    return { semana: "S" + s, Food: food, "No Food": noFood, varFood: i > 0 ? pct(food, pFood) : null, varNoFood: i > 0 ? pct(noFood, pNoF) : null };
  }), [data, semanas]);

  // ── Productividad ─────────────────────────────────────────────────────────────
  const prodSemana = useMemo(() => semanas.map(s => {
    const entry = { semana: "S" + s };
    poligonos.forEach(pol => {
      const rows = data.filter(r => Number(r.Periodo) === s && r.Poligono === pol);
      const ped  = rows.reduce((a, r) => a + n(r["Q. Pedidos"]), 0);
      const hrs  = rows.reduce((a, r) => a + n(r["Horas Real"]), 0);
      entry[pol] = hrs > 0 ? parseFloat((ped / hrs).toFixed(2)) : 0;
    });
    return entry;
  }), [data, poligonos, semanas]);

  const horasSemana = useMemo(() => semanas.map((s, i) => {
    const rows  = data.filter(r => Number(r.Periodo) === s);
    const plan  = parseFloat(rows.reduce((a, r) => a + n(r.Horas), 0).toFixed(1));
    const real  = parseFloat(rows.reduce((a, r) => a + n(r["Horas Real"]), 0).toFixed(1));
    const dif   = parseFloat((real - plan).toFixed(1));
    const prev  = i > 0 ? data.filter(r => Number(r.Periodo) === semanas[i - 1]) : [];
    const pReal = parseFloat(prev.reduce((a, r) => a + n(r["Horas Real"]), 0).toFixed(1));
    return { semana: "S" + s, Programadas: plan, Reales: real, Diferencia: dif, varHoras: i > 0 ? pct(real, pReal) : null };
  }), [data, semanas]);

  const pedPorPoligono = useMemo(() => poligonos.map(pol => {
    const entry = { pol: pol.replace("Pol ", "") };
    semanas.forEach(s => {
      const rows = data.filter(r => r.Poligono === pol && Number(r.Periodo) === s);
      entry["S" + s] = rows.reduce((a, r) => a + n(r["Q. Pedidos"]), 0);
    });
    return entry;
  }), [data, poligonos, semanas]);

  const driversActivos = useMemo(() => semanas.map((s, i) => {
    const rows   = data.filter(r => Number(r.Periodo) === s);
    const total  = new Set(rows.map(r => r.Nombre)).size;
    const prev   = i > 0 ? data.filter(r => Number(r.Periodo) === semanas[i - 1]) : [];
    const pTotal = new Set(prev.map(r => r.Nombre)).size;
    return { semana: "S" + s, Drivers: total, varPct: i > 0 ? pct(total, pTotal) : null };
  }), [data, semanas]);

  const costoPoligono = useMemo(() => poligonos.map((pol, i) => {
    const rows   = data.filter(r => r.Poligono === pol);
    const costo  = parseFloat(rows.reduce((a, r) => a + n(r["Driver Cost"]), 0).toFixed(0));
    const rowsL  = rows.filter(r => Number(r.Periodo) === lastSemana);
    const rowsP  = rows.filter(r => Number(r.Periodo) === lastSemana - 1);
    const costoL = rowsL.reduce((a, r) => a + n(r["Driver Cost"]), 0);
    const costoP = rowsP.reduce((a, r) => a + n(r["Driver Cost"]), 0);
    return { pol: pol.replace("Pol ", ""), costo, varPct: pct(costoL, costoP), color: COLORS[i % COLORS.length] };
  }).sort((a, b) => b.costo - a.costo), [data, poligonos, lastSemana]);

  const costoPolLast = useMemo(() => poligonos.map((pol, i) => {
    const rowsL  = data.filter(r => r.Poligono === pol && Number(r.Periodo) === lastSemana);
    const rowsP  = data.filter(r => r.Poligono === pol && Number(r.Periodo) === lastSemana - 1);
    const costoL = parseFloat(rowsL.reduce((a, r) => a + n(r["Driver Cost"]), 0).toFixed(0));
    const costoP = rowsP.reduce((a, r) => a + n(r["Driver Cost"]), 0);
    return { pol: pol.replace("Pol ", ""), costoL, varPct: pct(costoL, costoP), color: COLORS[i % COLORS.length] };
  }).filter(r => r.costoL > 0).sort((a, b) => b.costoL - a.costoL), [data, poligonos, lastSemana]);

  const prodGeneralSemana = useMemo(() => semanas.map((s, i) => {
    const rows  = data.filter(r => Number(r.Periodo) === s);
    const ped   = rows.reduce((a, r) => a + n(r["Q. Pedidos"]), 0);
    const hrs   = rows.reduce((a, r) => a + n(r["Horas Real"]), 0);
    const prod  = hrs > 0 ? parseFloat((ped / hrs).toFixed(3)) : 0;
    const prev  = i > 0 ? data.filter(r => Number(r.Periodo) === semanas[i-1]) : [];
    const pPed  = prev.reduce((a, r) => a + n(r["Q. Pedidos"]), 0);
    const pHrs  = prev.reduce((a, r) => a + n(r["Horas Real"]), 0);
    const pProd = pHrs > 0 ? pPed / pHrs : 0;
    return { semana: "S" + s, prod, varProd: i > 0 ? pct(prod, pProd) : null };
  }), [data, semanas]);

  const piePoligono = useMemo(() => poligonos.map((pol, i) => {
    const rows = data.filter(r => r.Poligono === pol);
    return { name: pol, value: rows.reduce((a, r) => a + n(r["Q. Pedidos"]), 0), color: COLORS[i % COLORS.length] };
  }).filter(d => d.value > 0), [data, poligonos]);

  const topDrivers = useMemo(() => {
    const map = {};
    data.forEach(r => {
      if (!map[r.Nombre]) map[r.Nombre] = { ped: 0, hrs: 0, poligono: r.Poligono };
      map[r.Nombre].ped += n(r["Q. Pedidos"]);
      map[r.Nombre].hrs += n(r["Horas Real"]);
    });
    return Object.entries(map)
      .map(([nombre, v]) => ({
        nombre: nombre.split(" ").slice(0, 2).join(" "),
        prod: v.hrs > 0 ? parseFloat((v.ped / v.hrs).toFixed(2)) : 0,
        pedidos: v.ped, horas: parseFloat(v.hrs.toFixed(1)), poligono: v.poligono,
      }))
      .filter(d => d.prod > 0).sort((a, b) => b.prod - a.prod).slice(0, 10);
  }, [data]);

  const resumenPoligono = useMemo(() => poligonos.map((pol, i) => {
    const rows   = data.filter(r => r.Poligono === pol);
    const rowsL  = rows.filter(r => Number(r.Periodo) === lastSemana);
    const rowsP  = rows.filter(r => Number(r.Periodo) === lastSemana - 1);
    const pedidos   = rows.reduce((a, r) => a + n(r["Q. Pedidos"]), 0);
    const horas     = parseFloat(rows.reduce((a, r) => a + n(r["Horas Real"]), 0).toFixed(1));
    const costo     = parseFloat(rows.reduce((a, r) => a + n(r["Driver Cost"]), 0).toFixed(0));
    const driversLast = new Set(rowsL.map(r => r.Nombre)).size;
    const pedL  = rowsL.reduce((a, r) => a + n(r["Q. Pedidos"]), 0);
    const pedP  = rowsP.reduce((a, r) => a + n(r["Q. Pedidos"]), 0);
    const cosL  = rowsL.reduce((a, r) => a + n(r["Driver Cost"]), 0);
    const cosP  = rowsP.reduce((a, r) => a + n(r["Driver Cost"]), 0);
    const hrsL  = rowsL.reduce((a, r) => a + n(r["Horas Real"]), 0);
    const hrsP  = rowsP.reduce((a, r) => a + n(r["Horas Real"]), 0);
    const prodL = hrsL > 0 ? pedL / hrsL : 0;
    const prodP = hrsP > 0 ? pedP / hrsP : 0;
    const cppL  = pedL > 0 ? cosL / pedL : 0;
    const cppP  = pedP > 0 ? cosP / pedP : 0;
    return {
      poligono: pol, pedidos, horas, costo, driversLast, color: COLORS[i % COLORS.length],
      varPed:   rowsP.length ? pct(pedL,  pedP)  : null,
      varCosto: rowsP.length ? pct(cosL,  cosP)  : null,
      varProd:  rowsP.length ? pct(prodL, prodP) : null,
      varCpp:   rowsP.length ? pct(cppL,  cppP)  : null,
    };
  }), [data, poligonos, lastSemana]);

  const resumenPoligonoSorted = useMemo(() =>
    [...resumenPoligono].sort((a, b) => {
      const pA = a.horas > 0 ? a.pedidos / a.horas : 0;
      const pB = b.horas > 0 ? b.pedidos / b.horas : 0;
      return pB - pA;
    })
  , [resumenPoligono]);

  const driversPorPoligono = useMemo(() => poligonos.map((pol, ci) => {
    const rows = data.filter(r => r.Poligono === pol);
    const map = {};
    rows.forEach(r => {
      const s = Number(r.Periodo);
      if (!map[r.Nombre]) map[r.Nombre] = {};
      if (!map[r.Nombre][s]) map[r.Nombre][s] = { ped: 0, hrs: 0 };
      map[r.Nombre][s].ped += n(r["Q. Pedidos"]);
      map[r.Nombre][s].hrs += n(r["Horas Real"]);
    });
    const drvs = Object.entries(map)
      .filter(([, semMap]) => { const last = semMap[lastSemana]; return last && last.hrs > 0; })
      .map(([nombre, semMap]) => {
        const totalPed  = Object.values(semMap).reduce((a, v) => a + v.ped, 0);
        const totalHrs  = Object.values(semMap).reduce((a, v) => a + v.hrs, 0);
        const totalProd = totalHrs > 0 ? parseFloat((totalPed / totalHrs).toFixed(2)) : 0;
        const bySemana = {};
        semanas.forEach(s => {
          const sv = semMap[s];
          bySemana[s] = sv && sv.hrs > 0 ? (sv.ped / sv.hrs).toFixed(2) : "-";
        });
        return { nombre, totalProd, bySemana };
      }).filter(d => d.totalProd > 0).sort((a, b) => b.totalProd - a.totalProd);
    return { pol, ci, drvs };
  }), [data, poligonos, semanas, lastSemana]);

  const toggleSemana = (s) =>
    setSelSemanas(prev => prev.includes(s) ? (prev.length > 1 ? prev.filter(x => x !== s) : prev) : [...prev, s]);

  if (loading) return (
    <>
      <NavBar />
      <div style={{ background: BG, minHeight: "calc(100vh - 48px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ width: 40, height: 40, border: "3px solid " + BORDER2, borderTopColor: ACCENT, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ color: TEXT2, fontSize: "0.85rem" }}>Cargando datos...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  );
  if (error) return (
    <>
      <NavBar />
      <div style={{ background: BG, minHeight: "calc(100vh - 48px)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171", fontFamily: "system-ui" }}>
        Error: {error}
      </div>
    </>
  );

  const prevS = lastSemana - 1;
  const fv    = (v) => {
    if (v === null) return <span style={{ color: TEXT2 }}>-</span>;
    const c = v >= 0 ? UP : DOWN;
    return <span style={{ color: c, fontWeight: 600 }}>{v >= 0 ? "▲" : "▼"} {Math.abs(v).toFixed(1)}%</span>;
  };
  const fvInv = (v) => {
    if (v === null) return <span style={{ color: TEXT2 }}>-</span>;
    const c = v >= 0 ? DOWN : UP;
    return <span style={{ color: c, fontWeight: 600 }}>{v >= 0 ? "▲" : "▼"} {Math.abs(v).toFixed(1)}%</span>;
  };

  return (
    <>
      <Head><title>Dashboard Operacional — Logística</title></Head>
      <NavBar />
      <div style={{ background: BG, minHeight: "calc(100vh - 48px)", fontFamily: "'Inter', system-ui, sans-serif" }}>

        {/* Sub-header */}
        <div style={{ background: SURFACE, borderBottom: "1px solid " + BORDER, padding: "0 2rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {(["costos", "productividad"]).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "6px 18px", borderRadius: 8, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
                  border: activeTab === tab ? "1px solid " + ACCENT : "1px solid " + BORDER2,
                  background: activeTab === tab ? "rgba(59,130,246,0.18)" : "transparent",
                  color: activeTab === tab ? "#93c5fd" : TEXT2,
                  textTransform: "capitalize", transition: "all 0.15s",
                }}>{tab === "costos" ? "💰 Costos" : "📈 Productividad"}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: UP }} />
              <span style={{ color: TEXT2, fontSize: "0.72rem" }}>{data.length.toLocaleString()} registros</span>
            </div>
          </div>
        </div>

        <div style={{ padding: "1.25rem 2rem" }}>

          {/* Filtros */}
          <div style={{ background: CARD, border: "1px solid " + BORDER, borderRadius: 12, padding: "0.9rem 1.25rem", marginBottom: "1.25rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.9rem" }}>
            <span style={{ color: TEXT2, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Filtros</span>
            <div style={{ width: 1, height: 18, background: BORDER2 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: TEXT2, fontSize: "0.72rem" }}>Semana</span>
              {ALL_SEMANAS.map(s => <Pill key={s} label={"S" + s} active={selSemanas.includes(s)} onClick={() => toggleSemana(s)} />)}
            </div>
            <div style={{ width: 1, height: 18, background: BORDER2 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: TEXT2, fontSize: "0.72rem" }}>Tipo</span>
              {["Todos", "Food", "No Food"].map(cat => (
                <Pill key={cat} label={cat} active={selFood === cat} onClick={() => setSelFood(cat)} />
              ))}
            </div>
            <div style={{ width: 1, height: 18, background: BORDER2 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: TEXT2, fontSize: "0.72rem" }}>Pedidos</span>
              {["Todos", "Con Pedidos", "Sin Pedidos"].map(cat => (
                <Pill key={cat} label={cat} active={selPedidos === cat} onClick={() => setSelPedidos(cat)} />
              ))}
            </div>
            <div style={{ width: 1, height: 18, background: BORDER2 }} />
            <Select label="Poligono" value={selPoligono} options={allPoligonos} onChange={setSelPoligono} />
            <Select label="Cliente"  value={selCliente}  options={allClientes}  onChange={setSelCliente} />
            <Select label="Tienda"   value={selTienda}   options={allTiendas}   onChange={setSelTienda} />
            <Select label="Vehiculo" value={selVehi}     options={allVehiculos} onChange={setSelVehi} />
            <button onClick={() => { setSelSemanas([...ALL_SEMANAS]); setSelFood("Todos"); setSelPedidos("Todos"); setSelPoligono("Todos"); setSelCliente("Todos"); setSelTienda("Todos"); setSelVehi("Todos"); }}
              style={{ marginLeft: "auto", padding: "5px 14px", borderRadius: 8, border: "1px solid " + BORDER2, background: "transparent", color: TEXT2, fontSize: "0.72rem", cursor: "pointer" }}>
              Limpiar
            </button>
          </div>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <KpiCard label="Pedidos Totales"    value={kpis.totalPedidos.toLocaleString()}
              sub={`S${lastSemana}: ${kpiDelta.lPed.toLocaleString()} ped.`}
              color="#3b82f6" deltaStr={mkDelta(kpiDelta.pedidos, prevS)} />
            {activeTab === "costos" && <>
              <KpiCard label="Horas Trabajadas" value={Math.round(kpis.totalHoras).toLocaleString()}
                sub={`S${lastSemana}: ${Math.round(kpiDelta.lHrs).toLocaleString()} hrs`}
                color="#10b981" deltaStr={mkDelta(kpiDelta.horas, prevS)} />
              <KpiCard label="Costo de Drivers" value={"S/ " + Math.round(kpis.totalCosto).toLocaleString()}
                sub={`S${lastSemana}: S/ ${Math.round(kpiDelta.lCost).toLocaleString()}`}
                color="#f59e0b" deltaStr={mkDelta(kpiDelta.costo, prevS)} inverse />
            </>}
            {activeTab === "productividad" && <>
              <KpiCard label="Productividad"    value={kpis.productividad.toFixed(2)}
                sub={`S${lastSemana}: ${kpiDelta.lProd.toFixed(2)} ped/hr`}
                color="#8b5cf6" deltaStr={mkDelta(kpiDelta.prod, prevS)} />
              <KpiCard label="Drivers Activos"  value={kpis.drivers.toString()}
                sub={`S${lastSemana}: ${kpiDelta.lDrv} drivers`}
                color="#06b6d4" deltaStr={mkDelta(kpiDelta.drivers, prevS)} />
            </>}
            <KpiCard label="Costo / Pedido"     value={kpis.costoPorPedido > 0 ? "S/ " + kpis.costoPorPedido.toFixed(2) : "-"}
              sub={`S${lastSemana}: S/ ${kpiDelta.lCpp.toFixed(2)}`}
              color="#f97316" deltaStr={mkDelta(kpiDelta.cpp, prevS)} inverse />
            <KpiCard label="Eficiencia Horaria" value={kpis.eficiencia.toFixed(1) + "%"}
              sub={`S${lastSemana}: ${kpiDelta.lEf.toFixed(1)}%`}
              color="#84cc16" deltaStr={mkDelta(kpiDelta.ef, prevS)} />
          </div>

          {/* ── COSTOS ─────────────────────────────────────────────────────── */}
          {activeTab === "costos" && <>
            <SectionTitle title="Costos Semana a Semana" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "0.75rem" }}>
              <ChartCard title="Costo Total por Semana (S/)">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={costoTotalSemana} margin={{ top: 34, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis dataKey="semana" stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} />
                    <YAxis stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} />
                    <Tooltip {...TT} />
                    <Bar dataKey="costo" fill="#f59e0b" radius={[6,6,0,0]}>
                      <LabelList dataKey="costo" position="top" style={{ fill: "#fcd34d", fontSize: 10 }} formatter={v => "S/" + Number(v).toLocaleString()} />
                      <LabelList dataKey="varCosto" content={VarLabelTopInv} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Costo por Pedido (S/)">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={costoTotalSemana} margin={{ top: 34, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis dataKey="semana" stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} />
                    <YAxis stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} />
                    <Tooltip {...TT} />
                    <Bar dataKey="cpp" name="S/ / pedido" fill="#f97316" radius={[6,6,0,0]}>
                      <LabelList dataKey="cpp" position="top" style={{ fill: "#fed7aa", fontSize: 10 }} formatter={v => "S/" + v} />
                      <LabelList dataKey="varCpp" content={VarLabelTopInv} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Costo Food vs No Food (S/)">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={costoPorCat} margin={{ top: 34, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis dataKey="semana" stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} />
                    <YAxis stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} />
                    <Tooltip {...TT} />
                    <Legend wrapperStyle={{ color: TEXT2, fontSize: 11 }} />
                    <Bar dataKey="Food" fill="#3b82f6" radius={[4,4,0,0]}>
                      <LabelList dataKey="Food" position="top" style={{ fill: "#93c5fd", fontSize: 9 }} formatter={v => "S/" + Number(v).toLocaleString()} />
                      <LabelList dataKey="varFood" content={VarLabelTopInv} />
                    </Bar>
                    <Bar dataKey="No Food" fill="#f59e0b" radius={[4,4,0,0]}>
                      <LabelList dataKey="No Food" position="top" style={{ fill: "#fcd34d", fontSize: 9 }} formatter={v => "S/" + Number(v).toLocaleString()} />
                      <LabelList dataKey="varNoFood" content={VarLabelTopInv} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <div style={{ marginTop: "0.75rem" }}>
              <ChartCard title={`Costo por Polígono S${lastSemana} vs S${lastSemana - 1} (S/)`}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={costoPolLast} margin={{ top: 40, right: 8, left: 0, bottom: 48 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis dataKey="pol" stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 9 }} interval={0} angle={-30} textAnchor="end" />
                    <YAxis stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 10 }} />
                    <Tooltip {...TT} formatter={v => ["S/" + Number(v).toLocaleString(), "Costo"]} />
                    <Bar dataKey="costoL" name="Costo" fill="#f59e0b" radius={[6,6,0,0]}>
                      <LabelList dataKey="costoL" position="top" style={{ fill: "#fcd34d", fontSize: 9 }} formatter={v => "S/" + Number(v).toLocaleString()} />
                      <LabelList content={(props) => {
                        const entry = costoPolLast[Number(props.index)];
                        if (!entry || entry.varPct === null) return null;
                        const v = entry.varPct;
                        const col = v >= 0 ? DOWN : UP;
                        return (
                          <text x={(props.x || 0) + (props.width || 0) / 2} y={(props.y || 0) - 16} textAnchor="middle" fill={col} fontSize={9} fontWeight={700}>
                            {(v >= 0 ? "+" : "") + v + "%"}
                          </text>
                        );
                      }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </>}

          {/* ── PRODUCTIVIDAD ───────────────────────────────────────────────── */}
          {activeTab === "productividad" && <>
            <SectionTitle title="Tendencias por Semana" />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem" }}>
              <ChartCard title="Productividad por Polígono (pedidos/hora)">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={prodSemana} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis dataKey="semana" stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} />
                    <YAxis stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} />
                    <Tooltip {...TT} />
                    <Legend wrapperStyle={{ color: TEXT2, fontSize: 11, paddingTop: 8 }} />
                    {poligonos.map((pol, i) => (
                      <Line key={pol} type="monotone" dataKey={pol} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={{ r: 4, fill: COLORS[i % COLORS.length] }} activeDot={{ r: 6 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Horas Programadas vs Reales">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={horasSemana} margin={{ top: 34, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis dataKey="semana" stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} />
                    <YAxis stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} />
                    <Tooltip {...TT} />
                    <Legend wrapperStyle={{ color: TEXT2, fontSize: 11 }} />
                    <Bar dataKey="Programadas" fill="#3b82f6" radius={[4,4,0,0]}>
                      <LabelList dataKey="Programadas" position="top" style={{ fill: TEXT2, fontSize: 9 }} />
                    </Bar>
                    <Bar dataKey="Reales" fill="#10b981" radius={[4,4,0,0]}>
                      <LabelList dataKey="Reales" position="top" style={{ fill: TEXT2, fontSize: 9 }} />
                      <LabelList dataKey="varHoras" content={VarLabelTop} />
                    </Bar>
                    <Bar dataKey="Diferencia" fill="#f59e0b" radius={[4,4,0,0]} opacity={0.8}>
                      <LabelList dataKey="Diferencia" position="top" style={{ fill: "#fcd34d", fontSize: 9 }} formatter={v => { const num = Number(v); return (num > 0 ? "+" : "") + num; }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.75rem" }}>
              <ChartCard title="Productividad General por Semana (ped/hr)">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={prodGeneralSemana} margin={{ top: 24, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis dataKey="semana" stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} />
                    <YAxis stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} domain={[d => parseFloat((d * 0.995).toFixed(3)), d => parseFloat((d * 1.005).toFixed(3))]} />
                    <Tooltip {...TT} formatter={v => [v + " ped/hr", "Productividad"]} />
                    <Line type="monotone" dataKey="prod" name="Productividad" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5, fill: "#8b5cf6", strokeWidth: 0 }} activeDot={{ r: 7 }}>
                      <LabelList dataKey="prod" position="top" style={{ fill: "#c4b5fd", fontSize: 11, fontWeight: 700 }} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Pedidos Totales por Semana">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={costoTotalSemana.map((d, i) => ({
                    semana: d.semana,
                    pedidos: data.filter(r => Number(r.Periodo) === semanas[i]).reduce((a, r) => a + n(r["Q. Pedidos"]), 0),
                    varPed: i > 0 ? pct(
                      data.filter(r => Number(r.Periodo) === semanas[i]).reduce((a, r) => a + n(r["Q. Pedidos"]), 0),
                      data.filter(r => Number(r.Periodo) === semanas[i-1]).reduce((a, r) => a + n(r["Q. Pedidos"]), 0)
                    ) : null,
                  }))} margin={{ top: 24, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis dataKey="semana" stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} />
                    <YAxis stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} domain={[d => Math.floor(d * 0.98), d => Math.ceil(d * 1.02)]} />
                    <Tooltip {...TT} formatter={v => [Number(v).toLocaleString() + " ped.", "Pedidos"]} />
                    <Line type="monotone" dataKey="pedidos" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5, fill: "#3b82f6", strokeWidth: 0 }} activeDot={{ r: 7 }}>
                      <LabelList dataKey="pedidos" position="top" style={{ fill: "#93c5fd", fontSize: 11, fontWeight: 700 }} formatter={v => Number(v).toLocaleString()} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <SectionTitle title="Distribución Operacional" />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem" }}>
              <ChartCard title="Pedidos por Polígono y Semana">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={pedPorPoligono} margin={{ top: 4, right: 8, left: 0, bottom: 48 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis dataKey="pol" stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 10 }} interval={0} angle={-30} textAnchor="end" />
                    <YAxis stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 10 }} />
                    <Tooltip {...TT} />
                    <Legend wrapperStyle={{ color: TEXT2, fontSize: 10, paddingTop: 8 }} />
                    {semanas.map((s, i) => (
                      <Bar key={s} dataKey={"S" + s} fill={COLORS[i % COLORS.length]} radius={[4,4,0,0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Total Drivers Activos por Semana">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={driversActivos} margin={{ top: 34, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis dataKey="semana" stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} />
                    <YAxis stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} />
                    <Tooltip {...TT} />
                    <Bar dataKey="Drivers" fill={ACCENT} radius={[6,6,0,0]}>
                      <LabelList dataKey="Drivers" position="top" style={{ fill: TEXT2, fontSize: 10 }} />
                      <LabelList dataKey="varPct" content={VarLabelTop} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <SectionTitle title="Rendimiento de Equipo" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              <ChartCard title="Costo Total por Polígono (S/)">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={costoPoligono} layout="vertical" margin={{ top: 4, right: 100, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis type="number" stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 10 }} />
                    <YAxis type="category" dataKey="pol" stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 10 }} width={80} />
                    <Tooltip {...TT} />
                    <Bar dataKey="costo" fill={ACCENT} radius={[0,6,6,0]}>
                      <LabelList content={(props) => {
                        const entry = costoPoligono[Number(props.index)];
                        if (!entry) return null;
                        const rx = (props.x || 0) + (props.width || 0) + 4;
                        const ry = (props.y || 0) + (props.height || 0) / 2 + 4;
                        const v = entry.varPct;
                        const varStr = v !== null ? (v >= 0 ? " ▲+" : " ▼") + Math.abs(v) + "%" : "";
                        const varCol = v !== null ? (v >= 0 ? DOWN : UP) : TEXT2;
                        return (
                          <text x={rx} y={ry} fontSize={9}>
                            <tspan fill={TEXT2}>{"S/" + entry.costo.toLocaleString()}</tspan>
                            {v !== null && <tspan fill={varCol} fontWeight={700}>{varStr}</tspan>}
                          </text>
                        );
                      }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Top 10 Drivers por Productividad (ped/hr)">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topDrivers} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis type="number" stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 10 }} />
                    <YAxis type="category" dataKey="nombre" stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 9 }} width={110} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: "#0d1626", border: "1px solid " + BORDER, borderRadius: 8, padding: "0.65rem 1rem", fontSize: "0.78rem" }}>
                          <div style={{ color: TEXT, fontWeight: 700, marginBottom: 4 }}>{d.nombre}</div>
                          <div style={{ color: TEXT2 }}>Poligono: <span style={{ color: TEXT }}>{d.poligono}</span></div>
                          <div style={{ color: "#93c5fd", marginTop: 4 }}>Prod: {d.prod} ped/hr</div>
                          <div style={{ color: "#6ee7b7" }}>Pedidos: {d.pedidos}</div>
                          <div style={{ color: "#fcd34d" }}>Horas: {d.horas}</div>
                        </div>
                      );
                    }} />
                    <Bar dataKey="prod" radius={[0,6,6,0]}>
                      {topDrivers.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      <LabelList dataKey="prod" position="right" style={{ fill: TEXT2, fontSize: 9 }} formatter={v => String(v)} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Distribución de Pedidos por Polígono">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={piePoligono} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={3} label={pieLabel} labelLine={{ stroke: TEXT2, strokeWidth: 0.5 }}>
                      {piePoligono.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...TT} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Resumen ejecutivo */}
            <SectionTitle title="Resumen Ejecutivo por Polígono" />
            <div style={{ background: CARD, border: "1px solid " + BORDER, borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: SURFACE }}>
                    {["Polígono", "Drivers S"+lastSemana, "Pedidos", "Δ Ped", "Horas", "Costo", "Δ Costo", "Prod", "Δ Prod", "C/Ped", "Δ C/Ped"].map(h => (
                      <th key={h} style={{ color: TEXT2, fontWeight: 600, padding: "12px 12px", textAlign: "left", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid " + BORDER }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resumenPoligonoSorted.map((row, i) => {
                    const prod = row.horas > 0 ? (row.pedidos / row.horas).toFixed(2) : "-";
                    const cpp  = row.pedidos > 0 ? "S/ " + (row.costo / row.pedidos).toFixed(2) : "-";
                    return (
                      <tr key={row.poligono} style={{ borderBottom: i < resumenPoligonoSorted.length - 1 ? "1px solid " + BORDER : "none" }}>
                        <td style={{ padding: "11px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: row.color, flexShrink: 0 }} />
                            <span style={{ color: TEXT, fontWeight: 600 }}>{row.poligono}</span>
                          </div>
                        </td>
                        <td style={{ color: TEXT2, padding: "11px 12px", textAlign: "center" }}>{row.driversLast}</td>
                        <td style={{ color: TEXT,  padding: "11px 12px", fontWeight: 500 }}>{row.pedidos.toLocaleString()}</td>
                        <td style={{ padding: "11px 12px" }}>{fv(row.varPed)}</td>
                        <td style={{ color: TEXT,  padding: "11px 12px" }}>{row.horas.toLocaleString()}</td>
                        <td style={{ color: TEXT,  padding: "11px 12px" }}>S/ {row.costo.toLocaleString()}</td>
                        <td style={{ padding: "11px 12px" }}>{fvInv(row.varCosto)}</td>
                        <td style={{ padding: "11px 12px" }}>
                          <span style={{ background: "rgba(59,130,246,0.12)", color: "#93c5fd", padding: "3px 10px", borderRadius: 6, fontWeight: 600, fontSize: "0.78rem" }}>{prod}</span>
                        </td>
                        <td style={{ padding: "11px 12px" }}>{fv(row.varProd)}</td>
                        <td style={{ color: TEXT2, padding: "11px 12px" }}>{cpp}</td>
                        <td style={{ padding: "11px 12px" }}>{fvInv(row.varCpp)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Ranking por polígono */}
            <SectionTitle title={"Ranking de Drivers por Polígono — activos S" + lastSemana} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {driversPorPoligono.map(({ pol, ci, drvs }) => {
                if (drvs.length === 0) return null;
                const showSplit = drvs.length > 6;
                const topList   = showSplit ? drvs.slice(0, 3) : drvs;
                const botList   = showSplit ? [...drvs].slice(-3).reverse() : [];
                return (
                  <div key={pol} style={{ background: CARD, border: "1px solid " + BORDER, borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ background: SURFACE, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid " + BORDER }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[ci % COLORS.length], flexShrink: 0 }} />
                      <span style={{ color: TEXT, fontWeight: 700, fontSize: "0.82rem" }}>{pol}</span>
                      <span style={{ color: TEXT2, fontSize: "0.72rem", marginLeft: 4 }}>{drvs.length} activos · {showSplit ? "top 3 / bottom 3" : "todos"}</span>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                      <thead>
                        <tr style={{ background: "rgba(0,0,0,0.25)" }}>
                          <th style={{ color: TEXT2, fontWeight: 600, padding: "8px 12px", textAlign: "left", fontSize: "0.67rem", textTransform: "uppercase" }}>Driver</th>
                          <th style={{ color: TEXT2, fontWeight: 600, padding: "8px 12px", textAlign: "center", fontSize: "0.67rem", textTransform: "uppercase" }}>Total</th>
                          {semanas.map(s => (
                            <th key={s} style={{ color: TEXT2, fontWeight: 600, padding: "8px 12px", textAlign: "center", fontSize: "0.67rem", textTransform: "uppercase" }}>S{s}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {showSplit && (
                          <tr>
                            <td colSpan={semanas.length + 2} style={{ padding: "4px 12px 3px", background: "rgba(16,185,129,0.07)", borderTop: "1px solid " + BORDER }}>
                              <span style={{ color: UP, fontSize: "0.64rem", fontWeight: 700, textTransform: "uppercase" }}>▲ Más productivos</span>
                            </td>
                          </tr>
                        )}
                        {topList.map((d, ri) => (
                          <tr key={"top-" + d.nombre} style={{ borderTop: "1px solid " + BORDER, background: ri % 2 === 0 ? "transparent" : "rgba(0,0,0,0.08)" }}>
                            <td style={{ padding: "9px 12px", color: TEXT, fontWeight: 500, fontSize: "0.76rem" }}>{d.nombre}</td>
                            <td style={{ padding: "9px 12px", textAlign: "center" }}>
                              <span style={{ background: "rgba(16,185,129,0.14)", color: "#6ee7b7", padding: "2px 8px", borderRadius: 5, fontWeight: 700, fontSize: "0.75rem" }}>{d.totalProd}</span>
                            </td>
                            {semanas.map(s => (
                              <td key={s} style={{ padding: "9px 12px", textAlign: "center", color: d.bySemana[s] !== "-" ? "#a7f3d0" : TEXT2, fontSize: "0.75rem" }}>{d.bySemana[s]}</td>
                            ))}
                          </tr>
                        ))}
                        {botList.length > 0 && (
                          <>
                            <tr>
                              <td colSpan={semanas.length + 2} style={{ padding: "4px 12px 3px", background: "rgba(239,68,68,0.07)", borderTop: "1px solid " + BORDER }}>
                                <span style={{ color: DOWN, fontSize: "0.64rem", fontWeight: 700, textTransform: "uppercase" }}>▼ Menos productivos</span>
                              </td>
                            </tr>
                            {botList.map((d, ri) => (
                              <tr key={"bot-" + d.nombre} style={{ borderTop: "1px solid " + BORDER, background: ri % 2 === 0 ? "transparent" : "rgba(0,0,0,0.08)" }}>
                                <td style={{ padding: "9px 12px", color: TEXT, fontWeight: 500, fontSize: "0.76rem" }}>{d.nombre}</td>
                                <td style={{ padding: "9px 12px", textAlign: "center" }}>
                                  <span style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", padding: "2px 8px", borderRadius: 5, fontWeight: 700, fontSize: "0.75rem" }}>{d.totalProd}</span>
                                </td>
                                {semanas.map(s => (
                                  <td key={s} style={{ padding: "9px 12px", textAlign: "center", color: d.bySemana[s] !== "-" ? "#fecaca" : TEXT2, fontSize: "0.75rem" }}>{d.bySemana[s]}</td>
                                ))}
                              </tr>
                            ))}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>

            {/* Cobertura y Ausentismo */}
            <SectionTitle title={"Cobertura y Ausentismo — Programación S" + lastSemana} />
            {progLoading ? (
              <div style={{ color: TEXT2, fontSize: "0.78rem", padding: "1rem" }}>Cargando programación...</div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <KpiCard label="Cobertura Total"    value={kpiCobertura.tPct + "%"} color={UP}
                    sub={`S${lastSemana}: ${kpiCobertura.pct}%`}
                    deltaStr={kpiCobertura.mkPp(kpiCobertura.varPct)} />
                  <KpiCard label="Sin Asignar Total"  value={kpiCobertura.tSinAsignar.toString()} color={DOWN}
                    sub={`S${lastSemana}: ${kpiCobertura.sinAsignar} turnos`}
                    deltaStr={kpiCobertura.mkAbs(kpiCobertura.varSinAsi, "turnos")} inverse />
                  <KpiCard label="Faltas Total"        value={kpiCobertura.tFaltas.toString()} color="#f59e0b"
                    sub={`S${lastSemana}: ${kpiCobertura.faltas} faltas`}
                    deltaStr={kpiCobertura.mkAbs(kpiCobertura.varFaltas, "faltas")} inverse />
                  <KpiCard label="Asistencias Total"   value={kpiCobertura.tAsistio.toString()} color="#8b5cf6"
                    sub={`S${lastSemana}: ${kpiCobertura.asistio} de ${kpiCobertura.total}`}
                    deltaStr={kpiCobertura.mkAbs(kpiCobertura.varAsistio, "asist.")} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <ChartCard title="% Cobertura por Semana">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={coberturaData} margin={{ top: 34, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                          <XAxis dataKey="semana" stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} />
                          <YAxis stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} domain={[0, 100]} unit="%" />
                          <Tooltip {...TT} formatter={v => [v + "%", "Cobertura"]} />
                          <Bar dataKey="pctCobertura" name="% Cobertura" fill={UP} radius={[6,6,0,0]}>
                            <LabelList dataKey="pctCobertura" position="top" style={{ fill: "#6ee7b7", fontSize: 11, fontWeight: 700 }} formatter={v => v + "%"} />
                            <LabelList dataKey="varCobertura" content={VarLabelTop} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="Faltas y Sin Asignar por Semana">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={coberturaData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }} barSize={28}>
                          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                          <XAxis dataKey="semana" stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} />
                          <YAxis stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 11 }} />
                          <Tooltip {...TT} />
                          <Legend wrapperStyle={{ color: TEXT2, fontSize: 10 }} />
                          <Bar dataKey="faltas" name="Faltas" fill="#8b5cf6" radius={[4,4,0,0]}>
                            <LabelList dataKey="faltas" position="top" style={{ fill: "#c4b5fd", fontSize: 11, fontWeight: 700 }} />
                          </Bar>
                          <Bar dataKey="sinAsignar" name="Sin Asignar" fill="#ef4444" radius={[4,4,0,0]}>
                            <LabelList dataKey="sinAsignar" position="top" style={{ fill: "#fca5a5", fontSize: 11, fontWeight: 700 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </div>
                  <ChartCard title={"% Turnos sin Asignar y Faltas por Polígono (S" + lastSemana + ")"}>
                    {coberturaPorPoligono.length === 0 ? (
                      <div style={{ color: TEXT2, fontSize: "0.78rem", padding: "1rem", textAlign: "center" }}>Sin datos para S{lastSemana}</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={450}>
                        <BarChart data={coberturaPorPoligono} layout="vertical" barSize={14} margin={{ top: 4, right: 50, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                          <XAxis type="number" stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 10 }} unit="%" domain={[0, 100]} />
                          <YAxis type="category" dataKey="pol" stroke={TEXT2} tick={{ fill: TEXT2, fontSize: 9 }} width={90} />
                          <Tooltip {...TT} formatter={v => [v + "%"]} />
                          <Legend wrapperStyle={{ color: TEXT2, fontSize: 10 }} />
                          <Bar dataKey="pctCubierto" name="Cubierto" fill={UP} stackId="s">
                            <LabelList dataKey="pctCubierto" position="insideRight" style={{ fill: "#fff", fontSize: 9, fontWeight: 600 }} formatter={v => Number(v) > 5 ? v + "%" : ""} />
                          </Bar>
                          <Bar dataKey="pctFaltas" name="Faltas" fill="#8b5cf6" stackId="s">
                            <LabelList dataKey="pctFaltas" position="insideRight" style={{ fill: "#fff", fontSize: 9, fontWeight: 600 }} formatter={v => Number(v) > 2 ? v + "%" : ""} />
                          </Bar>
                          <Bar dataKey="pctSinAsignar" name="Sin Asignar" fill="#ef4444" stackId="s" radius={[0,4,4,0]}>
                            <LabelList dataKey="pctSinAsignar" position="right" style={{ fill: "#fca5a5", fontSize: 9 }} formatter={v => Number(v) > 0 ? v + "%" : ""} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </ChartCard>
                </div>
              </>
            )}
          </>}

          <div style={{ textAlign: "center", color: TEXT2, fontSize: "0.68rem", marginTop: "1.5rem", paddingBottom: "1rem" }}>
            Dashboard Operacional · Semanas {selSemanas.sort((a, b) => a - b).join(", ")} · Δ vs S{prevS}
          </div>
        </div>
      </div>
    </>
  );
}
