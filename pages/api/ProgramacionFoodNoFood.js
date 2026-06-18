/**
 * GET /api/ProgramacionFoodNoFood
 * Devuelve { no_food: [...], food: [...], total: N }
 * desde los CSV públicos de Google Sheets (Programación Food + No Food).
 */
import { getTareo } from "../../lib/sheets";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ?debug=1 → devuelve los encabezados crudos del CSV para diagnóstico
    if (req.query.debug === "1") {
      const { getRawHeaders } = await import("../../lib/sheets");
      const headers = await getRawHeaders();
      return res.status(200).json({ ok: true, headers });
    }

    const data = await getTareo({ desde: req.query.desde, hasta: req.query.hasta });
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=120");
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error("[/api/ProgramacionFoodNoFood]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
