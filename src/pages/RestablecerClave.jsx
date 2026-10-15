import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { useAuth } from "../lib/AuthContext.jsx";
import Cargando from "../components/Cargando.jsx";

export default function RestablecerClave() {
  const {
    cargando,
    recuperacionPassword,
    actualizarPassword,
    finalizarRecuperacionPassword,
  } = useAuth();
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [actualizada, setActualizada] = useState(false);
  const [error, setError] = useState("");

  async function cambiarPassword(e) {
    e.preventDefault();
    setError("");
    if (nueva !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setEnviando(true);
    try {
      const { error: updateError } = await actualizarPassword(nueva);
      if (updateError) {
        setError("No se pudo actualizar la contraseña. " + updateError.message);
      } else {
        finalizarRecuperacionPassword();
        setActualizada(true);
      }
    } catch (err) {
      setError("No se pudo actualizar la contraseña. " + err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return <Cargando texto="Verificando el enlace…" />;

  return (
    <section className="auth">
      <div className="auth-card">
        <div className="auth-icono">
          <KeyRound size={26} />
        </div>
        <h2>
          {actualizada
            ? "Contraseña actualizada"
            : recuperacionPassword
              ? "Crea una contraseña nueva"
              : "Enlace no válido"}
        </h2>
        <p className="auth-subtitulo">
          {actualizada
            ? "Ya puedes iniciar sesión con tu nueva contraseña."
            : recuperacionPassword
              ? "Elige una contraseña segura para tu cuenta."
              : "Este enlace expiró o ya fue utilizado. Solicita uno nuevo desde el inicio de sesión."}
        </p>

        {recuperacionPassword && !actualizada && (
          <form onSubmit={cambiarPassword} className="auth-form">
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
                placeholder="Repite tu contraseña"
                minLength={6}
                required
              />
            </label>
            <button type="submit" className="auth-boton" disabled={enviando}>
              {enviando ? "Guardando…" : "Cambiar contraseña"}
            </button>
          </form>
        )}

        {error && <p className="auth-mensaje auth-error">{error}</p>}
        {(actualizada || !recuperacionPassword) && (
          <Link className="auth-enlace" to={actualizada ? "/perfil" : "/login"}>
            {actualizada ? "Continuar" : "Volver al inicio de sesión"}
          </Link>
        )}
      </div>
    </section>
  );
}
