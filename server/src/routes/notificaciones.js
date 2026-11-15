import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { requireAdmin } from "../middleware/auth.js";
import { enviarCorreoMensaje } from "../lib/mailer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, "..", "data", "notificaciones.json");

const router = Router();

function leerNotificaciones() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error leyendo notificaciones.json:", err);
    return [];
  }
}

function guardarNotificaciones(data) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error guardando notificaciones.json:", err);
  }
}

// GET /api/notificaciones (Lista de notificaciones públicas o para el usuario)
router.get("/", async (req, res) => {
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("notificaciones")
        .select("*")
        .order("creado_en", { ascending: false })
        .limit(50);
      if (!error && Array.isArray(data) && data.length > 0) {
        return res.json(data);
      }
    }
  } catch (e) {}

  const listado = leerNotificaciones();
  res.json(listado);
});

// GET /api/notificaciones/enviadas (Historial de mensajes enviados por el admin)
router.get("/enviadas", requireAdmin, async (_req, res) => {
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("notificaciones")
        .select("*")
        .order("creado_en", { ascending: false });
      if (!error && Array.isArray(data)) {
        return res.json(data);
      }
    }
  } catch (e) {}

  const listado = leerNotificaciones();
  res.json(listado);
});

// POST /api/notificaciones/enviar (Despachar notificación y/o correo)
router.post("/enviar", requireAdmin, async (req, res) => {
  const {
    titulo,
    asunto,
    mensaje,
    canal = "ambos", // "plataforma" | "correo" | "ambos"
    categoria = "general", // "general" | "torneo" | "pedido" | "preventa" | "promo"
    destinatarioTipo = "todos", // "todos" | "torneos" | "pedidos" | "especifico"
    destinatarioEmail = "",
    enlace = "",
    enlaceTexto = "",
  } = req.body;

  const tituloFinal = (titulo || asunto || "").trim();
  const mensajeFinal = (mensaje || "").trim();

  if (!tituloFinal || !mensajeFinal) {
    return res.status(400).json({ error: "El título/asunto y el mensaje son obligatorios." });
  }

  // Resolver destinatarios de correo si aplica
  const correosDestino = new Set();

  if (canal === "correo" || canal === "ambos") {
    if (destinatarioTipo === "especifico" && destinatarioEmail) {
      correosDestino.add(destinatarioEmail.trim().toLowerCase());
    } else if (destinatarioTipo === "todos" || destinatarioTipo === "torneos" || destinatarioTipo === "pedidos") {
      // Buscar en perfiles o participantes
      try {
        if (supabaseAdmin) {
          if (destinatarioTipo === "todos" || destinatarioTipo === "pedidos") {
            const { data: profiles } = await supabaseAdmin.from("profiles").select("email").not("email", "is", null);
            (profiles || []).forEach((p) => {
              if (p.email) correosDestino.add(p.email.trim().toLowerCase());
            });
          }

          if (destinatarioTipo === "torneos" || destinatarioTipo === "todos") {
            const { data: part } = await supabaseAdmin.from("torneo_participantes").select("email").not("email", "is", null);
            (part || []).forEach((p) => {
              if (p.email) correosDestino.add(p.email.trim().toLowerCase());
            });
          }
        }
      } catch (err) {
        console.warn("[Notificaciones] No se pudieron cargar correos de Supabase:", err.message);
      }

      // Si no hay correos en BD o para pruebas, asegurar al menos el correo del admin para feedback
      if (correosDestino.size === 0 && process.env.EMAIL_USER) {
        correosDestino.add(process.env.EMAIL_USER);
      }
    }
  }

  // Enviar correos electrónicos si el canal lo contempla
  let emailExito = false;
  const listaCorreos = Array.from(correosDestino);

  if ((canal === "correo" || canal === "ambos") && listaCorreos.length > 0) {
    try {
      emailExito = await enviarCorreoMensaje({
        destinatarios: listaCorreos,
        asunto: tituloFinal,
        titulo: tituloFinal,
        mensaje: mensajeFinal,
        enlace: enlace || null,
        enlaceTexto: enlaceTexto || "Ver detalles",
      });
    } catch (errEmail) {
      console.error("[Notificaciones] Error despachando correo:", errEmail);
    }
  }

  // Construir registro de notificación
  const notificacionId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const registro = {
    id: notificacionId,
    titulo: tituloFinal,
    asunto: tituloFinal,
    mensaje: mensajeFinal,
    canal,
    categoria,
    destinatario_tipo: destinatarioTipo,
    destinatario_email: destinatarioEmail || (destinatarioTipo === "todos" ? "Todos los clientes" : null),
    destinatarios_conteo: listaCorreos.length || 1,
    enlace: enlace || null,
    enlace_texto: enlaceTexto || null,
    leido: false,
    es_global: destinatarioTipo === "todos",
    enviado_por: req.userId || "admin",
    correo_enviado: emailExito,
    creado_en: new Date().toISOString(),
  };

  // Guardar en Supabase si está disponible
  try {
    if (supabaseAdmin) {
      await supabaseAdmin.from("notificaciones").insert([
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
            destinatarios_conteo: registro.destinatarios_conteo,
            correo_enviado: emailExito,
            enlace_texto: enlaceTexto,
          },
          enviado_por: registro.enviado_por,
          creado_en: registro.creado_en,
        },
      ]);
    }
  } catch (errDb) {
    console.warn("[Notificaciones] No se pudo guardar en Supabase (tabla no creada aún):", errDb.message);
  }

  // Guardar en archivo local
  const listado = leerNotificaciones();
  listado.unshift(registro);
  guardarNotificaciones(listado);

  return res.json({
    ok: true,
    mensaje: `Mensaje despachado con éxito.${emailExito ? ` Se enviaron correos a ${listaCorreos.length} destinatario(s).` : ""}`,
    notificacion: registro,
    destinatariosConteo: listaCorreos.length,
    correoEnviado: emailExito,
  });
});

// DELETE /api/notificaciones/:id (Eliminar del historial)
router.delete("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    if (supabaseAdmin) {
      await supabaseAdmin.from("notificaciones").delete().eq("id", id);
    }
  } catch (e) {}

  const listado = leerNotificaciones().filter((n) => n.id !== id);
  guardarNotificaciones(listado);

  res.json({ ok: true });
});

export default router;

