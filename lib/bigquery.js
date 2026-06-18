import { BigQuery } from "@google-cloud/bigquery";

let _client = null;

function getClient() {
  if (_client) return _client;
  const projectId = process.env.GCP_PROJECT_ID;
  if (!projectId) throw new Error("Falta GCP_PROJECT_ID en variables de entorno");
  const rawJson = process.env.GCP_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    _client = new BigQuery({ projectId, credentials: JSON.parse(rawJson) });
  } else {
    _client = new BigQuery({ projectId });
  }
  return _client;
}

export async function runQuery(sql) {
  const client = getClient();
  const [rows] = await client.query({
    query: sql,
    location: process.env.BQ_LOCATION || "US",
  });
  return rows;
}

// ─── Referencia a la vista ────────────────────────────────────────────────────
const VIEW = () =>
  `\`${process.env.GCP_PROJECT_ID}.${process.env.BQ_DATASET || "shared_views"}.${process.env.BQ_TABLE || "liquidacion_logistics"}\``;

// Helper: combina fecha_creacion (DATE) + hora_creacion (STRING HH:MM:SS) → DATETIME
const TS_CREACION = `DATETIME(fecha_creacion, PARSE_TIME('%H:%M:%S', hora_creacion))`;

// Tiempo total de entrega en minutos (creación → finalizado)
const MIN_ENTREGA = `DATETIME_DIFF(estado_finalizado, ${TS_CREACION}, MINUTE)`;

// Filtro de pedidos con entrega registrada y fecha válida
const FILTRO_BASE = `estado_finalizado IS NOT NULL AND fecha_creacion IS NOT NULL AND hora_creacion IS NOT NULL`;

// Helper: genera el WHERE de fechas  (desde / hasta en formato YYYY-MM-DD)
const fechaWhere = (desde, hasta) =>
  `fecha_creacion BETWEEN '${desde}' AND '${hasta}'`;

// ─── Umbrales (del skill / hoja Datos) ───────────────────────────────────────
const U_PREP   = 25;   // O − Creación  (preparación tienda)
const U_ASIG   = 5;    // P − O         (asignación driver)
const U_VIAJE  = 10;   // Q − P         (viaje al local)
const U_REP    = 12;   // U − S         (reparto a cliente)
const U_OBJ    = 45;   // Objetivo pedido simple
const U_MULTI  = 75;   // Objetivo multipedido

// Expresión: objetivo según tipo de pedido (NULL = simple)
const OBJ_DIN = `IF(IFNULL(tipo_orden = 'Multipedido', FALSE), ${U_MULTI}, ${U_OBJ})`;

// P: En Ruta al Comercio; si vacío usa P alterno (estado_aceptado)
const P_TS = `COALESCE(estado_camino_tienda, estado_aceptado)`;

// Duraciones por etapa según skill
const MIN_PREP  = `DATETIME_DIFF(estado_asignando, ${TS_CREACION}, MINUTE)`;  // O − Creación
const MIN_ASIG  = `DATETIME_DIFF(${P_TS}, estado_asignando,        MINUTE)`;  // P − O
const MIN_VIAJE = `DATETIME_DIFF(estado_recibiendo, ${P_TS},       MINUTE)`;  // Q − P
const MIN_REP   = `DATETIME_DIFF(estado_finalizado, estado_entregando, MINUTE)`; // U − S

// ─── KPIs globales ────────────────────────────────────────────────────────────
export async function getKPIs({ desde, hasta } = {}) {
  const sql = `
    WITH base AS (
      SELECT *,
        ${MIN_ENTREGA} AS min_entrega,
        ${MIN_PREP}    AS min_prep,
        ${MIN_ASIG}    AS min_asig,
        ${MIN_VIAJE}   AS min_viaje,
        ${MIN_REP}     AS min_rep,
        ${OBJ_DIN}     AS objetivo_min,
        IFNULL(tipo_orden = 'Multipedido', FALSE) AS es_multi
      FROM ${VIEW()}
      WHERE ${fechaWhere(desde, hasta)}
        AND ${FILTRO_BASE}
    )
    SELECT
      COUNT(*)                                                    AS total_pedidos,
      COUNTIF(NOT es_multi)                                       AS total_simples,
      COUNTIF(es_multi)                                           AS total_multi,
      -- Cumplimiento con objetivo dinámico
      COUNTIF(min_entrega <= objetivo_min)                        AS dentro_obj,
      COUNTIF(min_entrega >  objetivo_min)                        AS fuera_obj,
      -- Desglose por tipo
      COUNTIF(NOT es_multi AND min_entrega <= ${U_OBJ})           AS simples_ok,
      COUNTIF(NOT es_multi AND min_entrega >  ${U_OBJ})           AS simples_fuera,
      COUNTIF(es_multi     AND min_entrega <= ${U_MULTI})         AS multi_ok,
      COUNTIF(es_multi     AND min_entrega >  ${U_MULTI})         AS multi_fuera,
      COUNTIF(estado_finalizado IS NULL)                          AS sin_entrega,
      COUNT(DISTINCT nombre_conductor)                            AS drivers_activos,
      COUNT(DISTINCT proveedor)                                   AS proveedores,
      ROUND(AVG(min_entrega), 1)                                  AS avg_min_entrega,
      -- Causas (sobre pedidos fuera de su objetivo)
      COUNTIF(min_entrega > objetivo_min AND min_prep  > ${U_PREP})  AS causa_tienda,
      COUNTIF(min_entrega > objetivo_min AND min_asig  > ${U_ASIG})  AS causa_asignacion,
      COUNTIF(min_entrega > objetivo_min AND min_viaje > ${U_VIAJE}) AS causa_viaje,
      COUNTIF(min_entrega > objetivo_min AND min_rep   > ${U_REP})   AS causa_reparto,
      -- Tiempos promedio por etapa
      ROUND(AVG(min_prep),  1) AS avg_prep,
      ROUND(AVG(min_asig),  1) AS avg_asignacion,
      ROUND(AVG(min_viaje), 1) AS avg_viaje,
      ROUND(AVG(min_rep),   1) AS avg_reparto
    FROM base
  `;
  return (await runQuery(sql))[0] ?? {};
}

// ─── Cumplimiento por proveedor (tienda) ─────────────────────────────────────
export async function getCumplimientoPorProveedor({ desde, hasta } = {}) {
  const sql = `
    SELECT
      proveedor,
      tipo_orden,
      COUNT(*)                                                                       AS total,
      COUNTIF(${MIN_ENTREGA} <= ${OBJ_DIN})                                         AS dentro_obj,
      COUNTIF(${MIN_ENTREGA} >  ${OBJ_DIN})                                         AS fuera_obj,
      ROUND(AVG(${MIN_ENTREGA}), 1)                                                  AS avg_min,
      ROUND(AVG(${MIN_ASIG}),   1)                                                   AS avg_min_asignacion,
      ROUND(AVG(DATETIME_DIFF(estado_finalizado, promesa_entrega, MINUTE)), 1)       AS diff_promesa_min
    FROM ${VIEW()}
    WHERE ${fechaWhere(desde, hasta)}
      AND ${FILTRO_BASE}
      AND proveedor IS NOT NULL
    GROUP BY proveedor, tipo_orden
    ORDER BY total DESC
    LIMIT 50
  `;
  return runQuery(sql);
}

// ─── Detalle de pedidos ───────────────────────────────────────────────────────
export async function getPedidos({ desde, hasta } = {}) {
  const sql = `
    SELECT
      no_orden, estado, nombre_conductor, tipo_orden, proveedor,
      fecha_creacion, hora_creacion,
      ${TS_CREACION}                                                          AS ts_creacion,
      estado_asignando, estado_aceptado, estado_camino_tienda,
      estado_recibiendo, estado_camino_entrega, estado_entregando,
      estado_finalizado, promesa_entrega,
      ROUND(${MIN_ENTREGA}, 1)                                                AS min_entrega,
      ROUND(DATETIME_DIFF(estado_asignando,     ${TS_CREACION},        MINUTE), 1) AS min_asignacion,
      ROUND(DATETIME_DIFF(estado_recibiendo,   estado_camino_tienda,  MINUTE), 1) AS min_llegada_tienda,
      ROUND(DATETIME_DIFF(estado_camino_entrega, estado_recibiendo,   MINUTE), 1) AS min_en_tienda,
      ROUND(DATETIME_DIFF(estado_finalizado,   estado_camino_entrega, MINUTE), 1) AS min_reparto
    FROM ${VIEW()}
    WHERE ${fechaWhere(desde, hasta)}
    ORDER BY fecha_creacion DESC, hora_creacion DESC
    LIMIT 2000
  `;
  return runQuery(sql);
}

// ─── Cumplimiento por tipo_orden ──────────────────────────────────────────────
export async function getCumplimientoPorTipo({ desde, hasta } = {}) {
  const sql = `
    SELECT
      tipo_orden,
      COUNT(*)                      AS total,
      COUNTIF(${MIN_ENTREGA} <= 45) AS dentro_45,
      COUNTIF(${MIN_ENTREGA} > 45)  AS fuera_45,
      ROUND(AVG(${MIN_ENTREGA}), 1) AS avg_min
    FROM ${VIEW()}
    WHERE ${fechaWhere(desde, hasta)}
      AND ${FILTRO_BASE}
    GROUP BY tipo_orden
    ORDER BY total DESC
  `;
  return runQuery(sql);
}

// ─── Tendencia diaria ────────────────────────────────────────────────────────
export async function getTrend({ desde, hasta } = {}) {
  const sql = `
    SELECT
      fecha_creacion,
      COUNT(*)                                      AS total,
      COUNTIF(${MIN_ENTREGA} <= ${OBJ_DIN})         AS dentro_obj,
      COUNTIF(${MIN_ENTREGA} >  ${OBJ_DIN})         AS fuera_obj,
      COUNTIF(IFNULL(tipo_orden='Multipedido',FALSE)) AS total_multi,
      ROUND(AVG(${MIN_ENTREGA}), 1)                 AS avg_min
    FROM ${VIEW()}
    WHERE ${fechaWhere(desde, hasta)}
      AND ${FILTRO_BASE}
    GROUP BY fecha_creacion
    ORDER BY fecha_creacion
  `;
  const rows = await runQuery(sql);
  // BigQuery DATE → string
  return rows.map((r) => ({ ...r, fecha: r.fecha_creacion?.value ?? String(r.fecha_creacion) }));
}

// ─── Schema de la vista ───────────────────────────────────────────────────────
export async function getSchema() {
  const sql = `
    SELECT column_name, data_type
    FROM \`${process.env.GCP_PROJECT_ID}.${process.env.BQ_DATASET}.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = '${process.env.BQ_TABLE}'
    ORDER BY ordinal_position
  `;
  return runQuery(sql);
}

// ─── Utilidades de exploración ────────────────────────────────────────────────
export async function listDatasets() {
  const client = getClient();
  const [datasets] = await client.getDatasets();
  const results = await Promise.all(
    datasets.map(async (ds) => {
      const [meta] = await ds.getMetadata();
      return { id: ds.id, location: meta.location };
    })
  );
  return results;
}

export async function listTables(datasetId) {
  const client = getClient();
  const [tables] = await client.dataset(datasetId).getTables();
  return tables.map((t) => ({ id: t.id, type: t.metadata?.type }));
}

export async function searchTable(term) {
  const client = getClient();
  const [datasets] = await client.getDatasets();
  const results = [];
  await Promise.all(
    datasets.map(async (ds) => {
      try {
        const [tables] = await ds.getTables();
        tables.forEach((t) => {
          if (t.id.toLowerCase().includes(term.toLowerCase())) {
            results.push({ dataset: ds.id, table: t.id, type: t.metadata?.type });
          }
        });
      } catch (_) {}
    })
  );
  return results.sort((a, b) => a.dataset.localeCompare(b.dataset));
}
