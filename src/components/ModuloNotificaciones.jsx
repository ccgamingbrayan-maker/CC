import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Mail,
  Send,
  Inbox,
  CheckCircle2,
  Clock,
  Sparkles,
  Trophy,
  Package,
  Megaphone,
  Gift,
  ExternalLink,
  Trash2,
  Check,
  Search,
  Filter,
  Users,
  User,
  AlertCircle,
  Copy,
  RefreshCw,
} from "lucide-react";
import {
  obtenerNotificacionesUsuario,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  eliminarNotificacionUsuario,
  obtenerMensajesEnviadosAdmin,
  enviarMensajeAdmin,
  generarMailtoUrl,
} from "../lib/notificaciones.js";
import { listarClientesCompletos } from "../lib/clientes.js";

export default function ModuloNotificaciones({ user, esAdmin }) {
  // Pestañas internas: "bandeja" | "redactar" | "enviados"
  const [subTab, setSubTab] = useState("bandeja");

  // Estado de notificaciones recibidas
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargandoNotifs, setCargandoNotifs] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [busqueda, setBusqueda] = useState("");

  // Estado de mensajes enviados (Admin)
  const [enviados, setEnviados] = useState([]);
  const [cargandoEnviados, setCargandoEnviados] = useState(false);

  // Lista de clientes registrados para autocompletado en redacción
  const [clientesDisponibles, setClientesDisponibles] = useState([]);

  // Formulario de redacción de nuevo mensaje / correo
  const [formTitulo, setFormTitulo] = useState("");
  const [formMensaje, setFormMensaje] = useState("");
  const [formCanal, setFormCanal] = useState("ambos"); // "plataforma" | "correo" | "ambos"
  const [formCategoria, setFormCategoria] = useState("general"); // "general" | "torneo" | "pedido" | "preventa" | "promo"
  const [formDestinatarioTipo, setFormDestinatarioTipo] = useState("todos"); // "todos" | "torneos" | "pedidos" | "especifico"
  const [formDestinatarioEmail, setFormDestinatarioEmail] = useState("");
  const [formEnlace, setFormEnlace] = useState("");
  const [formEnlaceTexto, setFormEnlaceTexto] = useState("Ver detalles");
  const [enviando, setEnviando] = useState(false);
  const [alertaExito, setAlertaExito] = useState("");
  const [alertaError, setAlertaError] = useState("");
  const [copiado, setCopiado] = useState(false);

  // Cargar notificaciones al montar
  useEffect(() => {
    cargarNotificaciones();
    if (esAdmin) {
      cargarEnviados();
      cargarClientes();
    }
  }, [user?.id, esAdmin]);

  async function cargarNotificaciones() {
    setCargandoNotifs(true);
    const data = await obtenerNotificacionesUsuario(user);
    setNotificaciones(data);
    setCargandoNotifs(false);
  }

  async function cargarEnviados() {
    setCargandoEnviados(true);
    const data = await obtenerMensajesEnviadosAdmin();
    setEnviados(data);
    setCargandoEnviados(false);
  }

  async function cargarClientes() {
    const data = await listarClientesCompletos();
    setClientesDisponibles(data);
  }

  async function handleMarcarLeida(id) {
    const actualizadas = await marcarNotificacionLeida(id, user.id);
    setNotificaciones(actualizadas || []);
  }

  async function handleMarcarTodasLeidas() {
    const actualizadas = await marcarTodasNotificacionesLeidas(user.id);
    setNotificaciones(actualizadas || []);
  }

  async function handleEliminarNotif(id) {
    const actualizadas = await eliminarNotificacionUsuario(id, user.id);
    setNotificaciones(actualizadas || []);
  }

  async function handleEnviarMensaje(e) {
    e.preventDefault();
    setAlertaExito("");
    setAlertaError("");

    if (!formTitulo.trim()) {
      setAlertaError("Por favor ingresa un título o asunto para el mensaje.");
      return;
    }
    if (!formMensaje.trim()) {
      setAlertaError("Por favor ingresa el contenido del mensaje.");
      return;
    }
    if (formDestinatarioTipo === "especifico" && !formDestinatarioEmail.trim()) {
      setAlertaError("Debes seleccionar o escribir un correo electrónico destinatario.");
      return;
    }

    setEnviando(true);
    try {
      const res = await enviarMensajeAdmin({
        titulo: formTitulo,
        asunto: formTitulo,
        mensaje: formMensaje,
        canal: formCanal,
        categoria: formCategoria,
        destinatarioTipo: formDestinatarioTipo,
        destinatarioEmail: formDestinatarioEmail,
        enlace: formEnlace,
        enlaceTexto: formEnlaceTexto,
        adminUser: user,
      });

      setAlertaExito(
        res.mensaje || "¡Mensaje y notificaciones despachados correctamente!"
      );

      // Limpiar formulario
      setFormTitulo("");
      setFormMensaje("");
      setFormEnlace("");
      setFormDestinatarioEmail("");

      // Recargar enviados y bandeja
      await cargarEnviados();
      await cargarNotificaciones();
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      setAlertaError(err.message || "Ocurrió un error al despachar el mensaje.");
    } finally {
      setEnviando(false);
    }
  }

  function usarComoPlantilla(msg) {
    setFormTitulo(msg.titulo || msg.asunto || "");
    setFormMensaje(msg.mensaje || "");
    setFormCanal(msg.canal || "ambos");
    setFormCategoria(msg.categoria || "general");
    setFormDestinatarioTipo(msg.destinatario_tipo || "todos");
    setFormDestinatarioEmail(msg.destinatario_email && msg.destinatario_email !== "Todos los clientes" ? msg.destinatario_email : "");
    setFormEnlace(msg.enlace || "");
    setFormEnlaceTexto(msg.enlace_texto || "Ver detalles");
    setSubTab("redactar");
    window.scrollTo({ top: 300, behavior: "smooth" });
  }

  // Filtrado de la bandeja de entrada
  const notificacionesFiltradas = notificaciones.filter((n) => {
    if (filtroCategoria === "sin_leer" && n.leido) return false;
    if (filtroCategoria !== "todas" && filtroCategoria !== "sin_leer" && n.categoria !== filtroCategoria) {
      return false;
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      const match =
        (n.titulo || "").toLowerCase().includes(q) ||
        (n.mensaje || "").toLowerCase().includes(q) ||
        (n.categoria || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const totalNoLeidas = notificaciones.filter((n) => !n.leido).length;

  return (
    <div className="modulo-notificaciones-container">
      {/* HEADER DE LA SECCIÓN */}
      <div className="notif-hero-bar">
        <div className="notif-hero-text">
          <div className="notif-title-row">
            <h2>Mensajes y Notificaciones</h2>
            {totalNoLeidas > 0 && (
              <span className="notif-badge-pill">
                {totalNoLeidas} {totalNoLeidas === 1 ? "nueva" : "nuevas"}
              </span>
            )}
          </div>
          <p>
            Historial de mensajes al correo, confirmaciones de pedidos, novedades de torneos y comunicados de Capsule Corp Gaming.
          </p>
        </div>

        {/* NAVEGACIÓN ENTRE SUB-PESTAÑAS */}
        <div className="notif-subnav-pills">
          <button
            type="button"
            className={`notif-pill-btn ${subTab === "bandeja" ? "active" : ""}`}
            onClick={() => setSubTab("bandeja")}
          >
            <Inbox size={15} />
            <span>Bandeja ({notificaciones.length})</span>
          </button>

          {esAdmin && (
            <>
              <button
                type="button"
                className={`notif-pill-btn ${subTab === "redactar" ? "active" : ""}`}
                onClick={() => setSubTab("redactar")}
              >
                <Send size={15} />
                <span>Enviar Notificación / Correo</span>
              </button>

              <button
                type="button"
                className={`notif-pill-btn ${subTab === "enviados" ? "active" : ""}`}
                onClick={() => setSubTab("enviados")}
              >
                <Clock size={15} />
                <span>Mensajes Enviados ({enviados.length})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: BANDEJA DE ENTRADA (NOTIFICACIONES DEL USUARIO) */}
      {/* ========================================================================= */}
      {subTab === "bandeja" && (
        <div className="notif-bandeja-view">
          {/* Barra de herramientas: Filtros y Buscador */}
          <div className="notif-toolbar">
            <div className="notif-filter-chips">
              <button
                type="button"
                className={`notif-chip ${filtroCategoria === "todas" ? "active" : ""}`}
                onClick={() => setFiltroCategoria("todas")}
              >
                Todas ({notificaciones.length})
              </button>
              <button
                type="button"
                className={`notif-chip ${filtroCategoria === "sin_leer" ? "active" : ""}`}
                onClick={() => setFiltroCategoria("sin_leer")}
              >
                🔔 Sin leer ({totalNoLeidas})
              </button>
              <button
                type="button"
                className={`notif-chip ${filtroCategoria === "pedido" ? "active" : ""}`}
                onClick={() => setFiltroCategoria("pedido")}
              >
                📦 Pedidos
              </button>
              <button
                type="button"
                className={`notif-chip ${filtroCategoria === "torneo" ? "active" : ""}`}
                onClick={() => setFiltroCategoria("torneo")}
              >
                🏆 Torneos
              </button>
              <button
                type="button"
                className={`notif-chip ${filtroCategoria === "general" ? "active" : ""}`}
                onClick={() => setFiltroCategoria("general")}
              >
                📢 Comunicados
              </button>
            </div>

            <div className="notif-toolbar-actions">
              <div className="notif-search-input">
                <Search size={14} className="notif-search-icon" />
                <input
                  type="text"
                  placeholder="Buscar en mensajes..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              {totalNoLeidas > 0 && (
                <button
                  type="button"
                  className="notif-btn-secondary"
                  onClick={handleMarcarTodasLeidas}
                  title="Marcar todas como leídas"
                >
                  <Check size={14} />
                  <span>Marcar todas leídas</span>
                </button>
              )}
            </div>
          </div>

          {/* Listado de Notificaciones */}
          {cargandoNotifs ? (
            <div className="notif-empty-box">
              <RefreshCw size={24} className="spin-icon" />
              <p>Cargando tus notificaciones…</p>
            </div>
          ) : notificacionesFiltradas.length === 0 ? (
            <div className="notif-empty-box">
              <div className="notif-empty-icon">
                <Inbox size={32} />
              </div>
              <h3>No tienes notificaciones en este filtro</h3>
              <p>Cuando recibas avisos de pedidos, torneos o comunicados, los verás aquí reflejados.</p>
              {filtroCategoria !== "todas" && (
                <button
                  type="button"
                  className="notif-btn-outline"
                  onClick={() => setFiltroCategoria("todas")}
                >
                  Ver todas las notificaciones
                </button>
              )}
            </div>
          ) : (
            <div className="notif-items-list">
              {notificacionesFiltradas.map((notif) => {
                const iconoCategoria =
                  notif.categoria === "pedido" ? (
                    <Package size={18} />
                  ) : notif.categoria === "torneo" ? (
                    <Trophy size={18} />
                  ) : notif.categoria === "promo" ? (
                    <Gift size={18} />
                  ) : (
                    <Megaphone size={18} />
                  );

                const fechaFormateada = notif.creado_en
                  ? new Date(notif.creado_en).toLocaleDateString("es-CO", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Reciente";

                return (
                  <article
                    key={notif.id}
                    className={`notif-card ${!notif.leido ? "no-leida" : ""}`}
                    onClick={() => {
                      if (!notif.leido) handleMarcarLeida(notif.id);
                    }}
                  >
                    <div className="notif-card-icon-col">
                      <div className={`notif-category-icon cat-${notif.categoria || "general"}`}>
                        {iconoCategoria}
                      </div>
                    </div>

                    <div className="notif-card-content">
                      <div className="notif-card-header-row">
                        <div className="notif-card-title-group">
                          {!notif.leido && <span className="notif-unread-dot" title="No leído" />}
                          <h4 className="notif-card-title">{notif.titulo || notif.asunto}</h4>
                          <span className={`notif-category-tag cat-${notif.categoria || "general"}`}>
                            {notif.categoria === "pedido"
                              ? "Pedido"
                              : notif.categoria === "torneo"
                              ? "Torneo"
                              : notif.categoria === "promo"
                              ? "Promoción"
                              : "Aviso"}
                          </span>
                          {(notif.canal === "correo" || notif.canal === "ambos") && (
                            <span className="notif-channel-tag" title="Enviado al correo electrónico">
                              <Mail size={11} />
                              <span>Correo</span>
                            </span>
                          )}
                        </div>
                        <time className="notif-card-time">{fechaFormateada}</time>
                      </div>

                      <p className="notif-card-body">{notif.mensaje}</p>

                      <div className="notif-card-footer">
                        {notif.enlace && (
                          <Link
                            to={notif.enlace}
                            className="notif-action-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>{notif.enlace_texto || "Ver detalles"}</span>
                            <ExternalLink size={13} />
                          </Link>
                        )}

                        <div className="notif-card-quick-actions" onClick={(e) => e.stopPropagation()}>
                          {!notif.leido ? (
                            <button
                              type="button"
                              className="notif-btn-icon-text"
                              onClick={() => handleMarcarLeida(notif.id)}
                              title="Marcar como leída"
                            >
                              <Check size={13} />
                              <span>Marcar leída</span>
                            </button>
                          ) : (
                            <span className="notif-status-read">
                              <CheckCircle2 size={13} />
                              <span>Leído</span>
                            </span>
                          )}

                          <button
                            type="button"
                            className="notif-btn-delete"
                            onClick={() => handleEliminarNotif(notif.id)}
                            title="Eliminar de mi bandeja"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: REDACTAR / ENVIAR MENSAJE O CORREO (CONSOLA DE ADMINISTRADOR) */}
      {/* ========================================================================= */}
      {esAdmin && subTab === "redactar" && (
        <div className="notif-redactar-layout">
          <div className="notif-redactar-card">
            <div className="notif-form-header">
              <div className="notif-form-icon">
                <Send size={20} />
              </div>
              <div>
                <h3>Redactar y Enviar Comunicado Oficial</h3>
                <p>
                  Envía notificaciones instantáneas a los perfiles de los usuarios y correos electrónicos automáticos con el diseño de Capsule Corp Gaming.
                </p>
              </div>
            </div>

            {alertaExito && (
              <div className="notif-alert-success">
                <CheckCircle2 size={16} />
                <span>{alertaExito}</span>
              </div>
            )}

            {alertaError && (
              <div className="notif-alert-error">
                <AlertCircle size={16} />
                <span>{alertaError}</span>
              </div>
            )}

            <form onSubmit={handleEnviarMensaje} className="notif-form">
              {/* FILA 1: DESTINATARIOS */}
              <div className="notif-form-group">
                <label>
                  <Users size={14} />
                  <span>Destinatarios del mensaje</span>
                </label>
                <div className="notif-dest-options">
                  <label className={`notif-dest-radio ${formDestinatarioTipo === "todos" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="destinatarioTipo"
                      value="todos"
                      checked={formDestinatarioTipo === "todos"}
                      onChange={(e) => setFormDestinatarioTipo(e.target.value)}
                    />
                    <div>
                      <strong>📢 Todos los usuarios registrados</strong>
                      <small>Comunicado global para toda la comunidad</small>
                    </div>
                  </label>

                  <label className={`notif-dest-radio ${formDestinatarioTipo === "torneos" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="destinatarioTipo"
                      value="torneos"
                      checked={formDestinatarioTipo === "torneos"}
                      onChange={(e) => setFormDestinatarioTipo(e.target.value)}
                    />
                    <div>
                      <strong>🏆 Jugadores de Torneos</strong>
                      <small>Participantes de One Piece y Riftbound TCG</small>
                    </div>
                  </label>

                  <label className={`notif-dest-radio ${formDestinatarioTipo === "pedidos" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="destinatarioTipo"
                      value="pedidos"
                      checked={formDestinatarioTipo === "pedidos"}
                      onChange={(e) => setFormDestinatarioTipo(e.target.value)}
                    />
                    <div>
                      <strong>📦 Clientes con compras / pedidos</strong>
                      <small>Avisos de tienda, estado y novedades</small>
                    </div>
                  </label>

                  <label className={`notif-dest-radio ${formDestinatarioTipo === "especifico" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="destinatarioTipo"
                      value="especifico"
                      checked={formDestinatarioTipo === "especifico"}
                      onChange={(e) => setFormDestinatarioTipo(e.target.value)}
                    />
                    <div>
                      <strong>👤 Cliente o correo específico</strong>
                      <small>Mensaje dirigido a una persona</small>
                    </div>
                  </label>
                </div>

                {/* Si seleccionó específico, mostrar selector o input libre */}
                {formDestinatarioTipo === "especifico" && (
                  <div className="notif-specific-recipient-row">
                    <div className="notif-input-wrapper">
                      <label className="sub-label">Seleccionar de clientes o escribir correo:</label>
                      <div className="notif-combo-input">
                        <select
                          value={formDestinatarioEmail}
                          onChange={(e) => setFormDestinatarioEmail(e.target.value)}
                          className="notif-select"
                        >
                          <option value="">-- Seleccionar cliente registrado --</option>
                          {clientesDisponibles.map((cl) => (
                            <option key={cl.id} value={cl.email}>
                              {cl.nombre} ({cl.nickname ? `@${cl.nickname} · ` : ""}{cl.email})
                            </option>
                          ))}
                        </select>
                        <input
                          type="email"
                          placeholder="O escribe un correo: cliente@gmail.com"
                          value={formDestinatarioEmail}
                          onChange={(e) => setFormDestinatarioEmail(e.target.value)}
                          className="notif-input"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* FILA 2: CANAL Y CATEGORÍA */}
              <div className="notif-form-grid-2">
                <div className="notif-form-group">
                  <label>
                    <Mail size={14} />
                    <span>Canal de envío</span>
                  </label>
                  <select
                    value={formCanal}
                    onChange={(e) => setFormCanal(e.target.value)}
                    className="notif-select"
                  >
                    <option value="ambos">🚀 Ambos canales (Perfil + Correo Electrónico)</option>
                    <option value="correo">✉️ Solo Correo Electrónico (Email)</option>
                    <option value="plataforma">🔔 Solo Notificación en Perfil</option>
                  </select>
                  <span className="notif-help-text">
                    {formCanal === "ambos"
                      ? "El destinatario lo verá en su perfil y además recibirá un email formal."
                      : formCanal === "correo"
                      ? "Se despachará mediante el servidor SMTP oficial de Capsule Corp Gaming."
                      : "Aparecerá directamente en su pestaña de mensajes del perfil."}
                  </span>
                </div>

                <div className="notif-form-group">
                  <label>
                    <Filter size={14} />
                    <span>Categoría</span>
                  </label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value)}
                    className="notif-select"
                  >
                    <option value="general">📢 Comunicado Oficial / General</option>
                    <option value="torneo">🏆 Torneo y Juego Competitivo</option>
                    <option value="pedido">📦 Pedidos y Despachos</option>
                    <option value="preventa">✨ Pre-Ventas y Catálogo</option>
                    <option value="promo">🎁 Promoción o Beneficio</option>
                  </select>
                </div>
              </div>

              {/* FILA 3: ASUNTO / TÍTULO */}
              <div className="notif-form-group">
                <label>
                  <Sparkles size={14} />
                  <span>Asunto / Título del comunicado</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: ¡Inscripciones abiertas para el Torneo OP-09 de este sábado!"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  className="notif-input notif-input-lg"
                  required
                />
              </div>

              {/* FILA 4: CUERPO DEL MENSAJE */}
              <div className="notif-form-group">
                <label>
                  <span>Mensaje completo</span>
                  <small className="notif-char-count">{formMensaje.length} caracteres</small>
                </label>
                <textarea
                  rows={5}
                  placeholder="Escribe el mensaje detallado que recibirán tus clientes o jugadores. Puedes usar saltos de línea para estructurar párrafos..."
                  value={formMensaje}
                  onChange={(e) => setFormMensaje(e.target.value)}
                  className="notif-textarea"
                  required
                />
              </div>

              {/* FILA 5: ENLACE OPCIONAL */}
              <div className="notif-form-grid-2">
                <div className="notif-form-group">
                  <label>
                    <ExternalLink size={14} />
                    <span>Enlace de acción (Opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: /torneos o /catalogo o URL externa"
                    value={formEnlace}
                    onChange={(e) => setFormEnlace(e.target.value)}
                    className="notif-input"
                  />
                </div>

                <div className="notif-form-group">
                  <label>
                    <span>Texto del botón de enlace</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Ver Torneo / Ir al Catálogo"
                    value={formEnlaceTexto}
                    onChange={(e) => setFormEnlaceTexto(e.target.value)}
                    className="notif-input"
                  />
                </div>
              </div>

              {/* ACCIONES Y BOTÓN DE ENVÍO */}
              <div className="notif-form-actions-row">
                <button
                  type="submit"
                  disabled={enviando}
                  className="notif-btn-submit"
                >
                  <Send size={16} />
                  <span>{enviando ? "Despachando mensaje..." : "Despachar y Enviar Mensaje"}</span>
                </button>

                {formDestinatarioTipo === "especifico" && formDestinatarioEmail && (
                  <a
                    href={generarMailtoUrl({
                      email: formDestinatarioEmail,
                      asunto: formTitulo,
                      mensaje: formMensaje,
                    })}
                    className="notif-btn-mailto"
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir en Gmail o gestor de correo predeterminado del sistema"
                  >
                    <Mail size={15} />
                    <span>Abrir en mi Correo (Gmail / Outlook)</span>
                  </a>
                )}
              </div>
            </form>
          </div>

          {/* VISTA PREVIA LATERAL */}
          <aside className="notif-preview-sidebar">
            <div className="notif-preview-header">
              <Sparkles size={16} />
              <h4>Vista previa en vivo</h4>
            </div>

            <div className="notif-preview-card">
              <div className="preview-label">Así se verá en el perfil del cliente:</div>
              <div className="notif-card preview-mode">
                <div className="notif-card-icon-col">
                  <div className={`notif-category-icon cat-${formCategoria}`}>
                    {formCategoria === "pedido" ? (
                      <Package size={18} />
                    ) : formCategoria === "torneo" ? (
                      <Trophy size={18} />
                    ) : formCategoria === "promo" ? (
                      <Gift size={18} />
                    ) : (
                      <Megaphone size={18} />
                    )}
                  </div>
                </div>
                <div className="notif-card-content">
                  <div className="notif-card-header-row">
                    <h4 className="notif-card-title">
                      {formTitulo || "Título de la notificación..."}
                    </h4>
                    <span className="notif-category-tag cat-general">
                      {formCategoria.toUpperCase()}
                    </span>
                  </div>
                  <p className="notif-card-body">
                    {formMensaje || "Aquí aparecerá el cuerpo del mensaje redactado para tus jugadores o clientes..."}
                  </p>
                  {formEnlace && (
                    <div className="notif-action-link" style={{ pointerEvents: "none" }}>
                      <span>{formEnlaceTexto || "Ver detalles"}</span>
                      <ExternalLink size={13} />
                    </div>
                  )}
                </div>
              </div>

              {(formCanal === "correo" || formCanal === "ambos") && (
                <div className="email-preview-box">
                  <div className="preview-label">Formato de correo electrónico:</div>
                  <div className="email-mock-container">
                    <div className="email-mock-header">
                      <strong>De:</strong> CapsuleCorp Gaming &lt;ccshop2026@gmail.com&gt;<br />
                      <strong>Para:</strong> {formDestinatarioTipo === "especifico" ? formDestinatarioEmail || "cliente@ejemplo.com" : "Todos los clientes"}<br />
                      <strong>Asunto:</strong> {formTitulo || "Asunto del correo"}
                    </div>
                    <div className="email-mock-body">
                      <p>{formMensaje || "Mensaje del correo electrónico..."}</p>
                      {formEnlace && (
                        <div className="email-mock-btn">
                          {formEnlaceTexto || "Ver detalles"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: HISTORIAL DE MENSAJES ENVIADOS (ADMIN) */}
      {/* ========================================================================= */}
      {esAdmin && subTab === "enviados" && (
        <div className="notif-enviados-view">
          <div className="notif-enviados-header">
            <div>
              <h3>Historial de Comunicados y Mensajes Enviados</h3>
              <p>Registro de todos los mensajes y correos que has enviado a los clientes o jugadores.</p>
            </div>
            <button
              type="button"
              className="notif-btn-secondary"
              onClick={cargarEnviados}
              title="Recargar historial"
            >
              <RefreshCw size={14} className={cargandoEnviados ? "spin-icon" : ""} />
              <span>Actualizar</span>
            </button>
          </div>

          {cargandoEnviados ? (
            <div className="notif-empty-box">
              <RefreshCw size={24} className="spin-icon" />
              <p>Cargando mensajes enviados…</p>
            </div>
          ) : enviados.length === 0 ? (
            <div className="notif-empty-box">
              <Clock size={32} />
              <h3>Aún no has enviado mensajes o comunicados</h3>
              <p>Utiliza la pestaña "Enviar Notificación / Correo" para mandar tu primer mensaje.</p>
              <button
                type="button"
                className="notif-btn-submit"
                onClick={() => setSubTab("redactar")}
              >
                <Send size={15} />
                <span>Redactar primer comunicado</span>
              </button>
            </div>
          ) : (
            <div className="notif-enviados-grid">
              {enviados.map((item) => {
                const fecha = item.creado_en
                  ? new Date(item.creado_en).toLocaleDateString("es-CO", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Fecha reciente";

                return (
                  <article key={item.id} className="notif-sent-card">
                    <div className="notif-sent-top">
                      <div className="notif-sent-meta">
                        <span className="notif-sent-dest">
                          <Users size={13} />
                          <strong>Destinatario:</strong>{" "}
                          {item.destinatario_email || (item.destinatario_tipo === "todos" ? "Todos los usuarios" : "Grupo de clientes")}
                        </span>
                        <span className="notif-sent-canal">
                          {item.canal === "correo" ? (
                            <>
                              <Mail size={12} /> Correo
                            </>
                          ) : item.canal === "plataforma" ? (
                            <>
                              <Bell size={12} /> Perfil
                            </>
                          ) : (
                            <>
                              <Send size={12} /> Perfil + Correo
                            </>
                          )}
                        </span>
                      </div>
                      <time className="notif-sent-date">{fecha}</time>
                    </div>

                    <h4 className="notif-sent-title">{item.titulo || item.asunto}</h4>
                    <p className="notif-sent-text">{item.mensaje}</p>

                    <div className="notif-sent-footer">
                      <div className="notif-sent-tags">
                        <span className="notif-status-badge success">
                          <CheckCircle2 size={12} />
                          <span>Despachado</span>
                        </span>
                        {item.correo_enviado && (
                          <span className="notif-status-badge email-ok">
                            <Mail size={12} />
                            <span>Email enviado</span>
                          </span>
                        )}
                        {item.enlace && (
                          <span className="notif-link-badge" title={item.enlace}>
                            <ExternalLink size={12} />
                            <span>{item.enlace_texto || item.enlace}</span>
                          </span>
                        )}
                      </div>

                      <div className="notif-sent-actions">
                        <button
                          type="button"
                          className="notif-btn-template"
                          onClick={() => usarComoPlantilla(item)}
                          title="Usar este mensaje como plantilla para redactar uno nuevo"
                        >
                          <Copy size={13} />
                          <span>Usar como plantilla</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
