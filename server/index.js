import "dotenv/config";
import cors from "cors";
import express from "express";
import {
  authMiddleware,
  getUserById,
  loginUser,
  migrateAuthSchema,
  registerUser,
} from "./auth.js";
import { closeDb, getDb, initDb } from "./db.js";

const port = Number(process.env.PORT) || 1337;
const databasePath = process.env.DATABASE_PATH || "./data/app.db";
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

const app = express();
app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);
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

app.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    const result = await registerUser(email, password);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(201).json({ token: result.token, user: result.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    const result = await loginUser(email, password);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ token: result.token, user: result.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

app.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

await initDb(databasePath);
await migrateAuthSchema();

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
