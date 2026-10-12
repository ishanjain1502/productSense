import "dotenv/config";
import { closeDb, initDb } from "../db.js";
import { seedDemoUserAndProjects } from "../seed-demo-data.js";

const databasePath = process.env.DATABASE_PATH || "./data/app.db";

await initDb(databasePath);

try {
  const result = await seedDemoUserAndProjects();
  console.log("Demo seed complete.");
  console.log(`  User: ${result.user.email} (id ${result.user.id})`);
  if (!result.passwordSet) {
    console.log(
      "  Password: default DemoProduct1! (set DEMO_USER_PASSWORD to override)"
    );
  }
  for (const p of result.projects) {
    console.log(
      `  ${p.demoId}: project ${p.projectId}, feature ${p.featureId}`
    );
  }
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await closeDb();
}
