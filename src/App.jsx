import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import Catalogo from "./pages/Catalogo.jsx";
import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import  AgregarCarta  from "./pages/AgregarCarta.jsx";
import Accesorios from "./pages/Accesorios.jsx";
import DetalleAccesorio from "./pages/DetalleAccesorio.jsx";
import DetalleCarta from "./pages/DetalleCarta.jsx";
import Login from "./pages/Login.jsx";
import Perfil from "./pages/Perfil.jsx";
import RutaAdmin from "./components/RutaAdmin.jsx";
import { useAuth } from "./lib/AuthContext.jsx";
import { supabase } from "./lib/supabase.js";


export default function App() {
  const [carrito, setCarrito] = useState(0);
  const { user } = useAuth();

  async function agregar(item) {
    setCarrito((c) => c + 1);
    if (!user || !item?.id || !item?.tipo) return;
    try {
      const { data: existente } = await supabase
        .from("carrito")
        .select("id,cantidad")
        .eq("user_id", user.id)
        .eq("tipo", item.tipo)
        .eq("item_id", item.id)
        .maybeSingle();
      if (existente) {
        await supabase
          .from("carrito")
          .update({ cantidad: existente.cantidad + 1 })
          .eq("id", existente.id);
      } else {
        await supabase
          .from("carrito")
          .insert({ user_id: user.id, tipo: item.tipo, item_id: item.id, cantidad: 1 });
      }
    } catch (e) {
      console.error("Error guardando en el carrito:", e);
    }
  }

  return (
    <>
      <Navbar total={carrito} />

      <Routes>
        <Route path="/" element={<Home onAgregar={agregar} />} />
        <Route path="/catalogo/:juegoId" element={<Catalogo onAgregar={agregar} />} />
        <Route path="/accesorios" element={<Accesorios onAgregar={agregar} />} />
        <Route path="/accesorio/:accesorioId" element={<DetalleAccesorio onAgregar={agregar} />} />
        <Route path="/carta/:cartaId" element={<DetalleCarta onAgregar={agregar} />} />
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




