import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { XCircle } from "lucide-react";

interface Preview {
  daysBeforeArrival: number;
  policyPercentage: number;
  refundAmount: number;
  currency: string;
  hasPayment: boolean;
}

interface CancelBookingDialogProps {
  bookingId: string;
  guestName: string;
  totalAmount: number;
  onCancelled: () => void;
}

const sek = (ore: number) => `${(ore / 100).toLocaleString("sv-SE")} kr`;

// Admin "Avboka & återbetala": shows what the cancellation policy gives (edge
// function cancel-booking, preview) and optionally a full goodwill refund.
const CancelBookingDialog = ({ bookingId, guestName, totalAmount, onCancelled }: CancelBookingDialogProps) => {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [fullRefund, setFullRefund] = useState(false);
  const [working, setWorking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setFullRefund(false);
    supabase.functions
      .invoke("cancel-booking", { body: { bookingId, preview: true } })
      .then(({ data, error }) => {
        if (error) throw error;
        setPreview(data as Preview);
      })
      .catch(() => toast({ title: "Fel", description: "Kunde inte räkna fram återbetalningen", variant: "destructive" }));
  }, [open, bookingId, toast]);

  const refundAmount = fullRefund ? totalAmount : preview?.refundAmount ?? 0;

  const cancel = async () => {
    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-booking", {
        body: { bookingId, ...(fullRefund ? { refundPercentage: 100 } : {}) },
      });
      if (error) throw error;
      toast({
        title: "Bokningen är avbokad",
        description: data.refundAmount > 0 ? `${sek(data.refundAmount)} återbetalas till gästen.` : "Ingen återbetalning enligt villkoren.",
      });
      setOpen(false);
      onCancelled();
    } catch (error) {
      console.error("Cancel booking failed:", error);
      toast({ title: "Fel", description: "Avbokningen gick inte igenom. Inget har ändrats.", variant: "destructive" });
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive" title="Avboka & återbetala">
          <XCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Avboka & återbetala</DialogTitle>
          <DialogDescription>
            Bokningen för {guestName} avbokas, datumen blir lediga och gästen får ett mejl.
          </DialogDescription>
        </DialogHeader>

        {preview ? (
          <div className="space-y-3 text-sm">
            <p>
              {preview.daysBeforeArrival} dagar före ankomst ger villkoren <strong>{preview.policyPercentage}%</strong>{" "}
              återbetalning av {sek(totalAmount)}.
            </p>
            {preview.hasPayment ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={fullRefund} onCheckedChange={(checked) => setFullRefund(checked === true)} />
                Full återbetalning i stället (goodwill)
              </label>
            ) : (
              <p className="text-muted-foreground">Bokningen är inte betald via sajten, så inget återbetalas härifrån.</p>
            )}
            <p className="text-base font-semibold">Återbetalas: {sek(preview.hasPayment ? refundAmount : 0)}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Räknar fram återbetalningen…</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={working}>
            Behåll bokningen
          </Button>
          <Button variant="destructive" onClick={cancel} disabled={!preview || working}>
            {working ? "Avbokar…" : "Avboka"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelBookingDialog;
