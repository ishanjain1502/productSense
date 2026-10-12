import { dbGet, dbRun } from "../db-helpers.js";
import { decryptSecret, encryptSecret } from "./crypto.js";

/**
 * @param {number} userId
 */
export async function loadCfoCredentials(userId) {
  const row = await dbGet(
    `SELECT org_id, client_info_encrypted, tokens_encrypted, connected_at
     FROM cfo_oauth_credentials WHERE user_id = ?`,
    [userId]
  );
  if (!row?.tokens_encrypted) return null;
  return {
    orgId: row.org_id ?? null,
    clientInformation: row.client_info_encrypted
      ? JSON.parse(decryptSecret(row.client_info_encrypted))
      : undefined,
    tokens: JSON.parse(decryptSecret(row.tokens_encrypted)),
    connectedAt: row.connected_at,
  };
}

/**
 * @param {number} userId
 * @param {{
 *   orgId?: string | null;
 *   clientInformation?: object;
 *   tokens: object;
 * }} input
 */
export async function saveCfoCredentials(userId, input) {
  const clientBlob = input.clientInformation
    ? encryptSecret(JSON.stringify(input.clientInformation))
    : null;
  const tokensBlob = encryptSecret(JSON.stringify(input.tokens));
  await dbRun(
    `INSERT INTO cfo_oauth_credentials (
      user_id, org_id, client_info_encrypted, tokens_encrypted, connected_at, updated_at
    ) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      org_id = excluded.org_id,
      client_info_encrypted = COALESCE(excluded.client_info_encrypted, cfo_oauth_credentials.client_info_encrypted),
      tokens_encrypted = excluded.tokens_encrypted,
      connected_at = COALESCE(cfo_oauth_credentials.connected_at, excluded.connected_at),
      updated_at = datetime('now')`,
    [userId, input.orgId ?? null, clientBlob, tokensBlob]
  );
}

/**
 * @param {number} userId
 */
export async function clearCfoCredentials(userId) {
  await dbRun(`DELETE FROM cfo_oauth_credentials WHERE user_id = ?`, [userId]);
}

/**
 * @param {number} userId
 * @param {string} orgId
 */
export async function setCfoOrgId(userId, orgId) {
  await dbRun(
    `UPDATE cfo_oauth_credentials SET org_id = ?, updated_at = datetime('now') WHERE user_id = ?`,
    [orgId, userId]
  );
}
