function formatOnePieceCard(card) {
  return {
    id: card.card_image_id ?? card.card_set_id ?? card.card_name ?? null,
    nombre: card.card_name ?? card.name ?? null,
    set: card.set_name ?? card.set ?? null,
    numero: card.card_set_id ?? card.card_number ?? null,
    imagen: card.card_image ?? card.card_image_url ?? null,
    precios: {
      usd: card.inventory_price != null ? Number(card.inventory_price) : null,
      eur: card.market_price != null ? Number(card.market_price) : null,
      tix: null,
    },
    texto: card.card_text ?? card.text ?? null,
    rarity: card.rarity ?? null,
    color: card.card_color ?? card.color ?? null,
  };
}

async function fetchOnePieceJson(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Búsqueda DIRECTA por código Bandai (card_set_id) — Máxima precisión.
 * Usa el endpoint /api/sets/card/{card_id}/ que devuelve la carta exacta.
 * También busca variantes (_P1, _P2, etc.) del mismo código.
 *
 * @param {string} codigoBandai - código como "OP05-088", "ST01-001", "P-041"
 * @returns {Promise<Array>} - array de cartas encontradas (incluye variantes)
 */
export async function buscarPorCodigoBandai(codigoBandai) {
  if (!codigoBandai) return [];

  const codigo = codigoBandai.trim().toUpperCase();
  const resultados = [];
  const idsVistos = new Set();

  // 1. Búsqueda directa por código exacto
  const directUrl = `https://www.optcgapi.com/api/sets/card/${encodeURIComponent(codigo)}/`;
  const directResult = await fetchOnePieceJson(directUrl);

  if (directResult) {
    // Puede ser un objeto o un array
    const cards = Array.isArray(directResult) ? directResult : [directResult];
    for (const card of cards) {
      if (card && (card.card_name || card.card_set_id)) {
        const formatted = formatOnePieceCard(card);
        const key = formatted.id || formatted.imagen || `${formatted.numero}_${formatted.nombre}`;
        if (!idsVistos.has(key)) {
          idsVistos.add(key);
          resultados.push(formatted);
        }
      }
    }
  }

  // 2. Buscar variantes paralelas (_P1, _P2, etc.) si se encontró la base
  const varianteSuffixes = ["_P1", "_P2", "_P3", "_P4"];
  const variantePromises = varianteSuffixes.map(async (suffix) => {
    try {
      const varUrl = `https://www.optcgapi.com/api/sets/card/${encodeURIComponent(codigo + suffix)}/`;
      const varResult = await fetchOnePieceJson(varUrl);
      if (varResult) {
        const cards = Array.isArray(varResult) ? varResult : [varResult];
        return cards
          .filter((c) => c && (c.card_name || c.card_set_id))
          .map(formatOnePieceCard);
      }
    } catch {
      // Variante no existe — normal
    }
    return [];
  });

  const variantesResults = await Promise.all(variantePromises);
  for (const vars of variantesResults) {
    for (const v of vars) {
      const key = v.id || v.imagen || `${v.numero}_${v.nombre}`;
      if (!idsVistos.has(key)) {
        idsVistos.add(key);
        resultados.push(v);
      }
    }
  }

  // 3. Fallback: si el lookup directo falló, buscar por nombre en /sets/filtered
  // usando el código como query (a veces card_name contiene el código)
  if (resultados.length === 0) {
    const fallback = await buscarCartasOnePiece(codigo);
    if (fallback && fallback.length > 0) {
      for (const c of fallback) {
        const key = c.id || c.imagen || `${c.numero}_${c.nombre}`;
        if (!idsVistos.has(key)) {
          idsVistos.add(key);
          resultados.push(c);
        }
      }
    }
  }

  return resultados;
}

export async function buscarCartasOnePiece(query) {
  if (!query) return [];
  const url = `https://www.optcgapi.com/api/sets/filtered/?card_name=${encodeURIComponent(query)}`;
  const json = await fetchOnePieceJson(url);
  if (!json || !Array.isArray(json)) return [];
  return json.map(formatOnePieceCard);
}

export async function buscarCartaOnePiece(nombre) {
  const resultados = await buscarCartasOnePiece(nombre);
  return resultados.length > 0 ? resultados[0] : null;
}

export async function buscarPrintsOnePiece(query) {
  return buscarCartasOnePiece(query);
}

// Starter Decks / Structures endpoints
export async function fetchAllDecks() {
  const url = `https://www.optcgapi.com/api/allDecks/`;
  const json = await fetchOnePieceJson(url);
  return Array.isArray(json) ? json : [];
}

export async function buscarDecksFiltered(query) {
  if (!query) return [];
  const url = `https://www.optcgapi.com/api/decks/filtered/?card_name=${encodeURIComponent(query)}`;
  const json = await fetchOnePieceJson(url);
  if (!json || !Array.isArray(json)) return [];
  return json.map(formatOnePieceCard);
}

export async function buscarDeckCardsById(st_id) {
  if (!st_id) return [];
  const url = `https://www.optcgapi.com/api/decks/${encodeURIComponent(st_id)}/`;
  const json = await fetchOnePieceJson(url);
  if (!json || !Array.isArray(json)) return [];
  return json.map(formatOnePieceCard);
}

// Don!! endpoints
export async function fetchAllDonCards() {
  const url = `https://www.optcgapi.com/api/allDonCards/`;
  const json = await fetchOnePieceJson(url);
  if (!json || !Array.isArray(json)) return [];
  return json.map(formatOnePieceCard);
}

export async function buscarDonFiltered(query) {
  if (!query) return [];
  const url = `https://www.optcgapi.com/api/don/filtered/?card_name=${encodeURIComponent(query)}`;
  const json = await fetchOnePieceJson(url);
  if (!json || !Array.isArray(json)) return [];
  return json.map(formatOnePieceCard);
}

// Promos endpoints
export async function fetchAllPromos() {
  const url = `https://www.optcgapi.com/api/allPromos/`;
  const json = await fetchOnePieceJson(url);
  if (!json || !Array.isArray(json)) return [];
  return json.map(formatOnePieceCard);
}

export async function buscarPromosFiltered(query) {
  if (!query) return [];
  const url = `https://www.optcgapi.com/api/promos/filtered/?card_name=${encodeURIComponent(query)}`;
  const json = await fetchOnePieceJson(url);
  if (!json || !Array.isArray(json)) return [];
  return json.map(formatOnePieceCard);
}
