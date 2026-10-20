import { supabase } from "./supabase.js";

const LOCAL_STORAGE_KEY = "cc_torneos_db_v1";

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
    gastosEvento: 120000,
    estado: "proximo", // "proximo" | "en_curso" | "finalizado" | "cancelado"
    notas: "Registro obligatorio con mazo legal OP-09. Check-in presencial 30 min antes.",
    participantes: [
      { id: "p-1", nombre: "Carlos Méndez", telefono: "3104567890", deck: "Luffy Red-Purple", montoPagado: 35000, estadoPago: "pagado", notas: "" },
      { id: "p-2", nombre: "Andrés Salazar", telefono: "3158901234", deck: "Doflamingo Blue", montoPagado: 35000, estadoPago: "pagado", notas: "" },
      { id: "p-3", nombre: "Mateo Gómez", telefono: "3127894561", deck: "Rob Lucci Black", montoPagado: 15000, estadoPago: "abono", notas: "Paga saldo en tienda" },
      { id: "p-4", nombre: "Santiago Rivas", telefono: "3001239874", deck: "Zoro Green", montoPagado: 0, estadoPago: "debe", notas: "Confirmado por WhatsApp" },
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
    gastosEvento: 80000,
    estado: "proximo",
    notas: "¡El primer evento oficial presencial de Riftbound en la ciudad! Se prestan mazos para nuevos jugadores.",
    participantes: [
      { id: "p-5", nombre: "Brayan CC", telefono: "3123456789", deck: "Ahri / Yasuo Aggro", montoPagado: 25000, estadoPago: "pagado", notas: "Organizador" },
      { id: "p-6", nombre: "David Correa", telefono: "3186543210", deck: "Master Yi Wuju Control", montoPagado: 25000, estadoPago: "pagado", notas: "" },
      { id: "p-7", nombre: "Julián Castro", telefono: "3119876543", deck: "Jinx Burn", montoPagado: 25000, estadoPago: "pagado", notas: "" },
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
    gastosEvento: 50000,
    estado: "proximo",
    notas: "Nivel de poder sugerido 6-8. Se juegan 3 rondas en mesas aleatorias.",
    participantes: [
      { id: "p-8", nombre: "Felipe Osorio", telefono: "3145678901", deck: "Atraxa Superfriends", montoPagado: 15000, estadoPago: "pagado", notas: "" },
      { id: "p-9", nombre: "Daniel Vélez", telefono: "3167890123", deck: "Miirym Dragons", montoPagado: 15000, estadoPago: "pagado", notas: "" },
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
    gastosEvento: 60000,
    estado: "proximo",
    notas: "Se requiere decklist en hoja física antes del inicio de ronda 1.",
    participantes: [
      { id: "p-10", nombre: "Esteban Morales", telefono: "3178901234", deck: "Charizard ex / Pidgeot", montoPagado: 20000, estadoPago: "pagado", notas: "" },
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
    return Array.isArray(parsed) ? parsed : TORNEOS_INICIALES;
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
 * Obtiene la lista completa de torneos
 */
export async function listarTorneos() {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("torneos")
        .select("*")
        .order("fecha", { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    // Si falla Supabase o no existe la tabla, usar almacenamiento local
  }
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

  // Intentar sincronizar en Supabase de forma transparente
  try {
    if (supabase) {
      await supabase.from("torneos").upsert(registro);
    }
  } catch (e) {
    // Silencioso si la tabla no existe en Supabase
  }

  return registro;
}

/**
 * Elimina un torneo
 */
export async function eliminarTorneo(id) {
  const torneos = cargarLocal().filter((t) => t.id !== id);
  guardarLocal(torneos);
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
    montoPagado: pagado,
    estadoPago,
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

  try {
    if (supabase) {
      await supabase.from("torneos").update({ participantes }).eq("id", torneoId);
    }
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
    if (supabase) {
      await supabase.from("torneos").update({ participantes: torneos[tIndex].participantes }).eq("id", torneoId);
    }
  } catch (e) {}

  return torneos[tIndex];
}

/**
 * Calcula resumen financiero y operativo del torneo
 */
export function calcularMetricasTorneo(torneo) {
  const participantes = torneo.participantes || [];
  const costo = Number(torneo.costoInscripcion || 0);
  const cupo = Number(torneo.cupoMaximo || 16);
  const gastos = Number(torneo.gastosEvento || 0);

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
    gastos,
    gananciaNeta,
    pagadosCount,
    abonoCount,
    debeCount,
  };
}
