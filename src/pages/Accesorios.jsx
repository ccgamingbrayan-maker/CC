import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

export default function Accesorios({ onAgregar }) {
  const [accesorios, setAccesorios] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function traerAccesorios() {
      setCargando(true);
      const { data, error } = await supabase
        .from("accesorios")
        .select("*")
        .order("creado_en", { ascending: false });
      if (error) console.error("Error al traer accesorios:", error);
      else setAccesorios(data ?? []);
      setCargando(false);
    }
    traerAccesorios();
  }, []);

  if (cargando) return <p className="contenedor">Cargando accesorios…</p>;

  return (
    <section className="juegos catalogo">
      <div className="contenedor">
        <h2>Accesorios</h2>
        {accesorios.length === 0 && (
          <p className="sin-resultados">No hay accesorios cargados todavía.</p>
        )}
        <div className="grid">
          {accesorios.map((a) => (
            <div className="game-card" key={a.id}>
              <Link to={`/accesorio/${a.id}`}>
                {a.imagen
                  ? <img src={a.imagen} alt={a.nombre} />
                  : <div className="preview-placeholder">Sin imagen</div>}
                <h3>{a.nombre}</h3>
              </Link>
              {a.color && (
                <p style={{ fontSize: 12, color: "var(--texto-suave)" }}>{a.color}</p>
              )}
              <p>${Number(a.precio ?? 0).toLocaleString("es-CO")} COP</p>
              <p style={{ fontSize: 12, color: "var(--texto-suave)" }}>
                Stock: {a.stock ?? 0}
                {a.estado && a.estado !== "activo" ? ` · ${a.estado}` : ""}
              </p>
              <button onClick={onAgregar} disabled={a.estado === "agotado" || (a.stock ?? 0) <= 0}>
                {a.estado === "agotado" || (a.stock ?? 0) <= 0 ? "Agotado" : "Agregar al carrito"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


