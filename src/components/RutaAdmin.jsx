import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";

// Envuelve rutas que solo el admin puede ver.
export default function RutaAdmin({ children }) {
  const { esAdmin, cargando } = useAuth();

  if (cargando) return <p style={{ padding: 24 }}>Cargando…</p>;
  if (!esAdmin) return <Navigate to="/login" replace />;

  return children;
}
