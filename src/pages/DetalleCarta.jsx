import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { useCart } from "../lib/CartContext.jsx";
import { buscarCartaScryfall, buscarPrintsDesdeUri } from "../lib/scryfall.js";
import { buscarPrintsPokemon } from "../lib/pokemon.js";
import BuyThisCard from "../components/BuyThisCard.jsx";
import Cargando from "../components/Cargando.jsx";
import CarruselRelacionados from "../components/CarruselRelacionados.jsx";

export default function DetalleCarta({ onAgregar }) {
  const { cartaId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items } = useCart();
  const [carta, setCarta] = useState(null);
  const [popKey, setPopKey] = useState(null);
  const [enWishlist, setEnWishlist] = useState(false);
  const [enCarritos, setEnCarritos] = useState(0);
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

      // Cuántas personas tienen esta carta guardada en su carrito
      if (data) {
        supabase
          .from("carrito_conteo")
          .select("total")
          .eq("tipo", "carta")
          .eq("item_id", data.id)
          .maybeSingle()
          .then(({ data: c }) => setEnCarritos(c?.total ?? 0));
      }

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
        // Precios de "otros portales" para el cuadrito de compra.
        setCompra(null);
        if (Number(data.juego_id) === 3) {
          // Pokémon: TCGplayer y Cardmarket desde la Pokémon TCG API.
          try {
            const versiones = await buscarPrintsPokemon(data.nombre);
            const match =
              versiones.find((p) => p.imagen === data.imagen) ?? versiones[0];
            if (match?.compra) setCompra(match.compra);
          } catch (e) {
            console.error("Error buscando print Pokémon para detalle:", e);
          }
        } else {
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
      }

      setCargando(false);
    }
    cargar();
  }, [cartaId]);

  // Saber si el usuario actual ya guardó esta carta
  useEffect(() => {
    if (!user || !carta) {
      setEnWishlist(false);
      return;
    }
    supabase
      .from("wishlist")
      .select("id")
      .eq("user_id", user.id)
      .eq("carta_id", carta.id)
      .maybeSingle()
      .then(({ data }) => setEnWishlist(!!data));
  }, [user, carta]);

  async function toggleWishlist() {
    if (!user) {
      navigate("/login");
      return;
    }
    if (enWishlist) {
      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("user_id", user.id)
        .eq("carta_id", carta.id);
      if (!error) setEnWishlist(false);
    } else {
      const { error } = await supabase
        .from("wishlist")
        .insert({ user_id: user.id, carta_id: carta.id });
      if (!error) setEnWishlist(true);
    }
  }

  if (cargando) return <Cargando texto="Cargando carta…" />;
  if (!carta) return <p className="contenedor">Carta no encontrada.</p>;

  const enCarrito = items.find((i) => i.tipo === "carta" && i.item_id === carta.id);
  const cantidadEnCarrito = enCarrito?.cantidad ?? 0;
  const agotado = carta.stock != null && cantidadEnCarrito >= carta.stock;

  function agregarConPop() {
    if (agotado) return;
    onAgregar({ tipo: "carta", id: carta.id });
    setPopKey(Date.now());
  }

  return (
    <section className="juegos">
      <div className="contenedor detalle-carta">
        <img src={carta.imagen} alt={carta.nombre} />

        <div className="detalle-info">
          <h2>{carta.nombre}</h2>
          {carta.precio != null ? (
            <>
              <p className="detalle-precio">${carta.precio.toLocaleString("es-CO")} COP</p>
              <p className="detalle-stock">Stock: {carta.stock}</p>
              <div className="detalle-acciones">
                <span className="btn-pop-wrap">
                  <button onClick={agregarConPop} disabled={agotado}>
                    {agotado ? "Sin stock disponible" : "Agregar al carrito"}
                  </button>
                  {popKey && (
                    <span key={popKey} className="mas-uno" onAnimationEnd={() => setPopKey(null)}>
                      +1
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  className={`wishlist-btn ${enWishlist ? "activo" : ""}`}
                  onClick={toggleWishlist}
                  aria-label="Guardar en wishlist"
                  title={enWishlist ? "Quitar de tu wishlist" : "Guardar en tu wishlist"}
                >
                  <Heart size={20} fill={enWishlist ? "currentColor" : "none"} />
                </button>
              </div>
              {cantidadEnCarrito > 0 && (
                <p className="detalle-suave">
                  Ya tienes {cantidadEnCarrito} en tu carrito
                  {carta.stock != null ? ` (máx. ${carta.stock})` : ""}
                </p>
              )}
              {enCarritos >= 1 && (
                <p className="wishlist-conteo carrito-conteo">
                  <ShoppingCart size={13} />
                  {enCarritos === 1
                    ? "1 persona la tiene guardada en su carrito"
                    : `${enCarritos} personas la tienen guardada en su carrito`}
                </p>
              )}
            </>
          ) : (
            <p className="detalle-suave">Carta de exhibición, no disponible para la venta.</p>
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


