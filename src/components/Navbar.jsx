import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Minus, Moon, Plus, ShoppingCart, Sun, Trash2, User, LogOut, LogIn, UserPlus, ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/AuthContext.jsx";
import { useCart } from "../lib/CartContext.jsx";
import BuscadorNav from "./BuscadorNav.jsx";

export default function Navbar() {
  const { user, esAdmin, logout } = useAuth();
  const { items, total, subtotal, cambiarCantidad, quitar } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const carritoRef = useRef(null);
  const [tema, setTema] = useState(() =>
    document.documentElement.getAttribute("data-tema") === "claro" ? "claro" : "oscuro"
  );

  useEffect(() => {
    function cerrarAlClickFuera(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false);
      }
      if (carritoRef.current && !carritoRef.current.contains(e.target)) {
        setCarritoAbierto(false);
      }
    }
    document.addEventListener("mousedown", cerrarAlClickFuera);
    return () => document.removeEventListener("mousedown", cerrarAlClickFuera);
  }, []);

  function alternarTema() {
    const nuevo = tema === "claro" ? "oscuro" : "claro";
    setTema(nuevo);
    document.documentElement.setAttribute("data-tema", nuevo);
    try { localStorage.setItem("ccg_tema", nuevo); } catch {}
  }

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
          <button
            type="button"
            className="icono-btn tema-btn"
            onClick={alternarTema}
            aria-label={tema === "claro" ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
            title={tema === "claro" ? "Tema oscuro" : "Tema claro"}
          >
            {tema === "claro" ? <Moon size={20} /> : <Sun size={20} />}
          </button>

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
                    <div className="usuario-menu-header">
                      {user.user_metadata?.nombre && (
                        <p className="usuario-nombre">{user.user_metadata.nombre}</p>
                      )}
                      <p className="usuario-email">{user.email}</p>
                    </div>
                    <div className="usuario-menu-links">
                      <Link to="/perfil" onClick={() => setMenuAbierto(false)}>
                        <User size={15} />
                        <span>Mi perfil</span>
                      </Link>
                      {esAdmin && (
                        <Link to="/admin/agregar" onClick={() => setMenuAbierto(false)}>
                          <ShieldCheck size={15} />
                          <span>Panel Admin</span>
                        </Link>
                      )}
                    </div>
                    <div className="usuario-menu-footer">
                      <button type="button" className="usuario-btn-logout" onClick={salir}>
                        <LogOut size={15} />
                        <span>Cerrar sesión</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="usuario-menu-links">
                    <Link to="/login" onClick={() => setMenuAbierto(false)}>
                      <LogIn size={15} />
                      <span>Iniciar sesión</span>
                    </Link>
                    <Link to="/login" state={{ modo: "registro" }} onClick={() => setMenuAbierto(false)}>
                      <UserPlus size={15} />
                      <span>Crear cuenta</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="carrito-nav" ref={carritoRef}>
            <button
              type="button"
              className="icono-btn carrito"
              aria-label="Carrito"
              onClick={() => setCarritoAbierto((v) => !v)}
            >
              <ShoppingCart size={22} />
              {total > 0 && <span className="carrito-badge">{total}</span>}
            </button>

            {carritoAbierto && (
              <div className="mini-carrito">
                {items.length === 0 ? (
                  <p className="mini-vacio">Tu carrito está vacío.</p>
                ) : (
                  <>
                    <div className="mini-lista">
                      {items.slice(0, 5).map((i) => (
                        <div className="mini-item" key={`${i.tipo}-${i.item_id}`}>
                          <Link
                            to={`/${i.tipo}/${i.item_id}`}
                            className="mini-item-img"
                            onClick={() => setCarritoAbierto(false)}
                          >
                            {i.imagen
                              ? <img src={i.imagen} alt="" />
                              : <span className="mini-sin-img" />}
                          </Link>
                          <div className="mini-detalle">
                            <Link
                              to={`/${i.tipo}/${i.item_id}`}
                              className="mini-nombre"
                              onClick={() => setCarritoAbierto(false)}
                            >
                              {i.nombre}
                            </Link>
                            <div className="mini-controles">
                              <button
                                type="button"
                                onClick={() => cambiarCantidad(i.tipo, i.item_id, -1)}
                                aria-label="Quitar uno"
                              >
                                <Minus size={12} />
                              </button>
                              <span>{i.cantidad}</span>
                              <button
                                type="button"
                                onClick={() => cambiarCantidad(i.tipo, i.item_id, 1)}
                                disabled={i.stock != null && i.cantidad >= i.stock}
                                aria-label="Agregar uno"
                              >
                                <Plus size={12} />
                              </button>
                              <button
                                type="button"
                                className="mini-quitar"
                                onClick={() => quitar(i.tipo, i.item_id)}
                                aria-label={`Quitar ${i.nombre}`}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <span className="mini-precio">
                            ${(i.precio * i.cantidad).toLocaleString("es-CO")}
                          </span>
                        </div>
                      ))}
                    </div>
                    {items.length > 5 && (
                      <p className="mini-mas">y {items.length - 5} producto(s) más…</p>
                    )}
                    <p className="mini-subtotal">
                      Subtotal <strong>${subtotal.toLocaleString("es-CO")} COP</strong>
                    </p>
                    <Link
                      to="/carrito"
                      className="mini-ver"
                      onClick={() => setCarritoAbierto(false)}
                    >
                      Ver carrito completo
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fila de navegación principal */}
      <div className="navbar-subfila">
        <div className="navbar-subfila-inner">
          <ul className="nav-links">
            <li>
              <Link
                to="/"
                className={`nav-link-btn ${location.pathname === "/" || location.pathname.startsWith("/carta") ? "active" : ""}`}
              >
                Catálogo
              </Link>
            </li>
            <li>
              <Link
                to="/accesorios"
                className={`nav-link-btn ${location.pathname.startsWith("/accesorios") ? "active" : ""}`}
              >
                Accesorios
              </Link>
            </li>
            <li>
              <Link
                to="/catalogo/5"
                className={`nav-link-btn ${location.pathname === "/catalogo/5" ? "active" : ""}`}
              >
                <span className="dot-preventa" /> Pre-Ventas
              </Link>
            </li>
            {esAdmin && (
              <li>
                <Link
                  to="/admin/agregar"
                  className={`nav-link-btn nav-link-admin ${location.pathname.startsWith("/admin") ? "active" : ""}`}
                >
                  Panel Admin
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
