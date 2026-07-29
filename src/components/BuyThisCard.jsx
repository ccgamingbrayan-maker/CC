
export default function BuyThisCard({ compra }) {
  if (!compra) return null;

  const tiendas = [
    { nombre: "Buy on TCGplayer",   simbolo: "$", ...compra.tcgplayer },
    { nombre: "Buy on Cardmarket",  simbolo: "€", ...compra.cardmarket },
    { nombre: "Buy on Cardhoarder", simbolo: "",  ...compra.cardhoarder },
  ];

  const hayPrecios = tiendas.some((t) => t.precio);
  if (!hayPrecios) return null;

  return (
    <div className="buy-card">
      <h4>BUY THIS CARD</h4>
      {tiendas.map((t) =>
        t.precio ? (
          <a
            key={t.nombre}
            className="buy-row"
            href={t.url}
            target="_blank"
            rel="noreferrer"
          >
            <span>{t.nombre}</span>
            <span>{t.simbolo}{t.precio}</span>
          </a>
        ) : null
      )}
    </div>
  );
}


