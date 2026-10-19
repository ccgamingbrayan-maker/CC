import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, AlertCircle, ArrowRight, ShoppingBag } from "lucide-react";
import { useAuth } from "../lib/AuthContext.jsx";
import Cargando from "../components/Cargando.jsx";

export default function ConfirmarCuenta() {
  const { user, cargando } = useAuth();
  const navigate = useNavigate();
  const [errorMensaje, setErrorMensaje] = useState("");
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    // 1. Revisar si Supabase envió algún error en el hash (#error=...&error_description=...) o en la query (?error=...)
    const hash = window.location.hash ? window.location.hash.substring(1) : "";
    const search = window.location.search ? window.location.search.substring(1) : "";
    const params = new URLSearchParams(hash || search);

    const error = params.get("error");
    const errorDescription = params.get("error_description");

    if (error || errorDescription) {
      setVerificando(false);
      setErrorMensaje(
        errorDescription
          ? decodeURIComponent(errorDescription.replace(/\+/g, " "))
          : "El enlace de verificación no es válido o ya ha expirado."
      );
      return;
    }

    // 2. Dar un momento a que Supabase auth procese la sesión si venía en el hash
    const timer = setTimeout(() => {
      setVerificando(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  if (cargando || verificando) {
    return <Cargando texto="Verificando tu cuenta..." />;
  }

  const nombreUsuario =
    user?.user_metadata?.nombre ||
    user?.email?.split("@")[0] ||
    "";

  return (
    <section className="auth">
      <div className="auth-card" style={{ textAlign: "center" }}>
        {errorMensaje ? (
          <>
            <div className="auth-icono" style={{ color: "#ef4444", background: "rgba(239, 68, 68, 0.1)" }}>
              <AlertCircle size={32} />
            </div>
            <h2>No pudimos verificar tu correo</h2>
            <p className="auth-subtitulo" style={{ marginBottom: "1.5rem" }}>
              {errorMensaje}
            </p>
            <p style={{ fontSize: "14px", color: "var(--texto-secundario, #888)", marginBottom: "1.5rem" }}>
              Si ya habías confirmado tu cuenta anteriormente, puedes ingresar directamente con tu correo y contraseña.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                className="auth-boton"
                onClick={() => navigate("/login")}
              >
                Ir a iniciar sesión
              </button>
              <Link className="auth-enlace" to="/">
                Volver a la tienda
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="auth-icono" style={{ color: "#10b981", background: "rgba(16, 185, 129, 0.1)" }}>
              <CheckCircle2 size={32} />
            </div>
            <h2>¡Correo verificado con éxito!</h2>
            <p className="auth-subtitulo" style={{ marginBottom: "1.2rem" }}>
              {nombreUsuario
                ? `¡Hola ${nombreUsuario}! Tu cuenta ha sido confirmada y activada.`
                : "Tu cuenta ha sido confirmada y activada correctamente."}
            </p>
            <p style={{ fontSize: "14px", color: "var(--texto-secundario, #888)", marginBottom: "2rem", lineHeight: "1.5" }}>
              Ya puedes explorar todas las cartas, accesorios y realizar compras en Capsule Corp.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                type="button"
                className="auth-boton"
                onClick={() => navigate("/")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                <ShoppingBag size={18} />
                Explorar la tienda
              </button>
              <Link className="auth-enlace" to="/perfil" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                Ver mi perfil <ArrowRight size={14} />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
