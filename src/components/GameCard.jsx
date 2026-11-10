import { Link } from "react-router-dom";

export default function GameCard({ id, nombre, imagen }) {
  return (
    <div className="game-card">
      <Link to={`/catalogo/${id}`} className="game-card-link-wrap">
        <img src={imagen} alt={nombre} loading="lazy" />
        <h3>{nombre}</h3>
        <span className="game-card-btn">Ver Catálogo</span>
      </Link>
    </div>
  );
}


