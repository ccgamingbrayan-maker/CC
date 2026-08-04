import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";

export default function Login() {
  const { login, esAdmin, cargando } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Si ya está logueado como admin, no tiene sentido mostrar el login.
  useEffect(() => {
    if (!cargando && esAdmin) navigate("/admin/agregar", { replace: true });
  }, [cargando, esAdmin, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    const { error } = await login(email.trim(), password);
    setEnviando(false);

    if (error) {
      setError("No se pudo iniciar sesión. Revisa tu correo y contraseña.");
    } else {
      navigate("/admin/agregar", { replace: true });
    }
  }

  return (
    <section className="juegos">
      <div className="contenedor agregar-carta" style={{ maxWidth: 420 }}>
        <h2>Iniciar sesión</h2>
        <p style={{ color: "var(--texto-suave)" }}>Acceso solo para administración.</p>

        <form onSubmit={onSubmit} className="agregar-form">
          <label>
            Correo
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              required
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        {error && <p className="agregar-mensaje">{error}</p>}
      </div>
    </section>
  );
}
