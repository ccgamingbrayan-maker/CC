import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import Cargando from "./Cargando.jsx";

// Envuelve rutas que solo el admin puede ver.
export default function RutaAdmin({ children }) {
  const { esAdmin, cargando } = useAuth();

  if (cargando) return <Cargando />;
  if (!esAdmin) return <Navigate to="/login" replace />;

  return children;
}
