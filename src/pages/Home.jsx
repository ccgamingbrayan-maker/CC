import GameCard from "../components/GameCard.jsx";
import BannerJuego from "../components/BannerJuego.jsx";
import SeccionDestacada from "../components/SeccionDestacada.jsx";
import Footer from "../components/Footer.jsx";
import { juegos } from "../data/juegos.js";

export default function Home({ onAgregar }) {
  return (
    <>
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

      {/* Dos banners = mismo componente, distinto lado */}
      <BannerJuego
        etiqueta="One Piece Card Game"
        titulo="The Time of Battle"
        imagen="/img/banner1.png"
        lado="izquierda"
      />
      <div style={{ padding: '12px 12px 0' }}>  </div>
      <BannerJuego 
        etiqueta="Riftbound Card Game"
        titulo="Vendetta"
        imagen="/img/banner2.png"
        lado="derecha"
      />

      <SeccionDestacada />

      <Footer />
    </>
  );
}


