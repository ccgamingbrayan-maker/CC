export default function PrintsScryfall({ prints }) {
  if (!prints || prints.length === 0) return null;

  return (
    <div className="prints-scryfall">
      <h3>All prints / otras versiones de la carta</h3>
      <table>
        <thead>
          <tr>
            <th>Print</th>
            <th>USD</th>
            <th>EUR</th>
            <th>TIX</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {prints.map((p) => (
            <tr key={p.id}>
              <td>
                {p.imagen && (
                  <img src={p.imagen} alt={p.nombre} className="print-thumb" />
                )}
                <span>{p.set} #{p.numero}</span>
              </td>
              <td>{p.precios.usd ? `$${p.precios.usd}` : "-"}</td>
              <td>{p.precios.eur ? `€${p.precios.eur}` : "-"}</td>
              <td>{p.precios.tix ? p.precios.tix : "-"}</td>
              <td>
                <a href={p.url} target="_blank" rel="noreferrer">Ver</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {prints.length >= 40 && <p className="prints-nota">Mostrando 40 versiones.</p>}
    </div>
  );
}


