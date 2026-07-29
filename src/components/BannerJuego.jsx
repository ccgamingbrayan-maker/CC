
export default function BannerJuego({ titulo, etiqueta, imagen, lado = "izquierda" }) {
  return (
    <section
      className={`banner ${lado === "derecha" ? "derecha" : ""}`}
      style={{ backgroundImage: `url(${imagen})` }}
    >
      <div className="banner-contenido">
        {etiqueta && <span className="banner-etiqueta">{etiqueta}</span>}
        <h2>{titulo}</h2>
      </div>
    </section>
  );
}


