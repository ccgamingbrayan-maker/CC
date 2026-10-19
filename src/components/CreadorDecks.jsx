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
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Share2,
  X,
  LayoutGrid,
  List,
  Download,
  Image as ImageIcon,
  FileText,
  Repeat,
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

// Detecta si una carta de la API es versión alternativa / alta rareza (Parallel, Alternate Art, Manga, SP)
function esVersionEspecial(c) {
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

// Resuelve la información oficial agrupando versión Normal (menor rareza) y versión AA
async function resolverCodigosOnePiece(itemsParseados, preferenciaRareza = "normal") {
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
      let num = prefijo.replace("PRB", "");
      if (num.length === 1) num = "0" + num;
      setsRequeridos.add(num ? `PRB-${num}` : "PRB-01");
    }
  });

  // Consultar sets en paralelo
  const cartasPorCodigo = new Map();
  await Promise.all(
    [...setsRequeridos].map(async (setId) => {
      const cartas = await obtenerSetOptcg(setId);
      cartas.forEach((c) => {
        const rawCode = (c.card_set_id || c.card_image_id || "").toUpperCase();
        if (!rawCode) return;

        // Base code sin sufijo _P1 / _R1 para mapear al grupo común
        const baseLimpio = rawCode.replace(/_P\d+$/i, "").replace(/_R\d+$/i, "");
        const codigos = [rawCode, baseLimpio, baseLimpio.replace("-", "")];
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
      grupo?.todas?.[0];
    let aaCard =
      grupo?.aa ||
      (grupo?.todas && grupo.todas.find(esVersionEspecial)) ||
      null;

    // Fallbacks para cartas especiales o eventos
    if (!normalCard && rawCode === "OP15-077") {
      normalCard = {
        card_name: "Jamboule",
        set_name: "One Piece TCG",
        rarity: "C",
        card_type: "Event",
        card_color: "Purple",
        card_image: "https://www.optcgapi.com/media/static/Card_Images/OP15-077.jpg",
      };
    }
    if (!normalCard && rawCode === "OP15-078") {
      normalCard = {
        card_name: "Mamaragan",
        set_name: "One Piece TCG",
        rarity: "C",
        card_type: "Event",
        card_color: "Purple",
        card_image: "https://www.optcgapi.com/media/static/Card_Images/OP15-078.jpg",
      };
    }

    // Imagen base limpia garantizada (menor rareza)
    const baseImagen =
      (normalCard?.card_image && !normalCard.card_image.includes("_p"))
        ? normalCard.card_image
        : `https://www.optcgapi.com/media/static/Card_Images/${rawCode}.jpg`;
    const aaImagen = aaCard?.card_image || null;

    // POR DEFAULT SIEMPRE EN SU MENOR RAREZA (NORMAL / BASE)
    const imagenFinal = preferenciaRareza === "aa" && aaImagen ? aaImagen : baseImagen;
    const nombreFinal = preferenciaRareza === "aa" && aaCard ? (aaCard.card_name || rawCode) : (normalCard?.card_name || rawCode);

    return {
      codigo: rawCode,
      cantidad: item.cantidad,
      nombre: nombreFinal,
      expansion: normalCard?.set_name || normalCard?.set_id || "One Piece TCG",
      rareza: normalCard?.rarity || (normalCard?.card_type === "Leader" ? "L" : "C"),
      tipo: normalCard?.card_type || "Character",
      color: normalCard?.card_color || "",
      imagen: imagenFinal,
      tieneAA: Boolean(aaCard),
      versiones: {
        normal: {
          nombre: normalCard?.card_name || rawCode,
          imagen: baseImagen,
          rareza: normalCard?.rarity || "C",
        },
        aa: aaCard
          ? {
              nombre: aaCard.card_name || `${rawCode} (Alternate Art)`,
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

  const headerHeight = 110;
  const footerHeight = 44;

  const width = padding * 2 + cols * cardWidth + (cols - 1) * gap;
  const height = headerHeight + rows * (cardHeight + 42) + footerHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Fondo degradado náutico One Piece
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#14110f");
  grad.addColorStop(0.5, "#1f1914");
  grad.addColorStop(1, "#100d0b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Borde temático dorado
  ctx.strokeStyle = "rgba(212, 175, 55, 0.4)";
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, width - 16, height - 16);

  // Cabecera
  ctx.fillStyle = "#eab308";
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.fillText("🏴‍☠️ CAPSULE CORP GAMING • ONE PIECE TCG", padding, 38);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillText(`Cartas que me faltan: ${deck.nombre}`, padding, 68);

  const totalFaltan = cartasFaltantes.reduce((acc, c) => acc + c.faltan, 0);
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText(
    `Total: ${totalFaltan} copias en ${cartasFaltantes.length} cartas distintas • ¿Alguien las tiene para venta o cambio?`,
    padding,
    92
  );

  const cargarImagen = (url) => {
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

  const imagenesCargadas = await Promise.all(
    cartasFaltantes.map((c) => cargarImagen(c.imagenActiva || c.imagen))
  );

  // Dibujar cartas en cuadrícula
  for (let i = 0; i < cartasFaltantes.length; i++) {
    const carta = cartasFaltantes[i];
    const img = imagenesCargadas[i];
    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = padding + col * (cardWidth + gap);
    const y = headerHeight + row * (cardHeight + 42);

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
      ctx.fillStyle = "#27272a";
      ctx.fillRect(x, y, cardWidth, cardHeight);
    }
    ctx.restore();

    // Franja roja "FALTAN X" sobre la carta
    ctx.fillStyle = "rgba(220, 38, 38, 0.92)";
    const bH = 24;
    ctx.fillRect(x, y + cardHeight - bH, cardWidth, bH);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`FALTAN ${carta.faltan} COPIAS`, x + cardWidth / 2, y + cardHeight - 7);

    // Texto al pie de carta: Código y Nombre
    ctx.textAlign = "left";
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px monospace";
    ctx.fillText(carta.codigo, x, y + cardHeight + 16);

    ctx.fillStyle = "#e4e4e7";
    ctx.font = "11px system-ui, sans-serif";
    const nom = (carta.nombreActivo || carta.nombre).length > 20
      ? (carta.nombreActivo || carta.nombre).slice(0, 19) + "…"
      : (carta.nombreActivo || carta.nombre);
    ctx.fillText(nom, x, y + cardHeight + 30);
  }

  // Footer Capsule Corp
  ctx.textAlign = "center";
  ctx.fillStyle = "#71717a";
  ctx.font = "11.5px system-ui, sans-serif";
  ctx.fillText("Generado con el Creador de Decks en www.onepiececc.shop • Capsule Corp Gaming", width / 2, height - 16);

  return canvas;
}

export default function CreadorDecks({ user }) {
  const { agregar } = useCart();
  const [decks, setDecks] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [deckSeleccionado, setDeckSeleccionado] = useState(null);
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);

  // Modo de vista: "tablero" (cuadrícula visual con mapa de fondo) o "lista"
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
  const [filtroDeck, setFiltroDeck] = useState("todas"); // "todas" | "faltantes" | "en_tienda"
  const [busquedaDeck, setBusquedaDeck] = useState("");

  // Modal para buscar y agregar una carta individual al deck
  const [mostrarModalAgregarCarta, setMostrarModalAgregarCarta] = useState(false);
  const [queryCartaDeck, setQueryCartaDeck] = useState("");
  const [rarezaCartaDeck, setRarezaCartaDeck] = useState("normal"); // "normal" (menor rareza por default) | "aa"
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
    const rawCode = (carta.numero || carta.id || "").toUpperCase().replace(/_P\d+$/i, "").replace(/_R\d+$/i, "");
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
        nombre: carta.nombre || rawCode,
        expansion: carta.set || "One Piece TCG",
        rareza: carta.rarity || "C",
        tipo: carta.tipo || "Character",
        color: carta.color || "",
        imagen: rarezaCartaDeck === "aa" && esEsp ? carta.imagen : baseImg,
        tieneAA: esEsp,
        versiones: {
          normal: {
            nombre: (carta.nombre || rawCode).replace(/\s*\((PARALLEL|ALTERNATE ART|ALT ART|MANGA|SP)\)/gi, "").trim(),
            imagen: baseImg,
            rareza: carta.rarity || "C",
          },
          aa: esEsp ? {
            nombre: carta.nombre || `${rawCode} (Alternate Art)`,
            imagen: carta.imagen,
            rareza: carta.rarity || "C",
          } : null,
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
    localStorage.setItem(`decks_${user.id}`, JSON.stringify(decks.map((d) => (d.id === deckSeleccionado.id ? deckActualizado : d))));

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

    const clean = (s) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

    const listaAnalizada = deckSeleccionado.cartas.map((item) => {
      totalNecesarias += item.cantidad;

      // Determinar si esta carta se está visualizando en Normal (menor rareza) o en AA
      const modoCarta = artesIndividuales[item.codigo] || preferenciaRareza;
      const tieneAAReal = Boolean(item.versiones?.aa) || Boolean(item.tieneAA) || (item.imagen && item.imagen.includes("_p"));
      const esAA = modoCarta === "aa" && tieneAAReal;

      // Imagen base / normal (menor rareza) garantizada:
      const imagenNormalLimpia =
        item.versiones?.normal?.imagen ||
        (item.imagen ? item.imagen.replace(/_p\d+\./i, ".").replace(/_r\d+\./i, ".") : `https://www.optcgapi.com/media/static/Card_Images/${item.codigo}.jpg`);

      const nombreNormalLimpio =
        item.versiones?.normal?.nombre ||
        (item.nombre || item.codigo).replace(/\s*\((PARALLEL|ALTERNATE ART|ALT ART|MANGA|SP|SUPER LEADER)\)/gi, "").trim();

      const imagenAA =
        item.versiones?.aa?.imagen ||
        (item.imagen && item.imagen.includes("_p") ? item.imagen : null);

      const nombreAA =
        item.versiones?.aa?.nombre ||
        (item.nombre && item.nombre.includes("Parallel") ? item.nombre : `${item.nombre || item.codigo} (Alternate Art)`);

      const imagenActiva = esAA ? (imagenAA || imagenNormalLimpia) : imagenNormalLimpia;
      const nombreActivo = esAA ? (nombreAA || nombreNormalLimpio) : nombreNormalLimpio;
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
          // Si el usuario busca menor rareza (normal), priorizar la que NO es AA si existe
          if (!esAA && isStoreAA) {
            // Solo usar AA como respaldo si no hay versión normal en la tienda
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
        faltantesDisponiblesTienda += Math.min(faltan, Number(enTienda.stock));
      }

      return {
        ...item,
        tienes,
        faltan,
        completa: faltan === 0,
        enTienda: tieneStockTienda ? enTienda : null,
        // Datos activos según selección Normal vs AA
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

    return {
      cartas: listaAnalizada,
      totalNecesarias,
      totalTienes,
      totalFaltantes,
      faltantesDisponiblesTienda,
      porcentaje,
    };
  }, [deckSeleccionado, coleccionFisica, cartasTienda, preferenciaRareza, artesIndividuales]);

  // Cartas filtradas dentro del deck (por estado y por texto de búsqueda)
  const cartasVisiblesDeck = useMemo(() => {
    if (!analisisDeck) return [];
    let list = analisisDeck.cartas;
    if (filtroDeck === "faltantes") {
      list = list.filter((c) => c.faltan > 0);
    } else if (filtroDeck === "en_tienda") {
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
  }, [analisisDeck, filtroDeck, busquedaDeck]);

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
    const texto = `🏴‍☠️ Cartas que me faltan para: ${deckSeleccionado?.nombre}\n\n${lineas.join("\n")}\n\nCapsule Corp Gaming (www.onepiececc.shop)`;
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
                          onClick={() => {
                            setDeckSeleccionado(deck);
                            setPreferenciaRareza("normal");
                            setArtesIndividuales({});
                          }}
                        >
                          Ver análisis y cartas <ChevronRight size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-deck-icon"
                          title="Copiar decklist"
                          onClick={() => copiarDecklist(deck)}
                        >
                          {copiadoDecklist ? <Check size={14} style={{ color: "#10b981" }} /> : <Copy size={14} />}
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
          {/* BOTÓN VOLVER Y ACCIONES PRINCIPALES */}
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
                className="btn-accion-top btn-add-card-deck"
                title="Buscar y agregar una carta a este deck"
                onClick={() => {
                  setMostrarModalAgregarCarta(true);
                  setQueryCartaDeck("");
                  setResultadosCartaDeck([]);
                  setRarezaCartaDeck("normal");
                  setCantidadAgregar(1);
                }}
              >
                <Plus size={14} /> Agregar Carta
              </button>

              <button
                type="button"
                className="btn-accion-top btn-destacado-faltantes"
                title="Generar imagen de las cartas faltantes para compartir"
                onClick={handleAbrirModalFaltantes}
              >
                <ImageIcon size={14} /> Imagen de Faltantes
              </button>

              <button
                type="button"
                className="btn-accion-top"
                onClick={() => copiarDecklist(deckSeleccionado)}
              >
                {copiadoDecklist ? <Check size={14} style={{ color: "#10b981" }} /> : <Copy size={14} />}
                {copiadoDecklist ? "¡Copiado!" : "Copiar Decklist"}
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
                  Comprobando disponibilidad contra tu colección física y el stock real de Capsule Corp.
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

            {/* SELECTOR DE RAREZA / ARTE GLOBAL: NORMAL (DEFAULT) VS ALTERNATE ART */}
            <div className="deck-arte-toggle-box">
              <span className="arte-toggle-label">Rareza de cartas en pantalla:</span>
              <div className="arte-toggle-buttons">
                <button
                  type="button"
                  className={`btn-arte-switch ${preferenciaRareza === "normal" ? "active" : ""}`}
                  onClick={() => {
                    setPreferenciaRareza("normal");
                    setArtesIndividuales({});
                  }}
                  title="Mostrar cartas en su menor rareza (versión normal/base)"
                >
                  📦 Menor rareza (Normal)
                </button>
                <button
                  type="button"
                  className={`btn-arte-switch ${preferenciaRareza === "aa" ? "active" : ""}`}
                  onClick={() => {
                    setPreferenciaRareza("aa");
                    setArtesIndividuales({});
                  }}
                  title="Mostrar cartas en su versión Alternate Art (AA / Paralela)"
                >
                  ✨ Alternate Art (AA)
                </button>
              </div>
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

          {/* FILTROS INTERNOS Y SELECTOR DE VISTA */}
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

            {/* BUSCADOR DE CARTAS DENTRO DEL DECK */}
            <div className="deck-search-filter-box">
              <Search size={14} style={{ color: "var(--texto-suave)" }} />
              <input
                type="text"
                placeholder="Buscar en este deck..."
                value={busquedaDeck}
                onChange={(e) => setBusquedaDeck(e.target.value)}
              />
              {busquedaDeck && (
                <button
                  type="button"
                  className="btn-clear-search-deck"
                  onClick={() => setBusquedaDeck("")}
                  title="Limpiar búsqueda"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* SELECTOR ENTRE VISTA TABLERO VISUAL Y VISTA LISTA */}
            <div className="deck-vista-switch">
              <button
                type="button"
                className={`btn-vista-toggle ${vistaModo === "tablero" ? "active" : ""}`}
                onClick={() => setVistaModo("tablero")}
                title="Vista visual con fondo náutico del mazo"
              >
                <LayoutGrid size={14} /> Tablero Visual
              </button>
              <button
                type="button"
                className={`btn-vista-toggle ${vistaModo === "lista" ? "active" : ""}`}
                onClick={() => setVistaModo("lista")}
                title="Vista lista"
              >
                <List size={14} /> Lista
              </button>
            </div>
          </div>

          {/* VISTA 1: TABLERO VISUAL CON FONDO NÁUTICO (COMPASS MAP) */}
          {vistaModo === "tablero" ? (
            <div className="deck-tablero-visual">
              <div className="deck-grid-visual">
                {cartasVisiblesDeck.map((carta) => {
                  return (
                    <div
                      key={carta.codigo}
                      className="deck-visual-card-item"
                      onClick={() => setCartaInspeccionada(carta)}
                      title="Haz clic para ver detalles, colección y compra"
                    >
                      {/* CONTENEDOR DE LA CARTA (TCG PROPORTIONS) */}
                      <div className="deck-visual-card-media">
                        <img
                          src={carta.imagenActiva || carta.imagen}
                          alt={carta.nombreActivo || carta.nombre}
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://www.optcgapi.com/media/static/Card_Images/${carta.codigo}.jpg`;
                          }}
                        />

                        {/* BADGE DE COLECCIÓN EN ESQUINA SUPERIOR */}
                        <div className="card-overlay-badge-coleccion">
                          {carta.completa ? (
                            <span className="badge-pill pill-completa" title={`Tienes ${carta.tienes} de ${carta.cantidad} copias`}>
                              <CheckCircle2 size={11} /> {carta.tienes}/{carta.cantidad}
                            </span>
                          ) : carta.tienes > 0 ? (
                            <span className="badge-pill pill-parcial" title={`Tienes ${carta.tienes} de ${carta.cantidad} copias (faltan ${carta.faltan})`}>
                              <AlertTriangle size={11} /> {carta.tienes}/{carta.cantidad}
                            </span>
                          ) : (
                            <span className="badge-pill pill-cero" title={`No la tienes (faltan ${carta.faltan})`}>
                              <XCircle size={11} /> 0/{carta.cantidad}
                            </span>
                          )}
                        </div>

                        {/* BADGE TOGGLE AA / NORMAL (SI TIENE ARTE ALTERNATIVO) */}
                        {carta.tieneAA && (
                          <div className="card-overlay-badge-aa">
                            <button
                              type="button"
                              className={`badge-pill pill-aa-toggle ${carta.esAA ? "active-aa" : "active-normal"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleArteCarta(carta.codigo);
                              }}
                              title={carta.esAA ? "Viendo Alternate Art. Clic para cambiar a Normal" : "Viendo Normal. Clic para cambiar a Alternate Art (AA)"}
                            >
                              {carta.esAA ? "✨ AA" : "📦 Normal"}
                            </button>
                          </div>
                        )}

                        {/* BADGE DE TIENDA CAPSULE CORP */}
                        {carta.enTienda && (
                          <div className="card-overlay-badge-tienda">
                            <span className="badge-pill pill-tienda" title="Disponible en Capsule Corp">
                              <ShoppingCart size={11} /> Tienda
                            </span>
                          </div>
                        )}
                      </div>

                      {/* PIE DE CARTA: CANTIDAD 'x4' Y ESTADO / BOTÓN */}
                      <div className="deck-visual-card-footer">
                        <span className="deck-cant-label">x{carta.cantidad}</span>

                        {carta.faltan > 0 && carta.enTienda ? (
                          <button
                            type="button"
                            className="btn-comprar-card-visual"
                            title={`Comprar en Capsule Corp ($${Number(carta.enTienda.precio).toLocaleString("es-CO")} COP)`}
                            onClick={(e) => {
                              e.stopPropagation();
                              agregar({ tipo: "carta", id: carta.enTienda.id });
                              alert(`Se añadió "${carta.nombreActivo || carta.nombre}" al carrito.`);
                            }}
                          >
                            <ShoppingCart size={11} />
                            <span>${Number(carta.enTienda.precio).toLocaleString("es-CO")}</span>
                          </button>
                        ) : carta.completa ? (
                          <span className="status-label-visual text-completa">✓ Lista</span>
                        ) : (
                          <span className="status-label-visual text-falta">Faltan {carta.faltan}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* VISTA 2: LISTADO DETALLADO */
            <div className="deck-cards-lista">
              {cartasVisiblesDeck.map((carta) => {
                return (
                  <div key={carta.codigo} className="deck-card-row">
                    <div className="deck-row-thumb">
                      <img src={carta.imagenActiva || carta.imagen} alt={carta.nombreActivo || carta.nombre} loading="lazy" />
                      <span className="deck-row-badge-cant">{carta.cantidad}x</span>
                    </div>

                    <div className="deck-row-info">
                      <div className="deck-row-title-row">
                        <h4 className="deck-row-nombre">{carta.nombreActivo || carta.nombre}</h4>
                        <span className="deck-row-codigo">{carta.codigo}</span>
                        {carta.tieneAA && (
                          <button
                            type="button"
                            className="btn-mini-aa"
                            onClick={() => toggleArteCarta(carta.codigo)}
                          >
                            {carta.esAA ? "✨ Ver Normal" : "📦 Ver AA"}
                          </button>
                        )}
                      </div>
                      <div className="deck-row-tags">
                        <span className="tag-set">📦 {carta.expansion}</span>
                        {carta.rarezaActiva && <span className="tag-rar">⭐ {carta.rarezaActiva}</span>}
                      </div>
                    </div>

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
                                alert(`Se añadió ${carta.nombreActivo || carta.nombre} al carrito.`);
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
          )}
        </div>
      )}

      {/* MODAL PARA INSPECCIONAR CARTA INDIVIDUAL */}
      {cartaInspeccionada && (
        <div className="coleccion-modal-backdrop" onClick={() => setCartaInspeccionada(null)}>
          <div
            className="coleccion-modal-content card-inspector-modal"
            style={{ maxWidth: "600px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={18} style={{ color: "var(--acento, #a855f7)" }} />
                Detalle de Carta
              </h3>
              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={() => setCartaInspeccionada(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="card-inspector-layout">
              <div className="inspector-img-wrap">
                <img
                  src={cartaInspeccionada.imagenActiva || cartaInspeccionada.imagen}
                  alt={cartaInspeccionada.nombreActivo || cartaInspeccionada.nombre}
                />
              </div>

              <div className="inspector-details">
                <div className="inspector-header">
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "6px" }}>
                    <span className="deck-row-codigo">{cartaInspeccionada.codigo}</span>
                    {cartaInspeccionada.rarezaActiva && (
                      <span className="tag-rar">⭐ {cartaInspeccionada.rarezaActiva}</span>
                    )}
                  </div>
                  <h3 style={{ margin: "0 0 6px 0", fontSize: "17px", color: "var(--texto)" }}>
                    {cartaInspeccionada.nombreActivo || cartaInspeccionada.nombre}
                  </h3>
                  <p style={{ margin: 0, fontSize: "12.5px", color: "var(--texto-suave)" }}>
                    {cartaInspeccionada.expansion} • {cartaInspeccionada.tipo} {cartaInspeccionada.color ? `• ${cartaInspeccionada.color}` : ""}
                  </p>
                </div>

                {/* SELECTOR DE ARTE PARA ESTA CARTA (SI TIENE VERSIÓN AA) */}
                {cartaInspeccionada.tieneAA && (
                  <div className="inspector-arte-toggle">
                    <span style={{ fontSize: "12px", color: "var(--texto-suave)" }}>Versión mostrada:</span>
                    <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                      <button
                        type="button"
                        className={`btn-arte-switch ${!cartaInspeccionada.esAA ? "active" : ""}`}
                        style={{ padding: "5px 10px", fontSize: "11.5px" }}
                        onClick={() => {
                          toggleArteCarta(cartaInspeccionada.codigo);
                          setCartaInspeccionada((prev) => ({
                            ...prev,
                            esAA: false,
                            imagenActiva: prev.versiones.normal.imagen,
                            nombreActivo: prev.versiones.normal.nombre,
                            rarezaActiva: prev.versiones.normal.rareza,
                          }));
                        }}
                      >
                        📦 Normal (Base)
                      </button>
                      <button
                        type="button"
                        className={`btn-arte-switch ${cartaInspeccionada.esAA ? "active" : ""}`}
                        style={{ padding: "5px 10px", fontSize: "11.5px" }}
                        onClick={() => {
                          toggleArteCarta(cartaInspeccionada.codigo);
                          setCartaInspeccionada((prev) => ({
                            ...prev,
                            esAA: true,
                            imagenActiva: prev.versiones.aa.imagen,
                            nombreActivo: prev.versiones.aa.nombre,
                            rarezaActiva: prev.versiones.aa.rareza,
                          }));
                        }}
                      >
                        ✨ Alternate Art (AA)
                      </button>
                    </div>
                  </div>
                )}

                <div className="inspector-section">
                  <h5 style={{ margin: "0 0 6px 0", fontSize: "11px", color: "var(--texto-suave)", textTransform: "uppercase" }}>
                    En tu Colección Física
                  </h5>
                  {cartaInspeccionada.completa ? (
                    <div className="status-badge status-completa" style={{ width: "100%", boxSizing: "border-box" }}>
                      <CheckCircle2 size={14} /> Tienes todas las copias ({cartaInspeccionada.tienes} de {cartaInspeccionada.cantidad})
                    </div>
                  ) : cartaInspeccionada.tienes > 0 ? (
                    <div className="status-badge status-parcial" style={{ width: "100%", boxSizing: "border-box" }}>
                      <AlertTriangle size={14} /> Tienes {cartaInspeccionada.tienes} de {cartaInspeccionada.cantidad} (Te faltan {cartaInspeccionada.faltan})
                    </div>
                  ) : (
                    <div className="status-badge status-cero" style={{ width: "100%", boxSizing: "border-box" }}>
                      <XCircle size={14} /> No la tienes (Necesitas {cartaInspeccionada.cantidad})
                    </div>
                  )}
                </div>

                <div className="inspector-section">
                  <h5 style={{ margin: "0 0 6px 0", fontSize: "11px", color: "var(--texto-suave)", textTransform: "uppercase" }}>
                    En Tienda Capsule Corp
                  </h5>
                  {cartaInspeccionada.enTienda ? (
                    <div className="tienda-inspector-box">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                        <div>
                          <div style={{ fontSize: "15px", fontWeight: 800, color: "#10b981" }}>
                            ${Number(cartaInspeccionada.enTienda.precio).toLocaleString("es-CO")} COP
                          </div>
                          <div style={{ fontSize: "11.5px", color: "var(--texto-suave)" }}>
                            Stock disponible: {cartaInspeccionada.enTienda.stock}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="auth-boton"
                          style={{ padding: "8px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                          onClick={() => {
                            agregar({ tipo: "carta", id: cartaInspeccionada.enTienda.id });
                            alert(`Se añadió ${cartaInspeccionada.nombreActivo || cartaInspeccionada.nombre} al carrito.`);
                          }}
                        >
                          <ShoppingCart size={13} /> Añadir al Carrito
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: "12px", color: "var(--texto-suave)", fontStyle: "italic", padding: "8px 12px", background: "var(--t08)", borderRadius: "8px" }}>
                      Actualmente no está disponible en la tienda Capsule Corp
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA DESCARGAR O COPIAR IMAGEN DE CARTAS FALTANTES */}
      {modalFaltantes && (
        <div className="coleccion-modal-backdrop" onClick={() => setModalFaltantes(false)}>
          <div
            className="coleccion-modal-content modal-faltantes-box"
            style={{ maxWidth: "720px", width: "95%" }}
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
                  <Loader2 size={36} className="spinner-icon" style={{ margin: "0 auto 12px auto", color: "var(--acento, #a855f7)" }} />
                  <p style={{ color: "var(--texto-suave)" }}>Generando imagen en alta definición de tus cartas faltantes...</p>
                </div>
              ) : canvasFaltantesUrl ? (
                <>
                  <p style={{ fontSize: "13px", color: "var(--texto-suave)", margin: "0 0 14px 0" }}>
                    Descarga o copia esta imagen para compartirla en tus grupos de WhatsApp, redes sociales o torneos:
                  </p>

                  <div className="preview-canvas-wrap">
                    <img src={canvasFaltantesUrl} alt="Cartas faltantes" className="preview-canvas-img" />
                  </div>

                  <div className="modal-faltantes-acciones">
                    <button
                      type="button"
                      className="auth-boton btn-action-faltantes"
                      onClick={handleDescargarImagen}
                    >
                      <Download size={15} /> Descargar Imagen (PNG)
                    </button>

                    <button
                      type="button"
                      className="btn-accion-secondary btn-action-faltantes"
                      onClick={handleCopiarImagen}
                    >
                      {copiadoFaltantesImg ? <Check size={15} style={{ color: "#10b981" }} /> : <Copy size={15} />}
                      {copiadoFaltantesImg ? "¡Imagen Copiada!" : "Copiar Imagen"}
                    </button>

                    <button
                      type="button"
                      className="btn-accion-secondary btn-action-faltantes"
                      onClick={handleCopiarTextoFaltantes}
                    >
                      {copiadoFaltantesTxt ? <Check size={15} style={{ color: "#10b981" }} /> : <FileText size={15} />}
                      {copiadoFaltantesTxt ? "¡Texto Copiado!" : "Copiar Lista en Texto"}
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

              {/* OPCIÓN DE RAREZA POR DEFECTO AL CREAR EL DECK */}
              <div className="form-campo">
                <label>Rareza inicial de las cartas:</label>
                <div className="radio-arte-group">
                  <label className="radio-arte-item">
                    <input
                      type="radio"
                      name="rarezaImport"
                      value="normal"
                      checked={rarezaImport === "normal"}
                      onChange={() => setRarezaImport("normal")}
                    />
                    <span>📦 Menor rareza (Normal / Base) <em>[Por defecto]</em></span>
                  </label>
                  <label className="radio-arte-item">
                    <input
                      type="radio"
                      name="rarezaImport"
                      value="aa"
                      checked={rarezaImport === "aa"}
                      onChange={() => setRarezaImport("aa")}
                    />
                    <span>✨ Alternate Art (AA / Paralela)</span>
                  </label>
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

      {/* MODAL PARA BUSCAR Y AGREGAR CARTA INDIVIDUAL AL DECK */}
      {mostrarModalAgregarCarta && (
        <div className="coleccion-modal-backdrop" onClick={() => setMostrarModalAgregarCarta(false)}>
          <div
            className="coleccion-modal-content coleccion-modal-grande"
            style={{ maxWidth: "720px" }}
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
            <form onSubmit={handleBuscarCartaParaDeck} className="api-search-form" style={{ marginTop: "12px" }}>
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
                className="auth-boton"
                disabled={buscandoCartaDeck || !queryCartaDeck.trim()}
                style={{ padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {buscandoCartaDeck ? <Loader2 size={16} className="spinner-icon" /> : <Search size={16} />}
                Buscar Carta
              </button>
            </form>

            {/* SELECTOR DE RAREZA / ARTE: NORMAL (DEFAULT) VS AA */}
            <div className="api-rareza-filter-bar" style={{ marginTop: "12px" }}>
              <span className="api-filter-label">Rareza a buscar:</span>
              <div className="api-filter-tabs">
                <button
                  type="button"
                  className={`api-filter-tab ${rarezaCartaDeck === "normal" ? "active" : ""}`}
                  onClick={() => setRarezaCartaDeck("normal")}
                >
                  📦 Menor rareza (Normal / Base) <em>[Por defecto]</em>
                </button>
                <button
                  type="button"
                  className={`api-filter-tab ${rarezaCartaDeck === "aa" ? "active" : ""}`}
                  onClick={() => setRarezaCartaDeck("aa")}
                >
                  ✨ Alternate Art (AA / Paralela)
                </button>
                <button
                  type="button"
                  className={`api-filter-tab ${rarezaCartaDeck === "todas" ? "active" : ""}`}
                  onClick={() => setRarezaCartaDeck("todas")}
                >
                  🌐 Todas
                </button>
              </div>
            </div>

            {/* RESULTADOS DE BÚSQUEDA */}
            <div style={{ marginTop: "14px", maxHeight: "360px", overflowY: "auto" }}>
              {buscandoCartaDeck ? (
                <div style={{ textAlign: "center", padding: "36px 20px" }}>
                  <Loader2 size={32} className="spinner-icon" style={{ margin: "0 auto 10px auto", color: "var(--acento)" }} />
                  <p style={{ color: "var(--texto-suave)", margin: 0 }}>Consultando cartas oficiales...</p>
                </div>
              ) : resultadosCartaDeck.length === 0 ? (
                <div style={{ textAlign: "center", padding: "36px 20px", color: "var(--texto-suave)" }}>
                  <Search size={32} style={{ opacity: 0.3, margin: "0 auto 10px auto" }} />
                  <p style={{ margin: 0 }}>Escribe el nombre o código de la carta y presiona "Buscar Carta".</p>
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
                                style={{ padding: "3px 6px", fontSize: "11px", background: "var(--fondo)", color: "#fff", border: "1px solid var(--borde)", borderRadius: "4px" }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value={1}>x1</option>
                                <option value={2}>x2</option>
                                <option value={3}>x3</option>
                                <option value={4}>x4</option>
                              </select>
                              <button
                                type="button"
                                className="auth-boton"
                                style={{ padding: "4px 8px", fontSize: "11px", flex: 1 }}
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
