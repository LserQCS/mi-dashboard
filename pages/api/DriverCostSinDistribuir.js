/**
 * GET /api/DriverCostSinDistribuir
 * Devuelve registros de Tareo con columnas:
 * Periodo, Cliente, Poligono, Tienda, Nombre, Vehiculo,
 * Horas, Turno, H Inicio Real, Horas Real, Q. Pedidos, Driver Cost
 */

const SHEET_CSV_URL =
  process.env.SHEETS_TAREOS_URL ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQnuevH6ASmRFIFzM4K90cE2KLOaBuQMWXaDrIEUbrE639KNGTwcUelKjySqCi3trV2LR1NN1BFL0pp/pub?output=csv";

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

async function getDriverCost() {
  const res = await fetch(SHEET_CSV_URL);
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
  const text = await res.text();
  const lines = text.split("\n");
  const headers = parseCSVLine(lines[0]);
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = parseCSVLine(line);
      return headers.reduce((obj, header, idx) => {
        obj[header] = values[idx] ?? "";
        return obj;
      }, {});
    });
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const data = await getDriverCost();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
    return res.status(200).json(data);
  } catch (err) {
    console.error("[/api/DriverCostSinDistribuir]", err);
    return res.status(500).json({ error: err.message });
  }
}
