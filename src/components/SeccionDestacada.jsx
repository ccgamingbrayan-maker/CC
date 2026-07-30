
import CarouselStore from "./CarouselStore";

export default function SeccionDestacada() {
  return (
    <section className="destacada">
      <div className="contenedor destacada-inner">
        <h2>Cartas sacadas en productos de la tienda</h2>
        <figure className="carta-destacada">
          <CarouselStore onlyCarrusel imageWidth={260} random={true} />
        </figure>
      </div>
    </section>
  );
}


