import { useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { useCart } from "../lib/CartContext.jsx";
import Cargando from "../components/Cargando.jsx";

export default function Carrito() {
  const { items, cargando, total, subtotal, cambiarCantidad, quitar, vaciar } = useCart();
  const [mensaje, setMensaje] = useState("");

  if (cargando) return <Cargando texto="Cargando tu carrito…" />;

  return (
    <section className="juegos">
      <div className="contenedor carrito-pagina">
        <h2>Tu carrito</h2>

        {items.length === 0 ? (
          <div className="carrito-vacio">
            <ShoppingCart size={40} />
            <p>Tu carrito está vacío.</p>
            <Link to="/">Explorar el catálogo</Link>
          </div>
        ) : (
          <div className="carrito-grid">
            <div className="carrito-lista">
              {items.map((i) => (
                <div className="carrito-item" key={`${i.tipo}-${i.item_id}`}>
                  <Link to={`/${i.tipo}/${i.item_id}`} className="carrito-item-img">
                    {i.imagen
                      ? <img src={i.imagen} alt={i.nombre} />
                      : <span className="carrito-sin-img" />}
                  </Link>

                  <div className="carrito-item-info">
                    <Link to={`/${i.tipo}/${i.item_id}`} className="carrito-item-nombre">
                      {i.nombre}
                    </Link>
                    <span className="carrito-item-tipo">
                      {i.tipo === "carta" ? "Carta" : "Accesorio"}
                    </span>
                    <span className="carrito-item-unit">
                      ${i.precio.toLocaleString("es-CO")} c/u
                    </span>
                  </div>

                  <div className="carrito-cantidad">
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(i.tipo, i.item_id, -1)}
                      aria-label="Quitar uno"
                    >
                      <Minus size={14} />
                    </button>
                    <span>{i.cantidad}</span>
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(i.tipo, i.item_id, 1)}
                      aria-label="Agregar uno"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <p className="carrito-linea">
                    ${(i.precio * i.cantidad).toLocaleString("es-CO")}
                  </p>

                  <button
                    type="button"
                    className="carrito-quitar"
                    onClick={() => quitar(i.tipo, i.item_id)}
                    aria-label={`Quitar ${i.nombre} del carrito`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <button type="button" className="carrito-vaciar" onClick={vaciar}>
                Vaciar carrito
              </button>
            </div>

            <aside className="carrito-resumen">
              <h3>Resumen</h3>
              <p className="carrito-resumen-fila">
                <span>Productos</span>
                <strong>{total}</strong>
              </p>
              <p className="carrito-resumen-fila carrito-total">
                <span>Total</span>
                <strong>${subtotal.toLocaleString("es-CO")} COP</strong>
              </p>
              <button
                type="button"
                className="carrito-pagar"
                onClick={() =>
                  setMensaje("La pasarela de pago estará disponible muy pronto.")
                }
              >
                Proceder al pago
              </button>
              {mensaje && <p className="carrito-mensaje">{mensaje}</p>}
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
