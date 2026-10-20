import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Plus,
  Clock,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ExternalLink,
  Edit2,
  Trash2,
  X,
  Layers,
  ArrowRight,
  MessageCircle,
  Check,
  TrendingUp,
  CreditCard,
  Award,
  Coins,
  Percent,
  Mail,
  UserCheck,
  Upload,
  FileText,
  Camera,
  Download,
  RefreshCw,
  Gift,
  Package,
  Minus,
} from "lucide-react";
import {
  listarTorneos,
  guardarTorneo,
  eliminarTorneo,
  guardarParticipante,
  eliminarParticipante,
  calcularMetricasTorneo,
  guardarProductosPremiosTorneo,
  asignarProductosPremiosTorneo,
  listarCatalogoPremios,
  guardarProductoCatalogo,
  eliminarProductoCatalogo,
  ajustarStockCatalogo,
  descontarStockCatalogoPorTorneo,
  calcularPremiacionOficialOnePiece,
  aplicarPremiacionOficialTorneo,
  sortearRifaTorneo,
  cargarKitsMensualesBandai,
  listarPrizeWall,
  guardarItemPrizeWall,
  eliminarItemPrizeWall,
  ajustarStockPrizeWall,
  listarCanjesPrizeWall,
  obtenerSaldosCcCoinsJugadores,
  canjearItemPrizeWall,
  PRIZE_WALL_ITEMS_INICIALES,
} from "../lib/torneos.js";
import {
  parsearTextoBandai,
  ocrImagenBandai,
  EJEMPLO_BANDAI_TEXTO,
} from "../lib/bandaiParser.js";
import { useAuth } from "../lib/AuthContext.jsx";

const JUEGOS_FILTRO = [
  { id: "todos", label: "Todos los juegos", badge: "ALL" },
  { id: "One Piece TCG", label: "One Piece TCG", badge: "OP TCG" },
  { id: "Riftbound TCG", label: "Riftbound TCG", badge: "RIFT" },
];

export default function Torneos() {
  const { esAdmin } = useAuth();
  const [torneos, setTorneos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [filtroJuego, setFiltroJuego] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos"); // "todos" | "proximo" | "en_curso" | "finalizado"
  const [busqueda, setBusqueda] = useState("");

  // Modales
  const [modalTorneoAbierto, setModalTorneoAbierto] = useState(false);
  const [torneoEditando, setTorneoEditando] = useState(null);
  const [torneoDetalle, setTorneoDetalle] = useState(null);

  // Formulario de Torneo
  const [formNombre, setFormNombre] = useState("");
  const [formJuego, setFormJuego] = useState("One Piece TCG");
  const [formFormato, setFormFormato] = useState("Estándar Suizo");
  const [formFecha, setFormFecha] = useState("");
  const [formLugar, setFormLugar] = useState("Sede Capsule Corp Gaming - Cali (Cra 34 # 4-50)");
  const [formCosto, setFormCosto] = useState("26000");
  const [formCupo, setFormCupo] = useState("16");
  const [formPremios, setFormPremios] = useState("");
  const [formGastos, setFormGastos] = useState("0");
  const [formEstado, setFormEstado] = useState("proximo");
  const [formNotas, setFormNotas] = useState("");

  // Formulario de Participante dentro de modal detalle
  const [pNombre, setPNombre] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pTelefono, setPTelefono] = useState("");
  const [pDeck, setPDeck] = useState("");
  const [pPuesto, setPPuesto] = useState("Participante");
  const [pPremioGanado, setPPremioGanado] = useState("");
  const [pMontoPagado, setPMontoPagado] = useState("");
  const [pEstadoPago, setPEstadoPago] = useState("pagado");
  const [pNotas, setPNotas] = useState("");

  // Pestaña de Gestión del Torneo ("participantes" | "productos_premios")
  const [tabGestionTorneo, setTabGestionTorneo] = useState("participantes");

  // Catálogo General de Premios e Inventario
  const [catalogoPremios, setCatalogoPremios] = useState([]);
  const [modalCatalogoAbierto, setModalCatalogoAbierto] = useState(false);
  const [filtroCatJuego, setFiltroCatJuego] = useState("todos");
  const [busquedaCat, setBusquedaCat] = useState("");

  // Formulario de Producto para el Catálogo General
  const [catNombre, setCatNombre] = useState("");
  const [catJuego, setCatJuego] = useState("One Piece TCG");
  const [catCategoria, setCatCategoria] = useState("Sobres");
  const [catStock, setCatStock] = useState("12");
  const [catValorCop, setCatValorCop] = useState("");
  const [catImagen, setCatImagen] = useState("");
  const [catNotas, setCatNotas] = useState("");
  const [mostrarFormNuevoCat, setMostrarFormNuevoCat] = useState(false);
  const [guardandoCatItem, setGuardandoCatItem] = useState(false);

  // Selector y Vinculación desde Catálogo a Torneo
  const [premioCatSeleccionadoId, setPremioCatSeleccionadoId] = useState("");
  const [premioCatPuesto, setPremioCatPuesto] = useState("1");
  const [premioCatCantidad, setPremioCatCantidad] = useState("1");
  const [descontandoStock, setDescontandoStock] = useState(false);

  // Apartado de Productos de Premiación (personalizado opcional)
  const [prodNombre, setProdNombre] = useState("");
  const [prodPuesto, setProdPuesto] = useState("1");
  const [prodCantidad, setProdCantidad] = useState("1");
  const [prodImagen, setProdImagen] = useState("");
  const [prodValorCop, setProdValorCop] = useState("");
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [asignandoProductos, setAsignandoProductos] = useState(false);
  const [mensajeProdPremio, setMensajeProdPremio] = useState("");

  // Edición rápida de premio individual
  const [editandoPremioId, setEditandoPremioId] = useState(null);
  const [textoPremioEdicion, setTextoPremioEdicion] = useState("");

  // Sorteo de Rifa Obligatoria
  const [sorteandoRifa, setSorteandoRifa] = useState(false);
  const [notifRifa, setNotifRifa] = useState("");

  // Muro de Premios (Prize Wall) & CC Coins
  const [itemsPrizeWall, setItemsPrizeWall] = useState(PRIZE_WALL_ITEMS_INICIALES);
  const [saldosCcCoins, setSaldosCcCoins] = useState([]);
  const [canjesPrizeWall, setCanjesPrizeWall] = useState([]);
  const [modalPrizeWallAbierto, setModalPrizeWallAbierto] = useState(false);
  const [subTabPrizeWall, setSubTabPrizeWall] = useState("items"); // "items" | "jugadores" | "historial"
  const [busquedaPW, setBusquedaPW] = useState("");
  const [canjeItemActivo, setCanjeItemActivo] = useState(null);
  const [canjeJugadorKey, setCanjeJugadorKey] = useState("");
  const [canjeCantidad, setCanjeCantidad] = useState("1");
  const [canjeando, setCanjeando] = useState(false);
  const [mensajeCanje, setMensajeCanje] = useState("");

  // Formulario nuevo artículo Prize Wall
  const [mostrarFormNuevoPW, setMostrarFormNuevoPW] = useState(false);
  const [pwNombre, setPwNombre] = useState("");
  const [pwCategoria, setPwCategoria] = useState("Accesorios");
  const [pwCostoCoins, setPwCostoCoins] = useState("10");
  const [pwStock, setPwStock] = useState("5");
  const [pwImagen, setPwImagen] = useState("");
  const [pwDescripcion, setPwDescripcion] = useState("");
  const [guardandoPWItem, setGuardandoPWItem] = useState(false);

  // Modal Importador Automático Bandai TCG+ / Riftbound
  const [modalImportarAbierto, setModalImportarAbierto] = useState(false);
  const [importTexto, setImportTexto] = useState("");
  const [importJuego, setImportJuego] = useState("One Piece TCG");
  const [importNombre, setImportNombre] = useState("Torneo Store Championship OP-09 (Bandai TCG+)");
  const [importFormato, setImportFormato] = useState("Estándar Suizo (4 Rondas)");
  const [importFecha, setImportFecha] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [importLugar, setImportLugar] = useState("Sede Capsule Corp Gaming - Cali (Cra 34 # 4-50)");
  const [importCosto, setImportCosto] = useState("26000");
  const [participantesParseados, setParticipantesParseados] = useState([]);
  const [procesandoOcr, setProcesandoOcr] = useState(false);
  const [estadoOcr, setEstadoOcr] = useState("");
  const [modoEntrada, setModoEntrada] = useState("texto"); // "texto" | "imagen"
  const [torneoDestinoImportacion, setTorneoDestinoImportacion] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (importTexto.trim()) {
      const parsed = parsearTextoBandai(importTexto);
      setParticipantesParseados(parsed);
    } else {
      setParticipantesParseados([]);
    }
  }, [importTexto]);

  function abrirModalImportar(torneoExistente = null) {
    setTorneoDestinoImportacion(torneoExistente);
    if (torneoExistente) {
      setImportNombre(torneoExistente.nombre || "");
      setImportJuego(torneoExistente.juego || "One Piece TCG");
      setImportCosto(String(torneoExistente.costoInscripcion || 26000));
    } else {
      setImportNombre("Torneo Store Championship OP-09 (Bandai TCG+)");
      setImportJuego("One Piece TCG");
      setImportCosto("26000");
    }
    setImportTexto("");
    setParticipantesParseados([]);
    setEstadoOcr("");
    setModoEntrada("texto");
    setModalImportarAbierto(true);
  }

  function cargarEjemploBandai() {
    setImportTexto(EJEMPLO_BANDAI_TEXTO);
    setImportNombre("Torneo Store Championship OP-09 (Bandai TCG+)");
    setImportJuego("One Piece TCG");
    setImportCosto("26000");
  }

  async function handleSubirImagenBandai(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcesandoOcr(true);
    setEstadoOcr("Leyendo captura de Bandai TCG+ con OCR...");
    try {
      const texto = await ocrImagenBandai(file, (msg) => setEstadoOcr(msg));
      setImportTexto(texto);
      const parsed = parsearTextoBandai(texto);
      if (parsed.length > 0) {
        setEstadoOcr(`¡Se detectaron ${parsed.length} participantes automáticamente!`);
      } else {
        setEstadoOcr("OCR completado. Revisa o ajusta el texto si hay caracteres confusos.");
      }
    } catch (err) {
      setEstadoOcr("Error al procesar la imagen con OCR. Puedes copiar y pegar el texto de la tabla.");
    } finally {
      setProcesandoOcr(false);
    }
  }

  async function handleConfirmarImportacion(e) {
    e.preventDefault();
    if (participantesParseados.length === 0) {
      alert("Por favor pega o sube la tabla de Bandai TCG+ para detectar los participantes.");
      return;
    }

    const costo = Number(importCosto) || 26000;

    // Buscar productos en catálogo
    const prodWinner = catalogoPremios.find((p) => p.categoria === "Kits de Torneo" || p.nombre.toLowerCase().includes("winner"));
    const prodPack = catalogoPremios.find((p) => p.categoria === "Sobres de Torneo" || p.nombre.toLowerCase().includes("tournament pack"));
    const prodSobres = catalogoPremios.find((p) => p.categoria === "Sobres" && p.juego === "One Piece TCG") || catalogoPremios.find((p) => p.categoria === "Sobres");

    const stockWinner = prodWinner?.stock ?? 7;
    const stockPacks = prodPack?.stock ?? 56;

    const calculo = calcularPremiacionOficialOnePiece(
      participantesParseados.length,
      participantesParseados,
      prodSobres?.valorCop || 22000
    );

    // Construir lista de productos de premiación del torneo
    const productosPremiosTorneo = [];
    if (prodWinner && stockWinner > 0) {
      productosPremiosTorneo.push({
        id: `pp-win-${Date.now()}`,
        catalogoId: prodWinner.id,
        nombre: prodWinner.nombre,
        puesto: "1",
        cantidad: 1,
        imagen: prodWinner.imagen,
        valorCop: 0,
      });
    }

    if (prodSobres) {
      for (let pos = 1; pos <= calculo.puestosPremiados; pos++) {
        const cant = calculo.sobresPorPuesto[pos];
        if (cant > 0) {
          productosPremiosTorneo.push({
            id: `pp-top${pos}-${Date.now()}`,
            catalogoId: prodSobres.id,
            nombre: prodSobres.nombre,
            puesto: String(pos),
            cantidad: cant,
            imagen: prodSobres.imagen,
            valorCop: prodSobres.valorCop,
          });
        }
      }
      if (calculo.sobresRifa > 0) {
        productosPremiosTorneo.push({
          id: `pp-rifa-${Date.now()}`,
          catalogoId: prodSobres.id,
          nombre: `${prodSobres.nombre} (Sobre de Rifa)`,
          puesto: "rifa",
          cantidad: 1,
          imagen: prodSobres.imagen,
          valorCop: prodSobres.valorCop,
        });
      }
    }

    if (prodPack && stockPacks > 0) {
      productosPremiosTorneo.push({
        id: `pp-part-${Date.now()}`,
        catalogoId: prodPack.id,
        nombre: prodPack.nombre,
        puesto: "todos",
        cantidad: 1,
        imagen: prodPack.imagen,
        valorCop: 0,
      });
    }

    const participantesConPremios = participantesParseados.map((p) => {
      const numP = parseInt(String(p.puesto || "").replace(/\D/g, ""), 10);
      const wins = p.wins !== undefined && p.wins !== null
        ? Number(p.wins)
        : Math.floor((Number(p.puntos) || 0) / 3);
      const ccCoins = Math.max(0, wins);

      const items = [];
      // CC Coins por victorias para el Prize Wall (1 win = 1 CC Coin = $2.000 COP)
      items.push(`🪙 ${ccCoins} CC Coin${ccCoins === 1 ? "" : "s"} (${wins} win${wins === 1 ? "" : "s"})`);

      if (numP === 1 && stockWinner > 0) {
        items.push(prodWinner ? `1x ${prodWinner.nombre}` : "1x Sobre Winner Oficial");
      }

      const sobresPuesto = calculo.sobresPorPuesto[numP];
      if (sobresPuesto && sobresPuesto > 0) {
        items.push(`${sobresPuesto}x ${prodSobres?.nombre || "Sobres Oficiales OP-09"}`);
      }

      if (stockPacks > 0) {
        items.push(prodPack ? `1x ${prodPack.nombre}` : "1x Tournament Pack");
      }

      const premioTexto = items.join(" + ");

      return {
        ...p,
        wins,
        ccCoins,
        montoPagado: costo,
        estadoPago: "pagado",
        premioGanado: premioTexto,
      };
    });

    if (torneoDestinoImportacion) {
      const actualizado = await guardarTorneo({
        ...torneoDestinoImportacion,
        costoInscripcion: costo,
        participantes: participantesConPremios,
        productosPremios: torneoDestinoImportacion.productosPremios?.length > 0 ? torneoDestinoImportacion.productosPremios : productosPremiosTorneo,
        estado: "finalizado",
      });
      setModalImportarAbierto(false);
      await cargarDatos();
      if (actualizado) setTorneoDetalle(actualizado);
      return;
    }

    const nuevoTorneo = {
      nombre: importNombre.trim(),
      juego: importJuego,
      formato: importFormato.trim(),
      fecha: importFecha,
      lugar: importLugar.trim(),
      costoInscripcion: costo,
      cupoMaximo: Math.max(participantesParseados.length, 16),
      premios: `100% de la inscripción en premios ($26.000 COP por jugador): Cada victoria otorga 1 CC Coin ($2.000 COP descontados para el Prize Wall) + Pool restante en Sobres Oficiales OP-09 (${calculo.sobresTop} al Top ${calculo.puestosPremiados} y ${calculo.sobresRifa} a la Rifa) + 1 Winner Pack al 1° y Tournament Packs a todos.`,
      estado: "finalizado",
      notas: `Importado automáticamente desde Bandai TCG+ (${participantesParseados.length} jugadores). 100% entregado en premios entre CC Coins y sobres.`,
      productosPremios: productosPremiosTorneo,
      participantes: participantesConPremios,
    };

    const guardado = await guardarTorneo(nuevoTorneo);
    setModalImportarAbierto(false);
    await cargarDatos();
    if (guardado) {
      setTorneoDetalle(guardado);
    }
  }

  async function cargarDatos() {
    setCargando(true);
    const [dataTorneos, dataCatalogo, dataPW, dataSaldos, dataCanjes] = await Promise.all([
      listarTorneos(),
      listarCatalogoPremios(),
      listarPrizeWall(),
      obtenerSaldosCcCoinsJugadores(),
      listarCanjesPrizeWall(),
    ]);
    setTorneos(dataTorneos);
    setCatalogoPremios(dataCatalogo);
    setItemsPrizeWall(dataPW);
    setSaldosCcCoins(dataSaldos);
    setCanjesPrizeWall(dataCanjes);
    setCargando(false);
  }

  async function handleCanjearItem(e) {
    if (e) e.preventDefault();
    if (!canjeItemActivo || !canjeJugadorKey) {
      alert("Por favor selecciona el jugador para procesar el canje.");
      return;
    }
    const cant = Math.max(1, parseInt(canjeCantidad, 10) || 1);
    setCanjeando(true);
    setMensajeCanje("");

    const res = await canjearItemPrizeWall({
      itemId: canjeItemActivo.id,
      jugadorIdentificador: canjeJugadorKey,
      cantidad: cant,
    });

    if (res.error) {
      alert(res.error);
      setCanjeando(false);
      return;
    }

    setMensajeCanje(`¡Canje exitoso! Se entregó "${res.item.nombre}" (${cant}x) por ${res.canje.costoTotalCoins} CC Coins.`);
    setCanjeItemActivo(null);
    setCanjeJugadorKey("");
    setCanjeCantidad("1");
    setCanjeando(false);
    await cargarDatos();
  }

  async function handleGuardarItemPW(e) {
    e.preventDefault();
    if (!pwNombre.trim()) {
      alert("El nombre del artículo es obligatorio.");
      return;
    }
    setGuardandoPWItem(true);
    await guardarItemPrizeWall({
      nombre: pwNombre,
      categoria: pwCategoria,
      costoCcCoins: pwCostoCoins,
      stock: pwStock,
      imagen: pwImagen,
      descripcion: pwDescripcion,
    });
    setPwNombre("");
    setPwCostoCoins("10");
    setPwStock("5");
    setPwImagen("");
    setPwDescripcion("");
    setMostrarFormNuevoPW(false);
    setGuardandoPWItem(false);
    await cargarDatos();
  }

  async function handleEliminarItemPW(id) {
    if (!window.confirm("¿Seguro que deseas eliminar este artículo del Prize Wall?")) return;
    await eliminarItemPrizeWall(id);
    await cargarDatos();
  }

  async function handleAjustarStockPW(id, delta) {
    await ajustarStockPrizeWall(id, delta);
    await cargarDatos();
  }

  function abrirModalCrear() {
    setTorneoEditando(null);
    setFormNombre("");
    setFormJuego("One Piece TCG");
    setFormFormato("Estándar Suizo");
    setFormFecha("");
    setFormLugar("Sede Capsule Corp Gaming - Cali (Cra 34 # 4-50)");
    setFormCosto("26000");
    setFormCupo("16");
    setFormPremios("");
    setFormGastos("0");
    setFormEstado("proximo");
    setFormNotas("");
    setModalTorneoAbierto(true);
  }

  function abrirModalEditar(t) {
    setTorneoEditando(t);
    setFormNombre(t.nombre || "");
    setFormJuego(t.juego || "One Piece TCG");
    setFormFormato(t.formato || "Estándar Suizo");
    setFormFecha(t.fecha || "");
    setFormLugar(t.lugar || "");
    setFormCosto(String(t.costoInscripcion ?? 0));
    setFormCupo(String(t.cupoMaximo ?? 16));
    setFormPremios(t.premios || "");
    setFormGastos(String(t.gastosEvento ?? 0));
    setFormEstado(t.estado || "proximo");
    setFormNotas(t.notas || "");
    setModalTorneoAbierto(true);
  }

  async function handleGuardarTorneo(e) {
    e.preventDefault();
    if (!formNombre.trim()) return;

    const registro = {
      ...(torneoEditando || {}),
      nombre: formNombre.trim(),
      juego: formJuego,
      formato: formFormato.trim(),
      fecha: formFecha,
      lugar: formLugar.trim(),
      costoInscripcion: Number(formCosto) || 0,
      cupoMaximo: Number(formCupo) || 16,
      premios: formPremios.trim(),
      gastosEvento: Number(formGastos) || 0,
      estado: formEstado,
      notas: formNotas.trim(),
    };

    const guardado = await guardarTorneo(registro);
    setModalTorneoAbierto(false);
    await cargarDatos();

    if (torneoDetalle && torneoDetalle.id === guardado.id) {
      setTorneoDetalle(guardado);
    }
  }

  async function handleEliminarTorneo(id) {
    if (!window.confirm("¿Estás seguro de eliminar este torneo?")) return;
    await eliminarTorneo(id);
    if (torneoDetalle?.id === id) setTorneoDetalle(null);
    await cargarDatos();
  }

  async function handleAgregarParticipante(e) {
    e.preventDefault();
    if (!torneoDetalle || !pNombre.trim()) return;

    const costo = Number(torneoDetalle.costoInscripcion || 0);
    const pagado = pMontoPagado === "" ? costo : Number(pMontoPagado);

    const participante = {
      nombre: pNombre.trim(),
      email: pEmail.trim(),
      telefono: pTelefono.trim(),
      deck: pDeck.trim(),
      puesto: pPuesto || "Participante",
      premioGanado: pPremioGanado.trim(),
      montoPagado: pagado,
      estadoPago: pEstadoPago,
      notas: pNotas.trim(),
    };

    const actualizado = await guardarParticipante(torneoDetalle.id, participante);
    if (actualizado) {
      setTorneoDetalle(actualizado);
      setPNombre("");
      setPEmail("");
      setPTelefono("");
      setPDeck("");
      setPPuesto("Participante");
      setPPremioGanado("");
      setPMontoPagado("");
      setPEstadoPago("pagado");
      setPNotas("");
      await cargarDatos();
    }
  }

  async function handleCambiarPuesto(p, nuevoPuesto) {
    if (!torneoDetalle) return;
    const actualizado = await guardarParticipante(torneoDetalle.id, {
      ...p,
      puesto: nuevoPuesto,
    });
    if (actualizado) {
      if (actualizado.productosPremios && actualizado.productosPremios.length > 0) {
        const conPremios = await asignarProductosPremiosTorneo(actualizado.id);
        setTorneoDetalle(conPremios || actualizado);
      } else {
        setTorneoDetalle(actualizado);
      }
      await cargarDatos();
    }
  }

  async function handleGuardarPremioManual(p, nuevoPremio) {
    if (!torneoDetalle) return;
    const actualizado = await guardarParticipante(torneoDetalle.id, {
      ...p,
      premioGanado: nuevoPremio.trim(),
    });
    if (actualizado) {
      setTorneoDetalle(actualizado);
      setEditandoPremioId(null);
      await cargarDatos();
    }
  }

  // --- HANDLER DE RIFA OBLIGATORIA & PREMIACIÓN OFICIAL ---
  async function handleSortearRifa() {
    if (!torneoDetalle) return;
    setSorteandoRifa(true);
    setNotifRifa("🎲 Sorteando 1 sobre de rifa entre los jugadores fuera del Top...");

    setTimeout(async () => {
      const res = await sortearRifaTorneo(torneoDetalle.id);
      setSorteandoRifa(false);
      if (res.error) {
        alert(res.error);
        setNotifRifa("");
        return;
      }
      setTorneoDetalle(res.torneo);
      setNotifRifa(`🎉 ¡Ganador del Sobre de Rifa: ${res.ganador.nickname || res.ganador.nombre} (Puesto #${res.ganador.puesto})!`);
      await cargarDatos();
      setTimeout(() => setNotifRifa(""), 6000);
    }, 600);
  }

  async function handleRecalcularPremiacionOficial() {
    if (!torneoDetalle) return;
    const actualizado = await aplicarPremiacionOficialTorneo(torneoDetalle.id);
    if (actualizado) {
      setTorneoDetalle(actualizado);
      await cargarDatos();
    }
  }

  async function handleCargarKitsMensuales() {
    const nuevoCat = await cargarKitsMensualesBandai();
    setCatalogoPremios(nuevoCat);
    alert("¡Se han cargado los 7 Kits Mensuales de Bandai con éxito (7 Sobres Winner + 56 Tournament Packs)!");
  }

  // --- HANDLERS DEL CATÁLOGO DE PREMIOS (INVENTARIO) ---
  function handleSubirFotoCatalogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen es mayor a 2MB. Por favor sube una imagen más ligera.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCatImagen(ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleGuardarItemCatalogo(e) {
    e.preventDefault();
    if (!catNombre.trim()) return;
    setGuardandoCatItem(true);
    const item = {
      nombre: catNombre.trim(),
      juego: catJuego,
      categoria: catCategoria,
      stock: Math.max(0, parseInt(catStock, 10) || 0),
      valorCop: Number(catValorCop) || 0,
      imagen: catImagen.trim(),
      notas: catNotas.trim(),
    };
    await guardarProductoCatalogo(item);
    const actualizado = await listarCatalogoPremios();
    setCatalogoPremios(actualizado);
    setCatNombre("");
    setCatStock("12");
    setCatValorCop("");
    setCatImagen("");
    setCatNotas("");
    setMostrarFormNuevoCat(false);
    setGuardandoCatItem(false);
  }

  async function handleEliminarItemCatalogo(id) {
    if (!window.confirm("¿Seguro de eliminar este producto del catálogo de premios?")) return;
    const actualizado = await eliminarProductoCatalogo(id);
    setCatalogoPremios(actualizado);
  }

  async function handleAjustarStock(id, delta) {
    const res = await ajustarStockCatalogo(id, delta);
    if (res) {
      setCatalogoPremios((prev) =>
        prev.map((item) => (item.id === id ? { ...item, stock: res.stock } : item))
      );
    }
  }

  // --- VINCULACIÓN DESDE CATÁLOGO AL TORNEO ---
  async function handleVincularPremioDesdeCatalogo(e) {
    e.preventDefault();
    if (!torneoDetalle) return;
    const catItem = catalogoPremios.find((c) => c.id === premioCatSeleccionadoId);
    if (!catItem) {
      alert("Por favor selecciona un producto del catálogo.");
      return;
    }

    const cant = Math.max(1, parseInt(premioCatCantidad, 10) || 1);
    const nuevoProd = {
      id: `torneo-premio-${Date.now()}`,
      catalogoId: catItem.id,
      nombre: catItem.nombre,
      juego: catItem.juego,
      categoria: catItem.categoria,
      imagen: catItem.imagen,
      puesto: premioCatPuesto,
      cantidad: cant,
      valorCop: catItem.valorCop || 0,
    };

    const listaActual = torneoDetalle.productosPremios || [];
    const nuevaLista = [...listaActual, nuevoProd];

    const actualizado = await guardarProductosPremiosTorneo(torneoDetalle.id, nuevaLista);
    if (actualizado) {
      setTorneoDetalle(actualizado);
      setTorneos((prev) => prev.map((t) => (t.id === actualizado.id ? actualizado : t)));
      setPremioCatSeleccionadoId("");
      setPremioCatCantidad("1");
      setMensajeProdPremio(`"${catItem.nombre}" vinculado a la premiación del torneo.`);
      setTimeout(() => setMensajeProdPremio(""), 4000);
    }
  }

  // Asignar premios y descontar automáticamente del stock del catálogo
  async function handleAsignarYDescontarStock() {
    if (!torneoDetalle) return;
    setDescontandoStock(true);
    setMensajeProdPremio("");
    const res = await asignarProductosPremiosTorneo(torneoDetalle.id, { descontarStock: true });
    if (res && res.torneo) {
      setTorneoDetalle(res.torneo);
      setTorneos((prev) => prev.map((t) => (t.id === res.torneo.id ? res.torneo : t)));

      // Recargar catálogo para actualizar números de stock en pantalla
      const catActualizado = await listarCatalogoPremios();
      setCatalogoPremios(catActualizado);

      if (res.itemsDescontados && res.itemsDescontados.length > 0) {
        const descTexto = res.itemsDescontados
          .map((i) => `${i.descontado}x ${i.nombre} (quedan ${i.stockRestante} en stock)`)
          .join(" • ");
        setMensajeProdPremio(`Premios asignados y descontados del inventario: ${descTexto}`);
      } else {
        setMensajeProdPremio("Premios asignados a los participantes según su puesto en el torneo.");
      }
      setTimeout(() => setMensajeProdPremio(""), 6000);
    }
    setDescontandoStock(false);
  }

  function handleSubirFotoProducto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen es mayor a 2MB. Por favor sube una imagen más ligera.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProdImagen(ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleAgregarProductoPremio(e) {
    e.preventDefault();
    if (!torneoDetalle || !prodNombre.trim()) return;

    setGuardandoProducto(true);
    const nuevoProd = {
      id: `prod-${Date.now()}`,
      nombre: prodNombre.trim(),
      puesto: prodPuesto,
      cantidad: Math.max(1, parseInt(prodCantidad, 10) || 1),
      imagen: prodImagen || "",
      valorCop: Number(prodValorCop) || 0,
    };

    const listaActual = torneoDetalle.productosPremios || [];
    const nuevaLista = [...listaActual, nuevoProd];

    const actualizado = await guardarProductosPremiosTorneo(torneoDetalle.id, nuevaLista);
    if (actualizado) {
      setTorneoDetalle(actualizado);
      setTorneos((prev) => prev.map((t) => (t.id === actualizado.id ? actualizado : t)));
      setProdNombre("");
      setProdPuesto("1");
      setProdCantidad("1");
      setProdImagen("");
      setProdValorCop("");
      setMensajeProdPremio("Producto agregado a la premiación del torneo.");
      setTimeout(() => setMensajeProdPremio(""), 4000);
    }
    setGuardandoProducto(false);
  }

  async function handleEliminarProductoPremio(prodId) {
    if (!torneoDetalle) return;
    const listaActual = torneoDetalle.productosPremios || [];
    const nuevaLista = listaActual.filter((p) => p.id !== prodId);

    const actualizado = await guardarProductosPremiosTorneo(torneoDetalle.id, nuevaLista);
    if (actualizado) {
      setTorneoDetalle(actualizado);
      setTorneos((prev) => prev.map((t) => (t.id === actualizado.id ? actualizado : t)));
    }
  }

  async function handleAsignarProductosPremios() {
    if (!torneoDetalle) return;
    setAsignandoProductos(true);
    setMensajeProdPremio("");
    const res = await asignarProductosPremiosTorneo(torneoDetalle.id, { descontarStock: false });
    const actualizado = res?.torneo || res;
    if (actualizado) {
      setTorneoDetalle(actualizado);
      setTorneos((prev) => prev.map((t) => (t.id === actualizado.id ? actualizado : t)));
      setMensajeProdPremio("Productos asignados a los ganadores según su puesto (sin descontar stock).");
      setTimeout(() => setMensajeProdPremio(""), 5000);
    }
    setAsignandoProductos(false);
  }

  async function handleEliminarParticipante(pId) {
    if (!torneoDetalle) return;
    const actualizado = await eliminarParticipante(torneoDetalle.id, pId);
    if (actualizado) {
      setTorneoDetalle(actualizado);
      await cargarDatos();
    }
  }

  async function handleCambiarEstadoPago(p, nuevoEstado) {
    if (!torneoDetalle) return;
    const costo = Number(torneoDetalle.costoInscripcion || 0);
    let nuevoPagado = p.montoPagado;
    if (nuevoEstado === "pagado") nuevoPagado = costo;
    if (nuevoEstado === "debe") nuevoPagado = 0;

    const actualizado = await guardarParticipante(torneoDetalle.id, {
      ...p,
      montoPagado: nuevoPagado,
      estadoPago: nuevoEstado,
    });
    if (actualizado) {
      setTorneoDetalle(actualizado);
      await cargarDatos();
    }
  }

  // Filtrado de torneos
  const torneosFiltrados = torneos.filter((t) => {
    if (filtroJuego !== "todos" && t.juego !== filtroJuego) return false;
    if (filtroEstado !== "todos" && t.estado !== filtroEstado) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const match =
        (t.nombre || "").toLowerCase().includes(q) ||
        (t.lugar || "").toLowerCase().includes(q) ||
        (t.formato || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Métricas globales
  const metricasGlobales = torneos.reduce(
    (acc, t) => {
      const m = calcularMetricasTorneo(t);
      acc.totalJugadores += m.totalInscritos;
      acc.totalRecaudado += m.totalRecaudado;
      acc.totalDeuda += m.totalDeuda;
      acc.totalGanancia += m.gananciaNeta;
      if (t.estado === "proximo" || t.estado === "en_curso") acc.torneosActivos++;
      return acc;
    },
    { torneosActivos: 0, totalJugadores: 0, totalRecaudado: 0, totalDeuda: 0, totalGanancia: 0 }
  );

  function formatearFecha(iso) {
    if (!iso) return "Fecha por definir";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("es-CO", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  function getJuegoBadge(juego) {
    if (!juego) return "OP TCG";
    if (juego.includes("Riftbound")) return "RIFT";
    return "OP TCG";
  }

  return (
    <div className="torneos-page-view">
      {/* HEADER DE MÓDULO */}
      <div className="torneos-header-banner">
        <div className="torneos-header-left">
          <h1 className="torneos-main-title">Torneos</h1>
        </div>

        <div className="torneos-header-actions">
          <Link
            to="/admin/clientes"
            className="btn-ver-clientes"
          >
            <Users size={16} />
            <span>Clientes</span>
          </Link>
          <button
            type="button"
            className="btn-catalogo-premios"
            onClick={() => setModalCatalogoAbierto(true)}
            title="Inventario y catálogo general de premios para torneos"
          >
            <Package size={16} />
            <span>Catálogo de Premios</span>
            {catalogoPremios.length > 0 && (
              <span className="badge-cat-count">{catalogoPremios.length}</span>
            )}
          </button>
          <button
            type="button"
            className="btn-prizewall-banner"
            onClick={() => setModalPrizeWallAbierto(true)}
            title="Muro de Premios (Prize Wall): Canjea productos exclusivos con tus CC Coins ganadas por victorias"
          >
            <Coins size={16} />
            <span>Muro de Premios (Prize Wall)</span>
            <span className="badge-prizewall-chip">1 Win = 1 CC Coin</span>
          </button>
          <button
            type="button"
            className="btn-importar-bandai"
            onClick={() => abrirModalImportar(null)}
          >
            <Sparkles size={16} />
            <span>Importar Torneo</span>
          </button>
          <button
            type="button"
            className="btn-nuevo-torneo"
            onClick={abrirModalCrear}
          >
            <Plus size={16} />
            <span>Crear Torneo</span>
          </button>
        </div>
      </div>

      {/* METRIC CARDS SUPERIORES */}
      <div className="torneos-kpi-grid">
        <div className="torneo-kpi-card">
          <div className="kpi-icon-wrap">
            <Calendar size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Eventos Activos</span>
            <strong className="kpi-val">{metricasGlobales.torneosActivos}</strong>
          </div>
        </div>

        <div className="torneo-kpi-card">
          <div className="kpi-icon-wrap">
            <Users size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Jugadores Inscritos</span>
            <strong className="kpi-val">{metricasGlobales.totalJugadores}</strong>
          </div>
        </div>

        <div className="torneo-kpi-card">
          <div className="kpi-icon-wrap">
            <CreditCard size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Recaudado</span>
            <strong className="kpi-val">${metricasGlobales.totalRecaudado.toLocaleString("es-CO")} COP</strong>
          </div>
        </div>

        <div className="torneo-kpi-card">
          <div className="kpi-icon-wrap">
            <TrendingUp size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Ganancia Neta Est.</span>
            <strong className="kpi-val">${metricasGlobales.totalGanancia.toLocaleString("es-CO")} COP</strong>
          </div>
        </div>
      </div>

      {/* TOOLBAR DE FILTROS */}
      <div className="torneos-filter-toolbar">
        {/* Filtro por juego */}
        <div className="torneos-game-chips">
          {JUEGOS_FILTRO.map((j) => (
            <button
              key={j.id}
              type="button"
              className={`chip-game-btn ${filtroJuego === j.id ? "active" : ""}`}
              onClick={() => setFiltroJuego(j.id)}
            >
              <span className="chip-badge">{j.badge}</span>
              <span>{j.label}</span>
            </button>
          ))}
        </div>

        {/* Filtro por estado y buscador */}
        <div className="torneos-toolbar-controls">
          <div className="torneo-search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar torneo por nombre, formato o sede..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button
                type="button"
                className="btn-clear"
                onClick={() => setBusqueda("")}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="torneo-status-tabs">
            <button
              type="button"
              className={`status-tab ${filtroEstado === "todos" ? "active" : ""}`}
              onClick={() => setFiltroEstado("todos")}
            >
              Todos
            </button>
            <button
              type="button"
              className={`status-tab ${filtroEstado === "proximo" ? "active" : ""}`}
              onClick={() => setFiltroEstado("proximo")}
            >
              Próximos
            </button>
            <button
              type="button"
              className={`status-tab ${filtroEstado === "en_curso" ? "active" : ""}`}
              onClick={() => setFiltroEstado("en_curso")}
            >
              En Curso
            </button>
            <button
              type="button"
              className={`status-tab ${filtroEstado === "finalizado" ? "active" : ""}`}
              onClick={() => setFiltroEstado("finalizado")}
            >
              Finalizados
            </button>
          </div>
        </div>
      </div>

      {/* LISTA / GRID DE TORNEOS */}
      {cargando ? (
        <div className="torneos-empty-state">
          <p>Cargando torneos y eventos...</p>
        </div>
      ) : torneosFiltrados.length === 0 ? (
        <div className="torneos-empty-state">
          <Trophy size={42} className="empty-icon" />
          <h3>No se encontraron torneos</h3>
          <p>No hay eventos registrados para los filtros seleccionados.</p>
          <button
            type="button"
            className="btn-nuevo-torneo"
            onClick={abrirModalCrear}
          >
            <Plus size={15} />
            <span>Crear el primer torneo</span>
          </button>
        </div>
      ) : (
        <div className="torneos-grid">
          {torneosFiltrados.map((t) => {
            const m = calcularMetricasTorneo(t);
            const badge = getJuegoBadge(t.juego);
            const inscripcionCop = (t.costoInscripcion || 0).toLocaleString("es-CO");

            return (
              <div key={t.id} className="torneo-card">
                {/* Cabecera de la tarjeta */}
                <div className="torneo-card-header">
                  <div className="torneo-badges-row">
                    <span className="badge-franchise">{badge}</span>
                    <span className={`badge-status status-${t.estado}`}>
                      {t.estado === "proximo"
                        ? "Próximo"
                        : t.estado === "en_curso"
                        ? "En Curso"
                        : t.estado === "finalizado"
                        ? "Finalizado"
                        : "Cancelado"}
                    </span>
                  </div>

                  {/* Acciones de administración en tarjeta */}
                  <div className="torneo-card-admin-actions">
                    <button
                      type="button"
                      className="btn-icon-action"
                      onClick={() => abrirModalEditar(t)}
                      title="Editar torneo"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon-action delete"
                      onClick={() => handleEliminarTorneo(t.id)}
                      title="Eliminar torneo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Título y formato */}
                <h3 className="torneo-card-title">{t.nombre}</h3>
                <p className="torneo-card-format">
                  <Sparkles size={13} />
                  <span>{t.formato || "Formato oficial"}</span>
                </p>

                {/* Info de Fecha y Lugar */}
                <div className="torneo-info-rows">
                  <div className="info-row">
                    <Calendar size={14} className="info-icon" />
                    <span>{formatearFecha(t.fecha)}</span>
                  </div>
                  <div className="info-row">
                    <MapPin size={14} className="info-icon" />
                    <span className="truncate">{t.lugar || "Capsule Corp Gaming - Cali"}</span>
                  </div>
                </div>

                {/* Barra de Cupos */}
                <div className="torneo-cupos-section">
                  <div className="cupos-labels">
                    <span>
                      <strong>{m.totalInscritos}</strong> / {t.cupoMaximo} participantes
                    </span>
                    <span className="cupos-left">
                      {m.cuposDisponibles > 0 ? `${m.cuposDisponibles} disponibles` : "Cupos llenos"}
                    </span>
                  </div>
                  <div className="cupos-bar-track">
                    <div
                      className="cupos-bar-fill"
                      style={{ width: `${m.porcentajeLleno}%` }}
                    />
                  </div>
                </div>

                {/* Premios y costo */}
                <div className="torneo-pricing-footer">
                  <div className="pricing-box">
                    <span className="pricing-label">Inscripción</span>
                    <span className="pricing-val">${inscripcionCop} COP</span>
                  </div>

                  <div className="recaudo-box">
                    <span className="pricing-label">Recaudado</span>
                    <span className="recaudo-val">${m.totalRecaudado.toLocaleString("es-CO")} COP</span>
                  </div>
                </div>

                {t.premios && (
                  <div className="torneo-premios-snippet">
                    <strong>Premios:</strong> {t.premios}
                  </div>
                )}

                {t.productosPremios && t.productosPremios.length > 0 && (
                  <div className="torneo-card-prize-prods">
                    <span className="tcpp-title">
                      <Gift size={12} />
                      <span>Premios en Producto:</span>
                    </span>
                    <div className="tcpp-chips">
                      {t.productosPremios.slice(0, 3).map((pr) => (
                        <span key={pr.id} className="tcpp-chip" title={`${pr.nombre} (${pr.puesto === 'todos' ? 'Todos' : pr.puesto + '° Lugar'})`}>
                          {pr.imagen ? (
                            <img src={pr.imagen} alt={pr.nombre} className="tcpp-thumb" />
                          ) : (
                            <Package size={11} />
                          )}
                          <span>{pr.puesto === "todos" ? "Todos" : `${pr.puesto}°`}: {pr.cantidad > 1 ? `${pr.cantidad}x ` : ""}{pr.nombre}</span>
                        </span>
                      ))}
                      {t.productosPremios.length > 3 && (
                        <span className="tcpp-more">+{t.productosPremios.length - 3} más</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Botones de Acción */}
                <div className="torneo-card-actions">
                  <button
                    type="button"
                    className="btn-torneo-manage"
                    onClick={() => {
                      setTorneoDetalle(t);
                      setTabGestionTorneo("participantes");
                    }}
                  >
                    <Users size={15} />
                    <span>Gestionar Jugadores ({m.totalInscritos})</span>
                  </button>

                  <a
                    href={`https://wa.me/573123456789?text=${encodeURIComponent(
                      `¡Hola Capsule Corp Gaming! Quisiera inscribirme al torneo "${t.nombre}" del ${formatearFecha(t.fecha)}.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-torneo-whatsapp"
                    title="Inscribirme por WhatsApp"
                  >
                    <MessageCircle size={15} />
                    <span>Inscribir</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: GESTIÓN DE PARTICIPANTES, PAGOS Y DEUDAS        */}
      {/* ========================================================= */}
      {torneoDetalle && (
        <div className="torneo-modal-backdrop" onClick={() => setTorneoDetalle(null)}>
          <div
            className="torneo-modal-dialog modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="torneo-modal-header">
              <div>
                <span className="modal-badge">{torneoDetalle.juego}</span>
                <h2 className="modal-title">{torneoDetalle.nombre}</h2>
                <p className="modal-subtitle">
                  {formatearFecha(torneoDetalle.fecha)} • {torneoDetalle.lugar}
                </p>
              </div>
              <div className="torneo-modal-header-actions">
                <button
                  type="button"
                  className="btn-import-table-btn"
                  onClick={() => abrirModalImportar(torneoDetalle)}
                  title="Importar resultados oficiales desde Bandai TCG+ o captura"
                >
                  <Sparkles size={14} />
                  <span>Importar Tabla Bandai</span>
                </button>
                <button
                  type="button"
                  className="btn-modal-close"
                  onClick={() => setTorneoDetalle(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Contenido modal */}
            <div className="torneo-modal-body">
              {/* Resumen financiero del torneo */}
              {(() => {
                const m = calcularMetricasTorneo(torneoDetalle);
                return (
                  <div className="modal-metrics-banner">
                    <div className="m-metric-box">
                      <span className="m-label">Inscripción Oficial</span>
                      <strong className="m-val">${(torneoDetalle.costoInscripcion || 0).toLocaleString("es-CO")} COP</strong>
                    </div>
                    <div className="m-metric-box">
                      <span className="m-label">Total Recaudado</span>
                      <strong className="m-val text-green">${m.totalRecaudado.toLocaleString("es-CO")} COP</strong>
                    </div>
                    <div className="m-metric-box">
                      <span className="m-label">Por Cobrar (Deuda)</span>
                      <strong className="m-val text-amber">${m.totalDeuda.toLocaleString("es-CO")} COP</strong>
                    </div>
                    <div className="m-metric-box">
                      <span className="m-label">Gastos del Torneo</span>
                      <strong className="m-val text-rose">${m.gastos.toLocaleString("es-CO")} COP</strong>
                    </div>
                    <div className="m-metric-box highlight">
                      <span className="m-label">Ganancia Neta</span>
                      <strong className="m-val text-cyan">${m.gananciaNeta.toLocaleString("es-CO")} COP</strong>
                    </div>
                  </div>
                );
              })()}

              {/* Banner de Modelo Oficial de Premiación 100% Retorno & CC Coins */}
              {(() => {
                const calculoPremios = calcularPremiacionOficialOnePiece(
                  torneoDetalle.participantes?.length || 0,
                  torneoDetalle.participantes || []
                );
                return (
                  <div className="torneo-economic-pool-card">
                    <div className="tep-header">
                      <div className="tep-title-group">
                        <div className="tep-icon-wrap">
                          <Coins size={20} />
                        </div>
                        <div>
                          <div className="tep-title-row">
                            <strong>Modelo Oficial de Premiación • 100% Retorno</strong>
                            <span className="badge-tep-guarantee">
                              <CheckCircle2 size={13} />
                              <span>100% de la Inscripción en Premios</span>
                            </span>
                          </div>
                          <p>
                            Inscripción de ${calculoPremios.costoInscripcionUnitario.toLocaleString("es-CO")} COP por jugador entregada íntegramente en premios: 1 victoria = 1 CC Coin ($2.000 COP) para el Prize Wall y el saldo restante financia el pool de sobres oficiales de tienda y la rifa.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="tep-grid">
                      <div className="tep-col">
                        <span className="tep-label">Recaudo Total ({calculoPremios.numJugadores} jugadores)</span>
                        <strong className="tep-value">${calculoPremios.totalInscripcionCOP.toLocaleString("es-CO")} COP</strong>
                        <small className="tep-sub">Inscripción $26.000 COP c/u</small>
                      </div>

                      <div className="tep-col highlight-coins">
                        <span className="tep-label">Asignado a CC Coins (Prize Wall)</span>
                        <strong className="tep-value">${calculoPremios.montoCcCoinsCOP.toLocaleString("es-CO")} COP</strong>
                        <small className="tep-sub">🪙 {calculoPremios.totalWins} Wins acumuladas ($2.000 COP/win)</small>
                      </div>

                      <div className="tep-col highlight-packs">
                        <span className="tep-label">Pozo Restante en Sobres Tienda</span>
                        <strong className="tep-value">${calculoPremios.poolRestanteCOP.toLocaleString("es-CO")} COP</strong>
                        <small className="tep-sub">📦 {calculoPremios.totalSobresTienda} Sobres ({calculoPremios.sobresRifa} Rifa + {calculoPremios.sobresTop} Top {calculoPremios.puestosPremiados})</small>
                      </div>

                      <div className="tep-col">
                        <span className="tep-label">Kits Bandai Oficiales</span>
                        <strong className="tep-value">1 Winner + {calculoPremios.numJugadores} Packs</strong>
                        <small className="tep-sub">1 Winner Pack (1°) + Tournament Packs (Todos)</small>
                      </div>
                    </div>

                    <div className="tep-footer-bar">
                      <span className="tep-footer-note">
                        Total entregado a jugadores: <strong>${calculoPremios.retornoPremiosTotalCOP.toLocaleString("es-CO")} COP</strong> ({calculoPremios.porcentajeRetorno}% exacto del recaudo).
                      </span>
                      <button
                        type="button"
                        className="btn-open-pw-inline"
                        onClick={() => setModalPrizeWallAbierto(true)}
                      >
                        <Coins size={14} />
                        <span>Abrir Muro de Premios (Prize Wall)</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Pestañas de Gestión del Torneo */}
              <div className="torneo-modal-tabs">
                <button
                  type="button"
                  className={`torneo-tab-btn ${tabGestionTorneo === "participantes" ? "active" : ""}`}
                  onClick={() => setTabGestionTorneo("participantes")}
                >
                  <Users size={15} />
                  <span>Participantes ({torneoDetalle.participantes?.length || 0})</span>
                </button>

                <button
                  type="button"
                  className={`torneo-tab-btn ${tabGestionTorneo === "productos_premios" ? "active" : ""}`}
                  onClick={() => setTabGestionTorneo("productos_premios")}
                >
                  <Gift size={15} />
                  <span>
                    Premios & Catálogo
                    {torneoDetalle.productosPremios?.length > 0 && (
                      <span className="tab-counter-badge">{torneoDetalle.productosPremios.length}</span>
                    )}
                  </span>
                </button>
              </div>

              {/* ========================================================= */}
              {/* APARTADO DE PREMIOS & CATÁLOGO DE INVENTARIO              */}
              {/* ========================================================= */}
              {tabGestionTorneo === "productos_premios" && (
                <div className="torneo-prize-products-container">
                  <div className="prize-products-header-row">
                    <div>
                      <div className="pp-title-with-badge">
                        <h4 className="pp-title">Premios del Torneo (Catálogo de Inventario)</h4>
                        {torneoDetalle.stockPremiosDescontado && (
                          <span className="badge-stock-descontado-ok" title="El stock ya fue descontado automáticamente del catálogo">
                            <Check size={13} /> Stock descontado en catálogo
                          </span>
                        )}
                      </div>
                      <p className="pp-subtitle">
                        Selecciona los productos directamente del catálogo general. Al asignar la premiación, las unidades se descuentan en automático del inventario.
                      </p>
                    </div>

                    <div className="pp-header-actions">
                      <button
                        type="button"
                        className="btn-abrir-cat-modal"
                        onClick={() => setModalCatalogoAbierto(true)}
                        title="Abrir el catálogo general para agregar productos o ajustar stock"
                      >
                        <Package size={15} />
                        <span>Abrir Catálogo ({catalogoPremios.length})</span>
                      </button>
                      <button
                        type="button"
                        className="btn-asignar-descontar-primary"
                        onClick={handleAsignarYDescontarStock}
                        disabled={descontandoStock || !torneoDetalle.productosPremios || torneoDetalle.productosPremios.length === 0}
                        title="Asigna los premios a los participantes y descuenta las unidades del inventario del catálogo"
                      >
                        <Sparkles size={15} />
                        <span>{descontandoStock ? "Descontando stock…" : "Asignar y Descontar Stock"}</span>
                      </button>
                    </div>
                  </div>

                  {mensajeProdPremio && (
                    <div className="pp-success-toast">
                      <CheckCircle2 size={16} />
                      <span>{mensajeProdPremio}</span>
                    </div>
                  )}

                  {/* Selector y Vinculación desde el Catálogo */}
                  <form onSubmit={handleVincularPremioDesdeCatalogo} className="prize-catalog-link-box">
                    <div className="pcl-title-row">
                      <span className="pcl-label">Seleccionar Producto del Catálogo de Premios:</span>
                      <button
                        type="button"
                        className="btn-link-nuevo-cat"
                        onClick={() => setModalCatalogoAbierto(true)}
                      >
                        + Crear nuevo producto en catálogo
                      </button>
                    </div>

                    <div className="pcl-form-grid">
                      <div className="pcl-select-wrap">
                        <select
                          className="pcl-product-select"
                          value={premioCatSeleccionadoId}
                          onChange={(e) => setPremioCatSeleccionadoId(e.target.value)}
                        >
                          <option value="">-- Seleccionar producto del catálogo general --</option>
                          {catalogoPremios.map((cp) => (
                            <option key={cp.id} value={cp.id}>
                              {cp.nombre} — Stock: {cp.stock} ({cp.categoria} • {cp.juego})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="pcl-puesto-wrap">
                        <select
                          value={premioCatPuesto}
                          onChange={(e) => setPremioCatPuesto(e.target.value)}
                        >
                          <option value="1">🏆 1° Lugar (Campeón)</option>
                          <option value="2">🥈 2° Lugar (Subcampeón)</option>
                          <option value="3">🥉 3° Lugar</option>
                          <option value="4">⭐ 4° Lugar</option>
                          <option value="top4">🎖️ Top 4 (Puestos 1 al 4)</option>
                          <option value="top8">🎖️ Top 8 (Puestos 1 al 8)</option>
                          <option value="todos">🎁 Todos los Participantes (Asistencia)</option>
                        </select>
                      </div>

                      <div className="pcl-cant-wrap">
                        <input
                          type="number"
                          min="1"
                          placeholder="Cant."
                          value={premioCatCantidad}
                          onChange={(e) => setPremioCatCantidad(e.target.value)}
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn-vincular-cat-prize"
                        disabled={!premioCatSeleccionadoId}
                      >
                        <Plus size={15} />
                        <span>Vincular Premio</span>
                      </button>
                    </div>

                    {/* Previsualización del ítem de catálogo seleccionado */}
                    {(() => {
                      const selItem = catalogoPremios.find((c) => c.id === premioCatSeleccionadoId);
                      if (!selItem) return null;
                      return (
                        <div className="pcl-preview-banner">
                          <div className="pcl-preview-thumb">
                            {selItem.imagen ? (
                              <img src={selItem.imagen} alt={selItem.nombre} />
                            ) : (
                              <Package size={20} />
                            )}
                          </div>
                          <div className="pcl-preview-info">
                            <strong>{selItem.nombre}</strong>
                            <span>
                              Categoría: {selItem.categoria} • Juego: {selItem.juego}
                              {selItem.valorCop > 0 && ` • Valor Est.: $${Number(selItem.valorCop).toLocaleString("es-CO")} COP`}
                            </span>
                          </div>
                          <div className="pcl-preview-stock">
                            <span className={`cat-stock-pill ${selItem.stock > 0 ? "has-stock" : "no-stock"}`}>
                              Stock en inventario: <strong>{selItem.stock} unidades</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </form>

                  {/* Grilla de productos ya vinculados a este torneo */}
                  <div className="prize-products-list-wrapper">
                    <div className="pp-list-header">
                      <h5>Premios Configurados para este Torneo ({torneoDetalle.productosPremios?.length || 0})</h5>
                      <span className="pp-list-counter">
                        {torneoDetalle.participantes?.length || 0} jugadores inscritos
                      </span>
                    </div>

                    {(!torneoDetalle.productosPremios || torneoDetalle.productosPremios.length === 0) ? (
                      <div className="pp-empty-state">
                        <Package size={34} />
                        <p>Aún no has vinculado productos de premiación a este torneo.</p>
                        <small>Selecciona arriba un producto del catálogo (cajas, sobres, cartas promo) para asignarlo automáticamente a los ganadores.</small>
                      </div>
                    ) : (
                      <>
                        <div className="prize-products-grid">
                          {torneoDetalle.productosPremios.map((prod) => {
                            const puestoLabel =
                              prod.puesto === "1" ? "🏆 1° Lugar" :
                              prod.puesto === "2" ? "🥈 2° Lugar" :
                              prod.puesto === "3" ? "🥉 3° Lugar" :
                              prod.puesto === "4" ? "⭐ 4° Lugar" :
                              prod.puesto === "top4" ? "🎖️ Top 4" :
                              prod.puesto === "top8" ? "🎖️ Top 8" :
                              prod.puesto === "todos" ? "🎁 Todos los participantes" :
                              `Puesto ${prod.puesto}`;

                            const catProd = catalogoPremios.find(
                              (c) => c.id === prod.catalogoId || c.nombre.toLowerCase().trim() === prod.nombre.toLowerCase().trim()
                            );

                            return (
                              <div key={prod.id} className="prize-product-card">
                                <div className="pp-card-thumb-wrap">
                                  {prod.imagen ? (
                                    <img src={prod.imagen} alt={prod.nombre} className="pp-card-thumb-img" />
                                  ) : (
                                    <div className="pp-card-thumb-fallback">
                                      <Package size={22} />
                                    </div>
                                  )}
                                  <span className="pp-card-qty-badge">{prod.cantidad}x</span>
                                </div>

                                <div className="pp-card-details">
                                  <span className="pp-card-puesto-tag">{puestoLabel}</span>
                                  <strong className="pp-card-name" title={prod.nombre}>{prod.nombre}</strong>
                                  <div className="pp-card-meta-row">
                                    {catProd ? (
                                      <span className="pp-card-cat-stock">
                                        Stock en catálogo: <strong>{catProd.stock}</strong>
                                      </span>
                                    ) : (
                                      prod.valorCop > 0 && (
                                        <span className="pp-card-valor">
                                          ${Number(prod.valorCop).toLocaleString("es-CO")} COP
                                        </span>
                                      )
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className="btn-del-prize-prod"
                                  onClick={() => handleEliminarProductoPremio(prod.id)}
                                  title="Quitar este producto de la premiación de este torneo"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Barra de acción para descontar stock */}
                        <div className="pp-action-footer-bar">
                          <div className="pp-af-info">
                            <strong>Descuento automático de inventario:</strong>
                            <span>Al pulsar el botón se asignan los premios a los ganadores según su puesto y se descuentan las unidades correspondientes del catálogo.</span>
                          </div>

                          <div className="pp-af-btns">
                            <button
                              type="button"
                              className="btn-asignar-sin-descontar"
                              onClick={handleAsignarProductosPremios}
                              disabled={asignandoProductos}
                              title="Asigna los premios en texto sin alterar el stock del catálogo"
                            >
                              Solo Asignar sin Descontar
                            </button>
                            <button
                              type="button"
                              className="btn-asignar-descontar-primary"
                              onClick={handleAsignarYDescontarStock}
                              disabled={descontandoStock}
                              title="Asigna los premios y descuenta las unidades del inventario"
                            >
                              <Sparkles size={15} />
                              <span>{descontandoStock ? "Descontando stock…" : "Asignar y Descontar del Catálogo"}</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* PESTAÑA: PARTICIPANTES */}
              {tabGestionTorneo === "participantes" && (
                <>
                  {/* Formulario para inscribir participante */}
                  <div className="torneo-add-player-box">
                <h4 className="section-subtitle">
                  <Plus size={15} />
                  <span>Registrar nuevo participante</span>
                </h4>

                <form onSubmit={handleAgregarParticipante} className="add-player-form">
                  <div className="form-cols-row">
                    <label className="form-field">
                      <span>Nombre o Nickname Bandai *</span>
                      <input
                        type="text"
                        placeholder="Ej: Carlos Méndez / Mugiwara99"
                        value={pNombre}
                        onChange={(e) => setPNombre(e.target.value)}
                        required
                      />
                    </label>

                    <label className="form-field">
                      <span>Correo (Para anexar a su perfil)</span>
                      <input
                        type="email"
                        placeholder="ejemplo@correo.com"
                        value={pEmail}
                        onChange={(e) => setPEmail(e.target.value)}
                      />
                    </label>

                    <label className="form-field">
                      <span>Teléfono / WhatsApp</span>
                      <input
                        type="text"
                        placeholder="Ej: 3101234567"
                        value={pTelefono}
                        onChange={(e) => setPTelefono(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="form-cols-row">
                    <label className="form-field">
                      <span>Mazo / Arquetipo</span>
                      <input
                        type="text"
                        placeholder="Ej: Luffy Red-Purple / Charizard ex"
                        value={pDeck}
                        onChange={(e) => setPDeck(e.target.value)}
                      />
                    </label>

                    <label className="form-field">
                      <span>Puesto en el Torneo</span>
                      <select
                        value={pPuesto}
                        onChange={(e) => setPPuesto(e.target.value)}
                      >
                        <option value="Participante">Participante</option>
                        <option value="1">1° Lugar (Campeón)</option>
                        <option value="2">2° Lugar (Subcampeón)</option>
                        <option value="3">3° Lugar</option>
                        <option value="4">4° Lugar</option>
                        <option value="Top 8">Top 8</option>
                        <option value="Top 16">Top 16</option>
                      </select>
                    </label>

                    <label className="form-field">
                      <span>Premio Ganado (Opcional)</span>
                      <input
                        type="text"
                        placeholder="Ej: $210.000 COP + 1 Box"
                        value={pPremioGanado}
                        onChange={(e) => setPPremioGanado(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="form-cols-row">
                    <label className="form-field">
                      <span>Monto Pagado (COP)</span>
                      <input
                        type="number"
                        placeholder={String(torneoDetalle.costoInscripcion || 0)}
                        value={pMontoPagado}
                        onChange={(e) => setPMontoPagado(e.target.value)}
                      />
                    </label>

                    <label className="form-field">
                      <span>Estado del pago</span>
                      <select
                        value={pEstadoPago}
                        onChange={(e) => setPEstadoPago(e.target.value)}
                      >
                        <option value="pagado">Pagado Completo</option>
                        <option value="abono">Abono Parcial</option>
                        <option value="debe">Pendiente (Debe)</option>
                      </select>
                    </label>

                    <label className="form-field">
                      <span>Notas adicionales</span>
                      <input
                        type="text"
                        placeholder="Ej: Paga en efectivo al llegar"
                        value={pNotas}
                        onChange={(e) => setPNotas(e.target.value)}
                      />
                    </label>
                  </div>

                  <button type="submit" className="btn-add-player">
                    <Plus size={15} />
                    <span>Inscribir Jugador</span>
                  </button>
                </form>
              </div>

              {/* Tabla de participantes */}
              <div className="torneo-players-table-wrapper">
                <div className="table-header-title">
                  <div>
                    <h4>Lista de Participantes ({torneoDetalle.participantes?.length || 0})</h4>
                    <span className="table-subtitle">Asigna el puesto y estado de pago de cada jugador para sincronizarlo con su perfil</span>
                  </div>
                  <div className="table-header-actions-right">
                    <button
                      type="button"
                      className="btn-recalc-premios-btn"
                      onClick={handleRecalcularPremiacionOficial}
                      title="Aplica la premiación oficial: Sobres al Top según cantidad de jugadores, Winner al 1° y Tournament Packs"
                    >
                      <Sparkles size={14} />
                      <span>Aplicar Premiación Oficial</span>
                    </button>
                  </div>
                </div>

                {/* BARRA DE RIFA OBLIGATORIA */}
                <div className="torneo-rifa-bar">
                  <div className="trb-info">
                    <Gift size={20} className="text-accent" />
                    <div>
                      <strong>Sobre de Rifa Oficial (1 Sobre de Tienda)</strong>
                      <p>
                        Obligatorio en cada torneo. Se sortea exclusivamente entre los participantes que no quedaron en el Top premiado.
                      </p>
                    </div>
                  </div>

                  <div className="trb-action-wrap">
                    {torneoDetalle.ganadorRifa ? (
                      <div className="trb-winner-pill">
                        <Sparkles size={14} className="text-accent" />
                        <span>
                          Ganador: <strong>{torneoDetalle.ganadorRifa.nickname || torneoDetalle.ganadorRifa.nombre}</strong> (Puesto #{torneoDetalle.ganadorRifa.puesto || "-"})
                        </span>
                        <button
                          type="button"
                          className="btn-re-sortear"
                          onClick={handleSortearRifa}
                          disabled={sorteandoRifa}
                        >
                          <RefreshCw size={12} className={sorteandoRifa ? "spin" : ""} />
                          <span>Re-sortear</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-sortear-rifa-primary"
                        onClick={handleSortearRifa}
                        disabled={sorteandoRifa || !torneoDetalle.participantes || torneoDetalle.participantes.length === 0}
                      >
                        <Sparkles size={14} />
                        <span>{sorteandoRifa ? "Sorteando..." : "🎲 Sortear Sobre de Rifa"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {notifRifa && (
                  <div className="trb-notification-banner">
                    <CheckCircle2 size={16} />
                    <span>{notifRifa}</span>
                  </div>
                )}

                {(!torneoDetalle.participantes || torneoDetalle.participantes.length === 0) ? (
                  <p className="no-players-notice">Aún no hay jugadores registrados en este torneo.</p>
                ) : (
                  <table className="torneo-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Jugador / Perfil</th>
                        <th>Puesto</th>
                        <th>Victorias (Wins)</th>
                        <th>🪙 CC Coins</th>
                        <th>Mazo</th>
                        <th>Premio Total Ganado</th>
                        <th>Pagado</th>
                        <th>Deuda</th>
                        <th>Estado Pago</th>
                        <th style={{ textAlign: "right" }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {torneoDetalle.participantes.map((p, idx) => {
                        const costo = Number(torneoDetalle.costoInscripcion || 0);
                        const pagado = Number(p.montoPagado || 0);
                        const pendiente = Math.max(0, costo - pagado);

                        const pVal = String(p.puesto || "Participante");
                        const es1 = pVal === "1" || pVal.includes("1°");
                        const es2 = pVal === "2" || pVal.includes("2°");
                        const es3 = pVal === "3" || pVal.includes("3°");
                        const es4 = pVal === "4" || pVal.includes("4°");

                        const playerWins = p.wins !== undefined && p.wins !== null
                          ? Number(p.wins)
                          : Math.floor((Number(p.puntos) || 0) / 3);
                        const playerCoins = p.ccCoins !== undefined && p.ccCoins !== null
                          ? Number(p.ccCoins)
                          : playerWins;

                        return (
                          <tr key={p.id}>
                            <td className="col-idx">{idx + 1}</td>
                            <td className="col-name">
                              <div className="player-name-cell">
                                <strong>{p.nombre}</strong>
                                {p.email ? (
                                  <span className="player-linked-chip" title="Enlazado al perfil del usuario">
                                    <Mail size={11} />
                                    <span>{p.email}</span>
                                  </span>
                                ) : (
                                  <span className="player-no-email" title="Sin correo registrado (jugador presencial)">
                                    {p.telefono || "Sin correo"}
                                  </span>
                                )}
                                {p.notas && <small className="player-note">{p.notas}</small>}
                              </div>
                            </td>

                            {/* SELECTOR RÁPIDO DE PUESTO */}
                            <td className="col-puesto">
                              <select
                                className={`select-puesto-inline ${es1 ? "p-oro" : es2 ? "p-plata" : es3 ? "p-bronce" : es4 ? "p-top4" : ""}`}
                                value={pVal}
                                onChange={(e) => handleCambiarPuesto(p, e.target.value)}
                              >
                                <option value="Participante">Participante</option>
                                <option value="1">🏆 1° Lugar</option>
                                <option value="2">🥈 2° Lugar</option>
                                <option value="3">🥉 3° Lugar</option>
                                <option value="4">⭐ 4° Lugar</option>
                                <option value="Top 8">Top 8</option>
                                <option value="Top 16">Top 16</option>
                              </select>
                            </td>

                            {/* VICTORIAS (WINS) */}
                            <td className="col-wins">
                              <div className="wins-badge-wrap">
                                <span className="wins-badge">
                                  <strong>{playerWins}</strong> {playerWins === 1 ? "win" : "wins"}
                                </span>
                                {p.puntos !== undefined && <small className="wins-pts">{p.puntos} pts</small>}
                              </div>
                            </td>

                            {/* CC COINS */}
                            <td className="col-cc-coins">
                              <div className="cc-coins-cell">
                                <span className="coin-chip">
                                  🪙 <strong>{playerCoins}</strong>
                                </span>
                                <small className="coin-fiat-eq">${(playerCoins * 2000).toLocaleString("es-CO")}</small>
                              </div>
                            </td>

                            <td className="col-deck">{p.deck || "—"}</td>

                            {/* PREMIO GANADO CON EDICIÓN INLINE */}
                            <td className="col-prize">
                              {editandoPremioId === p.id ? (
                                <div className="edit-prize-inline">
                                  <input
                                    type="text"
                                    value={textoPremioEdicion}
                                    onChange={(e) => setTextoPremioEdicion(e.target.value)}
                                    placeholder="Premio en producto físico"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    className="btn-save-inline-prize"
                                    onClick={() => handleGuardarPremioManual(p, textoPremioEdicion)}
                                  >
                                    <Check size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-cancel-inline-prize"
                                    onClick={() => setEditandoPremioId(null)}
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ) : (
                                <div className="prize-won-container">
                                  {p.premioGanado ? (
                                    <div className="prize-won-chip">
                                      <Trophy size={12} className="prize-won-icon" />
                                      <span className="prize-text" title={p.premioGanado}>{p.premioGanado}</span>
                                      <button
                                        type="button"
                                        className="btn-edit-prize-btn"
                                        title="Modificar premio"
                                        onClick={() => {
                                          setEditandoPremioId(p.id);
                                          setTextoPremioEdicion(p.premioGanado || "");
                                        }}
                                      >
                                        <Edit2 size={11} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn-add-prize-placeholder"
                                      onClick={() => {
                                        setEditandoPremioId(p.id);
                                        setTextoPremioEdicion("");
                                      }}
                                    >
                                      + Asignar premio
                                    </button>
                                  )}

                                  {/* Miniaturas de productos asignados automáticamente */}
                                  {p.productosPremios && p.productosPremios.length > 0 && (
                                    <div className="table-assigned-products">
                                      {p.productosPremios.map((prod, pIdx) => (
                                        <span key={pIdx} className="table-assigned-prod-chip" title={`${prod.cantidad > 1 ? prod.cantidad + 'x ' : ''}${prod.nombre}`}>
                                          {prod.imagen ? (
                                            <img src={prod.imagen} alt={prod.nombre} className="table-assigned-prod-img" />
                                          ) : (
                                            <Package size={11} />
                                          )}
                                          <span>{prod.cantidad > 1 ? `${prod.cantidad}x ` : ""}{prod.nombre}</span>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="col-paid">${pagado.toLocaleString("es-CO")}</td>
                            <td className="col-due">
                              {pendiente > 0 ? (
                                <span className="due-amount">${pendiente.toLocaleString("es-CO")}</span>
                              ) : (
                                <span className="due-none">$0</span>
                              )}
                            </td>
                            <td className="col-status">
                              <div className="payment-toggle-buttons">
                                <button
                                  type="button"
                                  className={`btn-pay-status status-pagado ${p.estadoPago === "pagado" ? "active" : ""}`}
                                  onClick={() => handleCambiarEstadoPago(p, "pagado")}
                                  title="Marcar como pagado completo"
                                >
                                  Pagado
                                </button>
                                <button
                                  type="button"
                                  className={`btn-pay-status status-abono ${p.estadoPago === "abono" ? "active" : ""}`}
                                  onClick={() => handleCambiarEstadoPago(p, "abono")}
                                  title="Marcar como abono parcial"
                                >
                                  Abono
                                </button>
                                <button
                                  type="button"
                                  className={`btn-pay-status status-debe ${p.estadoPago === "debe" ? "active" : ""}`}
                                  onClick={() => handleCambiarEstadoPago(p, "debe")}
                                  title="Marcar como pendiente"
                                >
                                  Debe
                                </button>
                              </div>
                            </td>
                            <td className="col-actions" style={{ textAlign: "right" }}>
                              <button
                                type="button"
                                className="btn-del-player"
                                onClick={() => handleEliminarParticipante(p.id)}
                                title="Eliminar participante"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: CREAR O EDITAR TORNEO                            */}
      {/* ========================================================= */}
      {modalTorneoAbierto && (
        <div className="torneo-modal-backdrop" onClick={() => setModalTorneoAbierto(false)}>
          <div
            className="torneo-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="torneo-modal-header">
              <div>
                <span className="modal-badge">{torneoEditando ? "Edición" : "Nuevo Evento"}</span>
                <h2 className="modal-title">{torneoEditando ? "Editar Torneo" : "Crear Nuevo Torneo"}</h2>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setModalTorneoAbierto(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardarTorneo} className="torneo-modal-body form-body">
              <div className="form-cols-row">
                <label className="form-field full-width">
                  <span>Nombre del Torneo *</span>
                  <input
                    type="text"
                    placeholder="Ej: Store Championship OP-09 / Torneo Inaugural Riftbound"
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="form-cols-row">
                <label className="form-field">
                  <span>Juego / TCG *</span>
                  <select
                    value={formJuego}
                    onChange={(e) => setFormJuego(e.target.value)}
                  >
                    <option value="One Piece TCG">One Piece TCG</option>
                    <option value="Riftbound TCG">Riftbound TCG</option>
                  </select>
                </label>

                <label className="form-field">
                  <span>Formato *</span>
                  <input
                    type="text"
                    placeholder="Ej: Estándar Suizo, Sellado, Commander"
                    value={formFormato}
                    onChange={(e) => setFormFormato(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Estado del Evento</span>
                  <select
                    value={formEstado}
                    onChange={(e) => setFormEstado(e.target.value)}
                  >
                    <option value="proximo">Próximo</option>
                    <option value="en_curso">En Curso</option>
                    <option value="finalizado">Finalizado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </label>
              </div>

              <div className="form-cols-row">
                <label className="form-field">
                  <span>Fecha y Hora *</span>
                  <input
                    type="datetime-local"
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Inscripción en COP *</span>
                  <input
                    type="number"
                    placeholder="30000"
                    value={formCosto}
                    onChange={(e) => setFormCosto(e.target.value)}
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Cupo Máximo de Jugadores</span>
                  <input
                    type="number"
                    placeholder="16"
                    value={formCupo}
                    onChange={(e) => setFormCupo(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-cols-row">
                <label className="form-field full-width">
                  <span>Lugar / Sede *</span>
                  <input
                    type="text"
                    placeholder="Ej: Sede Capsule Corp Gaming - Cali (Cra 34 # 4-50)"
                    value={formLugar}
                    onChange={(e) => setFormLugar(e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="torneo-form-premiacion-banner">
                <Package size={18} />
                <div>
                  <strong>Premiación en Productos de la Tienda (Catálogo)</strong>
                  <p>
                    No se entrega premiación en efectivo. Todos los premios (Displays, Sobres Oficiales, Tournament Packs y Cartas Winner) se vinculan directamente desde el <em>Catálogo de Premios</em> de la tienda y se descuentan del inventario físico en automático.
                  </p>
                </div>
              </div>

              <div className="form-cols-row">
                <label className="form-field">
                  <span>Gastos Operativos del Torneo (COP)</span>
                  <input
                    type="number"
                    placeholder="Ej: 120000 (jueces, refrigerio, etc.)"
                    value={formGastos}
                    onChange={(e) => setFormGastos(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Reglas / Notas</span>
                  <input
                    type="text"
                    placeholder="Ej: Traer decklist impresa, rondas de 45 min"
                    value={formNotas}
                    onChange={(e) => setFormNotas(e.target.value)}
                  />
                </label>
              </div>

              <div className="modal-form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setModalTorneoAbierto(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-save-torneo">
                  <Check size={16} />
                  <span>{torneoEditando ? "Guardar Cambios" : "Crear Torneo"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: IMPORTADOR AUTOMÁTICO BANDAI TCG+ / RIFTBOUND   */}
      {/* ========================================================= */}
      {modalImportarAbierto && (
        <div className="torneo-modal-backdrop" onClick={() => setModalImportarAbierto(false)}>
          <div
            className="torneo-modal-dialog modal-large modal-import-bandai"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="torneo-modal-header">
              <div>
                <span className="modal-badge badge-sparkles">
                  <Sparkles size={12} /> Auto-Importador Bandai / Riftbound
                </span>
                <h2 className="modal-title">
                  {torneoDestinoImportacion
                    ? `Importar Resultados a: ${torneoDestinoImportacion.nombre}`
                    : "Crear Torneo desde Tabla Bandai TCG+ / Riftbound"}
                </h2>
                <p className="modal-subtitle">
                  Pega el texto copiado de la tabla de Bandai TCG+ o sube la captura de pantalla de los resultados.
                  Detectaremos automáticamente los Nicknames, IDs de Bandai, puestos y asignaremos los premios.
                </p>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setModalImportarAbierto(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmarImportacion} className="torneo-modal-body form-body">
              {/* Opciones de captura / ejemplo */}
              <div className="import-source-toolbar">
                <div className="import-method-tabs">
                  <button
                    type="button"
                    className={`btn-import-tab ${modoEntrada === "texto" ? "active" : ""}`}
                    onClick={() => setModoEntrada("texto")}
                  >
                    <FileText size={15} />
                    <span>Pegar Tabla / Texto</span>
                  </button>
                  <button
                    type="button"
                    className={`btn-import-tab ${modoEntrada === "imagen" ? "active" : ""}`}
                    onClick={() => setModoEntrada("imagen")}
                  >
                    <Camera size={15} />
                    <span>Subir Captura (OCR Inteligente)</span>
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-import-sample"
                  onClick={cargarEjemploBandai}
                  title="Cargar los 12 jugadores del torneo de ejemplo de Bandai"
                >
                  <Sparkles size={14} />
                  <span>Cargar Ejemplo de tu Captura (12 Jugadores)</span>
                </button>
              </div>

              {/* Modo Texto */}
              {modoEntrada === "texto" && (
                <div className="import-text-box">
                  <label className="form-field full-width">
                    <span className="import-label-flex">
                      <span>Pega aquí la tabla de posiciones copiada de Bandai TCG+ o texto</span>
                      <small>Formato: Posición | Membership Number | Nickname | Puntos | OMW %</small>
                    </span>
                    <textarea
                      rows={6}
                      className="import-textarea"
                      placeholder={`Posición\tMembership Number\tUsuarioname\tPuntos de victoria\tOMW %\n1\t0000205267\t[BC] JackPoe\t12\t52%\n2\t0000780406\tdanieldlora\t9\t64.5%\n3\t0000014931\tNiñojackie\t9\t52%`}
                      value={importTexto}
                      onChange={(e) => setImportTexto(e.target.value)}
                    />
                  </label>
                </div>
              )}

              {/* Modo Imagen con OCR */}
              {modoEntrada === "imagen" && (
                <div className="import-image-dropzone">
                  <label className="dropzone-label">
                    <Upload size={28} className="dropzone-icon" />
                    <span className="dropzone-title">Arrastra o selecciona la captura de Bandai TCG+</span>
                    <span className="dropzone-subtitle">Formatos PNG, JPG, WebP. Tesseract.js extraerá el texto automáticamente.</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSubirImagenBandai}
                      className="dropzone-input"
                      disabled={procesandoOcr}
                    />
                  </label>
                  {procesandoOcr && (
                    <div className="ocr-progress-box">
                      <RefreshCw size={16} className="spin" />
                      <span>{estadoOcr || "Procesando imagen con OCR..."}</span>
                    </div>
                  )}
                  {!procesandoOcr && estadoOcr && (
                    <div className="ocr-status-result">
                      <CheckCircle2 size={16} className="text-green" />
                      <span>{estadoOcr}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Datos Generales del Torneo */}
              {!torneoDestinoImportacion && (
                <div className="import-tournament-fields">
                  <h4 className="import-section-heading">Configuración del Evento</h4>
                  <div className="form-cols-row">
                    <label className="form-field">
                      <span>Nombre del Torneo *</span>
                      <input
                        type="text"
                        value={importNombre}
                        onChange={(e) => setImportNombre(e.target.value)}
                        required
                      />
                    </label>

                    <label className="form-field">
                      <span>Juego Oficial *</span>
                      <select
                        value={importJuego}
                        onChange={(e) => setImportJuego(e.target.value)}
                      >
                        <option value="One Piece TCG">One Piece TCG</option>
                        <option value="Riftbound TCG">Riftbound TCG</option>
                      </select>
                    </label>

                    <label className="form-field">
                      <span>Inscripción por Jugador (COP)</span>
                      <input
                        type="number"
                        value={importCosto}
                        onChange={(e) => setImportCosto(e.target.value)}
                        required
                      />
                    </label>
                  </div>

                  <div className="import-premiacion-cat-info">
                    <div className="ipci-icon">
                      <Package size={18} />
                    </div>
                    <div className="ipci-text">
                      <strong>Premiación 100% en Productos de la Tienda (Catálogo)</strong>
                      <p>
                        No se entrega dinero en efectivo ni se requiere ingresar premios manualmente. Los premios (Displays, Sobres Oficiales, Tournament Packs y Cartas Winner) se vinculan automáticamente desde el Catálogo de Premios físicos según los puestos y se descuentan del inventario al confirmar.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Vista Previa de Participantes Detectados */}
              <div className="parsed-preview-box">
                <div className="parsed-preview-header">
                  <div className="pp-count-wrap">
                    <UserCheck size={18} className="text-cyan" />
                    <strong>{participantesParseados.length} Jugadores Detectados</strong>
                  </div>
                  {participantesParseados.length > 0 && (
                    <span className="parsed-pool-calc">
                      <Sparkles size={13} /> Premiación física de catálogo activa
                    </span>
                  )}
                </div>

                {participantesParseados.length === 0 ? (
                  <div className="parsed-empty-state">
                    <AlertCircle size={20} className="text-amber" />
                    <p>Aún no se han detectado jugadores. Haz clic en "Cargar Ejemplo de tu Captura" o pega el texto arriba.</p>
                  </div>
                ) : (
                  <div className="parsed-table-wrap">
                    {/* Resumen Económico del Torneo a Importar */}
                    {(() => {
                      const calculoPrev = calcularPremiacionOficialOnePiece(
                        participantesParseados.length,
                        participantesParseados
                      );
                      return (
                        <div className="import-economic-summary-banner">
                          <div className="ies-item">
                            <span>Recaudo Total ({calculoPrev.numJugadores} jugadores)</span>
                            <strong>${calculoPrev.totalInscripcionCOP.toLocaleString("es-CO")} COP</strong>
                          </div>
                          <div className="ies-item highlight-coins">
                            <span>🪙 CC Coins Prize Wall</span>
                            <strong>${calculoPrev.montoCcCoinsCOP.toLocaleString("es-CO")} COP ({calculoPrev.totalWins} Wins)</strong>
                          </div>
                          <div className="ies-item highlight-packs">
                            <span>📦 Pool Sobres Tienda</span>
                            <strong>${calculoPrev.poolRestanteCOP.toLocaleString("es-CO")} COP ({calculoPrev.totalSobresTienda} Sobres)</strong>
                          </div>
                          <div className="ies-item highlight-payout">
                            <span>Retorno de Premios</span>
                            <strong className="text-green">100% (${calculoPrev.retornoPremiosTotalCOP.toLocaleString("es-CO")} COP)</strong>
                          </div>
                        </div>
                      );
                    })()}

                    <table className="parsed-table">
                      <thead>
                        <tr>
                          <th>Puesto</th>
                          <th>Bandai ID</th>
                          <th>Nickname / Usuario</th>
                          <th>Puntos</th>
                          <th>Victorias</th>
                          <th>🪙 CC Coins</th>
                          <th>OMW %</th>
                          <th>Premio Total Asignado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const calculoPrev = calcularPremiacionOficialOnePiece(
                            participantesParseados.length,
                            participantesParseados
                          );
                          return participantesParseados.map((p, idx) => {
                            const numP = parseInt(String(p.puesto || "").replace(/\D/g, ""), 10);
                            const isTop = numP && numP <= calculoPrev.puestosPremiados;
                            const sobresTop = calculoPrev.sobresPorPuesto[numP] || 0;
                            const wins = p.wins !== undefined && p.wins !== null
                              ? Number(p.wins)
                              : Math.floor((Number(p.puntos) || 0) / 3);
                            const ccCoins = Math.max(0, wins);

                            return (
                              <tr key={idx} className={isTop ? "row-top" : ""}>
                                <td className="cell-rank">
                                  <span className={`rank-badge ${numP === 1 ? "rank-1" : numP === 2 ? "rank-2" : numP === 3 ? "rank-3" : ""}`}>
                                    #{p.puesto || idx + 1}
                                  </span>
                                </td>
                                <td className="cell-id">
                                  <code>{p.bandaiId || "N/A"}</code>
                                </td>
                                <td className="cell-user">
                                  <span className="player-tag-name">{p.nickname || p.nombre}</span>
                                </td>
                                <td className="cell-pts">{p.puntos ?? 0} pts</td>
                                <td className="cell-wins">
                                  <span className="wins-badge">
                                    <strong>{wins}</strong> {wins === 1 ? "win" : "wins"}
                                  </span>
                                </td>
                                <td className="cell-coins">
                                  <span className="coin-chip">🪙 <strong>{ccCoins}</strong></span>
                                </td>
                                <td className="cell-omw">{p.omw || "-"}</td>
                                <td className="cell-prize">
                                  <span className="prize-preview-badge">
                                    🪙 {ccCoins} Coins + {numP === 1
                                      ? `🏆 Winner + ${sobresTop}x Sobres + Pack`
                                      : isTop
                                      ? `${numP === 2 ? "🥈" : numP === 3 ? "🥉" : "⭐"} ${sobresTop}x Sobres + Pack`
                                      : "🎁 1x Tournament Pack (Elegible Rifa)"}
                                  </span>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                    {participantesParseados.length >= 4 && (
                      <div className="import-rifa-note">
                        <Gift size={15} />
                        <span>
                          <strong>1 Sobre de Rifa Oficial Incluido:</strong> Se sorteará al registrar el torneo entre los {Math.max(0, participantesParseados.length - (participantesParseados.length > 12 ? (participantesParseados.length >= 16 ? 6 : 5) : 4))} participantes fuera del Top premiado.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botones de acción modal */}
              <div className="modal-form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setModalImportarAbierto(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-confirm-import"
                  disabled={participantesParseados.length === 0}
                >
                  <Sparkles size={16} />
                  <span>
                    {torneoDestinoImportacion
                      ? `Actualizar Torneo con ${participantesParseados.length} Jugadores`
                      : `Crear Torneo Automático (${participantesParseados.length} Jugadores)`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CATÁLOGO DE PREMIOS (INVENTARIO GENERAL)           */}
      {/* ========================================================= */}
      {modalCatalogoAbierto && (
        <div className="modal-overlay" onClick={() => setModalCatalogoAbierto(false)}>
          <div
            className="modal-container modal-catalogo-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="modal-title">Catálogo de Premios (Inventario)</h3>
                  <p className="modal-subtitle">
                    Gestiona los productos disponibles para torneos. Su stock se descuenta en automático al asignar las premiaciones.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setModalCatalogoAbierto(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body modal-catalogo-body">
              {/* Barra de herramientas y filtros del catálogo */}
              <div className="cat-toolbar">
                <div className="cat-game-chips">
                  {[
                    { id: "todos", label: "Todos" },
                    { id: "One Piece TCG", label: "One Piece TCG" },
                    { id: "Riftbound TCG", label: "Riftbound TCG" },
                  ].map((j) => (
                    <button
                      key={j.id}
                      type="button"
                      className={`cat-chip-btn ${filtroCatJuego === j.id ? "active" : ""}`}
                      onClick={() => setFiltroCatJuego(j.id)}
                    >
                      {j.label}
                    </button>
                  ))}
                </div>

                <div className="cat-toolbar-right">
                  <div className="cat-search-box">
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="Buscar producto..."
                      value={busquedaCat}
                      onChange={(e) => setBusquedaCat(e.target.value)}
                    />
                    {busquedaCat && (
                      <button type="button" onClick={() => setBusquedaCat("")}>
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn-cargar-kits-mensuales"
                    onClick={handleCargarKitsMensuales}
                    title="Cargar o reponer los 7 Kits Mensuales de Bandai (7 Sobres Winner + 56 Tournament Packs)"
                  >
                    <Package size={14} />
                    <span>Cargar 7 Kits Bandai</span>
                  </button>

                  <button
                    type="button"
                    className="btn-toggle-nuevo-prod"
                    onClick={() => setMostrarFormNuevoCat(!mostrarFormNuevoCat)}
                  >
                    <Plus size={15} />
                    <span>{mostrarFormNuevoCat ? "Cerrar Formulario" : "Nuevo Producto"}</span>
                  </button>
                </div>
              </div>

              {/* Formulario para registrar nuevo producto en el catálogo */}
              {mostrarFormNuevoCat && (
                <form onSubmit={handleGuardarItemCatalogo} className="cat-new-item-form">
                  <h5 className="cat-form-title">Registrar Producto en el Catálogo</h5>
                  <div className="cat-form-grid">
                    <div className="cat-photo-col">
                      <label className="cat-photo-dropzone">
                        {catImagen ? (
                          <div className="cat-photo-preview-wrap">
                            <img src={catImagen} alt="Foto producto" />
                            <button
                              type="button"
                              className="btn-remove-cat-photo"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setCatImagen("");
                              }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="cat-photo-empty">
                            <Camera size={20} />
                            <span>Subir Foto</span>
                            <small>JPG / PNG / WebP</small>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={handleSubirFotoCatalogo}
                        />
                      </label>
                    </div>

                    <div className="cat-inputs-col">
                      <div className="cat-row-2">
                        <label className="form-field">
                          <span>Nombre del Producto *</span>
                          <input
                            type="text"
                            placeholder="Ej: Booster Box One Piece OP-09"
                            value={catNombre}
                            onChange={(e) => setCatNombre(e.target.value)}
                            required
                          />
                        </label>

                        <label className="form-field">
                          <span>Juego *</span>
                          <select
                            value={catJuego}
                            onChange={(e) => setCatJuego(e.target.value)}
                          >
                            <option value="One Piece TCG">One Piece TCG</option>
                            <option value="Riftbound TCG">Riftbound TCG</option>
                            <option value="General">General / Accesorios</option>
                          </select>
                        </label>
                      </div>

                      <div className="cat-row-3">
                        <label className="form-field">
                          <span>Categoría</span>
                          <select
                            value={catCategoria}
                            onChange={(e) => setCatCategoria(e.target.value)}
                          >
                            <option value="Sobres">Sobres</option>
                            <option value="Cajas / Displays">Cajas / Displays</option>
                            <option value="Sobres de Torneo">Sobres de Torneo (Promo)</option>
                            <option value="Cartas Promo">Cartas Promo / Winner</option>
                            <option value="Playmats">Playmats / Tapetes</option>
                            <option value="Accesorios">Accesorios / Sleeves / Deckbox</option>
                          </select>
                        </label>

                        <label className="form-field">
                          <span>Stock Inicial *</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="12"
                            value={catStock}
                            onChange={(e) => setCatStock(e.target.value)}
                            required
                          />
                        </label>

                        <label className="form-field">
                          <span>Valor estimado (COP)</span>
                          <input
                            type="number"
                            placeholder="Ej: 450000"
                            value={catValorCop}
                            onChange={(e) => setCatValorCop(e.target.value)}
                          />
                        </label>
                      </div>

                      <div className="cat-row-actions">
                        <input
                          type="url"
                          placeholder="O pega aquí la URL de la imagen (https://...)"
                          value={catImagen.startsWith("http") ? catImagen : ""}
                          onChange={(e) => setCatImagen(e.target.value)}
                          className="cat-url-input"
                        />
                        <button
                          type="submit"
                          className="btn-guardar-cat-item"
                          disabled={guardandoCatItem || !catNombre.trim()}
                        >
                          <Plus size={15} />
                          <span>{guardandoCatItem ? "Guardando…" : "Guardar en Catálogo"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}

              {/* Lista / Grilla de productos del catálogo */}
              <div className="catalogo-items-grid">
                {(() => {
                  const filtrados = catalogoPremios.filter((p) => {
                    if (filtroCatJuego !== "todos" && p.juego !== filtroCatJuego) return false;
                    if (busquedaCat.trim()) {
                      const q = busquedaCat.toLowerCase();
                      const matchNombre = (p.nombre || "").toLowerCase().includes(q);
                      const matchCat = (p.categoria || "").toLowerCase().includes(q);
                      if (!matchNombre && !matchCat) return false;
                    }
                    return true;
                  });

                  if (filtrados.length === 0) {
                    return (
                      <div className="cat-empty-view">
                        <Package size={36} />
                        <p>No se encontraron productos en el catálogo.</p>
                        <small>Haz clic en "Nuevo Producto" para registrar premios en el inventario.</small>
                      </div>
                    );
                  }

                  return filtrados.map((item) => (
                    <div key={item.id} className="cat-card-item">
                      <div className="cat-card-thumb">
                        {item.imagen ? (
                          <img src={item.imagen} alt={item.nombre} />
                        ) : (
                          <Package size={24} />
                        )}
                        <span className="cat-card-badge-juego">{item.juego.includes("Riftbound") ? "RIFT" : "OP TCG"}</span>
                      </div>

                      <div className="cat-card-body">
                        <div className="cat-card-cat-tag">{item.categoria}</div>
                        <strong className="cat-card-title" title={item.nombre}>{item.nombre}</strong>
                        {item.valorCop > 0 && (
                          <span className="cat-card-valor">
                            ${Number(item.valorCop).toLocaleString("es-CO")} COP
                          </span>
                        )}
                        {item.notas && <p className="cat-card-notas">{item.notas}</p>}
                      </div>

                      <div className="cat-card-stock-controller">
                        <span className="cat-stock-label">Stock:</span>
                        <div className="cat-stock-stepper">
                          <button
                            type="button"
                            className="btn-stepper-stock minus"
                            onClick={() => handleAjustarStock(item.id, -1)}
                            disabled={item.stock <= 0}
                            title="Restar 1 unidad"
                          >
                            <Minus size={13} />
                          </button>
                          <span className={`cat-stock-num ${item.stock === 0 ? "zero" : ""}`}>
                            {item.stock}
                          </span>
                          <button
                            type="button"
                            className="btn-stepper-stock plus"
                            onClick={() => handleAjustarStock(item.id, 1)}
                            title="Sumar 1 unidad"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <button
                          type="button"
                          className="btn-del-cat-item"
                          onClick={() => handleEliminarItemCatalogo(item.id)}
                          title="Eliminar del catálogo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="modal-footer cat-modal-footer">
              <div className="cat-footer-summary">
                <span>Total de productos: <strong>{catalogoPremios.length}</strong></span>
                <span>•</span>
                <span>Unidades en inventario: <strong>{catalogoPremios.reduce((acc, p) => acc + (Number(p.stock) || 0), 0)}</strong></span>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setModalCatalogoAbierto(false)}
              >
                Cerrar Catálogo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: MURO DE PREMIOS (PRIZE WALL) & CC COINS            */}
      {/* ========================================================= */}
      {modalPrizeWallAbierto && (
        <div className="modal-overlay" onClick={() => setModalPrizeWallAbierto(false)}>
          <div
            className="modal-container modal-prizewall-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge pw-coin-badge">
                  <Coins size={22} />
                </div>
                <div>
                  <h3 className="modal-title">Muro de Premios Oficial • Prize Wall</h3>
                  <p className="modal-subtitle">
                    1 Win en torneo = 1 CC Coin ($2.000 COP de inscripción) • Acumula tus CC Coins y reclama productos exclusivos que no se venden en tienda.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setModalPrizeWallAbierto(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body modal-prizewall-body">
              {/* Notificación de canje */}
              {mensajeCanje && (
                <div className="pw-toast-notification">
                  <CheckCircle2 size={16} />
                  <span>{mensajeCanje}</span>
                </div>
              )}

              {/* Sub-pestañas del Prize Wall */}
              <div className="pw-subtabs-toolbar">
                <div className="pw-tabs-group">
                  <button
                    type="button"
                    className={`pw-tab-btn ${subTabPrizeWall === "items" ? "active" : ""}`}
                    onClick={() => setSubTabPrizeWall("items")}
                  >
                    <Package size={15} />
                    <span>Artículos del Prize Wall ({itemsPrizeWall.length})</span>
                  </button>
                  <button
                    type="button"
                    className={`pw-tab-btn ${subTabPrizeWall === "jugadores" ? "active" : ""}`}
                    onClick={() => setSubTabPrizeWall("jugadores")}
                  >
                    <Users size={15} />
                    <span>Saldos de CC Coins ({saldosCcCoins.length})</span>
                  </button>
                  <button
                    type="button"
                    className={`pw-tab-btn ${subTabPrizeWall === "historial" ? "active" : ""}`}
                    onClick={() => setSubTabPrizeWall("historial")}
                  >
                    <Award size={15} />
                    <span>Historial de Canjes ({canjesPrizeWall.length})</span>
                  </button>
                </div>

                <div className="pw-toolbar-right">
                  <div className="pw-search-box">
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="Buscar en el Prize Wall..."
                      value={busquedaPW}
                      onChange={(e) => setBusquedaPW(e.target.value)}
                    />
                    {busquedaPW && (
                      <button type="button" onClick={() => setBusquedaPW("")}>
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn-toggle-new-pw"
                    onClick={() => setMostrarFormNuevoPW(!mostrarFormNuevoPW)}
                  >
                    <Plus size={14} />
                    <span>{mostrarFormNuevoPW ? "Cerrar Formulario" : "Nuevo Artículo"}</span>
                  </button>
                </div>
              </div>

              {/* Formulario nuevo artículo Prize Wall (Admin) */}
              {mostrarFormNuevoPW && (
                <form onSubmit={handleGuardarItemPW} className="pw-new-item-form">
                  <div className="form-cols-row">
                    <label className="form-field">
                      <span>Nombre del Artículo Exclusivo *</span>
                      <input
                        type="text"
                        placeholder="Ej: Playmat Store Championship OP-09"
                        value={pwNombre}
                        onChange={(e) => setPwNombre(e.target.value)}
                        required
                      />
                    </label>

                    <label className="form-field">
                      <span>Categoría</span>
                      <select value={pwCategoria} onChange={(e) => setPwCategoria(e.target.value)}>
                        <option value="Playmats">Playmats</option>
                        <option value="Fundas / Sleeves">Fundas / Sleeves</option>
                        <option value="Deck Boxes">Deck Boxes</option>
                        <option value="Cartas Promo">Cartas Promo</option>
                        <option value="Accesorios">Accesorios</option>
                        <option value="Sobres">Sobres</option>
                      </select>
                    </label>

                    <label className="form-field">
                      <span>Costo en 🪙 CC Coins *</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="10"
                        value={pwCostoCoins}
                        onChange={(e) => setPwCostoCoins(e.target.value)}
                        required
                      />
                    </label>

                    <label className="form-field">
                      <span>Stock Disponible</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="5"
                        value={pwStock}
                        onChange={(e) => setPwStock(e.target.value)}
                        required
                      />
                    </label>
                  </div>

                  <div className="form-cols-row">
                    <label className="form-field">
                      <span>URL de Imagen del Producto</span>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={pwImagen}
                        onChange={(e) => setPwImagen(e.target.value)}
                      />
                    </label>

                    <label className="form-field">
                      <span>Descripción / Exclusividad</span>
                      <input
                        type="text"
                        placeholder="Ej: Edición limitada para jugadores con victorias en torneos oficiales"
                        value={pwDescripcion}
                        onChange={(e) => setPwDescripcion(e.target.value)}
                      />
                    </label>

                    <div className="pw-form-actions-inline">
                      <button
                        type="submit"
                        className="btn-save-pw-item"
                        disabled={guardandoPWItem}
                      >
                        <Check size={14} />
                        <span>{guardandoPWItem ? "Guardando..." : "Guardar en Prize Wall"}</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* MODAL SUB-TAB: ARTÍCULOS CANJEABLES */}
              {subTabPrizeWall === "items" && (
                <div className="pw-items-section">
                  {/* Modal / Card de confirmación de canje si hay un item seleccionado */}
                  {canjeItemActivo && (
                    <div className="pw-redeem-modal-box">
                      <div className="pw-rm-header">
                        <Coins size={18} className="text-accent" />
                        <div>
                          <strong>Canjear: {canjeItemActivo.nombre}</strong>
                          <span className="pw-rm-cost">
                            Costo: 🪙 <strong>{canjeItemActivo.costoCcCoins} CC Coins</strong> c/u (Equiv. ${(canjeItemActivo.costoCcCoins * 2000).toLocaleString("es-CO")} COP)
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn-close-redeem"
                          onClick={() => setCanjeItemActivo(null)}
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <form onSubmit={handleCanjearItem} className="pw-rm-form">
                        <div className="pw-rm-fields">
                          <label className="form-field">
                            <span>Selecciona el Jugador que Canjea:</span>
                            <select
                              value={canjeJugadorKey}
                              onChange={(e) => setCanjeJugadorKey(e.target.value)}
                              required
                            >
                              <option value="">-- Seleccionar jugador con saldo --</option>
                              {saldosCcCoins.map((j) => (
                                <option
                                  key={j.key}
                                  value={j.key}
                                  disabled={j.saldoActualCoins < canjeItemActivo.costoCcCoins * (Number(canjeCantidad) || 1)}
                                >
                                  {j.nombre} ({j.nickname}) — Saldo: 🪙 {j.saldoActualCoins} CC Coins (${j.saldoActualCOP.toLocaleString("es-CO")} COP)
                                  {j.saldoActualCoins < canjeItemActivo.costoCcCoins * (Number(canjeCantidad) || 1) ? " [Insuficiente]" : ""}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="form-field pw-rm-qty">
                            <span>Cantidad:</span>
                            <input
                              type="number"
                              min="1"
                              max={canjeItemActivo.stock}
                              value={canjeCantidad}
                              onChange={(e) => setCanjeCantidad(e.target.value)}
                              required
                            />
                          </label>

                          <button
                            type="submit"
                            className="btn-confirm-redeem"
                            disabled={canjeando || !canjeJugadorKey}
                          >
                            <Sparkles size={14} />
                            <span>{canjeando ? "Procesando..." : `Confirmar Canje (🪙 ${canjeItemActivo.costoCcCoins * (Number(canjeCantidad) || 1)} Coins)`}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="pw-items-grid">
                    {itemsPrizeWall
                      .filter((item) => {
                        if (!busquedaPW.trim()) return true;
                        const q = busquedaPW.toLowerCase();
                        return (
                          item.nombre.toLowerCase().includes(q) ||
                          item.categoria.toLowerCase().includes(q) ||
                          (item.descripcion || "").toLowerCase().includes(q)
                        );
                      })
                      .map((item) => (
                        <div key={item.id} className="pw-item-card">
                          <div className="pw-card-thumb-wrap">
                            {item.imagen ? (
                              <img src={item.imagen} alt={item.nombre} className="pw-card-img" />
                            ) : (
                              <div className="pw-card-fallback-thumb">
                                <Package size={26} />
                              </div>
                            )}
                            <span className="pw-category-pill">{item.categoria}</span>
                            <span className={`pw-stock-pill ${item.stock > 0 ? "in-stock" : "out-of-stock"}`}>
                              {item.stock > 0 ? `${item.stock} en stock` : "Agotado"}
                            </span>
                          </div>

                          <div className="pw-card-content">
                            <h4 className="pw-card-title">{item.nombre}</h4>
                            {item.descripcion && (
                              <p className="pw-card-desc">{item.descripcion}</p>
                            )}

                            <div className="pw-card-price-row">
                              <div className="pw-coin-cost-badge">
                                <Coins size={16} />
                                <strong>{item.costoCcCoins} CC Coins</strong>
                              </div>
                              <span className="pw-fiat-equiv">
                                ${(item.costoCcCoins * 2000).toLocaleString("es-CO")} COP
                              </span>
                            </div>

                            <div className="pw-card-actions">
                              <button
                                type="button"
                                className="btn-redeem-item-primary"
                                onClick={() => {
                                  setCanjeItemActivo(item);
                                  setCanjeCantidad("1");
                                }}
                                disabled={item.stock <= 0}
                              >
                                <Sparkles size={13} />
                                <span>{item.stock > 0 ? "Canjear / Reclamar" : "Sin Stock"}</span>
                              </button>

                              <div className="pw-admin-stepper">
                                <button
                                  type="button"
                                  className="btn-stepper-pw minus"
                                  onClick={() => handleAjustarStockPW(item.id, -1)}
                                  disabled={item.stock <= 0}
                                  title="Restar stock"
                                >
                                  <Minus size={11} />
                                </button>
                                <button
                                  type="button"
                                  className="btn-stepper-pw plus"
                                  onClick={() => handleAjustarStockPW(item.id, 1)}
                                  title="Sumar stock"
                                >
                                  <Plus size={11} />
                                </button>
                                <button
                                  type="button"
                                  className="btn-del-pw"
                                  onClick={() => handleEliminarItemPW(item.id)}
                                  title="Eliminar artículo"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* MODAL SUB-TAB: SALDOS DE CC COINS DE JUGADORES */}
              {subTabPrizeWall === "jugadores" && (
                <div className="pw-players-section">
                  <div className="pw-players-summary-bar">
                    <div>
                      <strong>Bolsa de CC Coins de la Comunidad</strong>
                      <p>
                        Total ganado por victorias: <strong>🪙 {saldosCcCoins.reduce((a, b) => a + b.totalGanadoCoins, 0)} CC Coins</strong> (${(saldosCcCoins.reduce((a, b) => a + b.totalGanadoCoins, 0) * 2000).toLocaleString("es-CO")} COP) • Saldo actual disponible: <strong>🪙 {saldosCcCoins.reduce((a, b) => a + b.saldoActualCoins, 0)} CC Coins</strong>.
                      </p>
                    </div>
                  </div>

                  <table className="torneo-table pw-players-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Jugador / Nickname</th>
                        <th>Bandai ID</th>
                        <th>Torneos</th>
                        <th>Victorias (Wins)</th>
                        <th>CC Coins Ganadas</th>
                        <th>Canjeadas</th>
                        <th>Saldo Disponible</th>
                        <th style={{ textAlign: "right" }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saldosCcCoins
                        .filter((j) => {
                          if (!busquedaPW.trim()) return true;
                          const q = busquedaPW.toLowerCase();
                          return (
                            j.nombre.toLowerCase().includes(q) ||
                            j.nickname.toLowerCase().includes(q) ||
                            j.bandaiId.includes(q) ||
                            j.email.toLowerCase().includes(q)
                          );
                        })
                        .map((j, idx) => (
                          <tr key={j.key}>
                            <td>{idx + 1}</td>
                            <td>
                              <div className="player-name-cell">
                                <strong>{j.nombre}</strong>
                                {j.nickname && <span className="player-tag-name">@{j.nickname}</span>}
                                {j.email && <small className="player-note">{j.email}</small>}
                              </div>
                            </td>
                            <td>
                              <code>{j.bandaiId || "—"}</code>
                            </td>
                            <td>{j.torneosJugados}</td>
                            <td>
                              <span className="wins-badge">
                                <strong>{j.totalWins}</strong> wins
                              </span>
                            </td>
                            <td>
                              <span className="coin-chip">
                                🪙 {j.totalGanadoCoins}
                              </span>
                            </td>
                            <td>
                              <span className="redeemed-chip">
                                {j.totalCanjeadoCoins}
                              </span>
                            </td>
                            <td>
                              <div className="cc-coins-cell">
                                <span className="coin-chip highlight">
                                  🪙 <strong>{j.saldoActualCoins} CC Coins</strong>
                                </span>
                                <small className="coin-fiat-eq">${j.saldoActualCOP.toLocaleString("es-CO")} COP</small>
                              </div>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                type="button"
                                className="btn-quick-canje"
                                onClick={() => {
                                  setSubTabPrizeWall("items");
                                  setCanjeJugadorKey(j.key);
                                }}
                              >
                                Canjear Producto
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* MODAL SUB-TAB: HISTORIAL DE CANJES */}
              {subTabPrizeWall === "historial" && (
                <div className="pw-history-section">
                  {canjesPrizeWall.length === 0 ? (
                    <div className="pw-empty-state">
                      <Award size={36} />
                      <p>Aún no se han realizado canjes en el Prize Wall.</p>
                      <small>Cuando un jugador canjee sus CC Coins acumuladas por playmats, fundas o promos, el registro aparecerá aquí.</small>
                    </div>
                  ) : (
                    <table className="torneo-table pw-history-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Jugador</th>
                          <th>Artículo Reclamado</th>
                          <th>Cantidad</th>
                          <th>CC Coins Usadas</th>
                          <th>Equivalente COP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {canjesPrizeWall.map((c) => (
                          <tr key={c.id}>
                            <td>{new Date(c.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                            <td>
                              <strong>{c.jugadorNombre}</strong>
                            </td>
                            <td>
                              <div className="pw-history-item-cell">
                                {c.itemImagen && (
                                  <img src={c.itemImagen} alt={c.itemNombre} className="pw-history-thumb" />
                                )}
                                <span>{c.itemNombre}</span>
                              </div>
                            </td>
                            <td>{c.cantidad}x</td>
                            <td>
                              <span className="coin-chip">
                                🪙 <strong>{c.costoTotalCoins}</strong> Coins
                              </span>
                            </td>
                            <td>${Number(c.equivalenteTotalCOP || c.costoTotalCoins * 2000).toLocaleString("es-CO")} COP</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer cat-modal-footer">
              <div className="cat-footer-summary">
                <span>Total de artículos en Prize Wall: <strong>{itemsPrizeWall.length}</strong></span>
                <span>•</span>
                <span>Saldos de jugadores: <strong>{saldosCcCoins.length}</strong></span>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setModalPrizeWallAbierto(false)}
              >
                Cerrar Prize Wall
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
