// Se repite en TODAS las pantallas -> por eso es un componente.
import { Link } from "react-router-dom";

export default function Navbar({total}) {
  return (
    <header className="navbar">
      <div className="contenedor">
        <Link to="/" className="logo">CapsuleCorp Gaming</Link>
        <nav>
          <Link to="/">Catálogo</Link>
          <Link to="/catalogo/5">Pre-Ventas</Link>
          <Link to="/admin/agregar">Agregar carta</Link>
          <Link to="/accesorios">Accesorios</Link>
        </nav>
        <span className="carrito" aria-label="Carrito">🛒 {total}</span>
      </div>
    </header>
  );
}


