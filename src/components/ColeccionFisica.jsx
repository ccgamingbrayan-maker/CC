import { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Plus,
  Minus,
  Trash2,
  Search,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";

const RAREZAS = [
  "Leader (L)",
  "Common (C)",
  "Uncommon (UC)",
  "Rare (R)",
  "Super Rare (SR)",
  "Secret Rare (SEC)",
  "Special (SP)",
  "Alt Art (AA)",
  "Manga Rare",
  "Promo (P)",
  "DON!!",
  "Otra",
];

const CONDICIONES = [
  "Near Mint (NM)",
  "Lightly Played (LP)",
  "Moderately Played (MP)",
  "Heavily Played (HP)",
  "Damaged (DMG)",
];

export default function ColeccionFisica({ user }) {
  // Cargar colección desde user_metadata o localStorage de respaldo
  const [coleccion, setColeccion] = useState(() => {
    return (
      user?.user_metadata?.coleccion ||
      JSON.parse(localStorage.getItem(`coleccion_${user?.id}`) || "[]")
    );
  });

  const [guardando, setGuardando] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [expansionFiltro, setExpansionFiltro] = useState("todas");
  const [expansionesColapsadas, setExpansionesColapsadas] = useState({});

  // Lista de expansiones de la base de datos para sugerir en el formulario
  const [expansionesDb, setExpansionesDb] = useState([]);
  // Búsqueda rápida de cartas de la tienda
  const [sugerenciasTienda, setSugerenciasTienda] = useState([]);
  const [buscandoSugerencia, setBuscandoSugerencia] = useState(false);

  // Formulario de nueva carta
  const [formNombre, setFormNombre] = useState("");
  const [formExpansion, setFormExpansion] = useState("");
  const [formNuevaExpansion, setFormNuevaExpansion] = useState("");
  const [formRareza, setFormRareza] = useState("Rare (R)");
  const [formCondicion, setFormCondicion] = useState("Near Mint (NM)");
  const [formCantidad, setFormCantidad] = useState(1);
  const [formImagen, setFormImagen] = useState("");
  const [formCodigo, setFormCodigo] = useState(""); // Ej: OP01-001

  // Cargar lista de expansiones disponibles
  useEffect(() => {
    supabase
      .from("expansiones")
      .select("nombre")
      .order("nombre")
      .then(({ data }) => {
        if (data) {
          const nombres = data.map((e) => e.nombre).filter(Boolean);
          setExpansionesDb([...new Set(nombres)]);
        }
      });
  }, []);

  // Guardar cambios en Supabase (metadata) y localStorage
  async function persistirColeccion(nuevaColeccion) {
    setColeccion(nuevaColeccion);
    localStorage.setItem(`coleccion_${user.id}`, JSON.stringify(nuevaColeccion));
    setGuardando(true);
    try {
      await supabase.auth.updateUser({
        data: { coleccion: nuevaColeccion },
      });
    } catch (err) {
      console.error("Error guardando colección:", err);
    } finally {
      setGuardando(false);
    }
  }

  // Buscar cartas en la tienda para autocompletar
  async function buscarEnTienda(texto) {
    setFormNombre(texto);
    if (texto.trim().length < 2) {
      setSugerenciasTienda([]);
      return;
    }
    setBuscandoSugerencia(true);
    const { data } = await supabase
      .from("cartas")
      .select("id, nombre, imagen, expansion, condicion")
      .ilike("nombre", `%${texto.trim()}%`)
      .limit(6);
    setSugerenciasTienda(data || []);
    setBuscandoSugerencia(false);
  }

  // Seleccionar una carta de la tienda para autocompletar el formulario
  function seleccionarSugerencia(carta) {
    setFormNombre(carta.nombre);
    if (carta.imagen) setFormImagen(carta.imagen);
    if (carta.expansion) setFormExpansion(carta.expansion);
    setSugerenciasTienda([]);
  }

  // Agregar carta a la colección
  async function handleAgregarCarta(e) {
    e.preventDefault();
    if (!formNombre.trim()) return;

    const expansionFinal =
      formExpansion === "__nueva__"
        ? formNuevaExpansion.trim()
        : formExpansion.trim() || "Sin Expansión";

    const nuevaCarta = {
      id: Date.now().toString(),
      nombre: formNombre.trim(),
      codigo: formCodigo.trim().toUpperCase(),
      expansion: expansionFinal,
      rareza: formRareza,
      condicion: formCondicion,
      cantidad: Math.max(1, parseInt(formCantidad) || 1),
      imagen: formImagen.trim(),
      creado_en: new Date().toISOString(),
    };

    // Si ya existe la misma carta con la misma expansión y condición, sumamos la cantidad
    const indexExistente = coleccion.findIndex(
      (c) =>
        c.nombre.toLowerCase() === nuevaCarta.nombre.toLowerCase() &&
        c.expansion.toLowerCase() === nuevaCarta.expansion.toLowerCase() &&
        c.condicion === nuevaCarta.condicion
    );

    let nuevaLista;
    if (indexExistente >= 0) {
      nuevaLista = [...coleccion];
      nuevaLista[indexExistente].cantidad += nuevaCarta.cantidad;
    } else {
      nuevaLista = [nuevaCarta, ...coleccion];
    }

    await persistirColeccion(nuevaLista);

    // Limpiar formulario y cerrar modal
    setFormNombre("");
    setFormCodigo("");
    setFormImagen("");
    setFormNuevaExpansion("");
    setFormCantidad(1);
    setMostrarModal(false);
  }

  // Modificar cantidad (+ / -)
  async function cambiarCantidad(id, delta) {
    const nuevaLista = coleccion
      .map((c) => {
        if (c.id === id) {
          const nuevaCant = c.cantidad + delta;
          return nuevaCant > 0 ? { ...c, cantidad: nuevaCant } : null;
        }
        return c;
      })
      .filter(Boolean);

    await persistirColeccion(nuevaLista);
  }

  // Eliminar carta
  async function eliminarCarta(id) {
    const nuevaLista = coleccion.filter((c) => c.id !== id);
    await persistirColeccion(nuevaLista);
  }

  // Alternar colapsar expansión
  function toggleColapso(exp) {
    setExpansionesColapsadas((prev) => ({
      ...prev,
      [exp]: !prev[exp],
    }));
  }

  // Filtrado de cartas
  const cartasFiltradas = useMemo(() => {
    return coleccion.filter((carta) => {
      const coincideTexto =
        !busqueda ||
        carta.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        carta.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        carta.expansion?.toLowerCase().includes(busqueda.toLowerCase());

      const coincideExpansion =
        expansionFiltro === "todas" || carta.expansion === expansionFiltro;

      return coincideTexto && coincideExpansion;
    });
  }, [coleccion, busqueda, expansionFiltro]);

  // Agrupar por expansión
  const gruposPorExpansion = useMemo(() => {
    const grupos = {};
    for (const carta of cartasFiltradas) {
      const exp = carta.expansion || "Otras";
      if (!grupos[exp]) grupos[exp] = [];
      grupos[exp].push(carta);
    }
    // Ordenar alfabéticamente las expansiones
    return Object.keys(grupos)
      .sort((a, b) => a.localeCompare(b))
      .map((exp) => ({
        expansion: exp,
        cartas: grupos[exp],
        totalCartas: grupos[exp].reduce((acc, c) => acc + c.cantidad, 0),
      }));
  }, [cartasFiltradas]);

  // Lista de todas las expansiones presentes en la colección del usuario
  const expansionesEnColeccion = useMemo(() => {
    return [...new Set(coleccion.map((c) => c.expansion || "Otras"))].sort();
  }, [coleccion]);

  // Estadísticas rápidas
  const totalCartasFisicas = useMemo(() => {
    return coleccion.reduce((acc, c) => acc + (c.cantidad || 1), 0);
  }, [coleccion]);

  return (
    <div className="perfil-panel coleccion-contenedor">
      {/* CABECERA & RESUMEN MINIMALISTA */}
      <div className="coleccion-header">
        <div>
          <h3 style={{ margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: "8px" }}>
            <Layers size={20} style={{ color: "var(--acento, #a855f7)" }} />
            Mi Colección Física
          </h3>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--texto-suave, #a1a1aa)" }}>
            Registra y organiza tu binder de cartas físicas por expansiones.
          </p>
        </div>

        <button
          type="button"
          className="auth-boton coleccion-btn-agregar"
          onClick={() => setMostrarModal(true)}
        >
          <Plus size={16} /> Agregar carta
        </button>
      </div>

      {/* METRICAS MINIMALISTAS */}
      <div className="coleccion-stats">
        <div className="stat-card">
          <span className="stat-numero">{totalCartasFisicas}</span>
          <span className="stat-label">Cartas en total</span>
        </div>
        <div className="stat-card">
          <span className="stat-numero">{coleccion.length}</span>
          <span className="stat-label">Cartas únicas</span>
        </div>
        <div className="stat-card">
          <span className="stat-numero">{expansionesEnColeccion.length}</span>
          <span className="stat-label">Expansiones</span>
        </div>
      </div>

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      {coleccion.length > 0 && (
        <div className="coleccion-filtros">
          <div className="coleccion-search-box">
            <Search size={15} style={{ color: "var(--texto-suave, #a1a1aa)" }} />
            <input
              type="text"
              placeholder="Buscar por nombre, código o expansión..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button
                type="button"
                className="btn-limpiar-search"
                onClick={() => setBusqueda("")}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <select
            className="coleccion-select-expansion"
            value={expansionFiltro}
            onChange={(e) => setExpansionFiltro(e.target.value)}
          >
            <option value="todas">Todas las expansiones ({expansionesEnColeccion.length})</option>
            {expansionesEnColeccion.map((exp) => (
              <option key={exp} value={exp}>
                {exp}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ESTADO VACÍO */}
      {coleccion.length === 0 ? (
        <div className="perfil-vacio" style={{ padding: "48px 20px" }}>
          <Layers size={42} style={{ opacity: 0.6, marginBottom: "14px" }} />
          <h4 style={{ margin: "0 0 8px 0", color: "var(--texto, #fff)" }}>
            Tu colección física está vacía
          </h4>
          <p style={{ maxWidth: "420px", margin: "0 auto 24px auto", fontSize: "14px", lineHeight: "1.5" }}>
            Añade las cartas de tu binder o mazo para llevar un registro visual y ordenado de tus cartas reales.
          </p>
          <button
            type="button"
            className="auth-boton"
            style={{ margin: "0 auto", display: "inline-flex", alignItems: "center", gap: "8px" }}
            onClick={() => setMostrarModal(true)}
          >
            <Plus size={16} /> Agregar mi primera carta
          </button>
        </div>
      ) : gruposPorExpansion.length === 0 ? (
        <div className="perfil-vacio" style={{ padding: "36px 20px" }}>
          <p>No se encontraron cartas con esos filtros de búsqueda.</p>
          <button
            type="button"
            className="auth-enlace"
            onClick={() => {
              setBusqueda("");
              setExpansionFiltro("todas");
            }}
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        /* LISTADO AGRUPADO POR EXPANSIONES */
        <div className="coleccion-expansiones-list">
          {gruposPorExpansion.map(({ expansion, cartas, totalCartas }) => {
            const colapsado = !!expansionesColapsadas[expansion];

            return (
              <div key={expansion} className="coleccion-expansion-seccion">
                <header
                  className="expansion-header"
                  onClick={() => toggleColapso(expansion)}
                >
                  <div className="expansion-header-info">
                    <span className="expansion-icono">📦</span>
                    <h4 className="expansion-titulo">{expansion}</h4>
                    <span className="expansion-badge-count">
                      {totalCartas} {totalCartas === 1 ? "carta" : "cartas"}
                    </span>
                  </div>
                  <button type="button" className="btn-toggle-colapso" aria-label="Colapsar">
                    {colapsado ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
                </header>

                {!colapsado && (
                  <div className="coleccion-cards-grid">
                    {cartas.map((carta) => (
                      <div key={carta.id} className="coleccion-card-item">
                        {/* IMAGEN DE LA CARTA */}
                        <div className="card-img-wrapper">
                          {carta.imagen ? (
                            <img
                              src={carta.imagen}
                              alt={carta.nombre}
                              loading="lazy"
                            />
                          ) : (
                            <div className="card-img-placeholder">
                              <ImageIcon size={24} style={{ opacity: 0.4 }} />
                              <span>{carta.codigo || carta.nombre.substring(0, 4)}</span>
                            </div>
                          )}

                          {/* BADGE DE CANTIDAD */}
                          <div className="card-badge-cant">
                            x{carta.cantidad}
                          </div>

                          {/* CONTROLES RÁPIDOS (+ / - / ELIMINAR) */}
                          <div className="card-acciones-hover">
                            <button
                              type="button"
                              className="btn-acc"
                              title="Restar una carta"
                              onClick={() => cambiarCantidad(carta.id, -1)}
                            >
                              <Minus size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-acc"
                              title="Sumar una carta"
                              onClick={() => cambiarCantidad(carta.id, 1)}
                            >
                              <Plus size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-acc btn-trash"
                              title="Eliminar de mi colección"
                              onClick={() => eliminarCarta(carta.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* DETALLES DE LA CARTA */}
                        <div className="card-detalles">
                          <p className="card-nombre" title={carta.nombre}>
                            {carta.nombre}
                          </p>
                          <div className="card-tags">
                            {carta.codigo && (
                              <span className="card-tag tag-codigo">{carta.codigo}</span>
                            )}
                            {carta.rareza && (
                              <span className="card-tag tag-rareza">{carta.rareza.split(" ")[0]}</span>
                            )}
                            {carta.condicion && (
                              <span className="card-tag tag-condicion">
                                {carta.condicion.includes("(")
                                  ? carta.condicion.match(/\(([^)]+)\)/)?.[1]
                                  : carta.condicion}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PARA AGREGAR CARTA */}
      {mostrarModal && (
        <div className="coleccion-modal-backdrop" onClick={() => setMostrarModal(false)}>
          <div
            className="coleccion-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Plus size={18} style={{ color: "var(--acento, #a855f7)" }} />
                Agregar Carta a mi Colección
              </h3>
              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={() => setMostrarModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAgregarCarta} className="modal-form">
              {/* BÚSQUEDA RÁPIDA EN EL CATÁLOGO */}
              <div className="form-campo" style={{ position: "relative" }}>
                <label>
                  Nombre de la carta *
                  <span className="opcional-hint">(escribe para buscar en la tienda o crea una personalizada)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Monkey.D.Luffy, Roronoa Zoro, OP01-001..."
                  value={formNombre}
                  onChange={(e) => buscarEnTienda(e.target.value)}
                  required
                  autoFocus
                />

                {/* DROPDOWN DE SUGERENCIAS DE LA TIENDA */}
                {sugerenciasTienda.length > 0 && (
                  <div className="sugerencias-dropdown">
                    <div className="sugerencias-header">Sugerencias de la tienda:</div>
                    {sugerenciasTienda.map((sug) => (
                      <div
                        key={sug.id}
                        className="sugerencia-item"
                        onClick={() => seleccionarSugerencia(sug)}
                      >
                        {sug.imagen && (
                          <img src={sug.imagen} alt={sug.nombre} className="sug-mini-img" />
                        )}
                        <div>
                          <div className="sug-nombre">{sug.nombre}</div>
                          <div className="sug-sub">{sug.expansion || "Sin expansión"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CÓDIGO & CANTIDAD */}
              <div className="form-row-2">
                <div className="form-campo">
                  <label>Código de carta <span className="opcional-hint">(opcional)</span></label>
                  <input
                    type="text"
                    placeholder="Ej: OP01-001"
                    value={formCodigo}
                    onChange={(e) => setFormCodigo(e.target.value)}
                  />
                </div>
                <div className="form-campo">
                  <label>Cantidad física *</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={formCantidad}
                    onChange={(e) => setFormCantidad(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* EXPANSIÓN */}
              <div className="form-campo">
                <label>Expansión / Colección *</label>
                <select
                  value={formExpansion}
                  onChange={(e) => setFormExpansion(e.target.value)}
                >
                  <option value="">-- Selecciona una expansión existente --</option>
                  {expansionesDb.map((exp) => (
                    <option key={exp} value={exp}>
                      {exp}
                    </option>
                  ))}
                  {/* Expansiones que ya tenga el usuario pero no estén en la db */}
                  {expansionesEnColeccion
                    .filter((exp) => !expansionesDb.includes(exp))
                    .map((exp) => (
                      <option key={exp} value={exp}>
                        {exp}
                      </option>
                    ))}
                  <option value="__nueva__">+ Escribir otra expansión manualmente...</option>
                </select>

                {formExpansion === "__nueva__" && (
                  <input
                    type="text"
                    style={{ marginTop: "8px" }}
                    placeholder="Escribe el nombre de la nueva expansión..."
                    value={formNuevaExpansion}
                    onChange={(e) => setFormNuevaExpansion(e.target.value)}
                    required
                  />
                )}
              </div>

              {/* RAREZA Y CONDICIÓN */}
              <div className="form-row-2">
                <div className="form-campo">
                  <label>Rareza</label>
                  <select
                    value={formRareza}
                    onChange={(e) => setFormRareza(e.target.value)}
                  >
                    {RAREZAS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-campo">
                  <label>Estado / Condición</label>
                  <select
                    value={formCondicion}
                    onChange={(e) => setFormCondicion(e.target.value)}
                  >
                    {CONDICIONES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* IMAGEN URL (OPCIONAL) */}
              <div className="form-campo">
                <label>
                  URL de la imagen <span className="opcional-hint">(opcional si no la elegiste arriba)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://ejemplo.com/carta.jpg"
                  value={formImagen}
                  onChange={(e) => setFormImagen(e.target.value)}
                />
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="modal-acciones">
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={() => setMostrarModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="auth-boton"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Plus size={16} /> Guardar en mi colección
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
