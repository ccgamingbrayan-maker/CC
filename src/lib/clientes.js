import { supabase } from "./supabase.js";
import { listarTorneos, guardarTorneo } from "./torneos.js";

const LOCAL_STORAGE_CLIENTES_KEY = "cc_clientes_crm_v1";

// Semilla de clientes base basada en los 12 jugadores oficiales de Bandai y Riftbound
const CLIENTES_BASE = [
  {
    id: "user-1",
    nombre: "Jack Poe",
    nickname: "[BC] JackPoe",
    bandaiId: "0000205267",
    email: "jackpoe.bc@gmail.com",
    telefono: "3104567890",
    rol: "cliente",
    ciudad: "Cali",
    notasAdmin: "Campeón oficial del Store Championship OP-09. Especialista en mazos Red-Purple Luffy.",
    fechaRegistro: "2026-08-10T10:00:00Z",
    pedidos: [
      {
        id: "PED-1042",
        creado_en: "2026-10-18T16:30:00Z",
        estado: "entregado",
        total: 485000,
        metodo_pago: "ePayco (Nequi)",
        items: [
          { tipo: "carta", nombre: "Monkey.D.Luffy (Manga Rare OP-05)", cantidad: 1, precio: 380000 },
          { tipo: "accesorio", nombre: "Dragon Shield Matte Dual Fury (100ct)", cantidad: 1, precio: 55000 },
          { tipo: "accesorio", nombre: "Deck Box Ultimate Guard Sidewinder Purple", cantidad: 1, precio: 50000 },
        ],
      },
      {
        id: "PED-1008",
        creado_en: "2026-09-20T14:15:00Z",
        estado: "entregado",
        total: 120000,
        metodo_pago: "ePayco (PSE)",
        items: [
          { tipo: "carta", nombre: "Roronoa Zoro (OP01-025 SR Parallel)", cantidad: 2, precio: 60000 },
        ],
      },
    ],
  },
  {
    id: "user-2",
    nombre: "Daniel De la Lora",
    nickname: "danieldlora",
    bandaiId: "0000780406",
    email: "danieldlora@hotmail.com",
    telefono: "3187654321",
    rol: "cliente",
    ciudad: "Cali",
    notasAdmin: "Subcampeón del torneo OP-09. Jugador muy constante y puntual.",
    fechaRegistro: "2026-08-15T12:00:00Z",
    pedidos: [
      {
        id: "PED-1038",
        creado_en: "2026-10-15T11:20:00Z",
        estado: "entregado",
        total: 240000,
        metodo_pago: "ePayco (Tarjeta de Crédito)",
        items: [
          { tipo: "carta", nombre: "Donquixote Doflamingo (Leader Parallel)", cantidad: 1, precio: 150000 },
          { tipo: "carta", nombre: "Boa Hancock (OP07-051 SR)", cantidad: 2, precio: 45000 },
        ],
      },
    ],
  },
  {
    id: "user-3",
    nombre: "Jackie Niño",
    nickname: "Niñojackie",
    bandaiId: "0000014931",
    email: "ninojackie@gmail.com",
    telefono: "3156789012",
    rol: "cliente",
    ciudad: "Cali",
    notasAdmin: "Top 4 Store Championship. Le gusta jugar mazos de control Black (Rob Lucci).",
    fechaRegistro: "2026-09-01T09:30:00Z",
    pedidos: [
      {
        id: "PED-1025",
        creado_en: "2026-10-02T18:40:00Z",
        estado: "entregado",
        total: 185000,
        metodo_pago: "ePayco (Bancolombia)",
        items: [
          { tipo: "carta", nombre: "Gecko Moria (OP06-086 SR)", cantidad: 2, precio: 65000 },
          { tipo: "accesorio", nombre: "Playmat Capsule Corp Neopreno 60x35cm", cantidad: 1, precio: 55000 },
        ],
      },
    ],
  },
  {
    id: "user-4",
    nombre: "Andrés Lythrick",
    nickname: "Lythrick",
    bandaiId: "0000934049",
    email: "lythrick.tcg@gmail.com",
    telefono: "3112345678",
    rol: "cliente",
    ciudad: "Cali",
    notasAdmin: "Top 4 OP-09. Gran conocedor de las reglas de Bandai y juez en entrenamiento.",
    fechaRegistro: "2026-08-20T16:00:00Z",
    pedidos: [
      {
        id: "PED-1030",
        creado_en: "2026-10-08T10:10:00Z",
        estado: "entregado",
        total: 310000,
        metodo_pago: "ePayco (Nequi)",
        items: [
          { tipo: "carta", nombre: "Enel (OP05-098 Leader Parallel)", cantidad: 1, precio: 190000 },
          { tipo: "carta", nombre: "Charlotte Katakuri (OP03-123 SEC)", cantidad: 1, precio: 120000 },
        ],
      },
    ],
  },
  {
    id: "user-5",
    nombre: "Sir Crocodile",
    nickname: "SirCrocodile",
    bandaiId: "0000138670",
    email: "crocodile.baroque@gmail.com",
    telefono: "3128901234",
    rol: "cliente",
    ciudad: "Cali",
    notasAdmin: "Top 8. Compra habitualmente cartas individuales y cajas selladas.",
    fechaRegistro: "2026-09-12T14:00:00Z",
    pedidos: [
      {
        id: "PED-1014",
        creado_en: "2026-09-28T15:00:00Z",
        estado: "entregado",
        total: 420000,
        metodo_pago: "ePayco (PSE)",
        items: [
          { tipo: "carta", nombre: "Booster Box One Piece OP-08 Sellada", cantidad: 1, precio: 420000 },
        ],
      },
    ],
  },
  {
    id: "user-organizador",
    nombre: "Brayan CC (Maker)",
    nickname: "brayan_maker",
    bandaiId: "0000999001",
    email: "ccgamingbrayan@gmail.com",
    telefono: "3123456789",
    rol: "admin",
    ciudad: "Cali",
    notasAdmin: "Administrador general de Capsule Corp Gaming. Organizador oficial de torneos One Piece y Riftbound.",
    fechaRegistro: "2026-01-01T00:00:00Z",
    pedidos: [],
  },
];

/**
 * Carga clientes almacenados localmente
 */
function cargarClientesLocales() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CLIENTES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Error leyendo clientes de localStorage:", e);
  }
  return CLIENTES_BASE;
}

/**
 * Guarda clientes en localStorage
 */
function guardarClientesLocales(clientes) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CLIENTES_KEY, JSON.stringify(clientes));
  } catch (e) {
    console.error("Error guardando clientes en localStorage:", e);
  }
}

/**
 * Obtiene la lista completa y consolidada de clientes con sus torneos y pedidos
 */
export async function listarClientesCompletos() {
  const clientesMap = new Map();

  // 1. Cargar clientes base / locales
  const locales = cargarClientesLocales();
  for (const c of locales) {
    const key = (c.nickname || c.email || c.nombre).toLowerCase().trim();
    clientesMap.set(key, { ...c, torneos: [], compras: c.pedidos || [] });
  }

  // 2. Intentar leer perfiles de Supabase
  try {
    if (supabase) {
      const { data: profiles, error } = await supabase.from("profiles").select("*");
      if (!error && Array.isArray(profiles) && profiles.length > 0) {
        for (const p of profiles) {
          const key = (p.nickname || p.email || p.nombre || p.id).toLowerCase().trim();
          const existente = clientesMap.get(key) || {};
          clientesMap.set(key, {
            id: p.id || existente.id || `user-${Date.now()}`,
            nombre: p.nombre || existente.nombre || "Cliente Registrado",
            nickname: p.nickname || existente.nickname || "",
            bandaiId: p.bandai_id || existente.bandaiId || "",
            email: p.email || existente.email || "",
            telefono: p.telefono || existente.telefono || "",
            avatarUrl: p.avatar_url || existente.avatarUrl || null,
            rol: p.rol || existente.rol || "cliente",
            ciudad: p.ciudad || existente.ciudad || "Cali",
            notasAdmin: p.notas_admin || existente.notasAdmin || "",
            fechaRegistro: p.created_at || existente.fechaRegistro || new Date().toISOString(),
            torneos: existente.torneos || [],
            compras: existente.compras || [],
          });
        }
      }
    }
  } catch (e) {
    console.warn("No se pudo leer profiles de Supabase:", e);
  }

  // 3. Obtener todos los torneos oficiales (One Piece y Riftbound)
  const todosTorneos = await listarTorneos();

  // 4. Vincular cada participante de los torneos a su perfil de cliente
  for (const t of todosTorneos) {
    const participantes = t.participantes || [];
    for (const p of participantes) {
      const nick = (p.nickname || p.nombre || "").trim();
      const key = nick.toLowerCase();
      const costo = Number(t.costoInscripcion || 0);
      const pagado = Number(p.montoPagado || 0);
      const deuda = Math.max(0, costo - pagado);

      const torneoItem = {
        torneoId: t.id,
        nombreTorneo: t.nombre,
        juego: t.juego,
        fecha: t.fecha,
        lugar: t.lugar,
        estadoTorneo: t.estado,
        costoInscripcion: costo,
        premiosTorneo: t.premios,
        participanteId: p.id,
        puesto: p.puesto || "Participante",
        puntos: p.puntos ?? 0,
        omw: p.omw || "",
        deck: p.deck || "Mazo competitivo",
        montoPagado: pagado,
        estadoPago: p.estadoPago || (pagado >= costo ? "pagado" : pagado > 0 ? "abono" : "debe"),
        deuda,
        premioGanado: p.premioGanado || null,
        productosPremios: p.productosPremios || [],
        notas: p.notas || "",
      };

      // Si el cliente ya existe en el mapa, anexar su torneo
      if (clientesMap.has(key)) {
        const cliente = clientesMap.get(key);
        if (!cliente.torneos.some((item) => item.torneoId === t.id && item.participanteId === p.id)) {
          cliente.torneos.push(torneoItem);
        }
        if (!cliente.bandaiId && p.bandaiId) {
          cliente.bandaiId = p.bandaiId;
        }
      } else {
        // Si fue importado de Bandai pero aún no tenía cuenta web, crear su perfil automáticamente
        const nuevoCliente = {
          id: `cliente-${p.id || Date.now()}`,
          nombre: p.nombre || nick,
          nickname: nick,
          bandaiId: p.bandaiId || "",
          email: p.email || `${nick.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@capsulecorp.com`,
          telefono: p.telefono || "",
          rol: "cliente",
          ciudad: "Cali",
          notasAdmin: `Jugador importado desde tabla oficial de Bandai TCG+ (${t.nombre}).`,
          fechaRegistro: t.fecha || new Date().toISOString(),
          torneos: [torneoItem],
          compras: [],
        };
        clientesMap.set(key, nuevoCliente);
      }
    }
  }

  // 5. Intentar cargar pedidos reales desde Supabase si existe la tabla 'pedidos'
  try {
    if (supabase) {
      const { data: pedidosDB } = await supabase
        .from("pedidos")
        .select("*")
        .order("creado_en", { ascending: false });

      if (Array.isArray(pedidosDB) && pedidosDB.length > 0) {
        for (const ped of pedidosDB) {
          // Buscar cliente por user_id
          for (const cliente of clientesMap.values()) {
            if (cliente.id === ped.user_id) {
              if (!cliente.compras.some((c) => c.id === ped.id)) {
                cliente.compras.push(ped);
              }
            }
          }
        }
      }
    }
  } catch (e) {}

  // 6. Calcular métricas consolidadas por cliente
  const resultado = Array.from(clientesMap.values()).map((c) => {
    let totalGastadoEnCompras = 0;
    for (const ped of c.compras || []) {
      totalGastadoEnCompras += Number(ped.total || 0);
    }

    let totalDeudaTorneos = 0;
    let mejorPuestoNum = 999;
    let mejorPuestoTexto = "Participante";

    for (const t of c.torneos || []) {
      totalDeudaTorneos += Number(t.deuda || 0);
      const numP = parseInt(String(t.puesto || "").replace(/\D/g, ""), 10);
      if (numP && numP < mejorPuestoNum) {
        mejorPuestoNum = numP;
        mejorPuestoTexto = `#${numP}`;
        if (numP === 1) mejorPuestoTexto = "1er Lugar (Campeón)";
        else if (numP === 2) mejorPuestoTexto = "2do Lugar (Subcampeón)";
        else if (numP <= 4) mejorPuestoTexto = `Top 4 (#${numP})`;
        else if (numP <= 8) mejorPuestoTexto = `Top 8 (#${numP})`;
      }
    }

    return {
      ...c,
      totalTorneos: c.torneos.length,
      totalCompras: totalGastadoEnCompras,
      numPedidos: (c.compras || []).length,
      totalDeudaTorneos,
      mejorPuesto: mejorPuestoNum !== 999 ? mejorPuestoTexto : "Sin torneos",
      tieneDeuda: totalDeudaTorneos > 0,
      esTopPlayer: mejorPuestoNum <= 4,
    };
  });

  // Ordenar por número de torneos jugados descendente
  resultado.sort((a, b) => b.totalTorneos - a.totalTorneos || b.totalCompras - a.totalCompras);

  return resultado;
}

/**
 * Actualiza el estado de pago de una inscripción de un cliente en un torneo
 */
export async function actualizarEstadoPagoCliente(torneoId, participanteId, nuevoEstado) {
  const torneos = await listarTorneos();
  const tIndex = torneos.findIndex((t) => t.id === torneoId);
  if (tIndex < 0) return false;

  const torneo = torneos[tIndex];
  const participantes = torneo.participantes || [];
  const pIndex = participantes.findIndex((p) => p.id === participanteId);
  if (pIndex < 0) return false;

  const costo = Number(torneo.costoInscripcion || 0);
  let nuevoPagado = participantes[pIndex].montoPagado;

  if (nuevoEstado === "pagado") nuevoPagado = costo;
  else if (nuevoEstado === "debe") nuevoPagado = 0;

  participantes[pIndex] = {
    ...participantes[pIndex],
    estadoPago: nuevoEstado,
    montoPagado: nuevoPagado,
  };

  torneo.participantes = participantes;
  await guardarTorneo(torneo);
  return true;
}

/**
 * Actualiza la información o notas administrativas de un cliente
 */
export async function actualizarClienteAdmin(clienteId, datosActualizados) {
  const locales = cargarClientesLocales();
  const index = locales.findIndex((c) => c.id === clienteId || c.nickname === datosActualizados.nickname);

  if (index >= 0) {
    locales[index] = { ...locales[index], ...datosActualizados };
  } else {
    locales.push({ id: clienteId, ...datosActualizados });
  }

  guardarClientesLocales(locales);

  // Intentar sincronizar en Supabase profiles si está configurado
  try {
    if (supabase) {
      await supabase.from("profiles").upsert({
        id: clienteId,
        nombre: datosActualizados.nombre,
        nickname: datosActualizados.nickname,
        bandai_id: datosActualizados.bandaiId,
        telefono: datosActualizados.telefono,
        rol: datosActualizados.rol || "cliente",
        notas_admin: datosActualizados.notasAdmin,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (e) {}

  return true;
}
