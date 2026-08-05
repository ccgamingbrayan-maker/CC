import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Heart, Package, Save, HeartOff, KeyRound } from "lucide-react";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import Cargando from "../components/Cargando.jsx";

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
        <header className="perfil-cabecera">
          <div className="perfil-avatar">{inicial}</div>
          <div>
            <h2>{nombre}</h2>
            <p>{user.email}</p>
            <span className="perfil-desde">
              Miembro desde{" "}
              {new Date(user.created_at).toLocaleDateString("es-CO", {
                year: "numeric",
                month: "long",
              })}
            </span>
          </div>
        </header>

        <div className="auth-tabs perfil-tabs">
          <button
            type="button"
            className={tab === "datos" ? "active" : ""}
            onClick={() => setTab("datos")}
          >
            <User size={15} /> Mis datos
          </button>
          <button
            type="button"
            className={tab === "wishlist" ? "active" : ""}
            onClick={() => setTab("wishlist")}
          >
            <Heart size={15} /> Wishlist
          </button>
          <button
            type="button"
            className={tab === "pedidos" ? "active" : ""}
            onClick={() => setTab("pedidos")}
          >
            <Package size={15} /> Pedidos
          </button>
        </div>

        {tab === "datos" && (
          <>
            <DatosUsuario user={user} />
            <CambiarPassword />
          </>
        )}
        {tab === "wishlist" && <Wishlist user={user} />}
        {tab === "pedidos" && <Pedidos user={user} />}
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
