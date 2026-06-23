/**
 * GET /api/Analisis
 * Datos para el dashboard de Análisis Operacional.
 * Combina BigQuery (tiempos de entrega) + Google Sheets (programación).
 *
 * Query params:
 *   desde=YYYY-MM-DD  (default: 14 días atrás)
 *   hasta=YYYY-MM-DD  (default: hoy)
 */

import {
  getKPIs,
  getCumplimientoPorProveedor,
  getKPIsPorPoligono,
  getKPIsPorHora,
  getTopConductores,
  getLocales,
} from "../../lib/bigquery";


// ─── Filtro ciudad → BigQuery ────────────────────────────────────────────────
const CIUDAD_BQ_POLS = {
  Arequipa: ["Pol Cayma", "Pol Mariscal"],
  Cuzco:    ["Pol Larapa", "Pol La Cultura", "Pol Alameda"],
};
const CIUDAD_SHEET_POLS = {
  Arequipa: ["Pol Cayma", "Pol Mariscal"],
  Cuzco:    ["Pol Larapa", "Pol La Cultura", "Pol Alameda"],
};
const ALL_NON_LIMA_BQ = ["Pol Cayma", "Pol Mariscal", "Pol Larapa", "Pol La Cultura", "Pol Alameda"];

function buildExtraWhere(ciudad) {
  if (!ciudad || ciudad === "Todos") return "";
  const pols = CIUDAD_BQ_POLS[ciudad];
  if (pols) {
    const list = pols.map(p => `'${p}'`).join(", ");
    return `AND TRIM(IFNULL(poligono,'')) IN (${list})`;
  }
  if (ciudad === "Lima") {
    const list = ALL_NON_LIMA_BQ.map(p => `'${p}'`).join(", ");
    return `AND (poligono IS NULL OR TRIM(poligono) NOT IN (${list}))`;
  }
  return "";
}

function filterBrechaByCiudad(rows, ciudad) {
  if (!ciudad || ciudad === "Todos") return rows;
  const pols = CIUDAD_SHEET_POLS[ciudad];
  if (pols) return rows.filter(r => pols.includes(r.poligono));
  if (ciudad === "Lima") return rows.filter(r => !ALL_NON_LIMA_BQ.includes(r.poligono));
  return rows;
}

// ─── Google Sheets (misma hoja que ProgramacionCobertura) ────────────────────
const SHEET_ID =
  "2PACX-1vT6SUp1hOvRaQ7n0YEKyyKMJFakDrCiFOoLqIiV8SbiUIJtiYrGaswSHXc_FLg7a3BnVCy1bp22t6k0";
const GID_FOOD   = "1654839337";
const GID_NOFOOD = "1854074073";

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQ = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"' && inQ && line[i + 1] === '"') { current += '"'; i += 2; continue; }
    if (ch === '"') { inQ = !inQ; i++; continue; }
    if (ch === "," && !inQ) { result.push(current.trim()); current = ""; i++; continue; }
    current += ch; i++;
  }
  result.push(current.trim());
  return result;
}

async function fetchCSV(gid) {
  const url = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?gid=${gid}&single=true&output=csv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CSV fetch failed gid=${gid}: ${res.status}`);
  return res.text();
}

function parseTurnos(text, categoria, sCol, polCol, statusCol) {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const idx = (n) => headers.indexOf(n);

  const iSemana = idx(sCol);
  const iPol    = idx(polCol);
  const iStatus = idx(statusCol);
  const iStatus2 = categoria === "Food"
    ? headers.lastIndexOf("Status")
    : idx("Status_2");
  const iNomReempl = idx("Nombre del Reemplazo");

  return lines.slice(1).flatMap((line) => {
    const v = parseCSVLine(line);
    const semana  = (v[iSemana] ?? "").trim();
    const poligono = (v[iPol]   ?? "").trim();
    if (!semana || !poligono) return [];

    let status = (v[iStatus] ?? "").trim();
    // reemplazo cubrió el turno
    if (status !== "Asistió" && iStatus2 >= 0 && (v[iStatus2] ?? "").trim() === "Asistió") {
      status = "Asistió";
    }
    return [{ semana, poligono, status }];
  });
}

async function fetchBrecha() {
  const [foodText, noFoodText] = await Promise.all([
    fetchCSV(GID_FOOD),
    fetchCSV(GID_NOFOOD),
  ]);

  const rows = [
    ...parseTurnos(foodText,   "Food",   "Semana", "Polígono", "Status"),
    ...parseTurnos(noFoodText, "NoFood", "Semana", "Polígono", "Status"),
  ];

  // Agregar por (semana, poligono)
  const map = new Map();
  for (const r of rows) {
    const key = `${r.semana}||${r.poligono}`;
    if (!map.has(key)) map.set(key, { semana: r.semana, poligono: r.poligono, programados: 0, asistentes: 0 });
    const e = map.get(key);
    e.programados += 1;
    if (r.status === "Asistió") e.asistentes += 1;
  }

  return [...map.values()].sort((a, b) =>
    a.semana.localeCompare(b.semana) || a.poligono.localeCompare(b.poligono)
  );
}

// ─── Rango de fechas por defecto: últimos 14 días ────────────────────────────
function defaultRange(desde, hasta) {
  const today = new Date();
  const fmt = (d) => d.toISOString().split("T")[0];
  const h = hasta || fmt(today);
  const d = desde || fmt(new Date(today.setDate(today.getDate() - 14)));
  return { desde: d, hasta: h };
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const range = defaultRange(req.query.desde, req.query.hasta);
  const ciudad = req.query.ciudad ?? "Todos";
  const local  = req.query.local  ?? "Todos";

  const extraWhereCity = buildExtraWhere(ciudad);
  const localWhere = (local && local !== "Todos")
    ? `AND TRIM(IFNULL(\`local\`,'')) = '${local.replace(/'/g, "\\'")}'`
    : "";
  const extraWhere = [extraWhereCity, localWhere].filter(Boolean).join("\n      ");
  const bqFull = { ...range, extraWhere };
  const bqCity = { ...range, extraWhere: extraWhereCity }; // lista proveedores sin filtro local

  const [r_kpis, r_prov, r_pol, r_hora, r_cond, r_brecha, r_locales] = await Promise.allSettled([
    getKPIs(bqFull),
    getCumplimientoPorProveedor(bqCity),
    getKPIsPorPoligono(bqFull),
    getKPIsPorHora(bqFull),
    getTopConductores(bqFull),
    fetchBrecha(),
    getLocales(bqCity),   // lista de locales filtrada solo por ciudad
  ]);

  const safe = (r, fallback) => r.status === "fulfilled" ? r.value : fallback;

  const kpis       = safe(r_kpis,    {});
  const proveedor  = safe(r_prov,    []);
  const porPoligono = safe(r_pol,   []);
  const porHora    = safe(r_hora,    []);
  const conductores = safe(r_cond,   []);
  const brecha     = filterBrechaByCiudad(safe(r_brecha, []), ciudad);
  const locales    = safe(r_locales, []).map(r => r.local).filter(Boolean);

  const errors = [];
  if (r_kpis.status    === "rejected") errors.push({ source: "kpis",      msg: r_kpis.reason?.message });
  if (r_pol.status     === "rejected") errors.push({ source: "poligono",  msg: r_pol.reason?.message });
  if (r_hora.status    === "rejected") errors.push({ source: "hora",      msg: r_hora.reason?.message });
  if (r_cond.status    === "rejected") errors.push({ source: "conductor", msg: r_cond.reason?.message });
  if (r_brecha.status  === "rejected") errors.push({ source: "brecha",    msg: r_brecha.reason?.message });

  res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=60");
  return res.status(200).json({ kpis, proveedor, porPoligono, porHora, conductores, brecha, locales, range, errors });
}
