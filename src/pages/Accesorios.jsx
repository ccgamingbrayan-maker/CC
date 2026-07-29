import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function Accesorios() {
  const [accesorios, setAccesorios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargarAccesorios() {
      setCargando(true);
      const { data, error } = await supabase.from("accesorios").select("*");
      if (error) {
        console.error(error);
        setMensaje("No se pudieron cargar los accesorios. Intenta de nuevo más tarde.");
      } else {
        setAccesorios(data || []);
      }
      setCargando(false);
    }

    cargarAccesorios();
  }, []);

  return (
    <section className="juegos">
      <div className="contenedor agregar-carta">
        <h2>Accesorios</h2>
        <p style={{ color: "var(--texto-suave)" }}>
          Catálogo de accesorios disponible para clientes.
        </p>

        {mensaje && <p style={{ color: "var(--texto-suave)", marginTop: 12 }}>{mensaje}</p>}

        {cargando ? (
          <p>Cargando accesorios...</p>
        ) : accesorios.length === 0 ? (
          <p>No hay accesorios disponibles por el momento.</p>
        ) : (
          <div className="grid">
            {accesorios.map((item) => (
              <div key={item.id} className="game-card">
                {item.imagen && <img src={item.imagen} alt={item.titulo} />}
                <h3>{item.titulo}</h3>
                <p>{item.color}</p>
                <p>Precio: {item.precio}</p>
                <p>Stock: {item.stock}</p>
                {item.detalles && <p style={{ fontSize: 14 }}>{item.detalles}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
