import { ExternalLink } from "lucide-react";

export default function BuyThisCard({ compra }) {
  if (!compra) return null;

  const tiendas = [
    { nombre: "TCGplayer",   moneda: "USD", ...compra.tcgplayer },
    { nombre: "Cardmarket",  moneda: "EUR", ...compra.cardmarket },
    { nombre: "Cardhoarder", moneda: "TIX", ...compra.cardhoarder },
  ];

  const disponibles = tiendas.filter((t) => t.precio != null && t.precio !== "");
  if (disponibles.length === 0) return null;

  return (
    <div className="buy-card">
      <h4>Compra esta carta en</h4>
      <div className="buy-lista">
        {disponibles.map((t) => (
          <a
            key={t.nombre}
            className="buy-row"
            href={t.url ?? undefined}
            target="_blank"
            rel="noreferrer"
          >
            <span className="buy-tienda">{t.nombre}</span>
            <span className="buy-precio">
              {Number(t.precio).toFixed(2)} {t.moneda}
              <ExternalLink size={14} />
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}


