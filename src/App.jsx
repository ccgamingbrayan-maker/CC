import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import Catalogo from "./pages/Catalogo.jsx";
import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import AgregarCarta from "./pages/AgregarCarta.jsx";
import DetalleCarta from "./pages/DetalleCarta.jsx";
import Accesorios from "./pages/Accesorios.jsx";


export default function App() {
  const [carrito, setCarrito] = useState(0);
  const agregar = () => setCarrito(carrito + 1);

  return (
    <>
      <Navbar total={carrito} />

      <Routes>
        <Route path="/" element={<Home onAgregar={agregar} />} />
        <Route path="/catalogo/:juegoId" element={<Catalogo onAgregar={agregar} />} />
        <Route path="/carta/:cartaId" element={<DetalleCarta onAgregar={agregar} />} />
        <Route path="/accesorios" element={<Accesorios />} />
        <Route path="/admin/agregar" element={<AgregarCarta />} />

      </Routes>
    </>
  );
}


