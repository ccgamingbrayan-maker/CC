import "dotenv/config";
import express from "express";
import cors from "cors";
import pagosRouter from "./routes/pagos.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ePayco puede mandar el webhook como form-urlencoded

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/pagos", pagosRouter);

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Backend de CapsuleCorp escuchando en http://localhost:${port}`));
