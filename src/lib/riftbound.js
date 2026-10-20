function formatRiftboundCard(c) {
  const mediaUrl = c.media?.image_url ?? c.image_url ?? c.image ?? c.thumbnail ?? null;
  const imgsMap = {
    small: mediaUrl,
    normal: mediaUrl,
    large: mediaUrl,
    png: mediaUrl,
    art_crop: mediaUrl,
    border_crop: mediaUrl,
  };
  return {
    nombre: c.name ?? c.title ?? null,
    set: c.set?.label ?? c.set_name ?? c.set ?? null,
    idRift: c.id ?? c._id ?? null,
    imagen: mediaUrl,
    imagenes: imgsMap,
  };
}

function formatRiftboundCardWithPrint(c) {
  const mediaUrl = c.media?.image_url ?? c.image_url ?? c.image ?? c.thumbnail ?? null;
  const imgsMap = {
    small: mediaUrl,
    normal: mediaUrl,
    large: mediaUrl,
    png: mediaUrl,
    art_crop: mediaUrl,
    border_crop: mediaUrl,
  };
  return {
    id: c.id ?? c._id ?? null,
    nombre: c.name ?? c.title ?? null,
    set: c.set?.label ?? c.set_name ?? c.set ?? null,
    numero: c.collector_number ?? c.collector ?? null,
    imagen: mediaUrl,
    image_uris: imgsMap,
    url: c.url ?? c.permalink ?? null,
    precios: { usd: null, eur: null, tix: null },
  };
}

async function fetchRiftboundJson(url, timeoutMs = 4500) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    // Timeout o error de red
    return null;
  }
}

async function fetchRiftboundSinglePage(baseUrl, size = 30) {
  try {
    const separator = baseUrl.includes("?") ? "&" : "?";
    const url = `${baseUrl}${separator}size=${size}&page=1`;
    const json = await fetchRiftboundJson(url, 4500);
    return json?.items ?? [];
  } catch (e) {
    return [];
  }
}

export async function buscarCartasRiftbound(query, pageSize = 30) {
  if (!query || !query.trim()) return [];
  const q = query.trim();
  const size = Math.min(Math.max(1, pageSize), 50);

  // 1) Intentar por nombre exacto
  try {
    const exactUrl = `https://api.riftcodex.com/cards/name?exact=${encodeURIComponent(q)}`;
    const exactItems = await fetchRiftboundSinglePage(exactUrl, size);
    if (exactItems.length > 0) {
      return exactItems.map(formatRiftboundCardWithPrint);
    }
  } catch (e) {
    // Continuar con fallback
  }

  // 2) Intentar por búsqueda difusa (fuzzy)
  try {
    const fuzzyUrl = `https://api.riftcodex.com/cards/name?fuzzy=${encodeURIComponent(q)}`;
    const fuzzyItems = await fetchRiftboundSinglePage(fuzzyUrl, size);
    if (fuzzyItems.length > 0) {
      return fuzzyItems.map(formatRiftboundCardWithPrint);
    }
  } catch (e) {
    // Continuar con fallback
  }

  // 3) Intentar por búsqueda general (query)
  try {
    const searchUrl = `https://api.riftcodex.com/cards/search?query=${encodeURIComponent(q)}`;
    const searchItems = await fetchRiftboundSinglePage(searchUrl, size);
    if (searchItems.length > 0) {
      return searchItems.map(formatRiftboundCardWithPrint);
    }
  } catch (e) {
    // Retornar vacío
  }

  return [];
}

export async function buscarCartaRiftbound(nombre) {
  const resultados = await buscarCartasRiftbound(nombre, 1);
  return resultados.length > 0 ? resultados[0] : null;
}

export async function buscarPrintsRiftbound(query, pageSize = 30) {
  return buscarCartasRiftbound(query, pageSize);
}

