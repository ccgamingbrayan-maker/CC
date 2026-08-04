import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";

export default function Navbar({ total }) {
  const { esAdmin, logout } = useAuth();
  const navigate = useNavigate();

  async function salir() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <header className="navbar">
      <div className="contenedor">
        <Link to="/" className="logo">CapsuleCorp Gaming</Link>
        <nav>
          <Link to="/">Catálogo</Link>
          <Link to="/accesorios">Accesorios</Link>
          <Link to="/catalogo/5">Pre-Ventas</Link>
          {esAdmin ? (
            <>
              <Link to="/admin/agregar">Agregar</Link>
              <button type="button" className="link-salir" onClick={salir}>
                Salir
              </button>
            </>
          ) : (
            <Link to="/login">Ingresar</Link>
          )}
        </nav>
        <span className="carrito" aria-label="Carrito">🛒 {total}</span>
      </div>
    </header>
  );
}
