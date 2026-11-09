import {
  buscarPrintsOnePiece,
  buscarDecksFiltered,
  buscarPromosFiltered,
  buscarDonFiltered,
  buscarPorCodigoBandai,
} from "./onepiece.js";

// =====================================================================
// PROMPT DE SISTEMA — Experto Ultra-Especializado en One Piece TCG
// =====================================================================
// Reescrito para máxima efectividad de OCR + clasificación visual.
// Prioridad absoluta: extraer el CÓDIGO BANDAI con precisión.
export const ONE_PIECE_SYSTEM_INSTRUCTION = `Eres un sistema de visión artificial ultra-especializado en identificar cartas físicas de One Piece Card Game (Bandai TCG).

Tu ÚNICA tarea es analizar la fotografía proporcionada y extraer datos técnicos de la carta en formato JSON.

═══════════════════════════════════════════════════════════════
█ PASO 1 — VERIFICACIÓN: ¿ES UNA CARTA DE ONE PIECE TCG?
═══════════════════════════════════════════════════════════════
Comprueba que la imagen muestre una carta física de One Piece TCG de Bandai.
Señales: logo "ONE PIECE CARD GAME" en la parte superior, diseño y marco característico de Bandai, personajes de One Piece.
Si NO es una carta de One Piece TCG, responde SOLO: {"es_one_piece": false} y nada más.

═══════════════════════════════════════════════════════════════
█ PASO 2 — EXTRACCIÓN DEL CÓDIGO BANDAI (DATO MÁS CRÍTICO)
═══════════════════════════════════════════════════════════════
UBICACIÓN: Esquina INFERIOR DERECHA de la carta, junto a la letra de rareza.
El código tiene SIEMPRE uno de estos formatos:
  • Sets principales: OP01-001 hasta OP12-150 (prefijo "OP" + 2 dígitos + guion + 3 dígitos)
  • Extra Boosters:   EB01-001, EB02-001, EB03-001 (prefijo "EB")
  • Starter Decks:    ST01-001 hasta ST21-020 (prefijo "ST")
  • Promos / Torneo:  P-001 hasta P-999 (prefijo "P-")
  • Premium Booster:  PRB01-001 (prefijo "PRB")

TÉCNICAS DE LECTURA OBLIGATORIAS:
1. Haz zoom mental en la esquina inferior derecha de la carta.
2. Lee cada carácter individualmente: primero las LETRAS del prefijo, luego los DÍGITOS.
3. Los caracteres más confusos: 0 vs O, 1 vs l, 5 vs S, 8 vs B — usa el CONTEXTO del formato esperado.
4. Si hay reflejo, brillo, sombra o desenfoque parcial, INTENTA LEER igualmente. Indica confianza "media" si no estás 100% seguro.
5. Si el código es COMPLETAMENTE ilegible, pon codigo: null y confianza: "baja".

REGLA DE ORO: El código es la pieza de información más valiosa. Un código correcto identifica la carta con 100% de precisión.

═══════════════════════════════════════════════════════════════
█ PASO 3 — NOMBRE DEL PERSONAJE / CARTA
═══════════════════════════════════════════════════════════════
UBICACIÓN: Barra superior de la carta (generalmente centrada o a la derecha).
REGLAS:
• Escribe el nombre EXACTAMENTE como aparece impreso, SIN añadir paréntesis, variantes, ni información extra.
• Usa puntos para nombres compuestos: "Monkey.D.Luffy", "Portgas.D.Ace", "Trafalgar Law".
• Nunca escribas: "Luffy (Alternate Art)" ni "Nami (OP01-016)" — SOLO el nombre limpio.

═══════════════════════════════════════════════════════════════
█ PASO 4 — TIPO DE CARTA
═══════════════════════════════════════════════════════════════
• "LEADER": Tiene indicador de "LIFE" (vidas), marco dorado/especial, es la carta principal del deck.
• "CHARACTER": Tiene "COST" (coste) arriba-izquierda y "POWER" (fuerza) arriba-derecha, con valor numérico.
• "EVENT": Carta de acción/evento con texto de efecto. No tiene POWER.
• "STAGE": Carta de escenario/lugar. Suele tener un paisaje.
• "DON!!": Carta de recurso con el texto "DON!!" impreso. Puede tener arte especial.

═══════════════════════════════════════════════════════════════
█ PASO 5 — COLOR
═══════════════════════════════════════════════════════════════
Colores posibles: "Red", "Green", "Blue", "Purple", "Black", "Yellow".
Si es bicolor, combina: "Red/Green", "Blue/Black", "Yellow/Purple", etc.

═══════════════════════════════════════════════════════════════
█ PASO 6 — RAREZA (letra impresa junto al código)
═══════════════════════════════════════════════════════════════
Lee la LETRA que aparece justo al lado del código:
"L" = Leader, "C" = Common, "UC" = Uncommon, "R" = Rare, "SR" = Super Rare,
"SEC" = Secret Rare, "TR" = Treasure Rare, "SP" = Special Card, "Promo" = carta promocional.

═══════════════════════════════════════════════════════════════
█ PASO 7 — DETECCIÓN DE VARIANTE / ARTE ALTERNO
═══════════════════════════════════════════════════════════════
Analiza VISUALMENTE la ilustración para determinar la variante:
• "normal": Arte estándar del sobre con bordes visibles y marco regular.
• "parallel": Alternate Art (AA) — ilustración extendida sin bordes, cubre toda la carta, textura holográfica/foil visible, efecto brillante.
• "manga": Super Parallel — ilustración con paneles de manga en blanco y negro de fondo, detalles dorados/foil en los bordes.
• "sp": Special Card — marcos dorados ornamentales, estilo vitral, arte temático lujoso.
• "stamped_promo": Tiene un SELLO impreso visible (texto "WINNER", "JUDGE", "BANDAI", "FEST", "Anniversary", etc.)
• "don_especial": Carta DON!! con arte alternativo de personaje (no el DON!! genérico).

═══════════════════════════════════════════════════════════════
█ PASO 8 — CAMPO query_busqueda
═══════════════════════════════════════════════════════════════
Este campo se usa para buscar la carta en la base de datos:
• Si obtuviste un CÓDIGO válido → usa el código EXACTO (ej: "OP05-088")
• Si NO obtuviste código → usa el NOMBRE LIMPIO del personaje (ej: "Monkey.D.Luffy")

═══════════════════════════════════════════════════════════════
█ ERRORES COMUNES A EVITAR
═══════════════════════════════════════════════════════════════
❌ NO inventes un código si no lo puedes leer → pon null
❌ NO añadas info de variante al nombre → "Luffy" no "Luffy (Parallel)"
❌ NO confundas cartas de otros TCGs (Pokémon, Magic, Yu-Gi-Oh) con One Piece
❌ NO pongas confianza "alta" si el código está borroso o parcialmente oculto`;

// Esquema de Respuesta Estructurada para Gemini
export const ONE_PIECE_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    es_one_piece: {
      type: "BOOLEAN",
      description: "true si la imagen es una carta de One Piece TCG de Bandai.",
    },
    codigo: {
      type: "STRING",
      description:
        "Código oficial Bandai exacto leído de la carta (ej: OP05-088, ST01-001, P-033, EB01-003). null si no es legible.",
      nullable: true,
    },
    nombre: {
      type: "STRING",
      description:
        "Nombre limpio del personaje o carta exactamente como está impreso, sin paréntesis ni variantes.",
    },
    tipo: {
      type: "STRING",
      enum: ["LEADER", "CHARACTER", "EVENT", "STAGE", "DON!!", "OTRO"],
    },
    color: {
      type: "STRING",
      description:
        "Color o combinación exacta (ej: Red, Green, Blue, Purple, Black, Yellow, Red/Green).",
    },
    rareza: {
      type: "STRING",
      description: "Letra de rareza impresa: L, C, UC, R, SR, SEC, SP, TR, o Promo.",
    },
    variante: {
      type: "STRING",
      enum: [
        "normal",
        "parallel",
        "manga",
        "sp",
        "stamped_promo",
        "don_especial",
        "desconocido",
      ],
    },
    query_busqueda: {
      type: "STRING",
      description:
        "El código Bandai exacto si existe (ej: OP05-088), o el nombre limpio del personaje para consultar en la API.",
    },
    confianza: {
      type: "STRING",
      enum: ["alta", "media", "baja"],
    },
  },
  required: ["es_one_piece", "nombre", "query_busqueda", "confianza"],
};

// =====================================================================
// PREPROCESAMIENTO DE IMAGEN PARA MÁXIMA CALIDAD DE OCR
// =====================================================================

/**
 * Aplica mejoras de imagen en un canvas para optimizar la lectura de Gemini:
 * - Aumento de resolución (upscale a ~1400px de ancho)
 * - Aumento de contraste
 * - Aumento de nitidez (unsharp mask simulada)
 * - Normalización de brillo
 *
 * @param {string} base64Image - imagen en base64 (con o sin prefijo data:)
 * @returns {Promise<string>} - imagen procesada en base64 JPEG
 */
export async function preprocesarImagenParaIA(base64Image) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Upscale: garantizar mínimo 1400px de ancho para legibilidad del código
        const TARGET_WIDTH = 1400;
        const scale = Math.max(1, TARGET_WIDTH / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        // Dibujar imagen escalada con suavizado de alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Obtener pixels para procesamiento
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // --- PASO 1: Calcular estadísticas de brillo ---
        let sumBrillo = 0;
        const pixelCount = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          sumBrillo += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        const brilloPromedio = sumBrillo / pixelCount;

        // --- PASO 2: Corrección de brillo + contraste adaptativo ---
        // Si la imagen es oscura (mal iluminada), subir brillo
        // Si está sobreexpuesta, bajar un poco
        const brilloTarget = 130; // brillo ideal
        const offsetBrillo = Math.round((brilloTarget - brilloPromedio) * 0.5);
        const contraste = 1.25; // 25% más contraste
        const factorContraste = (259 * (contraste * 128 + 255)) / (255 * (259 - contraste * 128));

        for (let i = 0; i < data.length; i += 4) {
          for (let c = 0; c < 3; c++) {
            let val = data[i + c] + offsetBrillo;
            val = factorContraste * (val - 128) + 128;
            data[i + c] = Math.max(0, Math.min(255, Math.round(val)));
          }
        }

        ctx.putImageData(imageData, 0, 0);

        // --- PASO 3: Nitidez (Unsharp Mask simulada) ---
        // Dibujar la imagen original borrosa y restar para afilar
        const sharpCanvas = document.createElement("canvas");
        sharpCanvas.width = canvas.width;
        sharpCanvas.height = canvas.height;
        const sharpCtx = sharpCanvas.getContext("2d");

        // Dibujar la imagen mejorada
        sharpCtx.drawImage(canvas, 0, 0);

        // Aplicar un filtro de saturación ligero para resaltar textos
        sharpCtx.globalCompositeOperation = "source-over";
        sharpCtx.filter = "contrast(1.08) saturate(0.85)";
        sharpCtx.drawImage(canvas, 0, 0);
        sharpCtx.filter = "none";

        // Exportar con calidad alta (0.92 JPEG balance entre calidad y tamaño)
        const resultado = sharpCanvas.toDataURL("image/jpeg", 0.92);
        resolve(resultado);
      } catch (err) {
        // Si falla el procesamiento, devolver imagen original
        console.warn("Preprocesamiento de imagen falló, usando original:", err);
        resolve(base64Image);
      }
    };
    img.onerror = () => {
      // Si no se puede cargar, devolver original
      resolve(base64Image);
    };
    img.src = base64Image.startsWith("data:") ? base64Image : `data:image/jpeg;base64,${base64Image}`;
  });
}

/**
 * Recorta la zona inferior-derecha de la carta (donde está el código Bandai)
 * para enviar un segundo análisis enfocado exclusivamente en el código.
 *
 * @param {string} base64Image - imagen completa de la carta
 * @returns {Promise<string|null>} - recorte en base64, o null si falla
 */
export async function recortarZonaCodigoBandai(base64Image) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        // Recortar el cuadrante inferior derecho (40% ancho × 25% alto desde abajo-derecha)
        const cropW = Math.round(img.width * 0.45);
        const cropH = Math.round(img.height * 0.2);
        const cropX = img.width - cropW;
        const cropY = img.height - cropH;

        // Escalar el recorte para que sea grande y legible
        const upscale = Math.max(1, 600 / cropW);
        canvas.width = Math.round(cropW * upscale);
        canvas.height = Math.round(cropH * upscale);

        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

        // Aumentar contraste agresivamente en el recorte para máxima legibilidad
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const contraste = 1.6;
        const factor = (259 * (contraste * 128 + 255)) / (255 * (259 - contraste * 128));

        for (let i = 0; i < data.length; i += 4) {
          for (let c = 0; c < 3; c++) {
            data[i + c] = Math.max(0, Math.min(255, Math.round(factor * (data[i + c] - 128) + 128)));
          }
        }
        ctx.putImageData(imageData, 0, 0);

        resolve(canvas.toDataURL("image/jpeg", 0.95));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = base64Image.startsWith("data:") ? base64Image : `data:image/jpeg;base64,${base64Image}`;
  });
}

// =====================================================================
// API KEY MANAGEMENT
// =====================================================================

export function getGeminiApiKey() {
  const envKey = import.meta.env?.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim()) return envKey.trim();

  try {
    const localKey = localStorage.getItem("GEMINI_API_KEY");
    if (localKey && localKey.trim()) return localKey.trim();
  } catch {
    // ignorar error de acceso a storage
  }

  return "";
}

export function setGeminiApiKey(key) {
  try {
    if (key && key.trim()) {
      localStorage.setItem("GEMINI_API_KEY", key.trim());
    } else {
      localStorage.removeItem("GEMINI_API_KEY");
    }
  } catch {
    // ignorar error
  }
}

// =====================================================================
// LLAMADA A GEMINI — Con preprocesamiento + doble pasada de código
// =====================================================================

/**
 * Envía la imagen a Gemini con preprocesamiento y opcionalmente un recorte
 * de la zona del código para máxima precisión.
 */
export async function escanearCartaConGemini(base64Image, customApiKey = "") {
  const apiKey = customApiKey || getGeminiApiKey();

  if (!apiKey) {
    throw new Error("NO_API_KEY");
  }

  // PASO 1: Preprocesar imagen completa (contraste, nitidez, resolución)
  const imagenMejorada = await preprocesarImagenParaIA(base64Image);
  const cleanBase64 = imagenMejorada.replace(/^data:image\/\w+;base64,/, "");

  // PASO 2: Primera pasada — análisis completo de la carta
  const resultado = await llamarGeminiConImagen(cleanBase64, apiKey, ONE_PIECE_SYSTEM_INSTRUCTION);

  if (!resultado) {
    throw new Error("No se pudo procesar la carta con Gemini");
  }

  // PASO 3: Si no se pudo leer el código, intentar segunda pasada con recorte enfocado
  if (!resultado.codigo || resultado.confianza === "baja") {
    try {
      const recorte = await recortarZonaCodigoBandai(base64Image);
      if (recorte) {
        const recorteClean = recorte.replace(/^data:image\/\w+;base64,/, "");
        const codigoPrompt = `Analiza esta imagen recortada de la esquina inferior derecha de una carta de One Piece TCG.
Tu ÚNICA tarea es leer el CÓDIGO BANDAI impreso. El código tiene formato como: OP05-088, ST01-012, P-041, EB01-003, PRB01-001.
Lee cada carácter con mucho cuidado. El código está junto a una letra de rareza (C, UC, R, SR, SEC, SP, TR, L).
Responde SOLO con el código que leas, en el campo "codigo". Si no puedes leerlo, pon null.`;

        const recorteSchema = {
          type: "OBJECT",
          properties: {
            codigo: {
              type: "STRING",
              description: "Código Bandai leído del recorte (ej: OP05-088). null si ilegible.",
              nullable: true,
            },
            rareza: {
              type: "STRING",
              description: "Letra de rareza leída junto al código: C, UC, R, SR, SEC, SP, TR, L.",
              nullable: true,
            },
          },
          required: ["codigo"],
        };

        const codigoResult = await llamarGeminiConImagenCustomSchema(
          recorteClean,
          apiKey,
          codigoPrompt,
          recorteSchema
        );

        if (codigoResult?.codigo && validarFormatoCodigo(codigoResult.codigo)) {
          resultado.codigo = codigoResult.codigo.toUpperCase();
          resultado.query_busqueda = resultado.codigo;
          // Subir confianza porque confirmamos con doble pasada
          if (resultado.confianza === "baja") resultado.confianza = "media";
          if (codigoResult.rareza && !resultado.rareza) {
            resultado.rareza = codigoResult.rareza;
          }
        }
      }
    } catch (err) {
      console.warn("Segunda pasada de código falló (no crítico):", err);
    }
  }

  // Normalizar código si existe
  if (resultado.codigo) {
    resultado.codigo = normalizarCodigo(resultado.codigo);
    resultado.query_busqueda = resultado.codigo;
  }

  return resultado;
}

/**
 * Valida que un string tenga formato de código Bandai válido
 */
function validarFormatoCodigo(codigo) {
  if (!codigo) return false;
  return /^(OP\d{2}-\d{2,3}|ST\d{2}-\d{2,3}|EB\d{2}-\d{2,3}|PRB\d{2}-\d{2,3}|P-\d{2,3})$/i.test(
    codigo.trim()
  );
}

/**
 * Normaliza formato del código (mayúsculas, padding de ceros)
 */
function normalizarCodigo(codigo) {
  if (!codigo) return null;
  let c = codigo.trim().toUpperCase();

  // Asegurar que el número después del guion tenga 3 dígitos para sets/decks/EB
  // P- puede tener 3 dígitos
  const match = c.match(/^(OP\d{2}|ST\d{2}|EB\d{2}|PRB\d{2}|P)-(\d+)$/);
  if (match) {
    const prefix = match[1];
    const num = match[2].padStart(3, "0");
    return `${prefix}-${num}`;
  }

  return c;
}

/**
 * Llamada directa a la API de Gemini con imagen y schema de respuesta
 */
async function llamarGeminiConImagen(cleanBase64, apiKey, systemPrompt) {
  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Analiza esta carta física de One Piece Card Game. Extrae el código Bandai (esquina inferior derecha), nombre, tipo, color, rareza y variante con la máxima precisión posible.",
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.0,
      topP: 0.95,
      responseMimeType: "application/json",
      responseSchema: ONE_PIECE_RESPONSE_SCHEMA,
    },
  };

  return ejecutarLlamadaGemini(payload, apiKey);
}

/**
 * Llamada a Gemini con schema personalizado (para la segunda pasada de código)
 */
async function llamarGeminiConImagenCustomSchema(cleanBase64, apiKey, prompt, schema) {
  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.0,
      topP: 0.95,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };

  return ejecutarLlamadaGemini(payload, apiKey);
}

/**
 * Motor de ejecución de Gemini con fallback entre modelos y reintentos
 */
async function ejecutarLlamadaGemini(payload, apiKey) {
  // Lista actualizada de modelos vigentes en la API de Google Gemini
  // "gemini-flash-latest" siempre apunta a la versión más moderna y estable
  const models = [
    "gemini-flash-latest",
    "gemini-3.8-flash",
    "gemini-flash-lite-latest",
    "gemini-2.5-flash",
  ];
  let lastError = null;

  for (const model of models) {
    // Hasta 2 intentos por modelo (por si hay picos de demanda o errores transitorios)
    for (let intento = 0; intento < 2; intento++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          const status = res.status;
          const msg = errorData.error?.message || `HTTP ${status}`;

          // Si es error de API key, fallar inmediatamente
          if (msg.includes("API key not valid") || msg.includes("API_KEY_INVALID")) {
            throw new Error("API_KEY_INVALID: " + msg);
          }

          // Si el modelo no existe o está discontinuado, pasar al siguiente modelo
          if (
            status === 404 ||
            msg.includes("not found") ||
            msg.includes("not supported") ||
            msg.includes("no longer available")
          ) {
            lastError = new Error(msg);
            break; // No reintentar el mismo modelo, probar el siguiente
          }

          // Error 429 (rate limit) o 503 (spike de demanda) — esperar y reintentar
          if (status === 429 || status === 503) {
            lastError = new Error(msg);
            if (intento === 0) {
              await new Promise((r) => setTimeout(r, 1200));
              continue;
            }
            break; // Probar siguiente modelo
          }

          if (status === 400) {
            lastError = new Error(msg);
            break;
          }

          throw new Error(msg);
        }

        const data = await res.json();
        const candidate = data?.candidates?.[0];
        // Encontrar la parte que contiene texto (manejando modelos con thinking/thought signatures)
        const parts = candidate?.content?.parts || [];
        const textPart = parts.find((p) => typeof p.text === "string" && p.text.trim())?.text;

        if (!textPart) {
          lastError = new Error("Respuesta vacía de Gemini");
          break; // Probar otro modelo
        }

        // Limpiar bloques de código markdown ```json ... ``` si vienen en la respuesta
        let cleanText = textPart.trim();
        if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        }

        const parsed = JSON.parse(cleanText);
        return parsed;
      } catch (err) {
        lastError = err;
        if (
          err.message?.includes("API key not valid") ||
          err.message?.includes("API_KEY_INVALID")
        ) {
          throw err;
        }
        if (intento === 0 && err.name === "TypeError") {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
      }
    }
  }

  throw lastError || new Error("No se pudo procesar la carta con Gemini");
}

// =====================================================================
// FALLBACK — Servidor BaseCC
// =====================================================================

export async function escanearConBaseCcFallback(base64Image) {
  // Asegurar formato consistente: siempre enviar CON prefijo data:
  const cleanBase64 = base64Image.startsWith("data:")
    ? base64Image
    : `data:image/jpeg;base64,${base64Image}`;

  const res = await fetch("https://www.basecc.cyou/api/ai/identify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: cleanBase64 }),
  });

  if (!res.ok) throw new Error("Error en servidor de BaseCC");
  const data = await res.json();

  if (!data?.success) {
    throw new Error(data?.error || "No se detectó ninguna carta");
  }

  const rawNombre = data.card?.name || data.searchString || "";
  // Limpieza estricta: NUNCA dejar paréntesis ni variantes en el nombre
  const nombreLimpio = rawNombre.replace(/\(.*?\)/g, "").trim();
  const codigo =
    data.card?.card_number ||
    data.searchString?.match(/[A-Z]{1,3}\d{0,2}-\d{2,3}/i)?.[0] ||
    null;

  const codigoNormalizado = codigo ? normalizarCodigo(codigo) : null;

  return {
    es_one_piece: true,
    codigo: codigoNormalizado,
    nombre: nombreLimpio || "Carta",
    tipo: "CHARACTER",
    color: "",
    rareza: data.card?.rarity || "Standard",
    variante:
      rawNombre.toLowerCase().includes("alternate") ||
      rawNombre.toLowerCase().includes("parallel")
        ? "parallel"
        : "normal",
    query_busqueda: codigoNormalizado || nombreLimpio,
    confianza: codigoNormalizado ? "media" : "baja",
  };
}

// =====================================================================
// BÚSQUEDA Y EMPAREJAMIENTO — Con búsqueda por código Bandai prioritaria
// =====================================================================

/**
 * Conecta el resultado de la IA con la API de OPTCG para encontrar
 * la carta oficial y todas sus variantes.
 *
 * ESTRATEGIA DE BÚSQUEDA (en orden de prioridad):
 * 1. Búsqueda directa por código Bandai (card_set_id) — máxima precisión
 * 2. Búsqueda por nombre en sets, decks, promos y Don en paralelo
 * 3. Fallback: búsqueda parcial si el nombre largo no da resultados
 */
export async function buscarYEmparejarCarta(resultadoIa) {
  if (!resultadoIa || !resultadoIa.nombre) {
    throw new Error("Datos de IA inválidos");
  }

  const codigoIa = (resultadoIa.codigo || "").toUpperCase().trim();
  const nombreBusqueda = resultadoIa.nombre.replace(/\(.*?\)/g, "").trim();

  // ═══ ESTRATEGIA 1: Búsqueda directa por código Bandai ═══
  // Esta es LA MÁS PRECISA — un código correcto da resultado exacto
  if (codigoIa && validarFormatoCodigo(codigoIa)) {
    try {
      const porCodigo = await buscarPorCodigoBandai(codigoIa);
      if (porCodigo && porCodigo.length > 0) {
        // Encontrado por código — buscar también variantes por nombre para mostrar alternativas
        let variantes = porCodigo;
        try {
          const nombre = porCodigo[0]?.nombre || nombreBusqueda;
          if (nombre) {
            const masVariantes = await buscarEnTodosEndpoints(nombre);
            // Filtrar solo las que comparten el mismo código base (sin _P suffix)
            const codigoBase = codigoIa.replace(/_P\d*$/, "");
            const variantesRelacionadas = masVariantes.filter((c) => {
              const num = (c.numero || c.id || "").toUpperCase();
              return num.startsWith(codigoBase);
            });
            if (variantesRelacionadas.length > variantes.length) {
              variantes = deduplicar(variantesRelacionadas);
            }
          }
        } catch {
          // No crítico, tenemos al menos el resultado por código
        }

        const seleccionada = seleccionarMejorVariante(variantes, resultadoIa);
        return {
          cartaSeleccionada: seleccionada,
          variantes: deduplicar(variantes),
          resultadoIa,
        };
      }
    } catch (err) {
      console.warn("Búsqueda por código falló, intentando por nombre:", err);
    }
  }

  // ═══ ESTRATEGIA 2: Búsqueda por nombre en todos los endpoints ═══
  let resultados = await buscarEnTodosEndpoints(nombreBusqueda);

  // ═══ ESTRATEGIA 3: Si no hay resultados, intentar variaciones del nombre ═══
  if (resultados.length === 0) {
    // Intentar con nombre simplificado (primera palabra o sin puntos)
    const nombreSimple = nombreBusqueda.split(/[.\s]+/)[0];
    if (nombreSimple && nombreSimple !== nombreBusqueda && nombreSimple.length >= 3) {
      resultados = await buscarEnTodosEndpoints(nombreSimple);
    }
  }

  // ═══ ESTRATEGIA 4: Búsqueda por código como texto si aún no hay resultados ═══
  if (resultados.length === 0 && codigoIa) {
    resultados = await buscarEnTodosEndpoints(codigoIa);
  }

  if (resultados.length === 0) {
    return {
      cartaSeleccionada: null,
      variantes: [],
      resultadoIa,
    };
  }

  // Filtrar por código si la IA lo proporcionó
  let candidatos = resultados;
  if (codigoIa) {
    const filtrados = resultados.filter((c) => {
      const numCard = (c.numero || c.id || "").toUpperCase();
      // Match exacto o el código base está contenido
      return numCard.includes(codigoIa) || codigoIa.includes(numCard.replace(/_P\d*$/, ""));
    });
    if (filtrados.length > 0) {
      candidatos = filtrados;
    }
  }

  const seleccionada = seleccionarMejorVariante(candidatos, resultadoIa);

  return {
    cartaSeleccionada: seleccionada,
    variantes: deduplicar(candidatos),
    resultadoIa,
  };
}

/**
 * Busca en todos los endpoints de OPTCG API en paralelo
 */
async function buscarEnTodosEndpoints(query) {
  if (!query || query.length < 2) return [];

  const [sets, decks, promos, don] = await Promise.all([
    buscarPrintsOnePiece(query).catch(() => []),
    buscarDecksFiltered(query).catch(() => []),
    buscarPromosFiltered(query).catch(() => []),
    buscarDonFiltered(query).catch(() => []),
  ]);

  return deduplicar([...sets, ...decks, ...promos, ...don]);
}

/**
 * Elimina duplicados de la lista de cartas
 */
function deduplicar(cartas) {
  const unicos = [];
  const vistos = new Set();
  for (const c of cartas) {
    const key = c.id || c.imagen || `${c.numero}_${c.nombre}`;
    if (key && !vistos.has(key)) {
      vistos.add(key);
      unicos.push(c);
    }
  }
  return unicos;
}

/**
 * Selecciona la variante que mejor coincide con lo que la IA detectó
 */
function seleccionarMejorVariante(candidatos, resultadoIa) {
  if (!candidatos || candidatos.length === 0) return null;
  if (candidatos.length === 1) return candidatos[0];

  const esVarianteEspecial =
    resultadoIa.variante === "parallel" ||
    resultadoIa.variante === "manga" ||
    resultadoIa.variante === "sp" ||
    resultadoIa.variante === "stamped_promo";

  // Detector mejorado de prints especiales
  const esEspecial = (c) => {
    const nom = (c.nombre || "").toUpperCase();
    const id = (c.id || "").toUpperCase();
    const rar = (c.rarity || "").toUpperCase();
    const num = (c.numero || "").toUpperCase();
    return (
      id.includes("_P") ||
      num.includes("_P") ||
      nom.includes("(PARALLEL)") ||
      nom.includes("(ALTERNATE ART)") ||
      nom.includes("(ALT ART)") ||
      nom.includes("(MANGA)") ||
      nom.includes("(SP)") ||
      nom.includes("(SPECIAL)") ||
      rar === "MANGA" ||
      rar === "SP" ||
      rar === "SPECIAL"
    );
  };

  if (esVarianteEspecial) {
    // Si la IA detectó variante especial, buscar preferencia específica
    if (resultadoIa.variante === "manga") {
      const manga = candidatos.find(
        (c) =>
          (c.rarity || "").toUpperCase() === "MANGA" ||
          (c.nombre || "").toUpperCase().includes("(MANGA)")
      );
      if (manga) return manga;
    }
    if (resultadoIa.variante === "sp") {
      const sp = candidatos.find(
        (c) =>
          (c.rarity || "").toUpperCase() === "SP" ||
          (c.rarity || "").toUpperCase() === "SPECIAL" ||
          (c.nombre || "").toUpperCase().includes("(SP)")
      );
      if (sp) return sp;
    }
    // Fallback a cualquier variante especial
    return candidatos.find(esEspecial) || candidatos[0];
  } else {
    // Si la IA detectó versión normal, preferir la base (sin _P)
    return candidatos.find((c) => !esEspecial(c)) || candidatos[0];
  }
}
