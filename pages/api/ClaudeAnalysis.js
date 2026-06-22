/**
 * /api/ClaudeAnalysis
 * Endpoint SSE: recibe datos del dashboard, construye prompt y hace streaming
 * de la respuesta de Claude (claude-haiku-4-5) al cliente.
 *
 * POST { panel: "disponibilidad" | "operacional", datos: {...} }
 */
import Anthropic from "@anthropic-ai/sdk";

export const config = {
  api: { bodyParser: true },
  maxDuration: 60,
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Prompt builders ────────────────────────────────────────────────────────────

function buildDisponibilidad(d) {
  const k   = d.kpis  ?? {};
  const kp  = d.prev  ?? {};
  const tar = d.tareo ?? {};

  const total     = Number(k.total_pedidos)   || 0;
  const dentro    = Number(k.dentro_obj)       || 0;
  const fuera     = Number(k.fuera_obj)        || 0;
  const cumpl     = total > 0 ? ((dentro / total) * 100).toFixed(1) : "—";
  const cumplPrev = kp.total_pedidos > 0 ? ((kp.dentro_obj / kp.total_pedidos) * 100).toFixed(1) : "—";

  const cT = Number(k.causa_tienda)     || 0;
  const cA = Number(k.causa_asignacion) || 0;
  const cV = Number(k.causa_viaje)      || 0;
  const cR = Number(k.causa_reparto)    || 0;
  const pct = (n, d2) => d2 > 0 ? ((n / d2) * 100).toFixed(1) : "0.0";

  const brecha = d.brecha ?? [];
  const totalProg  = brecha.reduce((s, r) => s + (r.prog  || 0), 0);
  const totalAsist = brecha.reduce((s, r) => s + (r.asist || 0), 0);
  const ausentismo = totalProg > 0 ? (((totalProg - totalAsist) / totalProg) * 100).toFixed(1) : "0.0";
  const criticos   = brecha.filter((r) => r.aus >= 10).map((r) => `${r.pol} (${r.aus}%)`).join(", ") || "ninguno";

  const provLines = (d.proveedor ?? []).slice(0, 8).map((r) => {
    const p = r.total > 0 ? ((r.dentro_obj / r.total) * 100).toFixed(0) : 0;
    return `  - ${r.proveedor} ${r.tipo_orden || "Simple"}: ${r.total} pedidos, ${p}% OK, avg ${r.avg_min ?? "—"} min`;
  }).join("\n");

  return `Eres un experto en logística de última milla para una empresa de delivery en Lima, Perú. Analiza los siguientes datos operacionales del dashboard de Disponibilidad y entrega un análisis ejecutivo accionable.

## Datos Dashboard — Disponibilidad de Drivers
Período analizado: ${d.desde ?? "—"} → ${d.hasta ?? "—"}

### KPIs Principales
- Total pedidos: ${total.toLocaleString()}
- Cumplimiento ≤45 min: ${cumpl}% (período anterior: ${cumplPrev}%)
- Pedidos dentro de objetivo: ${dentro.toLocaleString()}
- Pedidos fuera de objetivo: ${fuera.toLocaleString()}
- Tiempo promedio de entrega: ${k.avg_min_entrega ?? "—"} min
- Drivers activos: ${k.drivers_activos ?? "—"}
- Proveedores: ${k.proveedores ?? "—"}

### Desglose de pedidos
- Pedidos simples (objetivo ≤45 min): ${k.total_simples ?? "—"} total — ${k.simples_ok ?? "—"} OK, ${k.simples_fuera ?? "—"} fuera
- Multipedidos (objetivo ≤75 min): ${k.total_multi ?? "—"} total — ${k.multi_ok ?? "—"} OK, ${k.multi_fuera ?? "—"} fuera

### Árbol de causas (pedidos fuera de objetivo: ${fuera})
- 🏪 Preparación en tienda (O−Creación >25 min): ${cT} pedidos — ${pct(cT, fuera)}%
- 🔄 Asignación de driver (P−O >5 min): ${cA} pedidos — ${pct(cA, fuera)}%
- 🛣️ Viaje al local (Q−P >10 min): ${cV} pedidos — ${pct(cV, fuera)}%
- 📦 Reparto al cliente (U−S >12 min): ${cR} pedidos — ${pct(cR, fuera)}%
(Un pedido puede tener múltiples causas)

### Tiempos promedio por etapa
- Prep. tienda: ${k.avg_prep ?? "—"} min (umbral: 25 min)
- Asignación driver: ${k.avg_asignacion ?? "—"} min (umbral: 5 min)
- Viaje al local: ${k.avg_viaje ?? "—"} min (umbral: 10 min)
- Reparto: ${k.avg_reparto ?? "—"} min (umbral: 12 min)

### Brecha de turnos (Programados vs Asistentes)
- Total programados: ${totalProg} | Asistentes: ${totalAsist} | Ausentismo: ${ausentismo}%
- Polígonos críticos (>10% ausentismo): ${criticos}

### Cumplimiento por proveedor
${provLines || "  Sin datos"}

---

Responde en **español** con el siguiente formato exacto:

## 🔍 Diagnóstico General
(2-3 oraciones con el estado actual y si la operación está mejorando o deteriorándose)

## 🚨 Puntos Críticos
(Top 3 problemas más urgentes, cada uno con el impacto cuantificado en pedidos o minutos)

## 🔎 Causas Raíz
(Para cada punto crítico, explica por qué está ocurriendo basándote en los datos)

## ⚡ Plan de Acción
(5-7 acciones concretas ordenadas por prioridad. Para cada una: QUÉ hacer, QUIÉN lo ejecuta, CUÁNDO y CÓMO medir el resultado)

## 🏃 Quick Wins (esta semana)
(2-3 cosas que se pueden implementar en menos de 3 días con alto impacto)

Sé específico, usa los números del dashboard y evita generalidades.`;
}

function buildOperacional(d) {
  const k  = d.kpis       ?? {};
  const kd = d.kpiDelta   ?? {};
  const sem = d.semanas    ?? [];

  const semLines = sem.map((s) =>
    `  - S${s.semana}: ${s.pedidos} pedidos, ${s.drivers} drivers, ${s.productividad?.toFixed(2) ?? "—"} ped/h, S/.${s.costo?.toFixed(2) ?? "—"} costo/ped, eficiencia ${s.eficiencia?.toFixed(1) ?? "—"}%`
  ).join("\n");

  const polLines = (d.porPoligono ?? []).slice(0, 10).map((p) =>
    `  - ${p.poligono}: ${p.pedidos} ped, ${p.productividad?.toFixed(2) ?? "—"} ped/h, S/.${p.costoPedido?.toFixed(2) ?? "—"}/ped`
  ).join("\n");

  return `Eres un experto en logística de última milla y control de costos para una empresa de delivery en Lima, Perú. Analiza los siguientes datos operacionales del dashboard de Productividad y entrega un análisis ejecutivo accionable.

## Datos Dashboard — Productividad Operacional
Filtros activos: Semanas ${d.selSemanas?.join(", ") ?? "—"} | ${d.selFood ?? "Todos"} | Polígono: ${d.selPoligono ?? "Todos"}

### KPIs Globales del período
- Total pedidos: ${(k.totalPedidos ?? 0).toLocaleString()}
- Total horas trabajadas: ${(k.totalHoras ?? 0).toFixed(1)} h
- Total costo drivers: S/.${(k.totalCosto ?? 0).toLocaleString()}
- Drivers activos: ${k.drivers ?? "—"}
- Productividad promedio: ${(k.productividad ?? 0).toFixed(2)} ped/hora
- Costo por pedido: S/.${(k.costoPorPedido ?? 0).toFixed(2)}
- Eficiencia de horas (real vs planificado): ${(k.eficiencia ?? 0).toFixed(1)}%

### Variación semana a semana (última vs anterior)
- Pedidos: ${kd.pedidos != null ? (kd.pedidos >= 0 ? "+" : "") + kd.pedidos + "%" : "—"}
- Productividad: ${kd.prod != null ? (kd.prod >= 0 ? "+" : "") + kd.prod + "%" : "—"}
- Costo/pedido: ${kd.cpp != null ? (kd.cpp >= 0 ? "+" : "") + kd.cpp + "%" : "—"}
- Eficiencia: ${kd.ef != null ? (kd.ef >= 0 ? "+" : "") + kd.ef + "%" : "—"}
- Drivers: ${kd.drivers != null ? (kd.drivers >= 0 ? "+" : "") + kd.drivers + "%" : "—"}

### Evolución por semana
${semLines || "  Sin datos"}

### Rendimiento por polígono (top)
${polLines || "  Sin datos"}

---

Responde en **español** con el siguiente formato exacto:

## 🔍 Diagnóstico General
(2-3 oraciones sobre la eficiencia operacional y tendencia de costos)

## 🚨 Puntos Críticos
(Top 3 problemas más urgentes: polígonos ineficientes, semanas de caída, costos elevados — con números)

## 🔎 Causas Raíz
(Por qué está ocurriendo cada problema según los datos)

## ⚡ Plan de Acción
(5-7 acciones concretas para mejorar productividad y reducir costo/pedido. QUÉ, QUIÉN, CUÁNDO, CÓMO medir)

## 🏃 Quick Wins (esta semana)
(2-3 ajustes inmediatos de alto impacto en productividad o costo)

Sé específico, usa los números del dashboard y evita generalidades.`;
}

// ── Handler ────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada en variables de entorno" });
  }

  const { panel, datos } = req.body ?? {};
  if (!panel || !datos) return res.status(400).json({ error: "Faltan panel o datos" });

  const prompt = panel === "operacional"
    ? buildOperacional(datos)
    : buildDisponibilidad(datos);

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const stream = client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
        const chunk = event.delta.text;
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        if (typeof res.flush === "function") res.flush();
      }
    }

    res.write("data: [DONE]\n\n");
  } catch (err) {
    console.error("[ClaudeAnalysis]", err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }

  res.end();
}
