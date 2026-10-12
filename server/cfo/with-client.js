import { connectCfoMcp } from "./client.js";

/**
 * @param {number} userId
 * @param {(client: import('@modelcontextprotocol/sdk/client/index.js').Client) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withCfoMcp(userId, fn) {
  const { client, transport } = await connectCfoMcp(userId);
  try {
    return await fn(client);
  } finally {
    await transport.close();
    await client.close();
  }
}
