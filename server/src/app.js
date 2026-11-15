import "dotenv/config";
import express from "express";
import cors from "cors";
import pagosRouter from "./routes/pagos.js";
import torneosRouter from "./routes/torneos.js";
import notificacionesRouter from "./routes/notificaciones.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/pagos", pagosRouter);
  app.use("/api/torneos", torneosRouter);
  app.use("/api/notificaciones", notificacionesRouter);

  return app;
}

export const app = createApp();
