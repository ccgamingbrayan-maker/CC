import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { buscarCartaScryfall, buscarPrintsDesdeUri } from "../lib/scryfall.js";
import BuyThisCard from "../components/BuyThisCard.jsx";

export default function DetalleCarta({ onAgregar }) {
  const { cartaId } = useParams();
  const [carta, setCarta] = useState(null);
  const [compra, setCompra] = useState(null);
  // no prints loaded on detail view; only show stored card details
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      const { data } = await supabase
        .from("cartas")
        .select("*")
        .eq("id", Number(cartaId))
        .single();
      setCarta(data);

      if (data) {
        // Try to find the exact print matching the stored image and show its market prices
        setCompra(null);
        try {
          const info = await buscarCartaScryfall(data.nombre);
          if (info?.printsSearchUri) {
            const versiones = await buscarPrintsDesdeUri(info.printsSearchUri);
            if (versiones && versiones.length > 0) {
              // attempt to find a print whose any image uri matches stored carta.imagen
              const match = versiones.find((p) => {
                if (!p.image_uris) return false;
                return Object.values(p.image_uris).some((u) => u === data.imagen) || p.imagen === data.imagen;
              });
              if (match) {
                setCompra({
                  tcgplayer: { precio: match.precios?.usd ?? null, moneda: "USD", url: match.purchase_uris?.tcgplayer ?? null },
                  cardmarket: { precio: match.precios?.eur ?? null, moneda: "EUR", url: match.purchase_uris?.cardmarket ?? null },
                  cardhoarder: { precio: match.precios?.tix ?? null, moneda: "TIX", url: match.purchase_uris?.cardhoarder ?? null },
                });
              }
            }
          }
        } catch (e) {
          // ignore fetch errors — detail view still shows stored price
          console.error("Error buscando print para detalle:", e);
        }
      }

      setCargando(false);
    }
    cargar();
  }, [cartaId]);

  if (cargando) return <p className="contenedor">Cargando carta…</p>;
  if (!carta) return <p className="contenedor">Carta no encontrada.</p>;

  return (
    <section className="juegos">
      <div className="contenedor detalle-carta">
        <img src={carta.imagen} alt={carta.nombre} />

        <div className="detalle-info">
          <h2>{carta.nombre}</h2>
          <p className="detalle-precio">${carta.precio.toLocaleString("es-CO")} COP</p>
          <p style={{ color: "var(--texto-suave)" }}>Stock: {carta.stock}</p>
          <button onClick={onAgregar}>Agregar al carrito</button>

          <BuyThisCard compra={compra} />
        </div>
      </div>

      <div className="contenedor">
        {/* detalle de la carta solo muestra la carta guardada y su precio */}
      </div>
    </section>
  );
}
