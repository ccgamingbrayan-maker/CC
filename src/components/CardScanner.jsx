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
 * CardScanner – Escáner de cartas TCG con IA de BaseCC (Gemini Vision)
 * - Marco delimitante vertical con proporción real de carta TCG (63x88mm).
 * - Captura de área central con margen amplio (nunca corta el código ni el nombre).
 * - Limpieza de nombres variantes para búsqueda precisa en la base de datos de One Piece.
 * - Botón de captura manual tipo obturador (evita fotos borrosas en movimiento).
 * - Popup inferior con miniatura oficial, código, temporizador de 2.5s y botón [✕] para re-escanear.
 */
export default function CardScanner({ onCardDetected, onClose }) {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const autoScanIntervalRef = useRef(null);
  const popupTimerRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [shutterEffect, setShutterEffect] = useState(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState(false); // Manual por defecto para evitar fotos borrosas
  const [scanStatusText, setScanStatusText] = useState("Alinea la carta y presiona Escanear");
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

  // Limpiar el nombre de la carta para búsqueda en la base de datos (quita texto entre paréntesis como "(Judge Pack)")
  function limpiarNombreCarta(raw) {
    if (!raw) return "";
    return raw
      .replace(/\s*\(.*?\)/g, "")
      .replace(/\s*\[.*?\]/g, "")
      .replace(/^(DON!!|DON!)\s*/i, "")
      .trim();
  }

  // Consultar endpoint de IA de BaseCC (Gemini Vision)
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
        const rawName = card.name || data.searchString || "";
        const cleanName = limpiarNombreCarta(rawName) || rawName;

        let codigo = card.card_number || "";
        if (!codigo && data.searchString) {
          const matchCod = data.searchString.match(/\b(OP\d{2}[-\s]?\d{3}|ST\d{1,2}[-\s]?\d{3}|EB\d{2}[-\s]?\d{3}|PRB\d{2}[-\s]?\d{3}|P[-\s]?\d{1,3})\b/i);
          if (matchCod) {
            codigo = matchCod[1].replace(/\s+/g, "-").toUpperCase();
          }
        }

        let finalImg = card.image_url || "";
        if (finalImg && !finalImg.startsWith("http")) {
          finalImg = `https://www.basecc.cyou${finalImg.startsWith("/") ? "" : "/"}${finalImg}`;
        }

        const expansion = card.set_name || card.set_code || (codigo ? `Expansión ${codigo.split("-")[0]}` : "One Piece TCG");

        return {
          nombre: cleanName,
          nombreCompleto: rawName,
          codigo: codigo,
          expansion: expansion,
          imagen: finalImg,
          searchString: data.searchString || codigo || cleanName,
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
    if (!videoRef.current) return;

    const video = videoRef.current;
    if (video.readyState < 2) return;

    setScanning(true);
    setScanStatusText("📸 Analizando carta con IA...");

    // Efecto de flash de obturador
    setShutterEffect(true);
    setTimeout(() => setShutterEffect(false), 250);

    try {
      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;

      // Recortar con margen amplio el 80% central del video (nunca corta bordes ni códigos)
      const cropW = Math.round(vw * 0.80);
      const cropH = Math.round(vh * 0.90);
      const cropX = Math.round((vw - cropW) / 2);
      const cropY = Math.round((vh - cropH) / 2);

      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = Math.round(800 * (cropH / cropW));

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

      const base64 = canvas.toDataURL("image/jpeg", 0.88);

      // Enviar a la IA
      const resultado = await identificarConApi(base64);

      if (resultado && (resultado.codigo || resultado.nombre)) {
        setResultadoDetectado(resultado);
        mostrarPopup();
      } else {
        setScanStatusText("No se reconoció la carta. Mantén la carta fija e intenta de nuevo.");
        setScanning(false);
      }
    } catch (err) {
      console.error("Error capturando frame:", err);
      setScanning(false);
      setScanStatusText("Error al capturar. Intenta de nuevo.");
    }
  }, [scanning, popupVisible]);

  // Manejo de subida manual de foto
  function manejarSubidaFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setScanStatusText("📸 Procesando foto con IA...");

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
        alert("No se detectó el código o nombre de la carta en la foto. Intenta con una imagen más nítida.");
        setScanning(false);
        setScanStatusText("Alinea la carta y presiona Escanear");
      }
    };
    reader.readAsDataURL(file);
  }

  // Auto-escaneo cada 3.5s si el usuario activa el modo automático
  useEffect(() => {
    if (!autoScanEnabled || !cameraReady || scanning || popupVisible) {
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
      return;
    }

    autoScanIntervalRef.current = setInterval(() => {
      capturarYEscanear();
    }, 3500);

    return () => {
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
    };
  }, [autoScanEnabled, cameraReady, scanning, popupVisible, capturarYEscanear]);

  // Mostrar popup por 2.5 segundos
  function mostrarPopup() {
    setPopupVisible(true);
    setScanning(false);
    setScanStatusText("¡Carta identificada!");

    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);

    // Auto-cierre a los 2.5s para continuar escaneando si no se acepta
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
        nombreCompleto: resultadoDetectado.nombreCompleto,
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
    setScanStatusText("Alinea la carta y presiona Escanear");
  }

  return (
    <div className="card-scanner-container">
      {/* Header del escáner */}
      <div className="scanner-header">
        <div className="scanner-header-info">
          <ScanLine size={18} style={{ color: "var(--acento, #a855f7)" }} />
          <span>Escáner TCG con IA de BaseCC</span>
          <span className="scanner-live-badge">Gemini Vision</span>
        </div>
        <p className="scanner-instrucciones">
          Enfoca la carta en el marco y presiona <strong>Escanear</strong>. La IA detectará el código (ej. OP05-088) y nombre oficial.
        </p>
      </div>

      {/* Visor de cámara */}
      <div className="scanner-camera-area">
        {/* Efecto de destello al capturar */}
        {shutterEffect && <div className="scanner-shutter-flash" />}

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
            <div className="scanner-card-frame">
              <div className="tcg-corner top-left" />
              <div className="tcg-corner top-right" />
              <div className="tcg-corner bottom-left" />
              <div className="tcg-corner bottom-right" />

              {/* Línea láser animada */}
              {scanning && <div className="tcg-scan-laser" />}

              {/* Guía superior */}
              {!scanning && !popupVisible && (
                <div className="tcg-frame-top-guide">
                  <span>Encuadra la carta aquí</span>
                </div>
              )}

              {/* Zona inferior de lectura (nombre y código) */}
              <div className="tcg-bottom-target-zone">
                <div className="target-zone-badge">
                  <Sparkles size={11} />
                  <span>Nombre y Código abajo</span>
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
          {/* Botón manual para capturar al instante (grande y destacado) */}
          <button
            type="button"
            className="btn-accion-scanner btn-escanear-manual"
            onClick={capturarYEscanear}
            disabled={scanning || popupVisible || !cameraReady}
            title="Capturar y escanear carta enfocada ahora"
          >
            <Camera size={16} />
            <span>Escanear carta</span>
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
            title="Activar / desactivar escaneo continuo automático"
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
