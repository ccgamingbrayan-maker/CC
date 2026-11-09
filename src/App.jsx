import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import Catalogo from "./pages/Catalogo.jsx";
import { Routes, Route, Navigate } from "react-router-dom";
import  AgregarCarta  from "./pages/AgregarCarta.jsx";
import Accesorios from "./pages/Accesorios.jsx";
import DetalleAccesorio from "./pages/DetalleAccesorio.jsx";
import DetalleCarta from "./pages/DetalleCarta.jsx";
import Carrito from "./pages/Carrito.jsx";
import Login from "./pages/Login.jsx";
import RestablecerClave from "./pages/RestablecerClave.jsx";
import ConfirmarCuenta from "./pages/ConfirmarCuenta.jsx";
import Perfil from "./pages/Perfil.jsx";
import Torneos from "./pages/Torneos.jsx";
import Clientes from "./pages/Clientes.jsx";
import RutaAdmin from "./components/RutaAdmin.jsx";
import Cargando from "./components/Cargando.jsx";
import { useCart } from "./lib/CartContext.jsx";
import { useAuth } from "./lib/AuthContext.jsx";

// Guard para torneos: Admin accede al panel, Clientes van a su perfil de torneos jugados
function RutaTorneosGuard() {
  const { user, esAdmin, cargando } = useAuth();
  if (cargando) return <Cargando texto="Verificando acceso…" />;
  if (esAdmin) return <Torneos />;
  if (user) return <Navigate to="/perfil?tab=torneos" replace />;
  return <Navigate to="/login" replace />;
}


export default function App() {
  const { agregar } = useCart();

  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home onAgregar={agregar} />} />
        <Route path="/catalogo/:juegoId" element={<Catalogo onAgregar={agregar} />} />
        <Route path="/accesorios" element={<Accesorios onAgregar={agregar} />} />
        <Route path="/accesorio/:accesorioId" element={<DetalleAccesorio onAgregar={agregar} />} />
        <Route path="/carta/:cartaId" element={<DetalleCarta onAgregar={agregar} />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/torneos" element={<RutaTorneosGuard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/restablecer-clave" element={<RestablecerClave />} />
        <Route path="/confirmar-cuenta" element={<ConfirmarCuenta />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route
          path="/admin/agregar"
          element={
            <RutaAdmin>
              <AgregarCarta />
            </RutaAdmin>
          }
        />
        <Route
          path="/admin/torneos"
          element={
            <RutaAdmin>
              <Torneos />
            </RutaAdmin>
          }
        />
        <Route
          path="/admin/clientes"
          element={
            <RutaAdmin>
              <Clientes />
            </RutaAdmin>
          }
        />
        <Route
          path="/clientes"
          element={
            <RutaAdmin>
              <Clientes />
            </RutaAdmin>
          }
        />
      </Routes>
    </>
  );
}



