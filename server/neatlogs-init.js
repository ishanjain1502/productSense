import { flush, init, shutdown as neatlogsShutdown } from "neatlogs";

let active = false;

export async function initNeatlogs() {
  if (!process.env.NEATLOGS_API_KEY) {
    console.warn("NEATLOGS_API_KEY not set; Neatlogs tracing is disabled");
    return;
  }
  await init({
    endpoint: "https://ingest.neatlogs.com",
    workflowName: "productsense-server",
  });
  active = true;
}

export async function shutdownNeatlogs() {
  if (!active) return;
  await flush();
  await neatlogsShutdown();
  active = false;
}
