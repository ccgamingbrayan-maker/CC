import crypto from "node:crypto";

const APIFY_URL = "https://apify.epayco.co";

// Paso 1: autenticarse contra Apify con PUBLIC_KEY + PRIVATE_KEY para obtener
// un token que se usa para crear la sesion de pago.
export async function apifyLogin() {
  const basic = Buffer.from(
    `${process.env.EPAYCO_PUBLIC_KEY}:${process.env.EPAYCO_PRIVATE_KEY}`
  ).toString("base64");

  const res = await fetch(`${APIFY_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basic}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Apify login fallo (${res.status}): ${await res.text()}`);
  }

  const { token } = await res.json();
  return token;
}

// Paso 2: con el token de Apify, crear la sesion de Smart Checkout.
// `datos` son las propiedades que documenta ePayco (name, currency, amount, etc.)
export async function crearSesionPago(datos) {
  const token = await apifyLogin();

  const res = await fetch(`${APIFY_URL}/payment/session/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ checkout_version: "2", ...datos }),
  });

  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(`No se pudo crear la sesion de pago: ${JSON.stringify(body)}`);
  }

  return body.data; // { sessionId, token }
}

// Valida la firma x_signature que ePayco envia en el webhook de confirmacion.
// Formula oficial: sha256(p_cust_id_cliente^p_key^x_ref_payco^x_transaction_id^x_amount^x_currency_code)
export function firmaEsValida({ x_ref_payco, x_transaction_id, x_amount, x_currency_code, x_signature }) {
  const cadena = [
    process.env.EPAYCO_CUSTOMER_ID,
    process.env.EPAYCO_P_KEY,
    x_ref_payco,
    x_transaction_id,
    x_amount,
    x_currency_code,
  ].join("^");

  const firmaCalculada = crypto.createHash("sha256").update(cadena).digest("hex");
  return firmaCalculada === x_signature;
}
