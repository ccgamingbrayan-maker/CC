import React from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary detectó un error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "70vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 20px",
            textAlign: "center",
            color: "var(--texto, #f4f4f5)",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
              color: "#ef4444",
            }}
          >
            <AlertTriangle size={32} />
          </div>

          <h2 style={{ fontSize: "22px", fontWeight: "700", margin: "0 0 10px 0" }}>
            Ha ocurrido un problema al cargar esta sección
          </h2>
          <p
            style={{
              maxWidth: "520px",
              margin: "0 0 16px 0",
              color: "var(--texto-suave, #a1a1aa)",
              fontSize: "14px",
              lineHeight: "1.6",
            }}
          >
            Detectamos un error inesperado al renderizar el contenido. Puedes recargar la
            página o volver al catálogo principal.
          </p>

          {this.state.error?.message && (
            <div
              style={{
                maxWidth: "600px",
                margin: "0 0 20px 0",
                padding: "8px 14px",
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#fca5a5",
                fontFamily: "monospace",
                wordBreak: "break-word",
              }}
            >
              {this.state.error.message}
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              onClick={this.handleReload}
              className="auth-boton"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                cursor: "pointer",
              }}
            >
              <RotateCcw size={16} />
              <span>Recargar página</span>
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="auth-boton"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: "transparent",
                border: "1px solid var(--borde, rgba(255, 255, 255, 0.15))",
                cursor: "pointer",
              }}
            >
              <Home size={16} />
              <span>Ir al inicio</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

