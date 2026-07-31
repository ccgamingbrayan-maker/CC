import { useRef } from "react";
import { Link } from "react-router-dom";


export default function CarruselRelacionados({ titulo, items, tipo }) {
  const scrollRef = useRef(null);

  if (!items || items.length === 0) return null;

  function mover(dir) {
    const cont = scrollRef.current;
    if (cont) cont.scrollBy({ left: dir * 260, behavior: "smooth" });
  }

  return (
    <div className="carrusel-rel">
      <div className="carrusel-rel-head">
        <h3>{titulo}</h3>
        <div className="carrusel-rel-nav">
          <button onClick={() => mover(-1)} aria-label="Anterior">‹</button>
          <button onClick={() => mover(1)} aria-label="Siguiente">›</button>
        </div>
      </div>

      <div className="carrusel-rel-track" ref={scrollRef}>
        {items.map((it) => (
          <Link key={it.id} to={`/${tipo}/${it.id}`} className="carrusel-rel-item">
            {it.imagen
              ? <img src={it.imagen} alt={it.nombre} />
              : <div className="preview-placeholder">Sin imagen</div>}
            <p className="carrusel-rel-nombre">{it.nombre}</p>
            {it.precio != null && (
              <p className="carrusel-rel-precio">
                ${Number(it.precio).toLocaleString("es-CO")} COP
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}


