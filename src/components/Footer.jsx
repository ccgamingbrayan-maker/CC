import { Link } from "react-router-dom";
import { MapPin, Phone, MessageCircle, ShieldCheck } from "lucide-react";

export default function Footer() {
  const anio = new Date().getFullYear();

  return (
    <footer className="footer" id="nosotros">
      <div className="contenedor">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "32px", marginBottom: "32px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ fontSize: "18px", fontWeight: "900", letterSpacing: "-0.5px" }}>
                CapsuleCorp <span style={{ color: "var(--acento, #a855f7)", fontSize: "14px", textTransform: "uppercase", padding: "2px 6px", background: "rgba(168, 85, 247, 0.15)", borderRadius: "4px" }}>Gaming</span>
              </span>
            </div>
            <p style={{ color: "var(--texto-suave)", fontSize: "13.5px", lineHeight: "1.6", margin: "0 0 16px 0" }}>
              Tu tienda especializada en Trading Card Games (TCG) en Cali, Colombia.
              Singles oficiales de One Piece TCG, Pokémon, Magic: The Gathering, accesorios y torneos competitivos.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#4ade80", background: "rgba(34, 197, 94, 0.1)", padding: "4px 10px", borderRadius: "20px" }}>
              <ShieldCheck size={14} />
              <span>Tienda y Torneos Oficiales Bandai TCG+</span>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: "14px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 14px 0", color: "var(--texto)" }}>
              Enlaces Rápidos
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "13.5px" }}>
              <li>
                <Link to="/" style={{ color: "var(--texto-suave)", textDecoration: "none" }}>
                  Catálogo de Cartas
                </Link>
              </li>
              <li>
                <Link to="/accesorios" style={{ color: "var(--texto-suave)", textDecoration: "none" }}>
                  Accesorios (Fundas, Playmats, Cajas)
                </Link>
              </li>
              <li>
                <Link to="/catalogo/5" style={{ color: "var(--texto-suave)", textDecoration: "none" }}>
                  Preventas Oficiales
                </Link>
              </li>
              <li>
                <Link to="/perfil" style={{ color: "var(--texto-suave)", textDecoration: "none" }}>
                  Mi Cuenta & Decks
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: "14px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 14px 0", color: "var(--texto)" }}>
              Sede y Contacto
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13.5px", color: "var(--texto-suave)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <MapPin size={16} style={{ color: "var(--acento, #a855f7)", marginTop: "2px", flexShrink: 0 }} />
                <span>Cra 34 # 4-50, Cali, Valle del Cauca, Colombia</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Phone size={16} style={{ color: "var(--acento, #a855f7)", flexShrink: 0 }} />
                <span>+57 312 345 6789</span>
              </div>
              <a
                href="https://wa.me/573123456789?text=Hola%20Capsule%20Corp%20Gaming%2C%20tengo%20una%20consulta"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  color: "#25D366",
                  textDecoration: "none",
                  fontWeight: "700",
                  marginTop: "6px",
                  fontSize: "13px",
                }}
              >
                <MessageCircle size={15} />
                <span>Escríbenos a WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--borde, rgba(255, 255, 255, 0.08))", paddingTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", fontSize: "12.5px", color: "var(--texto-suave)" }}>
          <span>© {anio} CapsuleCorp Gaming. Todos los derechos reservados.</span>
          <span>Cali, Colombia · Envíos a todo el país</span>
        </div>
      </div>
    </footer>
  );
}
