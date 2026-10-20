import { createWorker } from "tesseract.js";

/**
 * Datos de ejemplo basados en el screenshot oficial de Bandai TCG+
 */
export const EJEMPLO_BANDAI_TEXTO = `Posición	Membership Number	Usuarioname	Puntos de victoria	OMW %	OOMW %
1	0000205267	[BC] JackPoe	12	52%	63.5%
2	0000780406	danieldlora	9	64.5%	52.5%
3	0000014931	Niñojackie	9	52%	59.8%
4	0000934049	Lythrick	6	64.5%	48.9%
5	0000138670	SirCrocodile	6	62.5%	47.8%
6	0000029497	S3ph1	6	52%	56.2%
7	0000569050	[BC] Reikuniga	6	47.8%	56.2%
8	0000148790	Spicynuggets73	6	45.8%	56.7%
9	0000419822	[BC] Glauser	6	41.5%	54.2%
10	0001003598	Nicko22	3	62.5%	48.3%
11	0000934053	Lavendertownboy	3	58.3%	52%
12	0000120197	[BC] Arenas	0	45.8%	53%`;

/**
 * Parsea texto crudo copiado de Bandai TCG+ o reconocido por OCR
 */
export function parsearTextoBandai(texto) {
  if (!texto || typeof texto !== "string") return [];

  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const participantes = [];

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];

    // Omitir cabeceras comunes
    if (
      /posici[oó]n/i.test(linea) ||
      /membership/i.test(linea) ||
      /memserrship/i.test(linea) ||
      /usuarioname/i.test(linea) ||
      /usuario/i.test(linea) ||
      /puntos/i.test(linea)
    ) {
      continue;
    }

    // Caso 1: Separado por tabulaciones (copiado directo de tabla web o excel)
    if (linea.includes("\t")) {
      const c = linea.split("\t").map((x) => x.trim()).filter((x) => x !== "");
      if (c.length >= 3) {
        const puesto = c[0].replace(/\D/g, "") || String(participantes.length + 1);
        let bandaiId = "";
        let username = "";
        let puntos = 0;
        let omw = "";

        if (/^\d{6,14}$/.test(c[1])) {
          bandaiId = c[1];
          username = c[2];
          puntos = Number(c[3]) || 0;
          omw = c[4] || "";
        } else {
          username = c[1];
          puntos = Number(c[2]) || 0;
        }

        if (username) {
          const wins = Math.floor(puntos / 3);
          participantes.push({
            id: `p-${Date.now()}-${participantes.length + 1}`,
            puesto: String(puesto),
            bandaiId,
            nombre: username,
            nickname: username,
            puntos,
            wins,
            ccCoins: wins,
            omw,
            deck: "",
            montoPagado: 0,
            estadoPago: "pagado",
            premioGanado: "",
          });
          continue;
        }
      }
    }

    // Caso 2: Línea con formato general: "1 0000205267 [BC] JackPoe 12 52% 63.5%"
    // Expresión regular que captura: Posición (número), Membership (dígitos), Username, Puntos
    const match = linea.match(/^(\d+)\s+(\d{6,14})\s+(.+?)(?:\s+(\d+)\s+(\d+(?:\.\d+)?%?.*)?)?$/);
    if (match) {
      const puesto = match[1];
      const bandaiId = match[2];
      let username = match[3].trim();
      let puntos = Number(match[4] || 0);

      // Si el username aún tiene números al final (caso puntos pegados)
      const subMatch = username.match(/^(.+?)\s+(\d+)$/);
      if (subMatch && !match[4]) {
        username = subMatch[1].trim();
        puntos = Number(subMatch[2]);
      }

      const wins = Math.floor(puntos / 3);
      participantes.push({
        id: `p-${Date.now()}-${participantes.length + 1}`,
        puesto: String(puesto),
        bandaiId,
        nombre: username,
        nickname: username,
        puntos,
        wins,
        ccCoins: wins,
        deck: "",
        montoPagado: 0,
        estadoPago: "pagado",
        premioGanado: "",
      });
      continue;
    }

    // Caso 3: Fallback flexible para OCR o copiado con espacios variables
    const tokens = linea.split(/\s{2,}|\t/);
    if (tokens.length >= 2) {
      const primerToken = tokens[0].trim();
      const numPuesto = primerToken.replace(/\D/g, "");
      if (numPuesto && Number(numPuesto) > 0 && Number(numPuesto) <= 128) {
        let bandaiId = "";
        let username = tokens[1].trim();

        if (/^\d{6,14}$/.test(tokens[1].trim()) && tokens[2]) {
          bandaiId = tokens[1].trim();
          username = tokens[2].trim();
        }

        if (username) {
          const puntos = Number(tokens[3]) || 0;
          const wins = Math.floor(puntos / 3);
          participantes.push({
            id: `p-${Date.now()}-${participantes.length + 1}`,
            puesto: String(numPuesto),
            bandaiId,
            nombre: username,
            nickname: username,
            puntos,
            wins,
            ccCoins: wins,
            deck: "",
            montoPagado: 0,
            estadoPago: "pagado",
            premioGanado: "",
          });
        }
      }
    }
  }

  return participantes;
}

/**
 * Ejecuta OCR sobre una imagen (File, Blob o URL base64) usando Tesseract.js
 */
export async function ocrImagenBandai(imageSource, onProgress) {
  try {
    const worker = await createWorker("spa+eng");
    if (onProgress) {
      onProgress("Analizando imagen y tabla de Bandai TCG+...");
    }
    const ret = await worker.recognize(imageSource);
    await worker.terminate();
    return ret.data.text;
  } catch (error) {
    console.error("Error en OCR Tesseract:", error);
    throw error;
  }
}
