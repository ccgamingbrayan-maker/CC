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
const DATA_FILE = path.resolve(__dirname, "..", "src", "data", "torneos.json");

describe("Pruebas Automatizadas de Autorización en Express", () => {
  let server;
  let baseUrl;
  let dataBackup = null;
  const originalGetUser = supabaseAdmin?.auth?.getUser;
  const originalFrom = supabaseAdmin?.from;

  before(async () => {
    if (fs.existsSync(DATA_FILE)) {
      dataBackup = fs.readFileSync(DATA_FILE, "utf-8");
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
      fs.writeFileSync(DATA_FILE, dataBackup, "utf-8");
    }
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    // Resetear mocks antes de cada test
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
      return {
        select: (cols) => ({
          eq: (field, val) => ({
            maybeSingle: async () => {
              if (table === "profiles") {
                if (val === "usr-admin-1") {
                  return { data: { rol: "admin" }, error: null };
                }
                if (val === "usr-cliente-1") {
                  return { data: { rol: "cliente" }, error: null };
                }
              }
              return { data: null, error: null };
            },
          }),
        }),
        upsert: async () => ({ data: null, error: null }),
        delete: () => ({ eq: async () => ({ data: null, error: null }) }),
        update: () => ({ eq: async () => ({ data: null, error: null }) }),
      };
    };
  });

  test("GET /api/torneos debe ser público (200 OK sin autenticación)", async () => {
    const res = await fetch(`${baseUrl}/api/torneos`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
  });

  test("POST /api/torneos sin token debe responder 401 Unauthorized", async () => {
    const res = await fetch(`${baseUrl}/api/torneos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Torneo Falso" }),
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.match(data.error, /No autenticado/i);
  });

  test("POST /api/torneos con token inválido debe responder 401", async () => {
    const res = await fetch(`${baseUrl}/api/torneos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token-invalido",
      },
      body: JSON.stringify({ nombre: "Torneo Falso" }),
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.match(data.error, /Sesión inválida/i);
  });

  test("POST /api/torneos con usuario cliente (no admin) debe responder 403 Forbidden", async () => {
    const res = await fetch(`${baseUrl}/api/torneos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token-valido-cliente",
      },
      body: JSON.stringify({ nombre: "Torneo Falso" }),
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error, /Acceso denegado: se requiere rol de administrador/i);
  });

  test("POST /api/torneos con usuario admin debe responder 200 OK", async () => {
    const res = await fetch(`${baseUrl}/api/torneos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token-valido-admin",
      },
      body: JSON.stringify({ nombre: "Torneo Oficial Admin", costoInscripcion: 25000 }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.nombre, "Torneo Oficial Admin");
  });

  test("DELETE /api/torneos/:id sin token debe responder 401", async () => {
    const res = await fetch(`${baseUrl}/api/torneos/torneo-test-1`, {
      method: "DELETE",
    });
    assert.equal(res.status, 401);
  });

  test("DELETE /api/torneos/:id con usuario cliente debe responder 403", async () => {
    const res = await fetch(`${baseUrl}/api/torneos/torneo-test-1`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer token-valido-cliente",
      },
    });
    assert.equal(res.status, 403);
  });

  test("DELETE /api/torneos/:id con usuario admin debe responder 200 OK", async () => {
    const res = await fetch(`${baseUrl}/api/torneos/torneo-test-1`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer token-valido-admin",
      },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
  });

  test("POST /api/torneos/:id/participantes con cliente debe responder 403", async () => {
    const res = await fetch(`${baseUrl}/api/torneos/torneo-1/participantes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token-valido-cliente",
      },
      body: JSON.stringify({ nombre: "Hacker" }),
    });
    assert.equal(res.status, 403);
  });

  test("POST /api/torneos/:id/distribuir-premios con cliente debe responder 403", async () => {
    const res = await fetch(`${baseUrl}/api/torneos/torneo-1/distribuir-premios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token-valido-cliente",
      },
      body: JSON.stringify({ pozoTotal: 500000 }),
    });
    assert.equal(res.status, 403);
  });

  test("ALL /api/pagos/probar-correo debe responder 404 Not Found (eliminado)", async () => {
    const resGet = await fetch(`${baseUrl}/api/pagos/probar-correo`);
    assert.equal(resGet.status, 404);

    const resPost = await fetch(`${baseUrl}/api/pagos/probar-correo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "target@test.com" }),
    });
    assert.equal(resPost.status, 404);
  });
});
