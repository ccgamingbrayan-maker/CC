import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  X,
  Check,
  Loader2,
  RotateCcw,
  ScanLine,
  Zap,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";

const API_IDENTIFY_URL = "https://www.basecc.cyou/api/ai/identify";

/**
 * CardScanner – Escáner de cartas TCG impulsado por la API de IA (Gemini Vision) de BaseCC:
 * - Marco delimitante vertical con proporción física exacta de carta TCG (63x88mm).
 * - Identificación precisa de código (ej. OP05-088) y nombre con 80%+ de acierto.
 * - Soporte para cartas normales y cartas DON!! con personajes.
 * - Popup inferior con miniatura oficial, código, temporizador de 2.5s y botón [✕] para re-escanear.
 * - Botón de captura manual y subida directa de fotos.
 */
export default function CardScanner({ onCardDetected, onClose }) {
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const autoScanIntervalRef = useRef(null);
  const popupTimerRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);
  const [scanStatusText, setScanStatusText] = useState("Listo para escanear");
  const [resultadoDetectado, setResultadoDetectado] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  // Iniciar cámara al montar
  useEffect(() => {
    iniciarCamara();

    return () => {
      detenerCamara();
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    };
  }, []);

  async function iniciarCamara() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
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
      console.error("Error accediendo a la cámara:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Habilita el acceso en tu navegador."
          : "No se pudo acceder a la cámara. Puedes subir una foto directamente."
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

  // Obtener las coordenadas reales del marco dentro del video (soporta object-fit: cover)
  function obtenerCoordenadasMarco(video, frameEl) {
    if (!video || !frameEl) return null;
    const videoRect = video.getBoundingClientRect();
    const frameRect = frameEl.getBoundingClientRect();
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (!vw || !vh || !videoRect.width || !videoRect.height) return null;

    const videoRatio = vw / vh;
    const containerRatio = videoRect.width / videoRect.height;
    let renderedW, renderedH, offsetX = 0, offsetY = 0;

    if (containerRatio > videoRatio) {
      renderedW = videoRect.width;
      renderedH = videoRect.width / videoRatio;
      offsetY = (renderedH - videoRect.height) / 2;
    } else {
      renderedH = videoRect.height;
      renderedW = videoRect.height * videoRatio;
      offsetX = (renderedW - videoRect.width) / 2;
    }

    const scale = vw / renderedW;
    const x = Math.max(0, (frameRect.left - videoRect.left + offsetX) * scale);
    const y = Math.max(0, (frameRect.top - videoRect.top + offsetY) * scale);
    const w = Math.min(vw - x, frameRect.width * scale);
    const h = Math.min(vh - y, frameRect.height * scale);

    return { x, y, w, h };
  }

  // Enviar imagen a la API de IA de BaseCC (Gemini Vision)
  async function identificarConApi(base64Image) {
    try {
      const res = await fetch(API_IDENTIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Image }),
      });

      if (!res.ok) return null;
      const data = await res.json();

      if (data && data.success && (data.searchString || data.card)) {
        const card = data.card || {};
        let finalImg = card.image_url || "";
        if (finalImg && !finalImg.startsWith("http")) {
          finalImg = `https://www.basecc.cyou${finalImg.startsWith("/") ? "" : "/"}${finalImg}`;
        }

        const codigo = card.card_number || data.searchString || "";
        const nombre = card.name || (codigo.startsWith("OP") || codigo.startsWith("ST") ? codigo : data.searchString);
        const expansion = card.set_code || card.set_name || "One Piece TCG";

        return {
          nombre: nombre,
          codigo: codigo,
          expansion: expansion,
          imagen: finalImg,
          searchString: data.searchString || codigo || nombre,
        };
      }
      return null;
    } catch (err) {
      console.warn("Error consultando API de IA:", err);
      return null;
    }
  }

  // Capturar frame enfocado y consultar la IA
  const capturarYEscanear = useCallback(async () => {
    if (scanning || popupVisible) return;
    if (!videoRef.current || !frameRef.current) return;

    const video = videoRef.current;
    if (video.readyState < 2) return;

    const coords = obtenerCoordenadasMarco(video, frameRef.current);
    if (!coords || coords.w <= 20 || coords.h <= 20) return;

    setScanning(true);
    setScanStatusText("Analizando carta con IA...");

    try {
      // Recortar la carta dentro del marco delimitante con resolución óptima
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(900, Math.max(600, coords.w));
      const scale = canvas.width / coords.w;
      canvas.height = coords.h * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, coords.x, coords.y, coords.w, coords.h, 0, 0, canvas.width, canvas.height);

      const base64 = canvas.toDataURL("image/jpeg", 0.85);

      // Consultar endpoint de IA de BaseCC
      const resultado = await identificarConApi(base64);

      if (resultado && (resultado.codigo || resultado.nombre)) {
        setResultadoDetectado(resultado);
        mostrarPopup();
      } else {
        setScanStatusText("Alinea la carta dentro del marco");
        setScanning(false);
      }
    } catch (err) {
      console.error("Error capturando frame:", err);
      setScanning(false);
    }
  }, [scanning, popupVisible]);

  // Manejo de subida manual de foto (para fotos de alta resolución o tomadas desde el carrete)
  function manejarSubidaFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setScanStatusText("Analizando foto con IA...");

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result;
      if (!base64 || typeof base64 !== "string") {
        setScanning(false);
        return;
      }

      const resultado = await identificarConApi(base64);

      if (resultado && (resultado.codigo || resultado.nombre)) {
        setResultadoDetectado(resultado);
        mostrarPopup();
      } else {
        alert("No se detectó el código o nombre de la carta en la imagen. Intenta con una foto más clara e iluminada.");
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  }

  // Auto-escaneo continuo cada 2.5 segundos
  useEffect(() => {
    if (!autoScanEnabled || !cameraReady || scanning || popupVisible) {
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
      return;
    }

    autoScanIntervalRef.current = setInterval(() => {
      capturarYEscanear();
    }, 2500);

    return () => {
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
    };
  }, [autoScanEnabled, cameraReady, scanning, popupVisible, capturarYEscanear]);

  // Mostrar popup con temporizador de 2.5 segundos
  function mostrarPopup() {
    setPopupVisible(true);
    setScanning(false);
    setScanStatusText("¡Carta identificada!");

    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);

    // Auto-cierre a los 2.5s para volver a escanear si no se interactúa
    popupTimerRef.current = setTimeout(() => {
      rechazarYReescanear();
    }, 2500);
  }

  // Aceptar la carta detectada
  function aceptarCarta() {
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    setPopupVisible(false);

    if (resultadoDetectado && onCardDetected) {
      onCardDetected({
        nombre: resultadoDetectado.nombre,
        expansion: resultadoDetectado.expansion,
        codigo: resultadoDetectado.codigo,
        imagen: resultadoDetectado.imagen,
      });
    }

    setResultadoDetectado(null);
  }

  // Rechazar con la [X] y volver a escanear de inmediato
  function rechazarYReescanear() {
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    setPopupVisible(false);
    setResultadoDetectado(null);
    setScanning(false);
    setScanStatusText("Listo para escanear");
  }

  return (
    <div className="card-scanner-container">
      {/* Header del escáner */}
      <div className="scanner-header">
        <div className="scanner-header-info">
          <ScanLine size={18} style={{ color: "var(--acento, #a855f7)" }} />
          <span>Escáner TCG con IA de BaseCC</span>
          <span className="scanner-live-badge">80%+ Precisión</span>
        </div>
        <p className="scanner-instrucciones">
          Coloca la carta dentro del marco. <strong>El nombre y código</strong> deben quedar en la zona inferior.
        </p>
      </div>

      {/* Visor de cámara */}
      <div className="scanner-camera-area">
        {cameraError ? (
          <div className="scanner-error-box">
            <Camera size={44} style={{ opacity: 0.35, marginBottom: "12px" }} />
            <p>{cameraError}</p>
            <div className="scanner-error-actions">
              <button
                type="button"
                className="btn-reintentar-camara"
                onClick={iniciarCamara}
              >
                <RotateCcw size={14} /> Reintentar cámara
              </button>
              <button
                type="button"
                className="btn-subir-foto-camara"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon size={14} /> Subir foto
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="scanner-video"
              autoPlay
              playsInline
              muted
            />

            {/* Máscara oscura periférica */}
            <div className="scanner-overlay-mask" />

            {/* Marco delimitante con proporción física exacta de carta TCG (63x88mm) */}
            <div ref={frameRef} className="scanner-card-frame">
              <div className="tcg-corner top-left" />
              <div className="tcg-corner top-right" />
              <div className="tcg-corner bottom-left" />
              <div className="tcg-corner bottom-right" />

              {/* Línea láser animada */}
              {(scanning || autoScanEnabled) && !popupVisible && (
                <div className="tcg-scan-laser" />
              )}

              {/* Guía superior */}
              {!scanning && !popupVisible && (
                <div className="tcg-frame-top-guide">
                  <span>Alinea los bordes de la carta</span>
                </div>
              )}

              {/* Zona inferior de lectura (nombre y código) */}
              <div className="tcg-bottom-target-zone">
                <div className="target-zone-badge">
                  <Sparkles size={11} />
                  <span>Zona de Nombre y Código</span>
                </div>
              </div>
            </div>

            {/* Indicador de carga inicial */}
            {!cameraReady && !cameraError && (
              <div className="scanner-loading-cam">
                <Loader2 size={32} className="spinner-icon" />
                <span>Iniciando sensor de cámara...</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Barra de controles y estado */}
      <div className="scanner-controls-bar">
        <div className="scanner-status-indicator">
          {scanning ? (
            <span className="status-badge status-scanning">
              <Loader2 size={13} className="spinner-icon" />
              {scanStatusText}
            </span>
          ) : (
            <span className="status-badge status-ready">
              <span className="status-dot-pulsing" />
              {scanStatusText}
            </span>
          )}
        </div>

        <div className="scanner-actions-group">
          {/* Botón manual para capturar al instante */}
          <button
            type="button"
            className="btn-accion-scanner btn-escanear-manual"
            onClick={capturarYEscanear}
            disabled={scanning || popupVisible}
            title="Escanear carta enfocada ahora"
          >
            <Zap size={15} />
            <span>Escanear</span>
          </button>

          {/* Botón para subir foto del carrete */}
          <button
            type="button"
            className="btn-accion-scanner btn-subir-archivo"
            onClick={() => fileInputRef.current?.click()}
            title="Subir foto desde archivo"
          >
            <ImageIcon size={15} />
            <span>Subir foto</span>
          </button>

          {/* Toggle auto-escaneo */}
          <button
            type="button"
            className={`btn-toggle-autoscan ${autoScanEnabled ? "activo" : ""}`}
            onClick={() => setAutoScanEnabled(!autoScanEnabled)}
            title="Activar / desactivar escaneo continuo"
          >
            Auto: {autoScanEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Input de archivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={manejarSubidaFoto}
      />

      {/* POPUP DE RESULTADO VERIFICADO CON TEMPORIZADOR DE 2.5 SEGUNDOS */}
      <div className={`scanner-popup-resultado ${popupVisible ? "visible" : ""}`}>
        {resultadoDetectado && (
          <>
            {/* Barra de progreso de 2.5 segundos */}
            <div className="popup-countdown-bar" />

            {/* Miniatura oficial de la carta */}
            {resultadoDetectado.imagen && (
              <img
                src={resultadoDetectado.imagen}
                alt={resultadoDetectado.nombre}
                className="popup-carta-thumb"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}

            <div className="popup-resultado-info">
              <div className="popup-badge-code">
                {resultadoDetectado.codigo && (
                  <span className="badge-codigo-res">{resultadoDetectado.codigo}</span>
                )}
                <span className="popup-countdown-text">2.5s</span>
              </div>
              <p className="popup-nombre-carta">
                {resultadoDetectado.nombre}
              </p>
              <p className="popup-expansion-carta">
                📦 {resultadoDetectado.expansion}
              </p>
            </div>

            <div className="popup-resultado-acciones">
              {/* Botón Aceptar (verde) */}
              <button
                type="button"
                className="popup-btn popup-btn-aceptar"
                onClick={aceptarCarta}
                title="Aceptar y cargar a la colección"
              >
                <Check size={20} strokeWidth={3} />
              </button>

              {/* Botón Rechazar / X (rojo) -> Vuelve a escanear de inmediato */}
              <button
                type="button"
                className="popup-btn popup-btn-rechazar"
                onClick={rechazarYReescanear}
                title="No es esta carta, volver a escanear"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
