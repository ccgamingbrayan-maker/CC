import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Search,
  Filter,
  Trophy,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  Copy,
  Check,
  Calendar,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Tag,
  ShieldCheck,
  Layers,
  Package,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Award,
  ChevronRight,
  Edit2,
  Save,
  Clock,
  MapPin,
  X
} from "lucide-react";
import {
  listarClientesCompletos,
  actualizarEstadoPagoCliente,
  actualizarClienteAdmin,
} from "../lib/clientes.js";
import { useAuth } from "../lib/AuthContext.jsx";

export default function Clientes() {
  const { esAdmin, user } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos"); // "todos" | "con_torneos" | "con_compras" | "con_deuda" | "one_piece" | "riftbound"
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState(null);
  const [tabDetalle, setTabDetalle] = useState("torneos"); // "torneos" | "compras" | "notas"

  // Estado de edición de notas admin
  const [editandoNotas, setEditandoNotas] = useState(false);
  const [notasTexto, setNotasTexto] = useState("");
  const [copiadoId, setCopiadoId] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  useEffect(() => {
    cargarClientes();
  }, []);

  async function cargarClientes() {
    setCargando(true);
    const data = await listarClientesCompletos();
    setClientes(data);
    if (data.length > 0 && !clienteSeleccionadoId) {
      setClienteSeleccionadoId(data[0].id);
      setNotasTexto(data[0].notasAdmin || "");
    }
    setCargando(false);
  }

  // Filtrado de clientes
  const clientesFiltrados = clientes.filter((c) => {
    // Filtro por texto
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      const match =
        (c.nombre || "").toLowerCase().includes(q) ||
        (c.nickname || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.bandaiId || "").toLowerCase().includes(q) ||
        (c.telefono || "").includes(q);
      if (!match) return false;
    }

    // Filtros rápidos
    if (filtroTipo === "con_torneos") return c.totalTorneos > 0;
    if (filtroTipo === "con_compras") return (c.compras || []).length > 0;
    if (filtroTipo === "con_deuda") return c.tieneDeuda;
    if (filtroTipo === "one_piece") {
      return (c.torneos || []).some((t) => t.juego?.includes("One Piece"));
    }
    if (filtroTipo === "riftbound") {
      return (c.torneos || []).some((t) => t.juego?.includes("Riftbound"));
    }

    return true;
  });

  // Cliente activo seleccionado
  const clienteActivo =
    clientes.find((c) => c.id === clienteSeleccionadoId) ||
    clientesFiltrados[0] ||
    null;

  useEffect(() => {
    if (clienteActivo) {
      setNotasTexto(clienteActivo.notasAdmin || "");
    }
  }, [clienteActivo?.id]);

  function copiarAlPortapapeles(texto) {
    if (!texto) return;
    navigator.clipboard.writeText(texto);
    setCopiadoId(true);
    setTimeout(() => setCopiadoId(false), 2000);
  }

  async function handleCambiarPago(torneoId, participanteId, nuevoEstado) {
    await actualizarEstadoPagoCliente(torneoId, participanteId, nuevoEstado);
    await cargarClientes();
    setMensajeExito("¡Estado de inscripción actualizado correctamente!");
    setTimeout(() => setMensajeExito(""), 3500);
  }

  async function handleGuardarNotas() {
    if (!clienteActivo) return;
    await actualizarClienteAdmin(clienteActivo.id, {
      ...clienteActivo,
      notasAdmin: notasTexto.trim(),
    });
    setEditandoNotas(false);
    await cargarClientes();
    setMensajeExito("¡Notas del cliente guardadas!");
    setTimeout(() => setMensajeExito(""), 3000);
  }

  // Métricas globales
  const metricas = clientes.reduce(
    (acc, c) => {
      acc.totalClientes++;
      acc.totalVentas += c.totalCompras;
      acc.totalDeuda += c.totalDeudaTorneos;
      if (c.totalTorneos > 0) acc.conTorneos++;
      return acc;
    },
    { totalClientes: 0, totalVentas: 0, totalDeuda: 0, conTorneos: 0 }
  );

  return (
    <div className="crm-page-view">
      {/* HEADER DE MÓDULO */}
      <div className="crm-header-banner">
        <div className="crm-header-left">
          <div className="crm-tag-badge">
            <Users size={13} />
            <span>CRM & Expedientes de Clientes</span>
          </div>
          <h1 className="crm-main-title">Directorio de Clientes y Jugadores</h1>
          <p className="crm-main-subtitle">
            Consulta el expediente 360° de cada jugador: sus torneos oficiales disputados, puestos y victorias, compras en tienda, deudas y mazos registrados.
          </p>
        </div>

        {/* NAVEGACIÓN ENTRE SECCIONES DE ADMINISTRACIÓN */}
        <div className="admin-segmented-nav">
          <Link to="/admin/agregar" className="admin-nav-tab" title="Gestión de catálogo de cartas">
            <Layers size={15} />
            <span>Cartas TCG</span>
          </Link>
          <Link to="/accesorios" className="admin-nav-tab" title="Gestión de accesorios">
            <Package size={15} />
            <span>Accesorios</span>
          </Link>
          <Link to="/torneos" className="admin-nav-tab" title="Módulo de torneos oficiales">
            <Trophy size={15} />
            <span>Torneos</span>
          </Link>
          <button type="button" className="admin-nav-tab active">
            <Users size={15} />
            <span>Clientes & Perfiles</span>
          </button>
        </div>
      </div>

      {/* METRIC CARDS GLOBALES */}
      <div className="crm-kpi-grid">
        <div className="crm-kpi-card">
          <div className="kpi-icon-wrap kpi-blue">
            <Users size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Clientes en Base de Datos</span>
            <strong className="kpi-val">{metricas.totalClientes}</strong>
          </div>
        </div>

        <div className="crm-kpi-card">
          <div className="kpi-icon-wrap kpi-purple">
            <Trophy size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Jugadores en Torneos</span>
            <strong className="kpi-val">{metricas.conTorneos} activos</strong>
          </div>
        </div>

        <div className="crm-kpi-card">
          <div className="kpi-icon-wrap kpi-green">
            <ShoppingCart size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Compras en Tienda (LTV)</span>
            <strong className="kpi-val">${metricas.totalVentas.toLocaleString("es-CO")} COP</strong>
          </div>
        </div>

        <div className="crm-kpi-card">
          <div className="kpi-icon-wrap kpi-rose">
            <CreditCard size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Deuda Pendiente Torneos</span>
            <strong className="kpi-val text-rose">${metricas.totalDeuda.toLocaleString("es-CO")} COP</strong>
          </div>
        </div>
      </div>

      {mensajeExito && (
        <div className="crm-alert-toast">
          <CheckCircle2 size={16} />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* LAYOUT PRINCIPAL: LISTA DE CLIENTES + EXPEDIENTE 360° */}
      <div className="crm-main-layout">
        {/* COLUMNA IZQUIERDA: LISTA Y BUSCADOR */}
        <aside className="crm-sidebar-list">
          {/* Buscador */}
          <div className="crm-search-box">
            <Search size={15} className="crm-search-icon" />
            <input
              type="text"
              placeholder="Buscar por nombre, nickname, ID o email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => setBusqueda("")}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Chips de filtro rápido */}
          <div className="crm-filter-chips">
            <button
              type="button"
              className={`filter-chip ${filtroTipo === "todos" ? "active" : ""}`}
              onClick={() => setFiltroTipo("todos")}
            >
              Todos ({clientes.length})
            </button>
            <button
              type="button"
              className={`filter-chip ${filtroTipo === "con_torneos" ? "active" : ""}`}
              onClick={() => setFiltroTipo("con_torneos")}
            >
              🏆 Con Torneos
            </button>
            <button
              type="button"
              className={`filter-chip ${filtroTipo === "con_compras" ? "active" : ""}`}
              onClick={() => setFiltroTipo("con_compras")}
            >
              🛍️ Compras
            </button>
            <button
              type="button"
              className={`filter-chip ${filtroTipo === "con_deuda" ? "active" : ""}`}
              onClick={() => setFiltroTipo("con_deuda")}
            >
              ⚠️ Con Deuda
            </button>
            <button
              type="button"
              className={`filter-chip ${filtroTipo === "one_piece" ? "active" : ""}`}
              onClick={() => setFiltroTipo("one_piece")}
            >
              🏴‍☠️ One Piece
            </button>
            <button
              type="button"
              className={`filter-chip ${filtroTipo === "riftbound" ? "active" : ""}`}
              onClick={() => setFiltroTipo("riftbound")}
            >
              ⚡ Riftbound
            </button>
          </div>

          {/* Lista de clientes */}
          <div className="crm-clients-scroll">
            {cargando ? (
              <div className="crm-loading-state">
                <div className="loading-spinner" />
                <span>Cargando directorio de clientes...</span>
              </div>
            ) : clientesFiltrados.length === 0 ? (
              <div className="crm-empty-state">
                <AlertCircle size={28} />
                <p>No se encontraron clientes con el filtro seleccionado.</p>
              </div>
            ) : (
              clientesFiltrados.map((c) => {
                const esActivo = clienteActivo?.id === c.id;
                const iniciales = (c.nombre || c.nickname || "CL")
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    key={c.id}
                    className={`crm-client-card ${esActivo ? "active" : ""}`}
                    onClick={() => {
                      setClienteSeleccionadoId(c.id);
                      setEditandoNotas(false);
                    }}
                  >
                    <div className="client-card-avatar">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.nombre} />
                      ) : (
                        <span>{iniciales}</span>
                      )}
                    </div>

                    <div className="client-card-body">
                      <div className="client-card-top">
                        <strong className="client-card-name">{c.nombre}</strong>
                        {c.rol === "admin" && (
                          <span className="badge-role-admin">Admin</span>
                        )}
                      </div>

                      <div className="client-card-sub">
                        {c.nickname && (
                          <span className="client-card-nick">@{c.nickname}</span>
                        )}
                        {c.bandaiId && (
                          <span className="client-card-bandai-id">ID: {c.bandaiId}</span>
                        )}
                      </div>

                      {/* Insignias de resumen */}
                      <div className="client-card-badges">
                        {c.totalTorneos > 0 && (
                          <span className="badge-torneos-count">
                            🏆 {c.totalTorneos} {c.totalTorneos === 1 ? "torneo" : "torneos"}
                          </span>
                        )}
                        {c.totalCompras > 0 && (
                          <span className="badge-compras-count">
                            🛍️ ${(c.totalCompras / 1000).toFixed(0)}k COP
                          </span>
                        )}
                        {c.tieneDeuda && (
                          <span className="badge-deuda-pill">
                            ⚠️ Debe ${c.totalDeudaTorneos.toLocaleString("es-CO")}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight size={16} className="client-card-arrow" />
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* COLUMNA DERECHA: EXPEDIENTE 360° DEL CLIENTE */}
        <main className="crm-details-view">
          {clienteActivo ? (
            <div className="client-dossier-card">
              {/* CABECERA DEL EXPEDIENTE */}
              <div className="dossier-header-banner">
                <div className="dossier-header-main">
                  <div className="dossier-avatar-large">
                    {clienteActivo.avatarUrl ? (
                      <img src={clienteActivo.avatarUrl} alt={clienteActivo.nombre} />
                    ) : (
                      <span>
                        {(clienteActivo.nombre || "CL")
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="dossier-identity">
                    <div className="dossier-name-row">
                      <h2 className="dossier-name">{clienteActivo.nombre}</h2>
                      {clienteActivo.rol === "admin" ? (
                        <span className="dossier-badge-admin">
                          <ShieldCheck size={13} />
                          <span>Administrador</span>
                        </span>
                      ) : (
                        <span className="dossier-badge-client">
                          <CheckCircle2 size={13} />
                          <span>Cliente Capsule Corp</span>
                        </span>
                      )}
                    </div>

                    {/* Fila de Nickname y Bandai ID */}
                    <div className="dossier-meta-chips">
                      {clienteActivo.nickname ? (
                        <span className="dossier-chip-nick" title="Nickname oficial en Bandai TCG+ / Riftbound">
                          <Sparkles size={13} />
                          <span>@{clienteActivo.nickname} (Bandai TCG+)</span>
                        </span>
                      ) : (
                        <span className="dossier-chip-muted">Sin Nickname Bandai registrado</span>
                      )}

                      {clienteActivo.bandaiId && (
                        <button
                          type="button"
                          className="dossier-chip-bandai-id"
                          onClick={() => copiarAlPortapapeles(clienteActivo.bandaiId)}
                          title="Clic para copiar Membership Number de Bandai"
                        >
                          <Tag size={12} />
                          <span>Bandai ID: {clienteActivo.bandaiId}</span>
                          {copiadoId ? <Check size={12} className="text-green" /> : <Copy size={12} />}
                        </button>
                      )}

                      <span className="dossier-chip-city">
                        <MapPin size={12} />
                        <span>{clienteActivo.ciudad || "Cali, Colombia"}</span>
                      </span>
                    </div>

                    {/* Contacto rápido */}
                    <div className="dossier-contact-row">
                      {clienteActivo.email && (
                        <a
                          href={`mailto:${clienteActivo.email}`}
                          className="dossier-contact-link"
                          title="Enviar correo"
                        >
                          <Mail size={13} />
                          <span>{clienteActivo.email}</span>
                        </a>
                      )}

                      {clienteActivo.telefono && (
                        <>
                          <a
                            href={`tel:${clienteActivo.telefono}`}
                            className="dossier-contact-link"
                            title="Llamar por teléfono"
                          >
                            <Phone size={13} />
                            <span>{clienteActivo.telefono}</span>
                          </a>
                          <a
                            href={`https://wa.me/57${clienteActivo.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `¡Hola ${clienteActivo.nombre}! Te escribimos desde Capsule Corp Gaming Cali.`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="dossier-whatsapp-btn"
                            title="Abrir chat en WhatsApp"
                          >
                            <MessageCircle size={14} />
                            <span>WhatsApp</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* MINI-KPIS DEL CLIENTE */}
              <div className="dossier-kpi-summary">
                <div className="d-kpi-item">
                  <span className="d-kpi-label">Torneos Jugados</span>
                  <strong className="d-kpi-val">{clienteActivo.totalTorneos}</strong>
                  <span className="d-kpi-sub">One Piece & Riftbound</span>
                </div>

                <div className="d-kpi-item highlight-trophy">
                  <span className="d-kpi-label">Mejor Puesto</span>
                  <strong className="d-kpi-val text-amber">{clienteActivo.mejorPuesto}</strong>
                  <span className="d-kpi-sub">Récord competitivo</span>
                </div>

                <div className="d-kpi-item">
                  <span className="d-kpi-label">Total en Compras (LTV)</span>
                  <strong className="d-kpi-val text-green">
                    ${clienteActivo.totalCompras.toLocaleString("es-CO")} COP
                  </strong>
                  <span className="d-kpi-sub">{(clienteActivo.compras || []).length} pedidos en tienda</span>
                </div>

                <div className={`d-kpi-item ${clienteActivo.tieneDeuda ? "highlight-debt" : "highlight-ok"}`}>
                  <span className="d-kpi-label">Estado de Deudas</span>
                  <strong className="d-kpi-val">
                    {clienteActivo.tieneDeuda ? (
                      <span className="text-rose">${clienteActivo.totalDeudaTorneos.toLocaleString("es-CO")} COP</span>
                    ) : (
                      <span className="text-green">Al día ($0)</span>
                    )}
                  </strong>
                  <span className="d-kpi-sub">
                    {clienteActivo.tieneDeuda ? "Inscripciones pendientes" : "Sin pagos adeudados"}
                  </span>
                </div>
              </div>

              {/* PESTAÑAS DE CONTENIDO DEL EXPEDIENTE */}
              <div className="dossier-tabs-nav">
                <button
                  type="button"
                  className={`d-tab-btn ${tabDetalle === "torneos" ? "active" : ""}`}
                  onClick={() => setTabDetalle("torneos")}
                >
                  <Trophy size={16} />
                  <span>Historial de Torneos ({clienteActivo.torneos.length})</span>
                </button>
                <button
                  type="button"
                  className={`d-tab-btn ${tabDetalle === "compras" ? "active" : ""}`}
                  onClick={() => setTabDetalle("compras")}
                >
                  <ShoppingCart size={16} />
                  <span>Compras & Pedidos ({(clienteActivo.compras || []).length})</span>
                </button>
                <button
                  type="button"
                  className={`d-tab-btn ${tabDetalle === "notas" ? "active" : ""}`}
                  onClick={() => setTabDetalle("notas")}
                >
                  <Edit2 size={16} />
                  <span>Notas Administrativas</span>
                </button>
              </div>

              {/* CONTENIDO DE PESTAÑAS */}
              <div className="dossier-tab-content">
                {/* PESTAÑA 1: TORNEOS */}
                {tabDetalle === "torneos" && (
                  <div className="tab-torneos-view">
                    {clienteActivo.torneos.length === 0 ? (
                      <div className="dossier-empty-tab">
                        <Trophy size={38} className="text-muted" />
                        <p>Este cliente aún no ha participado en torneos oficiales registrados.</p>
                        <Link to="/torneos" className="btn-link-action">
                          Ir a Torneos y Crear / Importar
                        </Link>
                      </div>
                    ) : (
                      <div className="dossier-torneos-list">
                        {clienteActivo.torneos.map((t, idx) => {
                          const numP = parseInt(String(t.puesto || "").replace(/\D/g, ""), 10);
                          const esPrimero = numP === 1;
                          const esSegundo = numP === 2;
                          const esTop4 = numP === 3 || numP === 4;

                          return (
                            <div key={idx} className="dossier-torneo-card">
                              <div className="dtc-header">
                                <div className="dtc-title-box">
                                  <span className={`dtc-game-tag ${t.juego?.includes("Riftbound") ? "rift" : "op"}`}>
                                    {t.juego}
                                  </span>
                                  <h4 className="dtc-title">{t.nombreTorneo}</h4>
                                  <div className="dtc-date">
                                    <Calendar size={13} />
                                    <span>
                                      {new Date(t.fecha).toLocaleDateString("es-CO", {
                                        weekday: "short",
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                  </div>
                                </div>

                                {/* Medalla / Puesto */}
                                <div className="dtc-rank-badge-wrap">
                                  <div
                                    className={`dtc-rank-pill ${
                                      esPrimero ? "oro" : esSegundo ? "plata" : esTop4 ? "bronce" : ""
                                    }`}
                                  >
                                    <Award size={15} />
                                    <strong>Puesto #{t.puesto}</strong>
                                  </div>
                                  <span className="dtc-score-details">
                                    {t.puntos ?? 0} pts • OMW: {t.omw || "50%"}
                                  </span>
                                </div>
                              </div>

                              <div className="dtc-details-grid">
                                <div className="dtc-detail-item">
                                  <span className="dtc-label">Mazo Registrado:</span>
                                  <strong className="dtc-val">{t.deck || "Mazo sin registrar"}</strong>
                                </div>

                                <div className="dtc-detail-item">
                                  <span className="dtc-label">Inscripción Oficial:</span>
                                  <strong className="dtc-val">
                                    ${Number(t.costoInscripcion || 0).toLocaleString("es-CO")} COP
                                  </strong>
                                </div>

                                {/* Control de pago de inscripción */}
                                <div className="dtc-detail-item">
                                  <span className="dtc-label">Estado de Pago:</span>
                                  <div className="dtc-payment-selector">
                                    <button
                                      type="button"
                                      className={`btn-pay-chip ${t.estadoPago === "pagado" ? "active-pagado" : ""}`}
                                      onClick={() => handleCambiarPago(t.torneoId, t.participanteId, "pagado")}
                                      title="Marcar como pagado completo"
                                    >
                                      ✓ Pagado
                                    </button>
                                    <button
                                      type="button"
                                      className={`btn-pay-chip ${t.estadoPago === "abono" ? "active-abono" : ""}`}
                                      onClick={() => handleCambiarPago(t.torneoId, t.participanteId, "abono")}
                                      title="Marcar con abono parcial"
                                    >
                                      Abono
                                    </button>
                                    <button
                                      type="button"
                                      className={`btn-pay-chip ${t.estadoPago === "debe" ? "active-debe" : ""}`}
                                      onClick={() => handleCambiarPago(t.torneoId, t.participanteId, "debe")}
                                      title="Marcar con deuda"
                                    >
                                      Debe
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Premio Ganado */}
                              {t.premioGanado && (
                                <div className="dtc-premio-banner">
                                  <div className="dtc-premio-icon">
                                    <Sparkles size={16} />
                                  </div>
                                  <div className="dtc-premio-info">
                                    <span className="dtc-premio-label">Premio Ganado en el Torneo:</span>
                                    <strong className="dtc-premio-text">{t.premioGanado}</strong>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* PESTAÑA 2: COMPRAS & PEDIDOS */}
                {tabDetalle === "compras" && (
                  <div className="tab-compras-view">
                    {(clienteActivo.compras || []).length === 0 ? (
                      <div className="dossier-empty-tab">
                        <ShoppingCart size={38} className="text-muted" />
                        <p>Este cliente aún no tiene pedidos registrados en la tienda.</p>
                      </div>
                    ) : (
                      <div className="dossier-pedidos-list">
                        {clienteActivo.compras.map((ped, idx) => (
                          <div key={idx} className="dossier-pedido-card">
                            <div className="dpc-header">
                              <div>
                                <div className="dpc-id-row">
                                  <span className="dpc-id">Pedido #{ped.id}</span>
                                  <span className={`dpc-status ${ped.estado}`}>
                                    {ped.estado === "entregado"
                                      ? "Entregado"
                                      : ped.estado === "pagado"
                                      ? "Pagado"
                                      : "Pendiente"}
                                  </span>
                                </div>
                                <span className="dpc-date">
                                  📅 {new Date(ped.creado_en).toLocaleDateString("es-CO", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>

                              <div className="dpc-total-box">
                                <span className="dpc-total-label">Total Pedido</span>
                                <strong className="dpc-total-val">
                                  ${Number(ped.total).toLocaleString("es-CO")} COP
                                </strong>
                              </div>
                            </div>

                            {/* Desglose de productos comprados */}
                            <div className="dpc-items-box">
                              <span className="dpc-items-title">Productos Comprados:</span>
                              <ul className="dpc-items-list">
                                {(ped.items || []).map((it, itIdx) => (
                                  <li key={itIdx} className="dpc-item-row">
                                    <span className="item-qty">{it.cantidad || 1}x</span>
                                    <span className="item-name">{it.nombre}</span>
                                    <span className="item-price">
                                      ${((it.precio || 0) * (it.cantidad || 1)).toLocaleString("es-CO")} COP
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* PESTAÑA 3: NOTAS ADMINISTRATIVAS */}
                {tabDetalle === "notas" && (
                  <div className="tab-notas-view">
                    <div className="notas-card">
                      <div className="notas-card-header">
                        <h4>Notas Internas de Capsule Corp Gaming</h4>
                        <p>Solo visibles para el personal y administradores de la tienda.</p>
                      </div>

                      <textarea
                        rows={6}
                        className="notas-textarea"
                        placeholder="Escribe información relevante sobre el cliente: mazos que busca, días que asiste a torneos, premios pendientes por entregar, etc."
                        value={notasTexto}
                        onChange={(e) => setNotasTexto(e.target.value)}
                      />

                      <div className="notas-actions">
                        <button
                          type="button"
                          className="btn-guardar-notas"
                          onClick={handleGuardarNotas}
                        >
                          <Save size={15} />
                          <span>Guardar Notas del Cliente</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="dossier-unselected-state">
              <Users size={48} className="text-muted" />
              <h3>Selecciona un cliente</h3>
              <p>Elige un cliente del panel izquierdo para ver su expediente 360° completo.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
