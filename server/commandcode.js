const COMMANDCODE_BASE =
  process.env.COMMANDCODE_BASE_URL ||
  "https://api.commandcode.ai/provider/v1";
const DEFAULT_MODEL =
  process.env.COMMANDCODE_MODEL || "deepseek/deepseek-v4-flash";

function getApiKey() {
  return (
    process.env.COMMANDCODE_API_KEY ||
    process.env.COMMAND_CODE_API_KEY ||
    process.env.CMD_API_KEY ||
    null
  );
}

/**
 * @param {Array<{ role: string; content: string }>} messages
 * @param {{ model?: string; temperature?: number }} [options]
 * @returns {Promise<string>}
 */
export async function commandCodeChat(messages, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("COMMANDCODE_API_KEY is not set");
  }

  const model = options.model ?? DEFAULT_MODEL;
  const res = await fetch(`${COMMANDCODE_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.2,
    }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      body?.error?.message ||
      body?.message ||
      `CommandCode request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  const content = body?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("CommandCode returned an empty completion");
  }

  return content.trim();
}

export { DEFAULT_MODEL, getApiKey };
