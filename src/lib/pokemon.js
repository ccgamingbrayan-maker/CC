const BASE = "https://api.pokemontcg.io/v2";
const API_KEY = import.meta.env.VITE_POKEMONTCG_API_KEY;

// La key va en el header X-Api-Key (sube el límite a 20.000 req/día).
function headers() {
  return API_KEY ? { "X-Api-Key": API_KEY } : {};
}

// De todas las variantes de precio de TCGplayer (holofoil, normal, reverse…)
// elige el primer "market" disponible. Devuelve USD o null.
function precioTcgplayer(card) {
  const variantes = card?.tcgplayer?.prices ?? {};
  for (const v of Object.values(variantes)) {
    if (v?.market != null) return v.market;
    if (v?.mid != null) return v.mid;
  }
  return null;
}

// Precio de referencia de Cardmarket (EUR).
function precioCardmarket(card) {
  const p = card?.cardmarket?.prices ?? {};
  return p.averageSellPrice ?? p.trendPrice ?? null;
}

// Convierte una carta cruda de la API al formato que usa el resto de la app.
function formatPokemonCard(card) {
  const usd = precioTcgplayer(card);
  const eur = precioCardmarket(card);
  const imagen = card.images?.large ?? card.images?.small ?? null;

  return {
    id: card.id,
    nombre: card.name,
    set: card.set?.name ?? null,
    numero: card.number ?? null,
    imagen,
    image_uris: {
      small: card.images?.small ?? null,
      normal: imagen,
      large: card.images?.large ?? null,
    },
    rarity: card.rarity ?? null,
    precios: { usd, eur, tix: null },
    url: card.tcgplayer?.url ?? card.cardmarket?.url ?? null,
    source: "pokemon",
    // Cuadrito "Compra esta carta en" (mismo formato que Scryfall).
    compra: {
      tcgplayer: { precio: usd, moneda: "USD", url: card.tcgplayer?.url ?? null },
      cardmarket: { precio: eur, moneda: "EUR", url: card.cardmarket?.url ?? null },
      cardhoarder: { precio: null, moneda: "TIX", url: null },
    },
  };
}

async function fetchPokemonJson(url) {
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) return null;
  return res.json();
}

// Todas las versiones (prints) que coincidan con el nombre. Usa comodín *nombre*
// para permitir búsquedas parciales, y ordena por lanzamiento más reciente.
export async function buscarPrintsPokemon(query, pageSize = 60) {
  if (!query) return [];
  const q = encodeURIComponent(`name:*${query}*`);
  const url = `${BASE}/cards?q=${q}&pageSize=${pageSize}&orderBy=-set.releaseDate`;
  const json = await fetchPokemonJson(url);
  if (!json || !Array.isArray(json.data)) return [];
  return json.data.map(formatPokemonCard);
}

// Primera coincidencia (para precargar la vista previa).
export async function buscarCartaPokemon(nombre) {
  const resultados = await buscarPrintsPokemon(nombre, 1);
  return resultados.length > 0 ? resultados[0] : null;
}
