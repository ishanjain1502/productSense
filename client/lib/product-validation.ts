export type Persona = {
  name: string;
  description: string;
};

export type ProductValidationData = {
  applicationName: string;
  applicationDescription: string;
  teamSize: number | "";
  featureName: string;
  featureDescription: string;
  featureDocumentName: string | null;
  targetMarket: string;
  personas: [Persona, Persona, Persona];
  newInstallPersona: Persona;
  personasDocumentName: string | null;
  primaryBuyer: string;
  competitorCompanies: string;
  geography: string;
};

export const emptyProductValidation = (): ProductValidationData => ({
  applicationName: "",
  applicationDescription: "",
  teamSize: "",
  featureName: "",
  featureDescription: "",
  featureDocumentName: null,
  targetMarket: "",
  personas: [
    { name: "", description: "" },
    { name: "", description: "" },
    { name: "", description: "" },
  ],
  newInstallPersona: { name: "", description: "" },
  personasDocumentName: null,
  primaryBuyer: "",
  competitorCompanies: "",
  geography: "",
});

export type DemoApplicationSummary = {
  id: string;
  applicationName: string;
  applicationDescription: string;
  teamSize: number;
};

export type DemoApplication = DemoApplicationSummary & {
  data: ProductValidationData;
};

export const DEMO_APPLICATIONS: DemoApplication[] = [
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
      primaryBuyer: "Chief Information Security Officer or VP Cloud Infrastructure",
      competitorCompanies:
        "HashiCorp, Flexera, Apptio, native cloud policy tools",
      geography: "North America, EMEA, APAC enterprise accounts",
    },
  },
];

export const VALIDATION_STEPS = [
  { id: "application", title: "Application", short: "Product" },
  { id: "feature", title: "Feature", short: "Feature" },
  { id: "market", title: "Target market", short: "Market" },
  { id: "gtm", title: "Go-to-market", short: "GTM" },
] as const;

export type ValidationStepId = (typeof VALIDATION_STEPS)[number]["id"];

export function isStepComplete(
  stepId: ValidationStepId,
  data: ProductValidationData,
  mode: "demo" | "full"
): boolean {
  const text = (s: string) => s.trim().length > 0;
  const personaComplete = (p: Persona) => text(p.name) && text(p.description);

  switch (stepId) {
    case "application":
      return (
        text(data.applicationName) &&
        text(data.applicationDescription) &&
        typeof data.teamSize === "number" &&
        data.teamSize > 0
      );
    case "feature": {
      const fields =
        text(data.featureName) && text(data.featureDescription);
      if (mode === "full") {
        return fields && data.featureDocumentName !== null;
      }
      return fields;
    }
    case "market": {
      const personasOk = data.personas.every(personaComplete);
      const newOk = personaComplete(data.newInstallPersona);
      return text(data.targetMarket) && personasOk && newOk;
    }
    case "gtm":
      return (
        text(data.primaryBuyer) &&
        text(data.competitorCompanies) &&
        text(data.geography)
      );
    default:
      return false;
  }
}
