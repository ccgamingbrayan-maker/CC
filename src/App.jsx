import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import Catalogo from "./pages/Catalogo.jsx";
import { Routes, Route } from "react-router-dom";
import  AgregarCarta  from "./pages/AgregarCarta.jsx";
import Accesorios from "./pages/Accesorios.jsx";
import DetalleAccesorio from "./pages/DetalleAccesorio.jsx";
import DetalleCarta from "./pages/DetalleCarta.jsx";
import Carrito from "./pages/Carrito.jsx";
import Login from "./pages/Login.jsx";
import Perfil from "./pages/Perfil.jsx";
import RutaAdmin from "./components/RutaAdmin.jsx";
import { useCart } from "./lib/CartContext.jsx";


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
        <Route path="/login" element={<Login />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route
          path="/admin/agregar"
          element={
            <RutaAdmin>
              <AgregarCarta />
            </RutaAdmin>
          }
        />
      </Routes>
    </>
  );
}




