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
} from "lucide-react";
import {
  listarTorneos,
  guardarTorneo,
  eliminarTorneo,
  guardarParticipante,
  eliminarParticipante,
  calcularMetricasTorneo,
  distribuirPremiosTorneo,
} from "../lib/torneos.js";
import { useAuth } from "../lib/AuthContext.jsx";

const JUEGOS_FILTRO = [
  { id: "todos", label: "Todos los juegos", badge: "ALL" },
  { id: "One Piece TCG", label: "One Piece TCG", badge: "OP TCG" },
  { id: "Pokémon TCG", label: "Pokémon TCG", badge: "PKMN" },
  { id: "Magic: The Gathering", label: "Magic: The Gathering", badge: "MTG" },
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
  const [formCosto, setFormCosto] = useState("30000");
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

  // Pull de Premiación (Prize Pool)
  const [pozoMonto, setPozoMonto] = useState("");
  const [pozoEsquema, setPozoEsquema] = useState("top4_standard");
  const [premioFisico1, setPremioFisico1] = useState("");
  const [premioFisico2, setPremioFisico2] = useState("");
  const [premioFisico3, setPremioFisico3] = useState("");
  const [premioFisico4, setPremioFisico4] = useState("");
  const [distribuyendoPozo, setDistribuyendoPozo] = useState(false);
  const [mensajePozo, setMensajePozo] = useState("");
  const [panelPozoAbierto, setPanelPozoAbierto] = useState(true);

  // Edición rápida de premio individual
  const [editandoPremioId, setEditandoPremioId] = useState(null);
  const [textoPremioEdicion, setTextoPremioEdicion] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  // Al abrir torneo detalle, inicializar valores del pozo
  useEffect(() => {
    if (torneoDetalle) {
      const numPart = torneoDetalle.participantes?.length || 0;
      const costo = Number(torneoDetalle.costoInscripcion || 0);
      const calcPozo = torneoDetalle.pozoPremios || (costo * numPart);
      setPozoMonto(String(calcPozo || 0));
      setPozoEsquema(torneoDetalle.esquemaPremios || "top4_standard");
      setMensajePozo("");
    }
  }, [torneoDetalle?.id]);

  async function cargarDatos() {
    setCargando(true);
    const data = await listarTorneos();
    setTorneos(data);
    setCargando(false);
  }

  function abrirModalCrear() {
    setTorneoEditando(null);
    setFormNombre("");
    setFormJuego("One Piece TCG");
    setFormFormato("Estándar Suizo");
    setFormFecha("");
    setFormLugar("Sede Capsule Corp Gaming - Cali (Cra 34 # 4-50)");
    setFormCosto("30000");
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
      setTorneoDetalle(actualizado);
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

  async function handleDistribuirPremios() {
    if (!torneoDetalle) return;
    setDistribuyendoPozo(true);
    setMensajePozo("");

    const premiosFisicos = {};
    if (premioFisico1.trim()) premiosFisicos[1] = premioFisico1.trim();
    if (premioFisico2.trim()) premiosFisicos[2] = premioFisico2.trim();
    if (premioFisico3.trim()) premiosFisicos[3] = premioFisico3.trim();
    if (premioFisico4.trim()) premiosFisicos[4] = premioFisico4.trim();

    const actualizado = await distribuirPremiosTorneo(torneoDetalle.id, {
      pozoTotal: Number(pozoMonto) || 0,
      esquema: pozoEsquema,
      premiosFisicos: Object.keys(premiosFisicos).length > 0 ? premiosFisicos : undefined,
    });

    setDistribuyendoPozo(false);
    if (actualizado) {
      setTorneoDetalle(actualizado);
      setMensajePozo("¡Premios distribuidos con éxito entre los participantes con su puesto asignado!");
      await cargarDatos();
      setTimeout(() => setMensajePozo(""), 4500);
    }
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
    if (!juego) return "TCG";
    if (juego.includes("One Piece")) return "OP TCG";
    if (juego.includes("Pokémon")) return "PKMN";
    if (juego.includes("Magic")) return "MTG";
    if (juego.includes("Riftbound")) return "RIFT";
    return "TCG";
  }

  return (
    <div className="torneos-page-view">
      {/* HEADER DE MÓDULO */}
      <div className="torneos-header-banner">
        <div className="torneos-header-left">
          <div className="torneos-tag-badge">
            <Trophy size={13} />
            <span>Eventos y Comunidad</span>
          </div>
          <h1 className="torneos-main-title">Torneos y Eventos TCG</h1>
          <p className="torneos-main-subtitle">
            Organiza, inscribe y participa en los torneos oficiales de One Piece, Pokémon, Magic y Riftbound de Capsule Corp Gaming en Cali.
          </p>
        </div>

        <div className="torneos-header-actions">
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
          <div className="kpi-icon-wrap kpi-blue">
            <Calendar size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Eventos Activos</span>
            <strong className="kpi-val">{metricasGlobales.torneosActivos}</strong>
          </div>
        </div>

        <div className="torneo-kpi-card">
          <div className="kpi-icon-wrap kpi-purple">
            <Users size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Jugadores Inscritos</span>
            <strong className="kpi-val">{metricasGlobales.totalJugadores}</strong>
          </div>
        </div>

        <div className="torneo-kpi-card">
          <div className="kpi-icon-wrap kpi-green">
            <CreditCard size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Recaudado</span>
            <strong className="kpi-val">${metricasGlobales.totalRecaudado.toLocaleString("es-CO")} COP</strong>
          </div>
        </div>

        <div className="torneo-kpi-card">
          <div className="kpi-icon-wrap kpi-amber">
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

                {/* Botones de Acción */}
                <div className="torneo-card-actions">
                  <button
                    type="button"
                    className="btn-torneo-manage"
                    onClick={() => setTorneoDetalle(t)}
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
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setTorneoDetalle(null)}
              >
                <X size={18} />
              </button>
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

              {/* ========================================================= */}
              {/* PULL DE PREMIACIÓN (PRIZE POOL) AUTOMÁTICO               */}
              {/* ========================================================= */}
              <div className="torneo-prize-pool-container">
                <div className="prize-pool-header-row">
                  <div className="pp-title-box">
                    <div className="pp-icon-wrap">
                      <Coins size={18} />
                    </div>
                    <div>
                      <h4 className="pp-title">Pull de Premiación (Prize Pool)</h4>
                      <p className="pp-subtitle">
                        Calcula y distribuye automáticamente el pozo de premios entre los ganadores según su puesto en el torneo.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-toggle-pool"
                    onClick={() => setPanelPozoAbierto(!panelPozoAbierto)}
                  >
                    {panelPozoAbierto ? "Ocultar Calculadora" : "Configurar Pozo de Premios"}
                  </button>
                </div>

                {panelPozoAbierto && (
                  <div className="prize-pool-body">
                    {/* Controles de Configuración del Pozo */}
                    <div className="pp-config-grid">
                      <label className="form-field">
                        <span>Pozo Total de Premios (COP) *</span>
                        <div className="input-with-action">
                          <input
                            type="number"
                            placeholder="Ej: 420000"
                            value={pozoMonto}
                            onChange={(e) => setPozoMonto(e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn-calc-pool"
                            title="Calcular pozo con base en jugadores inscritos actuales"
                            onClick={() => {
                              const total = (Number(torneoDetalle.costoInscripcion) || 0) * (torneoDetalle.participantes?.length || 0);
                              setPozoMonto(String(total));
                            }}
                          >
                            Autollenar ({torneoDetalle.participantes?.length || 0} jug.)
                          </button>
                        </div>
                      </label>

                      <label className="form-field">
                        <span>Esquema de División por Puesto *</span>
                        <select
                          value={pozoEsquema}
                          onChange={(e) => setPozoEsquema(e.target.value)}
                        >
                          <option value="top4_standard">Top 4 Estándar (1°: 50% | 2°: 30% | 3°: 10% | 4°: 10%)</option>
                          <option value="top4_split">Top 4 Parejo (1°: 50% | 2°: 25% | 3°-4°: 12.5% c/u)</option>
                          <option value="top8_premier">Top 8 Premier (1°: 40% | 2°: 20% | 3°-4°: 10% | 5°-8°: 5%)</option>
                          <option value="top2">Top 2 Finalistas (1°: 70% | 2°: 30%)</option>
                          <option value="winner">Winner Takes All (1°: 100%)</option>
                        </select>
                      </label>
                    </div>

                    {/* Premios físicos adicionales opcionales */}
                    <div className="pp-physical-prizes-row">
                      <span className="sub-tag">Premios Físicos Adicionales (Opcional):</span>
                      <div className="physical-prizes-grid">
                        <input
                          type="text"
                          placeholder="1°: Ej: 1 Booster Box OP-09 Sellada"
                          value={premioFisico1}
                          onChange={(e) => setPremioFisico1(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="2°: Ej: 12 Sobres Oficiales"
                          value={premioFisico2}
                          onChange={(e) => setPremioFisico2(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="3°: Ej: 4 Sobres de Torneo"
                          value={premioFisico3}
                          onChange={(e) => setPremioFisico3(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="4°: Ej: 2 Sobres de Torneo"
                          value={premioFisico4}
                          onChange={(e) => setPremioFisico4(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Previsualización en tiempo real de cómo se divide */}
                    {(() => {
                      const totalP = Number(pozoMonto) || 0;
                      const porcentajes = {
                        top4_standard: [
                          { p: 1, label: "1° Lugar", pct: 0.50, color: "#eab308" },
                          { p: 2, label: "2° Lugar", pct: 0.30, color: "#94a3b8" },
                          { p: 3, label: "3° Lugar", pct: 0.10, color: "#b45309" },
                          { p: 4, label: "4° Lugar", pct: 0.10, color: "#38bdf8" },
                        ],
                        top4_split: [
                          { p: 1, label: "1° Lugar", pct: 0.50, color: "#eab308" },
                          { p: 2, label: "2° Lugar", pct: 0.25, color: "#94a3b8" },
                          { p: 3, label: "3° Lugar", pct: 0.125, color: "#b45309" },
                          { p: 4, label: "4° Lugar", pct: 0.125, color: "#38bdf8" },
                        ],
                        top8_premier: [
                          { p: 1, label: "1° Lugar", pct: 0.40, color: "#eab308" },
                          { p: 2, label: "2° Lugar", pct: 0.20, color: "#94a3b8" },
                          { p: 3, label: "3° Lugar", pct: 0.10, color: "#b45309" },
                          { p: 4, label: "4° Lugar", pct: 0.10, color: "#38bdf8" },
                          { p: 5, label: "5°-8°", pct: 0.05, color: "#a855f7" },
                        ],
                        top2: [
                          { p: 1, label: "1° Lugar", pct: 0.70, color: "#eab308" },
                          { p: 2, label: "2° Lugar", pct: 0.30, color: "#94a3b8" },
                        ],
                        winner: [
                          { p: 1, label: "1° Lugar (Campeón)", pct: 1.00, color: "#eab308" },
                        ],
                      };

                      const lista = porcentajes[pozoEsquema] || porcentajes.top4_standard;

                      return (
                        <div className="pp-preview-breakdown">
                          <span className="preview-label">Desglose calculado del pozo (${totalP.toLocaleString("es-CO")} COP):</span>
                          <div className="pp-chips-grid">
                            {lista.map((item, idx) => {
                              const monto = Math.round(totalP * item.pct);
                              return (
                                <div key={idx} className="pp-chip" style={{ borderLeftColor: item.color }}>
                                  <span className="chip-puesto">{item.label} ({(item.pct * 100).toFixed(0)}%)</span>
                                  <strong className="chip-monto">${monto.toLocaleString("es-CO")} COP</strong>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Botón de Ejecución de Distribución */}
                    <div className="pp-actions-footer">
                      <button
                        type="button"
                        className="btn-distribuir-pozo"
                        onClick={handleDistribuirPremios}
                        disabled={distribuyendoPozo}
                      >
                        <Sparkles size={16} />
                        <span>
                          {distribuyendoPozo ? "Distribuyendo Premios…" : "Distribuir Pozo Automáticamente a los Ganadores"}
                        </span>
                      </button>

                      {mensajePozo && (
                        <div className="pp-success-toast">
                          <CheckCircle2 size={16} />
                          <span>{mensajePozo}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Formulario para inscribir participante */}
              <div className="torneo-add-player-box">
                <h4 className="section-subtitle">
                  <Plus size={15} />
                  <span>Registrar nuevo participante</span>
                </h4>

                <form onSubmit={handleAgregarParticipante} className="add-player-form">
                  <div className="form-cols-row">
                    <label className="form-field">
                      <span>Nombre del jugador *</span>
                      <input
                        type="text"
                        placeholder="Ej: Carlos Méndez"
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
                  <h4>Lista de Participantes ({torneoDetalle.participantes?.length || 0})</h4>
                  <span className="table-subtitle">Asigna el puesto y estado de pago de cada jugador para sincronizarlo con su perfil</span>
                </div>

                {(!torneoDetalle.participantes || torneoDetalle.participantes.length === 0) ? (
                  <p className="no-players-notice">Aún no hay jugadores registrados en este torneo.</p>
                ) : (
                  <table className="torneo-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Jugador / Perfil</th>
                        <th>Puesto</th>
                        <th>Mazo</th>
                        <th>Premio Ganado</th>
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

                            <td className="col-deck">{p.deck || "—"}</td>

                            {/* PREMIO GANADO CON EDICIÓN INLINE */}
                            <td className="col-prize">
                              {editandoPremioId === p.id ? (
                                <div className="edit-prize-inline">
                                  <input
                                    type="text"
                                    value={textoPremioEdicion}
                                    onChange={(e) => setTextoPremioEdicion(e.target.value)}
                                    placeholder="Premio COP o físico"
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
                              ) : p.premioGanado ? (
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
                    <option value="Pokémon TCG">Pokémon TCG</option>
                    <option value="Magic: The Gathering">Magic: The Gathering</option>
                    <option value="Riftbound TCG">Riftbound TCG</option>
                    <option value="Otro TCG">Otro TCG</option>
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

              <div className="form-cols-row">
                <label className="form-field full-width">
                  <span>Pozo de Premios</span>
                  <textarea
                    rows={2}
                    placeholder="Ej: 1er Lugar: Booster Box sellada. Top 4: Sobres de torneo oficiales. Todos: Sobre de participación."
                    value={formPremios}
                    onChange={(e) => setFormPremios(e.target.value)}
                  />
                </label>
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
    </div>
  );
}
