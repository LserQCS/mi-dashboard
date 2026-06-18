export default function TareoTable({ data = [], categoria = "Food" }) {
  if (!data.length) return <div className="empty">Sin datos de tareo</div>;

  const isFood = categoria === "Food";

  const statusBadge = (s) => {
    if (!s) return "—";
    const sl = s.toLowerCase();
    if (sl.includes("activ") || sl === "a")
      return <span className="badge badge-green">{s}</span>;
    if (sl.includes("inactiv") || sl === "i")
      return <span className="badge badge-red">{s}</span>;
    return <span className="badge badge-yellow">{s}</span>;
  };

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {isFood && <th>Polígono</th>}
            {!isFood && <th>Marca</th>}
            <th>Tienda</th>
            <th>Nombre</th>
            <th>DNI</th>
            <th>Fecha</th>
            <th>Ingreso</th>
            <th>Salida</th>
            <th>Q Horas</th>
            <th>Tipo</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {isFood  && <td>{row.poligono || "—"}</td>}
              {!isFood && <td>{row.marca    || "—"}</td>}
              <td>{row.tienda       || "—"}</td>
              <td>{row.nombre       || "—"}</td>
              <td>{row.dni          || "—"}</td>
              <td>{row.fecha        || "—"}</td>
              <td>{row.ingreso_prog || "—"}</td>
              <td>{row.salida_prog  || "—"}</td>
              <td>{row.horas        || "—"}</td>
              <td>{row.tipo         || "—"}</td>
              <td>{statusBadge(row.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
