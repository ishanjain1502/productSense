import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { dbGet, dbRun } from "./db-helpers.js";

const TOKEN_TTL = "7d";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") {
    return "dev-only-productsense-jwt-secret-change-in-prod";
  }
  throw new Error("JWT_SECRET is not set");
}

export async function migrateAuthSchema() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function signToken(user) {
  return jwt.sign(
    { sub: String(user.id), email: user.email },
    getJwtSecret(),
    { expiresIn: TOKEN_TTL }
  );
}

export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, getJwtSecret());
    return {
      id: Number(payload.sub),
      email: String(payload.email),
    };
  } catch {
    return null;
  }
}

export async function registerUser(email, password) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    return { ok: false, status: 400, error: "invalid_email" };
  }
  if (!password || String(password).length < 8) {
    return { ok: false, status: 400, error: "password_too_short" };
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  try {
    const result = await dbRun(
      "INSERT INTO users (email, password_hash) VALUES (?, ?)",
      [normalized, passwordHash]
    );
    const user = { id: result.lastID, email: normalized };
    return {
      ok: true,
      user,
      token: signToken(user),
    };
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "SQLITE_CONSTRAINT") {
      return { ok: false, status: 409, error: "email_in_use" };
    }
    throw err;
  }
}

export async function loginUser(email, password) {
  const normalized = normalizeEmail(email);
  const row = await dbGet(
    "SELECT id, email, password_hash FROM users WHERE email = ?",
    [normalized]
  );
  if (!row) {
    return { ok: false, status: 401, error: "invalid_credentials" };
  }
  const match = await bcrypt.compare(String(password), row.password_hash);
  if (!match) {
    return { ok: false, status: 401, error: "invalid_credentials" };
  }
  const user = { id: row.id, email: row.email };
  return {
    ok: true,
    user,
    token: signToken(user),
  };
}

export async function getUserById(id) {
  const row = await dbGet(
    "SELECT id, email, created_at FROM users WHERE id = ?",
    [id]
  );
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
  };
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const token =
    header && header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: "invalid_token" });
    return;
  }
  req.user = user;
  next();
}
