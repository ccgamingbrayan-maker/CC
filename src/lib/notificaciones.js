import { supabase } from "./supabase.js";
import { obtenerTorneosUsuario } from "./torneos.js";

const LOCAL_STORAGE_KEY = "cc_notificaciones_v1";
const LOCAL_STORAGE_ENVIADOS_KEY = "cc_notificaciones_enviadas_admin_v1";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Obtiene cabeceras de autorización JWT de la sesión de Supabase
 */
async function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {}
  return headers;
}

function cargarLocal(key, defaultVal = []) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function guardarLocal(key, valor) {
  try {
    localStorage.setItem(key, JSON.stringify(valor));
  } catch (e) {}
}

/**
 * Genera notificaciones iniciales automáticas basadas en la actividad real del usuario
 */
function generarNotificacionesIniciales(user, pedidos = [], torneos = []) {
  const notifs = [];
  const ahora = new Date();

  // 1. Notificación de bienvenida y verificación
  notifs.push({
    id: `notif-bienvenida-${user.id}`,
    titulo: "¡Bienvenido a Capsule Corp Gaming!",
    mensaje:
      "Tu cuenta ha sido verificada exitosamente. Desde tu perfil puedes gestionar tu colección física de cartas, armar mazos con el Creador de Decks, consultar tus pedidos y seguir tus estadísticas en torneos oficiales.",
    categoria: "general",
    canal: "ambos",
    leido: false,
    es_global: false,
    enlace: "/perfil?tab=coleccion",
    enlace_texto: "Explorar Colección",
    creado_en: user.created_at || ahora.toISOString(),
  });

  // 2. Notificaciones derivadas de pedidos reales
  if (Array.isArray(pedidos) && pedidos.length > 0) {
    pedidos.slice(0, 3).forEach((ped) => {
      const total = Number(ped.total || 0).toLocaleString("es-CO");
      const estadoLabel = ped.estado === "entregado" ? "entregado con éxito" : "en preparación";
      notifs.push({
        id: `notif-pedido-${ped.id}`,
        titulo: `Pedido #${ped.id} - ${ped.estado === "entregado" ? "Entregado" : "Confirmado"}`,
        mensaje: `Tu pedido por un valor total de $${total} COP se encuentra ${estadoLabel}. Recibiste la confirmación detallada en tu correo (${user.email}).`,
        categoria: "pedido",
        canal: "ambos",
        leido: false,
        es_global: false,
        enlace: "/perfil?tab=pedidos",
        enlace_texto: "Ver detalles del pedido",
        creado_en: ped.creado_en || ahora.toISOString(),
      });
    });
  }

  // 3. Notificación de torneos / Prize Wall si participa
  if (Array.isArray(torneos) && torneos.length > 0) {
    const totalCoins = torneos.reduce((acc, t) => acc + (t.participacion?.ccCoins || 0), 0);
    notifs.push({
      id: `notif-torneo-${user.id}`,
      titulo: "Torneos Oficiales y Saldo en Prize Wall",
      mensaje: `Has participado en ${torneos.length} torneo(s) oficial(es) de Capsule Corp Gaming. Tienes ${totalCoins} CC Coins acumulados listos para canjear en el Muro de Premios.`,
      categoria: "torneo",
      canal: "plataforma",
      leido: false,
      es_global: false,
      enlace: "/perfil?tab=torneos",
      enlace_texto: "Consultar mis torneos",
      creado_en: ahora.toISOString(),
    });
  }

  return notifs;
}

/**
 * Obtiene todas las notificaciones relevantes para el usuario actual
 */
export async function obtenerNotificacionesUsuario(user) {
  if (!user) return [];

  const localNotifs = cargarLocal(`${LOCAL_STORAGE_KEY}_${user.id}`, []);
  const idsVistos = new Set(localNotifs.map((n) => n.id));
  let remoteNotifs = [];

  // 1. Intentar consultar Backend Express
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/notificaciones`, {
      headers: authHeaders,
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        remoteNotifs = data.filter(
          (n) => n.es_global || n.user_id === user.id || (n.email && n.email.toLowerCase() === user.email.toLowerCase())
        );
      }
    }
  } catch (e) {}

  // 2. Si no hay del backend, intentar Supabase directamente
  if (remoteNotifs.length === 0) {
    try {
      const { data, error } = await supabase
        .from("notificaciones")
        .select("*")
        .or(`es_global.eq.true,user_id.eq.${user.id},email.eq.${user.email}`)
        .order("creado_en", { ascending: false });
      if (!error && Array.isArray(data)) {
        remoteNotifs = data;
      }
    } catch (e) {}
  }

  // 3. Cargar pedidos del usuario para generar avisos automáticos si faltan
  let pedidos = [];
  try {
    const { data } = await supabase.from("pedidos").select("*").eq("user_id", user.id);
    if (Array.isArray(data)) pedidos = data;
  } catch (e) {}

  // 4. Cargar torneos del usuario
  let torneos = [];
  try {
    torneos = await obtenerTorneosUsuario(user);
  } catch (e) {}

  const baseNotifs = generarNotificacionesIniciales(user, pedidos, torneos);

  // Combinar todo respetando el estado de lectura guardado localmente
  const mapaLecturaLocal = new Map(localNotifs.map((n) => [n.id, n.leido]));

  const combinadas = [...remoteNotifs, ...baseNotifs, ...localNotifs];
  const resultado = [];
  const vistos = new Set();

  for (const n of combinadas) {
    if (!vistos.has(n.id)) {
      vistos.add(n.id);
      resultado.push({
        ...n,
        leido: mapaLecturaLocal.has(n.id) ? mapaLecturaLocal.get(n.id) : Boolean(n.leido),
      });
    }
  }

  // Ordenar por fecha descendente
  resultado.sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));

  guardarLocal(`${LOCAL_STORAGE_KEY}_${user.id}`, resultado);
  return resultado;
}

/**
 * Marca una notificación individual como leída
 */
export async function marcarNotificacionLeida(id, userId) {
  if (!userId || !id) return;

  const key = `${LOCAL_STORAGE_KEY}_${userId}`;
  const actuales = cargarLocal(key, []);
  const actualizadas = actuales.map((n) => (n.id === id ? { ...n, leido: true } : n));
  guardarLocal(key, actualizadas);

  // Intentar actualizar en Supabase
  try {
    await supabase.from("notificaciones").update({ leido: true }).eq("id", id);
  } catch (e) {}

  return actualizadas;
}

/**
 * Marca todas las notificaciones del usuario como leídas
 */
export async function marcarTodasNotificacionesLeidas(userId) {
  if (!userId) return [];

  const key = `${LOCAL_STORAGE_KEY}_${userId}`;
  const actuales = cargarLocal(key, []);
  const actualizadas = actuales.map((n) => ({ ...n, leido: true }));
  guardarLocal(key, actualizadas);

  try {
    await supabase.from("notificaciones").update({ leido: true }).eq("user_id", userId);
  } catch (e) {}

  return actualizadas;
}

/**
 * Elimina una notificación de la lista del usuario
 */
export async function eliminarNotificacionUsuario(id, userId) {
  if (!userId || !id) return [];

  const key = `${LOCAL_STORAGE_KEY}_${userId}`;
  const actuales = cargarLocal(key, []);
  const actualizadas = actuales.filter((n) => n.id !== id);
  guardarLocal(key, actualizadas);

  return actualizadas;
}

/**
 * Obtiene el historial de mensajes y notificaciones enviados por el admin
 */
export async function obtenerMensajesEnviadosAdmin() {
  const localEnviados = cargarLocal(LOCAL_STORAGE_ENVIADOS_KEY, []);

  // Intentar consultar backend Express
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/notificaciones/enviadas`, {
      headers: authHeaders,
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        guardarLocal(LOCAL_STORAGE_ENVIADOS_KEY, data);
        return data;
      }
    }
  } catch (e) {}

  // Intentar consultar Supabase directamente
  try {
    const { data, error } = await supabase
      .from("notificaciones")
      .select("*")
      .order("creado_en", { ascending: false });
    if (!error && Array.isArray(data) && data.length > 0) {
      guardarLocal(LOCAL_STORAGE_ENVIADOS_KEY, data);
      return data;
    }
  } catch (e) {}

  return localEnviados;
}

/**
 * Despacha un nuevo mensaje / notificación / correo desde la consola de administración
 */
export async function enviarMensajeAdmin({
  titulo,
  asunto,
  mensaje,
  canal = "ambos",
  categoria = "general",
  destinatarioTipo = "todos",
  destinatarioEmail = "",
  enlace = "",
  enlaceTexto = "",
  adminUser,
}) {
  const tituloFinal = (titulo || asunto || "").trim();
  const mensajeFinal = (mensaje || "").trim();

  if (!tituloFinal || !mensajeFinal) {
    throw new Error("El título o asunto y el mensaje son obligatorios.");
  }

  const payload = {
    titulo: tituloFinal,
    asunto: tituloFinal,
    mensaje: mensajeFinal,
    canal,
    categoria,
    destinatarioTipo,
    destinatarioEmail: destinatarioEmail.trim(),
    enlace: enlace.trim(),
    enlaceTexto: enlaceTexto.trim() || "Ver detalles",
  };

  let respuestaBackend = null;
  let exitoBackend = false;

  // 1. Intentar enviar a través del Backend Express (que ejecuta Nodemailer / SMTP)
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/notificaciones/enviar`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      respuestaBackend = await res.json();
      exitoBackend = true;
    }
  } catch (err) {
    console.warn("[Notificaciones] Backend Express no respondió o está offline. Continuando localmente.", err);
  }

  // 2. Crear el objeto local de notificación
  const notificacionId = respuestaBackend?.notificacion?.id || `notif-${Date.now()}`;
  const registro = {
    id: notificacionId,
    titulo: tituloFinal,
    asunto: tituloFinal,
    mensaje: mensajeFinal,
    canal,
    categoria,
    destinatario_tipo: destinatarioTipo,
    destinatario_email: destinatarioEmail || (destinatarioTipo === "todos" ? "Todos los clientes" : null),
    destinatarios_conteo: respuestaBackend?.destinatariosConteo || 1,
    enlace: enlace.trim() || null,
    enlace_texto: enlaceTexto.trim() || null,
    leido: false,
    es_global: destinatarioTipo === "todos",
    enviado_por: adminUser?.email || "ccgamingbrayan@gmail.com",
    correo_enviado: respuestaBackend?.correoEnviado ?? (canal === "correo" || canal === "ambos"),
    creado_en: new Date().toISOString(),
  };

  // 3. Persistir en Supabase si la tabla existe
  try {
    await supabase.from("notificaciones").insert([
      {
        id: registro.id,
        titulo: registro.titulo,
        mensaje: registro.mensaje,
        canal: registro.canal,
        categoria: registro.categoria,
        es_global: registro.es_global,
        email: destinatarioEmail || null,
        enlace: registro.enlace,
        metadatos: {
          destinatario_tipo: destinatarioTipo,
          correo_enviado: registro.correo_enviado,
          enlace_texto: registro.enlace_texto,
        },
        enviado_por: registro.enviado_por,
        creado_en: registro.creado_en,
      },
    ]);
  } catch (e) {}

  // 4. Actualizar historial de enviados en LocalStorage
  const historial = cargarLocal(LOCAL_STORAGE_ENVIADOS_KEY, []);
  historial.unshift(registro);
  guardarLocal(LOCAL_STORAGE_ENVIADOS_KEY, historial);

  // 5. Si es global o para el admin, agregarlo también a su bandeja
  if (adminUser?.id) {
    const keyUser = `${LOCAL_STORAGE_KEY}_${adminUser.id}`;
    const bandeja = cargarLocal(keyUser, []);
    bandeja.unshift(registro);
    guardarLocal(keyUser, bandeja);
  }

  return {
    ok: true,
    notificacion: registro,
    enviadoBackend: exitoBackend,
    mensaje: respuestaBackend?.mensaje || "Mensaje despachado y registrado con éxito.",
  };
}

/**
 * Genera el enlace URI mailto para abrir directamente el cliente de correo del sistema
 */
export function generarMailtoUrl({ email, asunto, mensaje }) {
  const qAsunto = encodeURIComponent(asunto || "Capsule Corp Gaming");
  const qMensaje = encodeURIComponent(mensaje || "");
  return `mailto:${email || ""}?subject=${qAsunto}&body=${qMensaje}`;
}
