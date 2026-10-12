/**
 * Demo product cards (mirrors client/lib/product-validation.ts DEMO_APPLICATIONS).
 * Used by seed scripts and server-side demo resolution.
 */
export const DEMO_APPLICATIONS = [
  {
    id: "ledgerlite",
    applicationName: "LedgerLite",
    applicationDescription:
      "A minimalist invoicing and expense tracker built for freelancers who hate spreadsheet chaos.",
    teamSize: 1,
    data: {
      applicationName: "LedgerLite",
      applicationDescription:
        "A minimalist invoicing and expense tracker built for freelancers who hate spreadsheet chaos.",
      teamSize: 1,
      featureName: "Recurring invoice templates",
      featureDescription:
        "Let users save invoice layouts and auto-send on a schedule to repeat clients, with gentle payment reminders.",
      featureDocumentName: "recurring-invoices-prd.pdf",
      targetMarket:
        "Independent professionals and micro-businesses in North America and Western Europe who bill by project or retainer.",
      personas: [
        {
          name: "Maya — freelance designer",
          description:
            "Bills 3–8 clients monthly, needs fast invoicing from her phone between client calls.",
        },
        {
          name: "Omar — solo consultant",
          description:
            "Tracks expenses for tax season and wants recurring retainers without manual copy-paste.",
        },
        {
          name: "Priya — part-time bookkeeper",
          description:
            "Manages books for 5 small clients and needs export-friendly records.",
        },
      ],
      newInstallPersona: {
        name: "Jordan — new freelancer",
        description:
          "Just left a full-time job, first time sending professional invoices and nervous about looking legit.",
      },
      personasDocumentName: "ledgerlite-persona-research.docx",
      primaryBuyer: "Freelancer / solopreneur (self-serve)",
      competitorCompanies: "FreshBooks, Wave, Zoho Invoice",
      geography: "United States, Canada, United Kingdom",
      financialThresholdAmount: 8000,
      expectedDurationWeeks: 4,
      expectedResourceConsumption:
        "Solo founder: ~60% engineering time for 4 weeks; no new paid infra; opportunity cost capped at $8k before pausing.",
      companyProfitabilityDetails:
        "Bootstrapped; ~$4.2k MRR, ~85% gross margin after payment fees. Founder salary drawn from revenue; no outside payroll.",
      runwayRemainingMonths: 14,
    },
  },
  {
    id: "flowstack",
    applicationName: "FlowStack",
    applicationDescription:
      "Team workflow hub that connects tasks, docs, and lightweight automations for growing product squads.",
    teamSize: 7,
    data: {
      applicationName: "FlowStack",
      applicationDescription:
        "Team workflow hub that connects tasks, docs, and lightweight automations for growing product squads.",
      teamSize: 7,
      featureName: "Cross-project dependency map",
      featureDescription:
        "Visualize blockers across teams with live links to tasks and Slack digests when critical paths slip.",
      featureDocumentName: "dependency-map-spec-v2.pdf",
      targetMarket:
        "B2B SaaS companies with 20–200 employees running multiple parallel initiatives.",
      personas: [
        {
          name: "Elena — engineering manager",
          description:
            "Needs a single view of what her squad owes other teams before each sprint planning.",
        },
        {
          name: "Sam — product ops lead",
          description:
            "Runs quarterly planning and chases status updates across Notion and Jira.",
        },
        {
          name: "Chris — IC designer",
          description:
            "Wants to know when engineering dependencies unblock design QA without ping-pong in chat.",
        },
      ],
      newInstallPersona: {
        name: "Alicia — new PM at a Series A startup",
        description:
          "Inherited a messy roadmap; evaluating tools that show dependencies without enterprise complexity.",
      },
      personasDocumentName: "flowstack-user-interviews-summary.pdf",
      primaryBuyer: "Head of Product or VP Engineering",
      competitorCompanies: "Linear, Asana, Monday.com, Jira",
      geography: "Global; focus on US and EU mid-market SaaS",
      financialThresholdAmount: 180000,
      expectedDurationWeeks: 14,
      expectedResourceConsumption:
        "2 full-stack engineers, PM at 30%, designer 3 weeks; ~$3k/mo extra graph/alerting infra during beta.",
      companyProfitabilityDetails:
        "Series A; ~$1.8M ARR growing ~15% QoQ. Gross margin ~72%; EBITDA negative (~$180k/mo burn) as we invest in growth.",
      runwayRemainingMonths: 22,
    },
  },
  {
    id: "nimbus",
    applicationName: "Nimbus Cloud Platform",
    applicationDescription:
      "Enterprise multi-cloud control plane for provisioning, policy, and cost governance at scale.",
    teamSize: 1000,
    data: {
      applicationName: "Nimbus Cloud Platform",
      applicationDescription:
        "Enterprise multi-cloud control plane for provisioning, policy, and cost governance at scale.",
      teamSize: 1000,
      featureName: "AI-assisted policy guardrails",
      featureDescription:
        "Suggest and enforce IAM and spend policies from historical incidents, with audit-ready change logs.",
      featureDocumentName: "ai-policy-guardrails-enterprise-brief.pdf",
      targetMarket:
        "Fortune 2000 and large regulated industries running workloads across AWS, Azure, and GCP.",
      personas: [
        {
          name: "Victor — cloud architect",
          description:
            "Designs landing zones and needs policy templates that satisfy security without blocking teams.",
        },
        {
          name: "Mei — FinOps director",
          description:
            "Owns cloud spend accountability and wants proactive anomaly detection tied to budgets.",
        },
        {
          name: "Raj — security compliance lead",
          description:
            "Requires immutable audit trails and mapping to SOC 2 / ISO controls.",
        },
      ],
      newInstallPersona: {
        name: "Diane — newly hired CISO",
        description:
          "Evaluating consolidation vendors after a merger; needs proof of cross-cloud governance fast.",
      },
      personasDocumentName: "nimbus-enterprise-personas-and-buyers.pptx",
      primaryBuyer:
        "Chief Information Security Officer or VP Cloud Infrastructure",
      competitorCompanies:
        "HashiCorp, Flexera, Apptio, native cloud policy tools",
      geography: "North America, EMEA, APAC enterprise accounts",
      financialThresholdAmount: 2500000,
      expectedDurationWeeks: 28,
      expectedResourceConsumption:
        "Dedicated squad (~8 FTE: eng, security, PM, solutions); compliance and pen-test vendors; ~$20k/mo staging cloud and model API during build.",
      companyProfitabilityDetails:
        "Public-cloud division profitable on operating income; platform gross margin ~68%. Parent balance sheet funds strategic bets without near-term fundraise pressure.",
      runwayRemainingMonths: 48,
    },
  },
];

export function demoProjectId(demoId) {
  return `demo-project-${demoId}`;
}

export function demoFeatureId(demoId) {
  return `demo-feature-${demoId}`;
}
