/**
 * GET /api/Analisis
 * Datos para el dashboard de Análisis Operacional.
 * Combina BigQuery (tiempos de entrega) + Google Sheets (programación).
 */

import {
  getKPIs,
  getCumplimientoPorProveedor,
  getKPIsPorPoligono,
  getKPIsPorHora,
  getTopConductores,
  getLocales,
  getPedidos,
  getTendenciaEtapas,
  getEtapasPorHora,
  getDriverEtapas,
  getKPIsPorLocal,
} from "../../lib/bigquery";

// ─── Filtro ciudad → BigQuery ────────────────────────────────────────────────
const CIUDAD_BQ_POLS = {
  Arequipa: ["Pol Cayma", "Pol Mariscal"],
  Cuzco:    ["Pol Larapa", "Pol La Cultura", "Pol Alameda"],
};
const CIUDAD_SHEET_POLS = {
  Arequipa: ["Pol Cayma", "Pol Mariscal"],
  Cuzco:    ["Pol Larapa", "Pol La Cultura", "Pol Alameda"],
};
const ALL_NON_LIMA_BQ = ["Pol Cayma", "Pol Mariscal", "Pol Larapa", "Pol La Cultura", "Pol Alameda"];

function buildExtraWhere(ciudad) {
  if (!ciudad || ciudad === "Todos") return "";
  const pols = CIUDAD_BQ_POLS[ciudad];
  if (pols) {
    const list = pols.map(p => `'${p}'`).join(", ");
    return `AND TRIM(IFNULL(lp.poligono,'')) IN (${list})`;
  }
  if (ciudad === "Lima") {
    const list = ALL_NON_LIMA_BQ.map(p => `'${p}'`).join(", ");
    return `AND (lp.poligono IS NULL OR TRIM(lp.poligono) NOT IN (${list}))`;
  }
  return "";
}

function filterBrechaByCiudad(rows, ciudad) {
  if (!ciudad || ciudad === "Todos") return rows;
  const pols = CIUDAD_SHEET_POLS[ciudad];
  if (pols) return rows.filter(r => pols.includes(r.poligono));
  if (ciudad === "Lima") return rows.filter(r => !ALL_NON_LIMA_BQ.includes(r.poligono));
  return rows;
}

// ─── Lookup: marca|tienda → local_logistic (campo `local` en BigQuery) ───────
const MARCA_TIENDA_TO_LOCAL = {
  "Bendita|San Borja": "Bendita - San Borja",
  "Caravana|San Isidro": "Caravana - San Isidro",
  "Caravana|San Miguel": "Caravana - San Miguel",
  "Carnica|San Miguel": "Carnica - San Miguel",
  "Don Tito|La Molina": "DT La Molina",
  "Don Tito|Magdalena": "DT Magdalena",
  "Don Tito|Miraflores": "DT Miraflores",
  "Don Tito|San Borja": "DT San Borja",
  "Don Tito|San Miguel": "DT San Miguel",
  "Don Tito|Surco": "DT Surco",
  "Di Mazza|Cayma": "Di Mazza Cayma",
  "El Chino Vegano|Jesus Maria": "El Chino Vegano JM",
  "Tablon|Alameda": "El Tablón - Alameda",
  "Tablon|Cayma": "El Tablón - Cayma",
  "Tablon|La Cultura": "El Tablón - La Cultura",
  "Tablon|Larapa": "El Tablón - Larapa",
  "Tablon|Mariscal": "El Tablón - Mariscal",
  "Flora y Fauna|La Mar": "FF01 La Mar",
  "Flora y Fauna|San Borja": "FF02 San Borja",
  "Flora y Fauna|Primavera": "FF03 Primavera",
  "Flora y Fauna|Benavides": "FF04 Benavides",
  "Flora y Fauna|La Molina": "FF05 La Molina",
  "Flora y Fauna|San Miguel": "FF06 San Miguel",
  "Flora y Fauna|Jesus Maria": "FF07 Jesús María",
  "Flora y Fauna|Barranco": "FF09 Barranco",
  "Flora y Fauna|El Polo": "FF10 El Polo",
  "Flora y Fauna|Cavenecia": "FF11 Cavenecia",
  "Flora y Fauna|Nicolas de Pierola": "FF12 Nicolás de Piérola",
  "Flora y Fauna|Dos de Mayo": "FF13 Dos de Mayo",
  "Granja Azul|El Polo": "Granja Azul El Polo",
  "Granja Azul|San Isidro": "Granja Azul San Isidro",
  "Hikari|La Molina": "Hikari - Molina",
  "Hikari|Rimac": "Hikari - Rimac",
  "Hikari|San Miguel": "Hikari - San Miguel",
  "La Ardilla Confiteria|Pueblo Libre": "La Ardilla Confitería - Pueblo Libre",
  "La Ardilla Confiteria|Santa Cruz": "La Ardilla Confitería - Santa Cruz",
  "La Mora|Miraflores": "La Mora - Miraflores",
  "La Mora|San Isidro": "La Mora - San Isidro",
  "La Mora|Surco": "La Mora - Surco",
  "Los Rolls de Diego|Miraflores": "Los Rolls de Diego - Miraflores",
  "Los Rolls de Diego|San Borja": "Los Rolls de Diego - San Borja",
  "Maria Almenara|2 de Mayo": "MARIA ALMENARA - 2 DE MAYO",
  "Maria Almenara|Andres Reyes": "MARIA ALMENARA - ARENALES",
  "Maria Almenara|Arenales": "MARIA ALMENARA - BARRANCO",
  "Maria Almenara|Barranco": "MARIA ALMENARA - BOLIVAR",
  "Maria Almenara|Bolivar": "MARIA ALMENARA - CAMACHO",
  "Maria Almenara|Camacho": "MARIA ALMENARA - CHORRILLOS",
  "Maria Almenara|La Encalada": "MARIA ALMENARA - LA ENCALADA",
  "Maria Almenara|La Marina": "MARIA ALMENARA - PASO 28",
  "Maria Almenara|Paso 28": "MARIA ALMENARA - PLATEROS",
  "Maria Almenara|Precursores": "MARIA ALMENARA - PLAZA NORTE",
  "Maria Almenara|San Miguel": "MARIA ALMENARA - SAN MIGUEL",
  "Maria Almenara|Santa Catalina": "MARIA ALMENARA - SANTACATA",
  "Maria Almenara|Santa Anita": "MARIA ALMENARA- SANTA ANITA",
  "Maria Almenara|Bolichera": "MM - BOLICHERA",
  "Maria Almenara|La Mar": "MM - LA MAR",
  "Maria Almenara|La Molina": "MM - LA MOLINA",
  "Mamma Tomato|Benavides": "MT Benavides",
  "Mamma Tomato|Camacho": "MT Camacho",
  "Mamma Tomato|Chorrillos": "MT Chorrillos",
  "Mamma Tomato|Mayo": "MT Dos de Mayo",
  "Mamma Tomato|Faucett": "MT Faucett",
  "Mamma Tomato|Fontana": "MT La Fontana",
  "Mamma Tomato|Flores": "MT Las Flores",
  "Mamma Tomato|Olivos": "MT Los Olivos",
  "Mamma Tomato|Primavera": "MT Primavera",
  "Mamma Tomato|Proceres": "MT Proceres",
  "Mamma Tomato|Libre": "MT Pueblo Libre",
  "Mamma Tomato|Borja": "MT San Borja",
  "Mamma Tomato|Universitaria": "MT Universitaria",
  "Moussa|Surquillo": "Moussa Surquillo",
  "Pollo Real|Dolores": "P Real Dolores",
  "Pollo Real|Ejercito": "P Real Ejército",
  "Pollo Real|Emmel": "P Real Emmel",
  "Pollo Real|Pierola": "P Real Piérola",
  "Pollo Real|Villalba": "P Real Villalba",
  "Poke Boss|El Polo": "Poke Boss El Polo",
  "Posho|Ejercito": "Posho Ejército",
  "Presto|Arequipa": "Presto Cenco Aqp",
  "Presto|EEUU": "Presto EEUU",
  "Presto|Ejercito": "Presto Ejercito",
  "Presto|Jerusalen": "Presto Jerusalen",
  "Primos|Espinar": "Primos - Espinar",
  "Primos|La Molina": "Primos - La Molina",
  "Primos|Miraflores": "Primos - Miraflores",
  "Primos|San Borja": "Primos - San Borja",
  "Primos|San Isidro": "Primos - San Isidro",
  "Quinoa|San Isidro": "Quinoa Dean Valdivia",
  "Quinoa|Miraflores": "Quinoa Miraflores",
  "Quinoa|Pardo y Aliaga": "Quinoa Pardo y Aliaga",
  "Quinoa|Plaza Republica": "Quinoa Plaza República",
  "Maria Almenara|San Isidro": "SIL -GOLF SAN ISIDRO",
  "Maria Almenara|Santa Cruz": "SIL- BIORITMO SANTACRUZ",
  "Maria Almenara|Encalada": "SIL- ENCALADA",
  "Maria Almenara|La Mar": "SIL- LA MAR",
  "Maria Almenara|La Marina": "SIL- LA MARINA",
  "Tori|Magdalena": "Tori Magdalena",
  "Tori|Miraflores": "Tori Miraflores",
  "Tori|San Borja": "Tori San Borja",
  "Tramontana|Lince": "Tramontana Lince",
  "Tramontana|San Miguel": "Tramontana San Miguel",
};

// ─── Lookup: local_logistic → polígono (de Direcciones tiendas.xlsx) ─────────
const LOCAL_TO_POL = {
  "Barba Negra - Miraflores": "Pol Espinar",
  "Bendita - Surquillo": "Pol Surquillo",
  "Bendita - San Borja": "Pol Encalada",
  "Bon Beef - Surco": "Pol Fontana",
  "Café de Lima - Angamos": "Pol Espinar",
  "Caravana - San Borja": "Pol San Borja",
  "Caravana - San Miguel": "Pol San Miguel",
  "Caravana - San Isidro": "Pol Andrés Reyes",
  "Caravana - Surquillo": "Pol Surquillo",
  "Carnica - San Miguel": "Pol San Miguel",
  "El Chino Vegano JM": "Pol Jesús María",
  "DT Magdalena": "Pol Magdalena",
  "DT Miraflores": "Pol Miraflores",
  "DT La Molina": "Pol Fontana",
  "Food Center Pueblo Libre": "Pol Pueblo Libre",
  "La Ardilla Confitería - Santa Cruz": "Pol Espinar",
  "La Ardilla Confitería - Pueblo Libre": "Pol Pueblo Libre",
  "La Mora - Chorrillos Dark": "Pol Huaylas",
  "La Mora - San Isidro": "Pol Espinar",
  "La Mora - Miraflores": "Pol Espinar",
  "La Mora - Surco": "Pol Encalada",
  "LAS DELICIAS - LA MAR": "Pol Espinar",
  "SILVESTRE-JOCKEY PLAZA": "Pol Camacho",
  "MARIA ALMENARA - PASO 28": "Pol Miraflores",
  "MARIA ALMENARA - CHORRILLOS": "Pol Chorrillos",
  "MM - ANDRES REYES": "Pol Andrés Reyes",
  "MARIA ALMENARA - CAMACHO": "Pol Fontana",
  "MM - LA MOLINA": "Pol Molina",
  "MARIA ALMENARA - SANTACATA": "Pol Santa Catalina",
  "MARIA ALMENARA - SAN MIGUEL": "Pol San Miguel",
  "MM - LA MARINA": "Pol Pueblo Libre",
  "MARIA ALMENARA - 2 DE MAYO": "Pol Andrés Reyes",
  "MARIA ALMENARA - ARENALES": "Pol Arenales",
  "MARIA ALMENARA - BOLIVAR": "Pol Pueblo Libre",
  "MARIA ALMENARA - LA ENCALADA": "Pol Encalada",
  "MM - BOLICHERA": "Pol Bolichera",
  "MM - LA MAR": "Pol Espinar",
  "MM - PRECURSORES": "Pol Encalada",
  "MARIA ALMENARA - BARRANCO": "Pol Miraflores",
  "Natural Chef Miraflores": "Pol Miraflores",
  "Primon B - Pueblo Libre": "Pol Pueblo Libre",
  "Primos - Miraflores": "Pol Miraflores",
  "Primos - Espinar": "Pol Espinar",
  "Primos - San Isidro": "Pol Andrés Reyes",
  "Primos - La Molina": "Pol Fontana",
  "Los Rolls de Diego - Miraflores": "Pol Espinar",
  "Los Rolls de Diego - Chorrillos": "Pol Huaylas",
  "Los Rolls de Diego - San Borja": "Pol Encalada",
  "Primos - San Borja": "Pol Encalada",
  "Café de Lima - 28 de Julio": "Pol Miraflores",
  "Bon Beef - San Isidro": "Pol Espinar",
  "MT Chorrillos": "Pol Huaylas",
  "MT San Borja": "Pol San Borja",
  "MT Proceres": "Pol Bolichera",
  "MT Camacho": "Pol Fontana",
  "MT Faucett": "Pol San Miguel",
  "MT Dos de Mayo": "Pol Andrés Reyes",
  "MT Pueblo Libre": "Pol Pueblo Libre",
  "MT La Fontana": "Pol Fontana",
  "MT Primavera": "Pol Encalada",
  "MT Benavides": "Pol Miraflores",
  "MT San Miguel": "Pol San Miguel",
  "SIL -BIORITMO EL POLO": "Pol Encalada",
  "SIL- LA MAR": "Pol Espinar",
  "SIL-GOLF INKAS": "Pol Camacho",
  "SIL -GOLF SAN ISIDRO": "Pol Espinar",
  "SIL- BIORITMO SANTACRUZ": "Pol Espinar",
  "Quinoa Pardo y Aliaga": "Pol Espinar",
  "Quinoa Cronos": "Pol Encalada",
  "Quinoa Miraflores": "Pol Miraflores",
  "Quinoa Panama": "Pol Andrés Reyes",
  "Quinoa Dean Valdivia": "Pol Andrés Reyes",
  "SIL- LA MARINA": "Pol Pueblo Libre",
  "SIL- LA MOLINA": "Pol Molina",
  "SIL- ENCALADA": "Pol Encalada",
  "EZZEM": "Pol Espinar",
  "Presto General Moran": "Pol Mariscal",
  "Presto EEUU": "Pol Dolores",
  "Presto Ejercito": "Pol Cayma",
  "Presto Cenco Aqp": "Pol Cerro Colorado",
  "Presto Jerusalen": "Pol Mariscal",
  "Presto Dolores": "Pol Mariscal",
  "Presto Paseo Central": "Pol Paseo Central",
  "El Tablón - Cayma": "Pol Cayma",
  "El Tablón - Mariscal": "Pol Mariscal",
  "P Real Piérola": "Pol Mariscal",
  "P Real Ejército": "Pol Cayma",
  "P Real Villalba": "Pol Mariscal",
  "P Real Dolores": "Pol Mariscal",
  "P Real Emmel": "Pol Cayma",
  "P Real Lambramani": "Pol Mariscal",
  "Di Mazza Cayma": "Pol Cayma",
  "Posho Ejército": "Pol Cayma",
  "Alfa B. Cayma": "Pol Cayma",
  "El Tablón - La Cultura": "Pol Centro",
  "El Tablón - Larapa": "Pol Larapa",
  "El Tablón - Alameda": "Pol Centro",
  "SIL- BARRANCO": "Pol Miraflores",
  "Granja Azul San Isidro": "Pol Magdalena",
  "Granja Azul El Polo": "Pol Encalada",
  "La Panka San Borja": "Pol Encalada",
  "Poke Boss San Isidro": "Pol Andrés Reyes",
  "Poke Boss Lince": "Pol Andrés Reyes",
  "Poke Boss Miraflores": "Pol Miraflores",
  "Poke Boss El Polo": "Pol Encalada",
  "Tramontana Lince": "Pol Andrés Reyes",
  "Tramontana San Miguel": "Pol San Miguel",
  "Tramontana La Molina": "Pol Fontana",
};

// ─── Google Sheets ────────────────────────────────────────────────────────────
const SHEET_ID =
  "2PACX-1vT6SUp1hOvRaQ7n0YEKyyKMJFakDrCiFOoLqIiV8SbiUIJtiYrGaswSHXc_FLg7a3BnVCy1bp22t6k0";
const GID_FOOD   = "1654839337";
const GID_NOFOOD = "1854074073";

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQ = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"' && inQ && line[i + 1] === '"') { current += '"'; i += 2; continue; }
    if (ch === '"') { inQ = !inQ; i++; continue; }
    if (ch === "," && !inQ) { result.push(current.trim()); current = ""; i++; continue; }
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

// ─── Helpers de tiempo ────────────────────────────────────────────────────────
function toMin(t) {
  if (!t) return null;
  const s = String(t).trim();
  // Fracción decimal de Google Sheets (0.75 = 18:00)
  if (/^\d+\.\d+$/.test(s)) return Math.round(parseFloat(s) * 24 * 60);
  const m = s.match(/(\d{1,2}):(\d{2})/);
  return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null;
}

function normDate(s) {
  if (!s) return null;
  const str = String(s).trim();
  // DD/MM/YYYY o DD-MM-YYYY → YYYY-MM-DD
  const m1 = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, "0")}-${m1[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return null;
}

// ─── parseTurnos (brecha agregada — no cambia) ────────────────────────────────
function parseTurnos(text, categoria, sCol, polCol, statusCol) {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const idx = (n) => headers.indexOf(n);

  const iSemana = idx(sCol);
  const iPol    = idx(polCol);
  const iStatus = idx(statusCol);
  const iStatus2 = categoria === "Food"
    ? headers.lastIndexOf("Status")
    : idx("Status_2");
  const iNomReempl = idx("Nombre del Reemplazo");

  return lines.slice(1).flatMap((line) => {
    const v = parseCSVLine(line);
    const semana   = (v[iSemana] ?? "").trim();
    const poligono = (v[iPol]    ?? "").trim();
    if (!semana || !poligono) return [];
    let status = (v[iStatus] ?? "").trim();
    if (status !== "Asistió" && iStatus2 >= 0 && (v[iStatus2] ?? "").trim() === "Asistió") {
      status = "Asistió";
    }
    return [{ semana, poligono, status }];
  });
}

// ─── parseTurnosDetalle (dato crudo por driver — para rechazos) ───────────────
function parseTurnosDetalle(text, isFood) {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const idx = (n) => headers.indexOf(n);

  const iFecha   = idx("Fecha");
  const iPol     = isFood ? idx("Polígono") : -1;
  const iMarca   = isFood ? -1 : idx("Marca");
  const iTienda  = idx("Tienda");
  const iIngreso = idx("Ingreso");
  const iSalida  = idx("Salida");
  const iTipo    = idx("Tipo");
  const iStatus  = idx("Status");
  const iStatus2 = headers.lastIndexOf("Status");
  const iNombre  = idx("Nombre");
  const iReempl  = idx("Nombre del Reemplazo");

  return lines.slice(1).flatMap((line) => {
    const v = parseCSVLine(line);
    let status = (v[iStatus] ?? "").trim();
    let nombre = (v[iNombre] ?? "").trim().toUpperCase();

    // Si el titular no asistió pero hay reemplazo que sí asistió
    if (status !== "Asistió" && iStatus2 > iStatus && (v[iStatus2] ?? "").trim() === "Asistió") {
      status = "Asistió";
      const reempl = (v[iReempl] ?? "").trim().toUpperCase();
      if (reempl) nombre = reempl;
    }

    if (status !== "Asistió" || !nombre) return [];

    const fecha   = normDate(v[iFecha]);
    const ingreso = toMin(v[iIngreso]);
    const salida  = toMin(v[iSalida]);
    const tipo    = (v[iTipo]   ?? "").trim();
    const tienda  = (v[iTienda] ?? "").trim();
    const marca   = isFood ? "" : (v[iMarca] ?? "").trim();

    if (!fecha) return [];

    let poligono      = "";
    let localLogistic = "";

    if (isFood) {
      poligono = iPol >= 0 ? (v[iPol] ?? "").trim() : "";
    } else {
      const key     = `${marca}|${tienda}`;
      localLogistic = MARCA_TIENDA_TO_LOCAL[key] || "";
      poligono      = localLogistic ? (LOCAL_TO_POL[localLogistic] || "") : "";
    }

    return [{ fecha, poligono, marca, tienda, localLogistic, ingreso, salida, tipo, nombre, isFood }];
  });
}

// ─── crossReferenceRechazos ───────────────────────────────────────────────────
function crossReferenceRechazos(pedidos, turnos) {
  const LIMITE_ASIG = 5;

  // Mapa de actividad por driver: nombre_upper → [{fecha, desde, hasta}]
  const activity = new Map();
  for (const p of pedidos) {
    if (!p.nombre_conductor || !p.ts_asignando) continue;
    const key   = String(p.nombre_conductor).trim().toUpperCase();
    const fecha = normDate(p.fecha_creacion);
    const desde = toMin(p.ts_asignando);
    const hasta = toMin(p.ts_disponible || p.ts_finalizado);
    if (!fecha || desde === null) continue;
    if (!activity.has(key)) activity.set(key, []);
    activity.get(key).push({ fecha, desde, hasta: hasta ?? desde + 60 });
  }

  const rechazos = [];

  for (const p of pedidos) {
    const minAsig = parseFloat(p.min_asignacion);
    if (isNaN(minAsig) || minAsig <= LIMITE_ASIG) continue;

    const fechaPed = normDate(p.fecha_creacion);
    const horaPed  = toMin(p.hora_creacion);
    const localPed = String(p.local     ?? "").trim();
    const polPed   = String(p.poligono  ?? "").trim();
    const tomoPed  = String(p.nombre_conductor ?? "").trim().toUpperCase();

    if (!fechaPed || horaPed === null) continue;

    const disponibles = [];

    for (const t of turnos) {
      if (t.fecha !== fechaPed) continue;
      if (t.ingreso === null || t.salida === null) continue;
      if (horaPed < t.ingreso || horaPed > t.salida) continue;

      // ¿Puede tomar este pedido según su tipo?
      const esODM = !t.tipo || t.tipo.toUpperCase().includes("ODM");
      if (esODM) {
        if (t.poligono !== polPed) continue;
      } else {
        // Fijo/Tienda: comparar por local_logistic
        const localDriver = t.localLogistic
          || MARCA_TIENDA_TO_LOCAL[`${t.marca}|${t.tienda}`]
          || "";
        if (localDriver !== localPed) continue;
      }

      // ¿Está ocupado con otra entrega en ese momento?
      const acts = activity.get(t.nombre) || [];
      const ocupado = acts.some(
        (a) => a.fecha === fechaPed && horaPed >= a.desde && horaPed <= a.hasta
      );
      if (ocupado) continue;

      // ¿Es el driver que sí tomó el pedido?
      if (t.nombre === tomoPed) continue;

      disponibles.push(t.nombre);
    }

    if (disponibles.length > 0) {
      rechazos.push({
        no_orden:    p.no_orden,
        fecha:       p.fecha_creacion,
        hora:        String(p.hora_creacion ?? "").slice(0, 5),
        local:       localPed,
        poligono:    polPed,
        min_asig:    minAsig,
        driver_tomo: p.nombre_conductor ?? "—",
        no_tomaron:  [...new Set(disponibles)],
      });
    }
  }

  // Ordenar: más drivers disponibles que no tomaron primero
  return rechazos.sort((a, b) => b.no_tomaron.length - a.no_tomaron.length);
}

// ─── fetchTurnosData: brecha + detalle en un solo fetch ──────────────────────
async function fetchTurnosData() {
  const [foodText, noFoodText] = await Promise.all([
    fetchCSV(GID_FOOD),
    fetchCSV(GID_NOFOOD),
  ]);

  // Brecha agregada (existente)
  const rows = [
    ...parseTurnos(foodText,   "Food",   "Semana", "Polígono", "Status"),
    ...parseTurnos(noFoodText, "NoFood", "Semana", "Polígono", "Status"),
  ];
  const map = new Map();
  for (const r of rows) {
    const key = `${r.semana}||${r.poligono}`;
    if (!map.has(key)) map.set(key, { semana: r.semana, poligono: r.poligono, programados: 0, asistentes: 0 });
    const e = map.get(key);
    e.programados += 1;
    if (r.status === "Asistió") e.asistentes += 1;
  }
  const brecha = [...map.values()].sort((a, b) =>
    a.semana.localeCompare(b.semana) || a.poligono.localeCompare(b.poligono)
  );

  // Detalle por driver para rechazos
  const turnosDetalle = [
    ...parseTurnosDetalle(foodText,   true),
    ...parseTurnosDetalle(noFoodText, false),
  ];

  return { brecha, turnosDetalle };
}

// ─── Agrupación por marca (derivada de LOCAL_TO_MARCA inverso) ────────────────
function buildPorMarca(porLocal) {
  const LOCAL_TO_MARCA = {};
  for (const [key, local] of Object.entries(MARCA_TIENDA_TO_LOCAL)) {
    const marca = key.split("|")[0].trim();
    if (!LOCAL_TO_MARCA[local]) LOCAL_TO_MARCA[local] = marca;
  }

  const map = {};
  for (const r of porLocal) {
    const marca = LOCAL_TO_MARCA[r.local]
      || (r.local?.includes(" - ") ? r.local.split(" - ")[0].trim() : r.local?.split(" ")[0] ?? "Otros");
    if (!map[marca]) {
      map[marca] = { marca, total: 0, dentro_obj: 0, fuera_obj: 0, sumMin: 0, sumPrep: 0, sumAsig: 0, sumViaje: 0, sumPickup: 0, sumRep: 0, causa_tienda: 0, causa_asignacion: 0, causa_viaje: 0, causa_pickup: 0, causa_reparto: 0 };
    }
    const m = map[marca];
    const t = Number(r.total) || 0;
    m.total         += t;
    m.dentro_obj    += Number(r.dentro_obj) || 0;
    m.fuera_obj     += Number(r.fuera_obj)  || 0;
    m.sumMin        += (parseFloat(r.avg_min)    || 0) * t;
    m.sumPrep       += (parseFloat(r.avg_prep)   || 0) * t;
    m.sumAsig       += (parseFloat(r.avg_asig)   || 0) * t;
    m.sumViaje      += (parseFloat(r.avg_viaje)  || 0) * t;
    m.sumPickup     += (parseFloat(r.avg_pickup) || 0) * t;
    m.sumRep        += (parseFloat(r.avg_rep)    || 0) * t;
    m.causa_tienda      += Number(r.causa_tienda)      || 0;
    m.causa_asignacion  += Number(r.causa_asignacion)  || 0;
    m.causa_viaje       += Number(r.causa_viaje)       || 0;
    m.causa_pickup      += Number(r.causa_pickup)      || 0;
    m.causa_reparto     += Number(r.causa_reparto)     || 0;
  }
  const r1 = (n, d) => d > 0 ? Math.round(n / d * 10) / 10 : 0;
  return Object.values(map).map(m => ({
    marca: m.marca, total: m.total, dentro_obj: m.dentro_obj, fuera_obj: m.fuera_obj,
    avg_min: r1(m.sumMin, m.total), avg_prep: r1(m.sumPrep, m.total), avg_asig: r1(m.sumAsig, m.total),
    avg_viaje: r1(m.sumViaje, m.total), avg_pickup: r1(m.sumPickup, m.total), avg_rep: r1(m.sumRep, m.total),
    causa_tienda: m.causa_tienda, causa_asignacion: m.causa_asignacion, causa_viaje: m.causa_viaje,
    causa_pickup: m.causa_pickup, causa_reparto: m.causa_reparto,
  })).sort((a, b) => b.total - a.total);
}

// ─── Rango de fechas por defecto ─────────────────────────────────────────────
function defaultRange(desde, hasta) {
  const today = new Date();
  const fmt = (d) => d.toISOString().split("T")[0];
  const h = hasta || fmt(today);
  const d = desde || fmt(new Date(today.setDate(today.getDate() - 14)));
  return { desde: d, hasta: h };
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const range  = defaultRange(req.query.desde, req.query.hasta);
  const ciudad = req.query.ciudad ?? "Todos";
  const local  = req.query.local  ?? "Todos";

  const extraWhereCity = buildExtraWhere(ciudad);
  const localWhere = (local && local !== "Todos")
    ? `AND TRIM(IFNULL(\`local\`,'')) = '${local.replace(/'/g, "\\'")}'`
    : "";
  const extraWhere = [extraWhereCity, localWhere].filter(Boolean).join("\n      ");
  const bqFull = { ...range, extraWhere };
  const bqCity = { ...range, extraWhere: extraWhereCity };

  const [r_kpis, r_prov, r_pol, r_hora, r_cond, r_turnos, r_locales, r_pedidos,
         r_tendAsig, r_asigHora, r_driverAsig, r_local] =
    await Promise.allSettled([
      getKPIs(bqFull),
      getCumplimientoPorProveedor(bqCity),
      getKPIsPorPoligono(bqFull),
      getKPIsPorHora(bqFull),
      getTopConductores(bqFull),
      fetchTurnosData(),
      getLocales(bqCity),
      getPedidos(bqFull),
      getTendenciaEtapas(bqFull),
      getEtapasPorHora(bqFull),
      getDriverEtapas(bqFull),
      getKPIsPorLocal(bqFull),
    ]);

  const safe = (r, fallback) => (r.status === "fulfilled" ? r.value : fallback);

  const kpis        = safe(r_kpis,      {});
  const proveedor   = safe(r_prov,      []);
  const porPoligono = safe(r_pol,       []);
  const porHora     = safe(r_hora,      []);
  const conductores = safe(r_cond,      []);
  const turnosData  = safe(r_turnos,    { brecha: [], turnosDetalle: [] });
  const brecha      = filterBrechaByCiudad(turnosData.brecha, ciudad);
  const locales     = safe(r_locales,   []).map((r) => r.local).filter(Boolean);
  const tendEtapas    = safe(r_tendAsig,   []);
  const etapasPorHora = safe(r_asigHora,   []);
  const driverEtapas  = safe(r_driverAsig, []);
  const porLocal      = safe(r_local,      []);
  const porMarca      = buildPorMarca(porLocal);

  const flatRow = (row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = v !== null && typeof v === "object" && "value" in v ? v.value : v;
    }
    return out;
  };
  const pedidos  = safe(r_pedidos, []).map(flatRow);
  const rechazos = crossReferenceRechazos(pedidos, turnosData.turnosDetalle);

  const errors = [];
  if (r_kpis.status       === "rejected") errors.push({ source: "kpis",        msg: r_kpis.reason?.message });
  if (r_pol.status        === "rejected") errors.push({ source: "poligono",    msg: r_pol.reason?.message });
  if (r_hora.status       === "rejected") errors.push({ source: "hora",        msg: r_hora.reason?.message });
  if (r_cond.status       === "rejected") errors.push({ source: "conductor",   msg: r_cond.reason?.message });
  if (r_turnos.status     === "rejected") errors.push({ source: "turnos",      msg: r_turnos.reason?.message });
  if (r_pedidos.status    === "rejected") errors.push({ source: "pedidos",     msg: r_pedidos.reason?.message });
  if (r_locales.status    === "rejected") errors.push({ source: "locales",     msg: r_locales.reason?.message });
  if (r_tendAsig.status   === "rejected") errors.push({ source: "tendEtapas",  msg: r_tendAsig.reason?.message });
  if (r_asigHora.status   === "rejected") errors.push({ source: "etapasPorHora", msg: r_asigHora.reason?.message });
  if (r_driverAsig.status === "rejected") errors.push({ source: "driverEtapas",  msg: r_driverAsig.reason?.message });
  if (r_local.status      === "rejected") errors.push({ source: "porLocal",       msg: r_local.reason?.message });
  if (errors.length) console.error("[Analisis API] query errors:", JSON.stringify(errors));

  res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=60");
  return res.status(200).json({
    kpis, proveedor, porPoligono, porHora, conductores,
    brecha, locales, pedidos, rechazos,
    tendEtapas, etapasPorHora, driverEtapas,
    porLocal, porMarca,
    range, errors,
  });
}
