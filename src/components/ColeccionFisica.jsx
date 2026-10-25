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
  ScanLine,
} from "lucide-react";
import CardScanner from "./CardScanner.jsx";
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
  { id: "scanner", label: "Escáner", icono: "📷" },
  { id: "manual", label: "Entrada Manual", icono: "✍️" },
];

// Detecta si una carta de One Piece es versión especial / alta rareza (Parallel, Alternate Art, Manga, SP)
function esVersionEspecialOnePiece(c) {
  const nom = (c.nombre || c.card_name || "").toUpperCase();
  const img = (c.imagen || c.card_image || "").toUpperCase();
  const id = (c.id || c.card_image_id || "").toUpperCase();
  const rar = (c.rarity || c.rareza || "").toUpperCase();
  return (
    nom.includes("(PARALLEL)") ||
    nom.includes("(ALTERNATE ART)") ||
    nom.includes("(ALT ART)") ||
    nom.includes("(MANGA)") ||
    nom.includes("(SP)") ||
    nom.includes("(SUPER ALTERNATE ART)") ||
    nom.includes("(SUPER LEADER)") ||
    id.includes("_P1") ||
    id.includes("_P2") ||
    id.includes("_P3") ||
    id.includes("_P4") ||
    id.includes("_P5") ||
    id.includes("_P6") ||
    id.includes("_P7") ||
    id.includes("_P8") ||
    id.includes("_R1") ||
    id.includes("_R2") ||
    img.includes("_P1") ||
    img.includes("_P2") ||
    img.includes("_P3") ||
    img.includes("_P4") ||
    img.includes("_P5") ||
    img.includes("_P6") ||
    img.includes("_P7") ||
    img.includes("_P8") ||
    img.includes("_R1") ||
    img.includes("_R2") ||
    rar === "SP" ||
    rar === "MANGA"
  );
}

export default function ColeccionFisica({ user }) {
  const [coleccion, setColeccion] = useState([]);
  const [cargandoColeccion, setCargandoColeccion] = useState(true);
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

  // Filtro de rareza / arte: "normal" (menor rareza por default) | "aa" (Alternate Art) | "todas"
  const [filtroRarezaApi, setFiltroRarezaApi] = useState("normal");

  // Campos para confirmación / adición
  const [formCantidad, setFormCantidad] = useState(1);
  const [formCondicion, setFormCondicion] = useState("Near Mint (NM)");

  // Campos específicos para el modo manual
  const [manualNombre, setManualNombre] = useState("");
  const [manualExpansion, setManualExpansion] = useState("");
  const [manualRareza, setManualRareza] = useState("Rare");
  const [manualCodigo, setManualCodigo] = useState("");
  const [manualImagen, setManualImagen] = useState("");

  // Expansiones existentes en la base de datos de la tienda
  const [expansionesDb, setExpansionesDb] = useState([]);

  // Cargar colección directamente desde la tabla SQL coleccion_usuario de Supabase
  useEffect(() => {
    async function cargarColeccion() {
      if (!user?.id) return;
      setCargandoColeccion(true);

      try {
        const { data, error } = await supabase
          .from("coleccion_usuario")
          .select("*")
          .eq("user_id", user.id)
          .order("creado_en", { ascending: false });

        if (!error && data) {
          // Si había cartas previas en user_metadata que no estén en la tabla, las migramos
          const metaCards = user?.user_metadata?.coleccion || [];
          if (data.length === 0 && metaCards.length > 0) {
            const filasMigrar = metaCards.map((c) => ({
              user_id: user.id,
              nombre: c.nombre,
              expansion: c.expansion || "Sin Expansión",
              codigo: c.codigo || "",
              rareza: c.rareza || "",
              condicion: c.condicion || "Near Mint (NM)",
              cantidad: c.cantidad || 1,
              imagen: c.imagen || "",
              juego: c.juego || "onepiece",
            }));

            const { data: migrados } = await supabase
              .from("coleccion_usuario")
              .insert(filasMigrar)
              .select();

            setColeccion(migrados || metaCards);
          } else {
            setColeccion(data);
          }
        } else if (error) {
          console.warn("Tabla coleccion_usuario no encontrada o error RLS, usando respaldo:", error.message);
          // Respaldo de contingencia
          setColeccion(user?.user_metadata?.coleccion || []);
        }
      } catch (err) {
        console.error("Error cargando colección:", err);
      } finally {
        setCargandoColeccion(false);
      }
    }

    cargarColeccion();

    // Cargar nombres de expansiones de la tienda
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
  }, [user?.id]);

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
        const [sets, decks, promos, don] = await Promise.all([
          buscarPrintsOnePiece(texto).catch(() => []),
          buscarDecksFiltered(texto).catch(() => []),
          buscarPromosFiltered(texto).catch(() => []),
          buscarDonFiltered(texto).catch(() => []),
        ]);

        const combinados = [...sets, ...decks, ...promos, ...don];
        const unicos = [];
        const idsVistos = new Set();
        for (const c of combinados) {
          // Preservar clave única por id/imagen para mantener la versión normal y la AA por separado
          const key = c.id || c.imagen || `${c.numero}_${c.nombre}`;
          if (key && !idsVistos.has(key)) {
            idsVistos.add(key);
            unicos.push(c);
          }
        }

        // Ordenar con menor rareza (normal/base) primero por defecto
        unicos.sort((a, b) => {
          const espA = esVersionEspecialOnePiece(a);
          const espB = esVersionEspecialOnePiece(b);
          if (espA !== espB) return espA ? 1 : -1;
          return 0;
        });

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

  // Resultados filtrados según la preferencia de rareza: "normal" (menor rareza por default), "aa" o "todas"
  const resultadosApiFiltrados = useMemo(() => {
    return resultadosApi.filter((item) => {
      if (juegoActivo !== "onepiece") return true;
      const esEsp = esVersionEspecialOnePiece(item);
      if (filtroRarezaApi === "normal") return !esEsp;
      if (filtroRarezaApi === "aa") return esEsp;
      return true;
    });
  }, [resultadosApi, filtroRarezaApi, juegoActivo]);

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
      nombre: cartaSeleccionada.nombre,
      expansion: cartaSeleccionada.expansion,
      codigo: cartaSeleccionada.codigo,
      rareza: cartaSeleccionada.rareza,
      imagen: cartaSeleccionada.imagen,
      condicion: formCondicion,
      cantidad: Math.max(1, parseInt(formCantidad) || 1),
      juego: cartaSeleccionada.juego,
    };

    await guardarCartaEnBaseDatos(nuevaCarta);
  }

  // Agregar carta manual
  async function agregarCartaManual(e) {
    e.preventDefault();
    if (!manualNombre.trim()) return;

    const nuevaCarta = {
      nombre: manualNombre.trim(),
      expansion: manualExpansion.trim() || "Sin Expansión",
      codigo: manualCodigo.trim().toUpperCase(),
      rareza: manualRareza,
      imagen: manualImagen.trim(),
      condicion: formCondicion,
      cantidad: Math.max(1, parseInt(formCantidad) || 1),
      juego: "manual",
    };

    await guardarCartaEnBaseDatos(nuevaCarta);
    setManualNombre("");
    setManualExpansion("");
    setManualCodigo("");
    setManualImagen("");
  }

  // Inserción en la tabla SQL `coleccion_usuario` de Supabase
  async function guardarCartaEnBaseDatos(carta) {
    setGuardando(true);

    try {
      // Verificar si ya existe en la lista local para actualizar cantidad
      const indexExistente = coleccion.findIndex(
        (c) =>
          c.nombre.toLowerCase() === carta.nombre.toLowerCase() &&
          c.expansion.toLowerCase() === carta.expansion.toLowerCase() &&
          c.condicion === carta.condicion &&
          (c.codigo || "").toLowerCase() === (carta.codigo || "").toLowerCase()
      );

      if (indexExistente >= 0) {
        const itemExistente = coleccion[indexExistente];
        const nuevaCantidad = itemExistente.cantidad + carta.cantidad;

        // Actualizar en Supabase
        const { error } = await supabase
          .from("coleccion_usuario")
          .update({ cantidad: nuevaCantidad, actualizado_en: new Date().toISOString() })
          .eq("id", itemExistente.id);

        if (!error) {
          const nuevaLista = [...coleccion];
          nuevaLista[indexExistente] = { ...itemExistente, cantidad: nuevaCantidad };
          setColeccion(nuevaLista);
        }
      } else {
        // Insertar nueva fila en Supabase
        const { data, error } = await supabase
          .from("coleccion_usuario")
          .insert([
            {
              user_id: user.id,
              nombre: carta.nombre,
              expansion: carta.expansion,
              codigo: carta.codigo,
              rareza: carta.rareza,
              condicion: carta.condicion,
              cantidad: carta.cantidad,
              imagen: carta.imagen,
              juego: carta.juego,
            },
          ])
          .select()
          .single();

        if (!error && data) {
          setColeccion((prev) => [data, ...prev]);
        } else if (error) {
          console.error("Error insertando en coleccion_usuario:", error);
          // Fallback en memoria si la tabla aún no se creó
          const cartaFallback = { ...carta, id: Date.now().toString(), user_id: user.id };
          const nuevaLista = [cartaFallback, ...coleccion];
          setColeccion(nuevaLista);
          supabase.auth.updateUser({ data: { coleccion: nuevaLista } }).catch(() => {});
        }
      }
    } catch (err) {
      console.error("Error al guardar carta:", err);
    } finally {
      setGuardando(false);
      setCartaSeleccionada(null);
      setFormCantidad(1);
      setMostrarModal(false);
    }
  }

  // Modificar cantidad (+ / -) directamente en Supabase
  async function cambiarCantidad(id, delta) {
    const item = coleccion.find((c) => c.id === id);
    if (!item) return;

    const nuevaCant = item.cantidad + delta;

    if (nuevaCant <= 0) {
      // Eliminar de Supabase
      setColeccion((prev) => prev.filter((c) => c.id !== id));
      await supabase.from("coleccion_usuario").delete().eq("id", id);
    } else {
      // Actualizar cantidad en Supabase
      setColeccion((prev) =>
        prev.map((c) => (c.id === id ? { ...c, cantidad: nuevaCant } : c))
      );
      await supabase
        .from("coleccion_usuario")
        .update({ cantidad: nuevaCant, actualizado_en: new Date().toISOString() })
        .eq("id", id);
    }
  }

  // Eliminar carta directamente en Supabase
  async function eliminarCarta(id) {
    setColeccion((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("coleccion_usuario").delete().eq("id", id);
  }

  // Alternar colapsar expansión
  function toggleColapso(exp) {
    setExpansionesColapsadas((prev) => ({
      ...prev,
      [exp]: !prev[exp],
    }));
  }

  // Filtrado de cartas
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

  // Expansiones presentes en la colección
  const expansionesEnColeccion = useMemo(() => {
    return [...new Set(coleccion.map((c) => c.expansion || "Otras / Varias"))].sort();
  }, [coleccion]);

  // Total de cartas físicas sumando copias
  const totalCartasFisicas = useMemo(() => {
    return coleccion.reduce((acc, c) => acc + (c.cantidad || 1), 0);
  }, [coleccion]);

  if (cargandoColeccion) {
    return (
      <div className="perfil-panel coleccion-contenedor" style={{ textAlign: "center", padding: "48px 20px" }}>
        <Loader2 size={36} className="spinner-icon" style={{ margin: "0 auto 12px auto", color: "var(--acento, #a855f7)" }} />
        <p style={{ color: "var(--texto-suave, #a1a1aa)", fontSize: "14px" }}>
          Cargando tu colección física de cartas desde Supabase...
        </p>
      </div>
    );
  }

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
            Registra y gestiona tus cartas físicas con sus fotos oficiales, rarezas y expansiones.
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
            Busca cualquier carta en la API oficial de One Piece, Pokémon o Magic para agregarla con su foto oficial, rareza y expansión en un solo clic.
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
                              className="btn-acc btn-acc-minus"
                              title="Restar 1 carta"
                              aria-label="Restar 1 carta"
                              onClick={(e) => {
                                e.stopPropagation();
                                cambiarCantidad(carta.id, -1);
                              }}
                            >
                              <Minus size={15} strokeWidth={2.6} />
                            </button>
                            <button
                              type="button"
                              className="btn-acc btn-acc-plus"
                              title="Sumar 1 carta"
                              aria-label="Sumar 1 carta"
                              onClick={(e) => {
                                e.stopPropagation();
                                cambiarCantidad(carta.id, 1);
                              }}
                            >
                              <Plus size={15} strokeWidth={2.6} />
                            </button>
                            <button
                              type="button"
                              className="btn-acc btn-acc-trash"
                              title="Eliminar de mi colección"
                              aria-label="Eliminar de mi colección"
                              onClick={(e) => {
                                e.stopPropagation();
                                eliminarCarta(carta.id);
                              }}
                            >
                              <Trash2 size={15} strokeWidth={2.2} />
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
                  Busca la carta en la API oficial para importar su foto oficial, rareza y expansión a tu base de datos.
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

            {/* SI ESTÁ EN MODO ESCÁNER */}
            {juegoActivo === "scanner" ? (
              <div className="modal-scanner-seccion">
                <CardScanner
                  onCardDetected={(cardData) => {
                    // Al detectar una carta, pasar a la pestaña One Piece y buscar
                    setJuegoActivo("onepiece");
                    const nombreLimpio = cardData.nombre
                      ? cardData.nombre.replace(/\(.*?\)/g, "").trim()
                      : "";
                    const textoBusqueda = nombreLimpio || cardData.codigo || "";
                    setQueryApi(textoBusqueda);

                    // Pre-seleccionar si tenemos la imagen o datos directos
                    if (cardData.nombre) {
                      setCartaSeleccionada({
                        nombre: cardData.nombre,
                        expansion: cardData.expansion || "One Piece TCG",
                        codigo: cardData.codigo || "",
                        rareza: "Standard",
                        imagen: cardData.imagen || "",
                        juego: "onepiece",
                      });
                    }

                    // Ejecutar búsqueda automáticamente
                    setTimeout(() => {
                      setBuscandoApi(true);
                      setResultadosApi([]);
                      const texto = textoBusqueda.trim();
                      if (!texto) { setBuscandoApi(false); return; }
                      Promise.all([
                        buscarPrintsOnePiece(texto).catch(() => []),
                        buscarDecksFiltered(texto).catch(() => []),
                        buscarPromosFiltered(texto).catch(() => []),
                        buscarDonFiltered(texto).catch(() => []),
                      ]).then(([sets, decks, promos, don]) => {
                        const combinados = [...sets, ...decks, ...promos, ...don];
                        const unicos = [];
                        const idsVistos = new Set();
                        for (const c of combinados) {
                          const key = c.id || c.imagen || `${c.numero}_${c.nombre}`;
                          if (key && !idsVistos.has(key)) {
                            idsVistos.add(key);
                            unicos.push(c);
                          }
                        }
                        unicos.sort((a, b) => {
                          const espA = esVersionEspecialOnePiece(a);
                          const espB = esVersionEspecialOnePiece(b);
                          if (espA !== espB) return espA ? 1 : -1;
                          return 0;
                        });
                        setResultadosApi(unicos);
                        // Auto-seleccionar si coincide el código exacto
                        if (cardData.codigo) {
                          const coincidencia = unicos.find(
                            (c) => c.numero?.toUpperCase() === cardData.codigo.toUpperCase()
                          );
                          if (coincidencia) {
                            seleccionarCartaApi(coincidencia);
                          }
                        }
                      }).catch((err) => {
                        console.error("Error búsqueda post-scan:", err);
                      }).finally(() => {
                        setBuscandoApi(false);
                      });
                    }, 100);
                  }}
                  onClose={() => setJuegoActivo("onepiece")}
                />
              </div>
            ) : /* SI ESTÁ EN MODO API (ONE PIECE, POKÉMON O MAGIC) */
            juegoActivo !== "manual" ? (
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
                    className="btn-api-search"
                    disabled={buscandoApi || !queryApi.trim()}
                  >
                    {buscandoApi ? <Loader2 size={16} className="spinner-icon" /> : <Search size={16} />}
                    Buscar en API
                  </button>
                </form>

                {/* SELECTOR DE RAREZA EN BÚSQUEDA (ONE PIECE): MENOR RAREZA (NORMAL / BASE) POR DEFAULT VS AA */}
                {juegoActivo === "onepiece" && (
                  <div className="api-rareza-filter-bar">
                    <span className="api-filter-label">Mostrar en resultados:</span>
                    <div className="api-filter-tabs">
                      <button
                        type="button"
                        className={`api-filter-tab ${filtroRarezaApi === "normal" ? "active" : ""}`}
                        onClick={() => setFiltroRarezaApi("normal")}
                        title="Mostrar versiones en su menor rareza (versión normal / base por defecto)"
                      >
                        Versión Base (Normal)
                      </button>
                      <button
                        type="button"
                        className={`api-filter-tab ${filtroRarezaApi === "aa" ? "active" : ""}`}
                        onClick={() => setFiltroRarezaApi("aa")}
                        title="Mostrar versiones Alternate Art (AA / Paralelas / Manga)"
                      >
                        Alternate Art (AA)
                      </button>
                      <button
                        type="button"
                        className={`api-filter-tab ${filtroRarezaApi === "todas" ? "active" : ""}`}
                        onClick={() => setFiltroRarezaApi("todas")}
                        title="Mostrar todas las versiones disponibles"
                      >
                        Todas
                      </button>
                    </div>
                  </div>
                )}

                {/* VISTA DIVIDIDA: RESULTADOS Y PREVIEW */}
                <div className="api-layout">
                  {/* LISTA DE RESULTADOS DE LA API */}
                  <div className="api-resultados-col">
                    <div className="api-resultados-header">
                      <span>Resultados de la API ({resultadosApiFiltrados.length}):</span>
                      {buscandoApi && <span className="api-cargando-tag">Consultando API...</span>}
                    </div>

                    {buscandoApi ? (
                      <div className="api-estado-vacio">
                        <Loader2 size={32} className="spinner-icon" />
                        <p>Buscando cartas e imágenes oficiales...</p>
                      </div>
                    ) : resultadosApiFiltrados.length === 0 ? (
                      <div className="api-estado-vacio">
                        <Search size={32} style={{ opacity: 0.3 }} />
                        <p>
                          {resultadosApi.length > 0
                            ? `No hay cartas en categoría "${filtroRarezaApi === "aa" ? "Alternate Art" : "Normal"}". Puedes cambiar a "Todas" para ver las demás.`
                            : 'Escribe el nombre de la carta o código y presiona "Buscar en API".'}
                        </p>
                      </div>
                    ) : (
                      <div className="api-cards-grid">
                        {resultadosApiFiltrados.map((item, idx) => {
                          const isSel =
                            cartaSeleccionada?.codigo === (item.numero || item.id) &&
                            cartaSeleccionada?.nombre === item.nombre;
                          const esAA = esVersionEspecialOnePiece(item);

                          return (
                            <div
                              key={item.id || idx}
                              className={`api-card-min ${isSel ? "seleccionada" : ""}`}
                              onClick={() => seleccionarCartaApi(item)}
                            >
                              <div className="api-card-thumb">
                                {item.imagen ? (
                                  <img
                                    src={item.imagen}
                                    alt={item.nombre}
                                    loading="lazy"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      if (item.numero) {
                                        e.target.src = `https://www.optcgapi.com/media/static/Card_Images/${item.numero}.jpg`;
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="thumb-placeholder">Sin imagen</div>
                                )}
                                {item.rarity && (
                                  <span className="api-thumb-badge">{item.rarity}</span>
                                )}
                                {juegoActivo === "onepiece" && (
                                  <span className={`api-thumb-badge-arte ${esAA ? "tag-aa" : "tag-normal"}`}>
                                    {esAA ? "AA" : "Base"}
                                  </span>
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
                              {juegoActivo === "onepiece" && (
                                <span className={`tag-rar ${esVersionEspecialOnePiece(cartaSeleccionada) ? "tag-aa" : "tag-normal"}`}>
                                  {esVersionEspecialOnePiece(cartaSeleccionada) ? "✨ Alternate Art (AA)" : "📦 Menor rareza (Normal)"}
                                </span>
                              )}
                            </div>

                            {/* BOTÓN PARA ALTERNAR ENTRE VERSIÓN NORMAL Y AA SI EXISTE LA OTRA VERSIÓN */}
                            {(() => {
                              if (juegoActivo !== "onepiece") return null;
                              const esActAA = esVersionEspecialOnePiece(cartaSeleccionada);
                              const codLimpio = (cartaSeleccionada.codigo || "").split("_")[0];
                              const alternativa = resultadosApi.find(
                                (c) =>
                                  (c.numero === cartaSeleccionada.codigo || (c.numero && codLimpio && c.numero.startsWith(codLimpio))) &&
                                  esVersionEspecialOnePiece(c) !== esActAA
                              );
                              if (!alternativa) return null;
                              return (
                                <button
                                  type="button"
                                  className="btn-switch-preview-arte"
                                  onClick={() => seleccionarCartaApi(alternativa)}
                                  title="Cambiar entre versión Normal y Alternate Art de esta misma carta"
                                >
                                  {esActAA ? "Cambiar a versión Normal" : "Cambiar a versión Alternate Art (AA)"}
                                </button>
                              );
                            })()}

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
                              disabled={guardando}
                              onClick={agregarCartaDesdeApi}
                            >
                              {guardando ? (
                                <>
                                  <Loader2 size={16} className="spinner-icon" /> Guardando en Supabase...
                                </>
                              ) : (
                                <>
                                  <Plus size={16} /> Agregar a mi Colección
                                </>
                              )}
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
                  <button type="submit" className="auth-boton" disabled={guardando}>
                    {guardando ? (
                      <>
                        <Loader2 size={16} className="spinner-icon" /> Guardando...
                      </>
                    ) : (
                      <>
                        <Plus size={16} /> Guardar carta en Supabase
                      </>
                    )}
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
