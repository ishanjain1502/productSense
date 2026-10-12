import { randomBytes } from "node:crypto";
import {
  createCfoMcpSession,
  UnauthorizedError,
  verifyCfoConnection,
} from "./client.js";
import { createOAuthState } from "./oauth-provider.js";

/** @type {Map<string, import('@modelcontextprotocol/sdk/client/streamableHttp.js').StreamableHTTPClientTransport>} */
export const pendingCfoTransports = new Map();

/**
 * @param {number} userId
 * @returns {Promise<
 *   | { kind: "connected"; verified: Awaited<ReturnType<typeof verifyCfoConnection>> }
 *   | { kind: "authorize"; state: string; authorizationUrl: string; transport: import('@modelcontextprotocol/sdk/client/streamableHttp.js').StreamableHTTPClientTransport }
 * >}
 */
export async function beginCfoOAuth(userId) {
  const state = randomBytes(24).toString("base64url");
  let authorizationUrl = null;

  await createOAuthState(userId, state);

  const { client, transport } = createCfoMcpSession(userId, {
    oauthState: state,
    onRedirect(url) {
      authorizationUrl = url;
    },
  });

  try {
    await client.connect(transport);
    await transport.close();
    await client.close();
    const verified = await verifyCfoConnection(userId);
    return { kind: "connected", verified };
  } catch (err) {
    if (err instanceof UnauthorizedError && authorizationUrl) {
      pendingCfoTransports.set(state, transport);
      return {
        kind: "authorize",
        state,
        authorizationUrl: authorizationUrl.toString(),
        transport,
      };
    }
    throw err;
  }
}
