import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface CancellationPolicyDisplayProps {
  policy: "flexible" | "moderate" | "strict";
}

const POLICY_DETAILS = {
  flexible: {
    title: "Flexible",
    description: "Full refund up to 1 day before check-in",
    details: "Cancel up to 24 hours before check-in for a full refund. Cancellations made within 24 hours are non-refundable."
  },
  moderate: {
    title: "Moderate",
    description: "Full refund up to 5 days before check-in",
    details: "Cancel up to 5 days before check-in for a full refund. Cancellations made within 5 days receive a 50% refund."
  },
  strict: {
    title: "Strict",
    description: "50% refund up to 7 days before check-in",
    details: "Cancel up to 7 days before check-in for a 50% refund. Cancellations made within 7 days are non-refundable."
  }
};

export const CancellationPolicyDisplay = ({ policy }: CancellationPolicyDisplayProps) => {
  const policyInfo = POLICY_DETAILS[policy];

  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-1">
          <div className="font-semibold">Cancellation Policy: {policyInfo.title}</div>
          <div className="text-sm">{policyInfo.details}</div>
        </div>
      </AlertDescription>
    </Alert>
  );
};
