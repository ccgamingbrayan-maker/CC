import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { app } from "../src/app.js";
import { supabaseAdmin } from "../src/lib/supabaseAdmin.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const NOTIF_FILE = path.resolve(__dirname, "..", "src", "data", "notificaciones.json");

describe("Pruebas de Notificaciones y Mensajería en Express", () => {
  let server;
  let baseUrl;
  let dataBackup = null;
  const originalGetUser = supabaseAdmin?.auth?.getUser;
  const originalFrom = supabaseAdmin?.from;

  before(async () => {
    if (fs.existsSync(NOTIF_FILE)) {
      dataBackup = fs.readFileSync(NOTIF_FILE, "utf-8");
    }

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, "127.0.0.1", () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (originalGetUser) supabaseAdmin.auth.getUser = originalGetUser;
    if (originalFrom) supabaseAdmin.from = originalFrom;
    if (dataBackup !== null) {
      fs.writeFileSync(NOTIF_FILE, dataBackup, "utf-8");
    }
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    supabaseAdmin.auth.getUser = async (token) => {
      if (token === "token-valido-cliente") {
        return { data: { user: { id: "usr-cliente-1" } }, error: null };
      }
      if (token === "token-valido-admin") {
        return { data: { user: { id: "usr-admin-1" } }, error: null };
      }
      return { data: { user: null }, error: { message: "Invalid token" } };
    };

    supabaseAdmin.from = (table) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: (_col, val) => ({
              maybeSingle: async () => {
                if (val === "usr-admin-1") {
                  return { data: { rol: "admin" }, error: null };
                }
                return { data: { rol: "cliente" }, error: null };
              },
            }),
            not: () => Promise.resolve({ data: [] }),
          }),
        };
      }
      return {
        select: () => ({
          order: () => Promise.resolve({ data: [] }),
          not: () => Promise.resolve({ data: [] }),
        }),
        insert: () => Promise.resolve({ error: null }),
        delete: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      };
    };
  });

  test("GET /api/notificaciones debe responder 200 OK", async () => {
    const res = await fetch(`${baseUrl}/api/notificaciones`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  test("POST /api/notificaciones/enviar sin token debe responder 401 Unauthorized", async () => {
    const res = await fetch(`${baseUrl}/api/notificaciones/enviar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: "Test", mensaje: "Hola mundo" }),
    });
    assert.equal(res.status, 401);
  });

  test("POST /api/notificaciones/enviar con token cliente debe responder 403 Forbidden", async () => {
    const res = await fetch(`${baseUrl}/api/notificaciones/enviar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token-valido-cliente",
      },
      body: JSON.stringify({ titulo: "Test", mensaje: "Hola mundo" }),
    });
    assert.equal(res.status, 403);
  });

  test("POST /api/notificaciones/enviar con token admin debe despachar y responder 200 OK", async () => {
    const res = await fetch(`${baseUrl}/api/notificaciones/enviar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token-valido-admin",
      },
      body: JSON.stringify({
        titulo: "Torneo de Fin de Semana",
        asunto: "Torneo de Fin de Semana",
        mensaje: "¡Inscripciones abiertas para One Piece OP-09!",
        canal: "plataforma",
        destinatarioTipo: "todos",
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.ok(data.notificacion.id);
  });

  test("GET /api/notificaciones/enviadas con token admin debe responder 200 OK", async () => {
    const res = await fetch(`${baseUrl}/api/notificaciones/enviadas`, {
      headers: { Authorization: "Bearer token-valido-admin" },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });
});
