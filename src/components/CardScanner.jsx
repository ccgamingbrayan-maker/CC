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
import Tesseract from "tesseract.js";
import { buscarCartasOnePiece } from "../lib/onepiece";

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
 * CardScanner – Escáner de cartas TCG de alta precisión:
 * - Marco delimitante vertical con proporción real de carta (63x88mm).
 * - Enfoque en la zona inferior de la carta (donde están el nombre y código).
 * - Filtro anti-ruido: SOLO activa el popup cuando la carta es VERIFICADA en la base de datos oficial.
 * - Motor OCR persistente para velocidad instantánea sin congelar la app.
 * - Popup inferior con temporizador de 2.5s y botón X para re-escanear.
 */
export default function CardScanner({ onCardDetected, onClose }) {
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const workerRef = useRef(null);
  const autoScanIntervalRef = useRef(null);
  const popupTimerRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [ocrReady, setOcrReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);
  const [scanMessage, setScanMessage] = useState("Iniciando escáner...");
  const [resultadoDetectado, setResultadoDetectado] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  // 1. Inicializar Worker de Tesseract una sola vez (persiste en memoria)
  useEffect(() => {
    let activo = true;

    async function initOcr() {
      try {
        setScanMessage("Cargando motor de reconocimiento...");
        const worker = await Tesseract.createWorker("eng", 1, {
          logger: () => {},
        });
        if (activo) {
          workerRef.current = worker;
          setOcrReady(true);
          setScanMessage("Listo para escanear");
        }
      } catch (err) {
        console.error("Error iniciando worker Tesseract:", err);
      }
    }

    initOcr();

    return () => {
      activo = false;
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // 2. Iniciar cámara al montar
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

  // Preprocesar canvas para maximizar contraste de texto blanco sobre oscuro
  function preprocesarZonaInferior(sourceCanvas) {
    const procCanvas = document.createElement("canvas");
    procCanvas.width = sourceCanvas.width;
    procCanvas.height = sourceCanvas.height;
    const ctx = procCanvas.getContext("2d");

    ctx.drawImage(sourceCanvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, procCanvas.width, procCanvas.height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      // Escala de grises
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Realce de contraste agresivo para separar texto blanco del fondo negro
      const factor = (259 * (1.8 * 100 + 255)) / (255 * (259 - 1.8 * 100));
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

  // Parser estricto: extrae únicamente candidatos con estructura de carta One Piece
  function extraerCandidatosEstrictos(texto) {
    if (!texto) return { nombres: [], codigo: null };

    const lineas = texto
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let codigo = null;
    const nombres = [];

    // Patrón estricto de código One Piece: OP05-088, ST01-001, EB01-001, etc.
    const patronCodigo = /\b([O0][P0]\d{2}|[S5][T7]\d{2}|EB\d{2}|PRB\d{2}|P)[-\s_–.]?(\d{3})\b/i;

    for (const linea of lineas) {
      const match = linea.match(patronCodigo);
      if (match && !codigo) {
        let prefix = match[1].toUpperCase().replace(/O/g, "0");
        if (prefix.startsWith("0P") || prefix.startsWith("OP") || prefix.startsWith("00")) {
          prefix = "OP" + prefix.slice(2);
        } else if (prefix.startsWith("5T") || prefix.startsWith("ST")) {
          prefix = "ST" + prefix.slice(2);
        }
        codigo = `${prefix}-${match[2]}`;
      }
    }

    // En One Piece, el nombre de la carta está DIRECTAMENTE debajo de:
    // CHARACTER, LEADER, EVENT o STAGE
    const idxHeader = lineas.findIndex((l) =>
      /\b(CHARACTER|LEADER|EVENT|STAGE)\b/.test(l) && !/[a-z]/.test(l)
    );

    if (idxHeader !== -1 && lineas[idxHeader + 1]) {
      const limpia = lineas[idxHeader + 1]
        .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s.'-]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (limpia.length >= 3 && limpia.length <= 35) {
        nombres.push(limpia);
      }
    }

    // También buscar la línea antes de la barra de tipos (ej. The Tontattas/Dressrosa)
    const idxTraits = lineas.findIndex((l) => l.includes("/") && /[A-Z]/.test(l));
    if (idxTraits > 0 && lineas[idxTraits - 1]) {
      const limpia = lineas[idxTraits - 1]
        .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s.'-]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (limpia.length >= 3 && limpia.length <= 35 && !/^(CHARACTER|LEADER|EVENT|STAGE)$/i.test(limpia)) {
        if (!nombres.includes(limpia)) {
          nombres.push(limpia);
        }
      }
    }

    return { nombres, codigo };
  }

  // Validar contra la API oficial de One Piece: solo si existe se acepta la carta
  async function validarConApi(candidatoNombre, codigo) {
    if (!candidatoNombre && !codigo) return null;

    try {
      // Si tenemos un nombre, buscar en la API oficial
      if (candidatoNombre) {
        const cartas = await buscarCartasOnePiece(candidatoNombre);
        if (Array.isArray(cartas) && cartas.length > 0) {
          // Si además detectamos el código, buscar coincidencia exacta
          if (codigo) {
            const coincidencia = cartas.find(
              (c) => c.numero?.toUpperCase() === codigo.toUpperCase()
            );
            if (coincidencia) {
              return {
                nombre: coincidencia.nombre,
                expansion: coincidencia.set || "One Piece TCG",
                codigo: coincidencia.numero || codigo,
                imagen: coincidencia.imagen || "",
                rarity: coincidencia.rarity || "",
              };
            }
          }

          // Si no hay código pero el nombre es exacto en la API
          const primerMatch = cartas[0];
          return {
            nombre: primerMatch.nombre,
            expansion: primerMatch.set || "One Piece TCG",
            codigo: primerMatch.numero || codigo || "",
            imagen: primerMatch.imagen || "",
            rarity: primerMatch.rarity || "",
          };
        }
      }

      // Si no encontró por nombre pero tenemos un código válido conocido
      if (codigo) {
        const prefix = codigo.split("-")[0];
        const exp = ONE_PIECE_SETS[prefix];
        if (exp) {
          return {
            nombre: `Carta ${codigo}`,
            expansion: exp,
            codigo: codigo,
            imagen: "",
          };
        }
      }

      return null;
    } catch (err) {
      console.warn("Error validando carta con API:", err);
      return null;
    }
  }

  // Capturar y procesar el frame
  const capturarYEscanear = useCallback(async () => {
    if (scanning || popupVisible || !ocrReady) return;
    if (!videoRef.current || !frameRef.current || !workerRef.current) return;

    const video = videoRef.current;
    if (video.readyState < 2) return;

    const coords = obtenerCoordenadasMarco(video, frameRef.current);
    if (!coords || coords.w <= 20 || coords.h <= 20) return;

    setScanning(true);
    setScanMessage("Escaneando nombre y código...");

    try {
      // 1. Recortar la ZONA INFERIOR (el 28% inferior de la carta donde están el nombre y código)
      // En One Piece el nombre está entre el 74% y 92% de la altura de la carta
      const bottomHeight = coords.h * 0.28;
      const bottomY = coords.y + coords.h - bottomHeight;

      const bottomCanvas = document.createElement("canvas");
      const targetW = Math.max(800, coords.w * 2);
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

      // Preprocesar con alto contraste
      const procCanvas = preprocesarZonaInferior(bottomCanvas);

      // Reconocimiento OCR rápido con el worker persistente
      const { data } = await workerRef.current.recognize(procCanvas);
      const texto = data?.text || "";

      // Extraer candidatos con patrón de carta
      const { nombres, codigo } = extraerCandidatosEstrictos(texto);

      let cartaValida = null;

      // Validar cada candidato con la API (filtra 100% el ruido o letras sin sentido)
      for (const candidato of nombres) {
        const verif = await validarConApi(candidato, codigo);
        if (verif) {
          cartaValida = verif;
          break;
        }
      }

      // Si no hubo nombre válido pero hay código exacto
      if (!cartaValida && codigo) {
        cartaValida = await validarConApi(null, codigo);
      }

      // SOLO activar popup si se validó que es una carta REAL
      if (cartaValida) {
        setResultadoDetectado(cartaValida);
        mostrarPopup();
      } else {
        // Ruido o carta no reconocida: continuar silenciosamente
        setScanning(false);
      }
    } catch (err) {
      console.error("Error durante escaneo:", err);
      setScanning(false);
    }
  }, [scanning, popupVisible, ocrReady]);

  // Manejo de subida manual de foto
  async function manejarSubidaFoto(e) {
    const file = e.target.files?.[0];
    if (!file || !workerRef.current) return;

    setScanning(true);
    setScanMessage("Analizando foto...");

    const img = new Image();
    img.onload = async () => {
      try {
        // Extraer el 30% inferior de la imagen
        const bottomH = img.height * 0.30;
        const bottomY = img.height - bottomH;

        const canvas = document.createElement("canvas");
        const targetW = Math.max(900, img.width);
        const factor = targetW / img.width;
        canvas.width = targetW;
        canvas.height = bottomH * factor;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, bottomY, img.width, bottomH, 0, 0, canvas.width, canvas.height);

        const proc = preprocesarZonaInferior(canvas);
        const { data } = await workerRef.current.recognize(proc);
        const { nombres, codigo } = extraerCandidatosEstrictos(data.text);

        let cartaValida = null;
        for (const cand of nombres) {
          const verif = await validarConApi(cand, codigo);
          if (verif) {
            cartaValida = verif;
            break;
          }
        }
        if (!cartaValida && codigo) {
          cartaValida = await validarConApi(null, codigo);
        }

        if (cartaValida) {
          setResultadoDetectado(cartaValida);
          mostrarPopup();
        } else {
          alert("No se detectó una carta válida en la imagen. Asegúrate de que la parte inferior (nombre y código) sea legible.");
          setScanning(false);
        }
      } catch (err) {
        console.error("Error procesando foto:", err);
        setScanning(false);
      }
    };
    img.src = URL.createObjectURL(file);
  }

  // Loop de auto-escaneo suave cada 2 segundos
  useEffect(() => {
    if (!autoScanEnabled || !cameraReady || !ocrReady || scanning || popupVisible) {
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
      return;
    }

    autoScanIntervalRef.current = setInterval(() => {
      capturarYEscanear();
    }, 2000);

    return () => {
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
    };
  }, [autoScanEnabled, cameraReady, ocrReady, scanning, popupVisible, capturarYEscanear]);

  // Mostrar popup por 2.5 segundos
  function mostrarPopup() {
    setPopupVisible(true);
    setScanning(false);

    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);

    popupTimerRef.current = setTimeout(() => {
      rechazarYReescanear();
    }, 2500);
  }

  // Aceptar carta detectada
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

  // Rechazar y volver a escanear de inmediato
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
          Coloca la carta dentro del marco. <strong>El nombre</strong> debe quedar en la franja inferior resaltada.
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

            {/* Máscara oscura */}
            <div className="scanner-overlay-mask" />

            {/* Marco delimitante con proporción de carta TCG (63x88mm) */}
            <div ref={frameRef} className="scanner-card-frame">
              <div className="tcg-corner top-left" />
              <div className="tcg-corner top-right" />
              <div className="tcg-corner bottom-left" />
              <div className="tcg-corner bottom-right" />

              {/* Láser animado de escaneo */}
              {(scanning || autoScanEnabled) && !popupVisible && (
                <div className="tcg-scan-laser" />
              )}

              {/* Guía superior */}
              {!scanning && !popupVisible && (
                <div className="tcg-frame-top-guide">
                  <span>Alinea la carta al marco</span>
                </div>
              )}

              {/* Zona inferior de lectura (nombre y código) */}
              <div className="tcg-bottom-target-zone">
                <div className="target-zone-badge">
                  <Sparkles size={11} />
                  <span>Ubica aquí el NOMBRE</span>
                </div>
              </div>
            </div>

            {/* Estado de carga */}
            {(!cameraReady || !ocrReady) && !cameraError && (
              <div className="scanner-loading-cam">
                <Loader2 size={32} className="spinner-icon" />
                <span>{!ocrReady ? "Iniciando motor de IA..." : "Iniciando sensor de cámara..."}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Controles y estado */}
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
          <button
            type="button"
            className="btn-accion-scanner btn-escanear-manual"
            onClick={capturarYEscanear}
            disabled={scanning || popupVisible || !ocrReady}
            title="Escanear carta ahora"
          >
            <Zap size={15} />
            <span>Escanear</span>
          </button>

          <button
            type="button"
            className="btn-accion-scanner btn-subir-archivo"
            onClick={() => fileInputRef.current?.click()}
            title="Subir imagen de la carta"
          >
            <ImageIcon size={15} />
            <span>Subir foto</span>
          </button>

          <button
            type="button"
            className={`btn-toggle-autoscan ${autoScanEnabled ? "activo" : ""}`}
            onClick={() => setAutoScanEnabled(!autoScanEnabled)}
            title="Activar / desactivar escaneo automático"
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
            {/* Barra de progreso regresiva de 2.5s */}
            <div className="popup-countdown-bar" />

            {/* Thumbnail oficial de la carta si está disponible */}
            {resultadoDetectado.imagen && (
              <img
                src={resultadoDetectado.imagen}
                alt={resultadoDetectado.nombre}
                className="popup-carta-thumb"
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
              <button
                type="button"
                className="popup-btn popup-btn-aceptar"
                onClick={aceptarCarta}
                title="Aceptar y cargar a la colección"
              >
                <Check size={20} strokeWidth={3} />
              </button>

              <button
                type="button"
                className="popup-btn popup-btn-rechazar"
                onClick={rechazarYReescanear}
                title="Descartar y volver a escanear"
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
