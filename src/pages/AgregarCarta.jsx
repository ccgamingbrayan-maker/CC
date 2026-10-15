import { useState, useEffect } from "react";
import { Search, Grid2X2, LayoutGrid, Maximize2, Check, X } from "lucide-react";
import { buscarCartaScryfall, buscarPrintsDesdeUri } from "../lib/scryfall.js";
import { buscarCartaRiftbound, buscarPrintsRiftbound } from "../lib/riftbound.js";
import {
  buscarPrintsOnePiece,
  buscarDecksFiltered,
  buscarDonFiltered,
  buscarPromosFiltered,
} from "../lib/onepiece.js";
import { buscarPrintsPokemon } from "../lib/pokemon.js";
import { supabase } from "../lib/supabase.js";
import {
  listarJuegos,
  listarExpansiones,
  crearJuego,
  asegurarExpansion,
} from "../lib/catalogos.js";
import CarouselStore from "../components/CarouselStore.jsx";
import Cargando from "../components/Cargando.jsx";
import AgregarAccesorio from "./AgregarAccesorio.jsx";

// Etiqueta de un botón de fuente: muestra spinner + "Buscando…" cuando esa
// fuente es la que está cargando; si no, muestra su texto normal.
function LabelFuente({ activo, children }) {
  if (activo) {
    return (
      <>
        <span className="spinner-btn" aria-hidden="true" /> Buscando…
      </>
    );
  }
  return children;
}

export default function AgregarCarta() {
  const [pestana, setPestana] = useState("cartas");
  const [nombre, setNombre] = useState("");
  const [datosApi, setDatosApi] = useState(null);
  const [prints, setPrints] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [fuente, setFuente] = useState(null);
  const [precioReferencia, setPrecioReferencia] = useState(null);
  const [juegoId, setJuegoId] = useState(4);
  const [userSelectedJuego, setUserSelectedJuego] = useState(false);
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [fuenteBuscando, setFuenteBuscando] = useState(null); // qué API está cargando
  const [guardando, setGuardando] = useState(false);
  const isCarrusel = Number(juegoId) === 6;

  // Filtros y vista para la galería de cartas
  const [filtroPrints, setFiltroPrints] = useState("");
  const [ordenPrints, setOrdenPrints] = useState("default");
  const [densidad, setDensidad] = useState("compacto"); // "compacto" | "medio" | "grande"

  // Catálogos dinámicos (juegos y expansiones desde Supabase)
  const [juegosLista, setJuegosLista] = useState([]);
  const [expansiones, setExpansiones] = useState([]);
  const [expansionSel, setExpansionSel] = useState("");
  const [expansionNueva, setExpansionNueva] = useState("");
  const [expansionTouched, setExpansionTouched] = useState(false);
  const [condicion, setCondicion] = useState("Near Mint");
  const [nuevoJuegoNombre, setNuevoJuegoNombre] = useState("");
  const [nuevoJuegoImagen, setNuevoJuegoImagen] = useState("");

  useEffect(() => {
    listarJuegos().then(setJuegosLista);
  }, []);

  // Expansiones del juego elegido
  useEffect(() => {
    if (isCarrusel || String(juegoId) === "__nuevo") {
      setExpansiones([]);
      return;
    }
    listarExpansiones(juegoId).then(setExpansiones);
  }, [juegoId, isCarrusel]);

  // Si la API trae la expansión (set), preseleccionarla automáticamente:
  // la que coincida se elige; si no existe, queda lista para crearse.
  useEffect(() => {
    if (!datosApi?.set || expansionTouched) return;
    const setApi = String(datosApi.set).trim();
    if (!setApi) return;
    const match = expansiones.find(
      (e) => e.nombre.toLowerCase() === setApi.toLowerCase()
    );
    if (match) {
      setExpansionSel(match.nombre);
      setExpansionNueva("");
    } else {
      setExpansionSel("__nueva");
      setExpansionNueva(setApi);
    }
  }, [datosApi, expansiones, expansionTouched]);

  function getCardTag(p) {
    const n = (p.nombre || "").toLowerCase();
    const s = (p.source || "").toLowerCase();
    if (n.includes("parallel")) return { text: "Parallel", type: "parallel" };
    if (n.includes("alt art") || n.includes("alternate")) return { text: "Alt Art", type: "parallel" };
    if (n.includes("sp card") || n.includes("(sp)")) return { text: "SP", type: "parallel" };
    if (n.includes("manga")) return { text: "Manga", type: "parallel" };
    if (s === "onepiece-promo" || n.includes("promo")) return { text: "Promo", type: "promo" };
    if (s === "onepiece-deck") return { text: "Deck", type: "deck" };
    if (s === "onepiece-don" || n.includes("don!!") || n.includes("don!")) return { text: "DON!!", type: "don" };
    return null;
  }

  function seleccionarVersion(p) {
    const info = {
      nombre: p.nombre,
      imagen: p.imagen,
      set: p.set,
      numero: p.numero,
      precios: p.precios,
    };
    setDatosApi(info);
    setSeleccionada(p);
    if (p.source) {
      setFuente(p.source);
      setUserSelectedJuego(false);
      const mapped = p.source.startsWith("onepiece")
        ? 1
        : p.source === "riftbound"
        ? 2
        : p.source === "pokemon"
        ? 3
        : p.source === "scryfall"
        ? 4
        : juegoId;
      if (mapped) setJuegoId(mapped);
    }
    const usdRef = p.precios?.usd ?? null;
    setPrecioReferencia(usdRef);
    if (usdRef && (!precio || precio === "")) {
      const tasa = 3500;
      const sugerido = Math.round(Number(usdRef) * tasa);
      setPrecio(String(sugerido));
    }
  }

  async function buscar() {
    if (!nombre) return;
    setBuscando(true);
    setFuenteBuscando("scryfall");
    setMensaje("");
    setFiltroPrints("");
    const carta = await buscarCartaScryfall(nombre);
    if (!carta) {
      setDatosApi(null);
      setPrints([]);
      setSeleccionada(null);
      setMensaje("No se encontró esa carta en Scryfall.");
    } else {
      setDatosApi(carta);
      setFuente("scryfall");
      setUserSelectedJuego(false);
      setJuegoId(4);
      const usdRef = carta.precios?.usd ?? null;
      setPrecioReferencia(usdRef);
      if (usdRef && (!precio || precio === "")) {
        const tasa = 3500;
        const sugerido = Math.round(Number(usdRef) * tasa);
        setPrecio(String(sugerido));
      }
      // Obtener todas las prints para permitir selección manual
      if (carta.printsSearchUri) {
        const versiones = await buscarPrintsDesdeUri(carta.printsSearchUri);
        const mapped = (versiones || []).map((v) => ({ ...v, source: "scryfall" }));
        setPrints(mapped);
        setSeleccionada(mapped[0] || carta);
      } else {
        setPrints([carta]);
        setSeleccionada(carta);
      }
    }
    setBuscando(false);
    setFuenteBuscando(null);
  }

  async function guardar() {
    if (!datosApi) {
      setMensaje("Selecciona una carta antes de guardar.");
      return;
    }

    if (!isCarrusel && (!precio || !stock)) {
      setMensaje("Completa precio y stock antes de guardar.");
      return;
    }
    setGuardando(true);
    function mapFuenteToJuego(f) {
      if (!f) return null;
      const ff = String(f).toLowerCase();
      if (ff.startsWith("onepiece")) return 1;
      if (ff === "riftbound") return 2;
      if (ff === "pokemon") return 3;
      if (ff === "scryfall" || ff === "magic" || ff === "mtg") return 4;
      if (ff === "preventas" || ff === "preventa") return 5;
      return null;
    }

    let juegoToSave;
    if (String(juegoId) === "__nuevo") {
      if (!nuevoJuegoNombre.trim()) {
        setMensaje("Escribe el nombre del nuevo juego.");
        setGuardando(false);
        return;
      }
      try {
        const creado = await crearJuego(
          nuevoJuegoNombre,
          nuevoJuegoImagen.trim() || null
        );
        juegoToSave = creado.id;
        setJuegosLista((prev) => [...prev, creado].sort((a, b) => a.id - b.id));
      } catch (e) {
        setMensaje("Error al crear el juego: " + e.message);
        setGuardando(false);
        return;
      }
    } else {
      juegoToSave = userSelectedJuego
        ? (isCarrusel ? 6 : Number(juegoId))
        : (mapFuenteToJuego(fuente) ?? Number(juegoId));
    }

    // Expansión: la elegida de la lista o una nueva creada aquí mismo.
    let expansionFinal = null;
    if (!isCarrusel) {
      const nombreExp = expansionSel === "__nueva" ? expansionNueva : expansionSel;
      if (nombreExp?.trim()) {
        expansionFinal = await asegurarExpansion(juegoToSave, nombreExp);
      }
    }

    const { error } = await supabase.from("cartas").insert({
      juego_id: Number(juegoToSave),
      nombre: datosApi.nombre,
      imagen: datosApi.imagen,
      precio: isCarrusel ? null : precio ? Number(precio) : null,
      stock: isCarrusel ? null : stock ? Number(stock) : null,
      expansion: isCarrusel ? null : expansionFinal,
      condicion: isCarrusel ? null : condicion,
    });
    setGuardando(false);

    if (error) {
      setMensaje("Error al guardar: " + error.message);
    } else {
      setMensaje(`¡"${datosApi.nombre}" guardada en tu tienda!`);

      setNombre("");
      setDatosApi(null);
      setPrecio("");
      setStock("");
      setFuente(null);
      setUserSelectedJuego(false);
      setJuegoId(4);
      setExpansionSel("");
      setExpansionNueva("");
      setExpansionTouched(false);
      setCondicion("Near Mint");
      setNuevoJuegoNombre("");
      setNuevoJuegoImagen("");
      if (expansionFinal) listarExpansiones(juegoToSave).then(setExpansiones);
    }
  }

  // Filtrado y ordenamiento de las versiones disponibles
  const printsFiltrados = prints
    .filter((p) => {
      if (!filtroPrints.trim()) return true;
      const q = filtroPrints.toLowerCase().trim();
      const n = (p.nombre || "").toLowerCase();
      const s = (p.set || "").toLowerCase();
      const num = (p.numero || "").toLowerCase();
      return n.includes(q) || s.includes(q) || num.includes(q);
    })
    .sort((a, b) => {
      if (ordenPrints === "precio-asc") {
        const pa = a.precios?.usd != null ? a.precios.usd : 999999;
        const pb = b.precios?.usd != null ? b.precios.usd : 999999;
        return pa - pb;
      }
      if (ordenPrints === "precio-desc") {
        const pa = a.precios?.usd != null ? a.precios.usd : -1;
        const pb = b.precios?.usd != null ? b.precios.usd : -1;
        return pb - pa;
      }
      if (ordenPrints === "nombre") {
        return (a.nombre || "").localeCompare(b.nombre || "");
      }
      if (ordenPrints === "set") {
        return (a.set || "").localeCompare(b.set || "");
      }
      return 0;
    });

  return (
    <section className="juegos">
      <div className="contenedor agregar-carta">
        <h2>Agregar a la tienda (admin)</h2>

        <div className="admin-tabs">
          <button
            className={`admin-tab ${pestana === "cartas" ? "active" : ""}`}
            onClick={() => setPestana("cartas")}
          >
            Cartas
          </button>
          <button
            className={`admin-tab ${pestana === "accesorios" ? "active" : ""}`}
            onClick={() => setPestana("accesorios")}
          >
            Accesorios
          </button>
        </div>

        {pestana === "accesorios" ? (
          <AgregarAccesorio />
        ) : (
        <>
        <p style={{ color: "var(--texto-suave)", margin: "0 0 16px" }}>
          Busca por nombre en las APIs oficiales, selecciona la versión exacta y guárdala con tu precio y stock.
        </p>

        <div className="agregar-carta-grid">
          <div className="agregar-panel">
            <div className="agregar-buscador">
              <input
                placeholder="Nombre de la carta (ej: Bonney, Sol Ring, Pikachu...)"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscar()}
              />
              <div className="buscador-fuentes">
                <button className="btn-fuente" onClick={buscar} disabled={buscando}>
                  <LabelFuente activo={fuenteBuscando === "scryfall"}>Buscar en Scryfall</LabelFuente>
                </button>
                <button
                  className="btn-fuente"
                  disabled={buscando}
                  onClick={async () => {
                    if (!nombre) return;
                    setBuscando(true);
                    setFuenteBuscando("riftbound");
                    setMensaje("");
                    setFiltroPrints("");
                    try {
                      const carta = await buscarCartaRiftbound(nombre);
                      if (!carta) {
                        setDatosApi(null);
                        setPrints([]);
                        setSeleccionada(null);
                        setMensaje("No se encontró esa carta en Riftbound.");
                      } else {
                        setDatosApi(carta);
                        setFuente("riftbound");
                        setUserSelectedJuego(false);
                        setJuegoId(2);
                        const versiones = await buscarPrintsRiftbound(nombre);
                        const mapped = (versiones || []).map((v) => ({ ...v, source: "riftbound" }));
                        setPrints(mapped);
                        setSeleccionada(mapped[0] || carta);
                        setPrecioReferencia(null);
                      }
                    } catch (error) {
                      setDatosApi(null);
                      setPrints([]);
                      setSeleccionada(null);
                      setMensaje("Error al buscar en Riftbound. Intenta otra búsqueda.");
                      console.error(error);
                    } finally {
                      setBuscando(false);
                      setFuenteBuscando(null);
                    }
                  }}
                >
                  <LabelFuente activo={fuenteBuscando === "riftbound"}>Buscar en Riftbound</LabelFuente>
                </button>
                <button
                  className="btn-fuente"
                  disabled={buscando}
                  onClick={async () => {
                    if (!nombre) return;
                    setBuscando(true);
                    setFuenteBuscando("onepiece");
                    setMensaje("");
                    setFiltroPrints("");
                    try {
                      // buscar en varios endpoints de One Piece y combinar resultados
                      const [printsMain, decks, dons, promos] = await Promise.all([
                        buscarPrintsOnePiece(nombre),
                        buscarDecksFiltered(nombre),
                        buscarDonFiltered(nombre),
                        buscarPromosFiltered(nombre),
                      ]);

                      const printsMainTagged = (printsMain || []).map((p) => ({ ...p, source: "onepiece" }));
                      const decksTagged = (decks || []).map((p) => ({ ...p, source: "onepiece-deck" }));
                      const donsTagged = (dons || []).map((p) => ({ ...p, source: "onepiece-don" }));
                      const promosTagged = (promos || []).map((p) => ({ ...p, source: "onepiece-promo" }));

                      const merged = [
                        ...printsMainTagged,
                        ...decksTagged,
                        ...donsTagged,
                        ...promosTagged,
                      ];

                      if (!merged || merged.length === 0) {
                        setDatosApi(null);
                        setPrints([]);
                        setSeleccionada(null);
                        setMensaje("No se encontraron resultados en One Piece para esa búsqueda.");
                      } else {
                        // deduplicar por id/imágen
                        const seen = new Set();
                        const dedup = [];
                        for (const p of merged) {
                          const key = p.id ?? p.nombre ?? p.imagen ?? JSON.stringify(p);
                          if (!seen.has(key)) {
                            seen.add(key);
                            dedup.push(p);
                          }
                        }
                        setPrints(dedup);
                        setSeleccionada(dedup[0]);
                        setFuente("onepiece");
                        setUserSelectedJuego(false);
                        setJuegoId(1);
                        const primera = dedup[0];
                        setDatosApi({
                          nombre: primera.nombre,
                          imagen: primera.imagen,
                          set: primera.set,
                          numero: primera.numero,
                          precios: primera.precios,
                        });
                        const usdRef = primera.precios?.usd ?? null;
                        setPrecioReferencia(usdRef);
                        if (usdRef && (!precio || precio === "")) {
                          const tasa = 3500;
                          const sugerido = Math.round(Number(usdRef) * tasa);
                          setPrecio(String(sugerido));
                        }
                      }
                    } catch (error) {
                      setDatosApi(null);
                      setPrints([]);
                      setSeleccionada(null);
                      setMensaje("Error al buscar en One Piece. Intenta otra búsqueda.");
                      console.error(error);
                    } finally {
                      setBuscando(false);
                      setFuenteBuscando(null);
                    }
                  }}
                >
                  <LabelFuente activo={fuenteBuscando === "onepiece"}>Buscar en One Piece</LabelFuente>
                </button>
                <button
                  className="btn-fuente"
                  disabled={buscando}
                  onClick={async () => {
                    if (!nombre) return;
                    setBuscando(true);
                    setFuenteBuscando("pokemon");
                    setMensaje("");
                    setFiltroPrints("");
                    try {
                      const versiones = await buscarPrintsPokemon(nombre);
                      if (!versiones || versiones.length === 0) {
                        setDatosApi(null);
                        setPrints([]);
                        setSeleccionada(null);
                        setMensaje("No se encontraron resultados en Pokémon para esa búsqueda.");
                      } else {
                        setPrints(versiones);
                        setSeleccionada(versiones[0]);
                        setFuente("pokemon");
                        setUserSelectedJuego(false);
                        setJuegoId(3);
                        const primera = versiones[0];
                        setDatosApi({
                          nombre: primera.nombre,
                          imagen: primera.imagen,
                          set: primera.set,
                          numero: primera.numero,
                          precios: primera.precios,
                        });
                        const usdRef = primera.precios?.usd ?? null;
                        setPrecioReferencia(usdRef);
                        if (usdRef && (!precio || precio === "")) {
                          const tasa = 3500;
                          const sugerido = Math.round(Number(usdRef) * tasa);
                          setPrecio(String(sugerido));
                        }
                      }
                    } catch (error) {
                      setDatosApi(null);
                      setPrints([]);
                      setSeleccionada(null);
                      setMensaje("Error al buscar en Pokémon. Intenta otra búsqueda.");
                      console.error(error);
                    } finally {
                      setBuscando(false);
                      setFuenteBuscando(null);
                    }
                  }}
                >
                  <LabelFuente activo={fuenteBuscando === "pokemon"}>Buscar en Pokémon</LabelFuente>
                </button>
              </div>
            </div>

            {datosApi && (
              <div className="agregar-preview">
                <div className="agregar-preview-hero">
                  {datosApi.imagen ? (
                    <img src={datosApi.imagen} alt={datosApi.nombre} />
                  ) : (
                    <div className="preview-placeholder">Sin imagen</div>
                  )}

                  <div className="agregar-preview-details">
                    <span className="preview-badge-status">Seleccionada</span>
                    <h3>{datosApi.nombre}</h3>
                    <p className="preview-set">
                      {datosApi.set || "Sin expansión"} {datosApi.numero ? `#${datosApi.numero}` : ""}
                    </p>

                    {precioReferencia != null && (
                      <div className="preview-ref-box">
                        <span>Ref: <strong>${precioReferencia} USD</strong></span>
                        <button
                          type="button"
                          className="btn-usar-ref"
                          onClick={() => {
                            const tasa = 3500;
                            const sugerido = Math.round(Number(precioReferencia) * tasa);
                            setPrecio(String(sugerido));
                          }}
                          title="Convertir referencia a COP (~$3.500 por USD)"
                        >
                          Usar ref (${Math.round(Number(precioReferencia) * 3500).toLocaleString("es-CO")} COP)
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="agregar-form">
                  <label>
                    Juego
                    <select
                      value={juegoId}
                      onChange={(e) => {
                        setUserSelectedJuego(true);
                        setJuegoId(e.target.value);
                        setExpansionSel("");
                        setExpansionNueva("");
                        setExpansionTouched(false);
                      }}
                    >
                      {juegosLista.map((j) => (
                        <option key={j.id} value={j.id}>{j.nombre}</option>
                      ))}
                      <option value={6}>Carrusel</option>
                      <option value="__nuevo">+ Crear nuevo juego…</option>
                    </select>
                  </label>

                  {String(juegoId) === "__nuevo" && (
                    <>
                      <label>
                        Nombre del nuevo juego
                        <input
                          type="text"
                          placeholder="Ej: Yu-Gi-Oh!"
                          value={nuevoJuegoNombre}
                          onChange={(e) => setNuevoJuegoNombre(e.target.value)}
                        />
                      </label>
                      <label>
                        Imagen del juego (URL, opcional)
                        <input
                          type="text"
                          placeholder="/img/nuevo_juego.png"
                          value={nuevoJuegoImagen}
                          onChange={(e) => setNuevoJuegoImagen(e.target.value)}
                        />
                      </label>
                    </>
                  )}

                  {!isCarrusel && (
                    <>
                      <label>
                        Expansión
                        <select
                          value={expansionSel}
                          onChange={(e) => {
                            setExpansionSel(e.target.value);
                            setExpansionTouched(true);
                          }}
                        >
                          <option value="">Sin expansión</option>
                          {expansiones.map((x) => (
                            <option key={x.id} value={x.nombre}>{x.nombre}</option>
                          ))}
                          <option value="__nueva">+ Crear nueva expansión…</option>
                        </select>
                      </label>

                      {expansionSel === "__nueva" && (
                        <label>
                          Nombre de la nueva expansión
                          <input
                            type="text"
                            placeholder="Ej: Vendetta"
                            value={expansionNueva}
                            onChange={(e) => {
                              setExpansionNueva(e.target.value);
                              setExpansionTouched(true);
                            }}
                          />
                        </label>
                      )}

                      <label>
                        Condición
                        <select
                          value={condicion}
                          onChange={(e) => setCondicion(e.target.value)}
                        >
                          <option>Near Mint</option>
                          <option>Lightly Played</option>
                          <option>Moderately Played</option>
                          <option>Heavily Played</option>
                          <option>Damaged</option>
                        </select>
                      </label>
                    </>
                  )}

                  {isCarrusel && (
                    <div style={{ marginTop: 12 }}>
                      <CarouselStore
                        onPick={(c) => {
                          setDatosApi({ nombre: c.nombre, imagen: c.imagen, set: c.set });
                          setFuente("carrusel");
                          setUserSelectedJuego(true);
                        }}
                      />
                    </div>
                  )}

                  {!isCarrusel && (
                    <>
                      <label>
                        Precio (COP)
                        <input
                          type="number"
                          placeholder="15000"
                          value={precio}
                          onChange={(e) => setPrecio(e.target.value)}
                        />
                      </label>

                      <label>
                        Stock
                        <input
                          type="number"
                          placeholder="10"
                          value={stock}
                          onChange={(e) => setStock(e.target.value)}
                        />
                      </label>
                    </>
                  )}

                  <button className="btn-guardar-tienda" onClick={guardar} disabled={guardando}>
                    {guardando ? "Guardando…" : "Guardar en mi tienda"}
                  </button>
                </div>
              </div>
            )}

            {mensaje && <p className="agregar-mensaje">{mensaje}</p>}
          </div>

          {buscando && (
            <div className="agregar-print-list">
              <Cargando texto="Buscando cartas…" />
            </div>
          )}

          {!buscando && prints && prints.length > 0 && (
            <div className="agregar-print-list">
              <div className="print-list-header">
                <div className="print-list-title-wrap">
                  <h3>Versiones disponibles</h3>
                  <span className="print-count-badge">
                    {printsFiltrados.length} {printsFiltrados.length === 1 ? "versión" : "versiones"}
                  </span>
                </div>

                <div className="print-list-controls">
                  <div className="print-filter-box">
                    <Search size={14} className="filter-icon" />
                    <input
                      type="text"
                      placeholder="Filtrar por set, código, arte..."
                      value={filtroPrints}
                      onChange={(e) => setFiltroPrints(e.target.value)}
                    />
                    {filtroPrints && (
                      <button
                        type="button"
                        className="btn-clear-filter"
                        onClick={() => setFiltroPrints("")}
                        title="Limpiar filtro"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <select
                    className="print-sort-select"
                    value={ordenPrints}
                    onChange={(e) => setOrdenPrints(e.target.value)}
                    title="Ordenar versiones"
                  >
                    <option value="default">Orden original</option>
                    <option value="precio-asc">Precio: Menor a mayor</option>
                    <option value="precio-desc">Precio: Mayor a menor</option>
                    <option value="nombre">Nombre (A-Z)</option>
                    <option value="set">Set / Expansión</option>
                  </select>

                  <div className="densidad-selector" title="Tamaño de las cartas en pantalla">
                    <button
                      type="button"
                      className={`btn-densidad ${densidad === "compacto" ? "active" : ""}`}
                      onClick={() => setDensidad("compacto")}
                      title="Compacto (6 a 8 cartas por fila)"
                    >
                      <Grid2X2 size={13} /> Compacto
                    </button>
                    <button
                      type="button"
                      className={`btn-densidad ${densidad === "medio" ? "active" : ""}`}
                      onClick={() => setDensidad("medio")}
                      title="Medio (4 a 6 cartas por fila)"
                    >
                      <LayoutGrid size={13} /> Medio
                    </button>
                    <button
                      type="button"
                      className={`btn-densidad ${densidad === "grande" ? "active" : ""}`}
                      onClick={() => setDensidad("grande")}
                      title="Grande (3 a 4 cartas por fila)"
                    >
                      <Maximize2 size={13} /> Grande
                    </button>
                  </div>
                </div>
              </div>

              {printsFiltrados.length === 0 ? (
                <div className="print-list-empty">
                  <p>No se encontraron cartas que coincidan con "<strong>{filtroPrints}</strong>"</p>
                  <button type="button" onClick={() => setFiltroPrints("")}>
                    Restablecer filtro
                  </button>
                </div>
              ) : (
                <div className={`grid densidad-${densidad}`}>
                  {printsFiltrados.map((p, index) => {
                    const tag = getCardTag(p);
                    const esSeleccionada =
                      seleccionada &&
                      (seleccionada === p ||
                        (seleccionada.id && p.id && seleccionada.id === p.id && seleccionada.imagen === p.imagen) ||
                        (seleccionada.imagen && seleccionada.imagen === p.imagen));

                    return (
                      <div
                        key={p.id ? `${p.id}-${index}` : index}
                        className={`game-card ${esSeleccionada ? "selected" : ""}`}
                        onClick={() => seleccionarVersion(p)}
                        title={`${p.nombre}\n${p.set || ""} ${p.numero ? `#${p.numero}` : ""}\n${p.precios?.usd ? `$${p.precios.usd} USD` : "Sin precio"}`}
                      >
                        {esSeleccionada && (
                          <span className="card-badge-selected">
                            <Check size={11} strokeWidth={3} /> Elegida
                          </span>
                        )}
                        {tag && (
                          <span className={`card-badge-tag ${tag.type}`}>
                            {tag.text}
                          </span>
                        )}

                        {p.imagen ? (
                          <img src={p.imagen} alt={p.nombre} loading="lazy" />
                        ) : (
                          <div className="preview-placeholder">Sin imagen</div>
                        )}

                        <div className="card-info-wrap">
                          <h3 title={p.nombre}>{p.nombre}</h3>
                          <p className="card-meta" title={`${p.set || ""} ${p.numero ? `#${p.numero}` : ""}`}>
                            {p.set || "—"} {p.numero ? `#${p.numero}` : ""}
                          </p>
                          <span className="card-price-pill">
                            {p.precios?.usd != null ? `$${p.precios.usd} USD` : "—"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p style={{ color: "var(--texto-suave)", fontSize: 13, marginTop: 4 }}>
                Haz clic en la carta que quieres agregar a tu tienda.
              </p>
            </div>
          )}

          {!buscando && prints && prints.length === 0 && (
            <div className="agregar-empty-hero">
              <div className="empty-hero-icon">🃏</div>
              <h3>Catálogo de búsqueda</h3>
              <p>
                Escribe el nombre de una carta a la izquierda y pulsa una de las fuentes (One Piece, Scryfall, Pokémon o Riftbound) para ver todas sus versiones y arte alterno.
              </p>
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </section>
  );
}
