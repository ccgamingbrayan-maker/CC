import { useState } from "react";
import { buscarCartaScryfall, buscarPrintsDesdeUri } from "../lib/scryfall.js";
import { buscarCartaRiftbound, buscarPrintsRiftbound } from "../lib/riftbound.js";
import {
  buscarCartaOnePiece,
  buscarPrintsOnePiece,
  buscarDecksFiltered,
  buscarDonFiltered,
  buscarPromosFiltered,
} from "../lib/onepiece.js";
import { supabase } from "../lib/supabase.js";
import { juegos } from "../data/juegos.js";

export default function AgregarCarta() {
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
  const [guardando, setGuardando] = useState(false);
  const [modoAgregarAccesorio, setModoAgregarAccesorio] = useState(false);
  const [tituloAccesorio, setTituloAccesorio] = useState("");
  const [imagenUrlAccesorio, setImagenUrlAccesorio] = useState("");
  const [archivoAccesorio, setArchivoAccesorio] = useState(null);
  const [precioAccesorio, setPrecioAccesorio] = useState("");
  const [stockAccesorio, setStockAccesorio] = useState("");
  const [colorAccesorio, setColorAccesorio] = useState("");
  const [detallesAccesorio, setDetallesAccesorio] = useState("");
  const [mensajeAccesorio, setMensajeAccesorio] = useState("");
  const [guardandoAccesorio, setGuardandoAccesorio] = useState(false);

  async function buscar() {
    if (!nombre) return;
    setBuscando(true);
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
  }

  async function guardar() {
    if (!datosApi || !precio || !stock) {
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

    const juegoToSave = userSelectedJuego
      ? Number(juegoId)
      : (mapFuenteToJuego(fuente) ?? Number(juegoId));

    const { error } = await supabase.from("cartas").insert({
      juego_id: Number(juegoToSave),
      nombre: datosApi.nombre,
      imagen: datosApi.imagen,
      precio: Number(precio),
      stock: Number(stock),
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
    }
  }

  async function guardarAccesorio() {
    if (!tituloAccesorio || (!imagenUrlAccesorio && !archivoAccesorio) || !precioAccesorio || !stockAccesorio || !colorAccesorio) {
      setMensajeAccesorio("Completa todos los campos requeridos: título, imagen, precio, stock y color.");
      return;
    }

    setGuardandoAccesorio(true);
    setMensajeAccesorio("");

    try {
      let imagenFinal = imagenUrlAccesorio;

      if (archivoAccesorio) {
        const nombreArchivo = `${Date.now()}_${archivoAccesorio.name}`;
        const path = `accesorios/${nombreArchivo}`;
        const { error: uploadError } = await supabase.storage.from("accesorios").upload(path, archivoAccesorio);
        if (uploadError) throw uploadError;

        const { data: urlData, error: urlError } = supabase.storage.from("accesorios").getPublicUrl(path);
        if (urlError) throw urlError;
        imagenFinal = urlData.publicUrl;
      }

      const { error } = await supabase.from("accesorios").insert({
        titulo: tituloAccesorio,
        imagen: imagenFinal,
        precio: Number(precioAccesorio),
        stock: Number(stockAccesorio),
        color: colorAccesorio,
        detalles: detallesAccesorio,
      });

      if (error) {
        throw error;
      }

      setMensajeAccesorio(`Accesorio "${tituloAccesorio}" agregado con éxito.`);
      setTituloAccesorio("");
      setImagenUrlAccesorio("");
      setArchivoAccesorio(null);
      setPrecioAccesorio("");
      setStockAccesorio("");
      setColorAccesorio("");
      setDetallesAccesorio("");
      setModoAgregarAccesorio(false);
    } catch (error) {
      console.error(error);
      const bucketMessage = error?.message?.includes("Bucket not found")
        ? "No se encontró el bucket de almacenamiento. Revisa la configuración del bucket en Supabase o usa el nombre de bucket correcto."
        : "Error al guardar el accesorio: " + error.message;
      setMensajeAccesorio(bucketMessage);
    } finally {
      setGuardandoAccesorio(false);
    }
  }

  return (
    <section className="juegos">
      <div className="contenedor agregar-carta">
        <h2>Agregar carta (admin)</h2>
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
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={buscar} disabled={buscando}>
                  {buscando ? "Buscando…" : "Buscar en Scryfall"}
                </button>
                <button
                  onClick={async () => {
                    if (!nombre) return;
                    setBuscando(true);
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
                    }
                  }}
                >
                  Buscar en Riftbound
                </button>
                <button
                  onClick={async () => {
                    if (!nombre) return;
                    setBuscando(true);
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
                    }
                  }}
                >
                  Buscar en One Piece
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
                      }}
                    >
                      {juegos.map((j) => (
                        <option key={j.id} value={j.id}>{j.nombre}</option>
                      ))}
                    </select>
                  </label>

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

                  <button onClick={guardar} disabled={guardando}>
                    {guardando ? "Guardando…" : "Guardar en mi tienda"}
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <button onClick={() => setModoAgregarAccesorio((activo) => !activo)}>
                {modoAgregarAccesorio ? "Cancelar agregar accesorio" : "Agregar accesorio"}
              </button>

              {modoAgregarAccesorio && (
                <div className="agregar-accesorio" style={{ marginTop: 16 }}>
                  <div className="accesorio-row">
                    <label>
                      Título
                      <input
                        value={tituloAccesorio}
                        onChange={(e) => setTituloAccesorio(e.target.value)}
                      />
                    </label>

                    <label>
                      Precio
                      <input
                        type="number"
                        value={precioAccesorio}
                        onChange={(e) => setPrecioAccesorio(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="accesorio-row">
                    <label>
                      Imagen (URL)
                      <input
                        value={imagenUrlAccesorio}
                        onChange={(e) => setImagenUrlAccesorio(e.target.value)}
                      />
                    </label>

                    <label>
                      Stock
                      <input
                        type="number"
                        value={stockAccesorio}
                        onChange={(e) => setStockAccesorio(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="accesorio-row">
                    <label>
                      Color
                      <input
                        value={colorAccesorio}
                        onChange={(e) => setColorAccesorio(e.target.value)}
                      />
                    </label>

                    <label>
                      O subir archivo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setArchivoAccesorio(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>

                  <label>
                    Detalles
                    <textarea
                      value={detallesAccesorio}
                      onChange={(e) => setDetallesAccesorio(e.target.value)}
                    />
                  </label>

                  <div className="accesorio-actions">
                    <button onClick={guardarAccesorio} disabled={guardandoAccesorio}>
                      {guardandoAccesorio ? "Guardando…" : "Guardar accesorio"}
                    </button>
                    <button type="button" onClick={() => setModoAgregarAccesorio(false)}>
                      Cancelar
                    </button>
                  </div>

                  {mensajeAccesorio && (
                    <p className="agregar-mensaje">{mensajeAccesorio}</p>
                  )}
                </div>
              )}
            </div>

            {mensaje && <p className="agregar-mensaje">{mensaje}</p>}
          </div>

          {prints && prints.length > 0 && (
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
                        const mapped = p.source.startsWith("onepiece") ? 1 : p.source === "riftbound" ? 2 : p.source === "scryfall" ? 4 : juegoId;
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
      </div>
    </section>
  );
}


