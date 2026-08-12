import { useState, useEffect } from "react";
import { buscarCartaScryfall, buscarPrintsDesdeUri } from "../lib/scryfall.js";
import { buscarCartaRiftbound, buscarPrintsRiftbound } from "../lib/riftbound.js";
import {
  buscarCartaOnePiece,
  buscarPrintsOnePiece,
  buscarDecksFiltered,
  buscarDonFiltered,
  buscarPromosFiltered,
} from "../lib/onepiece.js";
import { buscarPrintsPokemon } from "../lib/pokemon.js";
import { supabase } from "../lib/supabase.js";
import {
  listarJuegos,
  listarExpansiones,
  crearJuego,
  asegurarExpansion,
} from "../lib/catalogos.js";
import CarouselStore from "../components/CarouselStore.jsx";
import Cargando from "../components/Cargando.jsx";
import AgregarAccesorio from "./AgregarAccesorio.jsx";

// Etiqueta de un botón de fuente: muestra spinner + "Buscando…" cuando esa
// fuente es la que está cargando; si no, muestra su texto normal.
function LabelFuente({ activo, children }) {
  if (activo) {
    return (
      <>
        <span className="spinner-btn" aria-hidden="true" /> Buscando…
      </>
    );
  }
  return children;
}

export default function AgregarCarta() {
  const [pestana, setPestana] = useState("cartas");
  const [nombre, setNombre] = useState("");
  const [datosApi, setDatosApi] = useState(null);
  const [prints, setPrints] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [fuente, setFuente] = useState(null);
  const [precioReferencia, setPrecioReferencia] = useState(null);
  const [juegoId, setJuegoId] = useState(4);
  const [userSelectedJuego, setUserSelectedJuego] = useState(false);
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [fuenteBuscando, setFuenteBuscando] = useState(null); // qué API está cargando
  const [guardando, setGuardando] = useState(false);
  const isCarrusel = Number(juegoId) === 6;

  // Catálogos dinámicos (juegos y expansiones desde Supabase)
  const [juegosLista, setJuegosLista] = useState([]);
  const [expansiones, setExpansiones] = useState([]);
  const [expansionSel, setExpansionSel] = useState("");
  const [expansionNueva, setExpansionNueva] = useState("");
  const [expansionTouched, setExpansionTouched] = useState(false);
  const [condicion, setCondicion] = useState("Near Mint");
  const [nuevoJuegoNombre, setNuevoJuegoNombre] = useState("");
  const [nuevoJuegoImagen, setNuevoJuegoImagen] = useState("");

  useEffect(() => {
    listarJuegos().then(setJuegosLista);
  }, []);

  // Expansiones del juego elegido
  useEffect(() => {
    if (isCarrusel || String(juegoId) === "__nuevo") {
      setExpansiones([]);
      return;
    }
    listarExpansiones(juegoId).then(setExpansiones);
  }, [juegoId, isCarrusel]);

  // Si la API trae la expansión (set), preseleccionarla automáticamente:
  // la que coincida se elige; si no existe, queda lista para crearse.
  useEffect(() => {
    if (!datosApi?.set || expansionTouched) return;
    const setApi = String(datosApi.set).trim();
    if (!setApi) return;
    const match = expansiones.find(
      (e) => e.nombre.toLowerCase() === setApi.toLowerCase()
    );
    if (match) {
      setExpansionSel(match.nombre);
      setExpansionNueva("");
    } else {
      setExpansionSel("__nueva");
      setExpansionNueva(setApi);
    }
  }, [datosApi, expansiones, expansionTouched]);

  async function buscar() {
    if (!nombre) return;
    setBuscando(true);
    setFuenteBuscando("scryfall");
    setMensaje("");
    const carta = await buscarCartaScryfall(nombre);
    if (!carta) {
      setDatosApi(null);
      setMensaje("No se encontró esa carta en Scryfall.");
    } else {
      setDatosApi(carta);
      setFuente("scryfall");
      setSeleccionada(null);
      setUserSelectedJuego(false);
      setJuegoId(4);
      // Obtener todas las prints para permitir selección manual
      if (carta.printsSearchUri) {
        const versiones = await buscarPrintsDesdeUri(carta.printsSearchUri);
        setPrints((versiones || []).map((v) => ({ ...v, source: "scryfall" })));
      } else {
        setPrints([]);
      }
    }
    setBuscando(false);
    setFuenteBuscando(null);
  }

  async function guardar() {
    if (!datosApi) {
      setMensaje("Selecciona una carta antes de guardar.");
      return;
    }

    if (!isCarrusel && (!precio || !stock)) {
      setMensaje("Completa precio y stock antes de guardar.");
      return;
    }
    setGuardando(true);
    function mapFuenteToJuego(f) {
      if (!f) return null;
      const ff = String(f).toLowerCase();
      if (ff.startsWith("onepiece")) return 1;
      if (ff === "riftbound") return 2;
      if (ff === "pokemon") return 3;
      if (ff === "scryfall" || ff === "magic" || ff === "mtg") return 4;
      if (ff === "preventas" || ff === "preventa") return 5;
      return null;
    }

    let juegoToSave;
    if (String(juegoId) === "__nuevo") {
      if (!nuevoJuegoNombre.trim()) {
        setMensaje("Escribe el nombre del nuevo juego.");
        setGuardando(false);
        return;
      }
      try {
        const creado = await crearJuego(
          nuevoJuegoNombre,
          nuevoJuegoImagen.trim() || null
        );
        juegoToSave = creado.id;
        setJuegosLista((prev) => [...prev, creado].sort((a, b) => a.id - b.id));
      } catch (e) {
        setMensaje("Error al crear el juego: " + e.message);
        setGuardando(false);
        return;
      }
    } else {
      juegoToSave = userSelectedJuego
        ? (isCarrusel ? 6 : Number(juegoId))
        : (mapFuenteToJuego(fuente) ?? Number(juegoId));
    }

    // Expansión: la elegida de la lista o una nueva creada aquí mismo.
    let expansionFinal = null;
    if (!isCarrusel) {
      const nombreExp = expansionSel === "__nueva" ? expansionNueva : expansionSel;
      if (nombreExp?.trim()) {
        expansionFinal = await asegurarExpansion(juegoToSave, nombreExp);
      }
    }

    const { error } = await supabase.from("cartas").insert({
      juego_id: Number(juegoToSave),
      nombre: datosApi.nombre,
      imagen: datosApi.imagen,
      precio: isCarrusel ? null : precio ? Number(precio) : null,
      stock: isCarrusel ? null : stock ? Number(stock) : null,
      expansion: isCarrusel ? null : expansionFinal,
      condicion: isCarrusel ? null : condicion,
    });
    setGuardando(false);

    if (error) {
      setMensaje("Error al guardar: " + error.message);
    } else {
      setMensaje(`¡"${datosApi.nombre}" guardada en tu tienda!`);

      setNombre("");
      setDatosApi(null);
      setPrecio("");
      setStock("");
      setFuente(null);
      setUserSelectedJuego(false);
      setJuegoId(4);
      setExpansionSel("");
      setExpansionNueva("");
      setExpansionTouched(false);
      setCondicion("Near Mint");
      setNuevoJuegoNombre("");
      setNuevoJuegoImagen("");
      if (expansionFinal) listarExpansiones(juegoToSave).then(setExpansiones);
    }
    }

  return (
    <section className="juegos">
      <div className="contenedor agregar-carta">
        <h2>Agregar a la tienda (admin)</h2>

        <div className="admin-tabs">
          <button
            className={`admin-tab ${pestana === "cartas" ? "active" : ""}`}
            onClick={() => setPestana("cartas")}
          >
            Cartas
          </button>
          <button
            className={`admin-tab ${pestana === "accesorios" ? "active" : ""}`}
            onClick={() => setPestana("accesorios")}
          >
            Accesorios
          </button>
        </div>

        {pestana === "accesorios" ? (
          <AgregarAccesorio />
        ) : (
        <>
        <p style={{ color: "var(--texto-suave)" }}>
          Busca por nombre en Scryfall, pon tu precio y stock, y se guarda en Supabase.
        </p>

        <div className="agregar-carta-grid">
          <div className="agregar-panel">
            <div className="agregar-buscador">
              <input
                placeholder="Nombre de la carta (ej: Sol Ring)"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscar()}
              />
              <div className="buscador-fuentes">
                <button className="btn-fuente" onClick={buscar} disabled={buscando}>
                  <LabelFuente activo={fuenteBuscando === "scryfall"}>Buscar en Scryfall</LabelFuente>
                </button>
                <button
                  className="btn-fuente"
                  disabled={buscando}
                  onClick={async () => {
                    if (!nombre) return;
                    setBuscando(true);
                    setFuenteBuscando("riftbound");
                    setMensaje("");
                    try {
                      const carta = await buscarCartaRiftbound(nombre);
                      if (!carta) {
                        setDatosApi(null);
                        setPrints([]);
                        setMensaje("No se encontró esa carta en Riftbound.");
                      } else {
                        setDatosApi(carta);
                        setFuente("riftbound");
                        setSeleccionada(null);
                        setUserSelectedJuego(false);
                        setJuegoId(2);
                        const versiones = await buscarPrintsRiftbound(nombre);
                        setPrints((versiones || []).map((v) => ({ ...v, source: "riftbound" })));
                        setPrecioReferencia(null);
                      }
                    } catch (error) {
                      setDatosApi(null);
                      setPrints([]);
                      setMensaje("Error al buscar en Riftbound. Intenta otra búsqueda.");
                      console.error(error);
                    } finally {
                      setBuscando(false);
                      setFuenteBuscando(null);
                    }
                  }}
                >
                  <LabelFuente activo={fuenteBuscando === "riftbound"}>Buscar en Riftbound</LabelFuente>
                </button>
                <button
                  className="btn-fuente"
                  disabled={buscando}
                  onClick={async () => {
                    if (!nombre) return;
                    setBuscando(true);
                    setFuenteBuscando("onepiece");
                    setMensaje("");
                    try {
                      // buscar en varios endpoints de One Piece y combinar resultados
                      const [printsMain, decks, dons, promos] = await Promise.all([
                        buscarPrintsOnePiece(nombre),
                        buscarDecksFiltered(nombre),
                        buscarDonFiltered(nombre),
                        buscarPromosFiltered(nombre),
                      ]);

                      const printsMainTagged = (printsMain || []).map((p) => ({ ...p, source: "onepiece" }));
                      const decksTagged = (decks || []).map((p) => ({ ...p, source: "onepiece-deck" }));
                      const donsTagged = (dons || []).map((p) => ({ ...p, source: "onepiece-don" }));
                      const promosTagged = (promos || []).map((p) => ({ ...p, source: "onepiece-promo" }));

                      const merged = [
                        ...printsMainTagged,
                        ...decksTagged,
                        ...donsTagged,
                        ...promosTagged,
                      ];

                      if (!merged || merged.length === 0) {
                        setDatosApi(null);
                        setPrints([]);
                        setMensaje("No se encontraron resultados en One Piece para esa búsqueda.");
                      } else {
                        // opcional: deduplicar por id/imágen
                        const seen = new Set();
                        const dedup = [];
                        for (const p of merged) {
                          const key = p.id ?? p.nombre ?? p.imagen ?? JSON.stringify(p);
                          if (!seen.has(key)) {
                            seen.add(key);
                            dedup.push(p);
                          }
                        }
                        setPrints(dedup);
                        setSeleccionada(null);
                        setFuente("onepiece");
                        setUserSelectedJuego(false);
                        setJuegoId(1);
                        const primera = dedup[0];
                        setDatosApi({
                          nombre: primera.nombre,
                          imagen: primera.imagen,
                          set: primera.set,
                          precios: primera.precios,
                        });
                        setPrecioReferencia(primera.precios?.usd ?? null);
                      }
                    } catch (error) {
                      setDatosApi(null);
                      setPrints([]);
                      setMensaje("Error al buscar en One Piece. Intenta otra búsqueda.");
                      console.error(error);
                    } finally {
                      setBuscando(false);
                      setFuenteBuscando(null);
                    }
                  }}
                >
                  <LabelFuente activo={fuenteBuscando === "onepiece"}>Buscar en One Piece</LabelFuente>
                </button>
                <button
                  className="btn-fuente"
                  disabled={buscando}
                  onClick={async () => {
                    if (!nombre) return;
                    setBuscando(true);
                    setFuenteBuscando("pokemon");
                    setMensaje("");
                    try {
                      const versiones = await buscarPrintsPokemon(nombre);
                      if (!versiones || versiones.length === 0) {
                        setDatosApi(null);
                        setPrints([]);
                        setMensaje("No se encontraron resultados en Pokémon para esa búsqueda.");
                      } else {
                        setPrints(versiones);
                        setSeleccionada(null);
                        setFuente("pokemon");
                        setUserSelectedJuego(false);
                        setJuegoId(3);
                        const primera = versiones[0];
                        setDatosApi({
                          nombre: primera.nombre,
                          imagen: primera.imagen,
                          set: primera.set,
                          precios: primera.precios,
                        });
                        setPrecioReferencia(primera.precios?.usd ?? null);
                      }
                    } catch (error) {
                      setDatosApi(null);
                      setPrints([]);
                      setMensaje("Error al buscar en Pokémon. Intenta otra búsqueda.");
                      console.error(error);
                    } finally {
                      setBuscando(false);
                      setFuenteBuscando(null);
                    }
                  }}
                >
                  <LabelFuente activo={fuenteBuscando === "pokemon"}>Buscar en Pokémon</LabelFuente>
                </button>
              </div>
            </div>

            {datosApi && (
              <div className="agregar-preview">
                <img src={datosApi.imagen} alt={datosApi.nombre} />

                <div className="agregar-form">
                  <h3>{datosApi.nombre}</h3>
                  <p style={{ color: "var(--texto-suave)" }}>{datosApi.set}</p>

                  {precioReferencia && (
                    <p style={{ color: "var(--texto-suave)", marginTop: 6 }}>
                      Precio referencia: <strong>{precioReferencia} USD</strong>
                      <button
                        style={{ marginLeft: 10 }}
                        onClick={() => {
                          const tasa = 3500;
                          const sugerido = Math.round(Number(precioReferencia) * tasa);
                          setPrecio(String(sugerido));
                        }}
                      >
                        Usar referencia (USD → COP)
                      </button>
                    </p>
                  )}

                  <label>
                    Juego
                    <select
                      value={juegoId}
                      onChange={(e) => {
                        setUserSelectedJuego(true);
                        setJuegoId(e.target.value);
                        setExpansionSel("");
                        setExpansionNueva("");
                        setExpansionTouched(false);
                      }}
                    >
                      {juegosLista.map((j) => (
                        <option key={j.id} value={j.id}>{j.nombre}</option>
                      ))}
                      <option value={6}>Carrusel</option>
                      <option value="__nuevo">+ Crear nuevo juego…</option>
                    </select>
                  </label>

                  {String(juegoId) === "__nuevo" && (
                    <>
                      <label>
                        Nombre del nuevo juego
                        <input
                          type="text"
                          placeholder="Ej: Yu-Gi-Oh!"
                          value={nuevoJuegoNombre}
                          onChange={(e) => setNuevoJuegoNombre(e.target.value)}
                        />
                      </label>
                      <label>
                        Imagen del juego (URL, opcional)
                        <input
                          type="text"
                          placeholder="/img/nuevo_juego.png"
                          value={nuevoJuegoImagen}
                          onChange={(e) => setNuevoJuegoImagen(e.target.value)}
                        />
                      </label>
                    </>
                  )}

                  {!isCarrusel && (
                    <>
                      <label>
                        Expansión
                        <select
                          value={expansionSel}
                          onChange={(e) => {
                            setExpansionSel(e.target.value);
                            setExpansionTouched(true);
                          }}
                        >
                          <option value="">Sin expansión</option>
                          {expansiones.map((x) => (
                            <option key={x.id} value={x.nombre}>{x.nombre}</option>
                          ))}
                          <option value="__nueva">+ Crear nueva expansión…</option>
                        </select>
                      </label>

                      {expansionSel === "__nueva" && (
                        <label>
                          Nombre de la nueva expansión
                          <input
                            type="text"
                            placeholder="Ej: Vendetta"
                            value={expansionNueva}
                            onChange={(e) => {
                              setExpansionNueva(e.target.value);
                              setExpansionTouched(true);
                            }}
                          />
                        </label>
                      )}

                      <label>
                        Condición
                        <select
                          value={condicion}
                          onChange={(e) => setCondicion(e.target.value)}
                        >
                          <option>Near Mint</option>
                          <option>Lightly Played</option>
                          <option>Moderately Played</option>
                          <option>Heavily Played</option>
                          <option>Damaged</option>
                        </select>
                      </label>
                    </>
                  )}

                  {isCarrusel && (
                    <div style={{ marginTop: 12 }}>
                      <CarouselStore
                        onPick={(c) => {
                          setDatosApi({ nombre: c.nombre, imagen: c.imagen, set: c.set });
                          setFuente("carrusel");
                          setUserSelectedJuego(true);
                        }}
                      />
                    </div>
                  )}

                  {!isCarrusel && (
                    <>
                      <label>
                        Precio (COP)
                        <input
                          type="number"
                          placeholder="15000"
                          value={precio}
                          onChange={(e) => setPrecio(e.target.value)}
                        />
                      </label>

                      <label>
                        Stock
                        <input
                          type="number"
                          placeholder="10"
                          value={stock}
                          onChange={(e) => setStock(e.target.value)}
                        />
                      </label>
                    </>
                  )}

                  <button onClick={guardar} disabled={guardando}>
                    {guardando ? "Guardando…" : "Guardar en mi tienda"}
                  </button>
                </div>
              </div>
            )}

            {mensaje && <p className="agregar-mensaje">{mensaje}</p>}
          </div>

          {buscando && (
            <div className="agregar-print-list">
              <Cargando texto="Buscando cartas…" />
            </div>
          )}

          {!buscando && prints && prints.length > 0 && (
            <div className="agregar-print-list">
              <h3>Selecciona la versión que quieres agregar</h3>
              <div className="grid">
                {prints.map((p) => (
                  <div
                    key={p.id}
                    className={`game-card ${seleccionada?.id === p.id ? "selected" : ""}`}
                    onClick={() => {
                      const info = {
                        nombre: p.nombre,
                        imagen: p.imagen,
                        set: p.set,
                        numero: p.numero,
                        precios: p.precios,
                      };
                      setDatosApi(info);
                      setSeleccionada(p);
                      if (p.source) {
                        setFuente(p.source);
                        setUserSelectedJuego(false);
                        const mapped = p.source.startsWith("onepiece") ? 1 : p.source === "riftbound" ? 2 : p.source === "pokemon" ? 3 : p.source === "scryfall" ? 4 : juegoId;
                        if (mapped) setJuegoId(mapped);
                      }
                      const usdRef = p.precios?.usd ?? null;
                      setPrecioReferencia(usdRef);
                      if (usdRef && (!precio || precio === "")) {
                        const tasa = 3500;
                        const sugerido = Math.round(Number(usdRef) * tasa);
                        setPrecio(String(sugerido));
                      }
                    }}
                  >
                    {p.imagen && <img src={p.imagen} alt={p.nombre} />}
                    <h3>{p.nombre}</h3>
                    <p>{p.set} #{p.numero}</p>
                    <p style={{ fontSize: 14 }}>{p.precios?.usd ? `$${p.precios.usd}` : "-"}</p>
                  </div>
                ))}
              </div>
              <p style={{ color: "var(--texto-suave)" }}>Haz clic en la carta que quieres agregar.</p>
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </section>
  );
}




