import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogIn, UserPlus, Mail, Lock, User, Phone, Gamepad2 } from "lucide-react";
import { useAuth } from "../lib/AuthContext.jsx";

export default function Login() {
  const {
    user,
    esAdmin,
    cargando,
    recuperacionPassword,
    login,
    registro,
    recuperarPassword,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [modo, setModo] = useState(
    location.state?.modo === "registro" ? "registro" : "login"
  );
  // A donde volver tras iniciar sesión (ej: "/checkout" si venía de pagar).
  const redirect = location.state?.redirect;
  const [nombre, setNombre] = useState("");
  const [nickname, setNickname] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Si ya hay sesión: el admin va al panel y el usuario normal al home.
  useEffect(() => {
    if (cargando || recuperacionPassword || !user) return;
    navigate(esAdmin ? "/admin/agregar" : redirect || "/", { replace: true });
  }, [cargando, recuperacionPassword, user, esAdmin, redirect, navigate]);

  function cambiarModo(nuevo) {
    setModo(nuevo);
    setError("");
    setMensaje("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (modo === "recuperar") {
      setEnviando(true);
      try {
        const { error } = await recuperarPassword(email.trim());
        if (error) {
          setError("No se pudo enviar el enlace. " + error.message);
        } else {
          setMensaje(
            "Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña."
          );
        }
      } catch (err) {
        setError("No se pudo enviar el enlace. " + err.message);
      } finally {
        setEnviando(false);
      }
      return;
    }

    if (modo === "registro") {
      if (nombre.trim().length < 3) {
        setError("Escribe tu nombre completo.");
        return;
      }
      if (!nickname.trim()) {
        setError("Ingresa tu Nickname de Bandai TCG+ (el mismo que usas en los torneos).");
        return;
      }
      if (password !== confirmar) {
        setError("Las contraseñas no coinciden.");
        return;
      }
      setEnviando(true);
      const { error } = await registro(email.trim(), password, {
        nombre: nombre.trim(),
        nickname: nickname.trim(),
        telefono: telefono.trim(),
      });
      setEnviando(false);
      if (error) {
        setError("No se pudo crear la cuenta. " + (error.message ?? ""));
      } else {
        setMensaje(
          "Cuenta creada con éxito. Si no entras automáticamente, revisa tu correo para confirmarla."
        );
      }
      return;
    }

    setEnviando(true);
    const { error } = await login(email.trim(), password);
    setEnviando(false);
    if (error) {
      setError("No se pudo iniciar sesión. Revisa tu correo y contraseña.");
    }
    // La redirección la hace el useEffect cuando se actualiza la sesión.
  }

  const esRegistro = modo === "registro";
  const esRecuperacion = modo === "recuperar";

  return (
    <section className="auth">
      <div className="auth-card">
        <div className="auth-icono">
          {esRegistro ? <UserPlus size={26} /> : <LogIn size={26} />}
        </div>
        <h2>
          {esRegistro
            ? "Crear cuenta"
            : esRecuperacion
              ? "Recuperar contraseña"
              : "Bienvenido de nuevo"}
        </h2>
        <p className="auth-subtitulo">
          {esRecuperacion
            ? "Te enviaremos un enlace para crear una contraseña nueva."
            : redirect
              ? "Ya casi. Crea tu cuenta o inicia sesión para completar tu compra."
              : esRegistro
                ? "Regístrate para comprar cartas, accesorios y participar en torneos oficiales."
                : "Ingresa con tu cuenta de CapsuleCorp Gaming."}
        </p>

        {!esRecuperacion && (
          <div className="auth-tabs">
            <button
              type="button"
              className={!esRegistro ? "active" : ""}
              onClick={() => cambiarModo("login")}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={esRegistro ? "active" : ""}
              onClick={() => cambiarModo("registro")}
            >
              Crear cuenta
            </button>
          </div>
        )}

        <form onSubmit={onSubmit} className="auth-form">
          {esRegistro && (
            <>
              <label>
                <User size={16} />
                Nombre completo
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </label>

              <label>
                <Gamepad2 size={16} />
                Nickname Bandai TCG+
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ej: Mugiwara_Luffy (el mismo de Bandai)"
                  required
                />
                <small className="auth-campo-ayuda">
                  * Debe ser el mismo Nickname que tienes en Bandai TCG+ para enlazar tus torneos automáticamente.
                </small>
              </label>

              <label>
                <Phone size={16} />
                Teléfono <span className="auth-opcional">(opcional)</span>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 300 123 4567"
                />
              </label>
            </>
          )}

          <label>
            <Mail size={16} />
            Correo
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              required
            />
          </label>

          {!esRecuperacion && (
            <label>
              <Lock size={16} />
              Contraseña
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </label>
          )}

          {esRegistro && (
            <label>
              <Lock size={16} />
              Confirmar contraseña
              <input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="Repite tu contraseña"
                minLength={6}
                required
              />
            </label>
          )}

          <button type="submit" className="auth-boton" disabled={enviando}>
            {enviando
              ? "Un momento…"
              : esRecuperacion
                ? "Enviar enlace"
                : esRegistro
                  ? "Registrarme"
                  : "Entrar"}
          </button>
        </form>

        {modo === "login" && (
          <button
            type="button"
            className="auth-enlace"
            onClick={() => cambiarModo("recuperar")}
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}
        {esRecuperacion && (
          <button
            type="button"
            className="auth-enlace"
            onClick={() => cambiarModo("login")}
          >
            Volver a iniciar sesión
          </button>
        )}
        {error && <p className="auth-mensaje auth-error">{error}</p>}
        {mensaje && <p className="auth-mensaje auth-exito">{mensaje}</p>}
      </div>
    </section>
  );
}
