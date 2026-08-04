import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { supabase } from "../lib/supabase.js";

export default function BuscadorNav() {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const cajaRef = useRef(null);

  useEffect(() => {
    function cerrarAlClickFuera(e) {
      if (cajaRef.current && !cajaRef.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener("mousedown", cerrarAlClickFuera);
    return () => document.removeEventListener("mousedown", cerrarAlClickFuera);
  }, []);

  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 2) {
      setResultados([]);
      return;
    }
    let activo = true;
    const timer = setTimeout(async () => {
      const [{ data: cartas }, { data: accs }] = await Promise.all([
        supabase
          .from("cartas")
          .select("id,nombre,imagen,precio")
          .ilike("nombre", `%${texto}%`)
          .not("precio", "is", null)
          .limit(6),
        supabase
          .from("accesorios")
          .select("id,nombre,imagen,precio")
          .ilike("nombre", `%${texto}%`)
          .limit(4),
      ]);
      if (!activo) return;
      setResultados([
        ...(cartas ?? []).map((c) => ({ ...c, tipo: "carta" })),
        ...(accs ?? []).map((a) => ({ ...a, tipo: "accesorio" })),
      ]);
      setAbierto(true);
    }, 300);
    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [q]);

  return (
    <div className="buscador" ref={cajaRef}>
      <Search size={18} className="buscador-icono" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => resultados.length > 0 && setAbierto(true)}
        placeholder="Busca cartas, accesorios y más…"
        aria-label="Buscar productos"
      />
      {abierto && q.trim().length >= 2 && (
        <div className="buscador-resultados">
          {resultados.length === 0 ? (
            <p className="buscador-vacio">Sin resultados para “{q.trim()}”.</p>
          ) : (
            resultados.map((it) => (
              <Link
                key={`${it.tipo}-${it.id}`}
                to={`/${it.tipo}/${it.id}`}
                className="buscador-item"
                onClick={() => {
                  setAbierto(false);
                  setQ("");
                }}
              >
                {it.imagen ? (
                  <img src={it.imagen} alt="" />
                ) : (
                  <span className="buscador-sin-img" />
                )}
                <span className="buscador-nombre">{it.nombre}</span>
                {it.precio != null && (
                  <span className="buscador-precio">
                    ${Number(it.precio).toLocaleString("es-CO")}
                  </span>
                )}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
