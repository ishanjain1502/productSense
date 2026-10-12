/**
 * Shared Entire.io instructions for coding-agent regression prompts (ASD-STE100).
 */
export const ENTIRE_IO_AGENT_SECTION = `ENTIRE.IO (REQUIRED WHEN AVAILABLE)
Use Entire (https://entire.io) and the Entire CLI in this repository when Entire is enabled.
Use Entire features to make a better regression decision. Do not rely on code inspection alone.

1. Search recorded history. Use Entire search for prior sessions, checkpoints, and topics tied to this feature or area.
2. Read checkpoints on related commits. Use prompts, transcripts, tool calls, and file attribution from those checkpoints.
3. Trace intent before you judge risk. Link blast-radius findings to checkpoint IDs or session themes when you can.
4. Use Entire Skills when they fit. Examples: search past work, review with recorded intent, hand off session context.
5. Record your work. Commit with Entire checkpoints so regression rationale stays with the code change.

If Entire is not set up in the repo, say so in entireInsights. Then continue with code-only analysis.`;

export const ENTIRE_IO_OUTLINE_BULLET = `8. ENTIRE.IO — require the agent to use Entire search, checkpoints, sessions, and Skills when available; include entireInsights in the JSON output.`;

export const ENTIRE_IO_META_NOTE = `The agent prompt must include a dedicated ENTIRE.IO section with the instructions above.
The JSON output schema must include entireInsights (array of strings).`;

/**
 * Fallback when POST /regression/reports fails — user copies from agent UI (no webapp paste UI yet).
 */
export const AGENT_WINDOW_FALLBACK_SECTION = `AGENT WINDOW DISPLAY (FALLBACK, REQUIRED)
Send the regression report with POST as described above.
Also print the full regression JSON in this agent conversation.
Use the same JSON object you POST. Do not omit fields in the display copy.
Put the JSON in one clear block in the agent window so the user can copy it.
The user may paste this copy into the ProductSense web app later if the POST fails.
If POST fails, say so in the agent window. Then show the JSON again for manual copy.`;

export const AGENT_WINDOW_FALLBACK_OUTLINE_BULLET = `9. AGENT WINDOW DISPLAY — require printing the full regression JSON in the agent chat alongside the POST, for manual copy if submission breaks.`;

export const AGENT_WINDOW_FALLBACK_META_NOTE = `The agent prompt must include the AGENT WINDOW DISPLAY (FALLBACK) section above.
The agent must POST the report and also show the same JSON in the agent window.`;
