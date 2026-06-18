/**
 * GET /api/BigQueryLogistic
 *   ?view=kpis|proveedor|tipo|detalle|schema|datasets|tables|search
 *   &desde=YYYY-MM-DD   (requerido para kpis/proveedor/tipo/detalle)
 *   &hasta=YYYY-MM-DD
 */
import {
  getKPIs, getCumplimientoPorProveedor, getCumplimientoPorTipo,
  getPedidos, getTrend, getSchema, listDatasets, listTables, searchTable,
} from "../../lib/bigquery";

// Devuelve la fecha de hoy en YYYY-MM-DD (zona Perú UTC-5)
function hoy() {
  return new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
}

function defaultRange(desde, hasta) {
  const h = hasta || hoy();
  const d = desde || (() => {
    const dt = new Date(h); dt.setDate(dt.getDate() - 6);
    return dt.toISOString().slice(0, 10);
  })();
  return { desde: d, hasta: h };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const view  = req.query.view ?? "kpis";
    const range = defaultRange(req.query.desde, req.query.hasta);
    let data;

    switch (view) {
      case "proveedor":  data = await getCumplimientoPorProveedor(range); break;
      case "tipo":       data = await getCumplimientoPorTipo(range);      break;
      case "detalle":    data = await getPedidos(range);                  break;
      case "tendencia":  data = await getTrend(range);                    break;
      case "schema":    data = await getSchema();                        break;
      case "datasets":  data = await listDatasets();                     break;
      case "tables":    data = await listTables(req.query.ds || "shared_views"); break;
      case "search":    data = await searchTable(req.query.q || "liquidacion"); break;
      default:          data = await getKPIs(range);
    }

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
    return res.status(200).json({ ok: true, data, range });
  } catch (err) {
    console.error("[/api/BigQueryLogistic]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
