import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import CarruselRelacionados from "./CarruselRelacionados.jsx";

export default function CartasRecomendadas() {
  const [cartas, setCartas] = useState([]);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      const { data, error } = await supabase
        .from("cartas")
        .select("id,nombre,imagen,precio")
        .not("imagen", "is", null)
        .not("precio", "is", null)
        .not("stock", "is", null)
        .neq("juego_id", 6)
        .order("id", { ascending: false })
        .limit(100);
      if (error) {
        console.error("Error cargando cartas recomendadas:", error);
        return;
      }
      if (activo) {
        const mezcladas = [...(data || [])].sort(() => Math.random() - 0.5);
        setCartas(mezcladas.slice(0, 12));
      }
    }
    cargar();
    return () => {
      activo = false;
    };
  }, []);

  if (cartas.length === 0) return null;

  return (
    <section className="recomendadas">
      <div className="contenedor">
        <CarruselRelacionados
          titulo="Cartas recomendadas para ti"
          items={cartas}
          tipo="carta"
          infinito
        />
      </div>
    </section>
  );
}
