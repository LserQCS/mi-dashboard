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
  const [rows] = await client.query({ query: sql, location: process.env.BQ_LOCATION || "US" });
  return rows;
}

// ─── Vista ──────────────────────────────────────────────────────────────────
const VIEW = () =>
  `\`${process.env.GCP_PROJECT_ID}.${process.env.BQ_DATASET || "shared_views"}.${process.env.BQ_TABLE || "report_order_logistics"}\``;

// ─── CTE: mapeo local → polígono (fuente: Direcciones tiendas.xlsx) ─────────
const LOCAL_POL_CTE = `WITH local_pol AS (
  SELECT 'Barba Negra - Miraflores' AS local_name, 'Pol Espinar' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Bendita - Surquillo' AS local_name, 'Pol Surquillo' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Bendita - San Borja' AS local_name, 'Pol Encalada' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Bon Beef - Surco' AS local_name, 'Pol Fontana' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Café de Lima - Angamos' AS local_name, 'Pol Espinar' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Caravana - San Borja' AS local_name, 'Pol San Borja' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Caravana - San Miguel' AS local_name, 'Pol San Miguel' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Caravana - San Isidro' AS local_name, 'Pol Andrés Reyes' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Caravana - Surquillo' AS local_name, 'Pol Surquillo' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Carnica - San Miguel' AS local_name, 'Pol San Miguel' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'El Chino Vegano JM' AS local_name, 'Pol Jesús María' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'DT Magdalena' AS local_name, 'Pol Magdalena' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'DT Miraflores' AS local_name, 'Pol Miraflores' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'DT La Molina' AS local_name, 'Pol Fontana' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Food Center Pueblo Libre' AS local_name, 'Pol Pueblo Libre' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'La Ardilla Confitería - Santa Cruz' AS local_name, 'Pol Espinar' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'La Ardilla Confitería - Pueblo Libre' AS local_name, 'Pol Pueblo Libre' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'La Mora - Chorrillos Dark' AS local_name, 'Pol Huaylas' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'La Mora - San Isidro' AS local_name, 'Pol Espinar' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'La Mora - Miraflores' AS local_name, 'Pol Espinar' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'La Mora - Surco' AS local_name, 'Pol Encalada' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'LAS DELICIAS - LA MAR' AS local_name, 'Pol Espinar' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'SILVESTRE-JOCKEY PLAZA' AS local_name, 'Pol Camacho' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MARIA ALMENARA - PASO 28' AS local_name, 'Pol Miraflores' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MARIA ALMENARA - CHORRILLOS' AS local_name, 'Pol Chorrillos' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MM - ANDRES REYES' AS local_name, 'Pol Andrés Reyes' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MARIA ALMENARA - CAMACHO' AS local_name, 'Pol Fontana' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MM - LA MOLINA' AS local_name, 'Pol Molina' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MARIA ALMENARA - SANTACATA' AS local_name, 'Pol Santa Catalina' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MARIA ALMENARA - SAN MIGUEL' AS local_name, 'Pol San Miguel' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MM - LA MARINA' AS local_name, 'Pol Pueblo Libre' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MARIA ALMENARA - 2 DE MAYO' AS local_name, 'Pol Andrés Reyes' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MARIA ALMENARA - ARENALES' AS local_name, 'Pol Arenales' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MARIA ALMENARA - BOLIVAR' AS local_name, 'Pol Pueblo Libre' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MARIA ALMENARA - LA ENCALADA' AS local_name, 'Pol Encalada' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MM - BOLICHERA' AS local_name, 'Pol Bolichera' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MM - LA MAR' AS local_name, 'Pol Espinar' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MM - PRECURSORES' AS local_name, 'Pol Encalada' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MARIA ALMENARA - BARRANCO' AS local_name, 'Pol Miraflores' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Natural Chef Miraflores' AS local_name, 'Pol Miraflores' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Primon B - Pueblo Libre' AS local_name, 'Pol Pueblo Libre' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Primos - Miraflores' AS local_name, 'Pol Miraflores' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Primos - Espinar' AS local_name, 'Pol Espinar' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Primos - San Isidro' AS local_name, 'Pol Andrés Reyes' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Primos - La Molina' AS local_name, 'Pol Fontana' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Los Rolls de Diego - Miraflores' AS local_name, 'Pol Espinar' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Los Rolls de Diego - Chorrillos' AS local_name, 'Pol Huaylas' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Los Rolls de Diego - San Borja' AS local_name, 'Pol Encalada' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Primos - San Borja' AS local_name, 'Pol Encalada' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Café de Lima - 28 de Julio' AS local_name, 'Pol Miraflores' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Bon Beef - San Isidro' AS local_name, 'Pol Espinar' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MT Chorrillos' AS local_name, 'Pol Huaylas' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MT San Borja' AS local_name, 'Pol San Borja' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MT Proceres' AS local_name, 'Pol Bolichera' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MT Camacho' AS local_name, 'Pol Fontana' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MT Faucett' AS local_name, 'Pol San Miguel' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MT Dos de Mayo' AS local_name, 'Pol Andrés Reyes' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MT Pueblo Libre' AS local_name, 'Pol Pueblo Libre' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MT La Fontana' AS local_name, 'Pol Fontana' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MT Primavera' AS local_name, 'Pol Encalada' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MT Benavides' AS local_name, 'Pol Miraflores' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'MT San Miguel' AS local_name, 'Pol San Miguel' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'SIL -BIORITMO EL POLO' AS local_name, 'Pol Encalada' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'SIL- LA MAR' AS local_name, 'Pol Espinar' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'SIL-GOLF INKAS' AS local_name, 'Pol Camacho' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'SIL -GOLF SAN ISIDRO' AS local_name, 'Pol Espinar' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'SIL- BIORITMO SANTACRUZ' AS local_name, 'Pol Espinar' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Quinoa Pardo y Aliaga' AS local_name, 'Pol Espinar' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Quinoa Cronos' AS local_name, 'Pol Encalada' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Quinoa Miraflores' AS local_name, 'Pol Miraflores' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Quinoa Panama' AS local_name, 'Pol Andrés Reyes' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Quinoa Dean Valdivia' AS local_name, 'Pol Andrés Reyes' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'SIL- LA MARINA' AS local_name, 'Pol Pueblo Libre' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'SIL- LA MOLINA' AS local_name, 'Pol Molina' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'SIL- ENCALADA' AS local_name, 'Pol Encalada' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'EZZEM' AS local_name, 'Pol Espinar' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Presto General Moran' AS local_name, 'Pol Mariscal' AS poligono, 'Arequipa' AS provincia
  UNION ALL
  SELECT 'Presto EEUU' AS local_name, 'Pol Dolores' AS poligono, 'Arequipa' AS provincia
  UNION ALL
  SELECT 'Presto Ejercito' AS local_name, 'Pol Cayma' AS poligono, 'Arequipa' AS provincia
  UNION ALL
  SELECT 'Presto Cenco Aqp' AS local_name, 'Pol Cerro Colorado' AS poligono, 'Arequipa' AS provincia
  UNION ALL
  SELECT 'Presto Jerusalen' AS local_name, 'Pol Mariscal' AS poligono, 'Arequipa' AS provincia
  UNION ALL
  SELECT 'Presto Dolores' AS local_name, 'Pol Mariscal' AS poligono, 'Arequipa' AS provincia
  UNION ALL
  SELECT 'Presto Paseo Central' AS local_name, 'Pol Paseo Central' AS poligono, 'Arequipa' AS provincia
  UNION ALL
  SELECT 'El Tablón - Cayma' AS local_name, 'Pol Cayma' AS poligono, 'Arequipa' AS provincia
  UNION ALL
  SELECT 'El Tablón - Mariscal' AS local_name, 'Pol Mariscal' AS poligono, 'Arequipa' AS provincia
  UNION ALL
  SELECT 'P Real Piérola' AS local_name, 'Pol Mariscal' AS poligono, 'Arequipa' AS provincia
  UNION ALL
  SELECT 'P Real Ejército' AS local_name, 'Pol Cayma' AS poligono, 'Arequipa' AS provincia
  UNION ALL
  SELECT 'P Real Villalba' AS local_name, 'Pol Mariscal' AS poligono, 'Arequipa' AS provincia
  UNION ALL
  SELECT 'P Real Dolores' AS local_name, 'Pol Mariscal' AS poligono, 'Arequipa' AS provincia
  UNION ALL
  SELECT 'P Real Emmel' AS local_name, 'Pol Cayma' AS poligono, 'Arequipa' AS provincia
  UNION ALL
  SELECT 'P Real Lambramani' AS local_name, 'Pol Mariscal' AS poligono, 'Arequipa' AS provincia
  UNION ALL
  SELECT 'Di Mazza Cayma' AS local_name, 'Pol Cayma' AS poligono, 'Arequipa' AS provincia
  UNION ALL
  SELECT 'Posho Ejército' AS local_name, 'Pol Cayma' AS poligono, 'Arequipa' AS provincia
  UNION ALL
  SELECT 'Alfa B. Cayma' AS local_name, 'Pol Cayma' AS poligono, 'Arequipa' AS provincia
  UNION ALL
  SELECT 'El Tablón - La Cultura' AS local_name, 'Pol Centro' AS poligono, 'Cusco' AS provincia
  UNION ALL
  SELECT 'El Tablón - Larapa' AS local_name, 'Pol Larapa' AS poligono, 'Cusco' AS provincia
  UNION ALL
  SELECT 'El Tablón - Alameda' AS local_name, 'Pol Centro' AS poligono, 'Cusco' AS provincia
  UNION ALL
  SELECT 'SIL- BARRANCO' AS local_name, 'Pol Miraflores' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Granja Azul San Isidro' AS local_name, 'Pol Magdalena' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Granja Azul El Polo' AS local_name, 'Pol Encalada' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'La Panka San Borja' AS local_name, 'Pol Encalada' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Poke Boss San Isidro' AS local_name, 'Pol Andrés Reyes' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Poke Boss Lince' AS local_name, 'Pol Andrés Reyes' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Poke Boss Miraflores' AS local_name, 'Pol Miraflores' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Poke Boss El Polo' AS local_name, 'Pol Encalada' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Tramontana Lince' AS local_name, 'Pol Andrés Reyes' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Tramontana San Miguel' AS local_name, 'Pol San Miguel' AS poligono, 'Lima' AS provincia
  UNION ALL
  SELECT 'Tramontana La Molina' AS local_name, 'Pol Fontana' AS poligono, 'Lima' AS provincia
)`;

// ─── Fecha de creación: acepta YYYY-MM-DD y DD-MM-YYYY ──────────────────────
const FECHA_PARSE = (col) =>
  `COALESCE(
    SAFE.PARSE_DATE('%Y-%m-%d', CAST(${col} AS STRING)),
    SAFE.PARSE_DATE('%d-%m-%Y', CAST(${col} AS STRING))
  )`;

// ─── Creacion: DATE + TIME STRING → DATETIME ────────────────────────────────
const TS_CREACION = `DATETIME(${FECHA_PARSE("fecha_creacion")}, PARSE_TIME('%H:%M:%S', hora_creacion))`;

// ─── toTS: convierte campo estado a DATETIME (nativo, ISO, DD-MM-YYYY) ──────
const toTS = (field) =>
  `COALESCE(
    SAFE_CAST(${field} AS DATETIME),
    SAFE.PARSE_DATETIME('%Y-%m-%d %H:%M:%E*S', CAST(${field} AS STRING)),
    SAFE.PARSE_DATETIME('%d-%m-%Y %H:%M:%S',   CAST(${field} AS STRING))
  )`;

// ─── Entrega total ───────────────────────────────────────────────────────────
const MIN_ENTREGA = `DATETIME_DIFF(${toTS("estado_entregado")}, ${TS_CREACION}, MINUTE)`;

// ─── Filtro base ─────────────────────────────────────────────────────────────
const FILTRO_BASE = `estado_entregado IS NOT NULL AND fecha_creacion IS NOT NULL AND hora_creacion IS NOT NULL`;

// ─── WHERE fechas (acepta ambos formatos) ───────────────────────────────────
const fechaWhere = (desde, hasta) =>
  `${FECHA_PARSE("fecha_creacion")} BETWEEN '${desde}' AND '${hasta}'`;

// ─── P_TS: asignado (Flota) o en_ruta_al_comercio (Yango) ───────────────────
const P_TS = `COALESCE(${toTS("estado_asignado")}, ${toTS("estado_en_ruta_al_comercio")})`;

// ─── Umbrales ────────────────────────────────────────────────────────────────
const U_PREP   = 25;
const U_ASIG   = 5;
const U_VIAJE  = 10;
const U_PICKUP = 5;
const U_REP    = 12;
const U_OBJ    = 45;

// ─── Métricas por etapa ──────────────────────────────────────────────────────
const MIN_PREP   = `DATETIME_DIFF(${toTS("estado_asignando")},          ${TS_CREACION},                        MINUTE)`;
const MIN_ASIG   = `DATETIME_DIFF(${P_TS},                              ${toTS("estado_asignando")},           MINUTE)`;
const MIN_VIAJE  = `DATETIME_DIFF(${toTS("estado_en_comercio")},        ${toTS("estado_en_ruta_al_comercio")}, MINUTE)`;
const MIN_PICKUP = `DATETIME_DIFF(${toTS("estado_en_ruta_al_destino")}, ${toTS("estado_en_comercio")},         MINUTE)`;
const MIN_REP    = `DATETIME_DIFF(${toTS("estado_entregado")},          ${toTS("estado_en_destino")},          MINUTE)`;

// ─── KPIs globales ───────────────────────────────────────────────────────────
export async function getKPIs({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    ${LOCAL_POL_CTE},
    base AS (
      SELECT t.*,
        lp.poligono, lp.provincia,
        ${MIN_ENTREGA} AS min_entrega,
        ${MIN_PREP}    AS min_prep,
        ${MIN_ASIG}    AS min_asig,
        ${MIN_VIAJE}   AS min_viaje,
        ${MIN_PICKUP}  AS min_pickup,
        ${MIN_REP}     AS min_rep
      FROM ${VIEW()} t
      LEFT JOIN local_pol lp ON TRIM(t.local) = lp.local_name
      WHERE ${fechaWhere(desde, hasta)}
        AND ${FILTRO_BASE}
        ${extraWhere}
    )
    SELECT
      COUNT(*)                                                      AS total_pedidos,
      COUNTIF(min_entrega <= ${U_OBJ})                             AS dentro_obj,
      COUNTIF(min_entrega >  ${U_OBJ})                             AS fuera_obj,
      COUNTIF(estado_entregado IS NULL)                             AS sin_entrega,
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

// ─── Cumplimiento por proveedor ──────────────────────────────────────────────
export async function getCumplimientoPorProveedor({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    ${LOCAL_POL_CTE}
    SELECT
      t.proveedor,
      t.tipo_de_pago AS tipo_orden,
      COUNT(*)                                                                AS total,
      COUNTIF(${MIN_ENTREGA} <= ${U_OBJ})                                    AS dentro_obj,
      COUNTIF(${MIN_ENTREGA} >  ${U_OBJ})                                    AS fuera_obj,
      ROUND(AVG(${MIN_ENTREGA}), 1)                                           AS avg_min,
      ROUND(AVG(${MIN_ASIG}),   1)                                            AS avg_min_asignacion,
      ROUND(AVG(DATETIME_DIFF(${toTS("estado_entregado")}, ${toTS("promesa_entrega")}, MINUTE)), 1) AS diff_promesa_min
    FROM ${VIEW()} t
    LEFT JOIN local_pol lp ON TRIM(t.local) = lp.local_name
    WHERE ${fechaWhere(desde, hasta)}
      AND ${FILTRO_BASE}
      ${extraWhere}
      AND t.proveedor IS NOT NULL
    GROUP BY t.proveedor, t.tipo_de_pago
    ORDER BY total DESC
    LIMIT 50
  `;
  return runQuery(sql);
}

// ─── Detalle de pedidos ───────────────────────────────────────────────────────
export async function getPedidos({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    ${LOCAL_POL_CTE}
    SELECT
      t.no_orden,
      t.estado,
      t.nombre_conductor,
      t.tipo_de_pago                                                                     AS tipo_orden,
      t.proveedor,
      t.local,
      t.fecha_creacion,
      t.hora_creacion,
      lp.poligono,
      ROUND(${MIN_ENTREGA}, 1)                                                           AS min_entrega,
      IF(${MIN_ENTREGA} <= ${U_OBJ}, 'ok', 'fuera')                                     AS cumplimiento,
      ROUND(${MIN_PREP},   1)                                                            AS min_prep,
      ROUND(${MIN_ASIG},   1)                                                            AS min_asignacion,
      ROUND(${MIN_VIAJE},  1)                                                            AS min_viaje,
      ROUND(${MIN_PICKUP}, 1)                                                            AS min_pickup,
      ROUND(${MIN_REP},    1)                                                            AS min_reparto,
      ROUND(DATETIME_DIFF(${toTS("estado_entregado")}, ${toTS("estado_en_comercio")}, MINUTE) + 5, 1) AS min_retorno_est,
      CAST(${toTS("estado_asignando")}           AS STRING) AS ts_asignando,
      CAST(${P_TS}                               AS STRING) AS ts_pickup,
      CAST(${toTS("estado_en_ruta_al_comercio")} AS STRING) AS ts_camino_tienda,
      CAST(${toTS("estado_en_comercio")}         AS STRING) AS ts_recibiendo,
      CAST(${toTS("estado_en_ruta_al_destino")}  AS STRING) AS ts_camino_entrega,
      CAST(${toTS("estado_en_destino")}          AS STRING) AS ts_entregando,
      CAST(${toTS("estado_entregado")}           AS STRING) AS ts_finalizado,
      CAST(DATETIME_ADD(${toTS("estado_entregado")}, INTERVAL 5 MINUTE) AS STRING)       AS ts_disponible
    FROM ${VIEW()} t
    LEFT JOIN local_pol lp ON TRIM(t.local) = lp.local_name
    WHERE ${fechaWhere(desde, hasta)}
      AND ${FILTRO_BASE}
      ${extraWhere}
    ORDER BY ${FECHA_PARSE("fecha_creacion")} DESC, hora_creacion DESC
    LIMIT 1000
  `;
  return runQuery(sql);
}

// ─── Cumplimiento por tipo ────────────────────────────────────────────────────
export async function getCumplimientoPorTipo({ desde, hasta } = {}) {
  const sql = `
    ${LOCAL_POL_CTE}
    SELECT
      t.tipo_de_pago AS tipo_orden,
      COUNT(*)                      AS total,
      COUNTIF(${MIN_ENTREGA} <= 45) AS dentro_45,
      COUNTIF(${MIN_ENTREGA} > 45)  AS fuera_45,
      ROUND(AVG(${MIN_ENTREGA}), 1) AS avg_min
    FROM ${VIEW()} t
    LEFT JOIN local_pol lp ON TRIM(t.local) = lp.local_name
    WHERE ${fechaWhere(desde, hasta)}
      AND ${FILTRO_BASE}
    GROUP BY t.tipo_de_pago
    ORDER BY total DESC
  `;
  return runQuery(sql);
}

// ─── Tendencia diaria ────────────────────────────────────────────────────────
export async function getTrend({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    ${LOCAL_POL_CTE}
    SELECT
      ${FECHA_PARSE("t.fecha_creacion")} AS fecha_creacion,
      COUNT(*)                                      AS total,
      COUNTIF(${MIN_ENTREGA} <= ${U_OBJ})           AS dentro_obj,
      COUNTIF(${MIN_ENTREGA} >  ${U_OBJ})           AS fuera_obj,
      ROUND(AVG(${MIN_ENTREGA}), 1)                 AS avg_min
    FROM ${VIEW()} t
    LEFT JOIN local_pol lp ON TRIM(t.local) = lp.local_name
    WHERE ${fechaWhere(desde, hasta)}
      AND ${FILTRO_BASE}
      ${extraWhere}
    GROUP BY ${FECHA_PARSE("t.fecha_creacion")}
    ORDER BY ${FECHA_PARSE("t.fecha_creacion")}
  `;
  const rows = await runQuery(sql);
  return rows.map((r) => ({ ...r, fecha: r.fecha_creacion?.value ?? String(r.fecha_creacion) }));
}

// ─── KPIs por polígono ────────────────────────────────────────────────────────
export async function getKPIsPorPoligono({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    ${LOCAL_POL_CTE},
    base AS (
      SELECT lp.poligono,
        ${MIN_ENTREGA} AS min_entrega,
        ${MIN_PREP}    AS min_prep,
        ${MIN_ASIG}    AS min_asig,
        ${MIN_VIAJE}   AS min_viaje,
        ${MIN_PICKUP}  AS min_pickup,
        ${MIN_REP}     AS min_rep,
        t.nombre_conductor
      FROM ${VIEW()} t
      LEFT JOIN local_pol lp ON TRIM(t.local) = lp.local_name
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

// ─── KPIs por hora ────────────────────────────────────────────────────────────
export async function getKPIsPorHora({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    ${LOCAL_POL_CTE}
    SELECT
      CAST(SPLIT(t.hora_creacion, ':')[OFFSET(0)] AS INT64) AS hora,
      COUNT(*)                             AS total,
      COUNTIF(${MIN_ENTREGA} <= ${U_OBJ}) AS dentro_obj,
      ROUND(AVG(${MIN_ENTREGA}), 1)        AS avg_min
    FROM ${VIEW()} t
    LEFT JOIN local_pol lp ON TRIM(t.local) = lp.local_name
    WHERE ${fechaWhere(desde, hasta)}
      AND ${FILTRO_BASE}
      ${extraWhere}
      AND t.hora_creacion IS NOT NULL
    GROUP BY hora
    ORDER BY hora
  `;
  return runQuery(sql);
}

// ─── Top conductores ──────────────────────────────────────────────────────────
export async function getTopConductores({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    ${LOCAL_POL_CTE}
    SELECT
      t.nombre_conductor,
      COUNT(*)                                                           AS total,
      COUNTIF(${MIN_ENTREGA} <= ${U_OBJ})                               AS dentro_obj,
      ROUND(COUNTIF(${MIN_ENTREGA} <= ${U_OBJ}) / COUNT(*) * 100, 1)   AS pct_ok,
      ROUND(AVG(${MIN_ENTREGA}), 1)                                      AS avg_min
    FROM ${VIEW()} t
    LEFT JOIN local_pol lp ON TRIM(t.local) = lp.local_name
    WHERE ${fechaWhere(desde, hasta)}
      AND ${FILTRO_BASE}
      ${extraWhere}
      AND t.nombre_conductor IS NOT NULL
      AND TRIM(t.nombre_conductor) != ''
    GROUP BY t.nombre_conductor
    HAVING total >= 3
    ORDER BY total DESC
    LIMIT 40
  `;
  return runQuery(sql);
}

// ─── Locales ──────────────────────────────────────────────────────────────────
export async function getLocales({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    ${LOCAL_POL_CTE}
    SELECT DISTINCT TRIM(t.local) AS local
    FROM ${VIEW()} t
    LEFT JOIN local_pol lp ON TRIM(t.local) = lp.local_name
    WHERE ${fechaWhere(desde, hasta)}
      AND ${FILTRO_BASE}
      ${extraWhere}
      AND t.local IS NOT NULL AND TRIM(t.local) != ''
    ORDER BY local
    LIMIT 200
  `;
  return runQuery(sql);
}

// ─── Tendencia diaria de asignación ─────────────────────────────────────────
export async function getTendenciaAsig({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    ${LOCAL_POL_CTE}
    SELECT
      ${FECHA_PARSE("t.fecha_creacion")}                                        AS fecha,
      COUNT(*)                                                                   AS total,
      COUNTIF(${MIN_ENTREGA} <= ${U_OBJ})                                       AS dentro_obj,
      ROUND(AVG(${MIN_ENTREGA}), 1)                                              AS avg_min,
      ROUND(AVG(${MIN_ASIG}), 1)                                                 AS avg_asig,
      COUNTIF(${MIN_ASIG} > ${U_ASIG})                                           AS asig_lenta,
      ROUND(COUNTIF(${MIN_ASIG} > ${U_ASIG}) * 100.0 / COUNT(*), 1)             AS pct_asig_lenta,
      ROUND(COUNTIF(${MIN_ENTREGA} <= ${U_OBJ}) * 100.0 / COUNT(*), 1)          AS pct_ok
    FROM ${VIEW()} t
    LEFT JOIN local_pol lp ON TRIM(t.local) = lp.local_name
    WHERE ${fechaWhere(desde, hasta)}
      AND ${FILTRO_BASE}
      ${extraWhere}
    GROUP BY fecha
    ORDER BY fecha
  `;
  const rows = await runQuery(sql);
  return rows.map((r) => ({ ...r, fecha: r.fecha?.value ?? String(r.fecha) }));
}

// ─── Asignación por hora ──────────────────────────────────────────────────────
export async function getAsigPorHora({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    ${LOCAL_POL_CTE}
    SELECT
      CAST(SPLIT(t.hora_creacion, ':')[OFFSET(0)] AS INT64)                     AS hora,
      COUNT(*)                                                                   AS total,
      ROUND(AVG(${MIN_ASIG}), 1)                                                 AS avg_asig,
      COUNTIF(${MIN_ASIG} > ${U_ASIG})                                           AS asig_lenta,
      ROUND(COUNTIF(${MIN_ASIG} > ${U_ASIG}) * 100.0 / COUNT(*), 1)             AS pct_asig_lenta
    FROM ${VIEW()} t
    LEFT JOIN local_pol lp ON TRIM(t.local) = lp.local_name
    WHERE ${fechaWhere(desde, hasta)}
      AND ${FILTRO_BASE}
      ${extraWhere}
      AND t.hora_creacion IS NOT NULL
    GROUP BY hora
    ORDER BY hora
  `;
  return runQuery(sql);
}

// ─── Performance de asignación por driver ────────────────────────────────────
export async function getDriverAsig({ desde, hasta, extraWhere = "" } = {}) {
  const sql = `
    ${LOCAL_POL_CTE}
    SELECT
      t.nombre_conductor,
      COUNT(*)                                                                   AS total,
      ROUND(AVG(${MIN_ASIG}), 1)                                                 AS avg_asig,
      COUNTIF(${MIN_ASIG} > ${U_ASIG})                                           AS asig_lenta,
      ROUND(COUNTIF(${MIN_ASIG} > ${U_ASIG}) * 100.0 / COUNT(*), 1)             AS pct_asig_lenta,
      ROUND(AVG(${MIN_ENTREGA}), 1)                                              AS avg_min_entrega,
      ROUND(COUNTIF(${MIN_ENTREGA} <= ${U_OBJ}) * 100.0 / COUNT(*), 1)          AS pct_ok
    FROM ${VIEW()} t
    LEFT JOIN local_pol lp ON TRIM(t.local) = lp.local_name
    WHERE ${fechaWhere(desde, hasta)}
      AND ${FILTRO_BASE}
      ${extraWhere}
      AND t.nombre_conductor IS NOT NULL AND TRIM(t.nombre_conductor) != ''
    GROUP BY t.nombre_conductor
    HAVING COUNT(*) >= 2
    ORDER BY avg_asig DESC
    LIMIT 30
  `;
  return runQuery(sql);
}

// ─── Schema ───────────────────────────────────────────────────────────────────
export async function getSchema() {
  const sql = `
    SELECT column_name, data_type
    FROM \`${process.env.GCP_PROJECT_ID}.${process.env.BQ_DATASET || "shared_views"}.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = '${process.env.BQ_TABLE || "report_order_logistics"}'
    ORDER BY ordinal_position
  `;
  return runQuery(sql);
}
