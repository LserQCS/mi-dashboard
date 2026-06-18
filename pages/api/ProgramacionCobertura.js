/**
 * GET /api/ProgramacionCobertura
 * Devuelve datos de programación Food + No Food para análisis de cobertura/ausentismo.
 * Misma hoja que ProgramacionFoodNoFood pero con columnas más detalladas (semana, status, etc).
 */

const SHEET_ID =
  "2PACX-1vT6SUp1hOvRaQ7n0YEKyyKMJFakDrCiFOoLqIiV8SbiUIJtiYrGaswSHXc_FLg7a3BnVCy1bp22t6k0";
const GID_FOOD   = "1654839337";
const GID_NOFOOD = "1854074073";

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"' && inQuotes && line[i + 1] === '"') { current += '"'; i += 2; continue; }
    if (ch === '"') { inQuotes = !inQuotes; i++; continue; }
    if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; i++; continue; }
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

/**
 * Aplica lógica de reemplazo idéntica al ETL de ControlCostosGanancias:
 * si status !== "Asistió" PERO status_2 === "Asistió" → el turno fue cubierto
 * por un reemplazo → usar "Asistió" como statusEfectivo y nombreReemplazo como nombre.
 */
function efectivo(status, status2, nombre, nombreReemplazo) {
  const reemplazoCubrio = status.trim() !== "Asistió" && status2.trim() === "Asistió";
  return {
    status:  reemplazoCubrio ? "Asistió"        : status,
    nombre:  reemplazoCubrio ? nombreReemplazo  : nombre,
  };
}

function parseFood(text) {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Índices por nombre de columna (robusto ante cambios de posición)
  const headers = parseCSVLine(lines[0]);
  const idx  = (name) => headers.indexOf(name);
  // La hoja Food tiene dos columnas llamadas "Status":
  //   primera (idx) = status principal, segunda (lastIndexOf) = status del reemplazo
  const iStatus        = idx("Status");
  const iStatus2       = headers.lastIndexOf("Status");
  const iNombreReempl  = idx("Nombre del Reemplazo");

  return lines.slice(1).map((line) => {
    const v = parseCSVLine(line);
    const ef = efectivo(
      v[iStatus]       ?? "",
      iStatus2 !== iStatus ? (v[iStatus2] ?? "") : "",
      v[18] ?? "",
      iNombreReempl >= 0 ? (v[iNombreReempl] ?? "") : "",
    );
    return {
      categoria: "Food",
      semana:   v[1]  ?? "",
      origen:   v[2]  ?? "",
      diaSem:   v[3]  ?? "",
      fecha:    v[6]  ?? "",
      poligono: v[7]  ?? "",
      tienda:   v[8]  ?? "",
      ingreso:  v[9]  ?? "",
      salida:   v[10] ?? "",
      tipo:     v[11] ?? "",
      qHoras:   v[12] ?? "",
      status:   ef.status,
      nombre:   ef.nombre,
      dni:      v[19] ?? "",
    };
  }).filter((r) => r.semana.trim() !== "");
}

function parseNoFood(text) {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const idx  = (name) => headers.indexOf(name);
  // En la hoja No Food, la columna de reemplazo se llama "Status_2" (nombre distinto)
  const iStatus        = idx("Status");
  const iStatus2       = idx("Status_2");
  const iNombreReempl  = idx("Nombre del Reemplazo");

  return lines.slice(1).map((line) => {
    const v = parseCSVLine(line);
    const ef = efectivo(
      v[iStatus]  ?? "",
      iStatus2 >= 0 ? (v[iStatus2] ?? "") : "",
      v[14] ?? "",
      iNombreReempl >= 0 ? (v[iNombreReempl] ?? "") : "",
    );
    return {
      categoria: "No Food",
      semana:   v[0]  ?? "",
      origen:   "",
      diaSem:   v[1]  ?? "",
      fecha:    v[2]  ?? "",
      poligono: v[3]  ?? "",
      tienda:   v[4]  ?? "",
      ingreso:  v[5]  ?? "",
      salida:   v[6]  ?? "",
      tipo:     v[7]  ?? "",
      qHoras:   v[8]  ?? "",
      status:   ef.status,
      nombre:   ef.nombre,
      dni:      v[15] ?? "",
    };
  }).filter((r) => r.semana.trim() !== "");
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const [foodText, noFoodText] = await Promise.all([
      fetchCSV(GID_FOOD),
      fetchCSV(GID_NOFOOD),
    ]);
    const data = [...parseFood(foodText), ...parseNoFood(noFoodText)];
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
    return res.status(200).json(data);
  } catch (err) {
    console.error("[/api/ProgramacionCobertura]", err);
    return res.status(500).json({ error: err.message });
  }
}
