import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";

sqlite3.verbose();

/** @type {sqlite3.Database | null} */
let db = null;

/**
 * Open SQLite and verify connectivity (SELECT 1).
 * @param {string} databasePath
 * @returns {Promise<sqlite3.Database>}
 */
export function initDb(databasePath) {
  const resolved = path.resolve(databasePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  return new Promise((resolve, reject) => {
    const instance = new sqlite3.Database(resolved, (err) => {
      if (err) {
        reject(err);
        return;
      }
      instance.get("SELECT 1 AS ok", (getErr, row) => {
        if (getErr) {
          instance.close();
          reject(getErr);
          return;
        }
        if (!row || row.ok !== 1) {
          instance.close();
          reject(new Error("SQLite health query failed"));
          return;
        }
        db = instance;
        resolve(instance);
      });
    });
  });
}

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

export function closeDb() {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }
    db.close((err) => {
      db = null;
      if (err) reject(err);
      else resolve();
    });
  });
}
