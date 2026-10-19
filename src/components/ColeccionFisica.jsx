import { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Plus,
  Minus,
  Trash2,
  Search,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Check,
  Loader2,
  BookOpen,
  Filter,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import {
  buscarPrintsOnePiece,
  buscarDecksFiltered,
  buscarPromosFiltered,
  buscarDonFiltered,
} from "../lib/onepiece.js";
import { buscarPrintsPokemon } from "../lib/pokemon.js";
import { buscarCartaScryfall, buscarPrintsDesdeUri } from "../lib/scryfall.js";

const CONDICIONES = [
  "Near Mint (NM)",
  "Lightly Played (LP)",
  "Moderately Played (MP)",
  "Heavily Played (HP)",
  "Damaged (DMG)",
];

const JUEGOS_TABS = [
  { id: "onepiece", label: "One Piece TCG", icono: "🏴‍☠️" },
  { id: "pokemon", label: "Pokémon TCG", icono: "⚡" },
  { id: "magic", label: "Magic: The Gathering", icono: "🧙" },
  { id: "manual", label: "Entrada Manual", icono: "✍️" },
];

export default function ColeccionFisica({ user }) {
  // Cargar colección desde user_metadata o localStorage de respaldo
  const [coleccion, setColeccion] = useState(() => {
    return (
      user?.user_metadata?.coleccion ||
      JSON.parse(localStorage.getItem(`coleccion_${user?.id}`) || "[]")
    );
  });

  const [guardando, setGuardando] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [expansionFiltro, setExpansionFiltro] = useState("todas");
  const [expansionesColapsadas, setExpansionesColapsadas] = useState({});

  // Pestaña activa del modal de búsqueda
  const [juegoActivo, setJuegoActivo] = useState("onepiece");
  const [queryApi, setQueryApi] = useState("");
  const [resultadosApi, setResultadosApi] = useState([]);
  const [buscandoApi, setBuscandoApi] = useState(false);
  const [cartaSeleccionada, setCartaSeleccionada] = useState(null);

  // Campos para confirmación / adición
  const [formCantidad, setFormCantidad] = useState(1);
  const [formCondicion, setFormCondicion] = useState("Near Mint (NM)");

  // Campos específicos para el modo 100% manual
  const [manualNombre, setManualNombre] = useState("");
  const [manualExpansion, setManualExpansion] = useState("");
  const [manualRareza, setManualRareza] = useState("Rare");
  const [manualCodigo, setManualCodigo] = useState("");
  const [manualImagen, setManualImagen] = useState("");

  // Expansiones existentes en la base de datos de la tienda
  const [expansionesDb, setExpansionesDb] = useState([]);

  useEffect(() => {
    supabase
      .from("expansiones")
      .select("nombre")
      .order("nombre")
      .then(({ data }) => {
        if (data) {
          const nombres = data.map((e) => e.nombre).filter(Boolean);
          setExpansionesDb([...new Set(nombres)]);
        }
      });
  }, []);

  // Guardar cambios en Supabase (metadata) y localStorage
  async function persistirColeccion(nuevaColeccion) {
    setColeccion(nuevaColeccion);
    if (user?.id) {
      localStorage.setItem(`coleccion_${user.id}`, JSON.stringify(nuevaColeccion));
    }
    setGuardando(true);
    try {
      await supabase.auth.updateUser({
        data: { coleccion: nuevaColeccion },
      });
    } catch (err) {
      console.error("Error guardando colección:", err);
    } finally {
      setGuardando(false);
    }
  }

  // Buscar en las APIs oficiales
  async function ejecutarBusquedaApi(e) {
    if (e) e.preventDefault();
    const texto = queryApi.trim();
    if (!texto) return;

    setBuscandoApi(true);
    setCartaSeleccionada(null);
    setResultadosApi([]);

    try {
      if (juegoActivo === "onepiece") {
        // Buscar en sets normales, starter decks, promos y don
        const [sets, decks, promos, don] = await Promise.all([
          buscarPrintsOnePiece(texto).catch(() => []),
          buscarDecksFiltered(texto).catch(() => []),
          buscarPromosFiltered(texto).catch(() => []),
          buscarDonFiltered(texto).catch(() => []),
        ]);

        const combinados = [...sets, ...decks, ...promos, ...don];
        // Eliminar duplicados por ID o imagen
        const unicos = [];
        const idsVistos = new Set();
        for (const c of combinados) {
          const key = c.numero || c.id || c.imagen;
          if (key && !idsVistos.has(key)) {
            idsVistos.add(key);
            unicos.push(c);
          }
        }
        setResultadosApi(unicos);
      } else if (juegoActivo === "pokemon") {
        const prints = await buscarPrintsPokemon(texto, 30);
        setResultadosApi(prints || []);
      } else if (juegoActivo === "magic") {
        const res = await buscarCartaScryfall(texto);
        if (res?.printsSearchUri) {
          const prints = await buscarPrintsDesdeUri(res.printsSearchUri);
          setResultadosApi(prints);
        } else if (res) {
          setResultadosApi([res]);
        }
      }
    } catch (error) {
      console.error("Error en búsqueda API:", error);
    } finally {
      setBuscandoApi(false);
    }
  }

  // Al seleccionar una carta de los resultados de la API
  function seleccionarCartaApi(carta) {
    setCartaSeleccionada({
      nombre: carta.nombre || "Carta sin nombre",
      expansion: carta.set || "Expansión general",
      codigo: carta.numero || carta.id || "",
      rareza: carta.rarity || carta.rareza || "Standard",
      imagen: carta.imagen || carta.image_uris?.normal || carta.image_uris?.large || "",
      juego: juegoActivo,
    });
  }

  // Confirmar y agregar la carta seleccionada desde la API
  async function agregarCartaDesdeApi() {
    if (!cartaSeleccionada) return;

    const nuevaCarta = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      nombre: cartaSeleccionada.nombre,
      expansion: cartaSeleccionada.expansion,
      codigo: cartaSeleccionada.codigo,
      rareza: cartaSeleccionada.rareza,
      imagen: cartaSeleccionada.imagen,
      condicion: formCondicion,
      cantidad: Math.max(1, parseInt(formCantidad) || 1),
      juego: cartaSeleccionada.juego,
      creado_en: new Date().toISOString(),
    };

    insertarEnColeccion(nuevaCarta);
  }

  // Agregar carta manual
  async function agregarCartaManual(e) {
    e.preventDefault();
    if (!manualNombre.trim()) return;

    const nuevaCarta = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      nombre: manualNombre.trim(),
      expansion: manualExpansion.trim() || "Sin Expansión",
      codigo: manualCodigo.trim().toUpperCase(),
      rareza: manualRareza,
      imagen: manualImagen.trim(),
      condicion: formCondicion,
      cantidad: Math.max(1, parseInt(formCantidad) || 1),
      juego: "manual",
      creado_en: new Date().toISOString(),
    };

    insertarEnColeccion(nuevaCarta);
    setManualNombre("");
    setManualExpansion("");
    setManualCodigo("");
    setManualImagen("");
  }

  // Lógica común de inserción (sumar cantidad si ya existe o agregar nueva)
  async function insertarEnColeccion(carta) {
    const indexExistente = coleccion.findIndex(
      (c) =>
        c.nombre.toLowerCase() === carta.nombre.toLowerCase() &&
        c.expansion.toLowerCase() === carta.expansion.toLowerCase() &&
        c.condicion === carta.condicion &&
        (c.codigo || "").toLowerCase() === (carta.codigo || "").toLowerCase()
    );

    let nuevaLista;
    if (indexExistente >= 0) {
      nuevaLista = [...coleccion];
      nuevaLista[indexExistente].cantidad += carta.cantidad;
    } else {
      nuevaLista = [carta, ...coleccion];
    }

    await persistirColeccion(nuevaLista);

    // Resetear estados y cerrar modal
    setCartaSeleccionada(null);
    setFormCantidad(1);
    setMostrarModal(false);
  }

  // Modificar cantidad (+ / -)
  async function cambiarCantidad(id, delta) {
    const nuevaLista = coleccion
      .map((c) => {
        if (c.id === id) {
          const nuevaCant = c.cantidad + delta;
          return nuevaCant > 0 ? { ...c, cantidad: nuevaCant } : null;
        }
        return c;
      })
      .filter(Boolean);

    await persistirColeccion(nuevaLista);
  }

  // Eliminar carta
  async function eliminarCarta(id) {
    const nuevaLista = coleccion.filter((c) => c.id !== id);
    await persistirColeccion(nuevaLista);
  }

  // Alternar colapsar expansión
  function toggleColapso(exp) {
    setExpansionesColapsadas((prev) => ({
      ...prev,
      [exp]: !prev[exp],
    }));
  }

  // Filtrado de cartas en la colección del usuario
  const cartasFiltradas = useMemo(() => {
    return coleccion.filter((carta) => {
      const coincideTexto =
        !busqueda ||
        carta.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        carta.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        carta.expansion?.toLowerCase().includes(busqueda.toLowerCase());

      const coincideExpansion =
        expansionFiltro === "todas" || carta.expansion === expansionFiltro;

      return coincideTexto && coincideExpansion;
    });
  }, [coleccion, busqueda, expansionFiltro]);

  // Agrupar por expansión
  const gruposPorExpansion = useMemo(() => {
    const grupos = {};
    for (const carta of cartasFiltradas) {
      const exp = carta.expansion || "Otras / Varias";
      if (!grupos[exp]) grupos[exp] = [];
      grupos[exp].push(carta);
    }
    return Object.keys(grupos)
      .sort((a, b) => a.localeCompare(b))
      .map((exp) => ({
        expansion: exp,
        cartas: grupos[exp],
        totalCartas: grupos[exp].reduce((acc, c) => acc + c.cantidad, 0),
      }));
  }, [cartasFiltradas]);

  // Lista de todas las expansiones en la colección
  const expansionesEnColeccion = useMemo(() => {
    return [...new Set(coleccion.map((c) => c.expansion || "Otras / Varias"))].sort();
  }, [coleccion]);

  // Estadísticas rápidas
  const totalCartasFisicas = useMemo(() => {
    return coleccion.reduce((acc, c) => acc + (c.cantidad || 1), 0);
  }, [coleccion]);

  return (
    <div className="perfil-panel coleccion-contenedor">
      {/* CABECERA & RESUMEN MINIMALISTA */}
      <div className="coleccion-header">
        <div>
          <h3 style={{ margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: "8px" }}>
            <Layers size={20} style={{ color: "var(--acento, #a855f7)" }} />
            Mi Colección Física de Cartas
          </h3>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--texto-suave, #a1a1aa)" }}>
            Registra tus cartas físicas con sus fotos oficiales, rarezas y expansiones.
          </p>
        </div>

        <button
          type="button"
          className="auth-boton coleccion-btn-agregar"
          onClick={() => {
            setMostrarModal(true);
            setCartaSeleccionada(null);
            setResultadosApi([]);
            setQueryApi("");
          }}
        >
          <Plus size={16} /> Agregar carta desde API
        </button>
      </div>

      {/* METRICAS MINIMALISTAS */}
      <div className="coleccion-stats">
        <div className="stat-card">
          <span className="stat-numero">{totalCartasFisicas}</span>
          <span className="stat-label">Cartas físicas</span>
        </div>
        <div className="stat-card">
          <span className="stat-numero">{coleccion.length}</span>
          <span className="stat-label">Cartas únicas</span>
        </div>
        <div className="stat-card">
          <span className="stat-numero">{expansionesEnColeccion.length}</span>
          <span className="stat-label">Expansiones</span>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA INTERNA */}
      {coleccion.length > 0 && (
        <div className="coleccion-filtros">
          <div className="coleccion-search-box">
            <Search size={15} style={{ color: "var(--texto-suave, #a1a1aa)" }} />
            <input
              type="text"
              placeholder="Buscar en tu colección por nombre, código o expansión..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button
                type="button"
                className="btn-limpiar-search"
                onClick={() => setBusqueda("")}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <select
            className="coleccion-select-expansion"
            value={expansionFiltro}
            onChange={(e) => setExpansionFiltro(e.target.value)}
          >
            <option value="todas">Todas las expansiones ({expansionesEnColeccion.length})</option>
            {expansionesEnColeccion.map((exp) => (
              <option key={exp} value={exp}>
                {exp}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ESTADO VACÍO */}
      {coleccion.length === 0 ? (
        <div className="perfil-vacio" style={{ padding: "48px 20px" }}>
          <Layers size={44} style={{ opacity: 0.6, marginBottom: "14px" }} />
          <h4 style={{ margin: "0 0 8px 0", color: "var(--texto, #fff)" }}>
            Tu colección física está vacía
          </h4>
          <p style={{ maxWidth: "440px", margin: "0 auto 24px auto", fontSize: "14px", lineHeight: "1.6" }}>
            Busca cualquier carta en la API oficial de One Piece, Pokémon o Magic para agregarla con su foto oficial, rareza y expansión en un clic.
          </p>
          <button
            type="button"
            className="auth-boton"
            style={{ margin: "0 auto", display: "inline-flex", alignItems: "center", gap: "8px" }}
            onClick={() => setMostrarModal(true)}
          >
            <Plus size={16} /> Agregar mi primera carta
          </button>
        </div>
      ) : gruposPorExpansion.length === 0 ? (
        <div className="perfil-vacio" style={{ padding: "36px 20px" }}>
          <p>No se encontraron cartas que coincidan con la búsqueda.</p>
          <button
            type="button"
            className="auth-enlace"
            onClick={() => {
              setBusqueda("");
              setExpansionFiltro("todas");
            }}
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        /* LISTADO AGRUPADO Y ORDENADO POR EXPANSIONES */
        <div className="coleccion-expansiones-list">
          {gruposPorExpansion.map(({ expansion, cartas, totalCartas }) => {
            const colapsado = !!expansionesColapsadas[expansion];

            return (
              <div key={expansion} className="coleccion-expansion-seccion">
                <header
                  className="expansion-header"
                  onClick={() => toggleColapso(expansion)}
                >
                  <div className="expansion-header-info">
                    <span className="expansion-icono">📦</span>
                    <h4 className="expansion-titulo">{expansion}</h4>
                    <span className="expansion-badge-count">
                      {totalCartas} {totalCartas === 1 ? "carta" : "cartas"}
                    </span>
                  </div>
                  <button type="button" className="btn-toggle-colapso" aria-label="Colapsar">
                    {colapsado ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
                </header>

                {!colapsado && (
                  <div className="coleccion-cards-grid">
                    {cartas.map((carta) => (
                      <div key={carta.id} className="coleccion-card-item">
                        {/* IMAGEN DE LA CARTA */}
                        <div className="card-img-wrapper">
                          {carta.imagen ? (
                            <img
                              src={carta.imagen}
                              alt={carta.nombre}
                              loading="lazy"
                            />
                          ) : (
                            <div className="card-img-placeholder">
                              <ImageIcon size={24} style={{ opacity: 0.4 }} />
                              <span>{carta.codigo || carta.nombre.substring(0, 4)}</span>
                            </div>
                          )}

                          {/* BADGE DE CANTIDAD */}
                          <div className="card-badge-cant">
                            x{carta.cantidad}
                          </div>

                          {/* CONTROLES RÁPIDOS (+ / - / ELIMINAR) */}
                          <div className="card-acciones-hover">
                            <button
                              type="button"
                              className="btn-acc"
                              title="Restar una carta"
                              onClick={() => cambiarCantidad(carta.id, -1)}
                            >
                              <Minus size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-acc"
                              title="Sumar una carta"
                              onClick={() => cambiarCantidad(carta.id, 1)}
                            >
                              <Plus size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-acc btn-trash"
                              title="Eliminar de mi colección"
                              onClick={() => eliminarCarta(carta.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* DETALLES DE LA CARTA */}
                        <div className="card-detalles">
                          <p className="card-nombre" title={carta.nombre}>
                            {carta.nombre}
                          </p>
                          <div className="card-tags">
                            {carta.codigo && (
                              <span className="card-tag tag-codigo">{carta.codigo}</span>
                            )}
                            {carta.rareza && (
                              <span className="card-tag tag-rareza">{carta.rareza}</span>
                            )}
                            {carta.condicion && (
                              <span className="card-tag tag-condicion">
                                {carta.condicion.includes("(")
                                  ? carta.condicion.match(/\(([^)]+)\)/)?.[1]
                                  : carta.condicion}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE BÚSQUEDA Y ADICIÓN DESDE API OFICIAL */}
      {mostrarModal && (
        <div className="coleccion-modal-backdrop" onClick={() => setMostrarModal(false)}>
          <div
            className="coleccion-modal-content coleccion-modal-grande"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ENCABEZADO DEL MODAL */}
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={18} style={{ color: "var(--acento, #a855f7)" }} />
                  Agregar Carta a mi Colección Física
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--texto-suave, #a1a1aa)" }}>
                  Busca la carta en la API oficial para importar su foto oficial, rareza y expansión.
                </p>
              </div>
              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={() => setMostrarModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* SELECTOR DE JUEGO / API */}
            <div className="modal-juegos-tabs">
              {JUEGOS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`modal-juego-tab ${juegoActivo === tab.id ? "active" : ""}`}
                  onClick={() => {
                    setJuegoActivo(tab.id);
                    setResultadosApi([]);
                    setCartaSeleccionada(null);
                  }}
                >
                  <span>{tab.icono}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* SI ESTÁ EN MODO API (ONE PIECE, POKÉMON O MAGIC) */}
            {juegoActivo !== "manual" ? (
              <div className="modal-api-seccion">
                {/* BUSCADOR DE API */}
                <form onSubmit={ejecutarBusquedaApi} className="api-search-form">
                  <div className="coleccion-search-box" style={{ flex: 1 }}>
                    <Search size={16} style={{ color: "var(--texto-suave, #a1a1aa)" }} />
                    <input
                      type="text"
                      placeholder={
                        juegoActivo === "onepiece"
                          ? "Ej: Luffy, Zoro, Nami, OP05-060, ST01..."
                          : juegoActivo === "pokemon"
                          ? "Ej: Charizard, Pikachu, Mewtwo..."
                          : "Ej: Black Lotus, Lightning Bolt..."
                      }
                      value={queryApi}
                      onChange={(e) => setQueryApi(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="auth-boton"
                    disabled={buscandoApi || !queryApi.trim()}
                    style={{ padding: "10px 22px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    {buscandoApi ? <Loader2 size={16} className="spinner-icon" /> : <Search size={16} />}
                    Buscar en API
                  </button>
                </form>

                {/* VISTA DIVIDIDA: RESULTADOS Y PREVIEW */}
                <div className="api-layout">
                  {/* LISTA DE RESULTADOS DE LA API */}
                  <div className="api-resultados-col">
                    <div className="api-resultados-header">
                      <span>Resultados de la API ({resultadosApi.length}):</span>
                      {buscandoApi && <span className="api-cargando-tag">Consultando API...</span>}
                    </div>

                    {buscandoApi ? (
                      <div className="api-estado-vacio">
                        <Loader2 size={32} className="spinner-icon" />
                        <p>Buscando cartas e imágenes oficiales...</p>
                      </div>
                    ) : resultadosApi.length === 0 ? (
                      <div className="api-estado-vacio">
                        <Search size={32} style={{ opacity: 0.3 }} />
                        <p>Escribe el nombre de la carta o código y presiona "Buscar en API".</p>
                      </div>
                    ) : (
                      <div className="api-cards-grid">
                        {resultadosApi.map((item, idx) => {
                          const isSel =
                            cartaSeleccionada?.codigo === (item.numero || item.id) &&
                            cartaSeleccionada?.nombre === item.nombre;

                          return (
                            <div
                              key={item.id || idx}
                              className={`api-card-min ${isSel ? "seleccionada" : ""}`}
                              onClick={() => seleccionarCartaApi(item)}
                            >
                              <div className="api-card-thumb">
                                {item.imagen ? (
                                  <img src={item.imagen} alt={item.nombre} loading="lazy" />
                                ) : (
                                  <div className="thumb-placeholder">Sin imagen</div>
                                )}
                                {item.rarity && (
                                  <span className="api-thumb-badge">{item.rarity}</span>
                                )}
                              </div>
                              <div className="api-card-info">
                                <p className="api-card-title">{item.nombre}</p>
                                <p className="api-card-set">{item.set || "Expansión"}</p>
                                {item.numero && (
                                  <p className="api-card-code">{item.numero}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* PANEL LATERAL: CARTA SELECCIONADA Y CONFIGURACIÓN */}
                  <div className="api-preview-col">
                    <div className="api-preview-card">
                      <div className="preview-header">
                        <h4>Detalles de tu carta</h4>
                        {cartaSeleccionada && (
                          <span className="preview-ok-badge">
                            <Check size={12} /> Datos oficiales cargados
                          </span>
                        )}
                      </div>

                      {cartaSeleccionada ? (
                        <div className="preview-body">
                          {/* IMAGEN OFICIAL */}
                          <div className="preview-img-container">
                            <img
                              src={cartaSeleccionada.imagen}
                              alt={cartaSeleccionada.nombre}
                            />
                          </div>

                          {/* INFORMACIÓN AUTOCOMPLETADA DE LA API */}
                          <div className="preview-datos">
                            <h4 className="preview-nombre">{cartaSeleccionada.nombre}</h4>
                            <div className="preview-tags">
                              <span className="tag-exp">📦 {cartaSeleccionada.expansion}</span>
                              {cartaSeleccionada.codigo && (
                                <span className="tag-cod">🏷️ {cartaSeleccionada.codigo}</span>
                              )}
                              {cartaSeleccionada.rareza && (
                                <span className="tag-rar">⭐ {cartaSeleccionada.rareza}</span>
                              )}
                            </div>

                            {/* SELECTOR DE CONDICIÓN Y CANTIDAD */}
                            <div className="preview-opciones">
                              <div className="form-campo">
                                <label>Condición física:</label>
                                <select
                                  value={formCondicion}
                                  onChange={(e) => setFormCondicion(e.target.value)}
                                >
                                  {CONDICIONES.map((c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="form-campo">
                                <label>Copias en tu colección:</label>
                                <div className="cantidad-input-row">
                                  <button
                                    type="button"
                                    className="btn-cant"
                                    onClick={() => setFormCantidad((prev) => Math.max(1, prev - 1))}
                                  >
                                    -
                                  </button>
                                  <span className="cant-display">{formCantidad}</span>
                                  <button
                                    type="button"
                                    className="btn-cant"
                                    onClick={() => setFormCantidad((prev) => prev + 1)}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="auth-boton btn-confirmar-add"
                              onClick={agregarCartaDesdeApi}
                            >
                              <Plus size={16} /> Agregar a mi Colección
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="preview-placeholder-box">
                          <ImageIcon size={38} style={{ opacity: 0.3, marginBottom: "8px" }} />
                          <p>Haz clic en cualquier carta de la lista para ver su información e importarla.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* MODO MANUAL */
              <form onSubmit={agregarCartaManual} className="modal-form manual-form" style={{ marginTop: "16px" }}>
                <div className="form-campo">
                  <label>Nombre de la carta *</label>
                  <input
                    type="text"
                    placeholder="Ej: Monkey.D.Luffy"
                    value={manualNombre}
                    onChange={(e) => setManualNombre(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-campo">
                    <label>Expansión / Colección *</label>
                    <input
                      type="text"
                      placeholder="Ej: Romance Dawn, OP-01..."
                      value={manualExpansion}
                      onChange={(e) => setManualExpansion(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-campo">
                    <label>Código (opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej: OP01-024"
                      value={manualCodigo}
                      onChange={(e) => setManualCodigo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-campo">
                    <label>Rareza</label>
                    <input
                      type="text"
                      placeholder="Ej: Super Rare (SR), Manga, Promo..."
                      value={manualRareza}
                      onChange={(e) => setManualRareza(e.target.value)}
                    />
                  </div>

                  <div className="form-campo">
                    <label>Condición física</label>
                    <select
                      value={formCondicion}
                      onChange={(e) => setFormCondicion(e.target.value)}
                    >
                      {CONDICIONES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-campo">
                    <label>Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={formCantidad}
                      onChange={(e) => setFormCantidad(e.target.value)}
                    />
                  </div>

                  <div className="form-campo">
                    <label>URL de imagen (opcional)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={manualImagen}
                      onChange={(e) => setManualImagen(e.target.value)}
                    />
                  </div>
                </div>

                <div className="modal-acciones">
                  <button
                    type="button"
                    className="btn-cancelar"
                    onClick={() => setMostrarModal(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="auth-boton">
                    <Plus size={16} /> Guardar carta manual
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
