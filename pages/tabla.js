import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";

// ─── Calendario Danke 2026 ─────────────────────────────────────────────────────

const SEMANAS = [
  { s: 1,  ini: "2026-01-01", label: "S1\n01-01"  },
  { s: 2,  ini: "2026-01-05", label: "S2\n01-05"  },
  { s: 3,  ini: "2026-01-12", label: "S3\n01-12"  },
  { s: 4,  ini: "2026-01-19", label: "S4\n01-19"  },
  { s: 5,  ini: "2026-01-26", label: "S5\n01-26"  },
  { s: 6,  ini: "2026-02-02", label: "S6\n02-02"  },
  { s: 7,  ini: "2026-02-09", label: "S7\n02-09"  },
  { s: 8,  ini: "2026-02-16", label: "S8\n02-16"  },
  { s: 9,  ini: "2026-02-23", label: "S9\n02-23"  },
  { s: 10, ini: "2026-03-02", label: "S10\n03-02" },
  { s: 11, ini: "2026-03-09", label: "S11\n03-09" },
  { s: 12, ini: "2026-03-16", label: "S12\n03-16" },
  { s: 13, ini: "2026-03-23", label: "S13\n03-23" },
  { s: 14, ini: "2026-03-30", label: "S14\n03-30" },
  { s: 15, ini: "2026-04-06", label: "S15\n04-06" },
  { s: 16, ini: "2026-04-13", label: "S16\n04-13" },
  { s: 17, ini: "2026-04-20", label: "S17\n04-20" },
  { s: 18, ini: "2026-04-27", label: "S18\n04-27" },
  { s: 19, ini: "2026-05-04", label: "S19\n05-04" },
  { s: 20, ini: "2026-05-11", label: "S20\n05-11" },
  { s: 21, ini: "2026-05-18", label: "S21\n05-18" },
  { s: 22, ini: "2026-05-25", label: "S22\n05-25" },
  { s: 23, ini: "2026-06-01", label: "S23\n06-01" },
  { s: 24, ini: "2026-06-08", label: "S24\n06-08" },
];

// Semana → mes (basado en fecha ini de cada semana)
const SEMANA_TO_MES = {
  1: 1, 2: 1, 3: 1, 4: 1, 5: 1,
  6: 2, 7: 2, 8: 2, 9: 2,
  10: 3, 11: 3, 12: 3, 13: 3, 14: 3,
  15: 4, 16: 4, 17: 4, 18: 4,
  19: 5, 20: 5, 21: 5, 22: 5,
  23: 6, 24: 6,
};

const MESES = [
  { num: 1, label: "Enero" },
  { num: 2, label: "Febrero" },
  { num: 3, label: "Marzo" },
  { num: 4, label: "Abril" },
  { num: 5, label: "Mayo" },
  { num: 6, label: "Junio" },
];

const TABLA_CLIENTES = [
  { cliente: "Don Tito",        label: "02. Don Tito" },
  { cliente: "Maria Almenara",  label: "03. Maria Almenara" },
  { cliente: "Pollo Real",      label: "04. Pollo Real" },
  { cliente: "Primos",          label: "05. Primos" },
  { cliente: "Tablon AQP",      label: "06.1 Tablon AQP" },
  { cliente: "Tablon CSC",      label: "06.2 Tablon CSC" },
  { cliente: "Tottus",          label: "07. Tottus" },
  { cliente: "Linterna",        label: "08. Linterna" },
  { cliente: "Hikari",          label: "09. Hikari" },
  { cliente: "Tori",            label: "10. Tori" },
  { cliente: "Flora y Fauna",   label: "11. Flora y Fauna" },
  { cliente: "Rosatel",         label: "12. Rosatel" },
  { cliente: "Vocadoh",         label: "13. Vocadoh" },
  { cliente: "Forus",           label: "14. Forus" },
  { cliente: "Mauval",          label: "15. Mauval" },
  { cliente: "Clientes Wosak",  label: "16. Clientes Wosak" },
];

const CLIENTE_GRUPO = {
  "Don Tito":       "Lima",
  "Maria Almenara": "Lima",
  "Primos":         "Lima",
  "Tottus":         "Lima",
  "Hikari":         "Lima",
  "Linterna":       "Lima",
  "Tori":           "Lima",
  "Pollo Real":     "Provincia",
  "Tablon AQP":     "Provincia",
  "Tablon CSC":     "Provincia",
  "Flora y Fauna":  "NoFoods",
  "Rosatel":        "NoFoods",
  "Vocadoh":        "NoFoods",
  "Forus":          "NoFoods",
  "Mauval":         "NoFoods",
  "Clientes Wosak": "Wosak",
};

// ─── Estilos por grupo ─────────────────────────────────────────────────────────

const GRUPO_STYLE = {
  Lima:      { bg: "#eff6ff", borderColor: "#60a5fa", textColor: "#1d4ed8" },
  Provincia: { bg: "#fffbeb", borderColor: "#fbbf24", textColor: "#b45309" },
  NoFoods:   { bg: "#f5f3ff", borderColor: "#8b5cf6", textColor: "#6d28d9" },
  Wosak:     { bg: "#ecfdf5", borderColor: "#10b981", textColor: "#047857" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n === 0) return "–";
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function VarBadge({ curr, prev, tipo }) {
  if (prev == null || prev === 0) return null;
  const delta = curr - prev;
  if (delta === 0) return null;
  const up = delta > 0;
  const goodUp = tipo === "ingreso" || tipo === "diferencia";
  const isGood = goodUp ? up : !up;
  const color = isGood ? "#059669" : "#dc2626";
  const arrow = up ? "▲" : "▼";
  const pct = Math.abs((delta / Math.abs(prev)) * 100).toFixed(1);
  return (
    <span style={{ display: "block", fontSize: 10, color, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
      {arrow} {pct}%
    </span>
  );
}

// ─── Componente de tabla (mes o semana) ───────────────────────────────────────

function TablaSection({ title, colKeys, colLabels, filas, ncols }) {
  // Totales globales
  const totIng = colKeys.map((_, i) => filas.reduce((s, f) => s + f.ingArr[i], 0));
  const totCos = colKeys.map((_, i) => filas.reduce((s, f) => s + f.cosArr[i], 0));
  const totYan = colKeys.map((_, i) => filas.reduce((s, f) => s + f.yanArr[i], 0));
  const totDif = colKeys.map((_, i) => totIng[i] - totCos[i] - totYan[i]);

  const grandIng = totIng.reduce((a, b) => a + b, 0);
  const grandCos = totCos.reduce((a, b) => a + b, 0);
  const grandYan = totYan.reduce((a, b) => a + b, 0);
  const grandDif = grandIng - grandCos - grandYan;

  const stickyLeft = {
    position: "sticky", left: 0, zIndex: 2,
  };
  const stickyCorner = {
    position: "sticky", left: 0, top: 0, zIndex: 4,
  };
  const stickyTop = {
    position: "sticky", top: 0, zIndex: 3,
  };

  return (
    <section style={{ padding: "0 24px 32px" }}>
      {/* título sección */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {title}
        </span>
        <div style={{ height: 1, flex: 1, background: "#cbd5e1" }} />
      </div>

      <div style={{
        borderRadius: 12, border: "1px solid #e2e8f0", overflow: "auto",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)", background: "white",
        maxHeight: "calc(100vh - 9rem)",
      }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 0, minWidth: "max-content", width: "100%" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              <th style={{
                ...stickyCorner, background: "#f8fafc",
                borderRight: "2px solid #e2e8f0",
                padding: "12px 20px", textAlign: "left",
                fontSize: 13, fontWeight: 700, color: "#4b5563",
                textTransform: "uppercase", letterSpacing: "0.05em",
                minWidth: 160,
              }}>
                Métrica
              </th>
              {colLabels.map((lbl, i) => (
                <th key={i} style={{
                  ...stickyTop, background: "#f8fafc",
                  padding: "12px 12px", textAlign: "right",
                  fontSize: 13, fontWeight: 700, color: "#6b7280",
                  textTransform: "uppercase", letterSpacing: "0.04em",
                  minWidth: 130, whiteSpace: "pre",
                }}>
                  {lbl}
                </th>
              ))}
              <th style={{
                ...stickyTop, background: "#f1f5f9",
                padding: "12px 12px", textAlign: "right",
                fontSize: 13, fontWeight: 700, color: "#374151",
                borderLeft: "2px solid #e2e8f0", minWidth: 130,
              }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {/* ══ Danke Total ══ */}
            <tr style={{ background: "#334155", borderTop: "2px solid #475569" }}>
              <td colSpan={ncols} style={{
                ...stickyLeft, background: "#334155",
                borderLeft: "4px solid rgba(255,255,255,0.4)",
                padding: "10px 20px",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "white" }}>
                  01. Danke — Total
                </span>
              </td>
            </tr>

            {/* Ingreso total */}
            <tr style={{ background: "#475569", borderTop: "1px solid #64748b" }}>
              <td style={{
                ...stickyLeft, background: "#475569",
                borderRight: "1px solid #64748b",
                borderLeft: "4px solid #38bdf8",
                padding: "10px 20px",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>Ingreso</span>
              </td>
              {totIng.map((v, i) => (
                <td key={i} style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums",
                  borderRight: "1px solid #64748b", color: v === 0 ? "#64748b" : "#e2e8f0" }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{fmt(v)}</span>
                  <VarBadge curr={v} prev={i > 0 ? totIng[i-1] : null} tipo="ingreso" />
                </td>
              ))}
              <td style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums",
                borderLeft: "2px solid #64748b", background: "#374151", color: "#e2e8f0" }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{fmt(grandIng)}</span>
              </td>
            </tr>

            {/* Costo total */}
            <tr style={{ background: "#475569", borderTop: "1px solid #64748b" }}>
              <td style={{
                ...stickyLeft, background: "#475569",
                borderRight: "1px solid #64748b",
                borderLeft: "4px solid #fb923c",
                padding: "10px 20px",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1" }}>Costo</span>
              </td>
              {totCos.map((v, i) => (
                <td key={i} style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums",
                  borderRight: "1px solid #64748b", color: v === 0 ? "#64748b" : "#cbd5e1" }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{fmt(v)}</span>
                  <VarBadge curr={v} prev={i > 0 ? totCos[i-1] : null} tipo="costo" />
                </td>
              ))}
              <td style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums",
                borderLeft: "2px solid #64748b", background: "#374151", color: "#cbd5e1" }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{fmt(grandCos)}</span>
              </td>
            </tr>

            {/* Yango total */}
            <tr style={{ background: "#475569", borderTop: "1px solid #64748b" }}>
              <td style={{
                ...stickyLeft, background: "#475569",
                borderRight: "1px solid #64748b",
                borderLeft: "4px solid #a78bfa",
                padding: "10px 20px",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#ddd6fe" }}>Yango</span>
              </td>
              {totYan.map((v, i) => (
                <td key={i} style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums",
                  borderRight: "1px solid #64748b", color: v === 0 ? "#64748b" : "#ddd6fe" }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{fmt(v)}</span>
                  <VarBadge curr={v} prev={i > 0 ? totYan[i-1] : null} tipo="yango" />
                </td>
              ))}
              <td style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums",
                borderLeft: "2px solid #64748b", background: "#374151", color: "#ddd6fe" }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{fmt(grandYan)}</span>
              </td>
            </tr>

            {/* Diferencia total */}
            <tr style={{ borderBottom: "2px solid #475569", background: grandDif >= 0 ? "#065f46" : "#991b1b" }}>
              <td style={{
                ...stickyLeft, background: grandDif >= 0 ? "#065f46" : "#991b1b",
                borderRight: "1px solid #64748b",
                borderLeft: grandDif >= 0 ? "4px solid #34d399" : "4px solid #f87171",
                padding: "10px 20px",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Diferencia</span>
              </td>
              {totDif.map((v, i) => (
                <td key={i} style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums",
                  borderRight: "1px solid rgba(255,255,255,0.15)", color: v === 0 ? "rgba(255,255,255,0.3)" : "white" }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{fmt(v)}</span>
                  <VarBadge curr={v} prev={i > 0 ? totDif[i-1] : null} tipo="diferencia" />
                </td>
              ))}
              <td style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums",
                borderLeft: "2px solid rgba(255,255,255,0.2)", background: grandDif >= 0 ? "#047857" : "#b91c1c", color: "white" }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{fmt(grandDif)}</span>
              </td>
            </tr>

            {/* ══ Por cliente ══ */}
            {filas.map((f) => {
              const gs = GRUPO_STYLE[f.grupo] || GRUPO_STYLE.Lima;
              const hasYango = f.yanT !== 0;
              return (
                <ClienteRows
                  key={f.cliente}
                  f={f}
                  gs={gs}
                  hasYango={hasYango}
                  ncols={ncols}
                  stickyLeft={stickyLeft}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ClienteRows({ f, gs, hasYango, ncols, stickyLeft }) {
  return (
    <>
      {/* Cabecera cliente */}
      <tr style={{ background: gs.bg, borderTop: "2px solid #e2e8f0" }}>
        <td colSpan={ncols} style={{
          ...stickyLeft, background: gs.bg,
          borderLeft: `4px solid ${gs.borderColor}`,
          padding: "8px 20px",
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: gs.textColor }}>
            {f.label}
          </span>
        </td>
      </tr>

      {/* Ingreso */}
      <tr style={{ background: "white", borderTop: "1px solid #f1f5f9" }}>
        <td style={{
          ...stickyLeft, background: "white",
          borderRight: "1px solid #e2e8f0", borderLeft: "4px solid #38bdf8",
          padding: "10px 20px",
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0369a1" }}>Ingreso</span>
        </td>
        {f.ingArr.map((v, i) => (
          <td key={i} style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums",
            borderRight: "1px solid #f1f5f9", color: v === 0 ? "#cbd5e1" : "#111827" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{fmt(v)}</span>
            <VarBadge curr={v} prev={i > 0 ? f.ingArr[i-1] : null} tipo="ingreso" />
          </td>
        ))}
        <td style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums",
          borderLeft: "2px solid #e2e8f0", background: "#f8fafc" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{fmt(f.ingT)}</span>
        </td>
      </tr>

      {/* Costo */}
      <tr style={{ background: "white", borderTop: "1px solid #f1f5f9" }}>
        <td style={{
          ...stickyLeft, background: "white",
          borderRight: "1px solid #e2e8f0", borderLeft: "4px solid #fb923c",
          padding: "10px 20px",
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#c2410c" }}>Costo</span>
        </td>
        {f.cosArr.map((v, i) => (
          <td key={i} style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums",
            borderRight: "1px solid #f1f5f9", color: v === 0 ? "#cbd5e1" : "#111827" }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{fmt(v)}</span>
            <VarBadge curr={v} prev={i > 0 ? f.cosArr[i-1] : null} tipo="costo" />
          </td>
        ))}
        <td style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums",
          borderLeft: "2px solid #e2e8f0", background: "#f8fafc" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{fmt(f.cosT)}</span>
        </td>
      </tr>

      {/* Yango (solo si tiene) */}
      {hasYango && (
        <tr style={{ background: "white", borderTop: "1px solid #f1f5f9" }}>
          <td style={{
            ...stickyLeft, background: "white",
            borderRight: "1px solid #e2e8f0", borderLeft: "4px solid #a78bfa",
            padding: "10px 20px",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#6d28d9" }}>Yango</span>
          </td>
          {f.yanArr.map((v, i) => (
            <td key={i} style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums",
              borderRight: "1px solid #f1f5f9", color: v === 0 ? "#cbd5e1" : "#111827" }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{fmt(v)}</span>
              <VarBadge curr={v} prev={i > 0 ? f.yanArr[i-1] : null} tipo="yango" />
            </td>
          ))}
          <td style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums",
            borderLeft: "2px solid #e2e8f0", background: "#f8fafc" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{fmt(f.yanT)}</span>
          </td>
        </tr>
      )}

      {/* Diferencia */}
      <tr style={{
        borderTop: "1px solid #e2e8f0", borderBottom: "2px solid #e2e8f0",
        background: f.difT >= 0 ? "#ecfdf5" : "#fef2f2",
      }}>
        <td style={{
          ...stickyLeft,
          background: f.difT >= 0 ? "#ecfdf5" : "#fef2f2",
          borderRight: "1px solid #e2e8f0",
          borderLeft: f.difT >= 0 ? "4px solid #10b981" : "4px solid #ef4444",
          padding: "10px 20px",
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Diferencia</span>
        </td>
        {f.difArr.map((v, i) => (
          <td key={i} style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums",
            borderRight: "1px solid #e2e8f0",
            color: v === 0 ? "#cbd5e1" : v > 0 ? "#059669" : "#dc2626" }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{fmt(v)}</span>
            <VarBadge curr={v} prev={i > 0 ? f.difArr[i-1] : null} tipo="diferencia" />
          </td>
        ))}
        <td style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums",
          borderLeft: "2px solid #e2e8f0",
          background: f.difT >= 0 ? "#d1fae5" : "#fee2e2",
          color: f.difT >= 0 ? "#065f46" : "#991b1b" }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{fmt(f.difT)}</span>
        </td>
      </tr>
    </>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────────

export default function TablaPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    fetch("/api/CostosGanancias")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // ─── Construir filas por semana ──────────────────────────────────────────────

  const filasSemana = useMemo(() => {
    if (!data?.porClienteSemana) return [];
    const pcs = data.porClienteSemana;

    return TABLA_CLIENTES.map(({ cliente, label }) => {
      const grupo  = CLIENTE_GRUPO[cliente] ?? "Lima";
      const bySem  = pcs[cliente] ?? {};

      const ingArr = SEMANAS.map(s => bySem[s.s]?.ingreso ?? 0);
      const cosArr = SEMANAS.map(s => bySem[s.s]?.costo   ?? 0);
      const yanArr = SEMANAS.map(s => bySem[s.s]?.yango   ?? 0);
      const difArr = SEMANAS.map((_, i) => ingArr[i] - cosArr[i] - yanArr[i]);

      const ingT = ingArr.reduce((a, b) => a + b, 0);
      const cosT = cosArr.reduce((a, b) => a + b, 0);
      const yanT = yanArr.reduce((a, b) => a + b, 0);
      const difT = ingT - cosT - yanT;

      return { cliente, label, grupo, ingArr, cosArr, yanArr, difArr, ingT, cosT, yanT, difT };
    }).filter(f => f.ingT !== 0 || f.cosT !== 0);
  }, [data]);

  // ─── Construir filas por mes ─────────────────────────────────────────────────

  const filasMes = useMemo(() => {
    if (!data?.porClienteSemana) return [];
    const pcs = data.porClienteSemana;

    return TABLA_CLIENTES.map(({ cliente, label }) => {
      const grupo  = CLIENTE_GRUPO[cliente] ?? "Lima";
      const bySem  = pcs[cliente] ?? {};

      // Agrupar semanas por mes
      const ingM = {}, cosM = {}, yanM = {};
      for (const s of SEMANAS) {
        const mes = SEMANA_TO_MES[s.s];
        const v   = bySem[s.s] ?? { ingreso: 0, costo: 0, yango: 0 };
        ingM[mes] = (ingM[mes] ?? 0) + v.ingreso;
        cosM[mes] = (cosM[mes] ?? 0) + v.costo;
        yanM[mes] = (yanM[mes] ?? 0) + v.yango;
      }

      const ingArr = MESES.map(m => ingM[m.num] ?? 0);
      const cosArr = MESES.map(m => cosM[m.num] ?? 0);
      const yanArr = MESES.map(m => yanM[m.num] ?? 0);
      const difArr = MESES.map((_, i) => ingArr[i] - cosArr[i] - yanArr[i]);

      const ingT = ingArr.reduce((a, b) => a + b, 0);
      const cosT = cosArr.reduce((a, b) => a + b, 0);
      const yanT = yanArr.reduce((a, b) => a + b, 0);
      const difT = ingT - cosT - yanT;

      return { cliente, label, grupo, ingArr, cosArr, yanArr, difArr, ingT, cosT, yanT, difT };
    }).filter(f => f.ingT !== 0 || f.cosT !== 0);
  }, [data]);

  // Diferencia anual global
  const grandDif = useMemo(() => {
    if (!data) return 0;
    return data.totales ? data.totales.utilidad : 0;
  }, [data]);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <Head><title>Tabla Costos y Ganancias · Danke 2026</title></Head>
      <div style={{ minHeight: "100vh", background: "#f1f5f9", color: "#111827", fontFamily: "Inter, system-ui, sans-serif" }}>

        {/* Header sticky */}
        <header style={{
          background: "white", borderBottom: "1px solid #e2e8f0",
          position: "sticky", top: 0, zIndex: 30,
          padding: "12px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.01em" }}>
              Control de Costos y Ganancias — Danke 2026
            </h1>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>
              Ingresos · Costos · Yango · Diferencia
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {!loading && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>
                  Diferencia anual
                </p>
                <p style={{
                  fontSize: 22, fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums",
                  color: grandDif >= 0 ? "#059669" : "#dc2626",
                }}>
                  S/ {Math.abs(Math.round(grandDif)).toLocaleString("es-PE")}
                </p>
              </div>
            )}
            <Link href="/costos" style={{
              fontSize: 13, background: "#f1f5f9", border: "1px solid #e2e8f0",
              padding: "6px 14px", borderRadius: 8, color: "#6b7280",
              textDecoration: "none", transition: "all 0.15s",
            }}>
              ← Costos
            </Link>
          </div>
        </header>

        {/* Estados */}
        {loading && (
          <div style={{ color: "#9ca3af", textAlign: "center", padding: 80, fontSize: 14 }}>
            Cargando datos…
          </div>
        )}
        {error && (
          <div style={{
            margin: 24, background: "#fef2f2", border: "1px solid #fca5a5",
            borderRadius: 10, padding: "16px 20px", color: "#dc2626", fontSize: 13,
          }}>
            Error: {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* Tabla mensual */}
            <div style={{ paddingTop: 24 }}>
              <TablaSection
                title="Por Mes"
                colKeys={MESES.map(m => m.num)}
                colLabels={MESES.map(m => m.label)}
                filas={filasMes}
                ncols={MESES.length + 2}
              />
            </div>

            {/* Tabla semanal */}
            <TablaSection
              title="Por Semana"
              colKeys={SEMANAS.map(s => s.s)}
              colLabels={SEMANAS.map(s => s.label)}
              filas={filasSemana}
              ncols={SEMANAS.length + 2}
            />
          </>
        )}
      </div>
    </>
  );
}
