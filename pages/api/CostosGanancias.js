/**
 * GET /api/CostosGanancias
 * Agrega ingresos y costos por cliente y semana (S1–S24 2026).
 *
 * Fuentes:
 *   Costos driver  — DriverCostSinDistribuir CSV (hardcoded, ya usada en otro endpoint)
 *   Ingresos Food  — ProgramacionCobertura Food tab (mismo SHEET_ID/GID que ProgramacionCobertura)
 *   Ingresos NoFood— process.env.GSHEETS_NO_FOODS_URL
 *   Costos Yango   — process.env.GSHEETS_YANGO_CSV_URL
 *
 * Nuevas env vars necesarias en Vercel:
 *   GSHEETS_NO_FOODS_URL   — CSV publicado hoja Programación No Food
 *   GSHEETS_YANGO_CSV_URL  — CSV publicado Yango costos (cols: Marca, Fecha, Monto)
 */

// ─── Calendario Danke 2026 ─────────────────────────────────────────────────────

const SEMANAS = [
  { s: 1,  ini: "2026-01-01", fin: "2026-01-04" },
  { s: 2,  ini: "2026-01-05", fin: "2026-01-11" },
  { s: 3,  ini: "2026-01-12", fin: "2026-01-18" },
  { s: 4,  ini: "2026-01-19", fin: "2026-01-25" },
  { s: 5,  ini: "2026-01-26", fin: "2026-02-01" },
  { s: 6,  ini: "2026-02-02", fin: "2026-02-08" },
  { s: 7,  ini: "2026-02-09", fin: "2026-02-15" },
  { s: 8,  ini: "2026-02-16", fin: "2026-02-22" },
  { s: 9,  ini: "2026-02-23", fin: "2026-03-01" },
  { s: 10, ini: "2026-03-02", fin: "2026-03-08" },
  { s: 11, ini: "2026-03-09", fin: "2026-03-15" },
  { s: 12, ini: "2026-03-16", fin: "2026-03-22" },
  { s: 13, ini: "2026-03-23", fin: "2026-03-29" },
  { s: 14, ini: "2026-03-30", fin: "2026-04-05" },
  { s: 15, ini: "2026-04-06", fin: "2026-04-12" },
  { s: 16, ini: "2026-04-13", fin: "2026-04-19" },
  { s: 17, ini: "2026-04-20", fin: "2026-04-26" },
  { s: 18, ini: "2026-04-27", fin: "2026-05-03" },
  { s: 19, ini: "2026-05-04", fin: "2026-05-10" },
  { s: 20, ini: "2026-05-11", fin: "2026-05-17" },
  { s: 21, ini: "2026-05-18", fin: "2026-05-24" },
  { s: 22, ini: "2026-05-25", fin: "2026-05-31" },
  { s: 23, ini: "2026-06-01", fin: "2026-06-07" },
  { s: 24, ini: "2026-06-08", fin: "2026-06-14" },
];

// Festivos 2026 (Peru)
const FESTIVOS = new Set([
  "2026-01-01","2026-02-14","2026-04-02","2026-04-03",
  "2026-05-01","2026-05-10","2026-06-07","2026-06-21","2026-06-29",
  "2026-07-23","2026-07-28","2026-07-29","2026-08-06","2026-08-30",
  "2026-10-08","2026-11-01","2026-12-08","2026-12-09",
  "2026-12-24","2026-12-25","2026-12-31",
]);

function dateToSemana(dateStr) {
  // Acepta dd/mm/yyyy o yyyy-mm-dd
  let iso;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split("/");
    iso = `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  } else {
    iso = dateStr.slice(0, 10); // yyyy-mm-dd
  }
  for (const { s, ini, fin } of SEMANAS) {
    if (iso >= ini && iso <= fin) return s;
  }
  return null;
}

// ─── Normalización de cliente ──────────────────────────────────────────────────

const CLIENTE_MAP = {
  "Hikari":              "Hikari",
  "Hikari San Miguel":   "Hikari",
  "Hikari Molina":       "Hikari",
  "Hikari Rimac":        "Hikari",
  "Linterna":            "Linterna",
  "Linterna San Isidro": "Linterna",
  "Linterna Chacarilla": "Linterna",
  "Linterna Barranco":   "Linterna",
  "Tori":                "Tori",
  "Tori Magdalena":      "Tori",
  "Tori Miraflores":     "Tori",
  "Tori San Borja":      "Tori",
  "Tottus":              "Tottus",
  "Flora y Fauna":       "Flora y Fauna",
  "Rosatel":             "Rosatel",
  "Vocadoh":             "Vocadoh",
  "Voca oh":             "Vocadoh",
  "Mauval":              "Mauval",
  "Forus":               "Forus",
  "Don Tito":            "Don Tito",
  "Maria Almenara":      "Maria Almenara",
  "Primos":              "Primos",
  "Pollo Real":          "Pollo Real",
  "Clientes Wosak":      "Clientes Wosak",
  "Wosak":               "Clientes Wosak",
  "Tablon AQP":          "Tablon AQP",
  "Tablon CSC":          "Tablon CSC",
};

const CLIENTE_GRUPO = {
  "Hikari":         "Lima",
  "Linterna":       "Lima",
  "Tori":           "Lima",
  "Tottus":         "Lima",
  "Don Tito":       "Lima",
  "Maria Almenara": "Lima",
  "Primos":         "Lima",
  "Pollo Real":     "Provincia",
  "Tablon AQP":     "Provincia",
  "Tablon CSC":     "Provincia",
  "Clientes Wosak": "Wosak",
  "Rosatel":        "NoFoods",
  "Vocadoh":        "NoFoods",
  "Flora y Fauna":  "NoFoods",
  "Mauval":         "NoFoods",
  "Forus":          "NoFoods",
};

// ─── CSV Parser ────────────────────────────────────────────────────────────────

function parseCSVLine(line) {
  const result = [];
  let cur = "", inQ = false, i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"' && inQ && line[i+1] === '"') { cur += '"'; i += 2; continue; }
    if (ch === '"') { inQ = !inQ; i++; continue; }
    if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ""; i++; continue; }
    cur += ch; i++;
  }
  result.push(cur.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim());
  return lines.map(parseCSVLine);
}

async function fetchCSV(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CSV ${url} → HTTP ${res.status}`);
  return res.text();
}

// ─── Semanas válidas (solo S1–S24 2026) ──────────────────────────────────────

const VALID_SEMANAS = new Set(SEMANAS.map(s => s.s));

// ─── Acumulador ───────────────────────────────────────────────────────────────

function makeAcc() {
  // Map<cliente, Map<semana, {ingreso, costo, yango}>>
  return new Map();
}

function add(acc, cliente, semana, ingreso = 0, costo = 0, yango = 0) {
  // Descartar semanas fuera del calendario 2026 (evita S25–S53 de años anteriores)
  if (!VALID_SEMANAS.has(semana)) return;
  // Normalizar cliente; desconocidos → "Clientes Wosak" (igual que costs.ts original)
  const c = CLIENTE_MAP[cliente] ?? "Clientes Wosak";
  if (!c) return;
  if (!acc.has(c)) acc.set(c, new Map());
  const sem = acc.get(c);
  const prev = sem.get(semana) ?? { ingreso: 0, costo: 0, yango: 0 };
  sem.set(semana, {
    ingreso: prev.ingreso + ingreso,
    costo:   prev.costo   + costo,
    yango:   prev.yango   + yango,
  });
}

// ─── 1. Driver Costs (DriverCostSinDistribuir CSV) ────────────────────────────

const COSTO_URL =
  process.env.SHEETS_TAREOS_URL ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQnuevH6ASmRFIFzM4K90cE2KLOaBuQMWXaDrIEUbrE639KNGTwcUelKjySqCi3trV2LR1NN1BFL0pp/pub?output=csv";

async function fetchCostos(acc) {
  const text = await fetchCSV(COSTO_URL);
  const matrix = parseCSV(text);
  if (matrix.length < 2) return;

  const hdr    = matrix[0];
  const iCli   = hdr.indexOf("Cliente");
  const iPer   = hdr.indexOf("Periodo");
  const iCosto = hdr.indexOf("Driver Cost");
  if ([iCli, iPer, iCosto].some(i => i < 0)) return;

  for (let i = 1; i < matrix.length; i++) {
    const r   = matrix[i];
    const cli = (r[iCli] ?? "").trim();
    const sem = parseInt(r[iPer] ?? "");
    const cost = parseFloat((r[iCosto] ?? "0").replace(",","."));
    if (!cli || isNaN(sem) || isNaN(cost) || cost === 0) continue;
    add(acc, cli, sem, 0, cost, 0);
  }
}

// ─── 2. Ingresos Food LHT (ProgramacionCobertura Food tab) ───────────────────

const SHEET_ID = "2PACX-1vT6SUp1hOvRaQ7n0YEKyyKMJFakDrCiFOoLqIiV8SbiUIJtiYrGaswSHXc_FLg7a3BnVCy1bp22t6k0";
const GID_FOOD = "1654839337";

// Linterna (nueva tarifa desde S15, April 6):
function tarifaLinterna(h) {
  if (h <= 4)   return 64;
  if (h <= 4.5) return 72;
  if (h <= 6)   return 80;
  if (h <= 8)   return 112;
  return 144;
}

// Tori (nueva tarifa desde S23, June 1):
function tarifaTori(h) {
  if (h <= 4) return 64;
  if (h <= 6) return 80;
  return 118; // 10h+
}

async function fetchIngresosFood(acc) {
  const url = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?gid=${GID_FOOD}&single=true&output=csv`;
  const text = await fetchCSV(url);
  const matrix = parseCSV(text);
  if (matrix.length < 2) return;

  const hdr = matrix[0];
  const idx = n => hdr.indexOf(n);

  // Column positions (by header name for robustness)
  const iSemana  = idx("Semana");       // v[1] fallback
  const iPolig   = idx("Polígono") >= 0 ? idx("Polígono") : idx("Poligono");
  const iQHoras  = idx("Q Horas");
  const iCal     = idx("Calendario");
  const iStatus  = idx("Status");
  const iStatus2 = hdr.lastIndexOf("Status"); // segunda ocurrencia = reemplazo
  const iNombre  = idx("Nombre");
  const iNomRepl = idx("Nombre del Reemplazo");

  // Fallback to fixed indices if headers not found
  const getSem   = r => iSemana  >= 0 ? r[iSemana]  : r[1];
  const getPol   = r => iPolig   >= 0 ? r[iPolig]   : r[7];
  const getHoras = r => iQHoras  >= 0 ? r[iQHoras]  : r[12];
  const getCal   = r => iCal     >= 0 ? r[iCal]     : "";

  for (let i = 1; i < matrix.length; i++) {
    const r = matrix[i];

    // Status + reemplazo
    const st  = (r[iStatus]  ?? "").trim();
    const st2 = (iStatus2 > iStatus) ? (r[iStatus2] ?? "").trim() : "";
    const stFinal = (st !== "Asistió" && st2 === "Asistió") ? "Asistió" : st;
    if (stFinal !== "Asistió" && stFinal !== "Retiro anticipado") continue;

    const nombre = (st !== "Asistió" && st2 === "Asistió")
      ? (iNomRepl >= 0 ? r[iNomRepl] ?? "" : "").trim()
      : (iNombre  >= 0 ? r[iNombre]  ?? "" : "").trim();
    if (!nombre || nombre === "-") continue;

    const semana = parseInt(getSem(r) ?? "");
    if (isNaN(semana)) continue;

    const pol     = (getPol(r) ?? "").trim();
    const qHoras  = parseFloat((getHoras(r) ?? "0").replace(",", ".")) || 0;
    const festivo = getCal(r).trim() === "Festivo";
    const mult    = festivo ? 1.4 : 1;

    let ingreso = 0;
    if (pol.startsWith("Hikari")) {
      ingreso = 107.5 * mult;
      add(acc, "Hikari", semana, ingreso, 0, 0);
    } else if (pol.startsWith("Linterna")) {
      if (semana >= 15) {
        ingreso = tarifaLinterna(qHoras) * mult;
      } else {
        // Esquema pre-abril: aproximación promedio fijo (60 S/) × festivo
        ingreso = 60 * mult;
      }
      add(acc, "Linterna", semana, ingreso, 0, 0);
    } else if (pol.startsWith("Tori")) {
      if (semana >= 23) {
        ingreso = tarifaTori(qHoras) * mult;
      } else {
        // Esquema pre-junio: aproximación 80 S/ promedio
        ingreso = 80 * mult;
      }
      add(acc, "Tori", semana, ingreso, 0, 0);
    }
    // Primos / MAM / Tablon: ingresos pendientes (requieren joins adicionales)
  }
}

// ─── 3. Ingresos No Food ──────────────────────────────────────────────────────

async function fetchIngresosNoFood(acc) {
  const url = process.env.GSHEETS_NO_FOODS_URL;
  if (!url) { console.warn("[CostosGanancias] GSHEETS_NO_FOODS_URL no configurada"); return; }

  const text = await fetchCSV(url);
  const matrix = parseCSV(text);
  if (matrix.length < 2) return;

  const hdr = matrix[0];
  const idx = n => hdr.indexOf(n);

  const iSemana  = idx("Semana");
  const iMarca   = idx("Marca");
  const iIngreso = idx("Ingreso"); // hora inicio
  const iSalida  = idx("Salida");
  const iQHoras  = idx("Q Horas");
  const iCal     = idx("Calendario");
  const iStatus  = idx("Status");
  const iStatus2 = idx("Status_2");
  const iNombre  = idx("Nombre");
  const iNomRepl = idx("Nombre del Reemplazo");

  const parseHora = s => {
    const m = (s ?? "").match(/^(\d{1,2}):(\d{2})/);
    return m ? parseInt(m[1]) + parseInt(m[2]) / 60 : null;
  };

  for (let i = 1; i < matrix.length; i++) {
    const r = matrix[i];

    // Status + reemplazo
    const st  = (iStatus  >= 0 ? r[iStatus]  ?? "" : "").trim();
    const st2 = (iStatus2 >= 0 && iStatus2 !== iStatus ? r[iStatus2] ?? "" : "").trim();
    const stFinal = (st !== "Asistió" && st2 === "Asistió") ? "Asistió" : st;
    if (stFinal !== "Asistió" && stFinal !== "Retiro anticipado") continue;

    const nombre = (st !== "Asistió" && st2 === "Asistió")
      ? (iNomRepl >= 0 ? r[iNomRepl] ?? "" : "").trim()
      : (iNombre  >= 0 ? r[iNombre]  ?? "" : "").trim();
    if (!nombre || nombre === "-") continue;

    const semana = iSemana >= 0 ? parseInt(r[iSemana] ?? "") : NaN;
    if (isNaN(semana)) continue;

    const marca = (iMarca >= 0 ? r[iMarca] ?? "" : "").trim();

    // Calcular horas turno
    let qHoras = iQHoras >= 0 ? parseFloat((r[iQHoras] ?? "0").replace(",",".")) : 0;
    if (!qHoras || isNaN(qHoras)) {
      const ini = parseHora(r[iIngreso]);
      const sal = parseHora(r[iSalida]);
      if (ini !== null && sal !== null) {
        let diff = sal - ini;
        if (diff < 0) diff += 24;
        qHoras = diff;
      }
    }

    let cliente, ingreso;
    switch (marca.toLowerCase().replace(/\s+/g, " ").trim()) {
      case "rosatel":
        cliente = "Rosatel";
        ingreso = qHoras === 0 ? 0 : (qHoras / 10) * 160;
        break;
      case "flora y fauna":
        cliente = "Flora y Fauna";
        ingreso = qHoras === 0 ? 0 : (qHoras / 13) * 160;
        break;
      case "voca oh":
      case "vocadoh":
        cliente = "Vocadoh";
        ingreso = 350;
        break;
      case "mauval":
        cliente = "Mauval";
        ingreso = 350;
        break;
      default:
        continue;
    }
    add(acc, cliente, semana, ingreso, 0, 0);
  }
}

// ─── 4. Yango Costs ───────────────────────────────────────────────────────────

const YANGO_MARCA = {
  "Hikari":         "Hikari",
  "Linterna":       "Linterna",
  "Tori":           "Tori",
  "Don Tito":       "Don Tito",
  "Primos":         "Primos",
  "Maria Almenara": "Maria Almenara",
  "Pollo Real":     "Pollo Real",
  "Tablon":         "_tablon", // split 60/40 AQP/CSC
};

async function fetchYango(acc) {
  const url = process.env.GSHEETS_YANGO_CSV_URL;
  if (!url) { console.warn("[CostosGanancias] GSHEETS_YANGO_CSV_URL no configurada"); return; }

  const text = await fetchCSV(url);
  const matrix = parseCSV(text);
  if (matrix.length < 2) return;

  const hdr    = matrix[0];
  const iMarca = hdr.indexOf("Marca");
  const iFecha = hdr.indexOf("Fecha");
  const iMonto = hdr.indexOf("Monto");
  if ([iMarca, iFecha, iMonto].some(i => i < 0)) return;

  for (let i = 1; i < matrix.length; i++) {
    const r     = matrix[i];
    const marca = (r[iMarca] ?? "").trim();
    const fecha = (r[iFecha] ?? "").trim();
    const monto = parseFloat((r[iMonto] ?? "0").replace(",", "."));
    if (!monto || isNaN(monto)) continue;

    const semana = dateToSemana(fecha);
    if (!semana) continue;

    const cli = YANGO_MARCA[marca];
    if (!cli) continue;

    if (cli === "_tablon") {
      add(acc, "Tablon AQP", semana, 0, 0, monto * 0.6);
      add(acc, "Tablon CSC", semana, 0, 0, monto * 0.4);
    } else {
      add(acc, cli, semana, 0, 0, monto);
    }
  }
}

// ─── 5. Agregación final ──────────────────────────────────────────────────────

function buildResponse(acc) {
  const clienteMap = {};   // cliente → { ingreso, costo, yango }
  const semanaMap  = {};   // semana  → { ingreso, costo, yango }

  for (const [cliente, semsMap] of acc.entries()) {
    for (const [semana, vals] of semsMap.entries()) {
      // por cliente
      if (!clienteMap[cliente]) clienteMap[cliente] = { ingreso: 0, costo: 0, yango: 0 };
      clienteMap[cliente].ingreso += vals.ingreso;
      clienteMap[cliente].costo   += vals.costo;
      clienteMap[cliente].yango   += vals.yango;

      // por semana
      const sk = String(semana);
      if (!semanaMap[sk]) semanaMap[sk] = { ingreso: 0, costo: 0, yango: 0 };
      semanaMap[sk].ingreso += vals.ingreso;
      semanaMap[sk].costo   += vals.costo;
      semanaMap[sk].yango   += vals.yango;
    }
  }

  const resumenClientes = Object.entries(clienteMap)
    .map(([cliente, { ingreso, costo, yango }]) => {
      const margen          = ingreso > 0 ? (ingreso - costo) / ingreso : 0;
      const margenConYango  = ingreso > 0 ? (ingreso - costo - yango) / ingreso : 0;
      return {
        cliente,
        grupo:          CLIENTE_GRUPO[cliente] ?? "Otros",
        ingreso:        Math.round(ingreso),
        costo:          Math.round(costo),
        costoYango:     Math.round(yango),
        margen:         parseFloat(margen.toFixed(4)),
        margenConYango: parseFloat(margenConYango.toFixed(4)),
      };
    })
    .sort((a, b) => b.ingreso - a.ingreso);

  const evolucionSemanal = Object.entries(semanaMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([sk, { ingreso, costo, yango }]) => {
      const s = Number(sk);
      const info = SEMANAS.find(x => x.s === s);
      const margen = ingreso > 0 ? (ingreso - costo - yango) / ingreso : 0;
      return {
        semana:     s,
        label:      `S${s}`,
        fechaLabel: info ? `S${s} (${info.ini.slice(5)})` : `S${s}`,
        ingreso:    Math.round(ingreso),
        costo:      Math.round(costo),
        costoYango: Math.round(yango),
        margen:     parseFloat(margen.toFixed(4)),
      };
    });

  const tIng  = resumenClientes.reduce((s, c) => s + c.ingreso, 0);
  const tCos  = resumenClientes.reduce((s, c) => s + c.costo, 0);
  const tYan  = resumenClientes.reduce((s, c) => s + c.costoYango, 0);
  const tMar  = tIng > 0 ? (tIng - tCos - tYan) / tIng : 0;

  // porClienteSemana: { [cliente]: { [semana]: { ingreso, costo, yango } } }
  // Usado por /tabla para calcular tablas por semana y mes
  const porClienteSemana = {};
  for (const [cliente, semsMap] of acc.entries()) {
    porClienteSemana[cliente] = {};
    for (const [semana, vals] of semsMap.entries()) {
      porClienteSemana[cliente][semana] = {
        ingreso: Math.round(vals.ingreso * 100) / 100,
        costo:   Math.round(vals.costo   * 100) / 100,
        yango:   Math.round(vals.yango   * 100) / 100,
      };
    }
  }

  return {
    resumenClientes,
    evolucionSemanal,
    totales: {
      ingreso:        Math.round(tIng),
      costo:          Math.round(tCos),
      costoYango:     Math.round(tYan),
      margen:         parseFloat(tMar.toFixed(4)),
      utilidad:       Math.round(tIng - tCos - tYan),
    },
    semanas: evolucionSemanal.map(e => e.semana),
    porClienteSemana,
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const acc = makeAcc();

    await Promise.allSettled([
      fetchCostos(acc),
      fetchIngresosFood(acc),
      fetchIngresosNoFood(acc),
      fetchYango(acc),
    ]);

    const data = buildResponse(acc);
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=120");
    return res.status(200).json(data);
  } catch (err) {
    console.error("[/api/CostosGanancias]", err);
    return res.status(500).json({ error: err.message });
  }
}
