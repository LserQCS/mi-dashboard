/**
 * Lee un CSV público de Google Sheets y devuelve array de objetos
 * usando la primera fila como encabezados.
 * No requiere credenciales — la hoja debe estar publicada como CSV.
 */
async function fetchCSV(url) {
  const res = await fetch(url, { next: { revalidate: 600 } }); // cache 10 min en Vercel
  if (!res.ok) throw new Error(`Error al leer CSV (${res.status}): ${url}`);

  const text = await res.text();
  const lines = text.trim().split("\n").map((l) => l.split(","));
  const [headers, ...rows] = lines;

  return rows
    .filter((r) => r.some((c) => c.trim()))           // descartar filas vacías
    .map((row) =>
      Object.fromEntries(
        headers.map((h, i) => [h.trim().replace(/^"|"$/g, ""), (row[i] ?? "").trim().replace(/^"|"$/g, "")])
      )
    );
}

// ─── Normaliza una fila al esquema del dashboard ───────────────────────────

/**
 * Mapeo exacto según encabezados reales de cada pestaña:
 *
 * No Food: Semana | Fecha | Marca | Tienda | Ingreso | Salida | Tipo | Q Horas |
 *          Calendario | Vehículo | Tarifa | Status | Nombre | DNI | Celular | ...
 *
 * Food:    Semana | Origen | Día Sem | Día | Mes | Fecha | Polígono | Tienda |
 *          Ingreso | Salida | Tipo | Q Horas | ... | Status | Nombre | DNI | ...
 */
function normalizeRow(r, categoria) {
  if (categoria === "Food") {
    return {
      categoria,
      semana:       r["Semana"]    || "",
      poligono:     r["Polígono"]  || r["Poligono"] || "",
      tienda:       r["Tienda"]    || "",
      nombre:       r["Nombre"]    || "",
      dni:          r["DNI"]       || "",
      ingreso_prog: r["Ingreso"]   || "",
      salida_prog:  r["Salida"]    || "",
      horas:        r["Q Horas"]   || "",
      tipo:         r["Tipo"]      || "",
      status:       r["Status"]    || "",
      origen:       r["Origen"]    || "",
      fecha:        r["Fecha"]     || "",
    };
  }

  // No Food — no tiene Polígono; usa Tienda + Marca como identificador
  return {
    categoria,
    semana:       r["Semana"]    || "",
    poligono:     "",
    tienda:       r["Tienda"]    || "",
    marca:        r["Marca"]     || "",
    nombre:       r["Nombre"]    || "",
    dni:          r["DNI"]       || "",
    ingreso_prog: r["Ingreso"]   || "",
    salida_prog:  r["Salida"]    || "",
    horas:        r["Q Horas"]   || "",
    tipo:         r["Tipo"]      || "",
    status:       r["Status"]    || "",
    fecha:        r["Fecha"]     || "",
  };
}

// ─── Debug: devuelve encabezados crudos de ambas hojas ────────────────────

export async function getRawHeaders() {
  const urlNoFood = process.env.SHEETS_NO_FOOD_URL;
  const urlFood   = process.env.SHEETS_FOOD_URL;

  const parseHeaders = async (url) => {
    const res  = await fetch(url);
    const text = await res.text();
    return text.split("\n")[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  };

  return {
    no_food: await parseHeaders(urlNoFood),
    food:    await parseHeaders(urlFood),
  };
}

// ─── Función pública ───────────────────────────────────────────────────────

/**
 * Filtra filas por rango de fechas usando el campo `fecha` (DD/MM/YYYY o YYYY-MM-DD).
 */
function filtrarPorFecha(rows, desde, hasta) {
  if (!desde && !hasta) return rows;
  const toDate = (s) => {
    if (!s) return null;
    // Soporta DD/MM/YYYY y YYYY-MM-DD
    if (s.includes("/")) {
      const [d, m, y] = s.split("/");
      return new Date(`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`);
    }
    return new Date(s);
  };
  const desdeDt = desde ? new Date(desde) : null;
  const hastaDt = hasta ? new Date(hasta)  : null;
  return rows.filter((r) => {
    const f = toDate(r.fecha);
    if (!f || isNaN(f)) return true; // sin fecha → incluir
    if (desdeDt && f < desdeDt) return false;
    if (hastaDt && f > hastaDt) return false;
    return true;
  });
}

export async function getTareo({ desde, hasta } = {}) {
  const urlNoFood = process.env.SHEETS_NO_FOOD_URL;
  const urlFood   = process.env.SHEETS_FOOD_URL;

  if (!urlNoFood || !urlFood)
    throw new Error("Faltan SHEETS_NO_FOOD_URL o SHEETS_FOOD_URL en variables de entorno");

  const [rowsNoFood, rowsFood] = await Promise.all([
    fetchCSV(urlNoFood),
    fetchCSV(urlFood),
  ]);

  const nf = filtrarPorFecha(rowsNoFood.map((r) => normalizeRow(r, "No Food")), desde, hasta);
  const fd = filtrarPorFecha(rowsFood.map((r)   => normalizeRow(r, "Food")),    de