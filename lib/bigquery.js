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

// --- Vista ------------------------------------------------------------------
const VIEW = () =>
  `\`${process.env.GCP_PROJECT_ID}.${process.env.BQ_DATASET || "shared_views"}.${process.env.BQ_TABLE || "liquidacion_logistics"}\``;

// Creacion: DATE + TIME STRING -> DATETIME
const TS_CREACION = `DATETIME(fecha_creacion, PARSE_TIME('%H:%M:%S', hora_creacion))`;

// Entrega total
const MIN_ENTREGA = `DATETIME_DIFF(estado_finalizado, ${TS_CREACION}, MINUTE)`;

// Filtro base
const FILTRO_BASE = `estado_finalizado IS NOT NULL AND fecha_creacion IS NOT NULL AND hora_creacion IS NOT NULL`;

// WHERE fechas
const fechaWhere = (desde, hasta) =>
  `fecha_creacion BETWEEN '${desde}' AND '${hasta}'`;

// --- Umbrales ---------------------------------------------------------------
const U_PREP   = 25;
const U_ASIG   = 5;
const U_VIAJE  = 10;
const U_PICKUP = 5;
const U_REP    = 12;
const U_OBJ    = 45;
const U_MULTI  = 45;

// --- toTS: convierte cualquier tipo de campo estado a DATETIME --------------
// Orden de intentos:
// 1. SAFE_CAST AS DATETIME  -> funciona si el campo es DATETIME o TIMESTAMP nativo
// 2. PARSE_DATETIME YYYY-MM-DD -> funciona si es STRING formato ISO
// 3. PARSE_DATETIME DD/MM/YYYY -> funciona si es STRING formato legado
const toTS = (field) =>
  `COALESCE(
    SAFE_CAST(${field} AS DATETIME),
    SAFE.PARSE_DATETIME('%Y-%m-%d %H:%M:%E*S', CAST(${field} AS STRING)),
    SAFE.PARSE_DATETIME('%d/%m/%Y %H:%M:%S',   CAST(${field} AS STRING))
  )`;

// P_TS: aceptado (flota) o camino_tienda (Yango)
const P_TS = `COALESCE(${toTS('estado_aceptado')}, ${toTS('estado_camino_tienda')})`;

// --- Metricas por etapa -----------------------------------------------------
const MIN_PREP   = `DATETIME_DIFF(${toTS('estado_asignando')},      ${TS_CREACION},                  MINUTE)`;
const MIN_ASIG   = `DATETIME_DIFF(${P_TS},                          ${toTS('estado_asignando')},     MINUTE)`;
const MIN_VIAJE  = `DATETIME_DIFF(${toTS('estado_recibiendo')},     ${toTS('estado_camino_tienda')}, MINUTE)`;
const MIN_PICKUP = `DATETIME_DIFF(${toTS('estado_camino_entrega')}, ${toTS('estado_recibiendo')},    MINUTE)`;
const MIN_REP    = `DATETIME_DIFF(${toTS('estado_finalizado')},     ${toTS('estado_entregando')},    MINUTE)`;

// --- KPIs globales ----------------------------------------------------------
export async function getKPIs({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    WITH base AS (
      SELECT *,
        ${MIN_ENTREGA} AS min_entrega,
        ${MIN_PREP}    AS min_prep,
        ${MIN_ASIG}    AS min_asig,
        ${MIN_VIAJE}   AS min_viaje,
        ${MIN_PICKUP}  AS min_pickup,
        ${MIN_REP}     AS min_rep
      FROM ${VIEW()}
      WHERE ${fechaWhere(desde, hasta)}
        AND ${FILTRO_BASE}
        ${extraWhere}
    )
    SELECT
      COUNT(*)                                                      AS total_pedidos,
      COUNTIF(min_entrega <= ${U_OBJ})                             AS dentro_obj,
      COUNTIF(min_entrega >  ${U_OBJ})                             AS fuera_obj,
      COUNTIF(estado_finalizado IS NULL)                            AS sin_entrega,
      COUNT(DISTINCT nombre_conductor)                              AS drivers_activos,
      COUNTIF(UPPER(IFNULL(proveedor,'')) LIKE '%YANGO%')           AS pedidos_yango,
      ROUND(AVG(min_entrega), 1)                                    AS avg_min_entrega,
      COUNTIF(min_entrega > ${U_OBJ} AND min_prep   > ${U_PREP})   AS causa_tienda,
      COUNTIF(min_entrega > ${U_OBJ} AND min_asig   > ${U_ASIG})   AS causa_asignacion,
      COUNTIF(min_entrega > ${U_OBJ} AND min_viaje  > ${U_VIAJE})  AS causa_viaje,
      COUNTIF(min_entrega > ${U_OBJ} AND min_pickup > ${U_PICKUP}) AS causa_pickup,
      COUNTIF(min_entrega > ${U_OBJ} AND min_rep    > ${U_REP})    AS causa_reparto,
      ROUND(AVG(min_prep),   1) AS avg_prep,
      ROUND(AVG(min_asig),   1) AS avg_asignacion,
      ROUND(AVG(min_viaje),  1) AS avg_viaje,
      ROUND(AVG(min_pickup), 1) AS avg_pickup,
      ROUND(AVG(min_rep),    1) AS avg_reparto
    FROM base
  `;
  return (await runQuery(sql))[0] ?? {};
}

// --- Cumplimiento por proveedor ---------------------------------------------
export async function getCumplimientoPorProveedor({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    SELECT
      proveedor,
      tipo_orden,
      COUNT(*)                                                                       AS total,
      COUNTIF(${MIN_ENTREGA} <= ${U_OBJ})                                           AS dentro_obj,
      COUNTIF(${MIN_ENTREGA} >  ${U_OBJ})                                           AS fuera_obj,
      ROUND(AVG(${MIN_ENTREGA}), 1)                                                  AS avg_min,
      ROUND(AVG(${MIN_ASIG}),   1)                                                   AS avg_min_asignacion,
      ROUND(AVG(DATETIME_DIFF(estado_finalizado, promesa_entrega, MINUTE)), 1)       AS diff_promesa_min
    FROM ${VIEW()}
    WHERE ${fechaWhere(desde, hasta)}
      AND ${FILTRO_BASE}
      ${extraWhere}
      AND proveedor IS NOT NULL
    GROUP BY proveedor, tipo_orden
    ORDER BY total DESC
    LIMIT 50
  `;
  return runQuery(sql);
}

// --- Detalle de pedidos -----------------------------------------------------
export async function getPedidos({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    SELECT
      no_orden,
      estado,
      nombre_conductor,
      tipo_orden,
      proveedor,
      \`local\`,
      fecha_creacion,
      hora_creacion,
      ROUND(${MIN_ENTREGA}, 1)                                                             AS min_entrega,
      IF(${MIN_ENTREGA} <= ${U_OBJ}, 'ok', 'fuera')                                       AS cumplimiento,
      ROUND(${MIN_PREP},   1) AS min_prep,
      ROUND(${MIN_ASIG},   1) AS min_asignacion,
      ROUND(${MIN_VIAJE},  1) AS min_viaje,
      ROUND(${MIN_PICKUP}, 1) AS min_pickup,
      ROUND(${MIN_REP},    1) AS min_reparto,
      ROUND(DATETIME_DIFF(${toTS('estado_finalizado')}, ${toTS('estado_recibiendo')}, MINUTE) + 5, 1) AS min_retorno_est,
      CAST(${toTS('estado_asignando')}      AS STRING) AS ts_asignando,
      CAST(${P_TS}                          AS STRING) AS ts_pickup,
      CAST(${toTS('estado_camino_tienda')}  AS STRING) AS ts_camino_tienda,
      CAST(${toTS('estado_recibiendo')}     AS STRING) AS ts_recibiendo,
      CAST(${toTS('estado_camino_entrega')} AS STRING) AS ts_camino_entrega,
      CAST(${toTS('estado_entregando')}     AS STRING) AS ts_entregando,
      CAST(${toTS('estado_finalizado')}     AS STRING) AS ts_finalizado,
      CAST(DATETIME_ADD(${toTS('estado_finalizado')}, INTERVAL 5 MINUTE) AS STRING) AS ts_disponible
    FROM ${VIEW()}
    WHERE ${fechaWhere(desde, hasta)}
      AND ${FILTRO_BASE}
      ${extraWhere}
    ORDER BY fecha_creacion DESC, hora_creacion DESC
    LIMIT 1000
  `;
  return runQuery(sql);
}

// --- Cumplimiento por tipo --------------------------------------------------
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

// --- Tendencia diaria -------------------------------------------------------
export async function getTrend({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    SELECT
      fecha_creacion,
      COUNT(*)                                      AS total,
      COUNTIF(${MIN_ENTREGA} <= ${U_OBJ})           AS dentro_obj,
      COUNTIF(${MIN_ENTREGA} >  ${U_OBJ})           AS fuera_obj,
      COUNTIF(IFNULL(tipo_orden='Multipedido',FALSE)) AS total_multi,
      ROUND(AVG(${MIN_ENTREGA}), 1)                 AS avg_min
    FROM ${VIEW()}
    WHERE ${fechaWhere(desde, hasta)}
      AND ${FILTRO_BASE}
      ${extraWhere}
    GROUP BY fecha_creacion
    ORDER BY fecha_creacion
  `;
  const rows = await runQuery(sql);
  return rows.map((r) => ({ ...r, fecha: r.fecha_creacion?.value ?? String(r.fecha_creacion) }));
}

// --- Schema -----------------------------------------------------------------
export async function getSchema() {
  const sql = `
    SELECT column_name, data_type
    FROM \`${process.env.GCP_PROJECT_ID}.${process.env.BQ_DATASET}.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = '${process.env.BQ_TABLE}'
    ORDER BY ordinal_position
  `;
  return runQuery(sql);
}

// --- Exploración ------------------------------------------------------------
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

// --- KPIs por poligono ------------------------------------------------------
export async function getKPIsPorPoligono({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    WITH base AS (
      SELECT *,
        ${MIN_ENTREGA} AS min_entrega,
        ${MIN_PREP}    AS min_prep,
        ${MIN_ASIG}    AS min_asig,
        ${MIN_VIAJE}   AS min_viaje,
        ${MIN_PICKUP}  AS min_pickup,
        ${MIN_REP}     AS min_rep
      FROM ${VIEW()}
      WHERE ${fechaWhere(desde, hasta)}
        AND ${FILTRO_BASE}
        ${extraWhere}
    )
    SELECT
      poligono,
      COUNT(*)                                                          AS total,
      COUNTIF(min_entrega <= ${U_OBJ})                                 AS dentro_obj,
      COUNTIF(min_entrega >  ${U_OBJ})                                 AS fuera_obj,
      ROUND(AVG(min_entrega), 1)                                        AS avg_min,
      COUNT(DISTINCT nombre_conductor)                                  AS drivers_activos,
      COUNTIF(min_entrega > ${U_OBJ} AND min_prep  > ${U_PREP})        AS causa_tienda,
      COUNTIF(min_entrega > ${U_OBJ} AND min_asig  > ${U_ASIG})        AS causa_asignacion,
      COUNTIF(min_entrega > ${U_OBJ} AND min_viaje > ${U_VIAJE})       AS causa_viaje,
      COUNTIF(min_entrega > ${U_OBJ} AND min_rep   > ${U_REP})         AS causa_reparto
    FROM base
    WHERE poligono IS NOT NULL AND TRIM(poligono) != ''
    GROUP BY poligono
    ORDER BY total DESC
  `;
  return runQuery(sql);
}

// --- KPIs por hora ----------------------------------------------------------
export async function getKPIsPorHora({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    WITH base AS (
      SELECT *,
        ${MIN_ENTREGA} AS min_entrega,
        CAST(SPLIT(hora_creacion, ':')[OFFSET(0)] AS INT64) AS hora
      FROM ${VIEW()}
      WHERE ${fechaWhere(desde, hasta)}
        AND ${FILTRO_BASE}
        ${extraWhere}
        AND hora_creacion IS NOT NULL
    )
    SELECT
      hora,
      COUNT(*)                             AS total,
      COUNTIF(min_entrega <= ${U_OBJ})     AS dentro_obj,
      ROUND(AVG(min_entrega), 1)           AS avg_min
    FROM base
    GROUP BY hora
    ORDER BY hora
  `;
  return runQuery(sql);
}

// --- Top conductores --------------------------------------------------------
export async function getTopConductores({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    WITH base AS (
      SELECT *,
        ${MIN_ENTREGA} AS min_entrega
      FROM ${VIEW()}
      WHERE ${fechaWhere(desde, hasta)}
        AND ${FILTRO_BASE}
        ${extraWhere}
        AND nombre_conductor IS NOT NULL
        AND TRIM(nombre_conductor) != ''
    )
    SELECT
      nombre_conductor,
      COUNT(*)                                                           AS total,
      COUNTIF(min_entrega <= ${U_OBJ})                                   AS dentro_obj,
      ROUND(COUNTIF(min_entrega <= ${U_OBJ}) / COUNT(*) * 100, 1)       AS pct_ok,
      ROUND(AVG(min_entrega), 1)                                         AS avg_min
    FROM base
    GROUP BY nombre_conductor
    HAVING total >= 3
    ORDER BY total DESC
    LIMIT 40
  `;
  return runQuery(sql);
}

// --- Locales ----------------------------------------------------------------
export async function getLocales({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    SELECT DISTINCT TRIM(\`local\`) AS local
    FROM ${VIEW()}
    WHERE ${fechaWhere(desde, hasta)}
      AND ${FILTRO_BASE}
      ${extraWhere}
      AND \`local\` IS NOT NULL AND TRIM(\`local\`) != ''
    ORDER BY local
    LIMIT 200
  `;
  return runQuery(sql);
}
