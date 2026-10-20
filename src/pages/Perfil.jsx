import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Heart,
  Package,
  Save,
  HeartOff,
  KeyRound,
  Layers,
  Sparkles,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Calendar,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import { obtenerTorneosUsuario } from "../lib/torneos.js";
import Cargando from "../components/Cargando.jsx";
import ColeccionFisica from "../components/ColeccionFisica.jsx";
import CreadorDecks from "../components/CreadorDecks.jsx";

export default function Perfil() {
  const { user, cargando } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("datos");

  useEffect(() => {
    if (!cargando && !user) navigate("/login", { replace: true });
  }, [cargando, user, navigate]);

  if (cargando) return <Cargando texto="Cargando tu perfil…" />;
  if (!user) return null;

  const nombre = user.user_metadata?.nombre || "Mi cuenta";
  const inicial = (user.user_metadata?.nombre || user.email || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <section className="perfil">
      <div className="contenedor">
        <header className="perfil-card-header">
          <div className="perfil-user-spotlight">
            <div className="perfil-avatar-circle">{inicial}</div>
            <div className="perfil-user-meta">
              <div className="perfil-name-badge-row">
                <h1 className="perfil-user-name">{nombre}</h1>
                <span className="perfil-badge-verified">Cuenta Verificada</span>
              </div>
              <p className="perfil-user-email">{user.email}</p>
              <div className="perfil-meta-footer">
                <span className="perfil-member-date">
                  Miembro desde {new Date(user.created_at).toLocaleDateString("es-CO", {
                    year: "numeric",
                    month: "long",
                  })}
                </span>
              </div>
            </div>
          </div>
        </header>

        <nav className="perfil-nav-bar" aria-label="Secciones de perfil">
          <div className="perfil-nav-tabs">
            <button
              type="button"
              className={`perfil-tab-btn ${tab === "datos" ? "active" : ""}`}
              onClick={() => setTab("datos")}
            >
              <User size={16} />
              <span>Mis datos</span>
            </button>
            <button
              type="button"
              className={`perfil-tab-btn ${tab === "coleccion" ? "active" : ""}`}
              onClick={() => setTab("coleccion")}
            >
              <Layers size={16} />
              <span>Mi Colección</span>
            </button>
            <button
              type="button"
              className={`perfil-tab-btn ${tab === "decks" ? "active" : ""}`}
              onClick={() => setTab("decks")}
            >
              <Sparkles size={16} />
              <span>Creador de Decks</span>
            </button>
            <button
              type="button"
              className={`perfil-tab-btn ${tab === "wishlist" ? "active" : ""}`}
              onClick={() => setTab("wishlist")}
            >
              <Heart size={16} />
              <span>Wishlist</span>
            </button>
            <button
              type="button"
              className={`perfil-tab-btn ${tab === "pedidos" ? "active" : ""}`}
              onClick={() => setTab("pedidos")}
            >
              <Package size={16} />
              <span>Pedidos</span>
            </button>
            <button
              type="button"
              className={`perfil-tab-btn ${tab === "torneos" ? "active" : ""}`}
              onClick={() => setTab("torneos")}
            >
              <Trophy size={16} />
              <span>Mis Torneos</span>
            </button>
          </div>
        </nav>

        {tab === "datos" && (
          <>
            <DatosUsuario user={user} />
            <CambiarPassword />
          </>
        )}
        {tab === "coleccion" && <ColeccionFisica user={user} />}
        {tab === "decks" && <CreadorDecks user={user} />}
        {tab === "wishlist" && <Wishlist user={user} />}
        {tab === "pedidos" && <Pedidos user={user} />}
        {tab === "torneos" && <MisTorneos user={user} />}
      </div>
    </section>
  );
}

function DatosUsuario({ user }) {
  const [nombre, setNombre] = useState(user.user_metadata?.nombre ?? "");
  const [telefono, setTelefono] = useState(user.user_metadata?.telefono ?? "");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function guardar(e) {
    e.preventDefault();
    setMensaje("");
    setError("");
    if (nombre.trim().length < 3) {
      setError("El nombre debe tener al menos 3 caracteres.");
      return;
    }
    setGuardando(true);
    const { error } = await supabase.auth.updateUser({
      data: { nombre: nombre.trim(), telefono: telefono.trim() },
    });
    setGuardando(false);
    if (error) setError("No se pudieron guardar los datos. " + error.message);
    else setMensaje("Datos actualizados correctamente.");
  }

  return (
    <div className="perfil-panel">
      <h3>Mis datos</h3>
      <form onSubmit={guardar} className="perfil-form">
        <label>
          Correo (no editable)
          <input type="email" value={user.email} disabled />
        </label>
        <label>
          Nombre completo
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </label>
        <label>
          Teléfono
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej: 300 123 4567"
          />
        </label>
        <button type="submit" className="auth-boton perfil-guardar" disabled={guardando}>
          <Save size={16} /> {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
      {error && <p className="auth-mensaje auth-error">{error}</p>}
      {mensaje && <p className="auth-mensaje auth-exito">{mensaje}</p>}
    </div>
  );
}

function CambiarPassword() {
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function cambiar(e) {
    e.preventDefault();
    setMensaje("");
    setError("");
    if (nueva !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setEnviando(true);
    const { error } = await supabase.auth.updateUser({ password: nueva });
    setEnviando(false);
    if (error) {
      setError("No se pudo cambiar la contraseña. " + error.message);
    } else {
      setMensaje("Contraseña actualizada correctamente.");
      setNueva("");
      setConfirmar("");
    }
  }

  return (
    <div className="perfil-panel">
      <h3>Cambiar contraseña</h3>
      <form onSubmit={cambiar} className="perfil-form">
        <label>
          Nueva contraseña
          <input
            type="password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            required
          />
        </label>
        <label>
          Confirmar nueva contraseña
          <input
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            placeholder="Repite la nueva contraseña"
            minLength={6}
            required
          />
        </label>
        <button type="submit" className="auth-boton perfil-guardar" disabled={enviando}>
          <KeyRound size={16} /> {enviando ? "Actualizando…" : "Actualizar contraseña"}
        </button>
      </form>
      {error && <p className="auth-mensaje auth-error">{error}</p>}
      {mensaje && <p className="auth-mensaje auth-exito">{mensaje}</p>}
    </div>
  );
}

function Wishlist({ user }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    supabase
      .from("wishlist")
      .select("id, carta_id, cartas(id,nombre,imagen,precio)")
      .eq("user_id", user.id)
      .order("creado_en", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("Error cargando wishlist:", error);
        setItems(data ?? []);
      });
  }, [user.id]);

  async function quitar(e, id) {
    e.preventDefault();
    const { error } = await supabase.from("wishlist").delete().eq("id", id);
    if (!error) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  if (items === null) return <Cargando texto="Cargando tu wishlist…" />;

  if (items.length === 0) {
    return (
      <div className="perfil-panel perfil-vacio">
        <Heart size={36} />
        <p>Aún no tienes cartas guardadas en tu wishlist.</p>
        <p>
          Explora el <Link to="/">catálogo</Link> y guarda tus favoritas con el
          corazón.
        </p>
      </div>
    );
  }

  return (
    <div className="perfil-panel">
      <h3>Mi wishlist ({items.length})</h3>
      <div className="wishlist-grid">
        {items.map((i) => (
          <Link key={i.id} to={`/carta/${i.cartas?.id}`} className="wishlist-item">
            <button
              type="button"
              className="wishlist-quitar"
              aria-label="Quitar de la wishlist"
              onClick={(e) => quitar(e, i.id)}
            >
              <HeartOff size={15} />
            </button>
            {i.cartas?.imagen ? (
              <img src={i.cartas.imagen} alt={i.cartas.nombre} />
            ) : (
              <div className="preview-placeholder">Sin imagen</div>
            )}
            <p>{i.cartas?.nombre}</p>
            {i.cartas?.precio != null && (
              <p className="carrusel-rel-precio">
                ${Number(i.cartas.precio).toLocaleString("es-CO")} COP
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

const ESTADOS = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  enviado: "Enviado",
  entregado: "Entregado",
};

function Pedidos({ user }) {
  const [pedidos, setPedidos] = useState(null);

  useEffect(() => {
    supabase
      .from("pedidos")
      .select("*")
      .eq("user_id", user.id)
      .order("creado_en", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("Error cargando pedidos:", error);
        setPedidos(data ?? []);
      });
  }, [user.id]);

  if (pedidos === null) return <Cargando texto="Cargando tus pedidos…" />;

  if (pedidos.length === 0) {
    return (
      <div className="perfil-panel perfil-vacio">
        <Package size={36} />
        <p>Todavía no tienes pedidos.</p>
        <p>Cuando compres, aquí podrás hacer seguimiento a tus compras.</p>
      </div>
    );
  }

  return (
    <div className="perfil-panel">
      <h3>Mis pedidos ({pedidos.length})</h3>
      {pedidos.map((p) => (
        <div key={p.id} className="pedido">
          <div className="pedido-head">
            <div>
              <p className="pedido-id">Pedido #{p.id}</p>
              <p className="pedido-fecha">
                {new Date(p.creado_en).toLocaleDateString("es-CO", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <span className={`pedido-estado ${p.estado}`}>
              {ESTADOS[p.estado] ?? p.estado}
            </span>
          </div>
          <ul className="pedido-items">
            {(p.items ?? []).map((it, idx) => (
              <li key={idx}>
                {it.cantidad ?? 1} × {it.nombre}
              </li>
            ))}
          </ul>
          <p className="pedido-total">
            Total: ${Number(p.total).toLocaleString("es-CO")} COP
          </p>
        </div>
      ))}
    </div>
  );
}

function MisTorneos({ user }) {
  const [torneos, setTorneos] = useState(null);

  useEffect(() => {
    obtenerTorneosUsuario(user).then((data) => {
      setTorneos(data || []);
    });
  }, [user]);

  if (torneos === null) return <Cargando texto="Cargando tu historial de torneos…" />;

  if (torneos.length === 0) {
    return (
      <div className="perfil-panel perfil-vacio">
        <Trophy size={44} style={{ color: "var(--dorado, #f59e0b)", marginBottom: 14 }} />
        <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>
          Aún no tienes torneos registrados
        </h3>
        <p style={{ maxWidth: "560px", margin: "0 auto 18px", lineHeight: "1.5", color: "var(--texto-suave)" }}>
          Cuando te inscribas en los torneos oficiales de Capsule Corp Gaming con tu correo (<strong>{user.email}</strong>), aquí verás automáticamente en qué puesto quedaste, si pagaste o debes la inscripción, y todos los premios que hayas ganado.
        </p>
        <Link to="/torneos" className="btn-ir-torneos-hero">
          <Trophy size={16} />
          <span>Explorar Próximos Torneos</span>
        </Link>
      </div>
    );
  }

  // Métricas del jugador
  const totalJugados = torneos.length;
  const campeonatos = torneos.filter((t) => {
    const p = String(t.puesto || "").toLowerCase();
    return p === "1" || p.includes("1°") || p.includes("campeon") || p.includes("campeón");
  }).length;
  const podios = torneos.filter((t) => {
    const p = String(t.puesto || "").toLowerCase();
    return p === "1" || p === "2" || p === "3" || p === "4" ||
      p.includes("1°") || p.includes("2°") || p.includes("3°") || p.includes("4°") ||
      p.includes("top 4");
  }).length;
  const deudaTotal = torneos.reduce((acc, t) => acc + (t.deuda || 0), 0);

  return (
    <div className="perfil-panel">
      <div className="perfil-torneos-header">
        <div>
          <h3 style={{ margin: "0 0 6px" }}>Mis Torneos y Eventos ({torneos.length})</h3>
          <p className="perfil-section-sub" style={{ margin: 0, color: "var(--texto-suave)", fontSize: "13.5px" }}>
            Historial de torneos enlazados a tu cuenta: tus puestos, qué ganaste y estado de pago de inscripción.
          </p>
        </div>
        <Link to="/torneos" className="btn-ir-torneos">
          <Trophy size={15} />
          <span>Ver Torneos Disponibles</span>
        </Link>
      </div>

      {/* KPI Cards del jugador */}
      <div className="perfil-torneos-kpi-row">
        <div className="perfil-kpi-item">
          <span className="p-kpi-label">Torneos Jugados</span>
          <strong className="p-kpi-val">{totalJugados}</strong>
        </div>
        <div className="perfil-kpi-item gold">
          <span className="p-kpi-label">Campeonatos (1° Lugar)</span>
          <strong className="p-kpi-val">🏆 {campeonatos}</strong>
        </div>
        <div className="perfil-kpi-item purple">
          <span className="p-kpi-label">Podios / Tops (Top 4)</span>
          <strong className="p-kpi-val">🎖️ {podios}</strong>
        </div>
        <div className={`perfil-kpi-item ${deudaTotal > 0 ? "danger" : "green"}`}>
          <span className="p-kpi-label">{deudaTotal > 0 ? "Saldo Pendiente" : "Estado de Cuenta"}</span>
          <strong className="p-kpi-val">
            {deudaTotal > 0 ? `$${deudaTotal.toLocaleString("es-CO")} COP` : "Al día (Sin deuda)"}
          </strong>
        </div>
      </div>

      {/* Listado de tarjetas de torneos del usuario */}
      <div className="perfil-torneos-list">
        {torneos.map((t) => {
          const numPuesto = String(t.puesto || "");
          const esPrimero = numPuesto === "1" || numPuesto.includes("1°") || numPuesto.toLowerCase().includes("campeón");
          const esSegundo = numPuesto === "2" || numPuesto.includes("2°");
          const esTercero = numPuesto === "3" || numPuesto.includes("3°");
          const esTop4 = numPuesto === "4" || numPuesto.toLowerCase().includes("top 4");

          let badgePuestoClass = "puesto-general";
          let iconoPuesto = "🎖️";
          let textoPuesto = `Puesto: ${numPuesto}`;

          if (esPrimero) {
            badgePuestoClass = "puesto-oro";
            iconoPuesto = "🏆";
            textoPuesto = "1° Lugar (Campeón)";
          } else if (esSegundo) {
            badgePuestoClass = "puesto-plata";
            iconoPuesto = "🥈";
            textoPuesto = "2° Lugar (Subcampeón)";
          } else if (esTercero) {
            badgePuestoClass = "puesto-bronce";
            iconoPuesto = "🥉";
            textoPuesto = "3° Lugar";
          } else if (esTop4) {
            badgePuestoClass = "puesto-top4";
            iconoPuesto = "⭐";
            textoPuesto = "Top 4";
          }

          const estaPagado = t.estadoPago === "pagado" || t.deuda === 0;
          const esAbono = t.estadoPago === "abono" && t.deuda > 0;
          const debeTotal = t.estadoPago === "debe" || (!estaPagado && !esAbono);

          return (
            <div key={`${t.torneoId}-${t.participanteId}`} className={`perfil-torneo-card ${esPrimero ? "first-place-glow" : ""}`}>
              <div className="perfil-tc-header">
                <div>
                  <div className="perfil-tc-meta-row">
                    <span className="perfil-tc-game-badge">{t.juego}</span>
                    <span className={`perfil-tc-puesto-badge ${badgePuestoClass}`}>
                      <span>{iconoPuesto}</span>
                      <strong>{textoPuesto}</strong>
                    </span>
                  </div>
                  <h4 className="perfil-tc-title">{t.nombreTorneo}</h4>
                  <div className="perfil-tc-info-row">
                    <span>
                      📅 {new Date(t.fecha).toLocaleDateString("es-CO", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>📍 {t.lugar}</span>
                  </div>
                </div>

                {/* Badge de Pago */}
                <div className="perfil-tc-pago-col">
                  {estaPagado && (
                    <div className="pago-status-pill pagado">
                      <CheckCircle2 size={14} />
                      <span>Pagado (${t.montoPagado.toLocaleString("es-CO")} COP)</span>
                    </div>
                  )}
                  {esAbono && (
                    <div className="pago-status-pill abono">
                      <AlertCircle size={14} />
                      <span>Abonó: ${t.montoPagado.toLocaleString("es-CO")} • Debe: ${t.deuda.toLocaleString("es-CO")} COP</span>
                    </div>
                  )}
                  {debeTotal && (
                    <div className="pago-status-pill debe">
                      <AlertCircle size={14} />
                      <span>Debe Inscripción: ${t.deuda.toLocaleString("es-CO")} COP</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mazo usado */}
              {t.deck && (
                <div className="perfil-tc-deck-row">
                  <span className="deck-label">Mazo jugado:</span>
                  <strong className="deck-val">{t.deck}</strong>
                </div>
              )}

              {/* QUÉ GANÓ (PREMIO OBTENIDO) */}
              {t.premioGanado ? (
                <div className="perfil-tc-premio-box">
                  <div className="premio-icon-badge">
                    <Sparkles size={18} />
                  </div>
                  <div className="premio-content">
                    <span className="premio-title">Premio Ganado en el Torneo:</span>
                    <strong className="premio-text">{t.premioGanado}</strong>
                  </div>
                </div>
              ) : (
                <div className="perfil-tc-premio-box neutral">
                  <div className="premio-icon-badge">
                    <Trophy size={16} />
                  </div>
                  <div className="premio-content">
                    <span className="premio-title">Premios del Evento:</span>
                    <span className="premio-text">{t.premiosTorneo || "Sobre de participación oficial del evento"}</span>
                  </div>
                </div>
              )}

              {t.notas && (
                <div className="perfil-tc-nota">
                  <small>Nota de la tienda: {t.notas}</small>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
