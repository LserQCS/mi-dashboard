/**
 * GET /api/debug-orden?no_orden=PRIM-SB-190626-0025
 * Devuelve todos los campos raw de la vista para un pedido específico.
 */
import { runQuery } from "../../lib/bigquery";

const VIEW = () =>
  `\`${process.env.GCP_PROJECT_ID}.${process.env.BQ_DATASET || "shared_views"}.${process.env.BQ_TABLE || "liquidacion_logistics"}\``;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { no_orden } = req.query;
  if (!no_orden) return res.status(400).json({ error: "Falta no_orden" });

  try {
    const sql = `
      SELECT
        no_orden,
        estado,
        proveedor,
        fecha_creacion,
        hora_creacion,
        -- Todos los estados raw (tipo y valor exacto)
        estado_pendiente,
        CAST(estado_pendiente      AS STRING) AS str_pendiente,
        estado_asignando,
        CAST(estado_asignando      AS STRING) AS str_asignando,
        estado_aceptado,
        CAST(estado_aceptado       AS STRING) AS str_aceptado,
        estado_camino_tienda,
        CAST(estado_camino_tienda  AS STRING) AS str_camino_tienda,
        estado_recibiendo,
        CAST(estado_recibiendo     AS STRING) AS str_recibiendo,
        estado_camino_entrega,
        CAST(estado_camino_entrega AS STRING) AS str_camino_entrega,
        estado_entregando,
        CAST(estado_entregando     AS STRING) AS str_entregando,
        estado_finalizado,
        CAST(estado_finalizado     AS STRING) AS str_finalizado,
        -- Tests de DATETIME_DIFF directo
        DATETIME_DIFF(estado_finalizado, estado_asignando, MINUTE)    AS diff_fin_asig,
        DATETIME_DIFF(estado_camino_tienda, estado_asignando, MINUTE) AS diff_cti_asig,
        DATETIME_DIFF(estado_recibiendo, estado_camino_tienda, MINUTE) AS diff_rec_cti
      FROM ${VIEW()}
      WHERE no_orden = '${no_orden.replace(/'/g, "\\'")}'
      LIMIT 5
    `;

    const rows = await runQuery(sql);

    // Serializar objetos BigQuery typed
    const flatRow = (row) => {
      const out = {};
      for (const [k, v] of Object.entries(row)) {
        out[k] = (v !== null && typeof v === "object" && "value" in v) ? v.value : v;
      }
      return out;
    };

    return res.status(200).json({ rows: rows.map(flatRow), sql });
  } catch (e) {
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
}
