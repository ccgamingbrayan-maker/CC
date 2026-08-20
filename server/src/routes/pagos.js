import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { crearSesionPago, firmaEsValida } from "../lib/epayco.js";

const router = Router();

// Identifica al usuario a partir del token de sesion de Supabase que manda
// el frontend (Authorization: Bearer <access_token>).
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No autenticado" });

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: "Sesion invalida" });

  req.userId = data.user.id;
  next();
}

// Vuelve a leer el carrito y los precios/stock REALES desde la base de datos.
// Nunca se confia en montos que pudiera mandar el navegador.
async function leerCarritoDesdeDB(userId) {
  const { data: filas } = await supabaseAdmin
    .from("carrito")
    .select("tipo,item_id,cantidad")
    .eq("user_id", userId);

  if (!filas?.length) return [];

  const cartaIds = filas.filter((f) => f.tipo === "carta").map((f) => f.item_id);
  const accIds = filas.filter((f) => f.tipo === "accesorio").map((f) => f.item_id);

  const [{ data: cartas }, { data: accesorios }] = await Promise.all([
    cartaIds.length
      ? supabaseAdmin.from("cartas").select("id,nombre,precio,stock").in("id", cartaIds)
      : Promise.resolve({ data: [] }),
    accIds.length
      ? supabaseAdmin.from("accesorios").select("id,nombre,precio,stock").in("id", accIds)
      : Promise.resolve({ data: [] }),
  ]);

  const mapa = new Map();
  for (const c of cartas ?? []) mapa.set(`carta-${c.id}`, c);
  for (const a of accesorios ?? []) mapa.set(`accesorio-${a.id}`, a);

  return filas
    .map((f) => {
      const p = mapa.get(`${f.tipo}-${f.item_id}`);
      if (!p) return null;
      const cantidad = Math.min(f.cantidad, p.stock ?? f.cantidad);
      return {
        tipo: f.tipo,
        item_id: f.item_id,
        nombre: p.nombre,
        precio: Number(p.precio),
        cantidad,
      };
    })
    .filter(Boolean);
}

// POST /api/pagos/crear-sesion
router.post("/crear-sesion", requireAuth, async (req, res) => {
  try {
    const items = await leerCarritoDesdeDB(req.userId);
    if (!items.length) return res.status(400).json({ error: "El carrito esta vacio" });

    const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

    const { data: pedido, error: errorPedido } = await supabaseAdmin
      .from("pedidos")
      .insert({ user_id: req.userId, estado: "pendiente", items, total })
      .select()
      .single();
    if (errorPedido) throw errorPedido;

    const sesion = await crearSesionPago({
      name: "CapsuleCorp",
      description: `Pedido #${pedido.id}`,
      currency: "COP",
      amount: total,
      invoice: String(pedido.id),
      response: process.env.FRONTEND_RESPONSE_URL,
      confirmation: process.env.EPAYCO_CONFIRMATION_URL,
      method: "POST",
    });

    res.json({ sessionId: sesion.sessionId, pedidoId: pedido.id });
  } catch (err) {
    console.error("Error creando sesion de pago:", err);
    res.status(500).json({ error: "No se pudo iniciar el pago" });
  }
});

// GET /api/pagos/estado/:pedidoId
router.get("/estado/:pedidoId", requireAuth, async (req, res) => {
  const { data: pedido, error } = await supabaseAdmin
    .from("pedidos")
    .select("id,estado,total")
    .eq("id", req.params.pedidoId)
    .eq("user_id", req.userId)
    .maybeSingle();

  if (error || !pedido) return res.status(404).json({ error: "Pedido no encontrado" });
  res.json(pedido);
});

// POST /api/pagos/confirmacion  (webhook llamado por los servidores de ePayco)
router.post("/confirmacion", async (req, res) => {
  try {
    const datos = req.body;
    if (!firmaEsValida(datos)) {
      console.error("Firma invalida en webhook de ePayco - posible fraude", datos);
      return res.status(400).send("Invalid signature");
    }

    const pedidoId = datos.x_id_invoice;
    const { data: pedido } = await supabaseAdmin
      .from("pedidos")
      .select("*")
      .eq("id", pedidoId)
      .maybeSingle();
    if (!pedido) return res.status(200).send("OK"); // nada que hacer, evita reintentos infinitos

    if (pedido.estado !== "pendiente") return res.status(200).send("OK"); // ya procesado, evita duplicados

    const nuevoEstado =
      datos.x_response === "Aceptada"
        ? "pagado"
        : datos.x_response === "Pendiente"
        ? "pendiente"
        : "rechazado";

    await supabaseAdmin
      .from("pedidos")
      .update({ estado: nuevoEstado, referencia_epayco: datos.x_ref_payco })
      .eq("id", pedidoId);

    if (nuevoEstado === "pagado") {
      // Nota: como el pedido solo se procesa una vez (guard de arriba),
      // un simple leer-y-restar es suficiente aqui. Si en el futuro hay
      // muchas ventas simultaneas del mismo producto, conviene mover esto
      // a una funcion RPC atomica en Supabase (igual que "agregar_al_carrito").
      for (const item of pedido.items) {
        const tabla = item.tipo === "carta" ? "cartas" : "accesorios";
        const { data: producto } = await supabaseAdmin
          .from(tabla)
          .select("stock")
          .eq("id", item.item_id)
          .maybeSingle();
        if (producto?.stock != null) {
          const nuevoStock = Math.max(0, producto.stock - item.cantidad);
          await supabaseAdmin.from(tabla).update({ stock: nuevoStock }).eq("id", item.item_id);
        }
      }
      await supabaseAdmin.from("carrito").delete().eq("user_id", pedido.user_id);
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("Error procesando webhook de ePayco:", err);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
