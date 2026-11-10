import { Link } from "react-router-dom";
import { Compass, LayoutGrid, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "75vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        textAlign: "center",
        color: "var(--texto, #f4f4f5)",
      }}
    >
      <div
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "50%",
          background: "rgba(168, 85, 247, 0.12)",
          border: "1px solid rgba(168, 85, 247, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
          color: "var(--acento, #a855f7)",
        }}
      >
        <Compass size={36} strokeWidth={1.8} />
      </div>

      <span
        style={{
          fontSize: "13px",
          fontWeight: "800",
          letterSpacing: "1px",
          color: "var(--acento, #a855f7)",
          textTransform: "uppercase",
          marginBottom: "8px",
        }}
      >
        Error 404
      </span>

      <h1
        style={{
          fontSize: "26px",
          fontWeight: "800",
          margin: "0 0 10px 0",
        }}
      >
        Página no encontrada
      </h1>

      <p
        style={{
          maxWidth: "480px",
          margin: "0 0 28px 0",
          color: "var(--texto-suave, #a1a1aa)",
          fontSize: "14.5px",
          lineHeight: "1.6",
        }}
      >
        La dirección que intentas abrir no existe o ha sido movida. Puedes volver al catálogo
        principal o explorar los productos disponibles.
      </p>

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Link
          to="/"
          className="auth-boton"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            textDecoration: "none",
            padding: "10px 20px",
          }}
        >
          <LayoutGrid size={16} />
          <span>Ver Catálogo</span>
        </Link>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="auth-boton"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "transparent",
            border: "1px solid var(--borde, rgba(255, 255, 255, 0.15))",
            padding: "10px 20px",
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={16} />
          <span>Regresar</span>
        </button>
      </div>
    </div>
  );
}
