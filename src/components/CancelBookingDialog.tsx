/**
 * BL-006: Guest-facing booking cancellation dialog.
 * Shows refund estimate, confirms cancellation, and processes via edge function.
 */

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  calculateRefund,
  type CancellationPolicy,
} from "@/lib/refundCalculator";

interface CancelBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  checkInDate: string;
  totalAmount: number; // in smallest currency unit
  currency: string;
  cancellationPolicy: CancellationPolicy;
  onCancelled?: () => void;
}

export function CancelBookingDialog({
  isOpen,
  onClose,
  bookingId,
  checkInDate,
  totalAmount,
  currency,
  cancellationPolicy,
  onCancelled,
}: CancelBookingDialogProps) {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    refundAmount: number;
    refundPercentage: number;
  } | null>(null);

  const refundEstimate = useMemo(
    () => calculateRefund(cancellationPolicy, checkInDate, totalAmount),
    [cancellationPolicy, checkInDate, totalAmount]
  );

  const handleCancel = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "process-cancellation",
        { body: { bookingId } }
      );

      if (error) throw error;

      setResult({
        success: true,
        refundAmount: data.refundAmount,
        refundPercentage: data.refundPercentage,
      });

      toast({
        title: "Booking Cancelled",
        description:
          data.refundPercentage > 0
            ? `A ${data.refundPercentage}% refund of ${(data.refundAmount / 100).toLocaleString()} ${currency} will be processed.`
            : "Your booking has been cancelled.",
      });

      onCancelled?.();
    } catch (err) {
      console.error("Cancellation error:", err);
      toast({
        title: "Error",
        description: "Failed to process cancellation. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Booking Cancelled
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {result.refundPercentage > 0 ? (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="font-medium text-green-800 dark:text-green-200">
                    {result.refundPercentage}% refund: {(result.refundAmount / 100).toLocaleString()} {currency}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    The refund will appear in your account within 5–10 business days.
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    No refund is available under the {cancellationPolicy} cancellation policy at this time.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Cancel Booking
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. Please review the refund details below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Policy</span>
                  <span className="font-medium capitalize">{cancellationPolicy}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Check-in</span>
                  <span className="font-medium">
                    {new Date(checkInDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Booking total</span>
                  <span className="font-medium">
                    {(totalAmount / 100).toLocaleString()} {currency}
                  </span>
                </div>
              </div>

              {refundEstimate.eligible ? (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        Estimated refund: {(refundEstimate.refundAmount / 100).toLocaleString()} {currency} ({refundEstimate.refundPercentage}%)
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        {refundEstimate.reason}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-200">No refund available</p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {refundEstimate.reason}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose} disabled={processing}>
                Keep Booking
              </Button>
              <Button variant="destructive" onClick={handleCancel} disabled={processing}>
                {processing ? "Processing..." : "Confirm Cancellation"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
