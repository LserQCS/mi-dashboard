/**
 * GET /api/debug-orden?no_orden=PRIM-SB-190626-0025
 * Consulta la nueva fuente report_order_logistics y muestra los datos crudos.
 */
import { runQuery } from "../../lib/bigquery";

const PROJECT = () => process.env.GCP_PROJECT_ID;
const DATASET = () => process.env.BQ_DATASET || "shared_views";

const VIEW_OLD = () => `\`${PROJECT()}.${DATASET()}.liquidacion_logistics\``;
const VIEW_NEW = () => `\`${PROJECT()}.${DATASET()}.report_order_logistics\``;

const flatRow = (row) => {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) { out[k] = null; continue; }
    if (typeof v === "object" && "value" in v) { out[k] = v.value; continue; }
    if (v instanceof Date) { out[k] = v.toISOString(); continue; }
    out[k] = v;
  }
  return out;
};

const safeQ = async (sql, label) => {
  try {
    const rows = await runQuery(sql);
    return { ok: true, rows: rows.map(flatRow) };
  } catch (e) {
    return { ok: false, label, error: e.message };
  }
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { no_orden } = req.query;
  if (!no_orden) return res.status(400).json({ error: "Falta no_orden" });

  const ord = no_orden.replace(/'/g, "\\'");

  // 1. Nueva fuente
  const sqlNew = `SELECT * FROM ${VIEW_NEW()} WHERE no_orden = '${ord}' LIMIT 5`;

  // 2. Fuente antigua (referencia)
  const sqlOld = `SELECT * FROM ${VIEW_OLD()} WHERE no_orden = '${ord}' LIMIT 5`;

  // 3. Stats de la nueva fuente (ultimos 7 dias, ambos formatos de fecha)
  const sqlStats = `
    SELECT
      IFNULL(proveedor, '(null)') AS proveedor,
      COUNT(*) AS total,
      COUNTIF(estado_en_ruta_al_comercio IS NOT NULL) AS ct_ruta_comercio,
      COUNTIF(estado_en_comercio         IS NOT NULL) AS ct_en_comercio,
      COUNTIF(estado_en_ruta_al_destino  IS NOT NULL) AS ct_ruta_destino,
      COUNTIF(estado_entregado           IS NOT NULL) AS ct_entregado,
      COUNTIF(tiempo_asignando IS NOT NULL AND CAST(tiempo_asignando AS STRING) != 'null') AS ct_tiempo_asig,
      COUNTIF(tiempo_en_ruta_al_comercio IS NOT NULL AND CAST(tiempo_en_ruta_al_comercio AS STRING) != 'null') AS ct_tiempo_viaje,
      COUNTIF(SAFE.PARSE_DATE('%Y-%m-%d', CAST(fecha_creacion AS STRING)) IS NOT NULL) AS fmt_iso,
      COUNTIF(SAFE.PARSE_DATE('%d-%m-%Y', CAST(fecha_creacion AS STRING)) IS NOT NULL) AS fmt_dmy
    FROM ${VIEW_NEW()}
    WHERE
      COALESCE(
        SAFE.PARSE_DATE('%Y-%m-%d', CAST(fecha_creacion AS STRING)),
        SAFE.PARSE_DATE('%d-%m-%Y', CAST(fecha_creacion AS STRING))
      ) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      AND estado_entregado IS NOT NULL
    GROUP BY proveedor
    ORDER BY total DESC
    LIMIT 20
  `;

  const [rNew, rOld, rStats] = await Promise.all([
    safeQ(sqlNew, "report_order_logistics"),
    safeQ(sqlOld,  "liquidacion_logistics"),
    safeQ(sqlStats, "stats"),
  ]);

  // Detectar formato de fecha_creacion
  let formatoFecha = "desconocido";
  if (rNew.ok && rNew.rows.length > 0) {
    const s = String(rNew.rows[0].fecha_creacion || "");
    if (/^\d{4}-\d{2}-\d{2}/.test(s))      formatoFecha = "YYYY-MM-DD";
    else if (/^\d{2}-\d{2}-\d{4}/.test(s)) formatoFecha = "DD-MM-YYYY";
    else if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) formatoFecha = "DD/MM/YYYY";
    else formatoFecha = "otro: " + s;
  }

  return res.status(200).json({
    nueva_fuente:           rNew.ok  ? rNew.rows  : { error: rNew.error },
    columnas_nueva_fuente:  rNew.ok && rNew.rows.length ? Object.keys(rNew.rows[0]) : [],
    formato_fecha:          formatoFecha,
    fuente_anterior:        rOld.ok  ? rOld.rows  : { error: rOld.error },
    stats_nueva_fuente:     rStats.ok ? rStats.rows : { error: rStats.error },
  });
}
