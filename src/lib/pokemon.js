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

// La API de pokemontcg.io es inestable: alterna respuestas 200 con 500 y
// timeouts de forma intermitente (no es la key ni la query). Por eso pedimos
// con timeout por intento y REINTENTAMOS varias veces antes de rendirnos.
async function fetchPokemonJson(url, { intentos = 4, timeoutMs = 9000 } = {}) {
  for (let i = 0; i < intentos; i++) {
    const controlador = new AbortController();
    const t = setTimeout(() => controlador.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers: headers(), signal: controlador.signal });
      clearTimeout(t);
      if (res.ok) return res.json();
      // 500/502/503 → error transitorio del servidor: reintentar.
    } catch {
      clearTimeout(t);
      // timeout o error de red → reintentar.
    }
    // Pequeña espera creciente entre intentos (300ms, 600ms, 900ms…).
    if (i < intentos - 1) {
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  return null;
}

// Arma la query de búsqueda. Una sola palabra → comodín al final (prefijo,
// rápido). Varias palabras → frase exacta entre comillas (evita queries lentas
// que hacen fallar al servidor).
function construirQuery(query) {
  const t = query.trim().replace(/"/g, "");
  return t.includes(" ") ? `name:"${t}"` : `name:${t}*`;
}

// Todas las versiones (prints) que coincidan con el nombre, más recientes primero.
export async function buscarPrintsPokemon(query, pageSize = 40) {
  if (!query) return [];
  const q = encodeURIComponent(construirQuery(query));
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
