import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import Cargando from "../components/Cargando.jsx";

// Categorías reconocidas por palabras clave en el nombre / descripción.
const CATEGORIAS = [
  { id: "deckbox", nombre: "Deckbox", claves: ["deck box", "deckbox", "deck case"] },
  { id: "sleeves", nombre: "Sleeves", claves: ["sleeve", "funda", "deck protector"] },
  { id: "playmat", nombre: "Playmat", claves: ["playmat", "play-mat", "play mat", "tapete"] },
  { id: "dados", nombre: "Dados", claves: ["dado", "dice"] },
];

function categoriaDe(a) {
  const texto = `${a.nombre ?? ""} ${a.descripcion ?? ""}`.toLowerCase();
  for (const c of CATEGORIAS) {
    if (c.claves.some((k) => texto.includes(k))) return c.id;
  }
  return "otros";
}

export default function Accesorios({ onAgregar }) {
  const [accesorios, setAccesorios] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Filtros (mismo patrón que el catálogo de cartas)
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSel, setCategoriaSel] = useState("");
  const [precioMin, setPrecioMin] = useState(0);
  const [precioMax, setPrecioMax] = useState(0);

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

  // Solo se ofrecen las categorías que realmente existan en los datos.
  const opcionesCategoria = useMemo(() => {
    const presentes = new Set(accesorios.map(categoriaDe));
    const opciones = CATEGORIAS.filter((c) => presentes.has(c.id));
    if (presentes.has("otros")) opciones.push({ id: "otros", nombre: "Otros" });
    return opciones;
  }, [accesorios]);

  // Techo del slider: el precio más alto del catálogo, redondeado hacia arriba.
  const maxPrecio = useMemo(() => {
    const max = accesorios.reduce((m, a) => Math.max(m, Number(a.precio ?? 0)), 0);
    return Math.max(1000, Math.ceil(max / 1000) * 1000);
  }, [accesorios]);

  // El tope del rango siempre sigue al máximo real del catálogo.
  useEffect(() => {
    setPrecioMax(maxPrecio);
  }, [maxPrecio]);

  const filtrados = useMemo(() => {
    return accesorios.filter((a) => {
      if (busqueda && !a.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())) return false;
      if (categoriaSel && categoriaDe(a) !== categoriaSel) return false;
      const p = Number(a.precio ?? 0);
      if (precioMin > 0 && p < precioMin) return false;
      if (precioMax < maxPrecio && p > precioMax) return false;
      return true;
    });
  }, [accesorios, busqueda, categoriaSel, precioMin, precioMax, maxPrecio]);

  if (cargando) return <Cargando texto="Cargando accesorios…" />;

  const hayFiltros =
    busqueda || categoriaSel || precioMin > 0 || precioMax < maxPrecio;

  return (
    <section className="juegos catalogo catalogo-accesorios">
      <div className="contenedor">
        <h2>Accesorios</h2>

        <div className="filtros-catalogo">
          <input
            type="search"
            placeholder="Buscar por nombre…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select value={categoriaSel} onChange={(e) => setCategoriaSel(e.target.value)}>
            <option value="">Todas las categorías</option>
            {opcionesCategoria.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
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
              setCategoriaSel("");
              setPrecioMin(0);
              setPrecioMax(maxPrecio);
            }}
            tabIndex={hayFiltros ? 0 : -1}
          >
            Limpiar
          </button>
        </div>

        {filtrados.length === 0 && (
          <p className="sin-resultados">
            {hayFiltros
              ? "Ningún accesorio coincide con los filtros."
              : "No hay accesorios cargados todavía."}
          </p>
        )}
        <div className="grid">
          {filtrados.map((a) => (
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
              <button onClick={() => onAgregar({ tipo: "accesorio", id: a.id })} disabled={a.estado === "agotado" || (a.stock ?? 0) <= 0}>
                {a.estado === "agotado" || (a.stock ?? 0) <= 0 ? "Agotado" : "Agregar al carrito"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


