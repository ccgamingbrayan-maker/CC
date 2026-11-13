import { Link, useNavigate } from "react-router-dom";

export default function GameCard({ id, nombre, imagen }) {
  const navigate = useNavigate();

  return (
    <div
      className="game-card"
      onClick={() => navigate(`/catalogo/${id}`)}
      style={{ cursor: "pointer" }}
    >
      <img src={imagen} alt={nombre} loading="lazy" />
      <h3>{nombre}</h3>
      <Link to={`/catalogo/${id}`} onClick={(e) => e.stopPropagation()}>
        <button type="button">Ver Catálogo</button>
      </Link>
    </div>
  );
}
