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
  Info,
} from "lucide-react";
import Tesseract from "tesseract.js";

// Diccionario de expansiones conocidas de One Piece TCG
const ONE_PIECE_SETS = {
  OP01: "Romance Dawn (OP-01)",
  OP02: "Paramount War (OP-02)",
  OP03: "Pillars of Strength (OP-03)",
  OP04: "Kingdoms of Intrigue (OP-04)",
  OP05: "Awakening of the New Era (OP-05)",
  OP06: "Wings of the Captain (OP-06)",
  OP07: "500 Years in the Future (OP-07)",
  OP08: "Two Legends (OP-08)",
  OP09: "The Four Emperors (OP-09)",
  OP10: "Royal Blood (OP-10)",
  OP11: "A Fist of Divine Speed (OP-11)",
  OP12: "Legacy of the Master (OP-12)",
  EB01: "Memorial Collection (EB-01)",
  PRB01: "Premium Booster (PRB-01)",
  ST01: "Straw Hat Crew (ST-01)",
  ST02: "Worst Generation (ST-02)",
  ST03: "The Seven Warlords (ST-03)",
  ST04: "Animal Kingdom Pirates (ST-04)",
  ST05: "One Piece Film Edition (ST-05)",
  ST06: "Absolute Justice (ST-06)",
  ST07: "Big Mom Pirates (ST-07)",
  ST08: "Monkey D. Luffy (ST-08)",
  ST09: "Yamato (ST-09)",
  ST10: "The Three Captains (ST-10)",
  ST11: "Uta (ST-11)",
  ST12: "Zoro & Sanji (ST-12)",
  ST13: "3 Brothers (ST-13)",
  ST14: "3D2Y (ST-14)",
  ST15: "Red Edward.Newgate (ST-15)",
  ST16: "Green Uta (ST-16)",
  ST17: "Blue Doflamingo (ST-17)",
  ST18: "Purple Luffy (ST-18)",
  ST19: "Black Smoker (ST-19)",
  ST20: "Yellow Katakuri (ST-20)",
  P: "Promotional Card",
};

/**
 * CardScanner – Escáner de cartas TCG con marco de proporción física (63x88mm),
 * detección inteligente de la zona inferior (nombre + código), auto-escaneo y subida de fotos.
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
  const [scanMessage, setScanMessage] = useState("Buscando carta...");
  const [resultadoDetectado, setResultadoDetectado] = useState(null); // { nombre, expansion, codigo }
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
          width: { ideal: 1920 },
          height: { ideal: 1080 },
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

  // Preprocesar canvas para maximizar precisión de OCR (escala de grises + contraste)
  function preprocesarCanvasParaOcr(sourceCanvas) {
    const procCanvas = document.createElement("canvas");
    procCanvas.width = sourceCanvas.width;
    procCanvas.height = sourceCanvas.height;
    const ctx = procCanvas.getContext("2d");

    ctx.drawImage(sourceCanvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, procCanvas.width, procCanvas.height);
    const d = imgData.data;

    // Conversión a escala de grises con contraste dinámico
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Realce de contraste
      const factor = (259 * (1.5 * 100 + 255)) / (255 * (259 - 1.5 * 100));
      const newGray = Math.max(0, Math.min(255, factor * (gray - 128) + 128));

      d[i] = newGray;
      d[i + 1] = newGray;
      d[i + 2] = newGray;
    }

    ctx.putImageData(imgData, 0, 0);
    return procCanvas;
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

  // Parser inteligente de texto OCR para One Piece y otros TCGs
  function parsearTextoOcr(texto) {
    if (!texto) return null;
    const lineas = texto
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let codigo = null;
    let expansion = null;
    let nombre = null;

    // 1. Detección de código de carta (e.g. OP05-088, ST01-001, EB01-001, PRB01-001)
    // Se corrigen confusiones comunes de OCR (letras O en lugar de 0, etc.)
    const patronCodigo = /\b([O0][P0]\d{2}|[S5][T7]\d{2}|EB\d{2}|PRB\d{2}|P)[-\s_–.]?(\d{3})\b/i;

    for (const linea of lineas) {
      const match = linea.match(patronCodigo);
      if (match) {
        let prefix = match[1].toUpperCase().replace(/O/g, "0");
        if (prefix.startsWith("0P") || prefix.startsWith("OP") || prefix.startsWith("00")) {
          prefix = "OP" + prefix.slice(2);
        } else if (prefix.startsWith("5T") || prefix.startsWith("ST")) {
          prefix = "ST" + prefix.slice(2);
        }
        codigo = `${prefix}-${match[2]}`;
        expansion = ONE_PIECE_SETS[prefix] || `Expansión ${prefix}`;
        break;
      }
    }

    // 2. Detección de nombre en One Piece:
    // Los nombres de cartas One Piece están en la parte inferior, justo debajo de
    // los encabezados en mayúsculas: CHARACTER, LEADER, EVENT o STAGE
    const idxHeader = lineas.findIndex((l) =>
      /\b(CHARACTER|LEADER|EVENT|STAGE)\b/.test(l) && !/[a-z]/.test(l)
    );

    if (idxHeader !== -1 && lineas[idxHeader + 1]) {
      const candidato = lineas[idxHeader + 1]
        .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s.'-]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (candidato.length >= 2 && candidato.length <= 40) {
        nombre = candidato;
      }
    }

    // Si no encontró el header directo, buscar la línea que precede a los subtipos / traits
    // (en One Piece los subtipos son e.g. "The Tontattas/Dressrosa", "Straw Hat Crew", etc.)
    if (!nombre) {
      const idxTraits = lineas.findIndex((l) => l.includes("/") && /[A-Z]/.test(l));
      if (idxTraits > 0 && lineas[idxTraits - 1]) {
        const candid = lineas[idxTraits - 1]
          .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s.'-]/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (candid.length >= 3 && candid.length <= 40 && !/^(CHARACTER|LEADER|EVENT|STAGE)$/i.test(candid)) {
          nombre = candid;
        }
      }
    }

    // 3. Fallback general: descartar texto de reglas y buscar la línea más corta/limpia
    if (!nombre) {
      const excluirReglas = [
        /activate/i, /main/i, /you may/i, /don!!/i, /trash/i, /deck/i,
        /cost/i, /hand/i, /rest/i, /sample/i, /play/i, /turn/i, /battle/i,
        /counter/i, /power/i, /life/i, /damage/i, /bandai/i, /japan/i
      ];

      // Revisar desde el final hacia arriba (zona inferior de la carta)
      for (let i = lineas.length - 1; i >= 0; i--) {
        const l = lineas[i];
        if (excluirReglas.some((rx) => rx.test(l))) continue;

        const limpia = l
          .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s.'-]/g, "")
          .replace(/\s+/g, " ")
          .trim();

        const palabras = limpia.split(/\s+/).filter(Boolean);
        if (limpia.length >= 3 && limpia.length <= 35 && palabras.length >= 1 && palabras.length <= 4) {
          nombre = limpia;
          break;
        }
      }
    }

    // Si aún no hay expansión pero tenemos código
    if (!expansion && codigo) {
      const prefix = codigo.split("-")[0];
      expansion = ONE_PIECE_SETS[prefix] || `Colección ${prefix}`;
    }

    if (!nombre && !codigo) return null;

    return {
      nombre: nombre || (codigo ? `Carta ${codigo}` : "Carta desconocida"),
      expansion: expansion || "One Piece TCG",
      codigo: codigo || "",
    };
  }

  // Ejecución de escaneo sobre una imagen o frame de video
  const procesarImagen = useCallback(async (sourceCanvas, isCroppedBottom = false) => {
    try {
      const procCanvas = preprocesarCanvasParaOcr(sourceCanvas);
      const { data } = await Tesseract.recognize(procCanvas, "eng", {
        logger: () => {},
      });

      const parsed = parsearTextoOcr(data.text);
      return parsed;
    } catch (err) {
      console.error("Error en reconocimiento OCR:", err);
      return null;
    }
  }, []);

  // Capturar y procesar el frame enfocado en la zona inferior
  const capturarYEscanear = useCallback(async () => {
    if (scanning || popupVisible) return;
    if (!videoRef.current || !frameRef.current) return;

    const video = videoRef.current;
    if (video.readyState < 2) return;

    const coords = obtenerCoordenadasMarco(video, frameRef.current);
    if (!coords || coords.w <= 10 || coords.h <= 10) return;

    setScanning(true);
    setScanMessage("Escaneando nombre y código...");

    try {
      // 1. Extraer la ZONA INFERIOR de la carta (el 38% inferior donde están el nombre y código)
      const bottomHeight = coords.h * 0.38;
      const bottomY = coords.y + coords.h - bottomHeight;

      const bottomCanvas = document.createElement("canvas");
      // Escalar a buen tamaño para resolución nítida de OCR
      const targetW = Math.max(750, coords.w * 1.5);
      const scaleFactor = targetW / coords.w;
      bottomCanvas.width = targetW;
      bottomCanvas.height = bottomHeight * scaleFactor;

      const bCtx = bottomCanvas.getContext("2d");
      bCtx.drawImage(
        video,
        coords.x,
        bottomY,
        coords.w,
        bottomHeight,
        0,
        0,
        bottomCanvas.width,
        bottomCanvas.height
      );

      // Reconocer la zona inferior primero
      let resultado = await procesarImagen(bottomCanvas, true);

      // 2. Si no encontró datos en la zona inferior, escanear la carta completa (soporta Pokémon/Magic)
      if (!resultado || !resultado.nombre) {
        setScanMessage("Analizando carta completa...");
        const fullCanvas = document.createElement("canvas");
        fullCanvas.width = targetW;
        fullCanvas.height = coords.h * scaleFactor;
        const fCtx = fullCanvas.getContext("2d");
        fCtx.drawImage(
          video,
          coords.x,
          coords.y,
          coords.w,
          coords.h,
          0,
          0,
          fullCanvas.width,
          fullCanvas.height
        );
        const resFull = await procesarImagen(fullCanvas, false);
        if (resFull) {
          resultado = resFull;
        }
      }

      if (resultado && (resultado.nombre || resultado.codigo)) {
        setResultadoDetectado(resultado);
        mostrarPopup();
      } else {
        setScanning(false);
      }
    } catch (err) {
      console.error("Error durante captura:", err);
      setScanning(false);
    }
  }, [scanning, popupVisible, procesarImagen]);

  // Manejo de subida manual de foto (para probar con imágenes o fotos de alta calidad)
  function manejarSubidaFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setScanMessage("Procesando foto...");

    const img = new Image();
    img.onload = async () => {
      try {
        // Analizar zona inferior de la foto
        const bottomH = img.height * 0.38;
        const bottomY = img.height - bottomH;

        const bottomCanvas = document.createElement("canvas");
        const targetW = Math.max(800, img.width);
        const factor = targetW / img.width;
        bottomCanvas.width = targetW;
        bottomCanvas.height = bottomH * factor;

        const bCtx = bottomCanvas.getContext("2d");
        bCtx.drawImage(img, 0, bottomY, img.width, bottomH, 0, 0, bottomCanvas.width, bottomCanvas.height);

        let resultado = await procesarImagen(bottomCanvas, true);

        if (!resultado) {
          const fullCanvas = document.createElement("canvas");
          fullCanvas.width = targetW;
          fullCanvas.height = img.height * factor;
          const fCtx = fullCanvas.getContext("2d");
          fCtx.drawImage(img, 0, 0, img.width, img.height, 0, 0, fullCanvas.width, fullCanvas.height);
          resultado = await procesarImagen(fullCanvas, false);
        }

        if (resultado) {
          setResultadoDetectado(resultado);
          mostrarPopup();
        } else {
          alert("No se pudo detectar el nombre o código de la carta en esta imagen. Intenta con una foto más clara e iluminada.");
          setScanning(false);
        }
      } catch (err) {
        console.error("Error procesando foto:", err);
        setScanning(false);
      }
    };
    img.src = URL.createObjectURL(file);
  }

  // Loop de auto-escaneo suave cada 2.2 segundos
  useEffect(() => {
    if (!autoScanEnabled || !cameraReady || scanning || popupVisible) {
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
      return;
    }

    autoScanIntervalRef.current = setInterval(() => {
      capturarYEscanear();
    }, 2200);

    return () => {
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
    };
  }, [autoScanEnabled, cameraReady, scanning, popupVisible, capturarYEscanear]);

  // Mostrar popup por 2.5 segundos con temporizador y barra de progreso
  function mostrarPopup() {
    setPopupVisible(true);
    setScanning(false);

    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);

    // Tras 2.5 segundos exactos se oculta y reanuda el escaneo automáticamente
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
      });
    }

    setResultadoDetectado(null);
  }

  // Rechazar y volver a escanear inmediatamente sin tener que presionar botones extras
  function rechazarYReescanear() {
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
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
          <span>Escáner TCG con IA</span>
          <span className="scanner-live-badge">EN VIVO</span>
        </div>
        <p className="scanner-instrucciones">
          Alinea la carta dentro del marco. <strong>El nombre y código</strong> deben quedar en la zona inferior demarcada.
        </p>
      </div>

      {/* Área del visor de cámara */}
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
            {/* Video en vivo */}
            <video
              ref={videoRef}
              className="scanner-video"
              autoPlay
              playsInline
              muted
            />

            {/* Máscara oscura estilo escáner de documentos */}
            <div className="scanner-overlay-mask" />

            {/* Marco delimitante con proporción física de carta TCG (63x88mm) */}
            <div ref={frameRef} className="scanner-card-frame">
              {/* Esquinas tipo visor de documento */}
              <div className="tcg-corner top-left" />
              <div className="tcg-corner top-right" />
              <div className="tcg-corner bottom-left" />
              <div className="tcg-corner bottom-right" />

              {/* Láser animado de escaneo */}
              {(scanning || autoScanEnabled) && !popupVisible && (
                <div className="tcg-scan-laser" />
              )}

              {/* Guía superior: silueta de la carta */}
              {!scanning && !popupVisible && (
                <div className="tcg-frame-top-guide">
                  <span>Alinea los bordes de la carta</span>
                </div>
              )}

              {/* ZONA INFERIOR DEMARCADA: donde van el nombre y el código */}
              <div className="tcg-bottom-target-zone">
                <div className="target-zone-line" />
                <div className="target-zone-badge">
                  <Sparkles size={11} />
                  <span>Ubica aquí el NOMBRE y CÓDIGO</span>
                </div>
              </div>
            </div>

            {/* Estado de carga de cámara */}
            {!cameraReady && !cameraError && (
              <div className="scanner-loading-cam">
                <Loader2 size={32} className="spinner-icon" />
                <span>Iniciando sensor de cámara...</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Barra de control y estado */}
      <div className="scanner-controls-bar">
        <div className="scanner-status-indicator">
          {scanning ? (
            <span className="status-badge status-scanning">
              <Loader2 size={13} className="spinner-icon" />
              {scanMessage}
            </span>
          ) : (
            <span className="status-badge status-ready">
              <span className="status-dot-pulsing" />
              {autoScanEnabled ? "Auto-escaneo activo" : "Listo para escanear"}
            </span>
          )}
        </div>

        <div className="scanner-actions-group">
          {/* Botón Escanear ahora (manual) */}
          <button
            type="button"
            className="btn-accion-scanner btn-escanear-manual"
            onClick={capturarYEscanear}
            disabled={scanning || popupVisible}
            title="Escanear ahora mismo"
          >
            <Zap size={15} />
            <span>Escanear</span>
          </button>

          {/* Botón Subir Foto */}
          <button
            type="button"
            className="btn-accion-scanner btn-subir-archivo"
            onClick={() => fileInputRef.current?.click()}
            title="Seleccionar imagen desde archivo"
          >
            <ImageIcon size={15} />
            <span>Subir foto</span>
          </button>

          {/* Toggle de auto-escaneo */}
          <button
            type="button"
            className={`btn-toggle-autoscan ${autoScanEnabled ? "activo" : ""}`}
            onClick={() => setAutoScanEnabled(!autoScanEnabled)}
            title="Alternar escaneo continuo automático"
          >
            Auto: {autoScanEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Input de archivo oculto para subir fotos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={manejarSubidaFoto}
      />

      {/* POPUP DE RESULTADO CON TEMPORIZADOR DE 2.5 SEGUNDOS */}
      <div className={`scanner-popup-resultado ${popupVisible ? "visible" : ""}`}>
        {resultadoDetectado && (
          <>
            {/* Barra de progreso de 2.5s */}
            <div className="popup-countdown-bar" />

            <div className="popup-resultado-info">
              <div className="popup-badge-code">
                {resultadoDetectado.codigo ? (
                  <span className="badge-codigo-res">{resultadoDetectado.codigo}</span>
                ) : (
                  <span className="badge-codigo-res">TCG</span>
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
                title="Aceptar carta detectada"
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
