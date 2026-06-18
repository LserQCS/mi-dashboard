# Dashboard Disponibilidad Drivers

Dashboard Next.js → Vercel que conecta **BigQuery** (pedidos de `liquidaciones_logistic`) con **Google Sheets** (tareo de drivers).

---

## Estructura del proyecto

```
drivers-dashboard/
├── lib/
│   ├── bigquery.js       # cliente BigQuery + queries
│   └── sheets.js         # cliente Google Sheets API
├── pages/
│   ├── _app.js
│   ├── index.js          # dashboard principal
│   └── api/
│       ├── pedidos.js    # GET /api/pedidos
│       └── tareo.js      # GET /api/tareo
├── components/
│   ├── KPICard.jsx
│   ├── CumplimientoChart.jsx
│   └── TareoTable.jsx
├── styles/globals.css
├── .env.local.example    # ← copia esto a .env.local y rellena
├── next.config.js
└── package.json
```

---

## Setup en 4 pasos

### 1. Instalar dependencias

```bash
cd drivers-dashboard
npm install
```

### 2. Crear la Service Account de GCP

1. En Google Cloud Console → **IAM → Service Accounts** → Crear cuenta.
2. Asignar roles:
   - `BigQuery Data Viewer`
   - `BigQuery Job User`
3. Crear una **clave JSON** y descargarla.
4. Compartir el **Google Sheet del tareo** con el email de la service account (`client_email` del JSON).

### 3. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Edita `.env.local`:

```env
GCP_PROJECT_ID=mi-proyecto-gcp
BQ_DATASET=liquidaciones_logistic
BQ_TABLE=pedidos                        # nombre real de tu tabla/vista

GCP_SERVICE_ACCOUNT_JSON={"type":"service_account",...}   # JSON en una sola línea

SHEETS_SPREADSHEET_ID=1A2B3C4D...      # ID del Google Sheet
SHEETS_TAREO_RANGE=Turnos driver!A1:H500
```

> **Tip:** Para convertir el JSON a una sola línea:
> ```bash
> cat service-account.json | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)))"
> ```

### 4. Correr en local

```bash
npm run dev
```

Abre http://localhost:3000

---

## Ajustar columnas de BigQuery

Si tu tabla tiene nombres de columna distintos, edita `lib/bigquery.js` → función `getPedidos()`.  
Los campos esperados son:

| Campo en código | Descripción |
|---|---|
| `no_orden` | ID del pedido |
| `local` | Nombre del local |
| `nombre_conductor` | Driver asignado |
| `poligono` | Zona de entrega |
| `ts_creacion` | Timestamp de creación |
| `ts_entregado` | Timestamp de entrega |
| `ts_asignando`, `ts_en_ruta_comercio`, etc. | Estados intermedios |

---

## Deploy en Vercel

```bash
npm i -g vercel
vercel
```

En el panel de Vercel → **Settings → Environment Variables**, agrega las mismas variables de `.env.local`.

> ⚠ **Nunca** subas `.env.local` ni el archivo `service-account.json` al repositorio (ya están en `.gitignore`).

---

## Endpoints disponibles

| Endpoint | Descripción |
|---|---|
| `GET /api/pedidos?view=kpis&dias=7` | KPIs globales |
| `GET /api/pedidos?view=poligono&dias=7` | Cumplimiento por polígono |
| `GET /api/pedidos?view=detalle&dias=7` | Filas individuales |
| `GET /api/tareo` | Turnos del Google Sheet |
