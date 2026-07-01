import { useState, useMemo } from "react";

// ─── Paleta oscura (igual que AnalisisTab) ────────────────────────────────────
const BG     = "#0f172a";
const CARD   = "#1e293b";
const BORDER = "#334155";
const TEXT   = "#f1f5f9";
const MUTED  = "#94a3b8";
const RED    = "#ef4444";
const ORANGE = "#f97316";
const BLUE   = "#3b82f6";

const td = {
  padding: "6px 10px",
  borderBottom: `1px solid ${BORDER}`,
  fontSize: "0.72rem",
  whiteSpace: "nowrap",
  color: MUTED,
};

function StatChip({ label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "80px" }}>
      <span style={{ fontSize: "1.4rem", fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: "0.62rem", color: MUTED, textAlign: "center", lineHeight: 1.3, marginTop: 3 }}>{label}</span>
    </div>
  );
}

export default function RechazosTab({ rechazos = [] }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("no_tomaron");

  const filtered = useMemo(() => {
    let rows = rechazos;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.local?.toLowerCase().includes(q) ||
          r.poligono?.toLowerCase().includes(q) ||
          r.driver_tomo?.toLowerCase().includes(q) ||
          r.no_tomaron?.some((d) => d.toLowerCase().includes(q))
      );
    }
    return [...rows].sort((a, b) => {
      if (sortBy === "no_tomaron") return (b.no_tomaron?.length ?? 0) - (a.no_tomaron?.length ?? 0);
      if (sortBy === "min_asig")   return (b.min_asig ?? 0) - (a.min_asig ?? 0);
      if (sortBy === "fecha")      return ((a.fecha ?? "") + (a.hora ?? "")).localeCompare((b.fecha ?? "") + (b.hora ?? ""));
      return 0;
    });
  }, [rechazos, search, sortBy]);

  const driverCounts = useMemo(() => {
    const map = new Map();
    for (const r of rechazos) {
      for (const d of (r.no_tomaron ?? [])) {
        map.set(d, (map.get(d) || 0) + 1);
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [rechazos]);

  if (!rechazos.length) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: MUTED, fontSize: "0.8rem" }}>
        Sin rechazos detectados en el período seleccionado.
        <div style={{ fontSize: "0.7rem", marginTop: 6, color: "#475569" }}>
          Solo se muestran pedidos donde la asignación superó 5 min y había drivers disponibles que no lo tomaron.
        </div>
      </div>
    );
  }

  const avgDisp = (rechazos.reduce((s, r) => s + (r.no_tomaron?.length ?? 0), 0) / rechazos.length).toFixed(1);
  const avgEsp  = (rechazos.reduce((s, r) => s + (r.min_asig ?? 0), 0) / rechazos.length).toFixed(1);

  return (
    <div style={{ fontSize: "0.73rem" }}>

      {/* Stats */}
      <div style={{ display: "flex", gap: 24, padding: "12px 0 16px", flexWrap: "wrap", borderBottom: `1px solid ${BORDER}` }}>
        <StatChip label="Pedidos con oportunidad"    value={rechazos.length}     color={ORANGE} />
        <StatChip label="Drivers implicados"         value={driverCounts.length}  color={RED}    />
        <StatChip label="Disponibles / pedido (avg)" value={avgDisp}              color="#a78bfa" />
        <StatChip label="Espera promedio (min)"      value={avgEsp}               color={BLUE}   />
      </div>

      {/* Top drivers + Filtros */}
      <div style={{ display: "flex", gap: 24, padding: "14px 0", flexWrap: "wrap", alignItems: "flex-start", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ minWidth: 220, flex: "0 0 auto" }}>
          <div style={{ color: MUTED, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
            Top drivers con más rechazos
          </div>
          {driverCounts.map(([name, cnt], i) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ color: TEXT, fontSize: "0.7rem" }}>
                <span style={{ color: MUTED, marginRight: 6 }}>{i + 1}.</span>{name}
              </span>
              <span style={{ fontWeight: 700, color: RED, marginLeft: 12 }}>{cnt}</span>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ color: MUTED, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
            Filtrar / Ordenar
          </div>
          <input
            type="text"
            placeholder="Buscar local, polígono, driver…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "6px 10px", boxSizing: "border-box",
              background: BG, border: `1px solid ${BORDER}`, borderRadius: 6,
              color: TEXT, fontSize: "0.72rem", outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {[
              { key: "no_tomaron", label: "Por disponibles" },
              { key: "min_asig",   label: "Por espera" },
              { key: "fecha",      label: "Por fecha" },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setSortBy(key)} style={{
                padding: "4px 12px", fontSize: "0.68rem", borderRadius: 6, cursor: "pointer",
                border: sortBy === key ? `1px solid ${BLUE}` : `1px solid ${BORDER}`,
                background: sortBy === key ? "rgba(59,130,246,0.18)" : "transparent",
                color: sortBy === key ? "#93c5fd" : MUTED,
                fontWeight: sortBy === key ? 600 : 400,
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 360, marginTop: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {["Fecha", "Hora", "# Orden", "Polígono", "Local", "Min espera", "Tomó el pedido", "No tomaron (disponibles)"].map((h) => (
                <th key={h} style={{
                  padding: "6px 10px", textAlign: "left", fontWeight: 500, color: MUTED, fontSize: "0.68rem", whiteSpace: "nowrap",
                  ...(h === "# Orden" ? { width: 80, maxWidth: 80 } : {}),
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const espera = parseFloat(r.min_asig) || 0;
              const col = espera > 15 ? RED : espera > 10 ? ORANGE : MUTED;
              return (
                <tr key={r.no_orden ?? i} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)", verticalAlign: "top" }}>
                  <td style={td}>{r.fecha}</td>
                  <td style={td}>{r.hora}</td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: "0.65rem", color: "#64748b", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis" }}>{r.no_orden}</td>
                  <td style={td}>{r.poligono}</td>
                  <td style={{ ...td, maxWidth: 160, whiteSpace: "normal", color: TEXT }}>{r.local}</td>
                  <td style={{ ...td, fontWeight: 700, color: col, textAlign: "right" }}>{espera.toFixed(1)}</td>
                  <td style={{ ...td, color: TEXT }}>{r.driver_tomo || <span style={{ color: MUTED }}>—</span>}</td>
                  <td style={{ ...td, maxWidth: 280 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {(r.no_tomaron ?? []).map((d) => (
                        <span key={d} style={{ background: "rgba(239,68,68,0.15)", color: RED, padding: "1px 7px", borderRadius: 10, fontSize: "0.65rem", whiteSpace: "nowrap", border: "1px solid rgba(239,68,68,0.3)" }}>
                          {d}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: "20px", textAlign: "center", color: MUTED }}>Sin resultados para ese filtro.</div>
        )}
      </div>
    </div>
  );
}
