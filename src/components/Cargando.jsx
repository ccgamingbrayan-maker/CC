export default function Cargando({ texto = "Cargando…" }) {
  return (
    <div className="cargando" role="status" aria-live="polite">
      <span className="cargando-spinner" aria-hidden="true" />
      <p>{texto}</p>
    </div>
  );
}
