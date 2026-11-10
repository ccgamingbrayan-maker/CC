import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  CheckCircle2,
  ArrowLeft,
  Truck,
  Store,
  MessageCircle,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useCart } from "../lib/CartContext.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import Cargando from "../components/Cargando.jsx";

export default function Checkout() {
  const { items, total, subtotal, vaciar, cargando: cargandoCarrito } = useCart();
  const { user, cargando: cargandoAuth } = useAuth();
  const navigate = useNavigate();

  const [metodoEntrega, setMetodoEntrega] = useState("tienda"); // "tienda" | "envio"
  const [nombre, setNombre] = useState(() => user?.user_metadata?.nombre || "");
  const [telefono, setTelefono] = useState(() => user?.user_metadata?.telefono || "");
  const [ciudad, setCiudad] = useState("Cali");
  const [direccion, setDireccion] = useState("");
  const [notas, setNotas] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [pedidoExitoso, setPedidoExitoso] = useState(null);
  const [error, setError] = useState("");

  // Si no está autenticado, redirigir a login
  useEffect(() => {
    if (!cargandoAuth && !user) {
      navigate("/login", { state: { modo: "login", redirect: "/checkout" }, replace: true });
    }
  }, [cargandoAuth, user, navigate]);

  if (cargandoAuth || cargandoCarrito) {
    return <Cargando texto="Preparando tu orden…" />;
  }

  if (pedidoExitoso) {
    const mensajeWa = `¡Hola Capsule Corp Gaming! Acabo de crear el pedido #${pedidoExitoso.id} en la web por un total de $${Number(pedidoExitoso.total).toLocaleString("es-CO")} COP.
Nombre: ${nombre}
Entrega: ${metodoEntrega === "tienda" ? "Recoger en tienda (Cra 34 # 4-50, Cali)" : `Envío a ${ciudad} (${direccion})`}
Items:
${items.map((i) => `• ${i.cantidad}x ${i.nombre} ($${(i.precio * i.cantidad).toLocaleString("es-CO")})`).join("\n")}
¿Podrían confirmarme los datos para concretar el pago y entrega? ¡Gracias!`;

    return (
      <section className="juegos">
        <div className="contenedor checkout-exito-wrap" style={{ maxWidth: "680px", margin: "40px auto", textAlign: "center", padding: "30px 20px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "rgba(34, 197, 94, 0.15)",
              color: "#22c55e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px auto",
              border: "1px solid rgba(34, 197, 94, 0.3)",
            }}
          >
            <CheckCircle2 size={40} />
          </div>

          <h1 style={{ fontSize: "26px", fontWeight: "800", margin: "0 0 10px 0" }}>
            ¡Pedido #{pedidoExitoso.id} Creado con Éxito!
          </h1>
          <p style={{ color: "var(--texto-suave, #a1a1aa)", fontSize: "15px", lineHeight: "1.6", margin: "0 0 24px 0" }}>
            Hemos registrado tu pedido en el sistema. Para agilizar el alistamiento de tus cartas y acordar la entrega o despacho, contáctanos directamente por WhatsApp.
          </p>

          <div
            style={{
              background: "var(--fondo-tarjeta, rgba(255, 255, 255, 0.04))",
              border: "1px solid var(--borde, rgba(255, 255, 255, 0.08))",
              borderRadius: "14px",
              padding: "20px",
              textAlign: "left",
              marginBottom: "28px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "var(--texto-suave, #a1a1aa)" }}>Total a pagar:</span>
              <strong style={{ fontSize: "17px", color: "var(--acento, #a855f7)" }}>
                ${Number(pedidoExitoso.total).toLocaleString("es-CO")} COP
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "var(--texto-suave, #a1a1aa)" }}>Modalidad:</span>
              <span>{metodoEntrega === "tienda" ? "Recoger en tienda (Cali)" : `Envío a domicilio (${ciudad})`}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--texto-suave, #a1a1aa)" }}>Estado actual:</span>
              <span style={{ color: "#fbbf24", fontWeight: 700 }}>Pendiente de confirmación</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <a
              href={`https://wa.me/573123456789?text=${encodeURIComponent(mensajeWa)}`}
              target="_blank"
              rel="noreferrer"
              className="auth-boton"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                background: "#25D366",
                color: "#000",
                fontWeight: "800",
                fontSize: "15px",
                padding: "14px 24px",
                textDecoration: "none",
                borderRadius: "10px",
              }}
            >
              <MessageCircle size={20} />
              <span>Confirmar Pedido por WhatsApp</span>
            </a>

            <Link
              to="/perfil?tab=pedidos"
              className="auth-boton"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "transparent",
                border: "1px solid var(--borde, rgba(255, 255, 255, 0.2))",
                padding: "12px 20px",
                textDecoration: "none",
                borderRadius: "10px",
                color: "var(--texto, #fff)",
              }}
            >
              <ShoppingBag size={18} />
              <span>Ver en Mis Pedidos</span>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="juegos">
        <div className="contenedor" style={{ maxWidth: "560px", margin: "60px auto", textAlign: "center" }}>
          <ShoppingBag size={48} style={{ opacity: 0.4, marginBottom: "16px" }} />
          <h2>Tu carrito está vacío</h2>
          <p style={{ color: "var(--texto-suave, #a1a1aa)", marginBottom: "24px" }}>
            No tienes productos seleccionados para finalizar la compra.
          </p>
          <Link to="/" className="auth-boton" style={{ textDecoration: "none", display: "inline-block", padding: "10px 20px" }}>
            Explorar catálogo
          </Link>
        </div>
      </section>
    );
  }

  async function handleCrearPedido(e) {
    e.preventDefault();
    setError("");

    if (!nombre.trim()) {
      setError("Por favor ingresa tu nombre completo.");
      return;
    }

    if (!telefono.trim()) {
      setError("Por favor ingresa un número de teléfono o WhatsApp para contactarte.");
      return;
    }

    if (metodoEntrega === "envio" && (!ciudad.trim() || !direccion.trim())) {
      setError("Por favor completa la ciudad y dirección de envío.");
      return;
    }

    setProcesando(true);
    try {
      const itemsPayload = items.map((i) => ({
        tipo: i.tipo,
        item_id: i.item_id,
        nombre: i.nombre,
        precio: Number(i.precio),
        cantidad: Number(i.cantidad),
        imagen: i.imagen || "",
      }));

      const { data, error: errorInsert } = await supabase
        .from("pedidos")
        .insert({
          user_id: user.id,
          estado: "pendiente",
          items: itemsPayload,
          total: subtotal,
        })
        .select()
        .single();

      if (errorInsert) throw errorInsert;

      // Limpiar carrito tras pedido exitoso
      await vaciar();
      setPedidoExitoso(data);
    } catch (err) {
      console.error("Error al crear el pedido:", err);
      setError("Ocurrió un error al procesar tu pedido. Intenta nuevamente o contáctanos por soporte.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <section className="juegos">
      <div className="contenedor" style={{ maxWidth: "1000px", margin: "24px auto", padding: "0 16px" }}>
        <div style={{ marginBottom: "20px" }}>
          <Link to="/carrito" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--texto-suave, #a1a1aa)", textDecoration: "none", fontSize: "14px", fontWeight: 600 }}>
            <ArrowLeft size={16} /> Volver al Carrito
          </Link>
          <h1 style={{ fontSize: "26px", fontWeight: "800", marginTop: "10px" }}>Finalizar Compra</h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", alignItems: "start" }}>
          {/* FORMULARIO DE DETALLES */}
          <form onSubmit={handleCrearPedido} style={{ background: "var(--fondo-tarjeta, rgba(255, 255, 255, 0.03))", border: "1px solid var(--borde, rgba(255, 255, 255, 0.08))", borderRadius: "16px", padding: "24px" }}>
            <h3 style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <Truck size={18} /> Método de Entrega
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              <button
                type="button"
                onClick={() => setMetodoEntrega("tienda")}
                style={{
                  padding: "14px 10px",
                  borderRadius: "10px",
                  border: metodoEntrega === "tienda" ? "2px solid var(--acento, #a855f7)" : "1px solid var(--borde, rgba(255, 255, 255, 0.1))",
                  background: metodoEntrega === "tienda" ? "rgba(168, 85, 247, 0.12)" : "transparent",
                  color: "var(--texto, #fff)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                <Store size={20} />
                <span>Recoger en Tienda</span>
                <small style={{ color: "#4ade80", fontSize: "11px" }}>Gratis (Cali)</small>
              </button>

              <button
                type="button"
                onClick={() => setMetodoEntrega("envio")}
                style={{
                  padding: "14px 10px",
                  borderRadius: "10px",
                  border: metodoEntrega === "envio" ? "2px solid var(--acento, #a855f7)" : "1px solid var(--borde, rgba(255, 255, 255, 0.1))",
                  background: metodoEntrega === "envio" ? "rgba(168, 85, 247, 0.12)" : "transparent",
                  color: "var(--texto, #fff)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                <Truck size={20} />
                <span>Envío Nacional</span>
                <small style={{ color: "var(--texto-suave, #a1a1aa)", fontSize: "11px" }}>Por coordinar</small>
              </button>
            </div>

            {metodoEntrega === "tienda" ? (
              <div style={{ background: "rgba(168, 85, 247, 0.08)", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", fontSize: "13px", lineHeight: "1.5" }}>
                📍 <strong>Sede Capsule Corp Gaming:</strong> Cra 34 # 4-50, Cali, Colombia. Puedes recoger tus cartas en el horario del local o durante los torneos semanales.
              </div>
            ) : null}

            <h3 style={{ fontSize: "17px", fontWeight: 700, margin: "20px 0 16px 0" }}>Datos del Destinatario</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13.5px", fontWeight: 600 }}>
                Nombre Completo *
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Brayan Pérez"
                  style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--borde, rgba(255, 255, 255, 0.15))", background: "var(--fondo, #18181b)", color: "var(--texto, #fff)" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13.5px", fontWeight: 600 }}>
                Teléfono / WhatsApp *
                <input
                  type="tel"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 312 345 6789"
                  style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--borde, rgba(255, 255, 255, 0.15))", background: "var(--fondo, #18181b)", color: "var(--texto, #fff)" }}
                />
              </label>

              {metodoEntrega === "envio" && (
                <>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13.5px", fontWeight: 600 }}>
                    Ciudad de Destino *
                    <input
                      type="text"
                      required
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                      placeholder="Ej: Bogotá, Medellín, Barranquilla..."
                      style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--borde, rgba(255, 255, 255, 0.15))", background: "var(--fondo, #18181b)", color: "var(--texto, #fff)" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13.5px", fontWeight: 600 }}>
                    Dirección de Entrega *
                    <input
                      type="text"
                      required
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Calle, Carrera, Barrio o Apartamento"
                      style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--borde, rgba(255, 255, 255, 0.15))", background: "var(--fondo, #18181b)", color: "var(--texto, #fff)" }}
                    />
                  </label>
                </>
              )}

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13.5px", fontWeight: 600 }}>
                Instrucciones o Notas Especiales
                <textarea
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Detalles sobre empaque, hora de recogida o cualquier comentario..."
                  style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--borde, rgba(255, 255, 255, 0.15))", background: "var(--fondo, #18181b)", color: "var(--texto, #fff)", resize: "vertical" }}
                />
              </label>
            </div>

            <h3 style={{ fontSize: "17px", fontWeight: 700, margin: "24px 0 14px 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <CreditCard size={18} /> Modalidad de Pago
            </h3>

            <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--borde, rgba(255, 255, 255, 0.08))", borderRadius: "10px", padding: "14px", fontSize: "13px", lineHeight: "1.5" }}>
              💳 <strong>Transferencia Directa (Nequi, Bancolombia o Daviplata)</strong> o <strong>Efectivo al recoger</strong>. El asesor coordinará el comprobante directamente contigo para garantizar la reserva inmediata de tus cartas.
            </div>

            {error && (
              <div style={{ marginTop: "16px", padding: "10px 14px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={procesando}
              className="auth-boton"
              style={{
                width: "100%",
                marginTop: "24px",
                padding: "14px",
                fontSize: "15.5px",
                fontWeight: "800",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: procesando ? "not-allowed" : "pointer",
                opacity: procesando ? 0.7 : 1,
              }}
            >
              {procesando ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Procesando Pedido…</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Confirmar y Realizar Pedido (${subtotal.toLocaleString("es-CO")} COP)</span>
                </>
              )}
            </button>
          </form>

          {/* RESUMEN DEL PEDIDO */}
          <aside style={{ background: "var(--fondo-tarjeta, rgba(255, 255, 255, 0.03))", border: "1px solid var(--borde, rgba(255, 255, 255, 0.08))", borderRadius: "16px", padding: "20px" }}>
            <h3 style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 16px 0" }}>Resumen ({total} productos)</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "360px", overflowY: "auto", paddingRight: "4px", marginBottom: "16px" }}>
              {items.map((i) => (
                <div key={`${i.tipo}-${i.item_id}`} style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "10px" }}>
                  {i.imagen ? (
                    <img src={i.imagen} alt={i.nombre} style={{ width: "42px", height: "58px", objectFit: "cover", borderRadius: "6px" }} />
                  ) : (
                    <div style={{ width: "42px", height: "58px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "6px" }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 4px 0", fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={i.nombre}>
                      {i.nombre}
                    </p>
                    <span style={{ fontSize: "12px", color: "var(--texto-suave, #a1a1aa)" }}>
                      {i.cantidad} × ${Number(i.precio).toLocaleString("es-CO")}
                    </span>
                  </div>
                  <strong style={{ fontSize: "13px" }}>
                    ${(Number(i.precio) * i.cantidad).toLocaleString("es-CO")}
                  </strong>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "1px solid var(--borde, rgba(255, 255, 255, 0.1))", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", color: "var(--texto-suave, #a1a1aa)" }}>
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString("es-CO")} COP</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", color: "var(--texto-suave, #a1a1aa)" }}>
                <span>Entrega</span>
                <span style={{ color: metodoEntrega === "tienda" ? "#4ade80" : "inherit" }}>
                  {metodoEntrega === "tienda" ? "Gratis en Tienda" : "Por coordinar"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 800, color: "var(--texto, #fff)", marginTop: "6px", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <span>Total Estimado</span>
                <span style={{ color: "var(--acento, #a855f7)" }}>${subtotal.toLocaleString("es-CO")} COP</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
