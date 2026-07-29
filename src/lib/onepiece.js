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
