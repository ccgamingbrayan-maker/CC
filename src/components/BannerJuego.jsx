import { Link } from "react-router-dom";

export default function BannerJuego({ titulo, etiqueta, imagen, lado = "izquierda", ctaTexto, ctaLink, completo = false }) {
  return (
    <section
      className={`banner ${lado === "derecha" ? "derecha" : ""} ${completo ? "completo" : ""}`}
      style={{ backgroundImage: `url(${imagen})` }}
    >
      <div className="banner-contenido">
        {etiqueta && <span className="banner-etiqueta">{etiqueta}</span>}
        <h2>{titulo}</h2>
        {ctaTexto && ctaLink && (
          <Link to={ctaLink} className="banner-cta">
            {ctaTexto}
          </Link>
        )}
      </div>
    </section>
  );
}


