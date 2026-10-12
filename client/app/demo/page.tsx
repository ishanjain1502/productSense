import { ProductValidationFlow } from "@/components/validation/product-validation-flow";
import { ValidationPageShell } from "@/components/validation/page-shell";

export default function DemoModePage() {
  return (
    <ValidationPageShell
      modeLabel="Demo mode"
      title="Try ProductSense with sample products"
      description="Pick one of three fictional apps—solo, squad, or enterprise—and walk through the same validation flow with data already filled in."
    >
      <ProductValidationFlow mode="demo" />
    </ValidationPageShell>
  );
}
