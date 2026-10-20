import { supabase } from "./supabase.js";

const LOCAL_STORAGE_KEY = "cc_torneos_db_v2";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const TORNEOS_INICIALES = [
  {
    id: "torneo-1",
    nombre: "Torneo Store Championship OP-09 (Bandai TCG+)",
    juego: "One Piece TCG",
    juegoId: 1,
    formato: "Estándar Suizo (4 Rondas)",
    fecha: "2026-10-24T15:00",
    lugar: "Sede Capsule Corp Gaming - Cali (Cra 34 # 4-50)",
    costoInscripcion: 26000,
    cupoMaximo: 24,
    premios: "Premiación oficial One Piece: Top 4 en Sobres OP-09 (1°: Winner + 5 sobres, 2°: 3 sobres, 3°: 2 sobres, 4°: 1 sobre), 1 Tournament Pack oficial a todos y 1 Sobre OP-09 rifado entre los no-top.",
    pozoPremios: 0,
    esquemaPremios: "top4_standard",
    gastosEvento: 50000,
    estado: "finalizado",
    notas: "Torneo oficial reportado en Bandai TCG+. Registro y emparejamientos automáticos.",
    ganadorRifa: {
      id: "p-7",
      nombre: "[BC] Reikuniga",
      nickname: "[BC] Reikuniga",
      puesto: "7",
    },
    participantes: [
      {
        id: "p-1",
        nombre: "[BC] JackPoe",
        nickname: "[BC] JackPoe",
        bandaiId: "0000205267",
        puntos: 12,
        omw: "52%",
        deck: "Luffy Red-Purple",
        montoPagado: 26000,
        estadoPago: "pagado",
        puesto: "1",
        premioGanado: "1x Sobre Winner Oficial + 5x Sobres Oficiales OP-09 + 1x Tournament Pack",
        notas: "Campeón del torneo"
      },
      {
        id: "p-2",
        nombre: "danieldlora",
        nickname: "danieldlora",
        bandaiId: "0000780406",
        puntos: 9,
        omw: "64.5%",
        deck: "Doflamingo Blue",
        montoPagado: 26000,
        estadoPago: "pagado",
        puesto: "2",
        premioGanado: "3x Sobres Oficiales OP-09 + 1x Tournament Pack",
        notas: "Subcampeón"
      },
      {
        id: "p-3",
        nombre: "Niñojackie",
        nickname: "Niñojackie",
        bandaiId: "0000014931",
        puntos: 9,
        omw: "52%",
        deck: "Rob Lucci Black",
        montoPagado: 26000,
        estadoPago: "pagado",
        puesto: "3",
        premioGanado: "2x Sobres Oficiales OP-09 + 1x Tournament Pack",
        notas: "Top 4"
      },
      {
        id: "p-4",
        nombre: "Lythrick",
        nickname: "Lythrick",
        bandaiId: "0000934049",
        puntos: 6,
        omw: "64.5%",
        deck: "Zoro Green",
        montoPagado: 26000,
        estadoPago: "pagado",
        puesto: "4",
        premioGanado: "1x Sobres Oficiales OP-09 + 1x Tournament Pack",
        notas: "Top 4"
      },
      {
        id: "p-5",
        nombre: "SirCrocodile",
        nickname: "SirCrocodile",
        bandaiId: "0000138670",
        puntos: 6,
        omw: "62.5%",
        deck: "Crocodile Yellow",
        montoPagado: 26000,
        estadoPago: "pagado",
        puesto: "5",
        premioGanado: "1x Tournament Pack",
        notas: "Top 8"
      },
      {
        id: "p-6",
        nombre: "S3ph1",
        nickname: "S3ph1",
        bandaiId: "0000029497",
        puntos: 6,
        omw: "52%",
        deck: "Enel Yellow",
        montoPagado: 26000,
        estadoPago: "pagado",
        puesto: "6",
        premioGanado: "1x Tournament Pack",
        notas: "Top 8"
      },
      {
        id: "p-7",
        nombre: "[BC] Reikuniga",
        nickname: "[BC] Reikuniga",
        bandaiId: "0000569050",
        puntos: 6,
        omw: "47.8%",
        deck: "Law Red-Green",
        montoPagado: 26000,
        estadoPago: "pagado",
        puesto: "7",
        premioGanado: "1x Tournament Pack + 1x Sobres Oficiales OP-09 (Ganador Rifa)",
        notas: "Top 8 - Ganador de la Rifa de Sobre"
      },
      {
        id: "p-8",
        nombre: "Spicynuggets73",
        nickname: "Spicynuggets73",
        bandaiId: "0000148790",
        puntos: 6,
        omw: "45.8%",
        deck: "Katakuri Yellow",
        montoPagado: 26000,
        estadoPago: "pagado",
        puesto: "8",
        premioGanado: "1x Tournament Pack",
        notas: "Top 8"
      },
      {
        id: "p-9",
        nombre: "[BC] Glauser",
        nickname: "[BC] Glauser",
        bandaiId: "0000419822",
        puntos: 6,
        omw: "41.5%",
        deck: "Yamato Green-Yellow",
        montoPagado: 26000,
        estadoPago: "pagado",
        puesto: "9",
        premioGanado: "1x Tournament Pack",
        notas: ""
      },
      {
        id: "p-10",
        nombre: "Nicko22",
        nickname: "Nicko22",
        bandaiId: "0001003598",
        puntos: 3,
        omw: "62.5%",
        deck: "Nami Blue",
        montoPagado: 26000,
        estadoPago: "pagado",
        puesto: "10",
        premioGanado: "1x Tournament Pack",
        notas: ""
      },
      {
        id: "p-11",
        nombre: "Lavendertownboy",
        nickname: "Lavendertownboy",
        bandaiId: "0000934053",
        puntos: 3,
        omw: "58.3%",
        deck: "Uta Green",
        montoPagado: 26000,
        estadoPago: "pagado",
        puesto: "11",
        premioGanado: "1x Tournament Pack",
        notas: ""
      },
      {
        id: "p-12",
        nombre: "[BC] Arenas",
        nickname: "[BC] Arenas",
        bandaiId: "0000120197",
        puntos: 0,
        omw: "45.8%",
        deck: "Whitebeard Red",
        montoPagado: 26000,
        estadoPago: "pagado",
        puesto: "12",
        premioGanado: "1x Tournament Pack",
        notas: ""
      }
    ],
  },
  {
    id: "torneo-2",
    nombre: "Torneo Inaugural Riftbound TCG: Origins",
    juego: "Riftbound TCG",
    juegoId: 2,
    formato: "Construido 1v1 Suizo",
    fecha: "2026-10-25T14:30",
    lugar: "Sede Capsule Corp Gaming - Cali (Cra 34 # 4-50)",
    costoInscripcion: 25000,
    cupoMaximo: 16,
    premios: "1er Lugar: Pack de cartas promocionales foil exclusivas + $100.000 COP en crédito de tienda. Top 4: Cartas promo oficiales.",
    pozoPremios: 200000,
    esquemaPremios: "top4_standard",
    gastosEvento: 80000,
    estado: "proximo",
    notas: "¡El primer evento oficial presencial de Riftbound en la ciudad! Se prestan mazos para nuevos jugadores.",
    participantes: [
      {
        id: "p-13",
        nombre: "Brayan CC",
        nickname: "brayan_maker",
        email: "ccgamingbrayan@gmail.com",
        telefono: "3123456789",
        deck: "Ahri / Yasuo Aggro",
        montoPagado: 25000,
        estadoPago: "pagado",
        puesto: "1",
        premioGanado: "$100.000 COP + Pack Foil Promocional",
        notas: "Organizador"
      },
      {
        id: "p-14",
        nombre: "David Correa",
        nickname: "david_correa",
        email: "david.correa@gmail.com",
        telefono: "3186543210",
        deck: "Master Yi Wuju Control",
        montoPagado: 25000,
        estadoPago: "pagado",
        puesto: "2",
        premioGanado: "$60.000 COP + Cartas Promo",
        notas: ""
      },
      {
        id: "p-15",
        nombre: "Julián Castro",
        nickname: "jcastro",
        email: "julian.castro@gmail.com",
        telefono: "3119876543",
        deck: "Jinx Burn",
        montoPagado: 25000,
        estadoPago: "pagado",
        puesto: "3",
        premioGanado: "$20.000 COP + Cartas Promo",
        notas: ""
      },
      {
        id: "p-16",
        nombre: "Mateo Gómez",
        nickname: "mateo_rift",
        email: "mateo.gomez@gmail.com",
        telefono: "3127894561",
        deck: "Kaisa Void",
        montoPagado: 25000,
        estadoPago: "pagado",
        puesto: "4",
        premioGanado: "$20.000 COP + Cartas Promo",
        notas: ""
      }
    ],
  },
];

function cargarLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(TORNEOS_INICIALES));
      return TORNEOS_INICIALES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : TORNEOS_INICIALES;
  } catch (e) {
    return TORNEOS_INICIALES;
  }
}

function guardarLocal(torneos) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(torneos));
  } catch (e) {
    console.error("Error guardando torneos en localStorage:", e);
  }
}

/**
 * Mapea columnas desde Supabase (snake_case) al formato usado en la app (camelCase)
 */
export function mapTorneoDesdeSupabase(row) {
  if (!row) return row;
  return {
    ...row,
    juegoId: row.juego_id ?? row.juegoId,
    costoInscripcion: Number(row.costo_inscripcion ?? row.costoInscripcion ?? 0),
    cupoMaximo: Number(row.cupo_maximo ?? row.cupoMaximo ?? 16),
    pozoPremios: Number(row.pozo_premios ?? row.pozoPremios ?? 0),
    esquemaPremios: row.esquema_premios ?? row.esquemaPremios ?? "top4_standard",
    gastosEvento: Number(row.gastos_evento ?? row.gastosEvento ?? 0),
    actualizadoEn: row.actualizado_en ?? row.actualizadoEn,
    participantes: Array.isArray(row.participantes) ? row.participantes : [],
    productosPremios: Array.isArray(row.productos_premios)
      ? row.productos_premios
      : (Array.isArray(row.productosPremios) ? row.productosPremios : []),
  };
}

/**
 * Mapea un torneo a snake_case para guardar en Supabase PostgreSQL
 */
export function mapTorneoParaSupabase(t) {
  return {
    id: t.id,
    nombre: t.nombre,
    juego: t.juego,
    juego_id: t.juegoId || (t.juego?.includes("Riftbound") ? 2 : 1),
    formato: t.formato || "Estándar Suizo",
    fecha: t.fecha,
    lugar: t.lugar,
    costo_inscripcion: Number(t.costoInscripcion || 0),
    cupo_maximo: Number(t.cupoMaximo || 16),
    premios: t.premios || "",
    pozo_premios: Number(t.pozoPremios || 0),
    esquema_premios: t.esquemaPremios || "top4_standard",
    gastos_evento: Number(t.gastosEvento || 0),
    estado: t.estado || "proximo",
    notas: t.notas || "",
    participantes: t.participantes || [],
    productos_premios: t.productosPremios || [],
    actualizado_en: t.actualizadoEn || new Date().toISOString(),
  };
}

/**
 * Obtiene la lista completa de torneos (Backend > Supabase > LocalStorage)
 */
export async function listarTorneos() {
  // 1) Intentar Backend Express
  try {
    const res = await fetch(`${API_URL}/api/torneos`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        guardarLocal(data);
        return data;
      }
    }
  } catch (e) {}

  // 2) Intentar Supabase si existe tabla
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("torneos")
        .select("*")
        .order("fecha", { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapeados = data.map(mapTorneoDesdeSupabase);
        guardarLocal(mapeados);
        return mapeados;
      }
    }
  } catch (e) {}

  // 3) Respaldo local
  return cargarLocal();
}

/**
 * Guarda o actualiza un torneo
 */
export async function guardarTorneo(torneo) {
  const torneos = cargarLocal();
  const id = torneo.id || `torneo-${Date.now()}`;
  const registro = {
    ...torneo,
    id,
    participantes: torneo.participantes || [],
    costoInscripcion: Number(torneo.costoInscripcion || 0),
    cupoMaximo: Number(torneo.cupoMaximo || 16),
    pozoPremios: Number(torneo.pozoPremios || 0),
    gastosEvento: Number(torneo.gastosEvento || 0),
    actualizadoEn: new Date().toISOString(),
  };

  const index = torneos.findIndex((t) => t.id === id);
  if (index >= 0) {
    torneos[index] = registro;
  } else {
    torneos.unshift(registro);
  }
  guardarLocal(torneos);

  // Sincronizar en Backend
  try {
    await fetch(`${API_URL}/api/torneos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registro),
      signal: AbortSignal.timeout(3000),
    });
  } catch (e) {}

  // Sincronizar en Supabase
  try {
    if (supabase) {
      const payloadSupabase = mapTorneoParaSupabase(registro);
      await supabase.from("torneos").upsert(payloadSupabase);
    }
  } catch (e) {}

  return registro;
}

/**
 * Elimina un torneo
 */
export async function eliminarTorneo(id) {
  const torneos = cargarLocal().filter((t) => t.id !== id);
  guardarLocal(torneos);

  try {
    await fetch(`${API_URL}/api/torneos/${id}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(3000),
    });
  } catch (e) {}

  try {
    if (supabase) {
      await supabase.from("torneos").delete().eq("id", id);
    }
  } catch (e) {}

  return true;
}

/**
 * Agrega o actualiza un participante en un torneo
 */
export async function guardarParticipante(torneoId, participante) {
  const torneos = cargarLocal();
  const tIndex = torneos.findIndex((t) => t.id === torneoId);
  if (tIndex < 0) return null;

  const torneo = torneos[tIndex];
  const participantes = torneo.participantes || [];
  const pId = participante.id || `p-${Date.now()}`;

  const costo = Number(torneo.costoInscripcion || 0);
  const pagado = Number(participante.montoPagado || 0);
  let estadoPago = participante.estadoPago;
  if (!estadoPago) {
    if (pagado >= costo) estadoPago = "pagado";
    else if (pagado > 0) estadoPago = "abono";
    else estadoPago = "debe";
  }

  const pRegistro = {
    ...participante,
    id: pId,
    nombre: participante.nombre || "Jugador",
    email: (participante.email || "").toLowerCase().trim(),
    telefono: participante.telefono || "",
    deck: participante.deck || "",
    montoPagado: pagado,
    estadoPago,
    puesto: participante.puesto || "",
    premioGanado: participante.premioGanado || "",
    notas: participante.notas || "",
  };

  const pIndex = participantes.findIndex((p) => p.id === pId);
  if (pIndex >= 0) {
    participantes[pIndex] = pRegistro;
  } else {
    participantes.push(pRegistro);
  }

  torneo.participantes = participantes;
  torneos[tIndex] = torneo;
  guardarLocal(torneos);

  // Sincronizar backend
  try {
    await fetch(`${API_URL}/api/torneos/${torneoId}/participantes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pRegistro),
      signal: AbortSignal.timeout(3000),
    });
  } catch (e) {}

  return torneo;
}

/**
 * Elimina un participante de un torneo
 */
export async function eliminarParticipante(torneoId, participanteId) {
  const torneos = cargarLocal();
  const tIndex = torneos.findIndex((t) => t.id === torneoId);
  if (tIndex < 0) return null;

  torneos[tIndex].participantes = (torneos[tIndex].participantes || []).filter(
    (p) => p.id !== participanteId
  );
  guardarLocal(torneos);

  try {
    await fetch(`${API_URL}/api/torneos/${torneoId}/participantes/${participanteId}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(3000),
    });
  } catch (e) {}

  return torneos[tIndex];
}

export const CATALOGO_PREMIOS_INICIALES = [
  {
    id: "premio-winner-kit",
    nombre: "Sobre Winner Oficial Bandai (Kits Mensuales)",
    juego: "One Piece TCG",
    categoria: "Kits de Torneo",
    imagen: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&q=80",
    stock: 7,
    valorCop: 0,
    notas: "Sobre Winner exclusivo entregado por Bandai (7 kits al mes). 1 por torneo para el 1er lugar.",
  },
  {
    id: "premio-tournament-pack",
    nombre: "Tournament Pack Participante (Kits Mensuales)",
    juego: "One Piece TCG",
    categoria: "Sobres de Torneo",
    imagen: "https://images.unsplash.com/photo-1578374173705-969cbe6f2d6b?w=300&q=80",
    stock: 56,
    valorCop: 0,
    notas: "8 sobres por kit (56 sobres al mes). 1 por jugador inscrito hasta agotar stock mensual.",
  },
  {
    id: "premio-sobres-op09",
    nombre: "Sobres Oficiales OP-09 (Tienda)",
    juego: "One Piece TCG",
    categoria: "Sobres",
    imagen: "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=300&q=80",
    stock: 96,
    valorCop: 22000,
    notas: "Sobres de tienda para premiación del Top y el sobre de rifa obligatorio (1 sobre por cada jugador de $26.000).",
  },
  {
    id: "premio-box-op09",
    nombre: "Booster Box One Piece OP-09 (Sellada)",
    juego: "One Piece TCG",
    categoria: "Cajas / Displays",
    imagen: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&q=80",
    stock: 4,
    valorCop: 450000,
    notas: "Para eventos especiales de caja o Championships anuales.",
  },
  {
    id: "premio-playmat-champ",
    nombre: "Playmat de Neopreno Store Championship",
    juego: "One Piece TCG",
    categoria: "Playmats",
    imagen: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80",
    stock: 5,
    valorCop: 90000,
    notas: "Tapete con bordes cosidos y zona de juego oficial",
  },
  {
    id: "premio-riftbound-starter",
    nombre: "Display Starter Riftbound TCG",
    juego: "Riftbound TCG",
    categoria: "Cajas / Displays",
    imagen: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80",
    stock: 6,
    valorCop: 380000,
    notas: "Display para premiación de torneos Riftbound",
  },
];

const CATALOGO_PREMIOS_KEY = "cc_catalogo_premios_v1";

function cargarCatalogoLocal() {
  try {
    const raw = localStorage.getItem(CATALOGO_PREMIOS_KEY);
    if (!raw) {
      localStorage.setItem(CATALOGO_PREMIOS_KEY, JSON.stringify(CATALOGO_PREMIOS_INICIALES));
      return CATALOGO_PREMIOS_INICIALES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : CATALOGO_PREMIOS_INICIALES;
  } catch (e) {
    return CATALOGO_PREMIOS_INICIALES;
  }
}

function guardarCatalogoLocal(data) {
  try {
    localStorage.setItem(CATALOGO_PREMIOS_KEY, JSON.stringify(data));
  } catch (e) {}
}

export async function listarCatalogoPremios() {
  const local = cargarCatalogoLocal();
  try {
    if (supabase) {
      const { data, error } = await supabase.from("catalogo_premios").select("*").order("creado_en", { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapeados = data.map((d) => ({
          id: d.id,
          nombre: d.nombre,
          juego: d.juego || "One Piece TCG",
          categoria: d.categoria || "Sobres",
          imagen: d.imagen || "",
          stock: Number(d.stock ?? 0),
          valorCop: Number(d.valor_cop ?? 0),
          notas: d.notas || "",
        }));
        guardarCatalogoLocal(mapeados);
        return mapeados;
      }
    }
  } catch (e) {}
  return local;
}

export async function guardarProductoCatalogo(producto) {
  const catalogo = cargarCatalogoLocal();
  const id = producto.id || `premio-${Date.now()}`;
  const registro = {
    ...producto,
    id,
    nombre: (producto.nombre || "").trim(),
    juego: producto.juego || "One Piece TCG",
    categoria: producto.categoria || "Sobres",
    imagen: producto.imagen || "",
    stock: Math.max(0, parseInt(producto.stock, 10) || 0),
    valorCop: Number(producto.valorCop || 0),
    notas: (producto.notas || "").trim(),
    actualizadoEn: new Date().toISOString(),
  };

  const idx = catalogo.findIndex((p) => p.id === id);
  if (idx >= 0) {
    catalogo[idx] = registro;
  } else {
    registro.creadoEn = new Date().toISOString();
    catalogo.unshift(registro);
  }

  guardarCatalogoLocal(catalogo);

  try {
    if (supabase) {
      await supabase.from("catalogo_premios").upsert({
        id: registro.id,
        nombre: registro.nombre,
        juego: registro.juego,
        categoria: registro.categoria,
        imagen: registro.imagen,
        stock: registro.stock,
        valor_cop: registro.valorCop,
        notas: registro.notas,
        actualizado_en: new Date().toISOString(),
      });
    }
  } catch (e) {}

  return registro;
}

export async function eliminarProductoCatalogo(id) {
  let catalogo = cargarCatalogoLocal();
  catalogo = catalogo.filter((p) => p.id !== id);
  guardarCatalogoLocal(catalogo);

  try {
    if (supabase) {
      await supabase.from("catalogo_premios").delete().eq("id", id);
    }
  } catch (e) {}

  return catalogo;
}

export async function ajustarStockCatalogo(id, delta) {
  const catalogo = cargarCatalogoLocal();
  const idx = catalogo.findIndex((p) => p.id === id);
  if (idx < 0) return null;

  catalogo[idx].stock = Math.max(0, (catalogo[idx].stock || 0) + delta);
  guardarCatalogoLocal(catalogo);

  try {
    if (supabase) {
      await supabase.from("catalogo_premios").update({
        stock: catalogo[idx].stock,
        actualizado_en: new Date().toISOString(),
      }).eq("id", id);
    }
  } catch (e) {}

  return catalogo[idx];
}

/**
 * Descuenta automáticamente del catálogo de premios los productos asignados a los ganadores de un torneo
 */
export async function descontarStockCatalogoPorTorneo(torneoId) {
  const torneos = cargarLocal();
  const tIndex = torneos.findIndex((t) => t.id === torneoId);
  if (tIndex < 0) return { error: "Torneo no encontrado" };

  const torneo = torneos[tIndex];
  const participantes = torneo.participantes || [];
  const catalogo = cargarCatalogoLocal();

  const aDescontarMap = {};

  for (const p of participantes) {
    const prods = p.productosPremios || [];
    for (const pr of prods) {
      const cantidad = Math.max(1, Number(pr.cantidad) || 1);
      const catItem = catalogo.find(
        (c) => c.id === pr.catalogoId || c.id === pr.id || c.nombre.toLowerCase().trim() === pr.nombre.toLowerCase().trim()
      );

      if (catItem) {
        aDescontarMap[catItem.id] = (aDescontarMap[catItem.id] || 0) + cantidad;
      }
    }
  }

  const itemsDescontados = [];

  for (const [catId, cant] of Object.entries(aDescontarMap)) {
    const idx = catalogo.findIndex((c) => c.id === catId);
    if (idx >= 0) {
      const stockAnterior = catalogo[idx].stock || 0;
      const nuevoStock = Math.max(0, stockAnterior - cant);
      catalogo[idx].stock = nuevoStock;
      itemsDescontados.push({
        id: catId,
        nombre: catalogo[idx].nombre,
        descontado: cant,
        stockRestante: nuevoStock,
      });

      try {
        if (supabase) {
          await supabase.from("catalogo_premios").update({
            stock: nuevoStock,
            actualizado_en: new Date().toISOString(),
          }).eq("id", catId);
        }
      } catch (e) {}
    }
  }

  guardarCatalogoLocal(catalogo);

  torneo.stockPremiosDescontado = true;
  torneo.fechaUltimoDescuentoStock = new Date().toISOString();
  torneos[tIndex] = torneo;
  guardarLocal(torneos);

  try {
    await guardarTorneo(torneo);
  } catch (e) {}

  return { torneo, itemsDescontados, catalogo };
}

/**
 * Guarda o actualiza los productos de premiación configurados para un torneo
 */
export async function guardarProductosPremiosTorneo(torneoId, productos) {
  const torneos = cargarLocal();
  const tIndex = torneos.findIndex((t) => t.id === torneoId);
  if (tIndex < 0) return null;

  torneos[tIndex].productosPremios = productos;
  guardarLocal(torneos);

  // Intentar sincronizar con backend Express
  try {
    await fetch(`${API_URL}/api/torneos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(torneos[tIndex]),
      signal: AbortSignal.timeout(3000),
    });
  } catch (e) {}

  // Intentar sincronizar con Supabase
  try {
    if (supabase) {
      await supabase.from("torneos").update({
        productos_premios: productos,
        actualizado_en: new Date().toISOString(),
      }).eq("id", torneoId);
    }
  } catch (e) {}

  return torneos[tIndex];
}

/**
 * Asigna automáticamente los productos de premiación a los participantes según su puesto
 * y descuenta automáticamente las unidades del Catálogo de Premios
 */
export async function asignarProductosPremiosTorneo(torneoId, { descontarStock = true } = {}) {
  const torneos = cargarLocal();
  const tIndex = torneos.findIndex((t) => t.id === torneoId);
  if (tIndex < 0) return null;

  const torneo = torneos[tIndex];
  const productos = torneo.productosPremios || [];
  const participantes = torneo.participantes || [];

  if (productos.length === 0 || participantes.length === 0) return { torneo, itemsDescontados: [] };

  const actualizados = participantes.map((p) => {
    const rawPuesto = String(p.puesto || "").toLowerCase().trim();
    const numPuesto = parseInt(rawPuesto.replace(/\D/g, ""), 10);

    // Buscar productos que le corresponden a su puesto
    const productosGanados = productos.filter((prod) => {
      const puestoProd = String(prod.puesto || "").toLowerCase().trim();
      if (puestoProd === "todos" || puestoProd === "participacion" || puestoProd === "participante") {
        return true;
      }
      if (numPuesto && String(numPuesto) === puestoProd) {
        return true;
      }
      if (puestoProd === "top4" && numPuesto >= 1 && numPuesto <= 4) {
        return true;
      }
      if (puestoProd === "top8" && numPuesto >= 1 && numPuesto <= 8) {
        return true;
      }
      return false;
    });

    if (productosGanados.length > 0) {
      const resumenTextual = productosGanados
        .map((pr) => `${pr.cantidad > 1 ? pr.cantidad + "x " : ""}${pr.nombre}`)
        .join(" + ");

      return {
        ...p,
        productosPremios: productosGanados,
        premioGanado: resumenTextual,
      };
    }

    return p;
  });

  torneo.participantes = actualizados;
  torneos[tIndex] = torneo;
  guardarLocal(torneos);

  let itemsDescontados = [];
  if (descontarStock) {
    const res = await descontarStockCatalogoPorTorneo(torneoId);
    itemsDescontados = res.itemsDescontados || [];
  }

  try {
    await guardarTorneo(torneo);
  } catch (e) {}

  return { torneo, itemsDescontados };
}

/**
 * REGLAS OFICIALES DE PREMIACIÓN CAPSULE CORP GAMING (ONE PIECE TCG):
 * - 7 Kits oficiales mensuales de Bandai: cada kit = 1 sobre Winner + 8 tournament packs de participante (56 al mes).
 *   Se entregan hasta agotar el stock mensual de kits.
 * - Inscripción base de One Piece: $26.000 COP (1 sobre de tienda por jugador inscrito al pozo).
 * - RIFA OBLIGATORIA: En TODOS los torneos se reserva 1 sobre de tienda para rifarse entre los que NO quedaron en Top 4.
 * - Premiación al Top:
 *   - Si <= 12 jugadores: Se premia al Top 4 con los sobres de tienda restantes.
 *     El 1er lugar recibe además 1 Sobre Winner Oficial (del kit).
 *   - Si > 12 jugadores: La premiación en sobres de tienda se extiende hasta Top 5 o Top 6.
 * - Participación: Todos los participantes reciben 1 Tournament Pack oficial (del kit mensual).
 */
export function calcularPremiacionOficialOnePiece(numJugadores, stockCatalogo = {}) {
  const n = Math.max(0, parseInt(numJugadores, 10) || 0);
  if (n === 0) {
    return {
      numJugadores: 0,
      totalSobresTienda: 0,
      sobresRifa: 0,
      sobresTop: 0,
      puestosPremiados: 4,
      esTopExtendido: false,
      sobresPorPuesto: {},
    };
  }

  // 1 sobre de tienda por jugador inscrito ($26.000 COP c/u)
  const totalSobresTienda = n;

  // 1 sobre siempre reservado para la rifa (si hay al menos 4 jugadores)
  const sobresRifa = n >= 4 ? 1 : 0;
  const sobresTop = Math.max(0, totalSobresTienda - sobresRifa);

  // Si > 12 personas, alcanza hasta top 5 o top 6
  const esTopExtendido = n > 12;
  const puestosPremiados = esTopExtendido ? (n >= 16 ? 6 : 5) : Math.min(4, n);

  const sobresPorPuesto = {};

  if (puestosPremiados === 4) {
    // Para 12 jugadores (11 sobres top): 1°=5, 2°=3, 3°=2, 4°=1 (5+3+2+1 = 11)
    // Para 8 jugadores (7 sobres top): 1°=3, 2°=2, 3°=1, 4°=1 (3+2+1+1 = 7)
    // Para 10 jugadores (9 sobres top): 1°=4, 2°=3, 3°=1, 4°=1 (4+3+1+1 = 9)
    if (sobresTop <= 4) {
      sobresPorPuesto[1] = Math.max(1, sobresTop - 1);
      sobresPorPuesto[2] = sobresTop >= 2 ? 1 : 0;
      sobresPorPuesto[3] = 0;
      sobresPorPuesto[4] = 0;
    } else {
      sobresPorPuesto[1] = Math.max(1, Math.round(sobresTop * 0.45));
      sobresPorPuesto[2] = Math.max(1, Math.round(sobresTop * 0.28));
      sobresPorPuesto[3] = Math.max(1, Math.round(sobresTop * 0.18));
      sobresPorPuesto[4] = Math.max(1, sobresTop - (sobresPorPuesto[1] + sobresPorPuesto[2] + sobresPorPuesto[3]));
    }
  } else if (puestosPremiados === 5) {
    // Para 13-15 jugadores (ej: 14 jugadores -> 13 sobres top): 1°=5, 2°=3, 3°=2, 4°=2, 5°=1
    sobresPorPuesto[1] = Math.max(1, Math.round(sobresTop * 0.40));
    sobresPorPuesto[2] = Math.max(1, Math.round(sobresTop * 0.25));
    sobresPorPuesto[3] = Math.max(1, Math.round(sobresTop * 0.16));
    sobresPorPuesto[4] = Math.max(1, Math.round(sobresTop * 0.12));
    sobresPorPuesto[5] = Math.max(1, sobresTop - (sobresPorPuesto[1] + sobresPorPuesto[2] + sobresPorPuesto[3] + sobresPorPuesto[4]));
  } else {
    // Top 6 para 16+ jugadores (ej: 16 jugadores -> 15 sobres top): 1°=6, 2°=3, 3°=2, 4°=2, 5°=1, 6°=1
    sobresPorPuesto[1] = Math.max(1, Math.round(sobresTop * 0.38));
    sobresPorPuesto[2] = Math.max(1, Math.round(sobresTop * 0.22));
    sobresPorPuesto[3] = Math.max(1, Math.round(sobresTop * 0.15));
    sobresPorPuesto[4] = Math.max(1, Math.round(sobresTop * 0.12));
    sobresPorPuesto[5] = 1;
    sobresPorPuesto[6] = Math.max(1, sobresTop - (sobresPorPuesto[1] + sobresPorPuesto[2] + sobresPorPuesto[3] + sobresPorPuesto[4] + sobresPorPuesto[5]));
  }

  // Ajustar la suma para cuadrar exactamente con sobresTop
  let suma = Object.values(sobresPorPuesto).reduce((a, b) => a + b, 0);
  while (suma > sobresTop && sobresPorPuesto[1] > 1) {
    sobresPorPuesto[1]--;
    suma--;
  }
  while (suma < sobresTop) {
    sobresPorPuesto[1]++;
    suma++;
  }

  return {
    numJugadores: n,
    totalSobresTienda,
    sobresRifa,
    sobresTop,
    puestosPremiados,
    esTopExtendido,
    sobresPorPuesto,
  };
}

/**
 * Aplica la premiación oficial al torneo según puestos, kits mensuales y sobres de tienda
 */
export async function aplicarPremiacionOficialTorneo(torneoId, { descontarStock = false } = {}) {
  const torneos = cargarLocal();
  const tIndex = torneos.findIndex((t) => t.id === torneoId);
  if (tIndex < 0) return null;

  const torneo = torneos[tIndex];
  const participantes = torneo.participantes || [];
  const catalogo = cargarCatalogoLocal();

  const prodWinner = catalogo.find((p) => p.categoria === "Kits de Torneo" || p.nombre.toLowerCase().includes("winner"));
  const prodPack = catalogo.find((p) => p.categoria === "Sobres de Torneo" || p.nombre.toLowerCase().includes("tournament pack"));
  const prodSobres = catalogo.find((p) => p.categoria === "Sobres" && p.juego === "One Piece TCG") || catalogo.find((p) => p.categoria === "Sobres");

  const stockWinner = prodWinner?.stock ?? 7;
  const stockPacks = prodPack?.stock ?? 56;

  const calculo = calcularPremiacionOficialOnePiece(participantes.length);

  const actualizados = participantes.map((p) => {
    const numP = parseInt(String(p.puesto || "").replace(/\D/g, ""), 10);
    const premiosItems = [];

    // Sobre Winner exclusivo para 1er lugar
    if (numP === 1 && stockWinner > 0) {
      premiosItems.push(prodWinner ? `1x ${prodWinner.nombre}` : "1x Sobre Winner Oficial");
    }

    // Sobres de tienda para el Top premiado
    const cantSobresTienda = calculo.sobresPorPuesto[numP];
    if (cantSobresTienda && cantSobresTienda > 0) {
      premiosItems.push(`${cantSobresTienda}x ${prodSobres?.nombre || "Sobres Oficiales OP-09"}`);
    }

    // Tournament pack de participación del kit mensual
    if (stockPacks > 0) {
      premiosItems.push(prodPack ? `1x ${prodPack.nombre}` : "1x Tournament Pack");
    }

    // Si este jugador ya era ganador de rifa
    if (torneo.ganadorRifa && torneo.ganadorRifa.id === p.id) {
      premiosItems.push(`1x ${prodSobres?.nombre || "Sobre Oficial OP-09"} (Ganador Rifa)`);
    }

    const textoPremio = premiosItems.join(" + ") || "1x Tournament Pack";

    return {
      ...p,
      montoPagado: Number(torneo.costoInscripcion || 26000),
      premioGanado: textoPremio,
    };
  });

  torneo.participantes = actualizados;
  torneos[tIndex] = torneo;
  guardarLocal(torneos);

  if (descontarStock) {
    await descontarStockCatalogoPorTorneo(torneoId);
  }

  try {
    await guardarTorneo(torneo);
  } catch (e) {}

  return torneo;
}

/**
 * Realiza el sorteo de 1 Sobre de Rifa entre los jugadores que no quedaron en el Top premiado
 */
export async function sortearRifaTorneo(torneoId) {
  const torneos = cargarLocal();
  const tIndex = torneos.findIndex((t) => t.id === torneoId);
  if (tIndex < 0) return { error: "Torneo no encontrado" };

  const torneo = torneos[tIndex];
  const participantes = torneo.participantes || [];
  const calculo = calcularPremiacionOficialOnePiece(participantes.length);

  // Jugadores elegibles: aquellos que NO están en los puestos premiados del Top
  const elegibles = participantes.filter((p) => {
    const numP = parseInt(String(p.puesto || "").replace(/\D/g, ""), 10);
    return !numP || numP > calculo.puestosPremiados;
  });

  if (elegibles.length === 0) {
    return { error: `No hay participantes fuera del Top ${calculo.puestosPremiados} para rifar.` };
  }

  // Selección aleatoria
  const ganadorIndex = Math.floor(Math.random() * elegibles.length);
  const ganador = elegibles[ganadorIndex];

  const catalogo = cargarCatalogoLocal();
  const prodSobres = catalogo.find((p) => p.categoria === "Sobres" && p.juego === "One Piece TCG") || catalogo.find((p) => p.categoria === "Sobres");
  const nombreSobre = prodSobres?.nombre || "Sobre Oficial OP-09";

  torneo.ganadorRifa = {
    id: ganador.id,
    nombre: ganador.nombre,
    nickname: ganador.nickname || ganador.nombre,
    puesto: ganador.puesto,
    fecha: new Date().toISOString(),
  };

  torneo.participantes = participantes.map((p) => {
    let premio = p.premioGanado || "";
    // Limpiar premio de rifa anterior si no es el ganador
    premio = premio.replace(/\s*\+\s*1x.*\(Ganador Rifa\)/gi, "").replace(/\s*\(Ganador Rifa\)/gi, "").trim();

    if (p.id === ganador.id) {
      premio = premio ? `${premio} + 1x ${nombreSobre} (Ganador Rifa)` : `1x ${nombreSobre} (Ganador Rifa)`;
    }

    return {
      ...p,
      premioGanado: premio,
    };
  });

  torneos[tIndex] = torneo;
  guardarLocal(torneos);

  try {
    await guardarTorneo(torneo);
  } catch (e) {}

  return { torneo, ganador };
}

/**
 * Carga o reinicia los 7 Kits Mensuales oficiales de Bandai en el catálogo
 * (7 Sobres Winner + 56 Tournament Packs participantes)
 */
export async function cargarKitsMensualesBandai() {
  const catalogo = cargarCatalogoLocal();
  const idxWinner = catalogo.findIndex((p) => p.id === "premio-winner-kit" || p.nombre.toLowerCase().includes("winner"));
  const idxPack = catalogo.findIndex((p) => p.id === "premio-tournament-pack" || p.nombre.toLowerCase().includes("tournament pack"));

  if (idxWinner >= 0) {
    catalogo[idxWinner].stock = 7;
  } else {
    catalogo.unshift({
      id: "premio-winner-kit",
      nombre: "Sobre Winner Oficial Bandai (Kits Mensuales)",
      juego: "One Piece TCG",
      categoria: "Kits de Torneo",
      stock: 7,
      valorCop: 0,
      notas: "7 kits al mes = 7 sobres Winner (1 por torneo para el 1er lugar)",
    });
  }

  if (idxPack >= 0) {
    catalogo[idxPack].stock = 56;
  } else {
    catalogo.unshift({
      id: "premio-tournament-pack",
      nombre: "Tournament Pack Participante (Kits Mensuales)",
      juego: "One Piece TCG",
      categoria: "Sobres de Torneo",
      stock: 56,
      valorCop: 0,
      notas: "7 kits al mes * 8 sobres = 56 sobres de participante",
    });
  }

  guardarCatalogoLocal(catalogo);
  return catalogo;
}

/**
 * Obtiene los torneos en los que ha participado un usuario
 */
export async function obtenerTorneosUsuario(user) {
  if (!user) return [];
  const todosTorneos = await listarTorneos();

  const userEmail = (user.email || "").toLowerCase().trim();
  const userNombre = (user.user_metadata?.nombre || "").toLowerCase().trim();
  const userNickname = (user.user_metadata?.nickname || "").toLowerCase().trim();
  const userTelefono = (user.user_metadata?.telefono || "").replace(/\D/g, "");

  const historial = [];

  for (const t of todosTorneos) {
    const participantes = t.participantes || [];
    for (const p of participantes) {
      const pEmail = (p.email || "").toLowerCase().trim();
      const pNombre = (p.nombre || "").toLowerCase().trim();
      const pNickname = (p.nickname || "").toLowerCase().trim();
      const pTelefono = (p.telefono || "").replace(/\D/g, "");

      const coincideEmail = userEmail && pEmail && userEmail === pEmail;
      const coincideTelefono = userTelefono && pTelefono && userTelefono === pTelefono;
      const coincideNombre = userNombre && pNombre && (userNombre === pNombre || pNombre.includes(userNombre));
      const coincideNickname = userNickname && (
        (pNickname && pNickname === userNickname) ||
        pNombre === userNickname ||
        pNombre.includes(userNickname) ||
        userNickname.includes(pNombre)
      );

      if (coincideEmail || coincideTelefono || coincideNombre || coincideNickname) {
        const costo = Number(t.costoInscripcion || 0);
        const pagado = Number(p.montoPagado || 0);
        const deuda = Math.max(0, costo - pagado);

        historial.push({
          torneoId: t.id,
          nombreTorneo: t.nombre,
          juego: t.juego,
          fecha: t.fecha,
          lugar: t.lugar,
          estadoTorneo: t.estado,
          costoInscripcion: costo,
          premiosTorneo: t.premios,
          participanteId: p.id,
          deck: p.deck,
          puesto: p.puesto || "Participante",
          premioGanado: p.premioGanado || null,
          productosPremios: p.productosPremios || [],
          montoPagado: pagado,
          estadoPago: p.estadoPago || "pagado",
          deuda,
          notas: p.notas,
        });
      }
    }
  }

  // Ordenar por fecha descendente
  historial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return historial;
}

/**
 * Calcula resumen financiero y operativo del torneo
 */
export function calcularMetricasTorneo(torneo) {
  const participantes = torneo.participantes || [];
  const costo = Number(torneo.costoInscripcion || 0);
  const cupo = Number(torneo.cupoMaximo || 16);
  const gastos = Number(torneo.gastosEvento || 0);
  const pozo = Number(torneo.pozoPremios || 0);

  let totalRecaudado = 0;
  let totalDeuda = 0;
  let pagadosCount = 0;
  let abonoCount = 0;
  let debeCount = 0;

  for (const p of participantes) {
    const pagado = Number(p.montoPagado || 0);
    totalRecaudado += pagado;
    const pendiente = Math.max(0, costo - pagado);
    totalDeuda += pendiente;

    if (p.estadoPago === "pagado" || pagado >= costo) pagadosCount++;
    else if (p.estadoPago === "abono" || pagado > 0) abonoCount++;
    else debeCount++;
  }

  const gananciaNeta = totalRecaudado - gastos;
  const cuposDisponibles = Math.max(0, cupo - participantes.length);
  const porcentajeLleno = cupo > 0 ? Math.min(100, Math.round((participantes.length / cupo) * 100)) : 0;

  return {
    totalInscritos: participantes.length,
    cuposDisponibles,
    porcentajeLleno,
    totalRecaudado,
    totalDeuda,
    pozoPremios: pozo,
    gastos,
    gananciaNeta,
    pagadosCount,
    abonoCount,
    debeCount,
  };
}
