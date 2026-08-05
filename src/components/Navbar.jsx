import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User } from "lucide-react";
import { useAuth } from "../lib/AuthContext.jsx";
import BuscadorNav from "./BuscadorNav.jsx";

export default function Navbar({ total }) {
  const { user, esAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function cerrarAlClickFuera(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false);
      }
    }
    document.addEventListener("mousedown", cerrarAlClickFuera);
    return () => document.removeEventListener("mousedown", cerrarAlClickFuera);
  }, []);

  async function salir() {
    await logout();
    setMenuAbierto(false);
    navigate("/", { replace: true });
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="logo">CapsuleCorp Gaming</Link>

        {/* Barra de búsqueda global */}
        <div className="navbar-busqueda">
          <BuscadorNav />
        </div>

        {/* Sección usuario/carrito */}
        <div className="navbar-iconos">
          {user && (
            <span className="bienvenida">
              Bienvenido de nuevo,{" "}
              <strong>{user.user_metadata?.nombre || user.email}</strong>
            </span>
          )}

          <div className="usuario" ref={menuRef}>
            <button
              type="button"
              className="icono-btn"
              aria-label="Cuenta de usuario"
              onClick={() => setMenuAbierto((v) => !v)}
            >
              <User size={22} />
            </button>
            {menuAbierto && (
              <div className="usuario-menu">
                {user ? (
                  <>
                    {user.user_metadata?.nombre && (
                      <p className="usuario-nombre">{user.user_metadata.nombre}</p>
                    )}
                    <p className="usuario-email">{user.email}</p>
                    <Link to="/perfil" onClick={() => setMenuAbierto(false)}>
                      Mi perfil
                    </Link>
                    {esAdmin && (
                      <Link to="/admin/agregar" onClick={() => setMenuAbierto(false)}>
                        Panel de administración
                      </Link>
                    )}
                    <button type="button" onClick={salir}>Cerrar sesión</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMenuAbierto(false)}>
                      Iniciar sesión
                    </Link>
                    <Link to="/login" state={{ modo: "registro" }} onClick={() => setMenuAbierto(false)}>
                      Crear cuenta
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <span className="icono-btn carrito" aria-label="Carrito">
            <ShoppingCart size={22} />
            {total > 0 && <span className="carrito-badge">{total}</span>}
          </span>
        </div>
      </div>

      {/* Fila de navegación (estilo TCGplayer) */}
      <div className="navbar-subfila">
        <ul className="nav-links">
          <li><Link to="/">Catálogo</Link></li>
          <li><Link to="/accesorios">Accesorios</Link></li>
          <li><Link to="/catalogo/5">Pre-Ventas</Link></li>
          {esAdmin && <li><Link to="/admin/agregar">Agregar</Link></li>}
        </ul>
      </div>
    </nav>
  );
}
