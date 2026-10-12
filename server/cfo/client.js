import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";

import { createCfoOAuthProvider } from "./oauth-provider.js";
import { loadCfoCredentials, setCfoOrgId } from "./credentials.js";

export const CFO_MCP_URL = "https://api.cfo.ai/mcp";

/**
 * @param {number} userId
 * @param {{ oauthState?: string; onRedirect?: (url: URL) => void }} [oauthOptions]
 */
export function createCfoMcpSession(userId, oauthOptions = {}) {
  const authProvider = createCfoOAuthProvider(userId, oauthOptions);
  const transport = new StreamableHTTPClientTransport(new URL(CFO_MCP_URL), {
    authProvider,
  });
  const client = new Client(
    { name: "productsense-server", version: "1.0.0" },
    { capabilities: {} }
  );
  return { client, transport, authProvider };
}

/**
 * @param {number} userId
 * @param {{ oauthState?: string; onRedirect?: (url: URL) => void }} [oauthOptions]
 */
export async function connectCfoMcp(userId, oauthOptions = {}) {
  const session = createCfoMcpSession(userId, oauthOptions);
  await session.client.connect(session.transport);
  return session;
}

/**
 * @param {import('@modelcontextprotocol/sdk/client/index.js').Client} client
 * @param {string} name
 * @param {Record<string, unknown>} args
 */
export async function callCfoTool(client, name, args) {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content
    ?.filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");
  if (!text) {
    return result;
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text, structured: result };
  }
}

/**
 * @param {number} userId
 */
export async function verifyCfoConnection(userId) {
  const { client, transport } = await connectCfoMcp(userId);
  try {
    const orgs = await callCfoTool(client, "list_orgs", {});
    const first = orgs?.orgs?.[0];
    if (first?.org_id) {
      await setCfoOrgId(userId, String(first.org_id));
    }
    return {
      ok: true,
      orgCount: orgs?.orgs?.length ?? 0,
      primaryOrg: first
        ? { orgId: first.org_id, name: first.name, slug: first.slug }
        : null,
    };
  } finally {
    await transport.close();
    await client.close();
  }
}

/**
 * @param {number} userId
 */
export async function getCfoConnectionStatus(userId) {
  const creds = await loadCfoCredentials(userId);
  if (!creds?.tokens?.access_token) {
    return { status: "needs_auth" };
  }
  return {
    status: "connected",
    orgId: creds.orgId,
    connectedAt: creds.connectedAt,
  };
}

export { UnauthorizedError };
