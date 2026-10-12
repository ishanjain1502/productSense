import "dotenv/config";
import cors from "cors";
import express from "express";
import { closeDb, getDb, initDb } from "./db.js";

const port = Number(process.env.PORT) || 1337;
const databasePath = process.env.DATABASE_PATH || "./data/app.db";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  try {
    getDb().get("SELECT 1 AS ok", (err, row) => {
      if (err) {
        res.status(503).json({ ok: false, error: "database_unavailable" });
        return;
      }
      res.json({ ok: true, db: row?.ok === 1 ? "connected" : "unknown" });
    });
  } catch {
    res.status(503).json({ ok: false, error: "database_not_initialized" });
  }
});

await initDb(databasePath);

const server = app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down…`);
  server.close(() => {
    closeDb()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
