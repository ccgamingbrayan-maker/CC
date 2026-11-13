import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase.js";

export default function CartasRecomendadas() {
  const [cartas, setCartas] = useState([]);
  const scrollRef = useRef(null);
  const isHoveredRef = useRef(false);

  useEffect(() => {
    let activo = true;

    async function cargarRecomendadas() {
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
          // Curaduría: destacar joyas y limitar cartas DON repetitivas
          const donCards = [];
          const chaseCards = [];

          for (const c of data) {
            const nom = (c.nombre || "").toUpperCase();
            if (nom.includes("DON!!")) {
              if (donCards.length < 2 && !nom.includes("DOUBLE PACK SET VOL. 11")) {
                donCards.push(c);
              }
            } else {
              chaseCards.push(c);
            }
          }

          // Combinar destacadas con cartas seleccionadas
          const seleccionadas = [...chaseCards, ...donCards];
          setCartas(seleccionadas);
        }
      } catch (err) {
        console.error("Error al obtener cartas recomendadas:", err);
      }
    }

    cargarRecomendadas();
    return () => {
      activo = false;
    };
  }, []);

  // Animación continua y lenta (loop infinito suave)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || cartas.length === 0) return;

    let animId;
    const speed = 0.35; // Desplazamiento lento y relajado (~21px/segundo)

    function step() {
      if (!isHoveredRef.current && el) {
        el.scrollLeft += speed;
        // Cuando llega a la mitad de la lista duplicada, reinicia sin salto visual
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft -= el.scrollWidth / 2;
        }
      }
      animId = requestAnimationFrame(step);
    }

    animId = requestAnimationFrame(step);

    const onEnter = () => { isHoveredRef.current = true; };
    const onLeave = () => { isHoveredRef.current = false; };
    const onTouchStart = () => { isHoveredRef.current = true; };
    const onTouchEnd = () => {
      setTimeout(() => { isHoveredRef.current = false; }, 2000);
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(animId);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [cartas]);

  function moverScroll(dir) {
    const el = scrollRef.current;
    if (!el) return;

    // Si retrocede cerca del inicio, ajustar a la segunda mitad para permitir retroceso infinito
    if (dir < 0 && el.scrollLeft < 100) {
      el.scrollLeft += el.scrollWidth / 2;
    }

    el.scrollBy({ left: dir * 260, behavior: "smooth" });
  }

  if (cartas.length === 0) return null;

  // Duplicar la lista para lograr el loop continuo sin cortes
  const listaDuplicada = [...cartas, ...cartas];

  return (
    <section className="recomendadas">
      <div className="contenedor">
        {/* ENCABEZADO: TÍTULO Y FLECHAS */}
        <div className="carrusel-rel-head">
          <h3>Cartas recomendadas para ti</h3>

          <div className="carrusel-rel-nav">
            <button
              type="button"
              onClick={() => moverScroll(-1)}
              aria-label="Anterior"
              title="Ver anteriores"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => moverScroll(1)}
              aria-label="Siguiente"
              title="Ver siguientes"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* TRACK DESLIZANTE */}
        <div
          className="carrusel-rel-track"
          ref={scrollRef}
          style={{
            display: "flex",
            gap: "16px",
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            paddingBottom: "12px",
          }}
        >
          {listaDuplicada.map((c, i) => (
            <Link
              key={`${c.id}-${i}`}
              to={`/carta/${c.id}`}
              className="carrusel-rel-item"
              title={c.nombre}
            >
              <div className="carrusel-rel-img-box">
                <img
                  src={c.imagen}
                  alt={c.nombre}
                  loading="lazy"
                />
              </div>
              <p className="carrusel-rel-nombre">{c.nombre}</p>
              {c.precio != null && (
                <p className="carrusel-rel-precio">
                  ${Number(c.precio).toLocaleString("es-CO")} COP
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
