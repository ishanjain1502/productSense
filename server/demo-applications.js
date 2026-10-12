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
    id: "flybundles",
    applicationName: "Fly Bundles",
    applicationDescription:
      "Shopify app for product bundles, BOGO, frequently-bought-together, quantity breaks, and volume discounts that lift AOV without custom theme work.",
    teamSize: 12,
    data: {
      applicationName: "Fly Bundles",
      applicationDescription:
        "Shopify app for product bundles, BOGO, frequently-bought-together, quantity breaks, and volume discounts that lift AOV without custom theme work.",
      teamSize: 12,
      featureName: "Scale plan and bundle-discount usage limits",
      featureDescription:
        "Keep full bundle features on the $20 Growth plan while capping eligible bundle discounts per month; add a $50 Scale plan with unlimited discounts, usage dashboard, threshold alerts (70%/90%/100%), and Shopify subscription upgrade flows—without locking core bundle types behind paywalls.",
      featureDocumentName: "fly-bundles-pricing-prd.txt",
      targetMarket:
        "Shopify merchants from small DTC brands to promotion-heavy stores doing $50k–$5M+ annual GMV, especially in fashion, beauty, supplements, and home goods.",
      personas: [
        {
          name: "Aisha — growing DTC founder",
          description:
            "On the $20 plan with a handful of bundles; wants every bundle type available but needs clear visibility before hitting a monthly discount allowance.",
        },
        {
          name: "Marcus — promo-heavy store operator",
          description:
            "Runs BOGO, FBT, and volume campaigns year-round; regularly exceeds limits and will pay $50 for uninterrupted checkout discounts during peak sales.",
        },
        {
          name: "Lena — Shopify agency partner",
          description:
            "Configures bundles for clients; needs predictable billing, legacy-plan policy, and zero surprise checkout breakage when limits apply.",
        },
      ],
      newInstallPersona: {
        name: "Noah — new Shopify merchant",
        description:
          "Just launched on the free tier; exploring fixed bundles and quantity breaks before committing to paid plans.",
      },
      personasDocumentName: "fly-bundles-merchant-research-summary.pdf",
      primaryBuyer: "Shopify store owner / e-commerce operator (self-serve)",
      competitorCompanies:
        "Bold Bundles, Bundler, Kaching Bundles, Wide Bundles, Shopify Bundles",
      geography:
        "Global Shopify merchants; primary adoption in United States, United Kingdom, Canada, and Australia",
      financialThresholdAmount: 120000,
      expectedDurationWeeks: 16,
      expectedResourceConsumption:
        "2 full-stack engineers (Shopify billing + discount enforcement), PM ~40%, designer ~2 weeks for usage UX; builds on existing Fly Bundles app—no separate bundle-engine rebuild.",
      companyProfitabilityDetails:
        "~$9k MRR (~$108k ARR run-rate); ~70% contribution margin (~$6.3k/mo after salaries, growth, and cloud). ~1,125 revenue-equivalent merchants at ~$8/merchant/month. Reported CAC ~$4, ~4-month average retention; revamp targets +10–15% ARPPU via $20→$50 upgrades while holding paid churn within ~2pp of baseline.",
      runwayRemainingMonths: 24,
    },
  },
];

export function demoProjectId(demoId) {
  return `demo-project-${demoId}`;
}

export function demoFeatureId(demoId) {
  return `demo-feature-${demoId}`;
}
