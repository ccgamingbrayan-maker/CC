import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Grid2X2,
  LayoutGrid,
  Maximize2,
  Check,
  X,
  Sparkles,
  Layers,
  Package,
  Loader2,
  ArrowRight,
  RotateCcw,
  Plus,
  Trophy,
  Users
} from "lucide-react";
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

const FUENTES_JUEGOS = [
  { id: "onepiece", label: "One Piece TCG", badge: "OP TCG", placeholder: "Ej: Luffy, Zoro, Nami, OP05-060, ST01..." },
  { id: "pokemon", label: "Pokémon TCG", badge: "PKMN", placeholder: "Ej: Charizard, Pikachu, Mewtwo, 151..." },
  { id: "scryfall", label: "Magic: The Gathering", badge: "MTG", placeholder: "Ej: Black Lotus, Sol Ring, Lightning Bolt..." },
  { id: "riftbound", label: "Riftbound TCG", badge: "RIFT", placeholder: "Ej: Ahri, Yasuo, Jinx, Master Yi, Origins..." },
];

export default function AgregarCarta() {
  const [pestana, setPestana] = useState("cartas");
  const [fuenteActiva, setFuenteActiva] = useState("onepiece");
  const [nombre, setNombre] = useState("");
  const [datosApi, setDatosApi] = useState(null);
  const [prints, setPrints] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [fuente, setFuente] = useState(null);
  const [precioReferencia, setPrecioReferencia] = useState(null);
  const [juegoId, setJuegoId] = useState(1);
  const [userSelectedJuego, setUserSelectedJuego] = useState(false);
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mensajeTipo, setMensajeTipo] = useState("info"); // "info" | "success" | "error"
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const isCarrusel = Number(juegoId) === 6;

  // Filtros y vista para la galería de cartas
  const [filtroPrints, setFiltroPrints] = useState("");
  const [filtroRareza, setFiltroRareza] = useState("normal"); // "normal" | "aa" | "todas"
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

  // Si la API trae la expansión (set), preseleccionarla automáticamente
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
    setMensaje("");
  }

  const [busquedaRealizada, setBusquedaRealizada] = useState("");

  // Búsqueda modular unificada según la fuente elegida
  async function ejecutarBusqueda(targetFuente = fuenteActiva) {
    const query = nombre.trim();
    if (!query) return;

    setBuscando(true);
    setMensaje("");
    setBusquedaRealizada(query);
    setFiltroPrints("");
    setDatosApi(null);
    setSeleccionada(null);

    // Timeout de seguridad máximo de 8 segundos para evitar bloqueos infinitos de APIs externas
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT_BUSQUEDA")), 8000)
    );

    try {
      await Promise.race([
        (async () => {
          if (targetFuente === "onepiece") {
            const [printsMain, decks, dons, promos] = await Promise.all([
              buscarPrintsOnePiece(query).catch(() => []),
              buscarDecksFiltered(query).catch(() => []),
              buscarDonFiltered(query).catch(() => []),
              buscarPromosFiltered(query).catch(() => []),
            ]);

            const merged = [
              ...(printsMain || []).map((p) => ({ ...p, source: "onepiece" })),
              ...(decks || []).map((p) => ({ ...p, source: "onepiece-deck" })),
              ...(dons || []).map((p) => ({ ...p, source: "onepiece-don" })),
              ...(promos || []).map((p) => ({ ...p, source: "onepiece-promo" })),
            ];

            if (!merged || merged.length === 0) {
              setPrints([]);
              setMensaje(`No se encontraron cartas en One Piece para "${query}".`);
              setMensajeTipo("error");
            } else {
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
              seleccionarVersion(dedup[0]);
              setJuegoId(1);
              setFuente("onepiece");
            }
          } else if (targetFuente === "pokemon") {
            const versiones = await buscarPrintsPokemon(query);
            if (!versiones || versiones.length === 0) {
              setPrints([]);
              setMensaje(`No se encontraron cartas en Pokémon para "${query}".`);
              setMensajeTipo("error");
            } else {
              const mapped = versiones.map((v) => ({ ...v, source: "pokemon" }));
              setPrints(mapped);
              seleccionarVersion(mapped[0]);
              setJuegoId(3);
              setFuente("pokemon");
            }
          } else if (targetFuente === "scryfall") {
            const carta = await buscarCartaScryfall(query);
            if (!carta) {
              setPrints([]);
              setMensaje(`No se encontró carta en Magic (Scryfall) para "${query}".`);
              setMensajeTipo("error");
            } else {
              setJuegoId(4);
              setFuente("scryfall");
              if (carta.printsSearchUri) {
                const versiones = await buscarPrintsDesdeUri(carta.printsSearchUri).catch(() => []);
                const mapped = (versiones || []).map((v) => ({ ...v, source: "scryfall" }));
                setPrints(mapped.length > 0 ? mapped : [carta]);
                seleccionarVersion(mapped[0] || carta);
              } else {
                setPrints([carta]);
                seleccionarVersion(carta);
              }
            }
          } else if (targetFuente === "riftbound") {
            const versiones = await buscarPrintsRiftbound(query);
            if (!versiones || versiones.length === 0) {
              setPrints([]);
              setMensaje(`No se encontraron cartas en Riftbound para "${query}".`);
              setMensajeTipo("error");
            } else {
              const mapped = versiones.map((v) => ({ ...v, source: "riftbound" }));
              setPrints(mapped);
              seleccionarVersion(mapped[0]);
              setJuegoId(2);
              setFuente("riftbound");
            }
          }
        })(),
        timeoutPromise,
      ]);
    } catch (err) {
      console.error("Error en búsqueda:", err);
      setPrints([]);
      if (err.message === "TIMEOUT_BUSQUEDA") {
        setMensaje(`El servidor externo de ${fuenteConfig.label} no respondió a tiempo. Prueba con otro término o franquicia.`);
      } else {
        setMensaje("Ocurrió un error al consultar la API externa. Intenta con otro término o juego.");
      }
      setMensajeTipo("error");
    } finally {
      setBuscando(false);
    }
  }

  // Cambio de fuente con búsqueda instantánea si ya hay texto
  function cambiarFuente(nuevaFuente) {
    setFuenteActiva(nuevaFuente);
    if (nombre.trim().length >= 2) {
      ejecutarBusqueda(nuevaFuente);
    }
  }

  async function guardar() {
    if (!datosApi) {
      setMensaje("Selecciona una carta antes de guardar.");
      setMensajeTipo("error");
      return;
    }

    if (!isCarrusel && (!precio || !stock)) {
      setMensaje("Completa precio y stock antes de guardar.");
      setMensajeTipo("error");
      return;
    }

    setGuardando(true);
    setMensaje("");

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
        setMensajeTipo("error");
        setGuardando(false);
        return;
      }
      try {
        const creado = await crearJuego(nuevoJuegoNombre, nuevoJuegoImagen.trim() || null);
        juegoToSave = creado.id;
        setJuegosLista((prev) => [...prev, creado].sort((a, b) => a.id - b.id));
      } catch (e) {
        setMensaje("Error al crear el juego: " + e.message);
        setMensajeTipo("error");
        setGuardando(false);
        return;
      }
    } else {
      juegoToSave = userSelectedJuego
        ? (isCarrusel ? 6 : Number(juegoId))
        : (mapFuenteToJuego(fuente) ?? Number(juegoId));
    }

    // Expansión: la elegida de la lista o una nueva creada automáticamente
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
      setMensajeTipo("error");
    } else {
      setMensaje(`¡"${datosApi.nombre}" fue guardada exitosamente en la tienda!`);
      setMensajeTipo("success");

      setNombre("");
      setDatosApi(null);
      setSeleccionada(null);
      setPrecio("");
      setStock("");
      setFuente(null);
      setUserSelectedJuego(false);
      setExpansionSel("");
      setExpansionNueva("");
      setExpansionTouched(false);
      setCondicion("Near Mint");
      setNuevoJuegoNombre("");
      setNuevoJuegoImagen("");
      if (expansionFinal) listarExpansiones(juegoToSave).then(setExpansiones);
    }
  }

  function descartarSeleccion() {
    setDatosApi(null);
    setSeleccionada(null);
    setPrecio("");
    setStock("");
    setPrecioReferencia(null);
    setMensaje("");
  }

  // Helper para saber si un print es versión alternativa / alta rareza
  function esPrintAA(p) {
    const n = (p.nombre || "").toLowerCase();
    const img = (p.imagen || "").toLowerCase();
    const id = (p.id || "").toLowerCase();
    return (
      n.includes("parallel") ||
      n.includes("alternate") ||
      n.includes("alt art") ||
      n.includes("manga") ||
      n.includes("(sp)") ||
      img.includes("_p") ||
      id.includes("_p")
    );
  }

  // Filtrado y ordenamiento de las versiones disponibles
  const printsFiltrados = prints
    .filter((p) => {
      if (fuente?.startsWith("onepiece")) {
        const esAA = esPrintAA(p);
        if (filtroRareza === "normal" && esAA) return false;
        if (filtroRareza === "aa" && !esAA) return false;
      }
      if (!filtroPrints.trim()) return true;
      const q = filtroPrints.toLowerCase().trim();
      const n = (p.nombre || "").toLowerCase();
      const s = (p.set || "").toLowerCase();
      const num = (p.numero || "").toLowerCase();
      return n.includes(q) || s.includes(q) || num.includes(q);
    })
    .sort((a, b) => {
      if (ordenPrints === "default" && fuente?.startsWith("onepiece")) {
        const aaA = esPrintAA(a);
        const aaB = esPrintAA(b);
        if (aaA !== aaB) return aaA ? 1 : -1;
      }
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

  const fuenteConfig = FUENTES_JUEGOS.find((f) => f.id === fuenteActiva) || FUENTES_JUEGOS[0];

  return (
    <section className="juegos">
      <div className="contenedor agregar-carta admin-view">
        {/* ENCABEZADO PRINCIPAL DE ADMINISTRACIÓN */}
        <div className="admin-header-row">
          <div>
            <h2 className="admin-titulo">Panel de Administración</h2>
            <p className="admin-subtitulo">
              Gestiona el catálogo de cartas físicas oficiales y suministros de la tienda.
            </p>
          </div>

          {/* PESTAÑAS PRINCIPALES: CARTAS VS ACCESORIOS */}
          <div className="admin-segmented-nav">
            <button
              type="button"
              className={`admin-nav-tab ${pestana === "cartas" ? "active" : ""}`}
              onClick={() => { setPestana("cartas"); setMensaje(""); }}
            >
              <Layers size={16} />
              <span>Cartas TCG</span>
            </button>
            <button
              type="button"
              className={`admin-nav-tab ${pestana === "accesorios" ? "active" : ""}`}
              onClick={() => { setPestana("accesorios"); setMensaje(""); }}
            >
              <Package size={16} />
              <span>Accesorios</span>
            </button>
            <Link
              to="/torneos"
              className="admin-nav-tab"
            >
              <Trophy size={16} />
              <span>Torneos</span>
            </Link>
            <Link
              to="/admin/clientes"
              className="admin-nav-tab"
            >
              <Users size={16} />
              <span>Clientes</span>
            </Link>
          </div>
        </div>

        {pestana === "accesorios" ? (
          <AgregarAccesorio />
        ) : (
          <div className="admin-workbench">
            {/* COLUMNA IZQUIERDA: BÚSQUEDA Y FORMULARIO DE EDICIÓN / PUBLICACIÓN */}
            <div className="admin-sidebar-col">
              {/* SELECTOR DE FUENTE / JUEGO */}
              <div className="admin-section-box">
                <span className="admin-section-label">Juego o Franquicia</span>
                <div className="admin-game-tabs">
                  {FUENTES_JUEGOS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`admin-game-tab ${fuenteActiva === f.id ? "active" : ""}`}
                      onClick={() => cambiarFuente(f.id)}
                      disabled={buscando}
                    >
                      <span className="admin-game-badge">{f.badge}</span>
                      <span>{f.label}</span>
                    </button>
                  ))}
                </div>

                {/* CAJA DE BÚSQUEDA TÁCTIL */}
                <div className="admin-search-wrapper">
                  <div className="admin-search-input-box">
                    <Search size={16} className="search-icon-muted" />
                    <input
                      type="text"
                      placeholder={fuenteConfig.placeholder}
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && ejecutarBusqueda()}
                      autoFocus
                    />
                    {nombre && (
                      <button
                        type="button"
                        className="btn-clear-search"
                        onClick={() => {
                          setNombre("");
                          setBusquedaRealizada("");
                          setPrints([]);
                          setMensaje("");
                        }}
                        title="Borrar texto"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn-admin-search"
                    disabled={buscando || !nombre.trim()}
                    onClick={() => ejecutarBusqueda()}
                  >
                    {buscando ? (
                      <>
                        <Loader2 size={16} className="spinner-icon" />
                        <span>Buscando…</span>
                      </>
                    ) : (
                      <>
                        <Search size={16} />
                        <span>Buscar Carta</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* MENSAJES DE ESTADO / RETROALIMENTACIÓN */}
              {mensaje && (
                <div className={`admin-alert-banner ${mensajeTipo}`}>
                  {mensajeTipo === "success" ? <Check size={16} /> : <X size={16} />}
                  <span>{mensaje}</span>
                </div>
              )}

              {/* FORMULARIO DE PUBLICACIÓN CUANDO HAY UNA CARTA SELECCIONADA */}
              {datosApi && (
                <div className="admin-section-box admin-editor-card">
                  <div className="editor-card-header">
                    <span className="editor-card-title">Configuración de Inventario</span>
                    <button
                      type="button"
                      className="btn-admin-discard"
                      onClick={descartarSeleccion}
                      title="Descartar esta carta y buscar otra"
                    >
                      <RotateCcw size={13} /> Descartar
                    </button>
                  </div>

                  {/* MINI PREVIEW DE LA CARTA SELECCIONADA */}
                  <div className="admin-selected-hero">
                    <div className="selected-thumb-wrap">
                      {datosApi.imagen ? (
                        <img src={datosApi.imagen} alt={datosApi.nombre} />
                      ) : (
                        <div className="thumb-placeholder">Sin imagen</div>
                      )}
                    </div>
                    <div className="selected-meta-info">
                      <span className="selected-ready-badge">
                        <Check size={11} strokeWidth={3} /> Lista para publicar
                      </span>
                      <h4 title={datosApi.nombre}>{datosApi.nombre}</h4>
                      <p className="selected-set-code">
                        {datosApi.set || "Sin expansión"} {datosApi.numero ? `#${datosApi.numero}` : ""}
                      </p>

                      {/* CONVERSOR RÁPIDO DE PRECIO REFERENCIA USD -> COP */}
                      {precioReferencia != null && (
                        <div className="admin-ref-converter">
                          <span className="ref-usd">Ref: <strong>${precioReferencia} USD</strong></span>
                          <button
                            type="button"
                            className="btn-convert-ref"
                            onClick={() => {
                              const tasa = 3500;
                              const sugerido = Math.round(Number(precioReferencia) * tasa);
                              setPrecio(String(sugerido));
                            }}
                            title="Calcular sugerido en COP a ~$3.500 por USD"
                          >
                            Usar sugerido: ${(Math.round(Number(precioReferencia) * 3500)).toLocaleString("es-CO")} COP
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CAMPOS DEL FORMULARIO */}
                  <div className="admin-form-fields">
                    <label className="admin-form-label">
                      <span>Juego de destino</span>
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
                        <option value={6}>Carrusel Destacado</option>
                        <option value="__nuevo">+ Crear nuevo juego…</option>
                      </select>
                    </label>

                    {String(juegoId) === "__nuevo" && (
                      <div className="admin-subfield-box">
                        <label className="admin-form-label">
                          <span>Nombre del nuevo juego *</span>
                          <input
                            type="text"
                            placeholder="Ej: Yu-Gi-Oh!, Digimon, Lorcana..."
                            value={nuevoJuegoNombre}
                            onChange={(e) => setNuevoJuegoNombre(e.target.value)}
                          />
                        </label>
                        <label className="admin-form-label">
                          <span>URL de imagen del juego</span>
                          <input
                            type="text"
                            placeholder="/img/nuevo_juego.png"
                            value={nuevoJuegoImagen}
                            onChange={(e) => setNuevoJuegoImagen(e.target.value)}
                          />
                        </label>
                      </div>
                    )}

                    {!isCarrusel && (
                      <>
                        <label className="admin-form-label">
                          <span>Expansión / Set</span>
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
                          <label className="admin-form-label">
                            <span>Nombre de la nueva expansión *</span>
                            <input
                              type="text"
                              placeholder="Ej: Two Legends (OP-08), Obsidian Flames..."
                              value={expansionNueva}
                              onChange={(e) => {
                                setExpansionNueva(e.target.value);
                                setExpansionTouched(true);
                              }}
                            />
                          </label>
                        )}

                        <label className="admin-form-label">
                          <span>Condición de la carta</span>
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

                        <div className="admin-row-2col">
                          <label className="admin-form-label">
                            <span>Precio en COP *</span>
                            <input
                              type="number"
                              placeholder="Ej: 25000"
                              value={precio}
                              onChange={(e) => setPrecio(e.target.value)}
                            />
                          </label>
                          <label className="admin-form-label">
                            <span>Stock disponible *</span>
                            <input
                              type="number"
                              placeholder="Ej: 4"
                              value={stock}
                              onChange={(e) => setStock(e.target.value)}
                            />
                          </label>
                        </div>
                      </>
                    )}

                    {isCarrusel && (
                      <div className="admin-carrusel-selector">
                        <CarouselStore
                          onPick={(c) => {
                            setDatosApi({ nombre: c.nombre, imagen: c.imagen, set: c.set });
                            setFuente("carrusel");
                            setUserSelectedJuego(true);
                          }}
                        />
                      </div>
                    )}

                    {/* BOTÓN PRIMARIO DE GUARDADO TÁCTIL */}
                    <button
                      type="button"
                      className="btn-admin-save-primary"
                      onClick={guardar}
                      disabled={guardando}
                    >
                      {guardando ? (
                        <>
                          <Loader2 size={16} className="spinner-icon" />
                          <span>Guardando en la tienda…</span>
                        </>
                      ) : (
                        <>
                          <Plus size={17} />
                          <span>Guardar y Publicar en Tienda</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* COLUMNA DERECHA: RESULTADOS DE EDICIONES DISPONIBLES O ESTADO INICIAL */}
            <div className="admin-results-col">
              {buscando ? (
                <div className="admin-loading-card">
                  <Cargando texto={`Buscando cartas en la base de datos de ${fuenteConfig.label}…`} />
                </div>
              ) : prints && prints.length > 0 ? (
                <div className="admin-prints-container">
                  {/* BARRA SUPERIOR DE FILTROS Y DENSIDAD */}
                  <div className="tcg-toolbar">
                    {/* Fila 1: Título de sección y Segmented Tabs de Rareza */}
                    <div className="tcg-toolbar-row-primary">
                      <div className="tcg-toolbar-title-wrap">
                        <h3 className="tcg-toolbar-title">Versiones y artes disponibles</h3>
                        <span className="tcg-toolbar-count-badge">
                          {printsFiltrados.length} {printsFiltrados.length === 1 ? "versión" : "versiones"}
                        </span>
                      </div>

                      {fuente?.startsWith("onepiece") && (
                        <div className="tcg-rareza-segmented" role="tablist">
                          <button
                            type="button"
                            className={`tcg-seg-btn ${filtroRareza === "normal" ? "active" : ""}`}
                            onClick={() => setFiltroRareza("normal")}
                            title="Mostrar versiones en menor rareza (base)"
                          >
                            Versión Base
                          </button>
                          <button
                            type="button"
                            className={`tcg-seg-btn ${filtroRareza === "aa" ? "active" : ""}`}
                            onClick={() => setFiltroRareza("aa")}
                            title="Mostrar versiones Alternate Art (AA / Paralelas)"
                          >
                            Alternate Art (AA)
                          </button>
                          <button
                            type="button"
                            className={`tcg-seg-btn ${filtroRareza === "todas" ? "active" : ""}`}
                            onClick={() => setFiltroRareza("todas")}
                            title="Mostrar todas las versiones disponibles"
                          >
                            Todas
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Fila 2: Filtro rápido de texto, Selector de Orden y Selector de Densidad */}
                    <div className="tcg-toolbar-row-secondary">
                      <div className="tcg-toolbar-search">
                        <Search size={14} className="tcg-search-icon" />
                        <input
                          type="text"
                          placeholder="Filtrar por set o código (ej: OP01, ST01)..."
                          value={filtroPrints}
                          onChange={(e) => setFiltroPrints(e.target.value)}
                        />
                        {filtroPrints && (
                          <button
                            type="button"
                            className="tcg-btn-clear-search"
                            onClick={() => setFiltroPrints("")}
                            title="Limpiar filtro"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      <div className="tcg-toolbar-controls-right">
                        <select
                          className="tcg-toolbar-select"
                          value={ordenPrints}
                          onChange={(e) => setOrdenPrints(e.target.value)}
                        >
                          <option value="default">Orden por defecto</option>
                          <option value="precio-asc">Precio: Menor a mayor</option>
                          <option value="precio-desc">Precio: Mayor a menor</option>
                          <option value="nombre">Nombre (A-Z)</option>
                          <option value="set">Expansión / Set</option>
                        </select>

                        <div className="tcg-density-segmented">
                          <button
                            type="button"
                            className={`tcg-density-btn ${densidad === "compacto" ? "active" : ""}`}
                            onClick={() => setDensidad("compacto")}
                            title="Vista compacta"
                          >
                            <Grid2X2 size={14} />
                            <span>Compacto</span>
                          </button>
                          <button
                            type="button"
                            className={`tcg-density-btn ${densidad === "medio" ? "active" : ""}`}
                            onClick={() => setDensidad("medio")}
                            title="Vista estándar"
                          >
                            <LayoutGrid size={14} />
                            <span>Medio</span>
                          </button>
                          <button
                            type="button"
                            className={`tcg-density-btn ${densidad === "grande" ? "active" : ""}`}
                            onClick={() => setDensidad("grande")}
                            title="Vista amplia"
                          >
                            <Maximize2 size={14} />
                            <span>Detallado</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CUADRÍCULA DE CARTAS ESTILO TCGPLAYER */}
                  {printsFiltrados.length === 0 ? (
                    <div className="tcg-empty-filter-box">
                      <p>No se encontraron cartas que coincidan con "<strong>{filtroPrints}</strong>"</p>
                      <button
                        type="button"
                        className="tcg-btn-reset-filter"
                        onClick={() => setFiltroPrints("")}
                      >
                        Restablecer filtro de texto
                      </button>
                    </div>
                  ) : (
                    <div className={`tcg-cards-grid densidad-${densidad}`}>
                      {printsFiltrados.map((p, index) => {
                        const tag = getCardTag(p);
                        const esSeleccionada = Boolean(
                          seleccionada &&
                            (seleccionada === p ||
                              (seleccionada.id != null && p.id != null
                                ? String(seleccionada.id) === String(p.id)
                                : seleccionada.nombre === p.nombre &&
                                  seleccionada.set === p.set &&
                                  String(seleccionada.numero || "") === String(p.numero || "")))
                        );

                        const usdVal = p.precios?.usd;
                        const copEquiv = usdVal ? Math.round(Number(usdVal) * 3500) : null;

                        return (
                          <div
                            key={p.id ? `${p.id}-${index}` : index}
                            className={`tcg-product-card ${esSeleccionada ? "is-selected" : ""}`}
                            onClick={() => seleccionarVersion(p)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                seleccionarVersion(p);
                              }
                            }}
                          >
                            {/* BADGE DE SELECCIÓN */}
                            {esSeleccionada && (
                              <div className="tcg-card-selected-badge">
                                <Check size={11} strokeWidth={3} />
                                <span>Seleccionada</span>
                              </div>
                            )}

                            {/* TAG DE VARIANTE O ARTE ESPECIAL */}
                            {tag && (
                              <div className={`tcg-card-tag-badge tag-${tag.type}`}>
                                {tag.text}
                              </div>
                            )}

                            {/* MEDIA / ARTE DE LA CARTA */}
                            <div className="tcg-card-media">
                              {p.imagen ? (
                                <img
                                  src={p.imagen}
                                  alt={p.nombre}
                                  loading="lazy"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    if (p.numero && fuente?.startsWith("onepiece")) {
                                      e.target.src = `https://www.optcgapi.com/media/static/Card_Images/${p.numero}.jpg`;
                                    }
                                  }}
                                />
                              ) : (
                                <div className="tcg-media-placeholder">Sin imagen</div>
                              )}

                              <div className="tcg-card-select-overlay">
                                <span>{esSeleccionada ? "Carta en edición" : "Elegir versión"}</span>
                              </div>
                            </div>

                            {/* INFORMACIÓN ESTILO TCGPLAYER */}
                            <div className="tcg-card-content">
                              <h4 className="tcg-card-title" title={p.nombre}>
                                {p.nombre}
                              </h4>

                              <div className="tcg-card-set-row" title={`${p.set || ""} ${p.numero ? `#${p.numero}` : ""}`}>
                                <span className="tcg-set-name">{p.set || "Edición estándar"}</span>
                                {p.numero && <span className="tcg-card-num">#{p.numero}</span>}
                              </div>

                              <div className="tcg-card-price-section">
                                <div className="tcg-price-primary">
                                  {usdVal != null ? `$${Number(usdVal).toFixed(2)}` : "—"}
                                </div>
                                <div className="tcg-price-market">
                                  {copEquiv != null
                                    ? `Market: ~$${copEquiv.toLocaleString("es-CO")} COP`
                                    : "Sin ref mercado"}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : busquedaRealizada ? (
                /* ESTADO: BÚSQUEDA SIN RESULTADOS EN LA API EXTERNA */
                <div className="tcg-empty-search-card">
                  <div className="tcg-empty-icon-wrap">
                    <Search size={32} />
                  </div>
                  <h3>Sin resultados para "{busquedaRealizada}" en {fuenteConfig.label}</h3>
                  <p>
                    No se encontraron cartas oficiales con este término o el servidor externo de la franquicia no reporta existencias en este momento.
                  </p>
                  <div className="tcg-empty-suggestions">
                    <span className="tcg-suggestions-label">Prueba buscar "{busquedaRealizada}" en otra franquicia:</span>
                    <div className="tcg-suggested-games">
                      {FUENTES_JUEGOS.filter((f) => f.id !== fuenteActiva).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          className="tcg-btn-suggested"
                          onClick={() => {
                            setFuenteActiva(f.id);
                            ejecutarBusqueda(f.id);
                          }}
                        >
                          <span className="suggested-badge">{f.badge}</span>
                          <span>Buscar en {f.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* ESTADO INICIAL / GUÍA PARA EL ADMINISTRADOR */
                <div className="admin-guide-card">
                  <div className="guide-card-icon-badge">
                    <Sparkles size={24} />
                  </div>
                  <h3>Flujo de Ingreso de Cartas</h3>
                  <p className="guide-card-lead">
                    Busca cartas por nombre o código en las APIs oficiales para importar automáticamente su foto oficial en alta resolución, rareza y expansión a tu base de datos.
                  </p>

                  <div className="guide-steps-grid">
                    <div className="guide-step-item">
                      <span className="step-num">1</span>
                      <h5>Selecciona el juego</h5>
                      <p>Elige One Piece, Pokémon, Magic o Riftbound en el selector de la izquierda.</p>
                    </div>
                    <div className="guide-step-item">
                      <span className="step-num">2</span>
                      <h5>Elige la versión exacta</h5>
                      <p>Visualiza todas las impresiones, artes base, paralelas (AA) y cartas especiales.</p>
                    </div>
                    <div className="guide-step-item">
                      <span className="step-num">3</span>
                      <h5>Fija precio y publica</h5>
                      <p>Asigna tu precio en COP, unidades en stock y publica al instante en tu tienda.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
