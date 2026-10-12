import bcrypt from "bcryptjs";
import { dbGet, dbRun } from "./db-helpers.js";
import { migrateAuthSchema } from "./auth.js";
import {
  DEMO_APPLICATIONS,
  demoFeatureId,
  demoProjectId,
} from "./demo-applications.js";
import {
  migrateProjectsSchema,
  parseProjectFinancials,
} from "./projects.js";

export const DEMO_USER_EMAIL =
  process.env.DEMO_USER_EMAIL || "demo@productsense.app";

const DEMO_USER_PASSWORD =
  process.env.DEMO_USER_PASSWORD || "DemoProduct1!";

/**
 * @param {number} userId
 * @param {{ id: string; data: Record<string, unknown> }} demo
 */
async function upsertDemoProjectAndFeature(userId, demo) {
  const productData = demo.data;
  const projectId = demoProjectId(demo.id);
  const featureId = demoFeatureId(demo.id);
  const { teamSize, financialThreshold, durationWeeks, runwayMonths } =
    parseProjectFinancials(productData);

  const existingProject = await dbGet(
    `SELECT id FROM projects WHERE id = ? OR demo_id = ?`,
    [projectId, demo.id]
  );

  if (existingProject) {
    await dbRun(
      `UPDATE projects SET
        user_id = ?,
        demo_id = ?,
        application_name = ?,
        application_description = ?,
        team_size = ?,
        target_market = ?,
        geography = ?,
        primary_buyer = ?,
        competitor_companies = ?,
        financial_threshold_amount = ?,
        expected_duration_weeks = ?,
        expected_resource_consumption = ?,
        profitability_details = ?,
        runway_remaining_months = ?
      WHERE id = ?`,
      [
        userId,
        demo.id,
        productData.applicationName ?? null,
        productData.applicationDescription ?? null,
        teamSize,
        productData.targetMarket ?? null,
        productData.geography ?? null,
        productData.primaryBuyer ?? null,
        productData.competitorCompanies ?? null,
        financialThreshold,
        durationWeeks,
        productData.expectedResourceConsumption ?? null,
        productData.companyProfitabilityDetails ?? null,
        runwayMonths,
        existingProject.id,
      ]
    );
  } else {
    await dbRun(
      `INSERT INTO projects (
        id, user_id, demo_id, application_name, application_description, team_size,
        target_market, geography, primary_buyer, competitor_companies,
        financial_threshold_amount, expected_duration_weeks,
        expected_resource_consumption, profitability_details, runway_remaining_months
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        userId,
        demo.id,
        productData.applicationName ?? null,
        productData.applicationDescription ?? null,
        teamSize,
        productData.targetMarket ?? null,
        productData.geography ?? null,
        productData.primaryBuyer ?? null,
        productData.competitorCompanies ?? null,
        financialThreshold,
        durationWeeks,
        productData.expectedResourceConsumption ?? null,
        productData.companyProfitabilityDetails ?? null,
        runwayMonths,
      ]
    );
  }

  const resolvedProjectId = existingProject?.id ?? projectId;
  const existingFeature = await dbGet(
    `SELECT id FROM features WHERE id = ? OR project_id = ?`,
    [featureId, resolvedProjectId]
  );

  const personasJson = JSON.stringify({
    personas: productData.personas,
    newInstallPersona: productData.newInstallPersona,
    personasDocumentName: productData.personasDocumentName,
  });

  if (existingFeature) {
    await dbRun(
      `UPDATE features SET
        project_id = ?,
        feature_name = ?,
        feature_description = ?,
        feature_document_name = ?,
        personas_json = ?
      WHERE id = ?`,
      [
        resolvedProjectId,
        productData.featureName ?? null,
        productData.featureDescription ?? null,
        productData.featureDocumentName ?? null,
        personasJson,
        existingFeature.id,
      ]
    );
    return { projectId: resolvedProjectId, featureId: existingFeature.id };
  }

  await dbRun(
    `INSERT INTO features (
      id, project_id, feature_name, feature_description,
      feature_document_name, personas_json
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      featureId,
      resolvedProjectId,
      productData.featureName ?? null,
      productData.featureDescription ?? null,
      productData.featureDocumentName ?? null,
      personasJson,
    ]
  );

  return { projectId: resolvedProjectId, featureId };
}

/**
 * Ensures demo user + one project/feature per demo card (idempotent).
 */
export async function seedDemoUserAndProjects() {
  await migrateAuthSchema();
  await migrateProjectsSchema();

  let userRow = await dbGet(
    `SELECT id, email FROM users WHERE email = ? COLLATE NOCASE`,
    [DEMO_USER_EMAIL]
  );

  if (!userRow) {
    const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 10);
    const insert = await dbRun(
      `INSERT INTO users (email, password_hash) VALUES (?, ?)`,
      [DEMO_USER_EMAIL.toLowerCase(), passwordHash]
    );
    userRow = { id: insert.lastID, email: DEMO_USER_EMAIL.toLowerCase() };
  }

  const projects = [];
  for (const demo of DEMO_APPLICATIONS) {
    const ids = await upsertDemoProjectAndFeature(userRow.id, demo);
    projects.push({
      demoId: demo.id,
      projectId: ids.projectId,
      featureId: ids.featureId,
    });
  }

  return {
    user: { id: userRow.id, email: userRow.email },
    projects,
    passwordSet: Boolean(process.env.DEMO_USER_PASSWORD),
  };
}
