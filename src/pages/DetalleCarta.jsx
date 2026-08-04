import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { buscarCartaScryfall, buscarPrintsDesdeUri } from "../lib/scryfall.js";
import BuyThisCard from "../components/BuyThisCard.jsx";
import CarruselRelacionados from "../components/CarruselRelacionados.jsx";

export default function DetalleCarta({ onAgregar }) {
  const { cartaId } = useParams();
  const [carta, setCarta] = useState(null);
  const [compra, setCompra] = useState(null);
  // no prints loaded on detail view; only show stored card details
  const [cargando, setCargando] = useState(true);
  const [relacionadas, setRelacionadas] = useState([]);
  const [accesorios, setAccesorios] = useState([]);

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
        // Otras cartas del mismo juego (para el carrusel de relacionadas)
        supabase
          .from("cartas")
          .select("id,nombre,imagen,precio")
          .eq("juego_id", data.juego_id)
          .neq("id", data.id)
          .limit(20)
          .then(({ data: otras }) =>
            setRelacionadas((otras ?? []).map((c) => ({ ...c, tipo: "carta" })))
          );

        // Accesorios guardados (son genéricos, sirven para cualquier carta)
        supabase
          .from("accesorios")
          .select("id,nombre,imagen,precio")
          .order("creado_en", { ascending: false })
          .limit(20)
          .then(({ data: accs }) =>
            setAccesorios((accs ?? []).map((a) => ({ ...a, tipo: "accesorio" })))
          );
      }

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
          {carta.precio != null ? (
            <>
              <p className="detalle-precio">${carta.precio.toLocaleString("es-CO")} COP</p>
              <p style={{ color: "var(--texto-suave)" }}>Stock: {carta.stock}</p>
              <button onClick={onAgregar}>Agregar al carrito</button>
            </>
          ) : (
            <p style={{ color: "var(--texto-suave)" }}>Carta de exhibición, no disponible para la venta.</p>
          )}

          <BuyThisCard compra={compra} />
        </div>
      </div>

      <div className="contenedor">
        <CarruselRelacionados
          titulo="También te puede interesar"
          items={mezclar(relacionadas, accesorios)}
        />
      </div>
    </section>
  );
}

// Intercala dos listas para que cartas y accesorios queden mezclados
// en una sola tira, en vez de agrupados.
function mezclar(a, b) {
  const out = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}


