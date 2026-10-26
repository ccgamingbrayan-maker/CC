import {
  buscarPrintsOnePiece,
  buscarDecksFiltered,
  buscarPromosFiltered,
  buscarDonFiltered,
} from "./onepiece.js";

// Prompt de Sistema 100% especializado en One Piece TCG (Bandai)
export const ONE_PIECE_SYSTEM_INSTRUCTION = `Eres un experto tasador visual y clasificador oficial de cartas de One Piece Card Game (Bandai TCG).

Tu única tarea es analizar la fotografía de una carta física de One Piece y extraer sus datos técnicos exactos en formato JSON estructurado.

=======================================================
ANATOMÍA VISUAL DE UNA CARTA DE ONE PIECE TCG:
=======================================================
1. CÓDIGO IDENTIFICADOR (EL DATO MÁS CRÍTICO):
   - Ubicación: Esquina inferior derecha de la carta.
   - Formatos oficiales válidos:
     * Sets principales: "OP01-###", "OP02-###", ..., "OP09-###", "OP10-###" (ej: OP05-088, OP01-016).
     * Extra Boosters: "EB01-###", "EB02-###" (ej: EB01-003).
     * Starter Decks: "ST01-###" hasta "ST21-###" (ej: ST01-012).
     * Cartas Promo / Torneo: "P-###" (ej: P-041, P-007).
     * Premium Booster: "PRB01-###".
   - Regla de oro: Si el código es visible, úsalo como prioridad absoluta.

2. NOMBRE DEL PERSONAJE / CARTA:
   - Ubicación: Barra superior central o superior derecha.
   - NUNCA agregues información de variantes al nombre (ej: pon "Mansherry", NUNCA "Mansherry (Judge Pack Vol. 4)"). El nombre debe ser 100% limpio para búsquedas directas en la base de datos de Bandai/OPTCG.
   - Ejemplos válidos: "Monkey.D.Luffy", "Roronoa Zoro", "Nami", "Trafalgar Law", "Portgas.D.Ace", "Edward.Newgate".

3. TIPO DE CARTA:
   - "LEADER": Tiene "LIFE" en vez de "COST" y marco característico.
   - "CHARACTER": Tiene "COST" (esquina superior izquierda) y "POWER" (superior derecha).
   - "EVENT": Carta de acción con texto de efecto principal.
   - "STAGE": Carta de escenario / locación.
   - "DON!!": Carta de recurso (puede ser estándar o arte de personaje con el texto "DON!!").

4. COLOR DE LA CARTA:
   - Puede ser mono-color o dual-color: "Red", "Green", "Blue", "Purple", "Black", "Yellow", o combinaciones como "Red/Green", "Blue/Black", "Yellow/Purple".

5. RAREZA BASE IMPRESA:
   - Letra impresa al lado del código en la esquina inferior derecha:
     "L" (Leader), "C" (Common), "UC" (Uncommon), "R" (Rare), "SR" (Super Rare), "SEC" (Secret Rare), "TR" (Treasure Rare), "SP" (Special Card).

6. DETECCIÓN DE VERSIÓN Y ARTE (ARTE ALTERNO / ALTA RAREZA):
   - "normal": Arte base regular del sobre.
   - "parallel": Alternate Art (AA) con ilustración sin bordes o extendida, textura holográfica/foil visible.
   - "manga": Ilustración con paneles originales del manga en blanco y negro de fondo con bordes y detalles dorados/foil (Super Parallel).
   - "sp": Carta temática especial con marcos dorados, vitrales o estilo té.
   - "stamped_promo": Lleva un sello impreso adicional visible ("WINNER", "JUDGE", "BANDAI FEST", "1st Anniversary").
   - "don_especial": Carta DON!! con arte alternativo de anime/manga.

=======================================================
REGLAS DE SEGURIDAD Y CONTROL DE ERRORES:
=======================================================
- Si la imagen NO es una carta de One Piece TCG, responde con "es_one_piece": false.
- Si la carta está tapada o borrosa y no puedes leer el código con certeza, asigna "codigo": null y "confianza": "media" o "baja", basándote en el nombre del personaje.
- En "query_busqueda", entrega la mejor clave para la API (prioriza el código ej: "OP05-088"; si no hay código, usa el nombre ej: "Mansherry").`;

// Esquema de Respuesta Estructurada oficial para Gemini
export const ONE_PIECE_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    es_one_piece: { type: "BOOLEAN" },
    codigo: {
      type: "STRING",
      description: "Código oficial Bandai (ej: OP05-088, ST01-001, P-033). null si no es legible.",
      nullable: true,
    },
    nombre: {
      type: "STRING",
      description: "Nombre limpio del personaje o carta sin variantes ni paréntesis.",
    },
    tipo: {
      type: "STRING",
      enum: ["LEADER", "CHARACTER", "EVENT", "STAGE", "DON!!", "OTRO"],
    },
    color: {
      type: "STRING",
      description: "Color o combinación (ej: Red, Green, Blue, Purple, Black, Yellow, Red/Green, etc.).",
    },
    rareza: {
      type: "STRING",
      description: "L, C, UC, R, SR, SEC, SP, TR o Promo.",
    },
    variante: {
      type: "STRING",
      enum: ["normal", "parallel", "manga", "sp", "stamped_promo", "don_especial", "desconocido"],
    },
    query_busqueda: {
      type: "STRING",
      description: "Código exacto si existe, o nombre del personaje para consultar en OPTCG API.",
    },
    confianza: {
      type: "STRING",
      enum: ["alta", "media", "baja"],
    },
  },
  required: ["es_one_piece", "nombre", "query_busqueda", "confianza"],
};

/**
 * Obtener la API key de Gemini desde localStorage o env
 */
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

/**
 * Guardar la API key de Gemini en localStorage
 */
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

/**
 * Llamada multimodal a Gemini (intenta gemini-2.5-flash y hace fallback a gemini-2.0-flash / gemini-1.5-flash)
 */
export async function escanearCartaConGemini(base64Image, customApiKey = "") {
  const apiKey = customApiKey || getGeminiApiKey();

  if (!apiKey) {
    throw new Error("NO_API_KEY");
  }

  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

  const payload = {
    systemInstruction: {
      parts: [{ text: ONE_PIECE_SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        role: "user",
        parts: [
          { text: "Analiza esta carta física de One Piece Card Game y extrae su código y datos." },
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
      responseMimeType: "application/json",
      responseSchema: ONE_PIECE_RESPONSE_SCHEMA,
    },
  };

  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError = null;

  for (const model of models) {
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
        // Si el modelo no existe o no tiene permiso, probar el siguiente
        if (status === 404 || status === 400 || msg.includes("not found")) {
          lastError = new Error(msg);
          continue;
        }
        throw new Error(msg);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error("Respuesta vacía de Gemini");
      }

      const parsed = JSON.parse(rawText);
      return parsed;
    } catch (err) {
      lastError = err;
      if (err.message?.includes("API key not valid") || err.message?.includes("API_KEY_INVALID")) {
        throw err;
      }
    }
  }

  throw lastError || new Error("No se pudo procesar la carta con Gemini");
}

/**
 * Fallback a endpoint BaseCC si el usuario no tiene API key de Gemini
 */
export async function escanearConBaseCcFallback(base64Image) {
  const cleanBase64 = base64Image.startsWith("data:") ? base64Image : `data:image/jpeg;base64,${base64Image}`;
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
  // Limpieza estricta: NUNCA dejar paréntesis ni variantes en el nombre para la API
  const nombreLimpio = rawNombre.replace(/\(.*?\)/g, "").trim();
  const codigo = data.card?.card_number || (data.searchString?.match(/[A-Z0-9]+-[0-9]+/i)?.[0]) || null;

  return {
    es_one_piece: true,
    codigo: codigo ? codigo.toUpperCase() : null,
    nombre: nombreLimpio || "Carta",
    tipo: "CHARACTER",
    color: "",
    rareza: "Standard",
    variante: rawNombre.toLowerCase().includes("alternate") || rawNombre.toLowerCase().includes("parallel") ? "parallel" : "normal",
    query_busqueda: codigo || nombreLimpio,
    confianza: "media",
  };
}

/**
 * Conecta el resultado estructurado de la IA con la API oficial de One Piece (optcgapi)
 * y selecciona con 100% de precisión la versión correcta (Base, Parallel, Manga, etc.)
 */
export async function buscarYEmparejarCarta(resultadoIa) {
  if (!resultadoIa || !resultadoIa.nombre) {
    throw new Error("Datos de IA inválidos");
  }

  // 1. Nombre limpio para búsquedas directas
  const nombreBusqueda = resultadoIa.nombre.replace(/\(.*?\)/g, "").trim();

  // 2. Consultar sets, decks, promos y Don!! en paralelo
  const [sets, decks, promos, don] = await Promise.all([
    buscarPrintsOnePiece(nombreBusqueda).catch(() => []),
    buscarDecksFiltered(nombreBusqueda).catch(() => []),
    buscarPromosFiltered(nombreBusqueda).catch(() => []),
    buscarDonFiltered(nombreBusqueda).catch(() => []),
  ]);

  const combinados = [...sets, ...decks, ...promos, ...don];
  const unicos = [];
  const idsVistos = new Set();
  for (const c of combinados) {
    const key = c.id || c.imagen || `${c.numero}_${c.nombre}`;
    if (key && !idsVistos.has(key)) {
      idsVistos.add(key);
      unicos.push(c);
    }
  }

  if (unicos.length === 0) {
    // Si no encontró por nombre y tenemos código, intentar fallback de búsqueda por código
    if (resultadoIa.codigo) {
      const porCodigo = await buscarPrintsOnePiece(resultadoIa.codigo).catch(() => []);
      if (porCodigo && porCodigo.length > 0) {
        return {
          cartaSeleccionada: porCodigo[0],
          variantes: porCodigo,
          resultadoIa,
        };
      }
    }
    return {
      cartaSeleccionada: null,
      variantes: [],
      resultadoIa,
    };
  }

  // 3. Filtrar por código oficial exacto si viene en la IA (ej: OP05-088)
  const codigoIa = (resultadoIa.codigo || "").toUpperCase();
  let coincidentesPorCodigo = [];
  if (codigoIa) {
    coincidentesPorCodigo = unicos.filter((c) => {
      const numCard = (c.numero || c.id || "").toUpperCase();
      return numCard.includes(codigoIa) || codigoIa.includes(numCard);
    });
  }

  const universoCandidatos = coincidentesPorCodigo.length > 0 ? coincidentesPorCodigo : unicos;

  // 4. Determinar si la IA detectó variante especial (Parallel, Manga, SP)
  const esVarianteEspecial =
    resultadoIa.variante === "parallel" ||
    resultadoIa.variante === "manga" ||
    resultadoIa.variante === "sp";

  // Función interna para chequear si el print es especial
  const esEspecial = (c) => {
    const nom = (c.nombre || "").toUpperCase();
    const id = (c.id || "").toUpperCase();
    const rar = (c.rarity || "").toUpperCase();
    return (
      id.includes("_P") ||
      id.includes("_R") ||
      nom.includes("(PARALLEL)") ||
      nom.includes("(ALTERNATE ART)") ||
      nom.includes("(ALT ART)") ||
      nom.includes("(MANGA)") ||
      nom.includes("(SP)") ||
      rar === "MANGA" ||
      rar === "SP"
    );
  };

  let seleccionada = null;

  if (esVarianteEspecial) {
    // Priorizar versión con arte alterno / manga
    seleccionada = universoCandidatos.find(esEspecial) || universoCandidatos[0];
  } else {
    // Priorizar versión base (normal / sin _P)
    seleccionada = universoCandidatos.find((c) => !esEspecial(c)) || universoCandidatos[0];
  }

  return {
    cartaSeleccionada: seleccionada,
    variantes: universoCandidatos,
    resultadoIa,
  };
}
