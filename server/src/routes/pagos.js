import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { crearSesionPago, firmaEsValida } from "../lib/epayco.js";
import { enviarCorreoConfirmacionPedido } from "../lib/mailer.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

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

    // Validación estricta de monto y moneda contra el pedido real en base de datos
    if (Number(datos.x_amount) !== Number(pedido.total) || (datos.x_currency_code && datos.x_currency_code !== "COP")) {
      console.error(`[ePayco] Discrepancia en monto o moneda para pedido #${pedidoId}. Esperado: ${pedido.total} COP, Recibido: ${datos.x_amount} ${datos.x_currency_code}`);
      return res.status(400).send("Amount mismatch");
    }

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
      for (const item of pedido.items) {
        const tabla = item.tipo === "carta" ? "cartas" : "accesorios";
        await supabaseAdmin.rpc("descontar_stock", {
          p_tabla: tabla,
          p_id: item.item_id,
          p_cantidad: item.cantidad,
        });
      }
      await supabaseAdmin.from("carrito").delete().eq("user_id", pedido.user_id);

      // Enviar correo de confirmación con diseño profesional y pie de página de Brayan Arenas
      try {
        const { data: usuarioAuth } = await supabaseAdmin.auth.admin.getUserById(pedido.user_id);
        const emailCliente = usuarioAuth?.user?.email;
        const nombreCliente =
          usuarioAuth?.user?.user_metadata?.nombre ||
          usuarioAuth?.user?.email?.split("@")[0] ||
          "Coleccionista";

        if (emailCliente) {
          await enviarCorreoConfirmacionPedido({
            pedido: { ...pedido, referencia_epayco: datos.x_ref_payco },
            emailDestinatario: emailCliente,
            nombreCliente,
          });
        }
      } catch (errEmail) {
        console.error("Error al despachar correo de confirmación:", errEmail);
      }
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("Error procesando webhook de ePayco:", err);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
