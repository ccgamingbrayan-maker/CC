import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Package,
  Minus,
  Moon,
  Plus,
  ShoppingCart,
  Sun,
  Trash2,
  User,
  LogOut,
  LogIn,
  UserPlus,
  ShieldCheck,
  ChevronDown,
  Trophy
} from "lucide-react";
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
        {/* Logo de marca */}
        <Link to="/" className="logo">
          <span className="logo-brand">CapsuleCorp</span>
          <span className="logo-tag">Gaming</span>
        </Link>

        {/* Botones de navegación principal (Catálogo, Accesorios, Pre-Ventas) */}
        <div className="navbar-nav-group">
          <Link
            to="/"
            className={`nav-pill ${location.pathname === "/" || location.pathname.startsWith("/carta") ? "active" : ""}`}
            title="Ver catálogo completo de cartas"
          >
            <LayoutGrid size={15} />
            <span>Catálogo</span>
          </Link>
          <Link
            to="/accesorios"
            className={`nav-pill ${location.pathname.startsWith("/accesorios") ? "active" : ""}`}
            title="Ver fundas, playmats, cajas y dados"
          >
            <Package size={15} />
            <span>Accesorios</span>
          </Link>
          <Link
            to="/catalogo/5"
            className={`nav-pill nav-pill-preventa ${location.pathname === "/catalogo/5" ? "active" : ""}`}
            title="Productos en preventa oficial"
          >
            <span className="dot-preventa-pulse" />
            <span>Pre-Ventas</span>
          </Link>
          <Link
            to="/torneos"
            className={`nav-pill nav-pill-torneos ${location.pathname.startsWith("/torneos") ? "active" : ""}`}
            title="Torneos y eventos presenciales TCG"
          >
            <Trophy size={15} />
            <span>Torneos</span>
          </Link>
          {esAdmin && (
            <Link
              to="/admin/agregar"
              className={`nav-pill nav-pill-admin ${location.pathname.startsWith("/admin") ? "active" : ""}`}
              title="Panel de administración de tienda"
            >
              <ShieldCheck size={15} />
              <span>Admin</span>
            </Link>
          )}
        </div>

        {/* Barra de búsqueda global proporcional */}
        <div className="navbar-busqueda">
          <BuscadorNav />
        </div>

        {/* Sección de herramientas: Tema, Cuenta de Usuario, Carrito */}
        <div className="navbar-iconos">
          <button
            type="button"
            className="icono-btn tema-btn"
            onClick={alternarTema}
            aria-label={tema === "claro" ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
            title={tema === "claro" ? "Tema oscuro" : "Tema claro"}
          >
            {tema === "claro" ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <div className="usuario" ref={menuRef}>
            <button
              type="button"
              className={`usuario-pill-btn ${menuAbierto ? "active" : ""}`}
              aria-label="Cuenta de usuario"
              onClick={() => setMenuAbierto((v) => !v)}
            >
              <div className="usuario-avatar-circulo">
                <User size={15} />
              </div>
              <span className="usuario-pill-nombre">
                {user ? (user.user_metadata?.nombre || user.email?.split("@")[0]) : "Mi Cuenta"}
              </span>
              <ChevronDown size={14} className={`usuario-chevron ${menuAbierto ? "rotate" : ""}`} />
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
              aria-label="Carrito de compras"
              onClick={() => setCarritoAbierto((v) => !v)}
            >
              <ShoppingCart size={20} />
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
                            {i.imagen ? (
                              <img src={i.imagen} alt={i.nombre} />
                            ) : (
                              <span className="mini-sin-img" />
                            )}
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
    </nav>
  );
}
