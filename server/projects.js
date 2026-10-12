import { randomUUID } from "node:crypto";
import { dbGet, dbRun } from "./db-helpers.js";

export async function migrateProjectsSchema() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      application_name TEXT,
      application_description TEXT,
      team_size INTEGER,
      target_market TEXT,
      geography TEXT,
      primary_buyer TEXT,
      competitor_companies TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  await dbRun(`
    CREATE TABLE IF NOT EXISTS features (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      feature_name TEXT,
      feature_description TEXT,
      feature_document_name TEXT,
      personas_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
}

/**
 * @param {number} userId
 * @param {Record<string, unknown>} productData
 */
export async function createProjectAndFeature(userId, productData) {
  const projectId = randomUUID();
  const featureId = randomUUID();
  const teamSize =
    productData.teamSize === "" || productData.teamSize == null
      ? null
      : Number(productData.teamSize);

  await dbRun(
    `INSERT INTO projects (
      id, user_id, application_name, application_description, team_size,
      target_market, geography, primary_buyer, competitor_companies
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      userId,
      productData.applicationName ?? null,
      productData.applicationDescription ?? null,
      teamSize,
      productData.targetMarket ?? null,
      productData.geography ?? null,
      productData.primaryBuyer ?? null,
      productData.competitorCompanies ?? null,
    ]
  );

  await dbRun(
    `INSERT INTO features (
      id, project_id, feature_name, feature_description,
      feature_document_name, personas_json
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      featureId,
      projectId,
      productData.featureName ?? null,
      productData.featureDescription ?? null,
      productData.featureDocumentName ?? null,
      JSON.stringify({
        personas: productData.personas,
        newInstallPersona: productData.newInstallPersona,
        personasDocumentName: productData.personasDocumentName,
      }),
    ]
  );

  return { projectId, featureId };
}

/**
 * @param {string} featureId
 * @param {number} userId
 */
export async function assertFeatureOwnedByUser(featureId, userId) {
  const row = await dbGet(
    `SELECT f.id FROM features f
     JOIN projects p ON p.id = f.project_id
     WHERE f.id = ? AND p.user_id = ?`,
    [featureId, userId]
  );
  return Boolean(row);
}
