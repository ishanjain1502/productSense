import { dbGet, dbRun } from "../db-helpers.js";
import { decryptSecret, encryptSecret } from "./crypto.js";
import { loadCfoCredentials, saveCfoCredentials } from "./credentials.js";

function callbackRedirectUrl() {
  const base = process.env.PUBLIC_API_URL || "http://localhost:1337";
  return new URL("/integrations/cfo/callback", base.replace(/\/$/, "") + "/");
}

/**
 * @param {number} userId
 * @param {{
 *   oauthState?: string;
 *   onRedirect?: (url: URL) => void;
 * }} options
 */
export function createCfoOAuthProvider(userId, options = {}) {
  let pendingVerifier = null;

  return {
    get redirectUrl() {
      return callbackRedirectUrl();
    },

    get clientMetadata() {
      return {
        client_name: "ProductSense",
        redirect_uris: [callbackRedirectUrl().toString()],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      };
    },

    async state() {
      return options.oauthState ?? "";
    },

    async clientInformation() {
      const creds = await loadCfoCredentials(userId);
      return creds?.clientInformation;
    },

    async saveClientInformation(clientInformation) {
      const creds = await loadCfoCredentials(userId);
      await saveCfoCredentials(userId, {
        orgId: creds?.orgId ?? null,
        clientInformation,
        tokens: creds?.tokens ?? { access_token: "", token_type: "Bearer" },
      });
    },

    async tokens() {
      const creds = await loadCfoCredentials(userId);
      const tokens = creds?.tokens;
      if (!tokens?.access_token) return undefined;
      return tokens;
    },

    async saveTokens(tokens) {
      const creds = await loadCfoCredentials(userId);
      await saveCfoCredentials(userId, {
        orgId: creds?.orgId ?? null,
        clientInformation: creds?.clientInformation,
        tokens,
      });
    },

    redirectToAuthorization(authorizationUrl) {
      if (options.onRedirect) {
        options.onRedirect(authorizationUrl);
      }
    },

    async saveCodeVerifier(codeVerifier) {
      pendingVerifier = codeVerifier;
      if (options.oauthState) {
        await dbRun(
          `UPDATE cfo_oauth_states SET code_verifier_encrypted = ? WHERE state = ? AND user_id = ?`,
          [
            encryptSecret(codeVerifier),
            options.oauthState,
            userId,
          ]
        );
      }
    },

    async codeVerifier() {
      if (pendingVerifier) return pendingVerifier;
      if (!options.oauthState) {
        throw new Error("No OAuth state for code verifier");
      }
      const row = await dbGet(
        `SELECT code_verifier_encrypted FROM cfo_oauth_states
         WHERE state = ? AND user_id = ? AND consumed_at IS NULL`,
        [options.oauthState, userId]
      );
      if (!row?.code_verifier_encrypted) {
        throw new Error("OAuth code verifier not found");
      }
      return decryptSecret(row.code_verifier_encrypted);
    },
  };
}

/**
 * @param {number} userId
 * @param {string} state
 */
export async function createOAuthState(userId, state) {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await dbRun(
    `INSERT INTO cfo_oauth_states (state, user_id, code_verifier_encrypted, expires_at)
     VALUES (?, ?, ?, ?)`,
    [state, userId, encryptSecret("__pending__"), expiresAt]
  );
}

/**
 * @param {string} state
 */
export async function consumeOAuthState(state) {
  const row = await dbGet(
    `SELECT user_id, expires_at, consumed_at FROM cfo_oauth_states WHERE state = ?`,
    [state]
  );
  if (!row || row.consumed_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  await dbRun(
    `UPDATE cfo_oauth_states SET consumed_at = datetime('now') WHERE state = ?`,
    [state]
  );
  return { userId: row.user_id };
}
