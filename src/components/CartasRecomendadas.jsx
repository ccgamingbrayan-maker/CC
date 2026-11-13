import { useEffect, useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Check,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useCart } from "../lib/CartContext.jsx";

const JUEGOS_MAP = {
  1: { nombre: "One Piece", badgeClass: "op" },
  2: { nombre: "Riftbound", badgeClass: "rift" },
  3: { nombre: "Pokémon", badgeClass: "pkmn" },
  4: { nombre: "Magic", badgeClass: "mtg" },
  5: { nombre: "Pre-Venta", badgeClass: "prev" },
};

export default function CartasRecomendadas() {
  const [todasCartas, setTodasCartas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroJuego, setFiltroJuego] = useState("todos"); // "todos" | 1 | 2 | 4 | 5
  const [agregados, setAgregados] = useState({});
  const scrollRef = useRef(null);
  const { agregar } = useCart();

  useEffect(() => {
    let activo = true;

    async function cargarRecomendadas() {
      setCargando(true);
      try {
        const { data, error } = await supabase
          .from("cartas")
          .select("id, nombre, imagen, precio, stock, juego_id, expansion")
          .not("imagen", "is", null)
          .not("precio", "is", null)
          .gt("stock", 0)
          .order("precio", { ascending: false })
          .limit(100);

        if (error) {
          console.error("Error cargando cartas recomendadas:", error);
          return;
        }

        if (activo && data) {
          // Filtrado inteligente:
          // 1. Evitar inundación de cartas DON!! genéricas o con fondos blancos defectuosos
          // 2. Dar prioridad a joyas coleccionables (Parallel, Signature, altos valores)
          const donCards = [];
          const chaseCards = [];

          for (const c of data) {
            const nom = (c.nombre || "").toUpperCase();
            if (nom.includes("DON!!")) {
              // Permitir máximo 2 cartas DON!! de arte alternativo limpio
              if (donCards.length < 2 && !nom.includes("DOUBLE PACK SET VOL. 11")) {
                donCards.push(c);
              }
            } else {
              chaseCards.push(c);
            }
          }

          // Barajar ligeramente las cartas destacadas manteniendo joyas al frente
          const prioritarias = chaseCards.slice(0, 10);
          const resto = chaseCards.slice(10);
          const mezcladas = [...prioritarias, ...resto, ...donCards];

          setTodasCartas(mezcladas);
        }
      } catch (err) {
        console.error("Error al obtener recomendadas:", err);
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarRecomendadas();
    return () => {
      activo = false;
    };
  }, []);

  const cartasFiltradas = useMemo(() => {
    if (filtroJuego === "todos") return todasCartas;
    return todasCartas.filter((c) => Number(c.juego_id) === Number(filtroJuego));
  }, [todasCartas, filtroJuego]);

  function moverScroll(dir) {
    if (!scrollRef.current) return;
    const offset = dir * (scrollRef.current.clientWidth * 0.75 || 320);
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  }

  function handleAgregarRapido(e, carta) {
    e.preventDefault();
    e.stopPropagation();

    agregar({ tipo: "carta", id: carta.id });
    setAgregados((prev) => ({ ...prev, [carta.id]: true }));

    setTimeout(() => {
      setAgregados((prev) => ({ ...prev, [carta.id]: false }));
    }, 1800);
  }

  if (!cargando && todasCartas.length === 0) return null;

  return (
    <section className="rec-section">
      <div className="contenedor">
        {/* ENCABEZADO Y CONTROLES */}
        <div className="rec-header-row">
          <div className="rec-title-wrap">
            <h2 className="rec-title">
              <span className="rec-title-sparkle">
                <Sparkles size={22} />
              </span>
              <span>Cartas recomendadas para ti</span>
            </h2>
          </div>

          <div className="rec-controls-cluster">
            {/* TABS DE FILTRO POR JUEGO */}
            <div className="rec-filter-tabs">
              <button
                type="button"
                className={`rec-tab-btn ${filtroJuego === "todos" ? "active" : ""}`}
                onClick={() => setFiltroJuego("todos")}
              >
                Todas
              </button>
              <button
                type="button"
                className={`rec-tab-btn ${filtroJuego === 1 ? "active" : ""}`}
                onClick={() => setFiltroJuego(1)}
              >
                One Piece
              </button>
              <button
                type="button"
                className={`rec-tab-btn ${filtroJuego === 2 ? "active" : ""}`}
                onClick={() => setFiltroJuego(2)}
              >
                Riftbound
              </button>
              <button
                type="button"
                className={`rec-tab-btn ${filtroJuego === 4 ? "active" : ""}`}
                onClick={() => setFiltroJuego(4)}
              >
                Magic
              </button>
              <button
                type="button"
                className={`rec-tab-btn ${filtroJuego === 5 ? "active" : ""}`}
                onClick={() => setFiltroJuego(5)}
              >
                Pre-Ventas
              </button>
            </div>

            {/* FLECHAS DE NAVEGACIÓN */}
            <div className="rec-nav-arrows">
              <button
                type="button"
                className="rec-arrow-btn"
                onClick={() => moverScroll(-1)}
                aria-label="Ver anteriores"
                title="Desplazar hacia la izquierda"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="rec-arrow-btn"
                onClick={() => moverScroll(1)}
                aria-label="Ver siguientes"
                title="Desplazar hacia la derecha"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* CAROUSEL TRACK */}
        <div className="rec-carousel-viewport">
          <div className="rec-carousel-track" ref={scrollRef}>
            {cartasFiltradas.map((c) => {
              const juegoInfo = JUEGOS_MAP[c.juego_id] || { nombre: "TCG", badgeClass: "op" };
              const yaAgregado = agregados[c.id];

              return (
                <Link
                  key={c.id}
                  to={`/carta/${c.id}`}
                  className="rec-card"
                  title={`Ver detalle de ${c.nombre}`}
                >
                  {/* POSTER CON MARCO */}
                  <div className="rec-card-poster-wrap">
                    <span className={`rec-badge-game ${juegoInfo.badgeClass}`}>
                      {juegoInfo.nombre}
                    </span>

                    {c.stock > 0 && (
                      <span className="rec-badge-stock">
                        ✓ En stock ({c.stock})
                      </span>
                    )}

                    <img
                      src={c.imagen}
                      alt={c.nombre}
                      loading="lazy"
                      className="rec-card-poster-img"
                    />
                  </div>

                  {/* CONTENIDO Y PRECIO */}
                  <div className="rec-card-content">
                    <h3 className="rec-card-title" title={c.nombre}>
                      {c.nombre}
                    </h3>

                    {c.expansion ? (
                      <p className="rec-card-set">{c.expansion}</p>
                    ) : (
                      <p className="rec-card-set" style={{ opacity: 0.5 }}>Carta Suelta</p>
                    )}

                    <div className="rec-card-footer">
                      <div className="rec-card-price-col">
                        <span className="rec-card-price-label">Precio</span>
                        <strong className="rec-card-price">
                          ${Number(c.precio).toLocaleString("es-CO")} COP
                        </strong>
                      </div>

                      <button
                        type="button"
                        className={`rec-btn-add ${yaAgregado ? "added" : ""}`}
                        onClick={(e) => handleAgregarRapido(e, c)}
                        title={yaAgregado ? "¡Agregado al carrito!" : "Agregar rápidamente al carrito"}
                        aria-label={`Agregar ${c.nombre} al carrito`}
                      >
                        {yaAgregado ? <Check size={16} /> : <ShoppingCart size={15} />}
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
