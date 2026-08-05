import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { listarJuegos, listarExpansiones } from "../lib/catalogos.js";
import { supabase } from "../lib/supabase.js";
import Cargando from "../components/Cargando.jsx";

export default function Catalogo({ onAgregar }) {
  const { juegoId } = useParams();               // lee el numero de la URL (viene como texto)
  const [juegos, setJuegos] = useState([]);
  const juego = juegos.find((j) => j.id === Number(juegoId));

  const [cartas, setCartas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [expansionSel, setExpansionSel] = useState("");
  const [condicionSel, setCondicionSel] = useState("");
  const [precioMin, setPrecioMin] = useState(0);
  const [precioMax, setPrecioMax] = useState(0);
  const [expansiones, setExpansiones] = useState([]);

  useEffect(() => {
    listarJuegos().then(setJuegos);
  }, []);

  useEffect(() => {
    async function traerCartas() {
      setCargando(true);
      const { data, error } = await supabase
        .from("cartas")
        .select("*")
        .eq("juego_id", Number(juegoId));   // columna de la tabla: juego_id
      if (error) console.error("Error al traer cartas:", error);
      else setCartas(data ?? []);
      setCargando(false);
    }
    traerCartas();
    // Al cambiar de juego se resetean los filtros
    setBusqueda("");
    setExpansionSel("");
    setCondicionSel("");
    setPrecioMin(0);
    setPrecioMax(0);
    listarExpansiones(juegoId).then(setExpansiones);
  }, [juegoId]);                            // se vuelve a ejecutar si cambias de juego

  // Opciones de expansión: las registradas en la tabla + las que traigan las cartas.
  const opcionesExpansion = useMemo(() => {
    const nombres = new Set(expansiones.map((e) => e.nombre));
    for (const c of cartas) if (c.expansion) nombres.add(c.expansion);
    return [...nombres].sort((a, b) => a.localeCompare(b));
  }, [expansiones, cartas]);

  // Opciones de condición: las que realmente existan en las cartas cargadas.
  const opcionesCondicion = useMemo(() => {
    const valores = new Set();
    for (const c of cartas) if (c.condicion) valores.add(c.condicion);
    return [...valores].sort((a, b) => a.localeCompare(b));
  }, [cartas]);

  // Techo del slider: el precio más alto del catálogo, redondeado hacia arriba.
  const maxPrecio = useMemo(() => {
    const max = cartas.reduce((m, c) => Math.max(m, Number(c.precio ?? 0)), 0);
    return Math.max(1000, Math.ceil(max / 1000) * 1000);
  }, [cartas]);

  // El tope del rango siempre sigue al máximo real del catálogo.
  useEffect(() => {
    setPrecioMax(maxPrecio);
  }, [maxPrecio]);

  const filtradas = useMemo(() => {
    return cartas.filter((c) => {
      if (busqueda && !c.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())) return false;
      if (expansionSel && (c.expansion ?? "") !== expansionSel) return false;
      if (condicionSel && (c.condicion ?? "") !== condicionSel) return false;
      const p = Number(c.precio ?? 0);
      if (precioMin > 0 && p < precioMin) return false;
      if (precioMax < maxPrecio && p > precioMax) return false;
      return true;
    });
  }, [cartas, busqueda, expansionSel, condicionSel, precioMin, precioMax, maxPrecio]);

  if (cargando) return <Cargando texto="Cargando cartas…" />;

  const hayFiltros =
    busqueda || expansionSel || condicionSel || precioMin > 0 || precioMax < maxPrecio;

  return (
    <section className="juegos catalogo">
      <div className="contenedor">
        <h2>Catálogo · {juego?.nombre}</h2>

        <div className="filtros-catalogo">
          <input
            type="search"
            placeholder="Buscar por nombre…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select value={expansionSel} onChange={(e) => setExpansionSel(e.target.value)}>
            <option value="">Todas las expansiones</option>
            {opcionesExpansion.map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
          <select value={condicionSel} onChange={(e) => setCondicionSel(e.target.value)}>
            <option value="">Cualquier condición</option>
            {opcionesCondicion.map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
          <div className="filtro-slider">
            <div className="filtro-slider-info">
              <span>Precio</span>
              <span>
                ${precioMin.toLocaleString("es-CO")} – ${precioMax.toLocaleString("es-CO")}
              </span>
            </div>
            <div className="filtro-slider-pistas">
              <div
                className="filtro-slider-relleno"
                style={{
                  left: `${(precioMin / maxPrecio) * 100}%`,
                  right: `${100 - (precioMax / maxPrecio) * 100}%`,
                }}
              />
              <input
                type="range"
                min={0}
                max={maxPrecio}
                step={100}
                value={precioMin}
                onChange={(e) =>
                  setPrecioMin(Math.min(Number(e.target.value), precioMax))
                }
                aria-label="Precio mínimo"
              />
              <input
                type="range"
                min={0}
                max={maxPrecio}
                step={100}
                value={precioMax}
                onChange={(e) =>
                  setPrecioMax(Math.max(Number(e.target.value), precioMin))
                }
                aria-label="Precio máximo"
              />
            </div>
          </div>
          <button
            type="button"
            className={`filtro-limpiar${hayFiltros ? "" : " oculto"}`}
            onClick={() => {
              setBusqueda("");
              setExpansionSel("");
              setCondicionSel("");
              setPrecioMin(0);
              setPrecioMax(maxPrecio);
            }}
            tabIndex={hayFiltros ? 0 : -1}
          >
            Limpiar
          </button>
        </div>

        {filtradas.length === 0 && (
          <p className="sin-resultados">
            {hayFiltros
              ? "Ninguna carta coincide con los filtros."
              : "No hay cartas para este juego todavía."}
          </p>
        )}
        <div className="grid">
          {filtradas.map((c) => (
            <div className="game-card" key={c.id}>
              <Link to={`/carta/${c.id}`}>
                <img src={c.imagen} alt={c.nombre} />
                <h3>{c.nombre}</h3>
              </Link>
              {c.expansion && (
                <p style={{ fontSize: 12, color: "var(--texto-suave)" }}>{c.expansion}</p>
              )}
              <p>${Number(c.precio ?? 0).toLocaleString("es-CO")} COP</p>
              <p style={{ fontSize: 12, color: "var(--texto-suave)" }}>
                Stock: {c.stock}
                {c.condicion ? ` · ${c.condicion}` : ""}
              </p>
              <button onClick={() => onAgregar({ tipo: "carta", id: c.id })}>Agregar al carrito</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


