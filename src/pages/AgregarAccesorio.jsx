import { useState } from "react";
import {
  CATEGORIAS_ACCESORIOS,
  listarGrupos,
  listarProductos,
} from "../lib/tcgcsv.js";
import { supabase } from "../lib/supabase.js";

const ESTADO_VACIO_MANUAL = {
  nombre: "",
  precio: "",
  color: "",
  imagen: "",
  stock: "",
  estado: "activo",
  descripcion: "",
};

export default function AgregarAccesorio() {
  const [modo, setModo] = useState("catalogo"); // "catalogo" | "manual"

  // --- Estado del flujo por catálogo (TCGCSV) ---
  const [categoriaId, setCategoriaId] = useState(31);
  const [grupos, setGrupos] = useState([]);
  const [grupoId, setGrupoId] = useState("");
  const [productos, setProductos] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [precioReferencia, setPrecioReferencia] = useState(null);
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [estado, setEstado] = useState("activo");
  const [cargandoGrupos, setCargandoGrupos] = useState(false);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // --- Estado del formulario manual ---
  const [manual, setManual] = useState(ESTADO_VACIO_MANUAL);
  const [guardandoManual, setGuardandoManual] = useState(false);

  const [mensaje, setMensaje] = useState("");

  function setManualCampo(campo, valor) {
    setManual((prev) => ({ ...prev, [campo]: valor }));
  }

  // 1) Cargar los grupos (marcas / líneas) de la categoría elegida.
  async function cargarGrupos() {
    setCargandoGrupos(true);
    setMensaje("");
    setGrupos([]);
    setGrupoId("");
    setProductos([]);
    setSeleccionado(null);
    try {
      const lista = await listarGrupos(categoriaId);
      setGrupos(lista);
      if (lista.length === 0) setMensaje("No se encontraron marcas en esa categoría.");
    } catch (e) {
      console.error(e);
      setMensaje("Error al cargar las marcas. ¿Está corriendo el proxy (npm run dev)?");
    } finally {
      setCargandoGrupos(false);
    }
  }

  // 2) Cargar los productos del grupo elegido.
  async function cargarProductos(idGrupo) {
    setGrupoId(idGrupo);
    setProductos([]);
    setSeleccionado(null);
    if (!idGrupo) return;
    setCargandoProductos(true);
    setMensaje("");
    try {
      const lista = await listarProductos(categoriaId, idGrupo);
      setProductos(lista);
      if (lista.length === 0) setMensaje("Esa marca no tiene productos.");
    } catch (e) {
      console.error(e);
      setMensaje("Error al cargar los productos.");
    } finally {
      setCargandoProductos(false);
    }
  }

  // 3) Elegir un producto: precarga precio de referencia (USD -> COP).
  function elegirProducto(p) {
    setSeleccionado(p);
    const usd = p.precios?.usd ?? null;
    setPrecioReferencia(usd);
    if (usd) setPrecio(String(Math.round(Number(usd) * 3500)));
  }

  // 4a) Guardar el accesorio elegido del catálogo.
  async function guardar() {
    if (!seleccionado) return setMensaje("Selecciona un accesorio antes de guardar.");
    if (!precio || !stock) return setMensaje("Completa precio y stock antes de guardar.");

    setGuardando(true);
    const { error } = await supabase.from("accesorios").insert({
      nombre: seleccionado.nombre,
      precio: Number(precio),
      color: seleccionado.color,
      imagen: seleccionado.imagen,
      stock: Number(stock),
      estado,
      fabricante: seleccionado.fabricante,
      sku: seleccionado.sku,
      descripcion: seleccionado.descripcion,
      url: seleccionado.url,
    });
    setGuardando(false);

    if (error) {
      setMensaje("Error al guardar: " + error.message);
    } else {
      setMensaje(`¡"${seleccionado.nombre}" guardado en tu tienda!`);
      setSeleccionado(null);
      setPrecio("");
      setStock("");
      setEstado("activo");
      setPrecioReferencia(null);
    }
  }

  // 4b) Guardar un accesorio cargado a mano.
  async function guardarManual() {
    if (!manual.nombre || !manual.precio || !manual.stock) {
      return setMensaje("Completa al menos nombre, precio y stock.");
    }
    setGuardandoManual(true);
    const { error } = await supabase.from("accesorios").insert({
      nombre: manual.nombre,
      precio: Number(manual.precio),
      color: manual.color || null,
      imagen: manual.imagen || null,
      stock: Number(manual.stock),
      estado: manual.estado,
      descripcion: manual.descripcion || null,
    });
    setGuardandoManual(false);

    if (error) {
      setMensaje("Error al guardar: " + error.message);
    } else {
      setMensaje(`¡"${manual.nombre}" cargado manualmente!`);
      setManual(ESTADO_VACIO_MANUAL);
    }
  }

  return (
    <>
      <div className="admin-subtabs">
        <button
          className={`admin-subtab ${modo === "catalogo" ? "active" : ""}`}
          onClick={() => { setModo("catalogo"); setMensaje(""); }}
        >
          Desde catálogo
        </button>
        <button
          className={`admin-subtab ${modo === "manual" ? "active" : ""}`}
          onClick={() => { setModo("manual"); setMensaje(""); }}
        >
          Carga manual
        </button>
      </div>

      <p className="admin-intro">
        {modo === "catalogo"
          ? "Elige una categoría y una marca, saca la info de TCGCSV, pon tu precio y stock, y se guarda en Supabase."
          : "Carga un accesorio a mano con tus propios datos. Útil para lo que no está en el catálogo."}
      </p>

      {/* ============ MODO CATÁLOGO ============ */}
      {modo === "catalogo" && (
        <div className="agregar-carta-grid">
          <div className="agregar-panel">
            <div className="agregar-accesorio">
              <div className="accesorio-row">
                <label>
                  Categoría
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(Number(e.target.value))}
                  >
                    {CATEGORIAS_ACCESORIOS.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Marca / línea
                  <select
                    value={grupoId}
                    onChange={(e) => cargarProductos(e.target.value)}
                    disabled={grupos.length === 0}
                  >
                    <option value="">
                      {grupos.length === 0 ? "Carga las marcas primero" : "Elige una marca"}
                    </option>
                    {grupos.map((g) => (
                      <option key={g.id} value={g.id}>{g.nombre}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="accesorio-actions">
                <button onClick={cargarGrupos} disabled={cargandoGrupos}>
                  {cargandoGrupos ? "Cargando marcas…" : "Cargar marcas"}
                </button>
                {cargandoProductos && (
                  <span style={{ color: "var(--texto-suave)" }}>Cargando productos…</span>
                )}
              </div>
            </div>

            {seleccionado && (
              <div className="agregar-preview admin-card">
                <img src={seleccionado.imagen} alt={seleccionado.nombre} />

                <div className="agregar-form">
                  <h3>{seleccionado.nombre}</h3>
                  <p style={{ color: "var(--texto-suave)" }}>
                    {[seleccionado.fabricante, seleccionado.color].filter(Boolean).join(" · ")}
                  </p>

                  {precioReferencia && (
                    <p className="precio-ref">
                      Precio referencia: <strong>{precioReferencia} USD</strong>
                      <button
                        className="btn-ghost"
                        onClick={() => setPrecio(String(Math.round(Number(precioReferencia) * 3500)))}
                      >
                        Usar referencia (USD → COP)
                      </button>
                    </p>
                  )}

                  <label>
                    Precio (COP)
                    <input type="number" placeholder="15000" value={precio}
                      onChange={(e) => setPrecio(e.target.value)} />
                  </label>

                  <label>
                    Stock
                    <input type="number" placeholder="10" value={stock}
                      onChange={(e) => setStock(e.target.value)} />
                  </label>

                  <label>
                    Estado
                    <select value={estado} onChange={(e) => setEstado(e.target.value)}>
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                      <option value="agotado">Agotado</option>
                    </select>
                  </label>

                  <button onClick={guardar} disabled={guardando}>
                    {guardando ? "Guardando…" : "Guardar en mi tienda"}
                  </button>
                </div>
              </div>
            )}

            {mensaje && <p className="agregar-mensaje">{mensaje}</p>}
          </div>

          {productos.length > 0 && (
            <div className="agregar-print-list">
              <h3>Selecciona el accesorio que quieres agregar</h3>
              <div className="grid">
                {productos.map((p) => (
                  <div
                    key={p.id}
                    className={`game-card ${seleccionado?.id === p.id ? "selected" : ""}`}
                    onClick={() => elegirProducto(p)}
                  >
                    {p.imagen && <img src={p.imagen} alt={p.nombre} />}
                    <h3>{p.nombre}</h3>
                    <p>{[p.fabricante, p.color].filter(Boolean).join(" · ")}</p>
                    <p style={{ fontSize: 14 }}>{p.precios?.usd ? `$${p.precios.usd}` : "-"}</p>
                  </div>
                ))}
              </div>
              <p style={{ color: "var(--texto-suave)" }}>Haz clic en el accesorio que quieres agregar.</p>
            </div>
          )}
        </div>
      )}

      {/* ============ MODO MANUAL ============ */}
      {modo === "manual" && (
        <div className="agregar-carta-grid">
          <div className="agregar-panel">
            <div className="agregar-accesorio">
              <label>
                Nombre
                <input placeholder="Funda Dragon Shield Matte - Negro"
                  value={manual.nombre}
                  onChange={(e) => setManualCampo("nombre", e.target.value)} />
              </label>

              <div className="accesorio-row">
                <label>
                  Precio (COP)
                  <input type="number" placeholder="15000" value={manual.precio}
                    onChange={(e) => setManualCampo("precio", e.target.value)} />
                </label>
                <label>
                  Stock
                  <input type="number" placeholder="10" value={manual.stock}
                    onChange={(e) => setManualCampo("stock", e.target.value)} />
                </label>
              </div>

              <div className="accesorio-row">
                <label>
                  Color
                  <input placeholder="Negro" value={manual.color}
                    onChange={(e) => setManualCampo("color", e.target.value)} />
                </label>
                <label>
                  Estado
                  <select value={manual.estado}
                    onChange={(e) => setManualCampo("estado", e.target.value)}>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="agotado">Agotado</option>
                  </select>
                </label>
              </div>

              <label>
                Imagen (URL)
                <input placeholder="https://…/foto.jpg" value={manual.imagen}
                  onChange={(e) => setManualCampo("imagen", e.target.value)} />
              </label>

              <label>
                Descripción
                <textarea rows={3} placeholder="Detalles del accesorio, material, capacidad, etc."
                  value={manual.descripcion}
                  onChange={(e) => setManualCampo("descripcion", e.target.value)} />
              </label>

              <div className="accesorio-actions">
                <button onClick={guardarManual} disabled={guardandoManual}>
                  {guardandoManual ? "Guardando…" : "Cargar accesorio"}
                </button>
              </div>
            </div>

            {mensaje && <p className="agregar-mensaje">{mensaje}</p>}
          </div>

          <div className="agregar-print-list">
            <h3>Vista previa</h3>
            <div className="game-card preview-card">
              {manual.imagen
                ? <img src={manual.imagen} alt={manual.nombre || "Vista previa"} />
                : <div className="preview-placeholder">Sin imagen</div>}
              <h3>{manual.nombre || "Nombre del accesorio"}</h3>
              <p>{manual.color || "—"}</p>
              <p style={{ fontSize: 14 }}>
                {manual.precio ? `$${Number(manual.precio).toLocaleString("es-CO")} COP` : "-"}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


