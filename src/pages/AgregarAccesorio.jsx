import { useState, useEffect } from "react";
import {
  Package,
  Layers,
  Sparkles,
  Search,
  Check,
  X,
  Loader2,
  RotateCcw,
  Plus,
  ExternalLink,
  Tag,
  Boxes
} from "lucide-react";
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
  const [categoriaId, setCategoriaId] = useState(31); // 31 = Sleeves por defecto
  const [grupos, setGrupos] = useState([]);
  const [grupoId, setGrupoId] = useState("");
  const [productos, setProductos] = useState([]);
  const [filtroProducto, setFiltroProducto] = useState("");
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
  const [mensajeTipo, setMensajeTipo] = useState("info");

  function setManualCampo(campo, valor) {
    setManual((prev) => ({ ...prev, [campo]: valor }));
  }

  // 1) Cargar automáticamente las marcas (grupos) cada vez que cambia la categoría
  useEffect(() => {
    let cancelado = false;
    async function fetchGrupos() {
      setCargandoGrupos(true);
      setMensaje("");
      setGrupos([]);
      setGrupoId("");
      setProductos([]);
      setSeleccionado(null);
      try {
        const lista = await listarGrupos(categoriaId);
        if (!cancelado) {
          setGrupos(lista || []);
          if ((lista || []).length === 0) {
            setMensaje("No se encontraron marcas registradas en esta categoría.");
            setMensajeTipo("info");
          }
        }
      } catch (e) {
        console.error(e);
        if (!cancelado) {
          setMensaje("Error al conectar con el catálogo de accesorios (TCGCSV).");
          setMensajeTipo("error");
        }
      } finally {
        if (!cancelado) setCargandoGrupos(false);
      }
    }
    fetchGrupos();
    return () => {
      cancelado = true;
    };
  }, [categoriaId]);

  // 2) Cargar los productos cuando el usuario escoge una marca o grupo
  async function cargarProductosDeGrupo(idGrupo) {
    setGrupoId(idGrupo);
    setProductos([]);
    setSeleccionado(null);
    setFiltroProducto("");
    if (!idGrupo) return;

    setCargandoProductos(true);
    setMensaje("");
    try {
      const lista = await listarProductos(categoriaId, idGrupo);
      setProductos(lista || []);
      if ((lista || []).length === 0) {
        setMensaje("Esta marca no reporta productos activos en el catálogo.");
        setMensajeTipo("info");
      }
    } catch (e) {
      console.error(e);
      setMensaje("Error al consultar los productos de esta marca.");
      setMensajeTipo("error");
    } finally {
      setCargandoProductos(false);
    }
  }

  // 3) Seleccionar un producto del catálogo
  function elegirProducto(p) {
    setSeleccionado(p);
    const usd = p.precios?.usd ?? null;
    setPrecioReferencia(usd);
    if (usd) {
      setPrecio(String(Math.round(Number(usd) * 3500)));
    } else {
      setPrecio("");
    }
    if (!stock) setStock("5");
  }

  // 4a) Guardar producto de catálogo en Supabase
  async function guardar() {
    if (!seleccionado) {
      setMensaje("Selecciona un accesorio de la lista antes de guardar.");
      setMensajeTipo("error");
      return;
    }
    if (!precio || Number(precio) <= 0) {
      setMensaje("Ingresa un precio válido en COP.");
      setMensajeTipo("error");
      return;
    }
    if (!stock || Number(stock) < 0) {
      setMensaje("Ingresa una cantidad de stock válida.");
      setMensajeTipo("error");
      return;
    }

    setGuardando(true);
    const { error } = await supabase.from("accesorios").insert({
      nombre: seleccionado.nombre,
      precio: Number(precio),
      color: seleccionado.color || null,
      imagen: seleccionado.imagen || null,
      stock: Number(stock),
      estado,
      fabricante: seleccionado.fabricante || null,
      sku: seleccionado.sku || null,
      descripcion: seleccionado.descripcion || null,
      url: seleccionado.url || null,
    });
    setGuardando(false);

    if (error) {
      setMensaje("Error al guardar en base de datos: " + error.message);
      setMensajeTipo("error");
    } else {
      setMensaje(`¡"${seleccionado.nombre}" guardado y publicado en la tienda!`);
      setMensajeTipo("success");
      setSeleccionado(null);
      setPrecio("");
      setStock("");
      setEstado("activo");
      setPrecioReferencia(null);
    }
  }

  // 4b) Guardar accesorio manual
  async function guardarManual() {
    if (!manual.nombre.trim()) {
      setMensaje("El nombre del accesorio es obligatorio.");
      setMensajeTipo("error");
      return;
    }
    if (!manual.precio || Number(manual.precio) <= 0) {
      setMensaje("Ingresa un precio válido en COP.");
      setMensajeTipo("error");
      return;
    }
    if (!manual.stock || Number(manual.stock) < 0) {
      setMensaje("Ingresa una cantidad de stock válida.");
      setMensajeTipo("error");
      return;
    }

    setGuardandoManual(true);
    const { error } = await supabase.from("accesorios").insert({
      nombre: manual.nombre.trim(),
      precio: Number(manual.precio),
      color: manual.color.trim() || null,
      imagen: manual.imagen.trim() || null,
      stock: Number(manual.stock),
      estado: manual.estado,
      descripcion: manual.descripcion.trim() || null,
    });
    setGuardandoManual(false);

    if (error) {
      setMensaje("Error al guardar: " + error.message);
      setMensajeTipo("error");
    } else {
      setMensaje(`¡"${manual.nombre}" publicado manualmente con éxito!`);
      setMensajeTipo("success");
      setManual(ESTADO_VACIO_MANUAL);
    }
  }

  // Filtrado reactivo de productos de la marca
  const productosFiltrados = productos.filter((p) => {
    if (!filtroProducto.trim()) return true;
    const q = filtroProducto.toLowerCase();
    return (
      (p.nombre && p.nombre.toLowerCase().includes(q)) ||
      (p.color && p.color.toLowerCase().includes(q)) ||
      (p.fabricante && p.fabricante.toLowerCase().includes(q))
    );
  });

  return (
    <div className="admin-workbench">
      {/* COLUMNA IZQUIERDA: CONFIGURACIÓN Y FORMULARIO */}
      <div className="admin-sidebar-col">
        {/* SUB-MODO: CATÁLOGO VS CARGA MANUAL */}
        <div className="admin-section-box">
          <span className="admin-section-label">Origen del Suministro</span>
          <div className="admin-game-tabs">
            <button
              type="button"
              className={`admin-game-tab ${modo === "catalogo" ? "active" : ""}`}
              onClick={() => {
                setModo("catalogo");
                setMensaje("");
              }}
            >
              <Package size={15} />
              <span>Catálogo TCGCSV</span>
            </button>
            <button
              type="button"
              className={`admin-game-tab ${modo === "manual" ? "active" : ""}`}
              onClick={() => {
                setModo("manual");
                setMensaje("");
              }}
            >
              <Plus size={15} />
              <span>Carga Manual</span>
            </button>
          </div>

          {modo === "catalogo" ? (
            <div className="admin-form-fields" style={{ marginTop: 12 }}>
              <label className="admin-form-label">
                <span>Categoría de producto</span>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(Number(e.target.value))}
                  disabled={cargandoGrupos}
                >
                  {CATEGORIAS_ACCESORIOS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-form-label">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Marca o Línea</span>
                  {cargandoGrupos && (
                    <span style={{ fontSize: 11, color: "var(--acento)" }}>
                      Cargando marcas…
                    </span>
                  )}
                </div>
                <select
                  value={grupoId}
                  onChange={(e) => cargarProductosDeGrupo(e.target.value)}
                  disabled={cargandoGrupos || grupos.length === 0}
                >
                  <option value="">
                    {cargandoGrupos
                      ? "Cargando marcas del catálogo…"
                      : grupos.length === 0
                      ? "Sin marcas disponibles"
                      : "— Selecciona una marca o línea —"}
                  </option>
                  {grupos.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <p className="admin-subtitulo" style={{ marginTop: 8, fontSize: 12 }}>
              Permite registrar accesorios personalizados, dados, playmats locales o suministros no listados en TCGCSV.
            </p>
          )}
        </div>

        {/* FEEDBACK BANNER */}
        {mensaje && (
          <div className={`admin-alert-banner ${mensajeTipo}`}>
            {mensajeTipo === "success" ? <Check size={16} /> : <X size={16} />}
            <span>{mensaje}</span>
          </div>
        )}

        {/* FORMULARIO: MODO CATÁLOGO CON PRODUCTO SELECCIONADO */}
        {modo === "catalogo" && seleccionado && (
          <div className="admin-section-box admin-editor-card">
            <div className="editor-card-header">
              <span className="editor-card-title">Inventario de Accesorio</span>
              <button
                type="button"
                className="btn-admin-discard"
                onClick={() => setSeleccionado(null)}
                title="Descartar selección actual"
              >
                <RotateCcw size={13} /> Descartar
              </button>
            </div>

            {/* HERO DEL PRODUCTO SELECCIONADO */}
            <div className="admin-selected-hero">
              <div className="selected-thumb-wrap">
                {seleccionado.imagen ? (
                  <img src={seleccionado.imagen} alt={seleccionado.nombre} />
                ) : (
                  <div className="thumb-placeholder">Sin imagen</div>
                )}
              </div>
              <div className="selected-meta-info">
                <span className="selected-ready-badge">
                  <Check size={11} strokeWidth={3} /> Listo para publicar
                </span>
                <h4 title={seleccionado.nombre}>{seleccionado.nombre}</h4>
                <p className="selected-set-code">
                  {[seleccionado.fabricante, seleccionado.color]
                    .filter(Boolean)
                    .join(" · ") || "Accesorio TCG"}
                </p>

                {precioReferencia != null && (
                  <div className="admin-ref-converter">
                    <span className="ref-usd">
                      Ref: <strong>${precioReferencia} USD</strong>
                    </span>
                    <button
                      type="button"
                      className="btn-convert-ref"
                      onClick={() => {
                        const sugerido = Math.round(Number(precioReferencia) * 3500);
                        setPrecio(String(sugerido));
                      }}
                      title="Usar sugerido en COP a $3.500 por USD"
                    >
                      Usar sugerido: ${(Math.round(Number(precioReferencia) * 3500)).toLocaleString("es-CO")} COP
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* CAMPOS DEL INVENTARIO */}
            <div className="admin-form-fields">
              <div className="admin-form-row">
                <label className="admin-form-label">
                  <span>Precio de venta (COP) *</span>
                  <input
                    type="number"
                    placeholder="Ej: 45000"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    min={0}
                  />
                </label>

                <label className="admin-form-label">
                  <span>Stock físico *</span>
                  <input
                    type="number"
                    placeholder="Ej: 8"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    min={0}
                  />
                </label>
              </div>

              <label className="admin-form-label">
                <span>Estado de publicación</span>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                >
                  <option value="activo">Activo (visible en la tienda)</option>
                  <option value="inactivo">Inactivo (oculto temporalmente)</option>
                  <option value="agotado">Agotado</option>
                </select>
              </label>

              <button
                type="button"
                className="btn-admin-save-primary"
                disabled={guardando}
                onClick={guardar}
              >
                {guardando ? (
                  <>
                    <Loader2 size={16} className="spinner-icon" />
                    <span>Guardando en inventario…</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Guardar y Publicar en Tienda</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* FORMULARIO: MODO MANUAL DIRECTO */}
        {modo === "manual" && (
          <div className="admin-section-box admin-editor-card">
            <div className="editor-card-header">
              <span className="editor-card-title">Datos del Nuevo Accesorio</span>
              <button
                type="button"
                className="btn-admin-discard"
                onClick={() => setManual(ESTADO_VACIO_MANUAL)}
                title="Limpiar campos"
              >
                <RotateCcw size={13} /> Limpiar
              </button>
            </div>

            <div className="admin-form-fields">
              <label className="admin-form-label">
                <span>Nombre del accesorio *</span>
                <input
                  type="text"
                  placeholder="Ej: Fundas Dragon Shield Matte Dual - Lagoon"
                  value={manual.nombre}
                  onChange={(e) => setManualCampo("nombre", e.target.value)}
                />
              </label>

              <div className="admin-form-row">
                <label className="admin-form-label">
                  <span>Precio de venta (COP) *</span>
                  <input
                    type="number"
                    placeholder="Ej: 52000"
                    value={manual.precio}
                    onChange={(e) => setManualCampo("precio", e.target.value)}
                    min={0}
                  />
                </label>

                <label className="admin-form-label">
                  <span>Stock físico *</span>
                  <input
                    type="number"
                    placeholder="Ej: 10"
                    value={manual.stock}
                    onChange={(e) => setManualCampo("stock", e.target.value)}
                    min={0}
                  />
                </label>
              </div>

              <div className="admin-form-row">
                <label className="admin-form-label">
                  <span>Color o Variante</span>
                  <input
                    type="text"
                    placeholder="Ej: Lagoon / Azul Petróleo"
                    value={manual.color}
                    onChange={(e) => setManualCampo("color", e.target.value)}
                  />
                </label>

                <label className="admin-form-label">
                  <span>Estado</span>
                  <select
                    value={manual.estado}
                    onChange={(e) => setManualCampo("estado", e.target.value)}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="agotado">Agotado</option>
                  </select>
                </label>
              </div>

              <label className="admin-form-label">
                <span>URL de la imagen</span>
                <input
                  type="url"
                  placeholder="https://... o enlace público de la foto"
                  value={manual.imagen}
                  onChange={(e) => setManualCampo("imagen", e.target.value)}
                />
              </label>

              <label className="admin-form-label">
                <span>Descripción o especificaciones</span>
                <textarea
                  rows={3}
                  placeholder="Tamaño estándar (63x88mm), caja de 100 unidades, reverso negro opaco..."
                  value={manual.descripcion}
                  onChange={(e) => setManualCampo("descripcion", e.target.value)}
                />
              </label>

              <button
                type="button"
                className="btn-admin-save-primary"
                disabled={guardandoManual}
                onClick={guardarManual}
              >
                {guardandoManual ? (
                  <>
                    <Loader2 size={16} className="spinner-icon" />
                    <span>Guardando accesorio…</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Publicar Accesorio Manual</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* COLUMNA DERECHA: GRILLA DE PRODUCTOS O VISTA PREVIA */}
      <div className="admin-prints-container">
        {modo === "catalogo" ? (
          <>
            {cargandoProductos ? (
              <div className="admin-guide-card">
                <Loader2 size={32} className="spinner-icon" style={{ color: "var(--acento)" }} />
                <h3>Consultando catálogo de accesorios…</h3>
                <p>Cargando referencias oficiales y precios internacionales.</p>
              </div>
            ) : productos.length > 0 ? (
              <>
                {/* TOOLBAR SUPERIOR */}
                <div className="admin-prints-toolbar">
                  <div className="toolbar-left">
                    <span className="prints-count-badge">
                      {productosFiltrados.length} de {productos.length} accesorios
                    </span>
                    <div className="admin-search-inline">
                      <Search size={14} />
                      <input
                        type="text"
                        placeholder="Filtrar por color o nombre..."
                        value={filtroProducto}
                        onChange={(e) => setFiltroProducto(e.target.value)}
                      />
                      {filtroProducto && (
                        <button
                          type="button"
                          className="btn-clear-inline"
                          onClick={() => setFiltroProducto("")}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* GRILLA DE ACCESORIOS */}
                <div className="admin-cards-grid densidad-medio">
                  {productosFiltrados.map((p) => {
                    const isSelected = seleccionado?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`admin-card-tile ${isSelected ? "is-selected" : ""}`}
                        onClick={() => elegirProducto(p)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            elegirProducto(p);
                          }
                        }}
                      >
                        <div className="admin-card-art">
                          {p.imagen ? (
                            <img src={p.imagen} alt={p.nombre} loading="lazy" />
                          ) : (
                            <div className="admin-card-art-empty">Sin foto</div>
                          )}

                          {isSelected && (
                            <div className="admin-card-selected-check">
                              <Check size={18} strokeWidth={3} />
                            </div>
                          )}

                          <div className="btn-select-hover">
                            {isSelected ? "Seleccionado" : "Elegir para inventario"}
                          </div>
                        </div>

                        <div className="admin-card-details">
                          <span className="admin-card-name" title={p.nombre}>
                            {p.nombre}
                          </span>
                          <span className="admin-card-sub">
                            {[p.fabricante, p.color].filter(Boolean).join(" · ") || "Estándar"}
                          </span>
                          <div className="admin-card-price-chip">
                            {p.precios?.usd ? `$${p.precios.usd} USD` : "Sin ref USD"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="admin-guide-card">
                <div className="guide-icon-box">
                  <Boxes size={28} />
                </div>
                <h3>Explorador de Accesorios TCG</h3>
                <p>
                  Elige una categoría (Fundas, Cajas de mazo, Protectores) y una marca oficial para desplegar las referencias disponibles.
                </p>

                <div className="guide-steps-grid">
                  <div className="guide-step-item">
                    <span className="step-bubble">1</span>
                    <strong>Selecciona la categoría</strong>
                    <span>Fundas estándar, cajas para mazo o carpetas de colección.</span>
                  </div>
                  <div className="guide-step-item">
                    <span className="step-bubble">2</span>
                    <strong>Elige la marca</strong>
                    <span>Dragon Shield, Ultra Pro, Ultimate Guard o Gamegenic.</span>
                  </div>
                  <div className="guide-step-item">
                    <span className="step-bubble">3</span>
                    <strong>Fija tu precio y stock</strong>
                    <span>Usa el convertidor sugerido en COP y publica con un solo clic.</span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* VISTA PREVIA DEL ACCESORIO MANUAL */
          <div className="admin-guide-card" style={{ maxWidth: 440, margin: "0 auto" }}>
            <span className="admin-section-label" style={{ marginBottom: 12, display: "block" }}>
              Vista previa en tienda
            </span>
            <div className="admin-card-tile is-selected" style={{ pointerEvents: "none", width: "100%" }}>
              <div className="admin-card-art" style={{ height: 260 }}>
                {manual.imagen ? (
                  <img src={manual.imagen} alt={manual.nombre || "Accesorio manual"} />
                ) : (
                  <div className="admin-card-art-empty">Sin imagen asignada</div>
                )}
              </div>
              <div className="admin-card-details">
                <span className="admin-card-name" style={{ fontSize: 16 }}>
                  {manual.nombre || "Nombre del accesorio"}
                </span>
                <span className="admin-card-sub">
                  {[manual.color, `Stock: ${manual.stock || "0"}`].filter(Boolean).join(" · ")}
                </span>
                <div className="admin-card-price-chip" style={{ fontSize: 14, marginTop: 4 }}>
                  {manual.precio
                    ? `$${Number(manual.precio).toLocaleString("es-CO")} COP`
                    : "$0 COP"}
                </div>
              </div>
            </div>
            {manual.descripcion && (
              <p style={{ marginTop: 16, fontSize: 13, color: "var(--texto-suave)", textAlign: "left" }}>
                {manual.descripcion}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



