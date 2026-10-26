import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { requireAdmin } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, "..", "data", "torneos.json");

const router = Router();

function leerTorneos() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error leyendo torneos.json:", err);
    return [];
  }
}

function guardarTorneos(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error guardando torneos.json:", err);
  }
}

// GET /api/torneos
router.get("/", async (_req, res) => {
  try {
    // Intentar leer de Supabase primero si la tabla existe
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("torneos").select("*").order("fecha", { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        return res.json(data);
      }
    }
  } catch (e) {}

  const torneos = leerTorneos();
  res.json(torneos);
});

// POST /api/torneos (crear o editar torneo)
router.post("/", requireAdmin, async (req, res) => {
  const torneo = req.body;
  if (!torneo || !torneo.nombre) {
    return res.status(400).json({ error: "El nombre del torneo es obligatorio" });
  }

  const torneos = leerTorneos();
  const id = torneo.id || `torneo-${Date.now()}`;
  const registro = {
    ...torneo,
    id,
    participantes: torneo.participantes || [],
    costoInscripcion: Number(torneo.costoInscripcion || 0),
    cupoMaximo: Number(torneo.cupoMaximo || 16),
    pozoPremios: Number(torneo.pozoPremios || 0),
    gastosEvento: Number(torneo.gastosEvento || 0),
    actualizadoEn: new Date().toISOString(),
  };

  const idx = torneos.findIndex((t) => t.id === id);
  if (idx >= 0) {
    torneos[idx] = registro;
  } else {
    torneos.unshift(registro);
  }

  guardarTorneos(torneos);

  // Intentar sincronizar en Supabase
  try {
    if (supabaseAdmin) {
      await supabaseAdmin.from("torneos").upsert(registro);
    }
  } catch (e) {}

  res.json(registro);
});

// DELETE /api/torneos/:id
router.delete("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const torneos = leerTorneos().filter((t) => t.id !== id);
  guardarTorneos(torneos);

  try {
    if (supabaseAdmin) {
      await supabaseAdmin.from("torneos").delete().eq("id", id);
    }
  } catch (e) {}

  res.json({ ok: true });
});

// POST /api/torneos/:id/participantes (agregar o editar participante)
router.post("/:id/participantes", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const participante = req.body;
  const torneos = leerTorneos();
  const tIdx = torneos.findIndex((t) => t.id === id);

  if (tIdx < 0) {
    return res.status(404).json({ error: "Torneo no encontrado" });
  }

  const torneo = torneos[tIdx];
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
    nombre: participante.nombre || "Jugador",
    email: (participante.email || "").toLowerCase().trim(),
    telefono: participante.telefono || "",
    deck: participante.deck || "",
    montoPagado: pagado,
    estadoPago,
    puesto: participante.puesto || "",
    premioGanado: participante.premioGanado || "",
    notas: participante.notas || "",
  };

  const pIdx = participantes.findIndex((p) => p.id === pId);
  if (pIdx >= 0) {
    participantes[pIdx] = pRegistro;
  } else {
    participantes.push(pRegistro);
  }

  torneo.participantes = participantes;
  torneos[tIdx] = torneo;
  guardarTorneos(torneos);

  try {
    if (supabaseAdmin) {
      await supabaseAdmin.from("torneos").update({ participantes }).eq("id", id);
    }
  } catch (e) {}

  res.json(torneo);
});

// DELETE /api/torneos/:id/participantes/:pId
router.delete("/:id/participantes/:pId", requireAdmin, async (req, res) => {
  const { id, pId } = req.params;
  const torneos = leerTorneos();
  const tIdx = torneos.findIndex((t) => t.id === id);

  if (tIdx < 0) {
    return res.status(404).json({ error: "Torneo no encontrado" });
  }

  torneos[tIdx].participantes = (torneos[tIdx].participantes || []).filter((p) => p.id !== pId);
  guardarTorneos(torneos);

  try {
    if (supabaseAdmin) {
      await supabaseAdmin.from("torneos").update({ participantes: torneos[tIdx].participantes }).eq("id", id);
    }
  } catch (e) {}

  res.json(torneos[tIdx]);
});

// POST /api/torneos/:id/distribuir-premios (distribución automática del pull de premios)
router.post("/:id/distribuir-premios", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { pozoTotal, esquema, premiosFisicos } = req.body;
  const torneos = leerTorneos();
  const tIdx = torneos.findIndex((t) => t.id === id);

  if (tIdx < 0) {
    return res.status(404).json({ error: "Torneo no encontrado" });
  }

  const torneo = torneos[tIdx];
  const participantes = torneo.participantes || [];
  const pozo = Number(pozoTotal ?? torneo.pozoPremios ?? 0);

  // Esquemas de porcentajes oficiales
  // top4_standard: 50%, 30%, 10%, 10%
  // top4_split: 50%, 25%, 12.5%, 12.5%
  // top8_premier: 40%, 20%, 10%, 10%, 5%, 5%, 5%, 5%
  // top2: 70%, 30%
  // winner: 100%
  const porcentajes = {
    top4_standard: { 1: 0.50, 2: 0.30, 3: 0.10, 4: 0.10 },
    top4_split: { 1: 0.50, 2: 0.25, 3: 0.125, 4: 0.125 },
    top8_premier: { 1: 0.40, 2: 0.20, 3: 0.10, 4: 0.10, 5: 0.05, 6: 0.05, 7: 0.05, 8: 0.05 },
    top2: { 1: 0.70, 2: 0.30 },
    winner: { 1: 1.00 },
  };

  const tablaPorcentajes = porcentajes[esquema] || porcentajes.top4_standard;

  // Actualizar el premioGanado de cada participante según su puesto
  const actualizados = participantes.map((p) => {
    const numPuesto = parseInt(String(p.puesto || "").replace(/\D/g, ""), 10);
    if (numPuesto && tablaPorcentajes[numPuesto]) {
      const partePozo = Math.round(pozo * tablaPorcentajes[numPuesto]);
      let textoPremio = `$${partePozo.toLocaleString("es-CO")} COP`;
      if (premiosFisicos && premiosFisicos[numPuesto]) {
        textoPremio += ` + ${premiosFisicos[numPuesto]}`;
      }
      return { ...p, premioGanado: textoPremio };
    }
    return p;
  });

  torneo.participantes = actualizados;
  torneo.pozoPremios = pozo;
  torneo.esquemaPremios = esquema || "top4_standard";
  torneos[tIdx] = torneo;
  guardarTorneos(torneos);

  try {
    if (supabaseAdmin) {
      await supabaseAdmin.from("torneos").update({
        participantes: actualizados,
        pozoPremios: pozo,
        esquemaPremios: torneo.esquemaPremios,
      }).eq("id", id);
    }
  } catch (e) {}

  res.json(torneo);
});

export default router;
