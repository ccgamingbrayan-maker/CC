import { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Check,
  ShoppingCart,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Share2,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useCart } from "../lib/CartContext.jsx";

// Cache de sets de la API en memoria para no repetir peticiones
const cacheSets = new Map();

// Helper para obtener datos de un set o deck de optcgapi
async function obtenerSetOptcg(setOdeck) {
  if (cacheSets.has(setOdeck)) return cacheSets.get(setOdeck);

  const isDeck = setOdeck.startsWith("ST-");
  const url = isDeck
    ? `https://www.optcgapi.com/api/decks/${setOdeck}/`
    : `https://www.optcgapi.com/api/sets/${setOdeck}/`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) {
      cacheSets.set(setOdeck, data);
      return data;
    }
  } catch (err) {
    console.warn(`No se pudo cargar set ${setOdeck}:`, err);
  }
  return [];
}

// Resuelve la información oficial de una lista de códigos
async function resolverCodigosOnePiece(itemsParseados) {
  // Identificar qué sets/decks están presentes en la lista
  const setsRequeridos = new Set();

  itemsParseados.forEach((item) => {
    const raw = item.codigo.toUpperCase();
    const partes = raw.split("-");
    const prefijo = partes[0] || "";

    if (prefijo.startsWith("OP")) {
      let num = prefijo.replace("OP", "");
      if (num.length === 1) num = "0" + num;
      setsRequeridos.add(`OP-${num}`);
    } else if (prefijo.startsWith("ST")) {
      let num = prefijo.replace("ST", "");
      if (num.length === 1) num = "0" + num;
      setsRequeridos.add(`ST-${num}`);
    } else if (prefijo.startsWith("EB")) {
      let num = prefijo.replace("EB", "");
      if (num.length === 1) num = "0" + num;
      setsRequeridos.add(`EB-${num}`);
    } else if (prefijo.startsWith("PRB")) {
      setsRequeridos.add("PRB-01");
    }
  });

  // Consultar sets en paralelo
  const cartasMap = new Map();
  await Promise.all(
    [...setsRequeridos].map(async (setId) => {
      const cartas = await obtenerSetOptcg(setId);
      cartas.forEach((c) => {
        if (c.card_set_id) cartasMap.set(c.card_set_id.toUpperCase(), c);
        if (c.card_image_id) cartasMap.set(c.card_image_id.toUpperCase(), c);
      });
    })
  );

  // Mapear cada item con sus datos enriquecidos
  return itemsParseados.map((item) => {
    const rawCode = item.codigo.toUpperCase();
    let optcg = cartasMap.get(rawCode);

    if (!optcg) {
      optcg = cartasMap.get(rawCode.replace("-", ""));
    }

    const imagen =
      optcg?.card_image ||
      `https://www.optcgapi.com/media/static/Card_Images/${rawCode}.jpg`;

    return {
      codigo: rawCode,
      cantidad: item.cantidad,
      nombre: optcg?.card_name || rawCode,
      expansion: optcg?.set_name || optcg?.set_id || "One Piece TCG",
      rareza: optcg?.rarity || (optcg?.card_type === "Leader" ? "L" : "C"),
      tipo: optcg?.card_type || "Character",
      color: optcg?.card_color || "",
      imagen,
    };
  });
}

export default function CreadorDecks({ user }) {
  const { agregar } = useCart();
  const [decks, setDecks] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [deckSeleccionado, setDeckSeleccionado] = useState(null);
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);

  // Datos para contrastar
  const [coleccionFisica, setColeccionFisica] = useState([]);
  const [cartasTienda, setCartasTienda] = useState([]);

  // Formulario de creación
  const [nombreDeck, setNombreDeck] = useState("");
  const [textoDecklist, setTextoDecklist] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [filtroDeck, setFiltroDeck] = useState("todas"); // "todas" | "faltantes" | "en_tienda"

  // Cargar coleccion del usuario, productos de la tienda y decks guardados
  useEffect(() => {
    async function inicializar() {
      if (!user?.id) return;
      setCargando(true);

      try {
        // 1. Cargar colección física del usuario
        const { data: colData } = await supabase
          .from("coleccion_usuario")
          .select("*")
          .eq("user_id", user.id);

        const coleccion =
          colData && colData.length > 0
            ? colData
            : user?.user_metadata?.coleccion || [];
        setColeccionFisica(coleccion);

        // 2. Cargar cartas de la tienda para saber stock y precios
        const { data: tiendaData } = await supabase
          .from("cartas")
          .select("id, nombre, imagen, precio, stock, expansion");
        setCartasTienda(tiendaData || []);

        // 3. Cargar decks guardados de Supabase o user_metadata
        const { data: decksData, error: errDecks } = await supabase
          .from("decks_usuario")
          .select("*")
          .eq("user_id", user.id)
          .order("creado_en", { ascending: false });

        if (!errDecks && decksData) {
          setDecks(decksData);
        } else {
          // Fallback a localStorage / metadata
          const localDecks =
            user?.user_metadata?.decks ||
            JSON.parse(localStorage.getItem(`decks_${user.id}`) || "[]");
          setDecks(localDecks);
        }
      } catch (err) {
        console.error("Error inicializando creador de decks:", err);
      } finally {
        setCargando(false);
      }
    }

    inicializar();
  }, [user?.id]);

  // Parsear texto del decklist en items { cantidad, codigo }
  function parsearDecklist(texto) {
    const lineas = texto.split("\n");
    const resultado = [];

    for (const linea of lineas) {
      const match = linea.match(/^\s*(\d+)\s*[xX]?\s*([A-Za-z0-9]+-[A-Za-z0-9]+)/);
      if (match) {
        resultado.push({
          cantidad: parseInt(match[1]) || 1,
          codigo: match[2].trim().toUpperCase(),
        });
      }
    }
    return resultado;
  }

  // Guardar un nuevo deck
  async function handleCrearDeck(e) {
    e.preventDefault();
    if (!nombreDeck.trim() || !textoDecklist.trim()) return;

    setProcesando(true);

    try {
      const parseados = parsearDecklist(textoDecklist);
      if (parseados.length === 0) {
        alert("No se encontraron cartas en el formato válido. Ejemplo: 4xOP08-058");
        setProcesando(false);
        return;
      }

      // Resolver nombres, expansiones e imágenes oficiales
      const cartasResueltas = await resolverCodigosOnePiece(parseados);

      const nuevoDeck = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        user_id: user.id,
        nombre: nombreDeck.trim(),
        cartas: cartasResueltas,
        creado_en: new Date().toISOString(),
      };

      // Guardar en Supabase
      const { data: deckGuardado, error } = await supabase
        .from("decks_usuario")
        .insert([
          {
            user_id: user.id,
            nombre: nuevoDeck.nombre,
            cartas: nuevoDeck.cartas,
          },
        ])
        .select()
        .single();

      const deckFinal = !error && deckGuardado ? deckGuardado : nuevoDeck;
      const nuevosDecks = [deckFinal, ...decks];
      setDecks(nuevosDecks);
      localStorage.setItem(`decks_${user.id}`, JSON.stringify(nuevosDecks));

      // Limpiar formulario y abrir el deck creado
      setNombreDeck("");
      setTextoDecklist("");
      setMostrarModalCrear(false);
      setDeckSeleccionado(deckFinal);
    } catch (err) {
      console.error("Error creando deck:", err);
    } finally {
      setProcesando(false);
    }
  }

  // Eliminar deck
  async function handleEliminarDeck(id) {
    if (!confirm("¿Estás seguro de que deseas eliminar este deck?")) return;
    const nuevos = decks.filter((d) => d.id !== id);
    setDecks(nuevos);
    if (deckSeleccionado?.id === id) setDeckSeleccionado(null);

    await supabase.from("decks_usuario").delete().eq("id", id);
    localStorage.setItem(`decks_${user.id}`, JSON.stringify(nuevos));
  }

  // Copiar decklist al portapapeles
  function copiarDecklist(deck) {
    const lineas = (deck.cartas || []).map((c) => `${c.cantidad}x${c.codigo}`);
    navigator.clipboard.writeText(lineas.join("\n"));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  // Analizar el estado de cada carta en el deck seleccionado
  const analisisDeck = useMemo(() => {
    if (!deckSeleccionado || !deckSeleccionado.cartas) return null;

    let totalNecesarias = 0;
    let totalTienes = 0;
    let totalFaltantes = 0;
    let faltantesDisponiblesTienda = 0;

    const listaAnalizada = deckSeleccionado.cartas.map((item) => {
      totalNecesarias += item.cantidad;

      // 1. Buscar en mi colección física
      const clean = (s) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const codItemClean = clean(item.codigo);
      const nombreItemClean = (item.nombre || "").toLowerCase().trim();

      const enColeccion = coleccionFisica.filter((c) => {
        const codColClean = clean(c.codigo);
        const nombreColClean = (c.nombre || "").toLowerCase().trim();

        const matchCod = codColClean && codItemClean && codColClean === codItemClean;
        const matchNom =
          nombreItemClean.length > 3 &&
          nombreColClean.length > 3 &&
          (nombreColClean === nombreItemClean ||
            nombreColClean.includes(nombreItemClean) ||
            nombreItemClean.includes(nombreColClean));

        return matchCod || matchNom;
      });

      const cantidadEnColeccion = enColeccion.reduce(
        (acc, c) => acc + (c.cantidad || 1),
        0
      );

      const tienes = Math.min(item.cantidad, cantidadEnColeccion);
      const faltan = Math.max(0, item.cantidad - cantidadEnColeccion);

      totalTienes += tienes;
      totalFaltantes += faltan;

      // 2. Buscar si está a la venta en Capsule Corp
      const enTienda = cartasTienda.find((c) => {
        const img = (c.imagen || "").toUpperCase();
        const cod = item.codigo.toUpperCase();
        const nomTienda = (c.nombre || "").toLowerCase().trim();
        const imgClean = clean(img);

        return (
          img.includes(cod) ||
          (codItemClean && imgClean.includes(codItemClean)) ||
          nomTienda.includes(cod.toLowerCase()) ||
          (nombreItemClean.length > 3 && nomTienda.includes(nombreItemClean))
        );
      });

      const tieneStockTienda = enTienda && Number(enTienda.stock || 0) > 0;
      if (faltan > 0 && tieneStockTienda) {
        faltantesDisponiblesTienda += Math.min(faltan, Number(enTienda.stock));
      }

      return {
        ...item,
        tienes,
        faltan,
        completa: faltan === 0,
        enTienda: tieneStockTienda ? enTienda : null,
      };
    });

    const porcentaje =
      totalNecesarias > 0
        ? Math.round((totalTienes / totalNecesarias) * 100)
        : 0;

    return {
      cartas: listaAnalizada,
      totalNecesarias,
      totalTienes,
      totalFaltantes,
      faltantesDisponiblesTienda,
      porcentaje,
    };
  }, [deckSeleccionado, coleccionFisica, cartasTienda]);

  // Cartas filtradas dentro del deck
  const cartasVisiblesDeck = useMemo(() => {
    if (!analisisDeck) return [];
    if (filtroDeck === "faltantes") {
      return analisisDeck.cartas.filter((c) => c.faltan > 0);
    }
    if (filtroDeck === "en_tienda") {
      return analisisDeck.cartas.filter((c) => c.faltan > 0 && c.enTienda);
    }
    return analisisDeck.cartas;
  }, [analisisDeck, filtroDeck]);

  // Agregar todas las cartas faltantes disponibles al carrito de compra
  function comprarTodasFaltantes() {
    if (!analisisDeck) return;
    let agregadas = 0;

    for (const item of analisisDeck.cartas) {
      if (item.faltan > 0 && item.enTienda) {
        agregar({ tipo: "carta", id: item.enTienda.id });
        agregadas++;
      }
    }

    if (agregadas > 0) {
      alert(`¡Se añadieron ${agregadas} cartas faltantes a tu carrito de compras!`);
    }
  }

  if (cargando) {
    return (
      <div className="perfil-panel" style={{ textAlign: "center", padding: "48px 20px" }}>
        <Loader2 size={36} className="spinner-icon" style={{ margin: "0 auto 12px auto", color: "var(--acento, #a855f7)" }} />
        <p style={{ color: "var(--texto-suave, #a1a1aa)" }}>Cargando tus decks y cotejando con tu colección...</p>
      </div>
    );
  }

  return (
    <div className="perfil-panel decks-contenedor">
      {/* VISTA 1: LISTADO DE DECKS GUARDADOS */}
      {!deckSeleccionado ? (
        <>
          <div className="coleccion-header">
            <div>
              <h3 style={{ margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={20} style={{ color: "var(--acento, #a855f7)" }} />
                Creador y Gestor de Decks
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--texto-suave, #a1a1aa)" }}>
                Pega tu decklist para saber qué cartas tienes en tu colección física y cuáles puedes comprar en Capsule Corp.
              </p>
            </div>

            <button
              type="button"
              className="auth-boton coleccion-btn-agregar"
              onClick={() => setMostrarModalCrear(true)}
            >
              <Plus size={16} /> Importar / Crear Deck
            </button>
          </div>

          {/* LISTA DE DECKS */}
          {decks.length === 0 ? (
            <div className="perfil-vacio" style={{ padding: "48px 20px" }}>
              <Layers size={44} style={{ opacity: 0.5, marginBottom: "14px" }} />
              <h4 style={{ margin: "0 0 8px 0", color: "var(--texto, #fff)" }}>
                Aún no has creado ningún Deck
              </h4>
              <p style={{ maxWidth: "440px", margin: "0 auto 24px auto", fontSize: "14px", lineHeight: "1.6" }}>
                Copia y pega la lista de cartas de tu simulador o torneo (ej: <code>4xST34-003</code>) para analizar tu mazo al instante.
              </p>
              <button
                type="button"
                className="auth-boton"
                style={{ margin: "0 auto", display: "inline-flex", alignItems: "center", gap: "8px" }}
                onClick={() => setMostrarModalCrear(true)}
              >
                <Plus size={16} /> Crear mi primer deck
              </button>
            </div>
          ) : (
            <div className="decks-grid">
              {decks.map((deck) => {
                const lider =
                  deck.cartas?.find((c) => c.rareza === "L" || c.tipo === "Leader") ||
                  deck.cartas?.[0];

                const totalCartasDeck = (deck.cartas || []).reduce(
                  (acc, c) => acc + (c.cantidad || 1),
                  0
                );

                return (
                  <div key={deck.id} className="deck-card-item">
                    <div className="deck-card-banner">
                      {lider?.imagen ? (
                        <img src={lider.imagen} alt={deck.nombre} />
                      ) : (
                        <div className="deck-banner-placeholder">
                          <Layers size={28} />
                        </div>
                      )}
                      <div className="deck-card-cant-badge">
                        {totalCartasDeck} cartas
                      </div>
                    </div>

                    <div className="deck-card-content">
                      <h4 className="deck-card-title">{deck.nombre}</h4>
                      <p className="deck-card-fecha">
                        Creado el{" "}
                        {new Date(deck.creado_en).toLocaleDateString("es-CO", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>

                      <div className="deck-card-acciones">
                        <button
                          type="button"
                          className="auth-boton btn-ver-deck"
                          onClick={() => setDeckSeleccionado(deck)}
                        >
                          Ver análisis y cartas <ChevronRight size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-deck-icon"
                          title="Copiar decklist"
                          onClick={() => copiarDecklist(deck)}
                        >
                          {copiado ? <Check size={14} style={{ color: "#10b981" }} /> : <Copy size={14} />}
                        </button>
                        <button
                          type="button"
                          className="btn-deck-icon btn-trash"
                          title="Eliminar deck"
                          onClick={() => handleEliminarDeck(deck.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* VISTA 2: ANÁLISIS DETALLADO DEL DECK SELECCIONADO */
        <div className="deck-detalle-vista">
          {/* BOTÓN VOLVER Y HEADER */}
          <div className="deck-detalle-topbar">
            <button
              type="button"
              className="btn-volver-decks"
              onClick={() => setDeckSeleccionado(null)}
            >
              <ArrowLeft size={16} /> Volver a mis decks
            </button>

            <div className="topbar-acciones">
              <button
                type="button"
                className="btn-accion-top"
                onClick={() => copiarDecklist(deckSeleccionado)}
              >
                {copiado ? <Check size={14} style={{ color: "#10b981" }} /> : <Copy size={14} />}
                {copiado ? "¡Copiado!" : "Copiar Decklist"}
              </button>
              <button
                type="button"
                className="btn-accion-top btn-danger"
                onClick={() => handleEliminarDeck(deckSeleccionado.id)}
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>

          {/* TARJETA DE RESUMEN Y ANÁLISIS DEL DECK */}
          <div className="deck-stats-panel">
            <div className="deck-stats-main">
              <div>
                <span className="deck-tag-onepiece">🏴‍☠️ ONE PIECE TCG</span>
                <h2 className="deck-detalle-nombre">{deckSeleccionado.nombre}</h2>
                <p className="deck-detalle-desc">
                  Comprobando disponibilidad contra tu colección física y el stock de Capsule Corp.
                </p>
              </div>

              {analisisDeck && analisisDeck.faltantesDisponiblesTienda > 0 && (
                <button
                  type="button"
                  className="auth-boton btn-comprar-faltantes"
                  onClick={comprarTodasFaltantes}
                >
                  <ShoppingCart size={16} />
                  Comprar cartas faltantes en Capsule Corp
                </button>
              )}
            </div>

            {/* BARRA DE PROGRESO DE TU COLECCIÓN */}
            {analisisDeck && (
              <div className="deck-progreso-seccion">
                <div className="progreso-header">
                  <span>
                    Completado en tu colección: <strong>{analisisDeck.totalTienes} / {analisisDeck.totalNecesarias} cartas ({analisisDeck.porcentaje}%)</strong>
                  </span>
                  <span>
                    Te faltan: <strong>{analisisDeck.totalFaltantes} cartas</strong>
                  </span>
                </div>
                <div className="progreso-track">
                  <div
                    className="progreso-fill"
                    style={{ width: `${analisisDeck.porcentaje}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* FILTROS INTERNOS DEL DECK */}
          <div className="deck-filtros-bar">
            <div className="deck-tabs-filtro">
              <button
                type="button"
                className={`deck-filtro-btn ${filtroDeck === "todas" ? "active" : ""}`}
                onClick={() => setFiltroDeck("todas")}
              >
                Todas las cartas ({analisisDeck?.cartas.length || 0})
              </button>
              <button
                type="button"
                className={`deck-filtro-btn ${filtroDeck === "faltantes" ? "active" : ""}`}
                onClick={() => setFiltroDeck("faltantes")}
              >
                ⚠️ Las que me faltan ({analisisDeck?.cartas.filter((c) => c.faltan > 0).length || 0})
              </button>
              <button
                type="button"
                className={`deck-filtro-btn ${filtroDeck === "en_tienda" ? "active" : ""}`}
                onClick={() => setFiltroDeck("en_tienda")}
              >
                🟢 Disponibles en Capsule Corp ({analisisDeck?.cartas.filter((c) => c.faltan > 0 && c.enTienda).length || 0})
              </button>
            </div>
          </div>

          {/* LISTADO DE CARTAS DEL DECK */}
          <div className="deck-cards-lista">
            {cartasVisiblesDeck.map((carta) => {
              return (
                <div key={carta.codigo} className="deck-card-row">
                  {/* IMAGEN Y CANTIDAD */}
                  <div className="deck-row-thumb">
                    <img src={carta.imagen} alt={carta.nombre} loading="lazy" />
                    <span className="deck-row-badge-cant">{carta.cantidad}x</span>
                  </div>

                  {/* DATOS DE LA CARTA */}
                  <div className="deck-row-info">
                    <div className="deck-row-title-row">
                      <h4 className="deck-row-nombre">{carta.nombre}</h4>
                      <span className="deck-row-codigo">{carta.codigo}</span>
                    </div>
                    <div className="deck-row-tags">
                      <span className="tag-set">📦 {carta.expansion}</span>
                      {carta.rareza && <span className="tag-rar">⭐ {carta.rareza}</span>}
                    </div>
                  </div>

                  {/* ESTADO EN MI COLECCIÓN PERSONAL */}
                  <div className="deck-row-coleccion-status">
                    <span className="col-status-label">En tu colección:</span>
                    {carta.completa ? (
                      <span className="status-badge status-completa">
                        <CheckCircle2 size={14} /> {carta.tienes} de {carta.cantidad} (Completa)
                      </span>
                    ) : carta.tienes > 0 ? (
                      <span className="status-badge status-parcial">
                        <AlertTriangle size={14} /> Tienes {carta.tienes}/{carta.cantidad} (Te faltan {carta.faltan})
                      </span>
                    ) : (
                      <span className="status-badge status-cero">
                        <XCircle size={14} /> No la tienes (Te faltan {carta.faltan})
                      </span>
                    )}
                  </div>

                  {/* DISPONIBILIDAD EN CAPSULE CORP */}
                  <div className="deck-row-tienda-status">
                    <span className="col-status-label">En Capsule Corp:</span>
                    {carta.enTienda ? (
                      <div className="tienda-disponible-box">
                        <div className="tienda-precio">
                          <span className="precio-val">
                            ${Number(carta.enTienda.precio).toLocaleString("es-CO")} COP
                          </span>
                          <span className="stock-val">Stock: {carta.enTienda.stock}</span>
                        </div>
                        {carta.faltan > 0 && (
                          <button
                            type="button"
                            className="auth-boton btn-comprar-mini"
                            onClick={() => {
                              agregar({ tipo: "carta", id: carta.enTienda.id });
                              alert(`Se añadió ${carta.nombre} al carrito.`);
                            }}
                          >
                            <ShoppingCart size={13} /> Comprar {carta.faltan}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="status-no-tienda">
                        No disponible en tienda
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL PARA IMPORTAR DECKLIST */}
      {mostrarModalCrear && (
        <div className="coleccion-modal-backdrop" onClick={() => setMostrarModalCrear(false)}>
          <div
            className="coleccion-modal-content"
            style={{ maxWidth: "580px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={18} style={{ color: "var(--acento, #a855f7)" }} />
                Importar Decklist de One Piece
              </h3>
              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={() => setMostrarModalCrear(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearDeck} className="modal-form">
              <div className="form-campo">
                <label>Nombre del Deck *</label>
                <input
                  type="text"
                  placeholder="Ej: Katakuri OP08, Luffy Gear 5, Zoro Aggro..."
                  value={nombreDeck}
                  onChange={(e) => setNombreDeck(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-campo">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ margin: 0 }}>
                    Pega tu Decklist *
                    <span className="opcional-hint" style={{ marginLeft: "6px" }}>(1xOP08-058, 4xST34-003...)</span>
                  </label>
                  <button
                    type="button"
                    className="btn-link-ejemplo"
                    onClick={() => {
                      setNombreDeck("Charlotte Pudding / Katakuri OP08");
                      setTextoDecklist(
                        "1xOP08-058\n4xST34-003\n4xOP08-062\n4xOP17-074\n2xST34-002\n4xOP17-113\n2xOP11-106\n4xOP17-104\n3xOP17-107\n4xOP17-109\n4xOP17-103\n4xOP17-114\n4xOP17-112\n3xOP15-077\n4xOP15-078"
                      );
                    }}
                  >
                    ⚡ Cargar deck de ejemplo
                  </button>
                </div>
                <textarea
                  className="decklist-textarea"
                  rows={10}
                  placeholder={`1xOP08-058\n4xST34-003\n4xOP08-062\n4xOP17-074\n2xST34-002\n4xOP17-113\n2xOP11-106\n4xOP17-104\n3xOP17-107\n4xOP17-109\n4xOP17-103\n4xOP17-114\n4xOP17-112\n3xOP15-077\n4xOP15-078`}
                  value={textoDecklist}
                  onChange={(e) => setTextoDecklist(e.target.value)}
                  required
                />
              </div>

              <div className="modal-acciones">
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={() => setMostrarModalCrear(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="auth-boton"
                  disabled={procesando || !nombreDeck.trim() || !textoDecklist.trim()}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  {procesando ? (
                    <>
                      <Loader2 size={16} className="spinner-icon" /> Analizando deck y cartas...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Analizar y Crear Deck
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
