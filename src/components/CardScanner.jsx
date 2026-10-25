import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, X, Check, Loader2, RotateCcw, ScanLine, Zap } from "lucide-react";
import Tesseract from "tesseract.js";

/**
 * CardScanner – Componente de escaneo de cartas TCG con cámara en vivo.
 *
 * Props:
 *   onCardDetected(cardData)  – callback cuando el usuario acepta la carta detectada
 *   onClose()                 – cerrar el escáner
 */
export default function CardScanner({ onCardDetected, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimeoutRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [resultadoDetectado, setResultadoDetectado] = useState(null); // { nombre, expansion }
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupTimer, setPopupTimer] = useState(null);

  // Iniciar cámara al montar
  useEffect(() => {
    iniciarCamara();

    return () => {
      detenerCamara();
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      if (popupTimer) clearTimeout(popupTimer);
    };
  }, []);

  async function iniciarCamara() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // cámara trasera por defecto
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
        };
      }
    } catch (err) {
      console.error("Error accediendo a la cámara:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Habilita el acceso a la cámara en la configuración de tu navegador."
          : "No se pudo acceder a la cámara. Asegúrate de que tu dispositivo tenga una cámara disponible."
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

  // Capturar frame del video dentro del área delimitante y ejecutar OCR
  const capturarYEscanear = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || scanning) return;
    setScanning(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Dimensiones del video real
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // El marco de escaneo cubre el 70% del ancho y 50% del alto del video, centrado
    const frameW = vw * 0.70;
    const frameH = vh * 0.50;
    const frameX = (vw - frameW) / 2;
    const frameY = (vh - frameH) / 2;

    canvas.width = frameW;
    canvas.height = frameH;

    // Dibujar sólo la porción dentro del marco
    ctx.drawImage(video, frameX, frameY, frameW, frameH, 0, 0, frameW, frameH);

    // Mejorar contraste para mejor OCR
    ctx.filter = "contrast(1.5) brightness(1.1)";
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none";

    try {
      const { data } = await Tesseract.recognize(canvas, "eng", {
        logger: () => {},
      });

      const textoCompleto = data.text.trim();

      if (textoCompleto.length > 2) {
        const resultado = extraerNombreYExpansion(textoCompleto);
        setResultadoDetectado(resultado);
        mostrarPopup();
      } else {
        // No se detectó texto suficiente, permitir re-escaneo
        setScanning(false);
      }
    } catch (err) {
      console.error("Error en OCR:", err);
      setScanning(false);
    }
  }, [scanning]);

  // Extraer nombre y expansión del texto OCR
  function extraerNombreYExpansion(texto) {
    // Limpiar texto: quitar caracteres extraños
    const lineas = texto
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 1);

    // La primera línea significativa suele ser el nombre de la carta
    // Buscamos la línea más probable para el nombre (la más larga sin ser solo números)
    let nombre = "";
    let expansion = "";

    // Patrones comunes de código de carta TCG
    const patronCodigo = /([A-Z]{2,}\d{1,2}[-–]\d{2,3})/i; // OP01-024, ST01-012, etc.
    const patronExpansion = /\b(OP|ST|EB|PRB|ONE PIECE|ROMANCE DAWN|PARAMOUNT WAR|PILLARS|KINGDOMS|AWAKENING|TWIN CHAMPIONS|MEMORIAL|EXTRA|STARTER|PREMIUM|BOOSTER|BASE SET|JUNGLE|FOSSIL|TEAM ROCKET|GYM|NEO|EXPEDITION|SKYRIDGE|EX |DIAMOND|PLATINUM|BLACK & WHITE|SUN & MOON|SWORD & SHIELD|SCARLET & VIOLET|PALDEA|OBSIDIAN|TEMPORAL|PARADOX|PRISMATIC|ALPHA|BETA|UNLIMITED|REVISED|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|CORE SET|INNISTRAD|RAVNICA|THEROS|ZENDIKAR|KALDHEIM|STRIXHAVEN|KAMIGAWA|DOMINARIA|ELDRAINE|IKORIA|FOUNDATIONS)\b/i;

    for (const linea of lineas) {
      // Si encuentra un código tipo OP01-024, extraer el prefijo como pista de expansión
      const matchCod = linea.match(patronCodigo);
      if (matchCod && !expansion) {
        const prefix = matchCod[1].split(/[-–]/)[0];
        expansion = prefix;
      }

      // Si encuentra un nombre de expansión conocida
      const matchExp = linea.match(patronExpansion);
      if (matchExp && !expansion) {
        expansion = matchExp[0].trim();
      }

      // La línea más larga (>3 chars, no solo números) es probablemente el nombre
      if (linea.length > nombre.length && !/^\d+$/.test(linea)) {
        nombre = linea;
      }
    }

    // Limpiar el nombre: quitar números de código si se quedaron pegados
    nombre = nombre
      .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s.'-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Si no encontró expansión, intentar inferir de las primeras letras del código
    if (!expansion) {
      expansion = "Desconocida";
    }

    return {
      nombre: nombre || "Carta no identificada",
      expansion,
      textoCompleto: texto,
    };
  }

  // Mostrar popup con resultado por 2.5s
  function mostrarPopup() {
    setPopupVisible(true);
    setScanning(false);

    // Auto-ocultar si el usuario no interactúa
    const timer = setTimeout(() => {
      setPopupVisible(false);
      setResultadoDetectado(null);
    }, 5000);
    setPopupTimer(timer);
  }

  // Aceptar la carta detectada
  function aceptarCarta() {
    if (popupTimer) clearTimeout(popupTimer);
    setPopupVisible(false);

    if (resultadoDetectado && onCardDetected) {
      onCardDetected({
        nombre: resultadoDetectado.nombre,
        expansion: resultadoDetectado.expansion,
      });
    }

    setResultadoDetectado(null);
  }

  // Rechazar y volver a escanear
  function rechazarYReescanear() {
    if (popupTimer) clearTimeout(popupTimer);
    setPopupVisible(false);
    setResultadoDetectado(null);
    setScanning(false);
  }

  return (
    <div className="card-scanner-container">
      {/* Header del escáner */}
      <div className="scanner-header">
        <div className="scanner-header-info">
          <ScanLine size={18} style={{ color: "var(--acento, #a855f7)" }} />
          <span>Escanea tu carta</span>
        </div>
        <p className="scanner-instrucciones">
          Coloca la carta dentro del marco y presiona el botón para escanear. El texto del nombre y expansión será detectado automáticamente.
        </p>
      </div>

      {/* Área de la cámara */}
      <div className="scanner-camera-area">
        {cameraError ? (
          <div className="scanner-error-box">
            <Camera size={40} style={{ opacity: 0.4, marginBottom: "12px" }} />
            <p>{cameraError}</p>
            <button
              type="button"
              className="btn-reintentar-camara"
              onClick={iniciarCamara}
            >
              <RotateCcw size={14} /> Reintentar
            </button>
          </div>
        ) : (
          <>
            {/* Video de la cámara */}
            <video
              ref={videoRef}
              className="scanner-video"
              autoPlay
              playsInline
              muted
            />

            {/* Canvas oculto para captura */}
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {/* Overlay con el marco delimitante */}
            <div className="scanner-overlay">
              {/* Esquinas del marco */}
              <div className="scanner-frame">
                <div className="frame-corner top-left" />
                <div className="frame-corner top-right" />
                <div className="frame-corner bottom-left" />
                <div className="frame-corner bottom-right" />

                {/* Línea animada de escaneo */}
                {scanning && <div className="scan-line-anim" />}

                {/* Texto guía dentro del marco */}
                {!scanning && !popupVisible && (
                  <div className="frame-guide-text">
                    <Camera size={20} />
                    <span>Posiciona la carta aquí</span>
                  </div>
                )}
              </div>
            </div>

            {/* Indicador de cargando cámara */}
            {!cameraReady && !cameraError && (
              <div className="scanner-loading-cam">
                <Loader2 size={28} className="spinner-icon" />
                <span>Iniciando cámara...</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Botón de escaneo */}
      {cameraReady && !scanning && !popupVisible && (
        <button
          type="button"
          className="btn-escanear-carta"
          onClick={capturarYEscanear}
        >
          <Zap size={18} />
          Escanear carta
        </button>
      )}

      {scanning && (
        <div className="scanner-estado-procesando">
          <Loader2 size={18} className="spinner-icon" />
          <span>Analizando texto de la carta...</span>
        </div>
      )}

      {/* POPUP DE RESULTADO (aparece en la parte de abajo) */}
      <div className={`scanner-popup-resultado ${popupVisible ? "visible" : ""}`}>
        {resultadoDetectado && (
          <>
            <div className="popup-resultado-info">
              <p className="popup-nombre-carta">
                {resultadoDetectado.nombre}
              </p>
              <p className="popup-expansion-carta">
                📦 {resultadoDetectado.expansion}
              </p>
            </div>
            <div className="popup-resultado-acciones">
              {/* Aceptar */}
              <button
                type="button"
                className="popup-btn popup-btn-aceptar"
                onClick={aceptarCarta}
                title="Aceptar y buscar en API"
              >
                <Check size={18} strokeWidth={3} />
              </button>
              {/* Rechazar / re-escanear */}
              <button
                type="button"
                className="popup-btn popup-btn-rechazar"
                onClick={rechazarYReescanear}
                title="Descartar y volver a escanear"
              >
                <X size={18} strokeWidth={3} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
