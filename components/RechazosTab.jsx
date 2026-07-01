import { useState, useMemo } from "react";

export default function RechazosTab({ rechazos = [] }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("no_tomaron"); // "no_tomaron" | "min_asig" | "fecha"

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
      if (sortBy === "no_tomaron") return b.no_tomaron.length - a.no_tomaron.length;
      if (sortBy === "min_asig")   return b.min_asig - a.min_asig;
      if (sortBy === "fecha")      return (a.fecha + a.hora).localeCompare(b.fecha + b.hora);
      return 0;
    });
  }, [rechazos, search, sortBy]);

  // Resumen: drivers con más rechazos
  const driverCounts = useMemo(() => {
    const map = new Map();
    for (const r of rechazos) {
      for (const d of r.no_tomaron) {
        map.set(d, (map.get(d) || 0) + 1);
      }
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [rechazos]);

  if (!rechazos.length) {
    return (
      <div style={{ padding: "32px", textAlign: "center", color: "#888", fontSize: "14px" }}>
        Sin rechazos detectados en el período seleccionado.
        <br />
        <span style={{ fontSize: "12px" }}>
          (Solo se muestran pedidos donde el tiempo de asignación superó los 5 min y había drivers disponibles que no lo tomaron)
        </span>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "sans-serif", fontSize: "13px" }}>
      {/* Header stats */}
      <div style={{ display: "flex", gap: "16px", padding: "12px 16px", background: "#f8f8f8", borderBottom: "1px solid #e0e0e0", flexWrap: "wrap" }}>
        <StatChip label="Pedidos con oportunidad" value={rechazos.length} color="#e67e22" />
        <StatChip
          label="Drivers implicados"
          value={driverCounts.length}
          color="#c0392b"
        />
        <StatChip
          label="Promedio disponibles / pedido"
          value={(rechazos.reduce((s, r) => s + r.no_tomaron.length, 0) / rechazos.length).toFixed(1)}
          color="#8e44ad"
        />
        <StatChip
          label="Espera promedio (min)"
          value={(rechazos.reduce((s, r) => s + r.min_asig, 0) / rechazos.length).toFixed(1)}
          color="#2980b9"
        />
      </div>

      <div style={{ display: "flex", gap: "16px", padding: "12px 16px", flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Top drivers que no toman */}
        <div style={{ minWidth: "220px", flex: "0 0 auto" }}>
          <div style={{ fontWeight: 600, marginBottom: "6px", color: "#333" }}>Top drivers con más rechazos</div>
          {driverCounts.map(([name, cnt], i) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #f0f0f0" }}>
              <span style={{ color: "#555" }}>
                <span style={{ color: "#999", marginRight: "6px" }}>{i + 1}.</span>
                {name}
              </span>
              <span style={{ fontWeight: 600, color: "#c0392b", marginLeft: "12px" }}>{cnt}</span>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ flex: 1, minWidth: "180px" }}>
          <div style={{ fontWeight: 600, marginBottom: "6px", color: "#333" }}>Filtrar / Ordenar</div>
          <input
            type="text"
            placeholder="Buscar local, polígono, driver…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "6px 8px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "13px", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
            {[
              { key: "no_tomaron", label: "Por disponibles" },
              { key: "min_asig",   label: "Por espera" },
              { key: "fecha",      label: "Por fecha" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                style={{
                  padding: "4px 10px", fontSize: "12px", borderRadius: "4px", cursor: "pointer",
                  border: sortBy === key ? "1px solid #2980b9" : "1px solid #ddd",
                  background: sortBy === key ? "#2980b9" : "#fff",
                  color: sortBy === key ? "#fff" : "#555",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              {["Fecha", "Hora", "# Orden", "Polígono", "Local", "Min espera", "Tomó el pedido", "No tomaron (disponibles)"].map((h) => (
                <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600, color: "#444", fontSize: "12px", whiteSpace: "nowrap", borderBottom: "1px solid #ddd" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.no_orden} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", verticalAlign: "top" }}>
                <td style={td}>{r.fecha}</td>
                <td style={td}>{r.hora}</td>
                <td style={{ ...td, fontFamily: "monospace", fontSize: "11px" }}>{r.no_orden}</td>
                <td style={td}>{r.poligono}</td>
                <td style={{ ...td, maxWidth: "160px", whiteSpace: "normal" }}>{r.local}</td>
                <td style={{ ...td, fontWeight: 600, color: r.min_asig > 15 ? "#c0392b" : r.min_asig > 10 ? "#e67e22" : "#555" }}>
                  {r.min_asig.toFixed(1)}
                </td>
                <td style={td}>{r.driver_tomo}</td>
                <td style={{ ...td, maxWidth: "240px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {r.no_tomaron.map((d) => (
                      <span key={d} style={{ background: "#fdecea", color: "#c0392b", padding: "1px 6px", borderRadius: "10px", fontSize: "11px", whiteSpace: "nowrap" }}>
                        {d}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>Sin resultados para ese filtro.</div>
        )}
      </div>
    </div>
  );
}

const td = { padding: "6px 10px", borderBottom: "1px solid #f0f0f0", fontSize: "12px", whiteSpace: "nowrap" };

function StatChip({ label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "80px" }}>
      <span style={{ fontSize: "20px", fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: "10px", color: "#777", textAlign: "center", lineHeight: "1.2" }}>{label}</span>
    </div>
  );
}
