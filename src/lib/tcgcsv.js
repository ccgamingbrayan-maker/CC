

const BASE = "/tcgcsv/tcgplayer";

// Categorías de accesorios que nos interesan (ids reales de TCGplayer).
export const CATEGORIAS_ACCESORIOS = [
  { id: 31, nombre: "Fundas (Card Sleeves)" },
  { id: 32, nombre: "Deck Boxes" },
  { id: 35, nombre: "Playmats" },
  { id: 34, nombre: "Life Counters" },
  { id: 50, nombre: "Storage Albums" },
  { id: 14, nombre: "Supplies (general)" },
];

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  // TCGCSV envuelve todo en { success, errors, results: [...] }
  return json?.results ?? json;
}

// Lee un campo del extendedData (Color, Manufacturer, SKU, ...).
function ext(product, nombreCampo) {
  const campo = (product.extendedData ?? []).find(
    (d) => String(d.name).toLowerCase() === nombreCampo.toLowerCase()
  );
  return campo?.value ?? null;
}

// Lista los grupos (marcas / líneas) de una categoría, ordenados A-Z.
export async function listarGrupos(categoriaId) {
  const data = await fetchJson(`${BASE}/${categoriaId}/groups`);
  if (!Array.isArray(data)) return [];
  return data
    .map((g) => ({ id: g.groupId, nombre: g.name }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

// Trae los productos de un grupo, ya normalizados y con precio de referencia.
export async function listarProductos(categoriaId, grupoId) {
  const [productos, precios] = await Promise.all([
    fetchJson(`${BASE}/${categoriaId}/${grupoId}/products`),
    fetchJson(`${BASE}/${categoriaId}/${grupoId}/prices`),
  ]);
  if (!Array.isArray(productos)) return [];

  // Mapa productId -> marketPrice (USD) para cruzar con cada producto.
  const precioPorId = new Map();
  for (const p of precios ?? []) {
    if (p.marketPrice != null && !precioPorId.has(p.productId)) {
      precioPorId.set(p.productId, p.marketPrice);
    }
  }

  return productos.map((p) => ({
    id: p.productId,
    nombre: p.name,
    imagen: p.imageUrl ?? null,
    color: ext(p, "Color"),
    fabricante: ext(p, "Manufacturer"),
    sku: ext(p, "SKU"),
    url: p.url ?? null,
    precios: { usd: precioPorId.get(p.productId) ?? null },
  }));
}


