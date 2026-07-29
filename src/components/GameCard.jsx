import { Link } from "react-router-dom";

export default function GameCard({ id, nombre, imagen, onAgregar }) {
  return (
    <div className="game-card">
      <img src={imagen} alt={nombre} />
      <h3>{nombre}</h3>
      <Link to={`/catalogo/${id}`}>
        <button>Ver Catálogo</button>
      </Link>
    </div>
  );
}


