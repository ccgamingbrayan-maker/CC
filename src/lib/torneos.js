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
    costoInscripcion: 35000,
    cupoMaximo: 24,
    premios: "1er Lugar: 1 Display OP-09 sellado + Carta Promo Winner. Top 4: Sobres de torneo oficiales. Todos: Sobre de participación.",
    pozoPremios: 420000,
    esquemaPremios: "top4_standard",
    gastosEvento: 100000,
    estado: "finalizado",
    notas: "Torneo oficial reportado en Bandai TCG+. Registro y emparejamientos automáticos.",
    participantes: [
      {
        id: "p-1",
        nombre: "[BC] JackPoe",
        nickname: "[BC] JackPoe",
        bandaiId: "0000205267",
        puntos: 12,
        omw: "52%",
        deck: "Luffy Red-Purple",
        montoPagado: 35000,
        estadoPago: "pagado",
        puesto: "1",
        premioGanado: "$210.000 COP + 1 Booster Box OP-09",
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
        montoPagado: 35000,
        estadoPago: "pagado",
        puesto: "2",
        premioGanado: "$126.000 COP + Sobres Oficiales",
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
        montoPagado: 35000,
        estadoPago: "pagado",
        puesto: "3",
        premioGanado: "$42.000 COP + Sobres de Torneo",
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
        montoPagado: 35000,
        estadoPago: "pagado",
        puesto: "4",
        premioGanado: "$42.000 COP + Sobres de Torneo",
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
        montoPagado: 35000,
        estadoPago: "pagado",
        puesto: "5",
        premioGanado: "Sobre de participación",
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
        montoPagado: 35000,
        estadoPago: "pagado",
        puesto: "6",
        premioGanado: "Sobre de participación",
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
        montoPagado: 35000,
        estadoPago: "pagado",
        puesto: "7",
        premioGanado: "Sobre de participación",
        notas: "Top 8"
      },
      {
        id: "p-8",
        nombre: "Spicynuggets73",
        nickname: "Spicynuggets73",
        bandaiId: "0000148790",
        puntos: 6,
        omw: "45.8%",
        deck: "Katakuri Yellow",
        montoPagado: 35000,
        estadoPago: "pagado",
        puesto: "8",
        premioGanado: "Sobre de participación",
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
        montoPagado: 35000,
        estadoPago: "pagado",
        puesto: "9",
        premioGanado: "Sobre de participación",
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
        montoPagado: 35000,
        estadoPago: "pagado",
        puesto: "10",
        premioGanado: "Sobre de participación",
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
        montoPagado: 35000,
        estadoPago: "pagado",
        puesto: "11",
        premioGanado: "Sobre de participación",
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
        montoPagado: 35000,
        estadoPago: "pagado",
        puesto: "12",
        premioGanado: "Sobre de participación",
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
    id: "premio-box-op09",
    nombre: "Booster Box One Piece OP-09 (Sellada)",
    juego: "One Piece TCG",
    categoria: "Cajas / Displays",
    imagen: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&q=80",
    stock: 8,
    valorCop: 450000,
    notas: "Display oficial de 24 sobres para campeones de torneos Store Championship",
  },
  {
    id: "premio-sobres-op09",
    nombre: "Sobres Oficiales OP-09 (Four Emperors)",
    juego: "One Piece TCG",
    categoria: "Sobres",
    imagen: "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=300&q=80",
    stock: 96,
    valorCop: 22000,
    notas: "Sobres individuales de expansión para Top 4 y Top 8",
  },
  {
    id: "premio-tournament-pack",
    nombre: "Tournament Pack Oficial Vol. 6 (Promo)",
    juego: "One Piece TCG",
    categoria: "Sobres de Torneo",
    imagen: "https://images.unsplash.com/photo-1578374173705-969cbe6f2d6b?w=300&q=80",
    stock: 48,
    valorCop: 15000,
    notas: "Sobres exclusivos de torneo entregados por Bandai TCG+",
  },
  {
    id: "premio-winner-card",
    nombre: "Carta Promo Winner Oficial con Estampado Dorado",
    juego: "One Piece TCG",
    categoria: "Cartas Promo",
    imagen: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&q=80",
    stock: 4,
    valorCop: 120000,
    notas: "Carta exclusiva Winner para el 1er lugar de eventos oficiales",
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

      let nuevoPremio = resumenTextual;
      if (p.premioGanado && p.premioGanado.includes("COP")) {
        const parteCop = p.premioGanado.split("+")[0].trim();
        nuevoPremio = `${parteCop} + ${resumenTextual}`;
      }

      return {
        ...p,
        productosPremios: productosGanados,
        premioGanado: nuevoPremio,
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
 * Distribución automática de pozo de premios (Prize Pool)
 */
export async function distribuirPremiosTorneo(torneoId, { pozoTotal, esquema, premiosFisicos }) {
  const torneos = cargarLocal();
  const tIndex = torneos.findIndex((t) => t.id === torneoId);
  if (tIndex < 0) return null;

  const torneo = torneos[tIndex];
  const participantes = torneo.participantes || [];
  const pozo = Number(pozoTotal ?? torneo.pozoPremios ?? 0);

  const porcentajes = {
    top4_standard: { 1: 0.50, 2: 0.30, 3: 0.10, 4: 0.10 },
    top4_split: { 1: 0.50, 2: 0.25, 3: 0.125, 4: 0.125 },
    top8_premier: { 1: 0.40, 2: 0.20, 3: 0.10, 4: 0.10, 5: 0.05, 6: 0.05, 7: 0.05, 8: 0.05 },
    top2: { 1: 0.70, 2: 0.30 },
    winner: { 1: 1.00 },
  };

  const tabla = porcentajes[esquema] || porcentajes.top4_standard;

  const actualizados = participantes.map((p) => {
    const numPuesto = parseInt(String(p.puesto || "").replace(/\D/g, ""), 10);
    if (numPuesto && tabla[numPuesto]) {
      const partePozo = Math.round(pozo * tabla[numPuesto]);
      let textoPremio = `$${partePozo.toLocaleString("es-CO")} COP`;
      if (premiosFisicos && premiosFisicos[numPuesto]) {
        textoPremio += ` + ${premiosFisicos[numPuesto]}`;
      }
      return { ...p, premioGanado: textoPremio };
    }
    return p;
  });

  torneo.participantes = actualizados;
  torneo.pozoPremios = pozo;
  torneo.esquemaPremios = esquema || "top4_standard";
  torneos[tIndex] = torneo;
  guardarLocal(torneos);

  // Sincronizar con backend
  try {
    await fetch(`${API_URL}/api/torneos/${torneoId}/distribuir-premios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pozoTotal: pozo, esquema, premiosFisicos }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (e) {}

  return torneo;
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
