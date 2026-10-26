import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  X,
  Check,
  Loader2,
  RotateCcw,
  Sparkles,
  Image as ImageIcon,
  Key,
  Layers,
  Plus,
  Minus,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  escanearCartaConGemini,
  escanearConBaseCcFallback,
  buscarYEmparejarCarta,
  getGeminiApiKey,
  setGeminiApiKey,
} from "../lib/geminiOnePieceScanner.js";

const CONDICIONES = [
  "Near Mint (NM)",
  "Lightly Played (LP)",
  "Moderately Played (MP)",
  "Heavily Played (HP)",
  "Damaged (DMG)",
];

export default function CardScanner({ onAgregarColeccion, onClose }) {
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  // Estados de cámara y escaneo
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [estadoTexto, setEstadoTexto] = useState("Alinea la carta dentro del marco");
  const [errorMensaje, setErrorMensaje] = useState(null);

  // API Key config
  const [apiKey, setApiKey] = useState(() => getGeminiApiKey());
  const [mostrarConfigKey, setMostrarConfigKey] = useState(false);
  const [inputKeyTemp, setInputKeyTemp] = useState("");

  // Resultado
  const [resultadoMatch, setResultadoMatch] = useState(null);
  const [cartaActiva, setCartaActiva] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [condicion, setCondicion] = useState("Near Mint (NM)");
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  // Iniciar cámara
  useEffect(() => {
    iniciarCamara();
    return () => {
      detenerCamara();
    };
  }, []);

  async function iniciarCamara() {
    setCameraError(null);
    setErrorMensaje(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(() => {});
          setCameraReady(true);
        };
      }
    } catch (err) {
      console.error("Error al acceder a la cámara:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Habilítalo en tu navegador para escanear en vivo."
          : "No se detectó cámara disponible. Puedes subir una foto de la carta."
      );
    }
  }

  function detenerCamara() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }

  // Guardar nueva API Key
  function guardarApiKey(e) {
    if (e) e.preventDefault();
    const limpia = inputKeyTemp.trim();
    setGeminiApiKey(limpia);
    setApiKey(limpia);
    setMostrarConfigKey(false);
    setInputKeyTemp("");
  }

  // Procesar imagen con Gemini / Fallback y buscar en OPTCG API
  async function procesarImagen(base64Data) {
    setProcesando(true);
    setErrorMensaje(null);
    setResultadoMatch(null);
    setCartaActiva(null);
    setGuardadoExitoso(false);
    setCantidad(1);

    try {
      setEstadoTexto("Analizando carta con IA (Gemini 2.5 Flash)...");

      let resultadoIa = null;
      const keyActual = apiKey || getGeminiApiKey();

      if (keyActual) {
        try {
          resultadoIa = await escanearCartaConGemini(base64Data, keyActual);
        } catch (geminiErr) {
          console.warn("Fallo con Gemini API Key, intentando respaldo:", geminiErr);
          if (geminiErr.message?.includes("API key not valid")) {
            throw new Error("La API Key de Gemini ingresada no es válida. Revisa tu clave en ai.google.dev");
          }
          // Intento con respaldo BaseCC
          resultadoIa = await escanearConBaseCcFallback(base64Data).catch(() => null);
          if (!resultadoIa) throw geminiErr;
        }
      } else {
        // Sin clave propia: usar endpoint de respaldo BaseCC
        setEstadoTexto("Consultando servidor de IA de BaseCC...");
        resultadoIa = await escanearConBaseCcFallback(base64Data);
      }

      if (!resultadoIa) {
        throw new Error("No se pudo identificar la carta. Asegúrate de enfocarla bien.");
      }

      if (resultadoIa.es_one_piece === false) {
        throw new Error("La imagen analizada no parece ser una carta de One Piece TCG.");
      }

      setEstadoTexto("Buscando arte oficial en OPTCG API...");
      const match = await buscarYEmparejarCarta(resultadoIa);

      if (!match.cartaSeleccionada && match.variantes.length === 0) {
        throw new Error(
          `Se identificó "${resultadoIa.nombre || resultadoIa.codigo}", pero no se encontró en la base oficial. Puedes buscarla manualmente.`
        );
      }

      setResultadoMatch(match);
      setCartaActiva(match.cartaSeleccionada || match.variantes[0]);
      setEstadoTexto("¡Carta identificada con éxito!");
    } catch (err) {
      console.error("Error durante el escaneo:", err);
      setErrorMensaje(err.message || "Error al procesar la carta. Intenta de nuevo.");
      setEstadoTexto("Listo para intentar de nuevo");
    } finally {
      setProcesando(false);
    }
  }

  // Obtener recorte del marco de la carta
  function capturarFrame() {
    if (!videoRef.current || !frameRef.current) return null;
    const video = videoRef.current;
    const frame = frameRef.current;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;

    const vRect = video.getBoundingClientRect();
    const fRect = frame.getBoundingClientRect();

    // Calcular escala según object-fit: cover
    const vRatio = vw / vh;
    const cRatio = vRect.width / vRect.height;
    let renderedW, renderedH, offX = 0, offY = 0;

    if (cRatio > vRatio) {
      renderedW = vRect.width;
      renderedH = vRect.width / vRatio;
      offY = (renderedH - vRect.height) / 2;
    } else {
      renderedH = vRect.height;
      renderedW = vRect.height * vRatio;
      offX = (renderedW - vRect.width) / 2;
    }

    const scale = vw / renderedW;
    const x = Math.max(0, (fRect.left - vRect.left + offX) * scale);
    const y = Math.max(0, (fRect.top - vRect.top + offY) * scale);
    const w = Math.min(vw - x, fRect.width * scale);
    const h = Math.min(vh - y, fRect.height * scale);

    const canvas = document.createElement("canvas");
    // Tamaño de resolución balanceado (~800px de ancho) para máxima nitidez y bajo tiempo de subida
    const targetW = Math.min(900, Math.max(640, w));
    const finalScale = targetW / w;
    canvas.width = targetW;
    canvas.height = h * finalScale;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, x, y, w, h, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  }

  // Botón manual "Capturar y Escanear"
  function handleCapturarManual() {
    if (procesando) return;
    const base64 = capturarFrame();
    if (!base64) {
      setErrorMensaje("La cámara aún no tiene imagen lista. Espera un momento.");
      return;
    }
    procesarImagen(base64);
  }

  // Subir foto desde archivo / carrete
  function handleSubirFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result;
      if (base64) {
        procesarImagen(base64);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // Confirmar y agregar a la colección
  async function handleConfirmarAgregar() {
    if (!cartaActiva || !onAgregarColeccion) return;

    const nueva = {
      nombre: cartaActiva.nombre || "Carta One Piece",
      expansion: cartaActiva.set || "One Piece TCG",
      codigo: cartaActiva.numero || cartaActiva.id || "",
      rareza: cartaActiva.rarity || resultadoMatch?.resultadoIa?.rareza || "Standard",
      imagen: cartaActiva.imagen || "",
      condicion: condicion,
      cantidad: Math.max(1, parseInt(cantidad) || 1),
      juego: "onepiece",
    };

    try {
      await onAgregarColeccion(nueva);
      setGuardadoExitoso(true);
      setTimeout(() => {
        setGuardadoExitoso(false);
      }, 2500);
    } catch (err) {
      console.error("Error al guardar carta:", err);
      setErrorMensaje("Error al guardar en tu colección de Supabase.");
    }
  }

  // Resetear para escanear otra
  function escanearOtra() {
    setResultadoMatch(null);
    setCartaActiva(null);
    setErrorMensaje(null);
    setGuardadoExitoso(false);
    setEstadoTexto("Alinea la carta dentro del marco");
  }

  return (
    <div className="op-scanner-modal-backdrop" onClick={onClose}>
      <div className="op-scanner-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* CABECERA */}
        <div className="op-scanner-header">
          <div className="op-scanner-header-title">
            <div className="op-scanner-icon-bubble">
              <Sparkles size={18} />
            </div>
            <div>
              <h3>Escáner One Piece TCG con IA</h3>
              <p>Extracción visual de código Bandai, nombre limpio y arte alterno</p>
            </div>
          </div>

          <div className="op-scanner-header-actions">
            <button
              type="button"
              className={`op-btn-key ${apiKey ? "configurada" : "pendiente"}`}
              onClick={() => setMostrarConfigKey(!mostrarConfigKey)}
              title="Configurar Gemini API Key"
            >
              <Key size={14} />
              <span>{apiKey ? "Gemini Key Activa" : "Configurar Key"}</span>
            </button>

            <button
              type="button"
              className="op-scanner-btn-close"
              onClick={onClose}
              title="Cerrar escáner"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MODAL / BANNER DE CONFIGURACIÓN DE GEMINI KEY */}
        {mostrarConfigKey && (
          <div className="op-scanner-key-panel">
            <div className="op-key-panel-info">
              <Key size={16} style={{ color: "#a855f7" }} />
              <div>
                <strong>Google Gemini API Key (Gemini 2.5 Flash)</strong>
                <p>
                  Obtén tu API key gratuita en{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google AI Studio <ExternalLink size={11} style={{ display: "inline" }} />
                  </a>
                  . Se guardará localmente en tu navegador.
                </p>
              </div>
            </div>
            <form onSubmit={guardarApiKey} className="op-key-form">
              <input
                type="password"
                placeholder={apiKey ? "••••••••••••••••••••••••" : "Pega tu clave AIzaSy..."}
                value={inputKeyTemp}
                onChange={(e) => setInputKeyTemp(e.target.value)}
                autoFocus
              />
              <button type="submit" className="op-btn-guardar-key">
                Guardar
              </button>
              {apiKey && (
                <button
                  type="button"
                  className="op-btn-borrar-key"
                  onClick={() => {
                    setGeminiApiKey("");
                    setApiKey("");
                    setMostrarConfigKey(false);
                  }}
                >
                  Quitar
                </button>
              )}
            </form>
          </div>
        )}

        {/* CONTENIDO PRINCIPAL: VISOR O RESULTADO */}
        {!resultadoMatch ? (
          <div className="op-scanner-body">
            {/* ÁREA DE CÁMARA */}
            <div className="op-camera-viewport">
              {cameraError ? (
                <div className="op-camera-error">
                  <AlertCircle size={40} style={{ opacity: 0.7, color: "#f87171" }} />
                  <p>{cameraError}</p>
                  <div className="op-error-btns">
                    <button
                      type="button"
                      className="op-btn-secundario"
                      onClick={iniciarCamara}
                    >
                      <RotateCcw size={14} /> Reintentar cámara
                    </button>
                    <button
                      type="button"
                      className="op-btn-primario"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon size={14} /> Subir foto de la carta
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="op-video-element"
                    autoPlay
                    playsInline
                    muted
                  />

                  {/* MÁSCARA OSCURA */}
                  <div className="op-camera-overlay" />

                  {/* MARCO DE CARTA TCG (63x88 mm) */}
                  <div ref={frameRef} className="op-card-target-frame">
                    <div className="op-corner tl" />
                    <div className="op-corner tr" />
                    <div className="op-corner bl" />
                    <div className="op-corner br" />

                    {/* Guía superior de nombre */}
                    <div className="op-guide-zone top-zone">
                      <span>NOMBRE DEL PERSONAJE</span>
                    </div>

                    {/* Guía inferior derecha de código Bandai */}
                    <div className="op-guide-zone bottom-code-zone">
                      <span>CÓDIGO (OP##-###)</span>
                    </div>

                    {/* Línea láser holográfica animada al procesar */}
                    {procesando && <div className="op-laser-scanner" />}
                  </div>

                  {!cameraReady && !cameraError && (
                    <div className="op-camera-loading">
                      <Loader2 size={32} className="spinner-icon" />
                      <span>Iniciando sensor de cámara...</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* MENSAJE DE ESTADO O ERROR */}
            {errorMensaje ? (
              <div className="op-scanner-alert error">
                <AlertCircle size={15} />
                <span>{errorMensaje}</span>
              </div>
            ) : (
              <div className="op-scanner-status-bar">
                {procesando ? (
                  <span className="op-status-chip procesando">
                    <Loader2 size={13} className="spinner-icon" /> {estadoTexto}
                  </span>
                ) : (
                  <span className="op-status-chip listo">
                    <span className="op-pulse-dot" /> {estadoTexto}
                  </span>
                )}
              </div>
            )}

            {/* CONTROLES / OBTURADOR */}
            <div className="op-scanner-controls">
              {/* Botón principal Capturar y Escanear */}
              <button
                type="button"
                className="op-btn-shutter"
                onClick={handleCapturarManual}
                disabled={procesando || (!cameraReady && !cameraError)}
                title="Capturar y escanear carta con IA"
              >
                {procesando ? (
                  <>
                    <Loader2 size={20} className="spinner-icon" />
                    <span>Analizando...</span>
                  </>
                ) : (
                  <>
                    <Camera size={20} />
                    <span>Capturar y Escanear</span>
                  </>
                )}
              </button>

              {/* Botón secundario Subir Foto */}
              <button
                type="button"
                className="op-btn-subir"
                onClick={() => fileInputRef.current?.click()}
                disabled={procesando}
                title="Subir foto desde la galería o archivos"
              >
                <ImageIcon size={17} />
                <span>Subir foto</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleSubirFoto}
            />
          </div>
        ) : (
          /* RESULTADO IDENTIFICADO CON ÉXITO */
          <div className="op-resultado-container">
            <div className="op-resultado-grid">
              {/* VISTA PREVIA DE LA CARTA OFICIAL */}
              <div className="op-resultado-img-col">
                {cartaActiva?.imagen ? (
                  <img
                    src={cartaActiva.imagen}
                    alt={cartaActiva.nombre}
                    className="op-resultado-card-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      if (cartaActiva.numero) {
                        e.target.src = `https://www.optcgapi.com/media/static/Card_Images/${cartaActiva.numero}.jpg`;
                      }
                    }}
                  />
                ) : (
                  <div className="op-resultado-placeholder">
                    <Layers size={48} style={{ opacity: 0.3 }} />
                    <span>{cartaActiva?.numero || "Sin imagen"}</span>
                  </div>
                )}

                {/* SELECTOR DE VARIANTES SI EXISTEN MÚLTIPLES PRINTS */}
                {resultadoMatch.variantes.length > 1 && (
                  <div className="op-variantes-selector">
                    <span className="op-variantes-label">
                      Versiones disponibles ({resultadoMatch.variantes.length}):
                    </span>
                    <div className="op-variantes-thumbs">
                      {resultadoMatch.variantes.map((v, idx) => {
                        const esSel =
                          (v.id && v.id === cartaActiva?.id) ||
                          (v.imagen && v.imagen === cartaActiva?.imagen);
                        const esAA =
                          (v.id || "").includes("_P") ||
                          (v.nombre || "").toUpperCase().includes("PARALLEL") ||
                          (v.nombre || "").toUpperCase().includes("ALTERNATE");

                        return (
                          <button
                            key={v.id || idx}
                            type="button"
                            className={`op-variante-thumb-btn ${esSel ? "activo" : ""}`}
                            onClick={() => setCartaActiva(v)}
                            title={v.nombre}
                          >
                            <img
                              src={v.imagen || `https://www.optcgapi.com/media/static/Card_Images/${v.numero}.jpg`}
                              alt={v.nombre}
                            />
                            <span className="op-variante-tag">
                              {esAA ? "AA" : "Base"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* DETALLES EXTRAÍDOS POR LA IA */}
              <div className="op-resultado-info-col">
                {/* BADGES TÉCNICOS */}
                <div className="op-badges-row">
                  {resultadoMatch.resultadoIa.codigo && (
                    <span className="op-badge code">
                      {resultadoMatch.resultadoIa.codigo}
                    </span>
                  )}
                  {resultadoMatch.resultadoIa.rareza && (
                    <span className="op-badge rarity">
                      {resultadoMatch.resultadoIa.rareza}
                    </span>
                  )}
                  {resultadoMatch.resultadoIa.variante && (
                    <span className="op-badge variant">
                      {resultadoMatch.resultadoIa.variante === "parallel"
                        ? "Alternate Art (AA)"
                        : resultadoMatch.resultadoIa.variante === "manga"
                        ? "Manga Super Parallel"
                        : resultadoMatch.resultadoIa.variante === "sp"
                        ? "Special Card (SP)"
                        : resultadoMatch.resultadoIa.variante === "stamped_promo"
                        ? "Stamped / Promo"
                        : "Versión Regular"}
                    </span>
                  )}
                  <span className="op-badge confidence">
                    Confianza: {resultadoMatch.resultadoIa.confianza}
                  </span>
                </div>

                <h2 className="op-resultado-nombre">
                  {cartaActiva?.nombre || resultadoMatch.resultadoIa.nombre}
                </h2>

                <p className="op-resultado-set">
                  📦 {cartaActiva?.set || "One Piece Card Game"}
                </p>

                {/* CONTROLES DE ADICIÓN */}
                <div className="op-form-adicion">
                  <div className="op-campo">
                    <label>Condición física:</label>
                    <select
                      value={condicion}
                      onChange={(e) => setCondicion(e.target.value)}
                    >
                      {CONDICIONES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="op-campo">
                    <label>Cantidad de copias:</label>
                    <div className="op-cant-row">
                      <button
                        type="button"
                        className="op-btn-cant"
                        onClick={() => setCantidad((prev) => Math.max(1, prev - 1))}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="op-cant-numero">{cantidad}</span>
                      <button
                        type="button"
                        className="op-btn-cant"
                        onClick={() => setCantidad((prev) => prev + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {guardadoExitoso && (
                  <div className="op-alerta-exito">
                    <Check size={16} /> ¡Carta agregada con éxito a tu colección!
                  </div>
                )}

                {/* BOTONES DE ACCIÓN */}
                <div className="op-resultado-acciones">
                  <button
                    type="button"
                    className="op-btn-confirmar-add"
                    onClick={handleConfirmarAgregar}
                  >
                    <Check size={18} /> Agregar a mi Colección
                  </button>

                  <button
                    type="button"
                    className="op-btn-otra"
                    onClick={escanearOtra}
                  >
                    <RotateCcw size={16} /> Escanear otra carta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
