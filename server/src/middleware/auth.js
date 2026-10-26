import { supabaseAdmin } from "../lib/supabaseAdmin.js";

/**
 * Middleware para validar que el usuario cuente con una sesión activa en Supabase Auth.
 * Espera el token en la cabecera: Authorization: Bearer <access_token>
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No autenticado" });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Sesión inválida o expirada" });
    }

    req.user = data.user;
    req.userId = data.user.id;
    next();
  } catch (err) {
    console.error("Error en requireAuth:", err);
    return res.status(500).json({ error: "Error interno de autenticación" });
  }
}

/**
 * Middleware para validar que el usuario tenga rol de administrador.
 * Regla de negocio crítica: El rol se verifica SIEMPRE contra la base de datos
 * (public.profiles.rol === 'admin'), NUNCA confiando en user_metadata ni en correos hardcodeados.
 */
export async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No autenticado" });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Sesión inválida o expirada" });
    }

    const userId = data.user.id;

    // Consultar el rol oficial directamente en public.profiles
    const { data: profile, error: errProfile } = await supabaseAdmin
      .from("profiles")
      .select("rol")
      .eq("id", userId)
      .maybeSingle();

    if (errProfile) {
      console.error("Error al consultar perfil del usuario:", errProfile);
      return res.status(500).json({ error: "Error al verificar privilegios" });
    }

    if (!profile || profile.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado: se requiere rol de administrador" });
    }

    req.user = data.user;
    req.userId = userId;
    req.userRole = profile.rol;
    next();
  } catch (err) {
    console.error("Error en requireAdmin:", err);
    return res.status(500).json({ error: "Error interno de autorización" });
  }
}
