"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import { DemoProductCards } from "@/components/validation/demo-product-cards";
import { DocumentAttachment } from "@/components/validation/document-attachment";
import { FinancialReportUpload } from "@/components/validation/financial-report-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  DEMO_APPLICATIONS,
  emptyProductValidation,
  isStepComplete,
  VALIDATION_STEPS,
  type ProductValidationData,
  type ValidationStepId,
} from "@/lib/product-validation";
import { saveValidationSession } from "@/lib/validation-session";
import { cn } from "@/lib/utils";

type ProductValidationFlowProps = {
  mode: "demo" | "full";
};

export function ProductValidationFlow({ mode }: ProductValidationFlowProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedDemoId, setSelectedDemoId] = useState<string | null>(null);
  const [data, setData] = useState<ProductValidationData>(
    emptyProductValidation
  );
  const [financialReportId, setFinancialReportId] = useState<number | null>(
    null
  );
  const [financialReportFileName, setFinancialReportFileName] = useState<
    string | null
  >(null);

  const currentStep = VALIDATION_STEPS[stepIndex];
  const stepComplete = isStepComplete(currentStep.id, data, mode);

  const demoSummaries = useMemo(
    () =>
      DEMO_APPLICATIONS.map(({ id, applicationName, applicationDescription, teamSize }) => ({
        id,
        applicationName,
        applicationDescription,
        teamSize,
      })),
    []
  );

  const patch = useCallback(
    (partial: Partial<ProductValidationData>) => {
      setData((prev) => ({ ...prev, ...partial }));
    },
    []
  );

  const selectDemo = (id: string) => {
    const app = DEMO_APPLICATIONS.find((a) => a.id === id);
    if (!app) return;
    setSelectedDemoId(id);
    setData({ ...app.data });
    setFinancialReportId(null);
    setFinancialReportFileName(null);
    setStepIndex(0);
  };

  const canGoNext = stepComplete;
  const isLastStep = stepIndex === VALIDATION_STEPS.length - 1;

  const demoFormEnabled = mode === "full" || selectedDemoId !== null;

  const goNext = () => {
    if (!canGoNext) return;
    if (isLastStep) {
      saveValidationSession({
        mode,
        demoId: selectedDemoId,
        data,
        financialReportId,
        financialReportFileName,
      });
      router.push(`/${mode}/agent-prompt`);
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const goBack = () => {
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const updatePersona = (
    index: number,
    field: "name" | "description",
    value: string
  ) => {
    setData((prev) => {
      const personas = [...prev.personas] as ProductValidationData["personas"];
      personas[index] = { ...personas[index], [field]: value };
      return { ...prev, personas };
    });
  };

  const renderStepContent = (stepId: ValidationStepId) => {
    const readOnly = mode === "demo";

    switch (stepId) {
      case "application":
        return (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="applicationName">Application</FieldLabel>
              <Input
                id="applicationName"
                value={data.applicationName}
                readOnly={readOnly}
                placeholder="Application name"
                onChange={(e) => patch({ applicationName: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="applicationDescription">
                Description
              </FieldLabel>
              <Textarea
                id="applicationDescription"
                value={data.applicationDescription}
                readOnly={readOnly}
                rows={4}
                placeholder="What does this product do?"
                onChange={(e) =>
                  patch({ applicationDescription: e.target.value })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="teamSize">
                Size of team dedicated to the project
              </FieldLabel>
              <FieldDescription>Exact headcount on this product.</FieldDescription>
              <Input
                id="teamSize"
                type="number"
                min={1}
                readOnly={readOnly}
                value={data.teamSize === "" ? "" : data.teamSize}
                placeholder="e.g. 7"
                onChange={(e) => {
                  const v = e.target.value;
                  patch({
                    teamSize: v === "" ? "" : Math.max(0, parseInt(v, 10) || 0),
                  });
                }}
              />
            </Field>
          </FieldGroup>
        );
      case "feature":
        return (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="featureName">Feature name</FieldLabel>
              <Input
                id="featureName"
                value={data.featureName}
                readOnly={readOnly}
                placeholder="Name of the feature you're validating"
                onChange={(e) => patch({ featureName: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="featureDescription">
                Feature description
              </FieldLabel>
              <Textarea
                id="featureDescription"
                value={data.featureDescription}
                readOnly={readOnly}
                rows={4}
                placeholder="What will this feature do?"
                onChange={(e) =>
                  patch({ featureDescription: e.target.value })
                }
              />
            </Field>
            <DocumentAttachment
              label="Further information"
              fileName={data.featureDocumentName}
              readOnly={readOnly}
              onFileSelect={
                mode === "full"
                  ? (name) => patch({ featureDocumentName: name })
                  : undefined
              }
            />
          </FieldGroup>
        );
      case "market":
        return (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="targetMarket">Target market</FieldLabel>
              <Textarea
                id="targetMarket"
                value={data.targetMarket}
                readOnly={readOnly}
                rows={3}
                placeholder="Who is this product for?"
                onChange={(e) => patch({ targetMarket: e.target.value })}
              />
            </Field>
            <Separator />
            <p className="text-sm font-medium">
              Personas using the app today (3)
            </p>
            {data.personas.map((persona, index) => (
              <Card key={index} className="border-border/60 bg-muted/20">
                <CardHeader className="gap-3 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Persona {index + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <Field>
                    <FieldLabel htmlFor={`persona-name-${index}`}>Name</FieldLabel>
                    <Input
                      id={`persona-name-${index}`}
                      value={persona.name}
                      readOnly={readOnly}
                      onChange={(e) =>
                        updatePersona(index, "name", e.target.value)
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`persona-desc-${index}`}>
                      Description
                    </FieldLabel>
                    <Textarea
                      id={`persona-desc-${index}`}
                      value={persona.description}
                      readOnly={readOnly}
                      rows={2}
                      onChange={(e) =>
                        updatePersona(index, "description", e.target.value)
                      }
                    />
                  </Field>
                </CardContent>
              </Card>
            ))}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="gap-1 pb-2">
                <CardTitle className="text-sm font-medium">
                  New install persona
                </CardTitle>
                <CardDescription>
                  Someone you want to newly adopt the application.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <Field>
                  <FieldLabel htmlFor="new-persona-name">Name</FieldLabel>
                  <Input
                    id="new-persona-name"
                    value={data.newInstallPersona.name}
                    readOnly={readOnly}
                    onChange={(e) =>
                      patch({
                        newInstallPersona: {
                          ...data.newInstallPersona,
                          name: e.target.value,
                        },
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="new-persona-desc">Description</FieldLabel>
                  <Textarea
                    id="new-persona-desc"
                    value={data.newInstallPersona.description}
                    readOnly={readOnly}
                    rows={2}
                    onChange={(e) =>
                      patch({
                        newInstallPersona: {
                          ...data.newInstallPersona,
                          description: e.target.value,
                        },
                      })
                    }
                  />
                </Field>
              </CardContent>
            </Card>
            <DocumentAttachment
              label="Personas document (optional reference)"
              fileName={data.personasDocumentName}
              readOnly={readOnly}
              onFileSelect={
                mode === "full"
                  ? (name) => patch({ personasDocumentName: name })
                  : undefined
              }
            />
          </FieldGroup>
        );
      case "gtm":
        return (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="primaryBuyer">Primary buyer</FieldLabel>
              <Input
                id="primaryBuyer"
                value={data.primaryBuyer}
                readOnly={readOnly}
                placeholder="Who signs the check?"
                onChange={(e) => patch({ primaryBuyer: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="competitors">Competitor companies</FieldLabel>
              <FieldDescription>Separate multiple with commas.</FieldDescription>
              <Input
                id="competitors"
                value={data.competitorCompanies}
                readOnly={readOnly}
                placeholder="Acme, Contoso, …"
                onChange={(e) =>
                  patch({ competitorCompanies: e.target.value })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="geography">Geography</FieldLabel>
              <Input
                id="geography"
                value={data.geography}
                readOnly={readOnly}
                placeholder="Regions or countries"
                onChange={(e) => patch({ geography: e.target.value })}
              />
            </Field>
          </FieldGroup>
        );
      case "financials":
        return (
          <FieldGroup>
            <p className="text-sm font-medium">Feature investment</p>
            <Field>
              <FieldLabel htmlFor="financialThreshold">
                Investment threshold (USD)
              </FieldLabel>
              <FieldDescription>
                Maximum spend or minimum return hurdle for this feature before
                you reconsider or stop.
              </FieldDescription>
              <Input
                id="financialThreshold"
                type="number"
                min={1}
                readOnly={readOnly}
                value={
                  data.financialThresholdAmount === ""
                    ? ""
                    : data.financialThresholdAmount
                }
                placeholder="e.g. 150000"
                onChange={(e) => {
                  const v = e.target.value;
                  patch({
                    financialThresholdAmount:
                      v === "" ? "" : Math.max(0, parseInt(v, 10) || 0),
                  });
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="expectedDurationWeeks">
                Expected build duration (weeks)
              </FieldLabel>
              <FieldDescription>
                Calendar time from kickoff to production-ready for this feature.
              </FieldDescription>
              <Input
                id="expectedDurationWeeks"
                type="number"
                min={1}
                readOnly={readOnly}
                value={
                  data.expectedDurationWeeks === ""
                    ? ""
                    : data.expectedDurationWeeks
                }
                placeholder="e.g. 12"
                onChange={(e) => {
                  const v = e.target.value;
                  patch({
                    expectedDurationWeeks:
                      v === "" ? "" : Math.max(0, parseInt(v, 10) || 0),
                  });
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="expectedResourceConsumption">
                Expected resource consumption
              </FieldLabel>
              <FieldDescription>
                People, infrastructure, and vendors you expect to use over that
                period.
              </FieldDescription>
              <Textarea
                id="expectedResourceConsumption"
                value={data.expectedResourceConsumption}
                readOnly={readOnly}
                rows={4}
                placeholder="e.g. 2 engineers full-time, PM 25%, $5k/mo cloud during beta…"
                onChange={(e) =>
                  patch({ expectedResourceConsumption: e.target.value })
                }
              />
            </Field>
            <Separator />
            <p className="text-sm font-medium">Company financial health</p>
            <Field>
              <FieldLabel htmlFor="companyProfitability">
                Profitability details
              </FieldLabel>
              <FieldDescription>
                Revenue, margins, burn, unit economics, or timeline to
                profitability.
              </FieldDescription>
              <Textarea
                id="companyProfitability"
                value={data.companyProfitabilityDetails}
                readOnly={readOnly}
                rows={3}
                placeholder="e.g. $2M ARR, 70% gross margin, EBITDA negative until Q3…"
                onChange={(e) =>
                  patch({ companyProfitabilityDetails: e.target.value })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="runwayRemainingMonths">
                Runway remaining (months)
              </FieldLabel>
              <FieldDescription>
                Months of cash at current burn without new funding.
              </FieldDescription>
              <Input
                id="runwayRemainingMonths"
                type="number"
                min={1}
                readOnly={readOnly}
                value={
                  data.runwayRemainingMonths === ""
                    ? ""
                    : data.runwayRemainingMonths
                }
                placeholder="e.g. 18"
                onChange={(e) => {
                  const v = e.target.value;
                  patch({
                    runwayRemainingMonths:
                      v === "" ? "" : Math.max(0, parseInt(v, 10) || 0),
                  });
                }}
              />
            </Field>
            <Separator />
            <FinancialReportUpload
              mode={mode}
              demoId={selectedDemoId}
              reportId={financialReportId}
              fileName={financialReportFileName}
              readOnly={mode === "demo" && !demoFormEnabled}
              onChange={({ reportId, fileName }) => {
                setFinancialReportId(reportId);
                setFinancialReportFileName(fileName);
              }}
            />
          </FieldGroup>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {mode === "demo" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Pick a sample product</h2>
            <p className="text-sm text-muted-foreground">
              Choose a card to load realistic context into the form below, then
              walk through each step.
            </p>
          </div>
          <DemoProductCards
            applications={demoSummaries}
            selectedId={selectedDemoId}
            onSelect={selectDemo}
          />
        </section>
      )}

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Product context</h2>
          <ol className="flex flex-wrap gap-2">
            {VALIDATION_STEPS.map((step, index) => {
              const done = isStepComplete(step.id, data, mode);
              const active = index === stepIndex;
              return (
                <li key={step.id}>
                  <Badge
                    variant={active ? "default" : done ? "secondary" : "outline"}
                    className={cn(
                      "gap-1",
                      active && "shadow-sm shadow-primary/20"
                    )}
                  >
                    {done && !active ? (
                      <Check className="size-3" aria-hidden />
                    ) : (
                      <span className="tabular-nums">{index + 1}</span>
                    )}
                    {step.short}
                  </Badge>
                </li>
              );
            })}
          </ol>
        </div>

        <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur-sm">
          <>
            <CardHeader className="gap-1 border-b border-border/60">
              <CardTitle>{currentStep.title}</CardTitle>
              <CardDescription>
                {mode === "demo" && !demoFormEnabled
                  ? "Select a product above to continue."
                  : mode === "full"
                    ? "Fill in every field on this step to continue."
                    : "Review the loaded details, then continue."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {!demoFormEnabled ? (
                <p className="text-sm text-muted-foreground">
                  Demo data will appear here after you select one of the sample
                  products.
                </p>
              ) : (
                renderStepContent(currentStep.id)
              )}
            </CardContent>
          </>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={stepIndex === 0}
              className="gap-1"
            >
              <ChevronLeft className="size-4" />
              Back
            </Button>
            <Button
              type="button"
              onClick={goNext}
              disabled={!demoFormEnabled || !canGoNext}
              className="gap-1"
            >
              {isLastStep ? "Continue to agent prompt" : "Next step"}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
