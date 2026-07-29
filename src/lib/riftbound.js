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

async function fetchRiftboundJson(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function fetchRiftboundAllPages(baseUrl, pageSize) {
  const size = Math.min(Math.max(1, pageSize), 100);
  let page = 1;
  let items = [];
  let totalPages = 1;

  while (page <= totalPages) {
    const separator = baseUrl.includes("?") ? "&" : "?";
    const url = `${baseUrl}${separator}size=${size}&page=${page}`;
    const json = await fetchRiftboundJson(url);
    const pageItems = json?.items ?? [];
    items = items.concat(pageItems);

    const pagesField = Number(json?.pages ?? 0);
    const totalField = Number(json?.total ?? 0);

    if (pagesField > 0) {
      totalPages = pagesField;
    } else if (totalField > 0) {
      totalPages = Math.ceil(totalField / size);
    } else if (pageItems.length < size) {
      break;
    } else {
      // If the API doesn't provide total/pages and still returns a full page,
      // keep fetching until a smaller page is found, but cap to avoid an infinite loop.
      totalPages = page + 5;
    }

    if (pageItems.length === 0) {
      break;
    }

    page += 1;
  }

  return items;
}

export async function buscarCartasRiftbound(query, pageSize = 100) {
  if (!query) return [];
  const size = Math.min(Math.max(1, pageSize), 100);

  const exactUrl = `https://api.riftcodex.com/cards/name?exact=${encodeURIComponent(query)}`;
  try {
    const exactItems = await fetchRiftboundAllPages(exactUrl, size);
    if (exactItems.length > 0) {
      return exactItems.map(formatRiftboundCardWithPrint);
    }
  } catch (e) {
    // fall back to fuzzy/search
  }

  const fuzzyUrl = `https://api.riftcodex.com/cards/name?fuzzy=${encodeURIComponent(query)}`;
  try {
    const fuzzyItems = await fetchRiftboundAllPages(fuzzyUrl, size);
    if (fuzzyItems.length > 0) {
      return fuzzyItems.map(formatRiftboundCardWithPrint);
    }
  } catch (e) {
    // fall back to search
  }

  const searchUrl = `https://api.riftcodex.com/cards/search?query=${encodeURIComponent(query)}`;
  try {
    const searchItems = await fetchRiftboundAllPages(searchUrl, size);
    return searchItems.map(formatRiftboundCardWithPrint);
  } catch (e) {
    return [];
  }
}

export async function buscarCartaRiftbound(nombre) {
  const resultados = await buscarCartasRiftbound(nombre, 1);
  return resultados.length > 0 ? resultados[0] : null;
}

export async function buscarPrintsRiftbound(query, pageSize = 100) {
  return buscarCartasRiftbound(query, pageSize);
}
