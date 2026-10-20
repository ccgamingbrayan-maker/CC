import localRiftboundCards from "../data/riftbound_cards.json";

function normalize(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Búsqueda instantánea en el catálogo oficial de Riftbound TCG
 * Contiene todas las expansiones oficiales (Origins, Spiritforged, Proving Grounds).
 */
function searchLocalRiftboundCards(query, limit = 50) {
  if (!query || !query.trim()) return [];
  const qNorm = normalize(query);
  const qWords = qNorm.split(/\s+/).filter(Boolean);

  const scored = [];
  for (const c of localRiftboundCards) {
    const nameNorm = normalize(c.nombre);
    const cleanNorm = normalize(c.cleanName);
    const numNorm = normalize(c.numero);
    const setNorm = normalize(c.set);
    const nameWords = `${nameNorm} ${cleanNorm}`.split(/[\s\-_:,()]+/);

    // 1) Coincidencia exacta de nombre
    if (nameNorm === qNorm || cleanNorm === qNorm) {
      scored.push({ card: c, score: 100 });
      continue;
    }
    // 2) El nombre empieza con el término buscado
    if (nameNorm.startsWith(qNorm) || cleanNorm.startsWith(qNorm)) {
      scored.push({ card: c, score: 85 });
      continue;
    }
    // 3) Una palabra individual coincide exactamente (ej: "Yi" en "Master Yi")
    if (nameWords.some((w) => w === qNorm)) {
      scored.push({ card: c, score: 80 });
      continue;
    }
    // 4) Coincidencia por número de coleccionista o código
    if (numNorm === qNorm || numNorm.startsWith(qNorm)) {
      scored.push({ card: c, score: 70 });
      continue;
    }
    // 5) Todas las palabras de la consulta están presentes
    const fullText = `${nameNorm} ${cleanNorm} ${numNorm} ${setNorm}`;
    if (qWords.every((w) => fullText.includes(w))) {
      scored.push({ card: c, score: 50 });
      continue;
    }
    // 6) Substring en el nombre
    if (nameNorm.includes(qNorm) || cleanNorm.includes(qNorm)) {
      scored.push({ card: c, score: 20 });
      continue;
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.card);
}

/**
 * Consulta de respaldo en línea a api.riftcodex.com (con timeout rápido de 2s para no colgar la UI)
 */
async function fetchOnlineFallback(query, size = 30) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const url = `https://api.riftcodex.com/cards/search?query=${encodeURIComponent(query.trim())}&size=${size}&page=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const json = await res.json();
    const items = json?.items ?? [];
    return items.map((c) => {
      const mediaUrl = c.media?.image_url ?? c.image_url ?? c.image ?? c.thumbnail ?? null;
      return {
        id: c.id ?? c._id ?? `online-${c.name}`,
        nombre: c.name ?? c.title ?? "",
        cleanName: c.name ?? c.title ?? "",
        set: c.set?.label ?? c.set_name ?? c.set ?? "Riftbound TCG",
        numero: c.collector_number ?? c.collector ?? "",
        imagen: mediaUrl,
        imagenes: {
          small: mediaUrl,
          normal: mediaUrl,
          large: mediaUrl,
        },
        image_uris: {
          small: mediaUrl,
          normal: mediaUrl,
          large: mediaUrl,
        },
        url: c.url ?? c.permalink ?? null,
        precios: { usd: null, eur: null, tix: null },
        source: "riftbound",
      };
    });
  } catch (e) {
    return [];
  }
}

/**
 * Buscar cartas de Riftbound TCG
 * Devuelve resultados al instante desde la base de datos oficial local,
 * y en caso de no hallar nada, prueba de forma no bloqueante el endpoint en línea.
 */
export async function buscarCartasRiftbound(query, pageSize = 30) {
  if (!query || !query.trim()) return [];
  const q = query.trim();
  const limit = Math.min(Math.max(1, pageSize), 50);

  // 1) Búsqueda instantánea en catálogo oficial local
  const localResults = searchLocalRiftboundCards(q, limit);
  if (localResults.length > 0) {
    return localResults;
  }

  // 2) Si no hay resultados locales, intentar respaldo en línea con timeout rápido
  const onlineResults = await fetchOnlineFallback(q, limit);
  return onlineResults;
}

export async function buscarCartaRiftbound(nombre) {
  const resultados = await buscarCartasRiftbound(nombre, 1);
  return resultados.length > 0 ? resultados[0] : null;
}

export async function buscarPrintsRiftbound(query, pageSize = 30) {
  return buscarCartasRiftbound(query, pageSize);
}
