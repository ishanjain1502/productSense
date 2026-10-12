import { ProductValidationFlow } from "@/components/validation/product-validation-flow";
import { ValidationPageShell } from "@/components/validation/page-shell";

export default function FullModePage() {
  return (
    <ValidationPageShell
      modeLabel="Full mode"
      title="Bring your own product context"
      description="Complete each step with your application, feature, market, and go-to-market details. Every section must be filled before you can continue."
    >
      <ProductValidationFlow mode="full" />
    </ValidationPageShell>
  );
}
