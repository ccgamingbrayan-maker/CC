import { useState, useEffect, useMemo, useRef } from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Check,
  ShoppingCart,
  Layers,
  Search,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  LayoutGrid,
  List,
  Download,
  Image as ImageIcon,
  FileText,
  Edit2,
  Shield,
  Zap,
  Info,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useCart } from "../lib/CartContext.jsx";
import {
  buscarPrintsOnePiece,
  buscarDecksFiltered,
  buscarPromosFiltered,
} from "../lib/onepiece.js";

// Cache de sets de la API en memoria para no repetir peticiones
const cacheSets = new Map();

// Helper para mapear el prefijo de un código al set_id exacto en optcgapi.com
function mapearPrefijoASet(codigo) {
  const pref = (codigo || "").toUpperCase().split("-")[0].trim();
  if (pref === "OP15" || pref === "OP-15") return "OP15-EB04";
  if (pref === "OP14" || pref === "OP-14") return "OP14-EB04";
  if (pref.startsWith("ST")) {
    let num = pref.replace("ST", "");
    if (num.length === 1) num = "0" + num;
    return "ST-" + num;
  }
  if (pref.startsWith("OP")) {
    let num = pref.replace("OP", "");
    if (num.length === 1) num = "0" + num;
    return "OP-" + num;
  }
  if (pref.startsWith("EB")) {
    let num = pref.replace("EB", "");
    if (num.length === 1) num = "0" + num;
    return "EB-" + num;
  }
  if (pref.startsWith("PRB")) {
    let num = pref.replace("PRB", "");
    if (num.length === 1) num = "0" + num;
    return num ? "PRB-" + num : "PRB-01";
  }
  return pref;
}

// Helper para obtener datos de un set o deck de optcgapi
async function obtenerSetOptcg(setOdeck) {
  if (!setOdeck) return [];
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

// Detecta si una carta de la API es versión alternativa / alta rareza (Parallel, Alternate Art, Manga, SP)
function esVersionEspecial(c) {
  if (!c) return false;
  const nom = (c.card_name || c.nombre || "").toUpperCase();
  const img = (c.card_image || c.imagen || "").toUpperCase();
  const id = (c.card_image_id || c.id || "").toUpperCase();
  const rar = (c.rarity || c.rareza || "").toUpperCase();

  return (
    nom.includes("(PARALLEL)") ||
    nom.includes("(ALTERNATE ART)") ||
    nom.includes("(ALT ART)") ||
    nom.includes("(MANGA)") ||
    nom.includes("(SP)") ||
    nom.includes("(SUPER ALTERNATE ART)") ||
    nom.includes("(SUPER LEADER)") ||
    nom.includes("(PANDAMAN ART)") ||
    id.includes("_P") ||
    id.includes("_R") ||
    img.includes("_P") ||
    img.includes("_R") ||
    rar === "SP" ||
    rar === "MANGA"
  );
}

// Limpia el nombre eliminando anotaciones de arte alternativo
function limpiarNombreCarta(nom, codigo) {
  return (nom || codigo || "")
    .replace(/\s*\((PARALLEL|ALTERNATE ART|ALT ART|MANGA|SP|SUPER LEADER|PANDAMAN ART)\)/gi, "")
    .trim();
}

// Resuelve la información oficial agrupando versión Normal (menor rareza) y versión AA
async function resolverCodigosOnePiece(itemsParseados, preferenciaRareza = "normal") {
  const setsRequeridos = new Set();

  itemsParseados.forEach((item) => {
    const s = mapearPrefijoASet(item.codigo);
    if (s) setsRequeridos.add(s);
  });

  // Consultar sets en paralelo
  const cartasPorCodigo = new Map();
  await Promise.all(
    [...setsRequeridos].map(async (setId) => {
      const cartas = await obtenerSetOptcg(setId);
      cartas.forEach((c) => {
        const imageId = (c.card_image_id || "").toUpperCase();
        const setIdStr = (c.card_set_id || "").toUpperCase();
        const baseLimpio = (setIdStr || imageId).replace(/_P\d+.*$/i, "").replace(/_R\d+.*$/i, "");
        const codigos = [baseLimpio, baseLimpio.replace("-", ""), imageId];

        codigos.forEach((cod) => {
          if (!cod) return;
          if (!cartasPorCodigo.has(cod)) {
            cartasPorCodigo.set(cod, { normal: null, aa: null, todas: [] });
          }
          const grupo = cartasPorCodigo.get(cod);
          grupo.todas.push(c);

          const esp = esVersionEspecial(c);
          if (!esp && !grupo.normal) {
            grupo.normal = c;
          } else if (esp && !grupo.aa) {
            grupo.aa = c;
          }
        });
      });
    })
  );

  // Mapear cada item con sus versiones separadas
  return itemsParseados.map((item) => {
    const rawCode = item.codigo.toUpperCase();
    const grupo =
      cartasPorCodigo.get(rawCode) ||
      cartasPorCodigo.get(rawCode.replace("-", ""));

    let normalCard =
      grupo?.normal ||
      (grupo?.todas && grupo.todas.find((c) => !esVersionEspecial(c))) ||
      null;
    let aaCard =
      grupo?.aa ||
      (grupo?.todas && grupo.todas.find(esVersionEspecial)) ||
      null;

    // URL garantizada de la carta base (sin _p)
    const baseImagen = normalCard?.card_image || `https://www.optcgapi.com/media/static/Card_Images/${rawCode}.jpg`;
    const aaImagen = aaCard?.card_image || null;

    // Por default siempre menor rareza (normal/base)
    const imagenFinal = preferenciaRareza === "aa" && aaImagen ? aaImagen : baseImagen;
    const nombreNormal = limpiarNombreCarta(normalCard?.card_name, rawCode);
    const nombreAA = aaCard?.card_name || `${nombreNormal} (Alternate Art)`;
    const nombreFinal = preferenciaRareza === "aa" && aaCard ? nombreAA : nombreNormal;

    return {
      codigo: rawCode,
      cantidad: item.cantidad,
      nombre: nombreFinal,
      expansion: normalCard?.set_name || normalCard?.set_id || "One Piece TCG",
      rareza: normalCard?.rarity || (normalCard?.card_type === "Leader" ? "L" : "C"),
      tipo: normalCard?.card_type || "Character",
      color: normalCard?.card_color || "",
      coste: normalCard?.card_cost || null,
      poder: normalCard?.card_power || null,
      counter: normalCard?.counter_amount || null,
      atributo: normalCard?.attribute || null,
      texto: normalCard?.card_text || "",
      imagen: imagenFinal,
      tieneAA: Boolean(aaCard),
      versiones: {
        normal: {
          nombre: nombreNormal,
          imagen: baseImagen,
          rareza: normalCard?.rarity || "C",
        },
        aa: aaCard
          ? {
              nombre: nombreAA,
              imagen: aaImagen,
              rareza: aaCard.rarity || normalCard?.rarity || "C",
            }
          : null,
      },
    };
  });
}

// Genera un Canvas con el collage visual de cartas faltantes con CORS seguro
async function generarCanvasFaltantes(deck, cartasFaltantes) {
  const padding = 28;
  const cardWidth = 160;
  const cardHeight = 224;
  const gap = 16;
  const cols = Math.min(4, Math.max(2, cartasFaltantes.length));
  const rows = Math.ceil(cartasFaltantes.length / cols);

  const headerHeight = 68;
  const footerHeight = 18;

  const width = padding * 2 + cols * cardWidth + (cols - 1) * gap;
  const height = headerHeight + rows * (cardHeight + 42) + footerHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Cargar imagen de fondo del mapa (con fallback)
  const cargarFondo = () => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        const fallback = new Image();
        fallback.onload = () => resolve(fallback);
        fallback.onerror = () => resolve(null);
        fallback.src = "/img/one-piece-map.jpg";
      };
      img.src = "/img/deck-bg.jpg";
    });
  };

  const cargarImagenCarta = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => {
        const fallback = new Image();
        fallback.onload = () => resolve(fallback);
        fallback.onerror = () => resolve(null);
        fallback.src = url;
      };
      img.src = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=320&output=jpg`;
    });
  };

  const [fondoImg, ...imagenesCargadas] = await Promise.all([
    cargarFondo(),
    ...cartasFaltantes.map((c) => cargarImagenCarta(c.imagenActiva || c.imagen)),
  ]);

  // 1. Fondo base oscuro
  ctx.fillStyle = "#090d16";
  ctx.fillRect(0, 0, width, height);

  // 2. Fondo con textura de mapa One Piece y overlay opaco
  if (fondoImg) {
    const scale = Math.max(width / fondoImg.width, height / fondoImg.height);
    const nw = fondoImg.width * scale;
    const nh = fondoImg.height * scale;
    const nx = (width - nw) / 2;
    const ny = (height - nh) / 2;
    ctx.drawImage(fondoImg, nx, ny, nw, nh);

    // Capa oscura opaca para dar contraste a las cartas
    ctx.fillStyle = "rgba(9, 13, 22, 0.88)";
    ctx.fillRect(0, 0, width, height);
  } else {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(0.5, "#1e1b4b");
    grad.addColorStop(1, "#020617");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // 3. Borde temático dorado refinado
  ctx.strokeStyle = "rgba(212, 175, 55, 0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Cabecera: solo el texto indicado por el usuario
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillText("Busco para compra o cambio Desde Cali", padding, 44);

  // Dibujar cartas en cuadrícula
  for (let i = 0; i < cartasFaltantes.length; i++) {
    const carta = cartasFaltantes[i];
    const img = imagenesCargadas[i];
    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = padding + col * (cardWidth + gap);
    const y = headerHeight + row * (cardHeight + 42);

    // Recorte redondeado para la carta
    ctx.save();
    const radius = 8;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + cardWidth - radius, y);
    ctx.quadraticCurveTo(x + cardWidth, y, x + cardWidth, y + radius);
    ctx.lineTo(x + cardWidth, y + cardHeight - radius);
    ctx.quadraticCurveTo(x + cardWidth, y + cardHeight, x + cardWidth - radius, y + cardHeight);
    ctx.lineTo(x + radius, y + cardHeight);
    ctx.quadraticCurveTo(x, y + cardHeight, x, y + cardHeight - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.clip();

    if (img) {
      ctx.drawImage(img, x, y, cardWidth, cardHeight);
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(x, y, cardWidth, cardHeight);
    }
    ctx.restore();

    // Borde sutil alrededor de la carta
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + cardWidth - radius, y);
    ctx.quadraticCurveTo(x + cardWidth, y, x + cardWidth, y + radius);
    ctx.lineTo(x + cardWidth, y + cardHeight - radius);
    ctx.quadraticCurveTo(x + cardWidth, y + cardHeight, x + cardWidth - radius, y + cardHeight);
    ctx.lineTo(x + radius, y + cardHeight);
    ctx.quadraticCurveTo(x, y + cardHeight, x, y + cardHeight - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Texto al pie de carta (fuera de la imagen, sin tapar la carta)
    // Línea 1: Código a la izquierda y estado de faltantes a la derecha
    ctx.textAlign = "left";
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 12px monospace";
    ctx.fillText(carta.codigo, x, y + cardHeight + 17);

    ctx.textAlign = "right";
    ctx.fillStyle = "#f87171";
    ctx.font = "bold 12px system-ui, sans-serif";
    const txtFalta = carta.faltan === 1 ? "Falta 1" : `Faltan ${carta.faltan}`;
    ctx.fillText(txtFalta, x + cardWidth, y + cardHeight + 17);

    // Línea 2: Nombre de la carta
    ctx.textAlign = "left";
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "11px system-ui, sans-serif";
    const nom = (carta.nombreActivo || carta.nombre).length > 22
      ? (carta.nombreActivo || carta.nombre).slice(0, 21) + "…"
      : (carta.nombreActivo || carta.nombre);
    ctx.fillText(nom, x, y + cardHeight + 32);
  }



  return canvas;
}

export default function CreadorDecks({ user }) {
  const { agregar } = useCart();
  const [decks, setDecks] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [deckSeleccionado, setDeckSeleccionado] = useState(null);
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);

  // Modo de vista: "tablero" (cuadrícula visual tipo TCG) o "lista" (tabla TCGPlayer)
  const [vistaModo, setVistaModo] = useState("tablero");

  // PREFERENCIA DE RAREZA / ARTE: "normal" (menor rareza por default) o "aa" (Alternate Art)
  const [preferenciaRareza, setPreferenciaRareza] = useState("normal");
  // Permite personalizar el arte de cartas específicas { [codigo]: "normal" | "aa" }
  const [artesIndividuales, setArtesIndividuales] = useState({});

  // Inspección de carta individual
  const [cartaInspeccionada, setCartaInspeccionada] = useState(null);

  // Modal para ver y descargar imagen de faltantes
  const [modalFaltantes, setModalFaltantes] = useState(false);
  const [canvasFaltantesUrl, setCanvasFaltantesUrl] = useState(null);
  const [generandoImagen, setGenerandoImagen] = useState(false);
  const canvasRef = useRef(null);

  // Modal para editar nombre del deck
  const [modalEditarNombre, setModalEditarNombre] = useState(false);
  const [nombreEditando, setNombreEditando] = useState("");

  // Estados de copia
  const [copiadoDecklist, setCopiadoDecklist] = useState(false);
  const [copiadoFaltantesTxt, setCopiadoFaltantesTxt] = useState(false);
  const [copiadoFaltantesImg, setCopiadoFaltantesImg] = useState(false);

  // Datos para contrastar
  const [coleccionFisica, setColeccionFisica] = useState([]);
  const [cartasTienda, setCartasTienda] = useState([]);

  // Formulario de creación
  const [nombreDeck, setNombreDeck] = useState("");
  const [textoDecklist, setTextoDecklist] = useState("");
  const [rarezaImport, setRarezaImport] = useState("normal"); // "normal" (default) | "aa"
  const [filtroTipo, setFiltroTipo] = useState("todas"); // "todas" | "Leader" | "Character" | "Event" | "Stage" | "faltantes" | "en_tienda"
  const [busquedaDeck, setBusquedaDeck] = useState("");

  // Modal para buscar y agregar una carta individual al deck
  const [mostrarModalAgregarCarta, setMostrarModalAgregarCarta] = useState(false);
  const [queryCartaDeck, setQueryCartaDeck] = useState("");
  const [rarezaCartaDeck, setRarezaCartaDeck] = useState("normal"); // "normal" | "aa"
  const [resultadosCartaDeck, setResultadosCartaDeck] = useState([]);
  const [buscandoCartaDeck, setBuscandoCartaDeck] = useState(false);
  const [cantidadAgregar, setCantidadAgregar] = useState(1);

  // Cargar coleccion del usuario, productos de la tienda y decks guardados
  useEffect(() => {
    async function inicializar() {
      if (!user?.id) return;
      setCargando(true);

      try {
        const { data: colData } = await supabase
          .from("coleccion_usuario")
          .select("*")
          .eq("user_id", user.id);

        const coleccion =
          colData && colData.length > 0
            ? colData
            : user?.user_metadata?.coleccion || [];
        setColeccionFisica(coleccion);

        const { data: tiendaData } = await supabase
          .from("cartas")
          .select("id, nombre, imagen, precio, stock, expansion");
        setCartasTienda(tiendaData || []);

        const { data: decksData, error: errDecks } = await supabase
          .from("decks_usuario")
          .select("*")
          .eq("user_id", user.id)
          .order("creado_en", { ascending: false });

        if (!errDecks && decksData) {
          setDecks(decksData);
        } else {
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

  // AUTO-REPARACIÓN DE DECKS: Garantiza que cualquier deck antiguo o con imágenes AA en su versión base
  // sea automáticamente corregido con la carta normal oficial de optcgapi
  useEffect(() => {
    if (!deckSeleccionado?.id || !deckSeleccionado.cartas) return;

    let necesitaReparacion = false;
    for (const c of deckSeleccionado.cartas) {
      const tieneAAEnBase =
        (c.versiones?.normal?.imagen && c.versiones.normal.imagen.includes("_p")) ||
        (!c.versiones && c.imagen && c.imagen.includes("_p")) ||
        !c.versiones?.normal?.imagen;
      if (tieneAAEnBase) {
        necesitaReparacion = true;
        break;
      }
    }

    if (necesitaReparacion) {
      async function autoReparar() {
        try {
          const itemsRaw = deckSeleccionado.cartas.map((c) => ({
            codigo: c.codigo,
            cantidad: c.cantidad,
          }));
          const cartasReparadas = await resolverCodigosOnePiece(itemsRaw, "normal");
          const deckReparado = {
            ...deckSeleccionado,
            cartas: cartasReparadas,
          };
          setDeckSeleccionado(deckReparado);
          setDecks((prev) =>
            prev.map((d) => (d.id === deckReparado.id ? deckReparado : d))
          );
          localStorage.setItem(
            `decks_${user.id}`,
            JSON.stringify(
              decks.map((d) => (d.id === deckReparado.id ? deckReparado : d))
            )
          );
          await supabase
            .from("decks_usuario")
            .update({ cartas: cartasReparadas })
            .eq("id", deckReparado.id);
        } catch (err) {
          console.warn("No se pudo auto-reparar el deck:", err);
        }
      }
      autoReparar();
    }
  }, [deckSeleccionado?.id]);

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

  // Guardar un nuevo deck (por defecto siempre en menor rareza)
  async function handleCrearDeck(e) {
    e.preventDefault();
    if (!nombreDeck.trim() || !textoDecklist.trim()) return;

    setProcesando(true);

    try {
      const parseados = parsearDecklist(textoDecklist);
      if (parseados.length === 0) {
        alert("No se encontraron cartas en el formato válido. Ejemplo: 4xST34-003");
        setProcesando(false);
        return;
      }

      // Por default siempre menor rareza "normal"
      const cartasResueltas = await resolverCodigosOnePiece(parseados, rarezaImport);

      const nuevoDeck = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        user_id: user.id,
        nombre: nombreDeck.trim(),
        cartas: cartasResueltas,
        creado_en: new Date().toISOString(),
      };

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

      setNombreDeck("");
      setTextoDecklist("");
      setMostrarModalCrear(false);
      setDeckSeleccionado(deckFinal);
      setPreferenciaRareza(rarezaImport);
      setArtesIndividuales({});
    } catch (err) {
      console.error("Error creando deck:", err);
    } finally {
      setProcesando(false);
    }
  }

  // Guardar edición de nombre del deck
  async function handleGuardarNombreDeck(e) {
    e.preventDefault();
    if (!nombreEditando.trim() || !deckSeleccionado) return;

    const nombreLimpio = nombreEditando.trim();
    const deckActualizado = { ...deckSeleccionado, nombre: nombreLimpio };
    setDeckSeleccionado(deckActualizado);
    setDecks((prev) => prev.map((d) => (d.id === deckSeleccionado.id ? deckActualizado : d)));
    localStorage.setItem(
      `decks_${user.id}`,
      JSON.stringify(decks.map((d) => (d.id === deckSeleccionado.id ? deckActualizado : d)))
    );

    await supabase.from("decks_usuario").update({ nombre: nombreLimpio }).eq("id", deckSeleccionado.id);
    setModalEditarNombre(false);
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

  // Alternar el arte de una carta específica entre Normal y AA
  function toggleArteCarta(codigo) {
    setArtesIndividuales((prev) => {
      const actual = prev[codigo] || preferenciaRareza;
      return {
        ...prev,
        [codigo]: actual === "aa" ? "normal" : "aa",
      };
    });
  }

  // Buscar cartas en la API de One Piece para agregar al deck
  async function handleBuscarCartaParaDeck(e) {
    if (e) e.preventDefault();
    const q = queryCartaDeck.trim();
    if (!q) return;
    setBuscandoCartaDeck(true);
    setResultadosCartaDeck([]);

    try {
      const [sets, decks, promos] = await Promise.all([
        buscarPrintsOnePiece(q).catch(() => []),
        buscarDecksFiltered(q).catch(() => []),
        buscarPromosFiltered(q).catch(() => []),
      ]);

      const combinados = [...sets, ...decks, ...promos];
      const unicos = [];
      const vistos = new Set();
      for (const c of combinados) {
        const key = c.id || c.imagen || `${c.numero}_${c.nombre}`;
        if (key && !vistos.has(key)) {
          vistos.add(key);
          unicos.push(c);
        }
      }

      // Ordenar con menor rareza primero
      unicos.sort((a, b) => {
        const espA = esVersionEspecial(a);
        const espB = esVersionEspecial(b);
        if (espA !== espB) return espA ? 1 : -1;
        return 0;
      });

      setResultadosCartaDeck(unicos);
    } catch (err) {
      console.error("Error buscando carta para deck:", err);
    } finally {
      setBuscandoCartaDeck(false);
    }
  }

  // Agregar carta seleccionada de la búsqueda al deck
  async function handleAgregarCartaADeck(carta) {
    if (!deckSeleccionado) return;
    const rawCode = (carta.numero || carta.id || "")
      .toUpperCase()
      .replace(/_P\d+.*$/i, "")
      .replace(/_R\d+.*$/i, "");
    if (!rawCode) return;

    const esEsp = esVersionEspecial(carta);
    const cantidad = Math.max(1, parseInt(cantidadAgregar) || 1);

    const baseImg = (carta.imagen && !carta.imagen.includes("_p"))
      ? carta.imagen
      : `https://www.optcgapi.com/media/static/Card_Images/${rawCode}.jpg`;

    const cartasActuales = [...(deckSeleccionado.cartas || [])];
    const indexExistente = cartasActuales.findIndex((c) => c.codigo.toUpperCase() === rawCode);

    if (indexExistente >= 0) {
      cartasActuales[indexExistente] = {
        ...cartasActuales[indexExistente],
        cantidad: cartasActuales[indexExistente].cantidad + cantidad,
      };
    } else {
      const nueva = {
        codigo: rawCode,
        cantidad,
        nombre: limpiarNombreCarta(carta.nombre, rawCode),
        expansion: carta.set || "One Piece TCG",
        rareza: carta.rarity || "C",
        tipo: carta.tipo || "Character",
        color: carta.color || "",
        imagen: rarezaCartaDeck === "aa" && esEsp ? carta.imagen : baseImg,
        tieneAA: esEsp,
        versiones: {
          normal: {
            nombre: limpiarNombreCarta(carta.nombre, rawCode),
            imagen: baseImg,
            rareza: carta.rarity || "C",
          },
          aa: esEsp
            ? {
                nombre: carta.nombre || `${rawCode} (Alternate Art)`,
                imagen: carta.imagen,
                rareza: carta.rarity || "C",
              }
            : null,
        },
      };
      cartasActuales.push(nueva);
    }

    const deckActualizado = {
      ...deckSeleccionado,
      cartas: cartasActuales,
    };

    setDeckSeleccionado(deckActualizado);
    setDecks((prev) => prev.map((d) => (d.id === deckSeleccionado.id ? deckActualizado : d)));
    localStorage.setItem(
      `decks_${user.id}`,
      JSON.stringify(decks.map((d) => (d.id === deckSeleccionado.id ? deckActualizado : d)))
    );

    await supabase.from("decks_usuario").update({ cartas: cartasActuales }).eq("id", deckSeleccionado.id);

    setMostrarModalAgregarCarta(false);
    setQueryCartaDeck("");
    setResultadosCartaDeck([]);
  }

  // Copiar decklist completo
  function copiarDecklist(deck) {
    const lineas = (deck.cartas || []).map((c) => `${c.cantidad}x${c.codigo}`);
    navigator.clipboard.writeText(lineas.join("\n"));
    setCopiadoDecklist(true);
    setTimeout(() => setCopiadoDecklist(false), 2000);
  }

  // Analizar el estado de cada carta en el deck seleccionado respetando el arte seleccionado
  const analisisDeck = useMemo(() => {
    if (!deckSeleccionado || !deckSeleccionado.cartas) return null;

    let totalNecesarias = 0;
    let totalTienes = 0;
    let totalFaltantes = 0;
    let faltantesDisponiblesTienda = 0;
    let costoTotalFaltantesTienda = 0;

    let cantLider = 0;
    let cantPersonajes = 0;
    let cantEventos = 0;
    let cantEscenarios = 0;

    const clean = (s) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

    const listaAnalizada = deckSeleccionado.cartas.map((item) => {
      totalNecesarias += item.cantidad;

      const tipoUpper = (item.tipo || "").toUpperCase();
      if (tipoUpper === "LEADER" || item.rareza === "L") {
        cantLider += item.cantidad;
      } else if (tipoUpper === "EVENT") {
        cantEventos += item.cantidad;
      } else if (tipoUpper === "STAGE") {
        cantEscenarios += item.cantidad;
      } else {
        cantPersonajes += item.cantidad;
      }

      // Determinar si esta carta se está visualizando en Normal (menor rareza) o en AA
      const modoCarta = artesIndividuales[item.codigo] || preferenciaRareza;
      const tieneAAReal = Boolean(item.versiones?.aa?.imagen) || Boolean(item.tieneAA);
      const esAA = modoCarta === "aa" && tieneAAReal;

      // IMAGEN BASE 100% GARANTIZADA: NUNCA contiene _p
      let imagenNormal = item.versiones?.normal?.imagen;
      if (!imagenNormal || imagenNormal.includes("_p")) {
        imagenNormal = `https://www.optcgapi.com/media/static/Card_Images/${item.codigo}.jpg`;
      }

      const imagenAA = item.versiones?.aa?.imagen || null;
      const imagenActiva = esAA && imagenAA ? imagenAA : imagenNormal;
      const nombreActivo = esAA && item.versiones?.aa?.nombre ? item.versiones.aa.nombre : (item.versiones?.normal?.nombre || item.nombre);
      const rarezaActiva = esAA
        ? (item.versiones?.aa?.rareza || item.rareza)
        : (item.versiones?.normal?.rareza || item.rareza || "C");

      // 1. Buscar en mi colección física
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

      // 2. Buscar en tienda con COTEJO RIGUROSO de código, tipo y rareza
      const isItemDon =
        (item.tipo || "").toUpperCase().includes("DON") ||
        item.codigo.toUpperCase().startsWith("DON");
      const cleanCode = clean(item.codigo);
      const rawCode = item.codigo.toUpperCase();
      const itemNum = rawCode.split("-")[1];

      const enTienda = cartasTienda.find((c) => {
        if (Number(c.stock || 0) <= 0) return false;

        const nomTienda = (c.nombre || "").toUpperCase();
        const imgTienda = (c.imagen || "").toUpperCase();
        const isStoreDon =
          nomTienda.includes("DON!!") ||
          nomTienda.includes("DON CARD") ||
          imgTienda.includes("DON_CARD");

        // Si uno es DON y el otro no, NUNCA coinciden
        if (isItemDon !== isStoreDon) return false;

        const isStoreAA =
          nomTienda.includes("(PARALLEL)") ||
          nomTienda.includes("(ALTERNATE ART)") ||
          nomTienda.includes("(MANGA)") ||
          nomTienda.includes("(SP)") ||
          imgTienda.includes("_P1") ||
          imgTienda.includes("_P2");

        // Coincidencia exacta por código completo
        const matchPorCodigo =
          imgTienda.includes(rawCode) ||
          (cleanCode && clean(imgTienda).includes(cleanCode)) ||
          nomTienda.includes(rawCode) ||
          (cleanCode && clean(nomTienda).includes(cleanCode));

        // Coincidencia por número de set específico (ej: Boa Hancock (051) con OP07-051)
        let matchPorNumero = false;
        if (itemNum && itemNum.length >= 3) {
          const itemNomClean = clean(item.nombre);
          const nomStoreClean = clean(nomTienda);
          if (
            itemNomClean.length > 3 &&
            nomStoreClean.includes(itemNomClean) &&
            (nomTienda.includes(`(${itemNum})`) || imgTienda.includes(itemNum))
          ) {
            matchPorNumero = true;
          }
        }

        if (matchPorCodigo || matchPorNumero) {
          if (!esAA && isStoreAA) {
            const hayNormalEnTienda = cartasTienda.some(
              (o) =>
                (clean(o.imagen || "").includes(cleanCode) || clean(o.nombre || "").includes(cleanCode)) &&
                !clean(o.nombre || "").includes("PARALLEL") &&
                !clean(o.nombre || "").includes("MANGA") &&
                !clean(o.nombre || "").includes("ALTERNATE") &&
                Number(o.stock || 0) > 0
            );
            return !hayNormalEnTienda;
          }
          return true;
        }

        return false;
      });

      const tieneStockTienda = enTienda && Number(enTienda.stock || 0) > 0;
      if (faltan > 0 && tieneStockTienda) {
        const copiasComprables = Math.min(faltan, Number(enTienda.stock));
        faltantesDisponiblesTienda += copiasComprables;
        costoTotalFaltantesTienda += copiasComprables * Number(enTienda.precio || 0);
      }

      return {
        ...item,
        tienes,
        faltan,
        completa: faltan === 0,
        enTienda: tieneStockTienda ? enTienda : null,
        imagenActiva,
        nombreActivo,
        rarezaActiva,
        tieneAA: tieneAAReal,
        esAA,
      };
    });

    const porcentaje =
      totalNecesarias > 0
        ? Math.round((totalTienes / totalNecesarias) * 100)
        : 0;

    // Identificar Líder del Deck
    const lider =
      listaAnalizada.find((c) => (c.tipo || "").toUpperCase() === "LEADER" || c.rareza === "L") ||
      listaAnalizada[0] ||
      null;

    return {
      cartas: listaAnalizada,
      lider,
      totalNecesarias,
      totalTienes,
      totalFaltantes,
      faltantesDisponiblesTienda,
      costoTotalFaltantesTienda,
      porcentaje,
      desglose: {
        cantLider,
        cantPersonajes,
        cantEventos,
        cantEscenarios,
      },
    };
  }, [deckSeleccionado, coleccionFisica, cartasTienda, preferenciaRareza, artesIndividuales]);

  // Cartas filtradas dentro del deck (por tipo / estado y por búsqueda)
  const cartasVisiblesDeck = useMemo(() => {
    if (!analisisDeck) return [];
    let list = analisisDeck.cartas;

    if (filtroTipo === "Leader") {
      list = list.filter((c) => (c.tipo || "").toUpperCase() === "LEADER" || c.rareza === "L");
    } else if (filtroTipo === "Character") {
      list = list.filter((c) => (c.tipo || "").toUpperCase() === "CHARACTER");
    } else if (filtroTipo === "Event") {
      list = list.filter((c) => (c.tipo || "").toUpperCase() === "EVENT");
    } else if (filtroTipo === "Stage") {
      list = list.filter((c) => (c.tipo || "").toUpperCase() === "STAGE");
    } else if (filtroTipo === "faltantes") {
      list = list.filter((c) => c.faltan > 0);
    } else if (filtroTipo === "en_tienda") {
      list = list.filter((c) => c.faltan > 0 && c.enTienda);
    }

    if (busquedaDeck.trim()) {
      const q = busquedaDeck.toLowerCase().trim();
      list = list.filter(
        (c) =>
          (c.codigo || "").toLowerCase().includes(q) ||
          (c.nombreActivo || c.nombre || "").toLowerCase().includes(q) ||
          (c.expansion || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [analisisDeck, filtroTipo, busquedaDeck]);

  // Agrupamiento por categorías para la vista de Lista estilo TCGPlayer
  const gruposListaTCG = useMemo(() => {
    if (!cartasVisiblesDeck) return [];
    const grupos = [
      {
        id: "Leader",
        titulo: "Líder",
        icono: "👑",
        items: cartasVisiblesDeck.filter((c) => (c.tipo || "").toUpperCase() === "LEADER" || c.rareza === "L"),
      },
      {
        id: "Character",
        titulo: "Personajes",
        icono: "⚔️",
        items: cartasVisiblesDeck.filter((c) => (c.tipo || "").toUpperCase() === "CHARACTER"),
      },
      {
        id: "Event",
        titulo: "Eventos",
        icono: "⚡",
        items: cartasVisiblesDeck.filter((c) => (c.tipo || "").toUpperCase() === "EVENT"),
      },
      {
        id: "Stage",
        titulo: "Escenarios",
        icono: "🏟️",
        items: cartasVisiblesDeck.filter((c) => (c.tipo || "").toUpperCase() === "STAGE"),
      },
    ];
    return grupos.filter((g) => g.items.length > 0);
  }, [cartasVisiblesDeck]);

  // Lista de cartas faltantes para el generador de imagen
  const cartasFaltantes = useMemo(() => {
    if (!analisisDeck) return [];
    return analisisDeck.cartas.filter((c) => c.faltan > 0);
  }, [analisisDeck]);

  // Abrir modal y generar imagen de faltantes
  async function handleAbrirModalFaltantes() {
    if (!deckSeleccionado || cartasFaltantes.length === 0) {
      alert("¡Felicidades! Ya tienes todas las cartas de este deck en tu colección.");
      return;
    }

    setModalFaltantes(true);
    setGenerandoImagen(true);
    setCanvasFaltantesUrl(null);

    try {
      const canvas = await generarCanvasFaltantes(deckSeleccionado, cartasFaltantes);
      canvasRef.current = canvas;
      setCanvasFaltantesUrl(canvas.toDataURL("image/png"));
    } catch (err) {
      console.error("Error generando imagen de faltantes:", err);
      alert("Ocurrió un error al generar la imagen. Puedes copiar la lista en texto.");
    } finally {
      setGenerandoImagen(false);
    }
  }

  // Descargar imagen generada
  function handleDescargarImagen() {
    if (!canvasRef.current || !canvasFaltantesUrl) return;
    const a = document.createElement("a");
    a.download = `faltantes-${(deckSeleccionado?.nombre || "deck").toLowerCase().replace(/[^a-z0-9]/g, "-")}.png`;
    a.href = canvasFaltantesUrl;
    a.click();
  }

  // Copiar imagen al portapapeles
  async function handleCopiarImagen() {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopiadoFaltantesImg(true);
        setTimeout(() => setCopiadoFaltantesImg(false), 2500);
      });
    } catch (err) {
      console.warn("Navegador no soporta escribir imagen a portapapeles:", err);
      handleDescargarImagen();
    }
  }

  // Copiar lista de faltantes en formato texto
  function handleCopiarTextoFaltantes() {
    if (cartasFaltantes.length === 0) return;
    const lineas = cartasFaltantes.map(
      (c) => `${c.faltan}x ${c.codigo} - ${c.nombreActivo || c.nombre} (${c.expansion})`
    );
    const texto = `Cartas que me faltan para: ${deckSeleccionado?.nombre}\n\n${lineas.join("\n")}\n\nCapsule Corp Gaming (www.onepiececc.shop)`;
    navigator.clipboard.writeText(texto);
    setCopiadoFaltantesTxt(true);
    setTimeout(() => setCopiadoFaltantesTxt(false), 2000);
  }

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
      <div className="perfil-panel" style={{ textAlign: "center", padding: "60px 20px" }}>
        <Loader2 size={36} className="spinner-icon" style={{ margin: "0 auto 12px auto", color: "var(--acento)" }} />
        <h4 style={{ margin: "0 0 6px 0", color: "var(--texto)" }}>Cargando Decks</h4>
        <p style={{ color: "var(--texto-suave)", fontSize: "14px" }}>
          Un momento por favor...
        </p>
      </div>
    );
  }

  return (
    <div className="perfil-panel decks-contenedor tcg-deckbuilder-root">
      {/* VISTA 1: LISTADO DE DECKS GUARDADOS */}
      {!deckSeleccionado ? (
        <>
          <div className="tcg-header-bar">
            <div>
              <h2 className="tcg-page-title">
                Mis Decks
              </h2>
              <p className="tcg-page-desc">
                Gestiona tus mazos y consulta cartas faltantes para tu colección física.
              </p>
            </div>

            <button
              type="button"
              className="tcg-btn-primary"
              onClick={() => setMostrarModalCrear(true)}
            >
              <Plus size={16} /> Nuevo Deck
            </button>
          </div>

          {/* LISTA DE DECKS */}
          {decks.length === 0 ? (
            <div className="tcg-empty-state">
              <Layers size={48} className="tcg-empty-icon" />
              <h4>Aún no has registrado ningún deck</h4>
              <p>
                Importa una lista de cartas (ej: <code>4xST34-003</code>) para gestionar tu mazo y verificar faltantes con tu colección.
              </p>
              <button
                type="button"
                className="tcg-btn-primary"
                onClick={() => setMostrarModalCrear(true)}
              >
                <Plus size={16} /> Importar Deck
              </button>
            </div>
          ) : (
            <div className="tcg-decks-showcase-grid">
              {decks.map((deck) => {
                const lider =
                  deck.cartas?.find((c) => c.rareza === "L" || c.tipo === "Leader") ||
                  deck.cartas?.[0];

                const totalCartasDeck = (deck.cartas || []).reduce(
                  (acc, c) => acc + (c.cantidad || 1),
                  0
                );

                const liderImg = lider?.versiones?.normal?.imagen || lider?.imagen;

                return (
                  <div key={deck.id} className="tcg-deck-item-card">
                    <div className="tcg-deck-banner-wrap">
                      {liderImg ? (
                        <img src={liderImg} alt={deck.nombre} className="tcg-deck-banner-img" />
                      ) : (
                        <div className="tcg-deck-banner-empty">
                          <Layers size={32} />
                        </div>
                      )}
                      <div className="tcg-deck-chip-total">
                        {totalCartasDeck} cartas
                      </div>
                      {lider && (
                        <div className="tcg-deck-chip-lider">
                          {lider.nombre || "Líder"}
                        </div>
                      )}
                    </div>

                    <div className="tcg-deck-item-content">
                      <h4 className="tcg-deck-item-title" title={deck.nombre}>
                        {deck.nombre}
                      </h4>
                      <p className="tcg-deck-item-date">
                        Creado el{" "}
                        {new Date(deck.creado_en).toLocaleDateString("es-CO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>

                      <div className="tcg-deck-item-actions">
                        <button
                          type="button"
                          className="tcg-btn-view-deck"
                          onClick={() => {
                            setDeckSeleccionado(deck);
                            setPreferenciaRareza("normal");
                            setArtesIndividuales({});
                            setFiltroTipo("todas");
                            setBusquedaDeck("");
                          }}
                        >
                          Ver mazo <ChevronRight size={14} />
                        </button>
                        <button
                          type="button"
                          className="tcg-btn-action-icon"
                          title="Copiar decklist"
                          onClick={() => copiarDecklist(deck)}
                        >
                          {copiadoDecklist ? <Check size={15} style={{ color: "#10b981" }} /> : <Copy size={15} />}
                        </button>
                        <button
                          type="button"
                          className="tcg-btn-action-icon tcg-btn-delete"
                          title="Eliminar deck"
                          onClick={() => handleEliminarDeck(deck.id)}
                        >
                          <Trash2 size={15} />
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
        /* ========================================================
            VISTA 2: SPOTLIGHT & ANÁLISIS DETALLADO ESTILO TCGPLAYER
            ======================================================== */
        <div className="tcg-deck-detail-container">
          {/* BARRA SUPERIOR DE ACCIONES */}
          <div className="tcg-top-nav-bar">
            <button
              type="button"
              className="tcg-btn-back"
              onClick={() => setDeckSeleccionado(null)}
            >
              <ArrowLeft size={16} /> Volver a mis decks
            </button>

            <div className="tcg-top-actions-cluster">
              <button
                type="button"
                className="tcg-action-btn tcg-btn-add-card"
                title="Buscar y agregar una carta a este deck"
                onClick={() => {
                  setMostrarModalAgregarCarta(true);
                  setQueryCartaDeck("");
                  setResultadosCartaDeck([]);
                  setRarezaCartaDeck("normal");
                  setCantidadAgregar(1);
                }}
              >
                <Plus size={15} /> Agregar Carta
              </button>

              <button
                type="button"
                className="tcg-action-btn tcg-btn-share-missing"
                title="Generar imagen para compartir en redes o WhatsApp"
                onClick={handleAbrirModalFaltantes}
              >
                <ImageIcon size={15} /> Imagen de Faltantes
              </button>

              <button
                type="button"
                className="tcg-action-btn"
                onClick={() => copiarDecklist(deckSeleccionado)}
              >
                {copiadoDecklist ? <Check size={15} style={{ color: "#10b981" }} /> : <Copy size={15} />}
                {copiadoDecklist ? "¡Copiado!" : "Copiar Decklist"}
              </button>

              <button
                type="button"
                className="tcg-action-btn tcg-btn-danger"
                onClick={() => handleEliminarDeck(deckSeleccionado.id)}
              >
                <Trash2 size={15} /> Eliminar
              </button>
            </div>
          </div>

          {/* ========================================================
              TCGPLAYER HERO DECK SPOTLIGHT
              ======================================================== */}
          <div className="tcgplayer-hero-card">
            {/* LÍDER SPOTLIGHT FRAME A LA IZQUIERDA */}
            <div className="tcg-leader-frame">
              {analisisDeck?.lider ? (
                <div
                  className="tcg-leader-card-wrapper"
                  onClick={() => setCartaInspeccionada(analisisDeck.lider)}
                  title="Clic para inspeccionar Líder"
                >
                  <img
                    src={analisisDeck.lider.imagenActiva || analisisDeck.lider.imagen}
                    alt={analisisDeck.lider.nombre}
                    className="tcg-leader-img"
                  />
                  <div className="tcg-leader-ribbon">
                    LÍDER
                  </div>
                  {analisisDeck.lider.poder && (
                    <div className="tcg-leader-stats-badge">
                      {analisisDeck.lider.poder}
                    </div>
                  )}
                </div>
              ) : (
                <div className="tcg-leader-placeholder">
                  <Shield size={36} />
                  <span>Sin Líder</span>
                </div>
              )}
            </div>

            {/* DETALLES DEL DECK Y ESTADÍSTICAS */}
            <div className="tcg-deck-hero-body">
              <div className="tcg-deck-title-row">
                <div className="tcg-format-tag">
                  ONE PIECE CARD GAME
                </div>
                <div className="tcg-deck-title-group">
                  <h1 className="tcg-deck-main-title">{deckSeleccionado.nombre}</h1>
                  <button
                    type="button"
                    className="tcg-btn-rename-deck"
                    title="Editar nombre del deck"
                    onClick={() => {
                      setNombreEditando(deckSeleccionado.nombre);
                      setModalEditarNombre(true);
                    }}
                  >
                    <Edit2 size={15} />
                  </button>
                </div>
              </div>

              {/* STATS BREAKDOWN CHIPS (TCGPLAYER STYLE) */}
              <div className="tcg-stats-chips-bar">
                <div className="tcg-stat-chip chip-total">
                  <span className="chip-label">Total</span>
                  <span className="chip-num">{analisisDeck?.totalNecesarias || 0} cartas</span>
                </div>
                <div className="tcg-stat-chip chip-leader">
                  <span className="chip-label">Líder</span>
                  <span className="chip-num">{analisisDeck?.desglose.cantLider || 0}</span>
                </div>
                <div className="tcg-stat-chip chip-character">
                  <span className="chip-label">Personajes</span>
                  <span className="chip-num">{analisisDeck?.desglose.cantPersonajes || 0}</span>
                </div>
                <div className="tcg-stat-chip chip-event">
                  <span className="chip-label">Eventos</span>
                  <span className="chip-num">{analisisDeck?.desglose.cantEventos || 0}</span>
                </div>
                {analisisDeck?.desglose.cantEscenarios > 0 && (
                  <div className="tcg-stat-chip chip-stage">
                    <span className="chip-label">Escenarios</span>
                    <span className="chip-num">{analisisDeck?.desglose.cantEscenarios}</span>
                  </div>
                )}
              </div>

              {/* BARRA DE PROGRESO DE COLECCIÓN FÍSICA */}
              <div className="tcg-collection-progress-card">
                <div className="tcg-progress-labels">
                  <span className="tcg-progress-status">
                    Colección física: <strong>{analisisDeck?.totalTienes || 0} / {analisisDeck?.totalNecesarias || 0} ({analisisDeck?.porcentaje || 0}%)</strong>
                  </span>
                  <span className="tcg-missing-count">
                    {analisisDeck?.totalFaltantes === 0 ? (
                      <span className="text-all-ready">Deck completo en tu colección</span>
                    ) : (
                      <span>Faltan: <strong>{analisisDeck?.totalFaltantes} cartas</strong></span>
                    )}
                  </span>
                </div>

                <div className="tcg-progress-rail">
                  <div
                    className="tcg-progress-fill"
                    style={{ width: `${analisisDeck?.porcentaje || 0}%` }}
                  />
                </div>
              </div>

              {/* BOTÓN DE COMPRA EN TIENDA */}
              {analisisDeck && analisisDeck.faltantesDisponiblesTienda > 0 && (
                <div className="tcg-store-quick-buy-box">
                  <div className="store-buy-info">
                    <ShoppingCart size={18} className="store-buy-icon" />
                    <div>
                      <div className="store-buy-title">
                        {analisisDeck.faltantesDisponiblesTienda} cartas faltantes disponibles en tienda
                      </div>
                      <div className="store-buy-price">
                        Total: ${analisisDeck.costoTotalFaltantesTienda.toLocaleString("es-CO")} COP
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="tcg-btn-cart-buy-all"
                    onClick={comprarTodasFaltantes}
                  >
                    <ShoppingCart size={16} /> Comprar Faltantes
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* BARRA DE HERRAMIENTAS Y CONTROLES */}
          <div className="tcg-controls-bar">
            {/* TABS DE FILTRO POR TIPO / ESTADO */}
            <div className="tcg-filter-tabs">
              <button
                type="button"
                className={`tcg-filter-pill ${filtroTipo === "todas" ? "active" : ""}`}
                onClick={() => setFiltroTipo("todas")}
              >
                Todas ({analisisDeck?.cartas.length || 0})
              </button>
              <button
                type="button"
                className={`tcg-filter-pill ${filtroTipo === "Leader" ? "active" : ""}`}
                onClick={() => setFiltroTipo("Leader")}
              >
                Líder ({analisisDeck?.cartas.filter((c) => (c.tipo || "").toUpperCase() === "LEADER" || c.rareza === "L").length || 0})
              </button>
              <button
                type="button"
                className={`tcg-filter-pill ${filtroTipo === "Character" ? "active" : ""}`}
                onClick={() => setFiltroTipo("Character")}
              >
                Personajes ({analisisDeck?.cartas.filter((c) => (c.tipo || "").toUpperCase() === "CHARACTER").length || 0})
              </button>
              <button
                type="button"
                className={`tcg-filter-pill ${filtroTipo === "Event" ? "active" : ""}`}
                onClick={() => setFiltroTipo("Event")}
              >
                Eventos ({analisisDeck?.cartas.filter((c) => (c.tipo || "").toUpperCase() === "EVENT").length || 0})
              </button>
              <button
                type="button"
                className={`tcg-filter-pill pill-alert ${filtroTipo === "faltantes" ? "active" : ""}`}
                onClick={() => setFiltroTipo("faltantes")}
              >
                Faltantes ({analisisDeck?.cartas.filter((c) => c.faltan > 0).length || 0})
              </button>
              <button
                type="button"
                className={`tcg-filter-pill pill-store ${filtroTipo === "en_tienda" ? "active" : ""}`}
                onClick={() => setFiltroTipo("en_tienda")}
              >
                En Tienda ({analisisDeck?.cartas.filter((c) => c.faltan > 0 && c.enTienda).length || 0})
              </button>
            </div>

            {/* CONTROL SEGMENTADO DE RAREZA / ARTE */}
            <div className="tcg-rarity-segmented-control">
              <span className="rarity-control-title">Arte:</span>
              <button
                type="button"
                className={`tcg-segmented-btn ${preferenciaRareza === "normal" ? "active" : ""}`}
                onClick={() => {
                  setPreferenciaRareza("normal");
                  setArtesIndividuales({});
                }}
                title="Versión base / menor rareza"
              >
                Versión Base (Normal)
              </button>
              <button
                type="button"
                className={`tcg-segmented-btn ${preferenciaRareza === "aa" ? "active" : ""}`}
                onClick={() => {
                  setPreferenciaRareza("aa");
                  setArtesIndividuales({});
                }}
                title="Versión Alternate Art (AA)"
              >
                Alternate Art (AA)
              </button>
            </div>

            {/* BÚSQUEDA EN TIEMPO REAL */}
            <div className="tcg-search-box-wrap">
              <Search size={15} className="tcg-search-icon" />
              <input
                type="text"
                placeholder="Filtrar en este mazo..."
                value={busquedaDeck}
                onChange={(e) => setBusquedaDeck(e.target.value)}
              />
              {busquedaDeck && (
                <button
                  type="button"
                  className="tcg-btn-clear-search"
                  onClick={() => setBusquedaDeck("")}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* SELECTOR ENTRE TABLERO VISUAL Y LISTA DETALLADA */}
            <div className="tcg-view-switcher">
              <button
                type="button"
                className={`tcg-view-btn ${vistaModo === "tablero" ? "active" : ""}`}
                onClick={() => setVistaModo("tablero")}
                title="Tablero visual con proporciones de juego"
              >
                <LayoutGrid size={15} /> Tablero
              </button>
              <button
                type="button"
                className={`tcg-view-btn ${vistaModo === "lista" ? "active" : ""}`}
                onClick={() => setVistaModo("lista")}
                title="Tabla detallada estilo TCGPlayer"
              >
                <List size={15} /> Lista
              </button>
            </div>
          </div>

          {/* ========================================================
              VISTA 1: TABLERO VISUAL TCGPLAYER (GRID HIGH-END)
              ======================================================== */}
          {vistaModo === "tablero" ? (
            <div className="tcgplayer-visual-board">
              <div className="tcgplayer-cards-grid">
                {cartasVisiblesDeck.map((carta) => {
                  return (
                    <div
                      key={carta.codigo}
                      className="tcgplayer-card-card"
                      onClick={() => setCartaInspeccionada(carta)}
                    >
                      {/* CONTENEDOR DE LA IMAGEN DE CARTA */}
                      <div className="tcg-card-media-wrapper">
                        <img
                          src={carta.imagenActiva || carta.imagen}
                          alt={carta.nombreActivo || carta.nombre}
                          loading="lazy"
                          className="tcg-card-asset"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://www.optcgapi.com/media/static/Card_Images/${carta.codigo}.jpg`;
                          }}
                        />

                        {/* BADGE DE COLECCIÓN EN ESQUINA SUPERIOR IZQUIERDA */}
                        <div className="tcg-card-badge-topleft">
                          {carta.completa ? (
                            <span className="tcg-pill-col pill-done" title={`Tienes ${carta.tienes} de ${carta.cantidad} copias`}>
                              <CheckCircle2 size={12} /> {carta.tienes}/{carta.cantidad}
                            </span>
                          ) : carta.tienes > 0 ? (
                            <span className="tcg-pill-col pill-warn" title={`Tienes ${carta.tienes} de ${carta.cantidad} copias (faltan ${carta.faltan})`}>
                              <AlertTriangle size={12} /> {carta.tienes}/{carta.cantidad}
                            </span>
                          ) : (
                            <span className="tcg-pill-col pill-empty" title={`No la tienes (faltan ${carta.faltan})`}>
                              <XCircle size={12} /> 0/{carta.cantidad}
                            </span>
                          )}
                        </div>

                        {/* BADGE DE TIENDA EN ESQUINA SUPERIOR DERECHA */}
                        {carta.enTienda && (
                          <div className="tcg-card-badge-topright">
                            <span className="tcg-pill-store-stock" title="Disponible en Capsule Corp">
                              <ShoppingCart size={11} /> Tienda
                            </span>
                          </div>
                        )}

                        {/* BADGE TOGGLE ARTE EN PARTE INFERIOR DERECHA SOBRE LA CARTA */}
                        {carta.tieneAA && (
                          <div className="tcg-card-badge-aa-toggle">
                            <button
                              type="button"
                              className={`tcg-mini-toggle-aa ${carta.esAA ? "is-aa" : "is-normal"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleArteCarta(carta.codigo);
                              }}
                              title={carta.esAA ? "Viendo Alternate Art. Clic para cambiar a Normal" : "Viendo Normal. Clic para cambiar a Alternate Art (AA)"}
                            >
                              {carta.esAA ? "✨ AA" : "📦 Base"}
                            </button>
                          </div>
                        )}

                        {/* CONTADOR DE CANTIDAD (x4 / x1) INFERIOR IZQUIERDA */}
                        <div className="tcg-card-badge-count">
                          {carta.cantidad}x
                        </div>
                      </div>

                      {/* PIE DE TARJETA CON INFORMACIÓN Y BOTÓN DE COMPRA */}
                      <div className="tcg-card-footer-info">
                        <div className="tcg-card-meta-line">
                          <span className="tcg-code-badge">{carta.codigo}</span>
                          <span className="tcg-rar-badge">{carta.rarezaActiva || carta.rareza}</span>
                        </div>
                        <h5 className="tcg-card-name-title" title={carta.nombreActivo || carta.nombre}>
                          {carta.nombreActivo || carta.nombre}
                        </h5>

                        <div className="tcg-card-action-row">
                          {carta.faltan > 0 && carta.enTienda ? (
                            <button
                              type="button"
                              className="tcg-btn-card-buy"
                              title={`Comprar en Capsule Corp ($${Number(carta.enTienda.precio).toLocaleString("es-CO")} COP)`}
                              onClick={(e) => {
                                e.stopPropagation();
                                agregar({ tipo: "carta", id: carta.enTienda.id });
                                alert(`Se añadió "${carta.nombreActivo || carta.nombre}" al carrito.`);
                              }}
                            >
                              <ShoppingCart size={12} />
                              <span>${Number(carta.enTienda.precio).toLocaleString("es-CO")}</span>
                            </button>
                          ) : carta.completa ? (
                            <span className="tcg-status-text is-complete">✓ Completa</span>
                          ) : (
                            <span className="tcg-status-text is-missing">Faltan {carta.faltan}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ========================================================
                VISTA 2: LISTA DETALLADA ESTILO TCGPLAYER (POR CATEGORÍA)
                ======================================================== */
            <div className="tcgplayer-list-view-container">
              {gruposListaTCG.map((grupo) => (
                <div key={grupo.id} className="tcg-list-section">
                  <div className="tcg-section-header">
                    <span className="tcg-section-icon">{grupo.icono}</span>
                    <h3 className="tcg-section-title">{grupo.titulo}</h3>
                    <span className="tcg-section-count">
                      ({grupo.items.reduce((acc, c) => acc + c.cantidad, 0)} copias • {grupo.items.length} distintas)
                    </span>
                  </div>

                  <div className="tcgplayer-table-wrap">
                    <table className="tcgplayer-deck-table">
                      <thead>
                        <tr>
                          <th style={{ width: "45px", textAlign: "center" }}>Cant</th>
                          <th style={{ width: "50px" }}>Img</th>
                          <th>Carta / Expansión</th>
                          <th>Código</th>
                          <th>Tipo / Atributo</th>
                          <th>Rareza</th>
                          <th>Tu Colección</th>
                          <th>Capsule Corp</th>
                          <th style={{ textAlign: "right" }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.items.map((carta) => (
                          <tr
                            key={carta.codigo}
                            className="tcg-table-row"
                            onClick={() => setCartaInspeccionada(carta)}
                          >
                            <td className="col-cant">
                              <span className="tcg-count-pill">{carta.cantidad}x</span>
                            </td>
                            <td className="col-thumb">
                              <div className="tcg-table-thumb">
                                <img
                                  src={carta.imagenActiva || carta.imagen}
                                  alt={carta.nombreActivo || carta.nombre}
                                  loading="lazy"
                                />
                              </div>
                            </td>
                            <td className="col-name">
                              <div className="tcg-table-card-name">
                                {carta.nombreActivo || carta.nombre}
                              </div>
                              <div className="tcg-table-card-set">
                                {carta.expansion}
                              </div>
                            </td>
                            <td className="col-code">
                              <span className="tcg-code-badge">{carta.codigo}</span>
                            </td>
                            <td className="col-type">
                              <span className="tcg-type-text">
                                {carta.tipo} {carta.color ? `• ${carta.color}` : ""}
                              </span>
                            </td>
                            <td className="col-rarity">
                              <span className="tcg-rar-badge">{carta.rarezaActiva || carta.rareza}</span>
                            </td>
                            <td className="col-collection">
                              {carta.completa ? (
                                <span className="tcg-table-status-pill status-ready">
                                  <CheckCircle2 size={13} /> {carta.tienes}/{carta.cantidad}
                                </span>
                              ) : carta.tienes > 0 ? (
                                <span className="tcg-table-status-pill status-partial">
                                  <AlertTriangle size={13} /> {carta.tienes}/{carta.cantidad} (-{carta.faltan})
                                </span>
                              ) : (
                                <span className="tcg-table-status-pill status-none">
                                  <XCircle size={13} /> 0/{carta.cantidad} (-{carta.faltan})
                                </span>
                              )}
                            </td>
                            <td className="col-store">
                              {carta.enTienda ? (
                                <div className="tcg-table-store-info">
                                  <span className="store-price">
                                    ${Number(carta.enTienda.precio).toLocaleString("es-CO")}
                                  </span>
                                  <span className="store-stock">Stock: {carta.enTienda.stock}</span>
                                </div>
                              ) : (
                                <span className="tcg-no-stock">Agotado</span>
                              )}
                            </td>
                            <td className="col-actions" style={{ textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                                {carta.tieneAA && (
                                  <button
                                    type="button"
                                    className={`tcg-mini-toggle-aa ${carta.esAA ? "is-aa" : "is-normal"}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleArteCarta(carta.codigo);
                                    }}
                                  >
                                    {carta.esAA ? "✨ AA" : "📦 Base"}
                                  </button>
                                )}
                                {carta.faltan > 0 && carta.enTienda && (
                                  <button
                                    type="button"
                                    className="tcg-table-btn-buy"
                                    title="Añadir faltante al carrito"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      agregar({ tipo: "carta", id: carta.enTienda.id });
                                      alert(`Se añadió "${carta.nombreActivo || carta.nombre}" al carrito.`);
                                    }}
                                  >
                                    <ShoppingCart size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL DE INSPECCIÓN DETALLADA DE CARTA ESTILO TCGPLAYER
          ======================================================== */}
      {cartaInspeccionada && (
        <div className="coleccion-modal-backdrop" onClick={() => setCartaInspeccionada(null)}>
          <div
            className="coleccion-modal-content tcg-inspector-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={18} style={{ color: "var(--acento, #a855f7)" }} />
                Detalle Oficial de Carta • One Piece TCG
              </h3>
              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={() => setCartaInspeccionada(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="tcg-inspector-grid">
              <div className="tcg-inspector-media">
                <img
                  src={cartaInspeccionada.imagenActiva || cartaInspeccionada.imagen}
                  alt={cartaInspeccionada.nombreActivo || cartaInspeccionada.nombre}
                />
              </div>

              <div className="tcg-inspector-info-pane">
                <div className="inspector-head">
                  <div className="tcg-card-meta-line" style={{ marginBottom: "8px" }}>
                    <span className="tcg-code-badge">{cartaInspeccionada.codigo}</span>
                    <span className="tcg-rar-badge">{cartaInspeccionada.rarezaActiva || cartaInspeccionada.rareza}</span>
                    <span className="tcg-type-text">{cartaInspeccionada.expansion}</span>
                  </div>

                  <h2 className="tcg-modal-card-title">
                    {cartaInspeccionada.nombreActivo || cartaInspeccionada.nombre}
                  </h2>

                  <div className="tcg-attributes-row">
                    {cartaInspeccionada.tipo && (
                      <span className="tcg-attr-pill">Tipo: <strong>{cartaInspeccionada.tipo}</strong></span>
                    )}
                    {cartaInspeccionada.color && (
                      <span className="tcg-attr-pill">Color: <strong>{cartaInspeccionada.color}</strong></span>
                    )}
                    {cartaInspeccionada.coste && (
                      <span className="tcg-attr-pill">Coste: <strong>{cartaInspeccionada.coste}</strong></span>
                    )}
                    {cartaInspeccionada.poder && (
                      <span className="tcg-attr-pill">Poder: <strong>{cartaInspeccionada.poder}</strong></span>
                    )}
                    {cartaInspeccionada.counter != null && (
                      <span className="tcg-attr-pill">Counter: <strong>+{cartaInspeccionada.counter}</strong></span>
                    )}
                  </div>
                </div>

                {/* TEXTO / HABILIDADES OFICIALES DE LA CARTA */}
                {cartaInspeccionada.texto && (
                  <div className="tcg-card-text-box">
                    <p>{cartaInspeccionada.texto}</p>
                  </div>
                )}

                {/* SELECTOR DE ARTE PARA ESTA CARTA (SI TIENE VERSIÓN AA) */}
                {cartaInspeccionada.tieneAA && (
                  <div className="tcg-inspector-art-switch">
                    <span className="art-switch-title">Versión mostrada en tu deck:</span>
                    <div className="art-switch-buttons">
                      <button
                        type="button"
                        className={`btn-arte-switch ${!cartaInspeccionada.esAA ? "active" : ""}`}
                        onClick={() => {
                          toggleArteCarta(cartaInspeccionada.codigo);
                          setCartaInspeccionada((prev) => ({
                            ...prev,
                            esAA: false,
                            imagenActiva: prev.versiones?.normal?.imagen || `https://www.optcgapi.com/media/static/Card_Images/${prev.codigo}.jpg`,
                            nombreActivo: prev.versiones?.normal?.nombre || prev.nombre,
                            rarezaActiva: prev.versiones?.normal?.rareza || prev.rareza,
                          }));
                        }}
                      >
                        📦 Versión Normal (Base)
                      </button>
                      <button
                        type="button"
                        className={`btn-arte-switch ${cartaInspeccionada.esAA ? "active" : ""}`}
                        onClick={() => {
                          toggleArteCarta(cartaInspeccionada.codigo);
                          setCartaInspeccionada((prev) => ({
                            ...prev,
                            esAA: true,
                            imagenActiva: prev.versiones?.aa?.imagen,
                            nombreActivo: prev.versiones?.aa?.nombre,
                            rarezaActiva: prev.versiones?.aa?.rareza,
                          }));
                        }}
                      >
                        Alternate Art (AA)
                      </button>
                    </div>
                  </div>
                )}

                {/* STATUS EN COLECCIÓN */}
                <div className="tcg-inspector-status-box">
                  <span className="inspector-sec-label">Estado en tu Colección Física</span>
                  {cartaInspeccionada.completa ? (
                    <div className="tcg-status-callout callout-success">
                      <CheckCircle2 size={16} /> Tienes todas las copias en tu colección ({cartaInspeccionada.tienes} de {cartaInspeccionada.cantidad})
                    </div>
                  ) : cartaInspeccionada.tienes > 0 ? (
                    <div className="tcg-status-callout callout-warning">
                      <AlertTriangle size={16} /> Tienes {cartaInspeccionada.tienes} de {cartaInspeccionada.cantidad} copias (Te faltan {cartaInspeccionada.faltan})
                    </div>
                  ) : (
                    <div className="tcg-status-callout callout-danger">
                      <XCircle size={16} /> No la tienes en tu colección física (Necesitas {cartaInspeccionada.cantidad} copias)
                    </div>
                  )}
                </div>

                {/* DISPONIBILIDAD EN TIENDA */}
                <div className="tcg-inspector-status-box">
                  <span className="inspector-sec-label">Disponibilidad en Capsule Corp</span>
                  {cartaInspeccionada.enTienda ? (
                    <div className="tcg-store-purchase-pane">
                      <div>
                        <div className="store-price-big">
                          ${Number(cartaInspeccionada.enTienda.precio).toLocaleString("es-CO")} COP
                        </div>
                        <div className="store-stock-hint">
                          Stock real en bodega: {cartaInspeccionada.enTienda.stock} unidades
                        </div>
                      </div>
                      <button
                        type="button"
                        className="tcg-btn-primary"
                        onClick={() => {
                          agregar({ tipo: "carta", id: cartaInspeccionada.enTienda.id });
                          alert(`Se añadió "${cartaInspeccionada.nombreActivo || cartaInspeccionada.nombre}" al carrito.`);
                        }}
                      >
                        <ShoppingCart size={15} /> Añadir al Carrito
                      </button>
                    </div>
                  ) : (
                    <div className="tcg-store-out-hint">
                      Actualmente no disponible en stock de Capsule Corp.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL PARA DESCARGAR O COPIAR IMAGEN DE FALTANTES
          ======================================================== */}
      {modalFaltantes && (
        <div className="coleccion-modal-backdrop" onClick={() => setModalFaltantes(false)}>
          <div
            className="coleccion-modal-content modal-faltantes-box"
            style={{ maxWidth: "740px", width: "95%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <ImageIcon size={18} style={{ color: "var(--acento, #a855f7)" }} />
                Cartas que te faltan ({cartasFaltantes.length})
              </h3>
              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={() => setModalFaltantes(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-faltantes-body">
              {generandoImagen ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <Loader2 size={38} className="spinner-icon" style={{ margin: "0 auto 12px auto", color: "var(--acento, #a855f7)" }} />
                  <p style={{ color: "var(--texto-suave)" }}>Generando composición gráfica de tus cartas faltantes...</p>
                </div>
              ) : canvasFaltantesUrl ? (
                <>
                  <p style={{ fontSize: "13px", color: "var(--texto-suave)", margin: "0 0 14px 0" }}>
                    Descarga o copia esta imagen para compartirla directamente en WhatsApp, Instagram, Facebook o torneos locales:
                  </p>

                  <div className="preview-canvas-wrap">
                    <img src={canvasFaltantesUrl} alt="Cartas faltantes" className="preview-canvas-img" />
                  </div>

                  <div className="modal-faltantes-acciones">
                    <button
                      type="button"
                      className="tcg-btn-primary"
                      onClick={handleDescargarImagen}
                    >
                      <Download size={15} /> Descargar Imagen (PNG)
                    </button>

                    <button
                      type="button"
                      className="tcg-action-btn"
                      onClick={handleCopiarImagen}
                    >
                      {copiadoFaltantesImg ? <Check size={15} style={{ color: "#10b981" }} /> : <Copy size={15} />}
                      {copiadoFaltantesImg ? "¡Imagen Copiada!" : "Copiar Imagen"}
                    </button>

                    <button
                      type="button"
                      className="tcg-action-btn"
                      onClick={handleCopiarTextoFaltantes}
                    >
                      {copiadoFaltantesTxt ? <Check size={15} style={{ color: "#10b981" }} /> : <FileText size={15} />}
                      {copiadoFaltantesTxt ? "¡Texto Copiado!" : "Copiar en Texto"}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding: "20px", textAlign: "center" }}>
                  <p>No se pudo generar la imagen.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL PARA EDITAR EL NOMBRE DEL DECK
          ======================================================== */}
      {modalEditarNombre && (
        <div className="coleccion-modal-backdrop" onClick={() => setModalEditarNombre(false)}>
          <div
            className="coleccion-modal-content"
            style={{ maxWidth: "440px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Edit2 size={16} style={{ color: "var(--acento, #a855f7)" }} />
                Renombrar Deck
              </h3>
              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={() => setModalEditarNombre(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardarNombreDeck} className="modal-form">
              <div className="form-campo">
                <label>Nombre del Deck</label>
                <input
                  type="text"
                  value={nombreEditando}
                  onChange={(e) => setNombreEditando(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="modal-acciones">
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={() => setModalEditarNombre(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="tcg-btn-primary">
                  Guardar Nombre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL PARA IMPORTAR DECKLIST
          ======================================================== */}
      {mostrarModalCrear && (
        <div className="coleccion-modal-backdrop" onClick={() => setMostrarModalCrear(false)}>
          <div
            className="coleccion-modal-content"
            style={{ maxWidth: "600px" }}
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
                  placeholder="Ej: Katakuri OP08, Charlotte Pudding, Zoro Aggro..."
                  value={nombreDeck}
                  onChange={(e) => setNombreDeck(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {/* OPCIÓN DE RAREZA POR DEFECTO AL CREAR EL DECK */}
              <div className="form-campo">
                <label>Rareza inicial en pantalla:</label>
                <div className="tcg-rarity-segmented-control" style={{ width: "100%", justifyContent: "flex-start" }}>
                  <button
                    type="button"
                    className={`tcg-segmented-btn ${rarezaImport === "normal" ? "active" : ""}`}
                    onClick={() => setRarezaImport("normal")}
                  >
                    Versión Base (Normal)
                  </button>
                  <button
                    type="button"
                    className={`tcg-segmented-btn ${rarezaImport === "aa" ? "active" : ""}`}
                    onClick={() => setRarezaImport("aa")}
                  >
                    Alternate Art (AA)
                  </button>
                </div>
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
                  rows={9}
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
                  className="tcg-btn-primary"
                  disabled={procesando || !nombreDeck.trim() || !textoDecklist.trim()}
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

      {/* ========================================================
          MODAL PARA BUSCAR Y AGREGAR CARTA AL DECK
          ======================================================== */}
      {mostrarModalAgregarCarta && (
        <div className="coleccion-modal-backdrop" onClick={() => setMostrarModalAgregarCarta(false)}>
          <div
            className="coleccion-modal-content"
            style={{ maxWidth: "740px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Plus size={18} style={{ color: "var(--acento, #a855f7)" }} />
                Agregar Carta a {deckSeleccionado?.nombre}
              </h3>
              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={() => setMostrarModalAgregarCarta(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* FORMULARIO DE BÚSQUEDA */}
            <form onSubmit={handleBuscarCartaParaDeck} className="api-search-form" style={{ marginTop: "14px" }}>
              <div className="coleccion-search-box" style={{ flex: 1 }}>
                <Search size={16} style={{ color: "var(--texto-suave)" }} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o código (ej: Yamato, OP01-121, Luffy, Zoro)..."
                  value={queryCartaDeck}
                  onChange={(e) => setQueryCartaDeck(e.target.value)}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="tcg-btn-primary"
                disabled={buscandoCartaDeck || !queryCartaDeck.trim()}
              >
                {buscandoCartaDeck ? <Loader2 size={16} className="spinner-icon" /> : <Search size={16} />}
                Buscar Carta
              </button>
            </form>

            {/* SELECTOR DE RAREZA EN BÚSQUEDA */}
            <div className="tcg-rarity-segmented-control" style={{ marginTop: "12px", width: "100%", justifyContent: "flex-start" }}>
              <span className="rarity-control-title">Filtro de arte:</span>
              <button
                type="button"
                className={`tcg-segmented-btn ${rarezaCartaDeck === "normal" ? "active" : ""}`}
                onClick={() => setRarezaCartaDeck("normal")}
              >
                Versión Base (Normal)
              </button>
              <button
                type="button"
                className={`tcg-segmented-btn ${rarezaCartaDeck === "aa" ? "active" : ""}`}
                onClick={() => setRarezaCartaDeck("aa")}
              >
                ✨ Alternate Art (AA)
              </button>
              <button
                type="button"
                className={`tcg-segmented-btn ${rarezaCartaDeck === "todas" ? "active" : ""}`}
                onClick={() => setRarezaCartaDeck("todas")}
              >
                Todas
              </button>
            </div>

            {/* RESULTADOS DE BÚSQUEDA */}
            <div style={{ marginTop: "16px", maxHeight: "380px", overflowY: "auto" }}>
              {buscandoCartaDeck ? (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <Loader2 size={34} className="spinner-icon" style={{ margin: "0 auto 10px auto", color: "var(--acento)" }} />
                  <p style={{ color: "var(--texto-suave)", margin: 0 }}>Consultando cartas oficiales en optcgapi...</p>
                </div>
              ) : resultadosCartaDeck.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--texto-suave)" }}>
                  <Search size={32} style={{ opacity: 0.3, margin: "0 auto 10px auto" }} />
                  <p style={{ margin: 0 }}>Escribe el nombre o código de la carta y haz clic en "Buscar Carta".</p>
                </div>
              ) : (
                <div className="api-cards-grid">
                  {resultadosCartaDeck
                    .filter((c) => {
                      const esEsp = esVersionEspecial(c);
                      if (rarezaCartaDeck === "normal") return !esEsp;
                      if (rarezaCartaDeck === "aa") return esEsp;
                      return true;
                    })
                    .map((item, idx) => {
                      const esAA = esVersionEspecial(item);
                      return (
                        <div
                          key={item.id || idx}
                          className="api-card-min"
                          style={{ cursor: "pointer" }}
                        >
                          <div className="api-card-thumb">
                            <img
                              src={item.imagen}
                              alt={item.nombre}
                              loading="lazy"
                            />
                            {item.rarity && (
                              <span className="api-thumb-badge">{item.rarity}</span>
                            )}
                            <span className={`api-thumb-badge-arte ${esAA ? "tag-aa" : "tag-normal"}`}>
                              {esAA ? "✨ AA" : "📦 Base"}
                            </span>
                          </div>
                          <div className="api-card-info">
                            <p className="api-card-title">{item.nombre}</p>
                            <p className="api-card-code">{item.numero || item.id}</p>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "6px" }}>
                              <select
                                value={cantidadAgregar}
                                onChange={(e) => setCantidadAgregar(Number(e.target.value))}
                                style={{ padding: "4px 8px", fontSize: "11px", background: "var(--fondo)", color: "#fff", border: "1px solid var(--borde)", borderRadius: "6px" }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value={1}>x1</option>
                                <option value={2}>x2</option>
                                <option value={3}>x3</option>
                                <option value={4}>x4</option>
                              </select>
                              <button
                                type="button"
                                className="tcg-btn-primary"
                                style={{ padding: "5px 10px", fontSize: "11px", flex: 1 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAgregarCartaADeck(item);
                                }}
                              >
                                + Agregar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
