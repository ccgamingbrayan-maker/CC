import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase.js";

export default function CarouselStore({ onPick, onlyCarrusel = false, imageWidth = 320, random = false }) {
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    async function load() {
      try {
        const { data, error } = await supabase
          .from("cartas")
          .select("id,nombre,imagen,juego_id,precio,stock")
          .order("id", { ascending: false })
          .limit(100);
        if (error) {
          console.error("Error cargando cartas del carrusel:", error);
        } else if (mountedRef.current) {
          const rows = data || [];
          const filtered = rows.filter((d) => {
            if (!d || !d.imagen) return false;
            if (!onlyCarrusel) return true;
            return d.juego_id === 6 || d.precio === null || d.stock === null;
          });
          setCards(filtered);
          if (filtered.length > 0 && index >= filtered.length) setIndex(0);
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
    const poll = setInterval(load, 8000);
    return () => {
      mountedRef.current = false;
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyCarrusel]);

  useEffect(() => {
    if (!cards || cards.length === 0) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => {
          if (random) {
            if (cards.length === 1) return 0;
            let next = i;
            while (next === i) next = Math.floor(Math.random() * cards.length);
            return next;
          }
          return (i + 1) % cards.length;
        });
        setVisible(true);
      }, 500);
    }, 7000);
    return () => clearInterval(interval);
  }, [cards, random]);

  if (!cards || cards.length === 0) {
    return <div style={{ color: "var(--texto-suave)" }}>No hay cartas en la tienda aún.</div>;
  }

  const current = cards[index];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        onClick={() => setIndex((i) => (i - 1 + cards.length) % cards.length)}
        aria-label="Anterior"
        style={{ background: "transparent", border: "none", color: "var(--texto)", fontSize: 24 }}
      >
        ‹
      </button>

      <div style={{ textAlign: "center", width: imageWidth }}>
        <div
          onClick={() => onPick && onPick(current)}
          style={{ cursor: onPick ? "pointer" : "default" }}
        >
          <img
            src={current.imagen}
            alt={current.nombre}
            style={{
              width: imageWidth,
              height: "auto",
              borderRadius: 10,
              transition: "opacity 300ms ease",
              opacity: visible ? 1 : 0,
              display: "block",
              margin: "0 auto",
            }}
          />
        </div>
        <div style={{ color: "var(--texto-suave)", marginTop: 8 }}>{current.nombre}</div>
      </div>

      <button
        onClick={() => setIndex((i) => (i + 1) % cards.length)}
        aria-label="Siguiente"
        style={{ background: "transparent", border: "none", color: "var(--texto)", fontSize: 24 }}
      >
        ›
      </button>
    </div>
  );
}
