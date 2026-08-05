import GameCard from "../components/GameCard.jsx";
import BannerJuego from "../components/BannerJuego.jsx";
import SeccionDestacada from "../components/SeccionDestacada.jsx";
import CartasRecomendadas from "../components/CartasRecomendadas.jsx";
import Footer from "../components/Footer.jsx";
import { useState, useEffect } from "react";
import { listarJuegos } from "../lib/catalogos.js";

export default function Home({ onAgregar }) {
  const [juegos, setJuegos] = useState([]);

  useEffect(() => {
    listarJuegos().then(setJuegos);
  }, []);

  return (
    <>
      {/* Banner hero de One Piece: primero en la pagina */}
      <BannerJuego
        etiqueta="One Piece Card Game"
        titulo="The Time of Battle"
        imagen="/img/banner1.png"
        lado="izquierda"
        ctaTexto="Compra ahora"
        ctaLink="/catalogo/1"
        completo
      />

      {/* Seccion "Juegos Disponibles": 4 GameCard desde una lista */}
      <section className="juegos" id="catalogo">
        <div className="contenedor">
          <h2>Juegos Disponibles</h2>
          <div className="grid">
            {juegos.map((j) => (
              <GameCard
                key={j.id}
                id={j.id}
                nombre={j.nombre}
                imagen={j.imagen}
                onAgregar={onAgregar}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Banner de Riftbound debajo de las colecciones */}
      <BannerJuego
        etiqueta="Riftbound Card Game"
        titulo="Vendetta"
        imagen="/img/banner2.png"
        lado="derecha"
        ctaTexto="Compra ahora"
        ctaLink="/catalogo/2"
      />

      {/* Carrusel de cartas recomendadas de todos los juegos */}
      <CartasRecomendadas />

      <SeccionDestacada />

      <Footer />
    </>
  );
}


