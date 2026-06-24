/**
 * GET /api/debug-orden?no_orden=PRIM-SB-190626-0025
 * Diagnóstico completo: SELECT *, estadísticas de NULLs por proveedor, definición del view.
 */
import { runQuery } from "../../lib/bigquery";

const VIEW = () =>
  `\`${process.env.GCP_PROJECT_ID}.${process.env.BQ_DATASET || "shared_views"}.${process.env.BQ_TABLE || "liquidacion_logistics"}\``;

const PROJECT  = () => process.env.GCP_PROJECT_ID;
const DATASET  = () => process.env.BQ_DATASET  || "shared_views";
const TABLE    = () => process.env.BQ_TABLE    || "liquidacion_logistics";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { no_orden } = req.query;
  if (!no_orden) return res.status(400).json({ error: "Falta no_orden" });

  const ord = no_orden.replace(/'/g, "\'");

  // Q1: SELECT * para el pedido especifico
  const sqlStar = `SELECT * FROM ${VIEW()} WHERE no_orden = '${ord}' LIMIT 3`;

  // Q2: estadísticas de NULL por proveedor (ultimos 7 dias)
  // Responde: ¿son TODOS los campos NULL para todos? ¿o solo para Yango?
  const sqlNulls = `
    SELECT
      IFNULL(proveedor, '(null)') AS proveedor,
      COUNT(*)                                               AS total,
      COUNTIF(estado_camino_tienda  IS NOT NULL)             AS ct_nonnull,
      COUNTIF(estado_recibiendo     IS NOT NULL)             AS rec_nonnull,
      COUNTIF(estado_camino_entrega IS NOT NULL)             AS cen_nonnull,
      COUNTIF(estado_entregando     IS NOT NULL)             AS ent_nonnull
    FROM ${VIEW()}
    WHERE fecha_creacion >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      AND estado_finalizado IS NOT NULL
    GROUP BY proveedor
    ORDER BY total DESC
    LIMIT 30
  `;

  // Q3: definicion SQL del view (para ver si filtra por proveedor)
  const sqlViewDef = `
    SELECT view_definition, last_modified_time
    FROM \`${PROJECT()}.${DATASET()}.INFORMATION_SCHEMA.VIEWS\`
    WHERE table_name = '${TABLE()}' 
  `;

  // Q4: tablas origen disponibles en el dataset
  const sqlTables = `
    SELECT table_name, table_type, creation_time, last_modified_time
    FROM \`${PROJECT()}.${DATASET()}.INFORMATION_SCHEMA.TABLES\`
    ORDER BY table_name
  `;

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

  const safeQuery = async (sql, label) => {
    try { return { ok: true,  rows: (await runQuery(sql)).map(flatRow) }; }
    catch(e) { return { ok: false, error: e.message, label }; }
  };

  const [rStar, rNulls, rDef, rTables] = await Promise.all([
    safeQuery(sqlStar,    "select_star"),
    safeQuery(sqlNulls,   "null_stats"),
    safeQuery(sqlViewDef, "view_def"),
    safeQuery(sqlTables,  "tables"),
  ]);

  return res.status(200).json({
    // ¿El pedido tiene datos?
    pedido: rStar.ok ? rStar.rows : { error: rStar.error },
    columnas: rStar.ok && rStar.rows.length ? Object.keys(rStar.rows[0]) : [],

    // ¿Cuántos registros tienen los campos NOT NULL, por proveedor?
    // Si ct_nonnull=0 para todos → seguridad a nivel columna (nuestra SA sin permiso)
    // Si solo Yango tiene 0 → la lógica del view excluye Yango
    null_stats_por_proveedor: rNulls.ok ? rNulls.rows : { error: rNulls.error },

    // SQL real del view
    view_definition: rDef.ok ? (rDef.rows[0]?.view_definition ?? null) : { error: rDef.error },
    view_modified:   rDef.ok ? (rDef.rows[0]?.last_modified_time ?? null) : null,

    // Tablas/views en el dataset
    tablas_en_dataset: rTables.ok ? rTables.rows : { error: rTables.error },
  });
}
