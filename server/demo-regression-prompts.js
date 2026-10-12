import {
  AGENT_WINDOW_FALLBACK_SECTION,
  ENTIRE_IO_AGENT_SECTION,
} from "./entire-prompt-snippet.js";

/** @type {Record<string, string>} */
export const DEMO_REGRESSION_PROMPTS = {
  ledgerlite: `You are a coding agent. You work in the LedgerLite repository.

PRODUCT CONTEXT
LedgerLite is a small invoicing and expense application for freelancers.
The dedicated product team has 1 member.
The stack is a single web application with a REST API and a SQLite database.

FEATURE UNDER REVIEW
Name: Recurring invoice templates.
Description: Users save invoice layouts. The system sends invoices on a schedule to repeat clients. The system sends payment reminders.
Reference document: recurring-invoices-prd.pdf.

REGRESSION ANALYSIS TASK
1. Map the blast radius for this feature.
2. List modules, routes, jobs, and data tables that can change.
3. List API contracts that can break for existing clients.
4. List user flows that can fail after release.
5. Propose automated regression tests. Include unit tests and integration tests.
6. List rollout risks. Include timezone logic, duplicate sends, and idempotency.
7. List monitoring signals and alerts for the first 72 hours after release.

OUTPUT FORMAT
Return one JSON object with these keys:
- summary (string)
- blastRadius (array of strings)
- impactedComponents (array of strings)
- apiAndDataImpact (array of strings)
- regressionTests (array of strings)
- rolloutRisks (array of strings)
- recommendedMitigations (array of strings)

SUBMISSION
When your analysis is complete, POST the JSON object to:
{BACKEND_URL}/regression/reports
Use header Content-Type: application/json.
Include field "source": "coding-agent".
Include field "applicationName": "LedgerLite".
Include field "featureName": "Recurring invoice templates".

RULES
Use ASD-STE100 style in all text fields.
Use short sentences.
Use one idea per sentence.
Do not include secret values in the report.`,

  flowstack: `You are a coding agent. You work in the FlowStack repository.

PRODUCT CONTEXT
FlowStack is a team workflow hub. It connects tasks, documents, and light automations.
The dedicated product team has 7 members.
The system integrates with Slack and external task providers.

FEATURE UNDER REVIEW
Name: Cross-project dependency map.
Description: The UI shows blockers across teams. Tasks link across projects. Slack sends digests when critical paths slip.
Reference document: dependency-map-spec-v2.pdf.

REGRESSION ANALYSIS TASK
1. Map the blast radius for graph storage, permissions, and notification pipelines.
2. List services and background workers that can change.
3. List permission rules that can leak data across workspaces.
4. List Slack webhook flows that can duplicate or drop messages.
5. Propose regression tests for graph updates, edge cases, and digest timing.
6. List performance risks for large graphs.
7. List feature flag and rollback steps.

OUTPUT FORMAT
Return one JSON object with these keys:
- summary (string)
- blastRadius (array of strings)
- impactedComponents (array of strings)
- apiAndDataImpact (array of strings)
- regressionTests (array of strings)
- rolloutRisks (array of strings)
- recommendedMitigations (array of strings)

SUBMISSION
When your analysis is complete, POST the JSON object to:
{BACKEND_URL}/regression/reports
Use header Content-Type: application/json.
Include field "source": "coding-agent".
Include field "applicationName": "FlowStack".
Include field "featureName": "Cross-project dependency map".

RULES
Use ASD-STE100 style in all text fields.
Use short sentences.
Use one idea per sentence.
Do not include secret values in the report.`,

  nimbus: `You are a coding agent. You work in the Nimbus Cloud Platform repository.

PRODUCT CONTEXT
Nimbus is an enterprise multi-cloud control plane.
It manages provisioning, policy, and cost governance.
The dedicated product team has 1000 members across platform squads.
The system spans AWS, Azure, and GCP connectors.

FEATURE UNDER REVIEW
Name: AI-assisted policy guardrails.
Description: The system suggests IAM and spend policies from past incidents. The system enforces policies. The system writes audit-ready change logs.
Reference document: ai-policy-guardrails-enterprise-brief.pdf.

REGRESSION ANALYSIS TASK
1. Map the blast radius for policy engines, AI inference paths, and audit storage.
2. List cloud provider integrations that can change behavior.
3. List compliance controls that can break (SOC 2, ISO mappings).
4. List false positive and false negative risks for AI suggestions.
5. Propose regression tests for policy simulation, enforcement, and rollback.
6. List data residency and PII risks in model prompts.
7. List kill-switch and gradual rollout requirements.

OUTPUT FORMAT
Return one JSON object with these keys:
- summary (string)
- blastRadius (array of strings)
- impactedComponents (array of strings)
- apiAndDataImpact (array of strings)
- regressionTests (array of strings)
- rolloutRisks (array of strings)
- recommendedMitigations (array of strings)

SUBMISSION
When your analysis is complete, POST the JSON object to:
{BACKEND_URL}/regression/reports
Use header Content-Type: application/json.
Include field "source": "coding-agent".
Include field "applicationName": "Nimbus Cloud Platform".
Include field "featureName": "AI-assisted policy guardrails".

RULES
Use ASD-STE100 style in all text fields.
Use short sentences.
Use one idea per sentence.
Do not include secret values in the report.`,
};

export function getDemoRegressionPrompt(demoId, backendUrl) {
  const template = DEMO_REGRESSION_PROMPTS[demoId];
  if (!template) return null;
  let prompt = template.replaceAll("{BACKEND_URL}", backendUrl.replace(/\/$/, ""));
  prompt = prompt.replace(
    "REGRESSION ANALYSIS TASK",
    `${ENTIRE_IO_AGENT_SECTION}\n\nREGRESSION ANALYSIS TASK`
  );
  prompt = prompt.replace(
    "- recommendedMitigations (array of strings)",
    "- recommendedMitigations (array of strings)\n- entireInsights (array of strings)"
  );
  prompt = prompt.replace(
    "RULES",
    `${AGENT_WINDOW_FALLBACK_SECTION}\n\nRULES`
  );
  return prompt;
}
