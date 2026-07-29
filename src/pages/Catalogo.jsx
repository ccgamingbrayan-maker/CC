import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { juegos } from "../data/juegos.js";
import { supabase } from "../lib/supabase.js";

export default function Catalogo({ onAgregar }) {
  const { juegoId } = useParams();               // lee el numero de la URL (viene como texto)
  const juego = juegos.find((j) => j.id === Number(juegoId));

  const [cartas, setCartas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function traerCartas() {
      setCargando(true);
      const { data, error } = await supabase
        .from("cartas")
        .select("*")
        .eq("juego_id", Number(juegoId));   // columna de la tabla: juego_id
      if (error) console.error("Error al traer cartas:", error);
      else setCartas(data);
      setCargando(false);
    }
    traerCartas();
  }, [juegoId]);                            // se vuelve a ejecutar si cambias de juego

  if (cargando) return <p className="contenedor">Cargando cartas…</p>;

  return (
    <section className="juegos catalogo">
      <div className="contenedor">
        <h2>Catálogo · {juego?.nombre}</h2>
        {cartas.length === 0 && <p>No hay cartas para este juego todavía.</p>}
        <div className="grid">
          {cartas.map((c) => (
            <div className="game-card" key={c.id}>
              <Link to={`/carta/${c.id}`}>
                <img src={c.imagen} alt={c.nombre} />
                <h3>{c.nombre}</h3>
              </Link>
              <p>${c.precio.toLocaleString("es-CO")} COP</p>
              <p style={{ fontSize: 12, color: "var(--texto-suave)" }}>
                Stock: {c.stock}
              </p>
              <button onClick={onAgregar}>Agregar al carrito</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


