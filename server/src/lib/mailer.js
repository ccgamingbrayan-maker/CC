import nodemailer from "nodemailer";

export function getTransporter() {
  const user = process.env.EMAIL_USER?.trim();
  const rawPass = process.env.EMAIL_PASS || "";
  const pass = rawPass.replace(/\s+/g, "").trim();

  if (!user || !pass) {
    console.warn("[Mailer] AVISO: EMAIL_USER o EMAIL_PASS no están configurados en el .env del servidor.");
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Plantilla limpia, sobria y profesional estilo recibo Stripe / Vercel.
 */
export function generarHtmlConfirmacionPedido({ pedido, nombreCliente, frontendUrl }) {
  const urlTienda = frontendUrl || process.env.CORS_ORIGIN || "http://localhost:5173";
  const fecha = new Date().toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const totalFormateado = Number(pedido.total || 0).toLocaleString("es-CO");

  const filasItems = (pedido.items || [])
    .map((item) => {
      const subtotal = (Number(item.precio || 0) * Number(item.cantidad || 1)).toLocaleString("es-CO");
      const precioUnit = Number(item.precio || 0).toLocaleString("es-CO");

      return `
        <tr style="border-bottom: 1px solid #27272a;">
          <td style="padding: 12px 0; color: #f4f4f5; font-size: 13px;">
            <div style="font-weight: 600;">${item.nombre}</div>
            <div style="font-size: 11px; color: #71717a; text-transform: uppercase; margin-top: 2px;">
              ${item.tipo === "carta" ? "Carta" : "Accesorio"}
            </div>
          </td>
          <td style="padding: 12px 0; text-align: center; color: #a1a1aa; font-size: 13px;">
            ${item.cantidad}
          </td>
          <td style="padding: 12px 0; text-align: right; color: #a1a1aa; font-size: 13px;">
            $${precioUnit}
          </td>
          <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #fafafa; font-size: 13px;">
            $${subtotal}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recibo de Pedido #${pedido.id} - CapsuleCorp Gaming</title>
</head>
<body style="margin: 0; padding: 40px 16px; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #121215; border: 1px solid #27272a; border-radius: 8px; overflow: hidden;" cellspacing="0" cellpadding="0">
          
          <!-- Encabezado sobrio -->
          <tr>
            <td style="padding: 28px 32px 20px; border-bottom: 1px solid #27272a;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <div style="font-size: 16px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff;">
                      CapsuleCorp Gaming
                    </div>
                  </td>
                  <td align="right">
                    <span style="font-size: 12px; color: #a1a1aa; font-family: monospace;">Pedido #${pedido.id}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Resumen de compra -->
          <tr>
            <td style="padding: 28px 32px 16px;">
              <div style="font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">
                Confirmación de pago
              </div>
              <p style="margin: 0 0 20px; font-size: 13px; color: #a1a1aa; line-height: 1.5;">
                Hola ${nombreCliente || ""}. Hemos recibido tu pago correctamente y el pedido se encuentra en preparación.
              </p>

              <!-- Metadatos de la orden -->
              <table role="presentation" width="100%" style="background-color: #18181b; border: 1px solid #27272a; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-size: 12px; color: #71717a; padding: 4px 0;">Fecha: <strong style="color: #f4f4f5;">${fecha}</strong></td>
                  <td align="right" style="font-size: 12px; color: #71717a; padding: 4px 0;">Referencia: <strong style="color: #f4f4f5; font-family: monospace;">${pedido.referencia_epayco || "ePayco"}</strong></td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #71717a; padding: 4px 0;">Estado: <strong style="color: #10b981;">Aprobado</strong></td>
                  <td align="right" style="font-size: 12px; color: #71717a; padding: 4px 0;">Moneda: <strong style="color: #f4f4f5;">COP</strong></td>
                </tr>
              </table>

              <!-- Tabla de productos -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr style="border-bottom: 1px solid #3f3f46;">
                    <th align="left" style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #71717a; font-weight: 600;">Artículo</th>
                    <th align="center" style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #71717a; font-weight: 600;">Cant.</th>
                    <th align="right" style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #71717a; font-weight: 600;">Precio</th>
                    <th align="right" style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #71717a; font-weight: 600;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${filasItems}
                </tbody>
              </table>

              <!-- Total final -->
              <table role="presentation" width="100%" style="border-top: 1px solid #3f3f46; padding-top: 14px;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-size: 14px; font-weight: 600; color: #a1a1aa;">Total pagado:</td>
                  <td align="right" style="font-size: 18px; font-weight: 700; color: #ffffff;">
                    $${totalFormateado} COP
                  </td>
                </tr>
              </table>

              <!-- Botón ver pedido -->
              <div style="margin-top: 28px; text-align: center;">
                <a href="${urlTienda}/perfil" target="_blank" style="display: inline-block; background-color: #ffffff; color: #09090b; font-size: 13px; font-weight: 600; text-decoration: none; padding: 10px 24px; border-radius: 6px;">
                  Ver detalles en la tienda
                </a>
              </div>
            </td>
          </tr>

          <!-- Pie de página formal -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0d0d0f; border-top: 1px solid #27272a; font-size: 12px; color: #71717a; line-height: 1.5;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <div style="color: #f4f4f5; font-weight: 600;">CapsuleCorp Gaming</div>
                    <div style="font-size: 11px; color: #71717a; margin-top: 2px;">Brayan Arenas</div>
                  </td>
                  <td align="right" style="font-size: 11px; color: #71717a;">
                    <a href="mailto:${process.env.EMAIL_USER || "ccshop2026@gmail.com"}" style="color: #a1a1aa; text-decoration: underline;">
                      ${process.env.EMAIL_USER || "ccshop2026@gmail.com"}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function enviarCorreoConfirmacionPedido({ pedido, emailDestinatario, nombreCliente }) {
  const transporter = getTransporter();
  if (!transporter) return false;

  const remitente = process.env.EMAIL_USER;
  const html = generarHtmlConfirmacionPedido({
    pedido,
    nombreCliente,
    frontendUrl: process.env.CORS_ORIGIN || "http://localhost:5173",
  });

  const mailOptions = {
    from: `"CapsuleCorp Gaming" <${remitente}>`,
    to: emailDestinatario,
    bcc: remitente,
    subject: `Confirmación de pedido #${pedido.id} - CapsuleCorp Gaming`,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer] Pedido #${pedido.id} enviado a ${emailDestinatario}:`, info.messageId);
    return true;
  } catch (error) {
    console.error("[Mailer] Error enviando correo:", error);
    return false;
  }
}

export async function enviarCorreoPrueba(destinatario) {
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error("Credenciales EMAIL_USER o EMAIL_PASS no configuradas en .env");
  }

  const pedidoMock = {
    id: 1042,
    total: 85000,
    referencia_epayco: "REF-789012",
    items: [
      {
        nombre: "Jewelry Bonney [OP07-019]",
        tipo: "carta",
        cantidad: 1,
        precio: 55000,
      },
      {
        nombre: "Dragon Shield Matte Black",
        tipo: "accesorio",
        cantidad: 1,
        precio: 30000,
      },
    ],
  };

  const html = generarHtmlConfirmacionPedido({
    pedido: pedidoMock,
    nombreCliente: "Brayan Arenas",
    frontendUrl: process.env.CORS_ORIGIN || "http://localhost:5173",
  });

  return await transporter.sendMail({
    from: `"CapsuleCorp Gaming" <${process.env.EMAIL_USER}>`,
    to: destinatario || process.env.EMAIL_USER,
    subject: "Confirmación de pedido #1042 - CapsuleCorp Gaming",
    html,
  });
}
