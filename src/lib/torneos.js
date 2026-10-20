import { supabase } from "./supabase.js";

const LOCAL_STORAGE_KEY = "cc_torneos_db_v1";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const TORNEOS_INICIALES = [
  {
    id: "torneo-1",
    nombre: "Torneo Store Championship OP-09",
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
    gastosEvento: 120000,
    estado: "proximo",
    notas: "Registro obligatorio con mazo legal OP-09. Check-in presencial 30 min antes.",
    participantes: [
      {
        id: "p-1",
        nombre: "Carlos Méndez",
        email: "carlos.mendez@gmail.com",
        telefono: "3104567890",
        deck: "Luffy Red-Purple",
        montoPagado: 35000,
        estadoPago: "pagado",
        puesto: "1",
        premioGanado: "$210.000 COP + 1 Booster Box OP-09",
        notas: ""
      },
      {
        id: "p-2",
        nombre: "Andrés Salazar",
        email: "andres.salazar@gmail.com",
        telefono: "3158901234",
        deck: "Doflamingo Blue",
        montoPagado: 35000,
        estadoPago: "pagado",
        puesto: "2",
        premioGanado: "$126.000 COP + Sobres Oficiales",
        notas: ""
      },
      {
        id: "p-3",
        nombre: "Mateo Gómez",
        email: "mateo.gomez@gmail.com",
        telefono: "3127894561",
        deck: "Rob Lucci Black",
        montoPagado: 15000,
        estadoPago: "abono",
        puesto: "3",
        premioGanado: "$42.000 COP + Sobres de Torneo",
        notas: "Paga saldo en tienda"
      },
      {
        id: "p-4",
        nombre: "Santiago Rivas",
        email: "santiago.rivas@gmail.com",
        telefono: "3001239874",
        deck: "Zoro Green",
        montoPagado: 0,
        estadoPago: "debe",
        puesto: "4",
        premioGanado: "$42.000 COP + Sobres de Torneo",
        notas: "Confirmado por WhatsApp"
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
    premios: "1er Lugar: Pack de cartas promocionales foil exclusivas + $100.000 COP en crédito de tienda. Top 8: Cartas promo oficiales.",
    pozoPremios: 200000,
    esquemaPremios: "top4_standard",
    gastosEvento: 80000,
    estado: "proximo",
    notas: "¡El primer evento oficial presencial de Riftbound en la ciudad! Se prestan mazos para nuevos jugadores.",
    participantes: [
      {
        id: "p-5",
        nombre: "Brayan CC",
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
        id: "p-6",
        nombre: "David Correa",
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
        id: "p-7",
        nombre: "Julián Castro",
        email: "julian.castro@gmail.com",
        telefono: "3119876543",
        deck: "Jinx Burn",
        montoPagado: 25000,
        estadoPago: "pagado",
        puesto: "3",
        premioGanado: "$20.000 COP + Cartas Promo",
        notas: ""
      }
    ],
  },
  {
    id: "torneo-3",
    nombre: "Viernes de Commander Magic Night",
    juego: "Magic: The Gathering",
    juegoId: 4,
    formato: "Commander Casual Pods (Mesas de 4)",
    fecha: "2026-10-30T18:00",
    lugar: "Sede Capsule Corp Gaming - Cali (Cra 34 # 4-50)",
    costoInscripcion: 15000,
    cupoMaximo: 20,
    premios: "Packs promocionales de Magic por mesa ganadora + sorteo de accesorios Ultimate Guard.",
    pozoPremios: 150000,
    esquemaPremios: "top4_standard",
    gastosEvento: 50000,
    estado: "proximo",
    notas: "Nivel de poder sugerido 6-8. Se juegan 3 rondas en mesas aleatorias.",
    participantes: [
      {
        id: "p-8",
        nombre: "Felipe Osorio",
        email: "felipe.osorio@gmail.com",
        telefono: "3145678901",
        deck: "Atraxa Superfriends",
        montoPagado: 15000,
        estadoPago: "pagado",
        puesto: "1",
        premioGanado: "Promo Pack Foil + Playmat Ultimate Guard",
        notas: ""
      },
      {
        id: "p-9",
        nombre: "Daniel Vélez",
        email: "daniel.velez@gmail.com",
        telefono: "3167890123",
        deck: "Miirym Dragons",
        montoPagado: 15000,
        estadoPago: "pagado",
        puesto: "2",
        premioGanado: "Promo Pack Regular",
        notas: ""
      }
    ],
  },
  {
    id: "torneo-4",
    nombre: "Liga Local Pokémon TCG - Gym Challenge",
    juego: "Pokémon TCG",
    juegoId: 3,
    formato: "Estándar Oficial (Bo3)",
    fecha: "2026-11-01T11:00",
    lugar: "Sede Capsule Corp Gaming - Cali (Cra 34 # 4-50)",
    costoInscripcion: 20000,
    cupoMaximo: 16,
    premios: "Sobres de expansión Paldean Fates para top + cartas de liga Pokémon oficiales.",
    pozoPremios: 160000,
    esquemaPremios: "top4_standard",
    gastosEvento: 60000,
    estado: "proximo",
    notas: "Se requiere decklist en hoja física antes del inicio de ronda 1.",
    participantes: [
      {
        id: "p-10",
        nombre: "Esteban Morales",
        email: "esteban.morales@gmail.com",
        telefono: "3178901234",
        deck: "Charizard ex / Pidgeot",
        montoPagado: 20000,
        estadoPago: "pagado",
        puesto: "1",
        premioGanado: "3 Sobres Paldean Fates + Carta Promo Winner",
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
        guardarLocal(data);
        return data;
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
      await supabase.from("torneos").upsert(registro);
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
  const userTelefono = (user.user_metadata?.telefono || "").replace(/\D/g, "");

  const historial = [];

  for (const t of todosTorneos) {
    const participantes = t.participantes || [];
    for (const p of participantes) {
      const pEmail = (p.email || "").toLowerCase().trim();
      const pNombre = (p.nombre || "").toLowerCase().trim();
      const pTelefono = (p.telefono || "").replace(/\D/g, "");

      const coincideEmail = userEmail && pEmail && userEmail === pEmail;
      const coincideTelefono = userTelefono && pTelefono && userTelefono === pTelefono;
      const coincideNombre = userNombre && pNombre && (userNombre === pNombre || pNombre.includes(userNombre));

      if (coincideEmail || coincideTelefono || coincideNombre) {
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
