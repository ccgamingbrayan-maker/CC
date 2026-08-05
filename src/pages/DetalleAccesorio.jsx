import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import Cargando from "../components/Cargando.jsx";

export default function DetalleAccesorio({ onAgregar }) {
  const { accesorioId } = useParams();
  const [accesorio, setAccesorio] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Edición de detalles (admin)
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      const { data } = await supabase
        .from("accesorios")
        .select("*")
        .eq("id", Number(accesorioId))
        .single();
      setAccesorio(data);
      setCargando(false);
    }
    cargar();
  }, [accesorioId]);

  function abrirEdicion() {
    setForm({
      precio: accesorio.precio ?? "",
      stock: accesorio.stock ?? "",
      estado: accesorio.estado ?? "activo",
      color: accesorio.color ?? "",
      descripcion: accesorio.descripcion ?? "",
    });
    setMensaje("");
    setEditando(true);
  }

  async function guardarDetalles() {
    setGuardando(true);
    const cambios = {
      precio: form.precio === "" ? null : Number(form.precio),
      stock: form.stock === "" ? null : Number(form.stock),
      estado: form.estado,
      color: form.color || null,
      descripcion: form.descripcion || null,
    };
    const { data, error } = await supabase
      .from("accesorios")
      .update(cambios)
      .eq("id", accesorio.id)
      .select()
      .single();
    setGuardando(false);

    if (error) {
      setMensaje("Error al guardar: " + error.message);
    } else {
      setAccesorio(data);
      setEditando(false);
    }
  }

  if (cargando) return <Cargando texto="Cargando accesorio…" />;
  if (!accesorio) return <p className="contenedor">Accesorio no encontrado.</p>;

  return (
    <section className="juegos">
      <div className="contenedor detalle-carta">
        {accesorio.imagen
          ? <img src={accesorio.imagen} alt={accesorio.nombre} />
          : <div className="preview-placeholder" style={{ width: 320, maxWidth: "100%" }}>Sin imagen</div>}

        <div className="detalle-info">
          <h2>{accesorio.nombre}</h2>
          <p className="detalle-precio">
            ${Number(accesorio.precio ?? 0).toLocaleString("es-CO")} COP
          </p>

          <ul className="detalle-specs">
            {accesorio.fabricante && <li><span>Fabricante</span><strong>{accesorio.fabricante}</strong></li>}
            {accesorio.color && <li><span>Color</span><strong>{accesorio.color}</strong></li>}
            {accesorio.sku && <li><span>SKU</span><strong>{accesorio.sku}</strong></li>}
            <li><span>Stock</span><strong>{accesorio.stock ?? 0}</strong></li>
            <li><span>Estado</span><strong>{accesorio.estado ?? "—"}</strong></li>
          </ul>

          {accesorio.descripcion && (
            <p className="detalle-desc">{accesorio.descripcion}</p>
          )}

          <button
            onClick={onAgregar}
            disabled={accesorio.estado === "agotado" || (accesorio.stock ?? 0) <= 0}
          >
            {accesorio.estado === "agotado" || (accesorio.stock ?? 0) <= 0
              ? "Agotado"
              : "Agregar al carrito"}
          </button>

          {accesorio.url && (
            <a href={accesorio.url} target="_blank" rel="noreferrer" className="detalle-link">
              Ver en TCGplayer ↗
            </a>
          )}

          <button className="btn-ghost" onClick={abrirEdicion} style={{ width: "fit-content" }}>
            Editar detalles (admin)
          </button>
        </div>
      </div>

      {editando && (
        <div className="contenedor">
          <div className="agregar-accesorio" style={{ marginTop: 24 }}>
            <h3 style={{ margin: 0 }}>Editar detalles</h3>
            <div className="accesorio-row">
              <label>
                Precio (COP)
                <input type="number" value={form.precio}
                  onChange={(e) => setForm({ ...form, precio: e.target.value })} />
              </label>
              <label>
                Stock
                <input type="number" value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </label>
            </div>
            <div className="accesorio-row">
              <label>
                Color
                <input value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </label>
              <label>
                Estado
                <select value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="agotado">Agotado</option>
                </select>
              </label>
            </div>
            <label>
              Descripción
              <textarea rows={4} value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </label>
            <div className="accesorio-actions">
              <button onClick={guardarDetalles} disabled={guardando}>
                {guardando ? "Guardando…" : "Guardar cambios"}
              </button>
              <button className="btn-ghost" onClick={() => setEditando(false)}>Cancelar</button>
            </div>
            {mensaje && <p className="agregar-mensaje">{mensaje}</p>}
          </div>
        </div>
      )}
    </section>
  );
}


