import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { format } from "date-fns";
import { sv } from "date-fns/locale";
// The same rules cancel-booking refunds and reverses by
import {
  dayAfterCheckIn,
  guestRefundAmount,
  hostCancellationRefund,
  payoutDueOn,
  remainingHostShare,
} from "../../../supabase/functions/_shared/payout";
import { stockholmToday } from "../../../supabase/functions/_shared/format";

export type CancelledBy = "guest" | "host" | "platform";

/** The booking columns the dialog needs (amounts in öre) */
export interface CancellableBooking {
  id: string;
  guest_name: string;
  check_in_date: string;
  created_at: string;
  total_amount: number;
  host_amount: number | null;
  service_fee: number | null;
  refunded_amount: number | null;
  host_reversed_amount: number | null;
  host_payout_status: string | null;
  host_payout_due_on: string | null;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
}

// cancel-booking with { preview: true }: days and policy tier counted from the
// day the request came in, the Stripe card fee when the server can read it,
// and (when the server reads them) Stripe's current refund and reversal totals
// and its own plan for this cancellation
interface Preview {
  daysBeforeArrival: number;
  policyPercentage: number;
  hasPayment?: boolean;
  cardFee?: number | null;
  /** Refunded to the guest so far, according to Stripe (öre) */
  alreadyRefunded?: number;
  /** Taken from the host's share so far: Stripe's reversals plus refunds after payout charged to the host (öre) */
  alreadyReversed?: number;
  /** What the server will refund to the guest now (öre) */
  refundAmount?: number;
  /** Of what is taken from the host now: reversed from the transfer (still in the host's Stripe balance) (öre) */
  hostReverseNow?: number;
  /** ...and recorded as a host charge, taken from the host's next payout (already paid out or used for host charges) (öre) */
  hostChargeNow?: number;
  /** Part of the booking's transfer already went to amounts the host owed us */
  hostShareUsedForCharges?: boolean;
  /** An earlier "Avboka" of this booking refunded the guest but did not finish */
  earlierAttempt?: { requestedOn: string | null; cancelledBy: CancelledBy | null; refunded: number };
}

interface Split {
  /** Refunded before this cancellation */
  alreadyRefunded: number;
  /** Refunded to the guest by this cancellation */
  guestRefund: number;
  /** Refunded in total once it is done */
  refundedAfter: number;
  /** Taken from the host's share by this cancellation */
  fromHostNow: number;
  /** What the host still gets afterwards */
  hostKeeps: number;
  /** Our service fee that the guest gets back (in total) */
  feeRefunded: number;
  /** Our service fee that we keep */
  feeKept: number;
}

interface CancelBookingDialogProps {
  booking: CancellableBooking;
  onCancelled: () => void;
}

const sek = (ore: number) =>
  `${(ore / 100).toLocaleString("sv-SE", { minimumFractionDigits: ore % 100 ? 2 : 0, maximumFractionDigits: 2 })} kr`;
const shortDate = (isoDate: string) => format(new Date(isoDate.slice(0, 10)), "d MMM yyyy", { locale: sv });
const isAmount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** The Swedish date a timestamp falls on, "YYYY-MM-DD" */
const stockholmDate = (timestamp: string) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" }).format(new Date(timestamp));

const CHOICES: { value: CancelledBy; label: string; hint: string }[] = [
  {
    value: "guest",
    label: "Gästen avbokar",
    hint: "Återbetalning enligt villkoren, räknat på värdens pris. Serviceavgiften återbetalas inte.",
  },
  {
    value: "host",
    label: "Värden avbokar",
    hint: "Gästen får allt tillbaka. Värden får inget för bokningen och betalar Stripes kortavgift.",
  },
  {
    value: "platform",
    label: "Vi avbokar (eller datumen krockade)",
    hint: "Gästen får allt tillbaka. Vi står för kortavgiften.",
  },
];

// Targets, as cancel-booking computes them. Guest cancels: the guest gets the
// policy % of the host's price in total (our fee is kept). Host or we cancel:
// everything they paid. This cancellation refunds what is still missing of
// that target, and the host's share is reduced by everything refunded, up to
// the whole share; only what isn't already taken back is reversed now.
function cancellationSplit(
  booking: CancellableBooking,
  cancelledBy: CancelledBy,
  policyPercentage: number,
  stripeTotals: { refunded?: number; reversed?: number },
): Split {
  const serviceFee = booking.service_fee ?? 0;
  // Bookings from before host_amount was stored: the guest paid price + fee
  const hostAmount = booking.host_amount ?? Math.max(0, booking.total_amount - serviceFee);
  // Stripe's totals win when the database is behind (e.g. a refund in the dashboard)
  const alreadyRefunded = Math.max(booking.refunded_amount ?? 0, stripeTotals.refunded ?? 0);
  const alreadyReversed = Math.max(booking.host_reversed_amount ?? 0, stripeTotals.reversed ?? 0);
  const refundable = hostCancellationRefund(booking.total_amount, alreadyRefunded);

  const guestRefund =
    cancelledBy === "guest"
      ? Math.min(refundable, Math.max(0, guestRefundAmount(hostAmount, policyPercentage) - alreadyRefunded))
      : refundable;
  const refundedAfter = alreadyRefunded + guestRefund;
  // min(host's share, everything refunded)
  const hostReduction = hostAmount - remainingHostShare(hostAmount, refundedAfter);
  const fromHostNow = Math.max(0, hostReduction - alreadyReversed);
  const feeRefunded = Math.min(serviceFee, Math.max(0, refundedAfter - hostAmount));
  return {
    alreadyRefunded,
    guestRefund,
    refundedAfter,
    fromHostNow,
    hostKeeps: remainingHostShare(hostAmount, Math.max(hostReduction, alreadyReversed)),
    feeRefunded,
    feeKept: serviceFee - feeRefunded,
  };
}

/** The server's own error text instead of "Edge Function returned a non-2xx status code" */
async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  try {
    const body = await (error as { context?: Response })?.context?.json();
    if (typeof body?.error === "string" && body.error) return body.error;
  } catch {
    // Not a JSON response
  }
  return fallback;
}

// Admin "Avboka & återbetala": who cancels and when the request came in decide
// the refund; the dialog previews what the guest gets back, what is taken from
// the host's share and what happens to our fee before anything is done.
const CancelBookingDialog = ({ booking, onCancelled }: CancelBookingDialogProps) => {
  const [open, setOpen] = useState(false);
  const [cancelledBy, setCancelledBy] = useState<CancelledBy | null>(null);
  const [requestedOn, setRequestedOn] = useState(stockholmToday());
  // Kept with the request date and the choice it was computed for, so a
  // changed date or choice never shows the previous one's amounts
  const [preview, setPreview] = useState<{ key: string; data: Preview } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  // The earlier attempt's choice and date are filled in once per opening
  const adoptedEarlier = useRef(false);
  const { toast } = useToast();

  const today = stockholmToday();
  const bookedOn = stockholmDate(booking.created_at);
  const dateError = !requestedOn
    ? "Välj ett datum"
    : requestedOn > today
      ? "Datumet kan inte vara i framtiden"
      : requestedOn < bookedOn
        ? "Datumet är före bokningen gjordes"
        : null;
  const previewKey = `${requestedOn}|${cancelledBy ?? ""}`;

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setCancelledBy(null);
      setRequestedOn(stockholmToday());
      setPreview(null);
      setPreviewError(null);
      adoptedEarlier.current = false;
    }
    setOpen(next);
  };

  // The policy tier depends on the request date and the card fee on who
  // cancels, so ask again when either changes
  useEffect(() => {
    if (!open || dateError) return;
    let stale = false;
    setPreviewError(null);
    supabase.functions
      .invoke("cancel-booking", {
        body: { bookingId: booking.id, preview: true, requestedOn, ...(cancelledBy ? { cancelledBy } : {}) },
      })
      .then(async ({ data, error }) => {
        if (stale) return;
        if (error) {
          const message = await functionErrorMessage(error, "Kunde inte räkna fram återbetalningen");
          if (!stale) setPreviewError(message);
          return;
        }
        const next = data as Preview;
        // An unfinished earlier attempt: finish it with the same choice and
        // date, so the e-mails state the same policy tier it refunded by
        const earlier = next.earlierAttempt;
        if (earlier && !adoptedEarlier.current) {
          adoptedEarlier.current = true;
          if (earlier.requestedOn && earlier.requestedOn !== requestedOn) setRequestedOn(earlier.requestedOn);
          if (earlier.cancelledBy && earlier.cancelledBy !== cancelledBy) setCancelledBy(earlier.cancelledBy);
        }
        setPreview({ key: `${requestedOn}|${cancelledBy ?? ""}`, data: next });
      });
    return () => {
      stale = true;
    };
  }, [open, booking.id, requestedOn, cancelledBy, dateError]);

  const current = !dateError && preview?.key === previewKey ? preview.data : null;
  const hasPayment = current?.hasPayment ?? !!booking.stripe_payment_intent_id;
  const fromStripe = isAmount(current?.alreadyRefunded) || isAmount(current?.alreadyReversed);
  const split =
    current && cancelledBy
      ? cancellationSplit(booking, cancelledBy, current.policyPercentage, {
          refunded: isAmount(current.alreadyRefunded) ? current.alreadyRefunded : undefined,
          reversed: isAmount(current.alreadyReversed) ? current.alreadyReversed : undefined,
        })
      : null;
  const serverRefund = isAmount(current?.refundAmount) ? current.refundAmount : null;
  // The server's own split of what is taken from the host: reversed now from
  // the host's Stripe balance, or recorded as a host charge for the part that
  // was already paid out (or used for what the host owed us)
  const hostSplit =
    current && isAmount(current.hostReverseNow) && isAmount(current.hostChargeNow)
      ? { reverseNow: current.hostReverseNow, chargeNow: current.hostChargeNow, usedForCharges: !!current.hostShareUsedForCharges }
      : null;

  const payoutStatus = booking.host_payout_status;
  const hasTransfer = !!booking.stripe_transfer_id;
  // A held share is paid out the day after check-in, or 85 days after payment
  // if that comes first (older bookings may still carry the later date);
  // a host paid by hand is paid the day after check-in
  const ruleDue = payoutDueOn(booking.check_in_date, booking.created_at);
  const dueOn =
    payoutStatus === "held"
      ? booking.host_payout_due_on && booking.host_payout_due_on < ruleDue
        ? booking.host_payout_due_on
        : ruleDue
      : booking.host_payout_due_on ?? dayAfterCheckIn(booking.check_in_date);
  // Where the host's share is: in the host's own Stripe balance (held, or
  // 'manual' with a transfer), already at their bank (paid out by the job or
  // by hand), or in our account to be paid by hand
  const payByHand = payoutStatus === "manual" && !hasTransfer;
  const paidOut = payoutStatus === "paid_out";
  const legacyPlatform = payoutStatus === "platform" || (payoutStatus === null && !hasTransfer);
  // cancel-booking charges the card fee; release-host-payouts takes it from a
  // later transfer of the host's whenever this one has a transfer (or is held)
  const feeFromPayout = hasTransfer || payoutStatus === "held";

  const cancel = async () => {
    if (!cancelledBy || dateError) return;
    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-booking", {
        body: { bookingId: booking.id, cancelledBy, requestedOn },
      });
      if (error) throw new Error(await functionErrorMessage(error, "Avbokningen gick inte igenom. Inget har ändrats."));
      const refunded = isAmount(data?.refundAmount) ? data.refundAmount : split?.guestRefund ?? 0;
      const outcome =
        refunded > 0
          ? `${sek(refunded)} återbetalas till gästen.`
          : cancelledBy === "guest"
            ? "Ingen ytterligare återbetalning enligt villkoren."
            : "Inget att återbetala.";
      // What the server could not finish (also e-mailed to support). One toast,
      // since a second would replace the first.
      const warnings: string[] = Array.isArray(data?.warnings) ? data.warnings : [];
      toast(
        warnings.length
          ? {
              title: "Avbokad, men något behöver åtgärdas",
              description: `${outcome} ${warnings.join(" ")}`,
              variant: "destructive",
            }
          : { title: "Bokningen är avbokad", description: outcome },
      );
      handleOpenChange(false);
      onCancelled();
    } catch (error) {
      console.error("Cancel booking failed:", error);
      toast({
        title: "Fel",
        description: error instanceof Error ? error.message : "Avbokningen gick inte igenom. Inget har ändrats.",
        variant: "destructive",
      });
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive" title="Avboka & återbetala">
          <XCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avboka & återbetala</DialogTitle>
          <DialogDescription>
            Bokningen för {booking.guest_name} avbokas, datumen blir lediga och gästen får ett mejl.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="space-y-2">
            <Label>Vem avbokar?</Label>
            <RadioGroup value={cancelledBy ?? ""} onValueChange={(value) => setCancelledBy(value as CancelledBy)}>
              {CHOICES.map((choice) => (
                <label key={choice.value} className="flex items-start gap-2 cursor-pointer rounded border p-2">
                  <RadioGroupItem value={choice.value} className="mt-0.5" />
                  <span>
                    <span className="font-medium">{choice.label}</span>
                    <span className="block text-xs text-muted-foreground">{choice.hint}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-1">
            <Label htmlFor="cancel-requested-on">Avbokningen kom in</Label>
            <Input
              id="cancel-requested-on"
              type="date"
              value={requestedOn}
              min={bookedOn}
              max={today}
              onChange={(e) => setRequestedOn(e.target.value)}
              className="w-44"
            />
            {dateError ? (
              <p className="text-xs text-destructive">{dateError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Dagarna före ankomst räknas från den dag gästen bad om avbokning, inte från i dag.
              </p>
            )}
          </div>

          {dateError ? null : previewError ? (
            <p className="text-destructive">{previewError}</p>
          ) : !current ? (
            <p className="text-muted-foreground">Räknar fram återbetalningen…</p>
          ) : !hasPayment ? (
            <p className="text-muted-foreground">Bokningen är inte betald via sajten, så inget återbetalas härifrån.</p>
          ) : !split ? (
            <p className="text-muted-foreground">
              {current.daysBeforeArrival} dagar före ankomst ger villkoren {current.policyPercentage}% om gästen avbokar.
              Välj vem som avbokar för att se beloppen.
            </p>
          ) : (
            <div className="space-y-2 rounded bg-muted p-3">
              <p className="text-xs text-muted-foreground">
                {fromStripe
                  ? "Uppskattning utifrån Stripes nuvarande läge (det som redan är återbetalat och återfört). Servern räknar om mot Stripe när du avbokar."
                  : "Uppskattning utifrån bokningens sparade belopp. Servern stämmer av mot Stripe när du avbokar, så beloppen kan ändras om något redan har återbetalats direkt i Stripe."}
              </p>
              {cancelledBy === "guest" && (
                <p>
                  {current.daysBeforeArrival} dagar före ankomst ger villkoren <strong>{current.policyPercentage}%</strong>{" "}
                  av värdens pris.
                </p>
              )}
              {split.alreadyRefunded > 0 && (
                <p className="text-muted-foreground">
                  Redan återbetalt: {sek(split.alreadyRefunded)}
                  {split.guestRefund > 0 && `, totalt ${sek(split.refundedAfter)} efter avbokningen`}
                </p>
              )}
              <p className="text-base font-semibold">
                Gästen får tillbaka{split.alreadyRefunded > 0 ? " nu" : ""}: {sek(split.guestRefund)}
              </p>

              {legacyPlatform ? (
                <p className="text-muted-foreground">
                  Äldre bokning betald till vårt konto: hela återbetalningen tas från vårt saldo.
                </p>
              ) : payByHand ? (
                <p>
                  Värdens andel minskar med <strong>{sek(split.fromHostNow)}</strong>. Betalningen ligger på vårt konto
                  (värden kunde inte ta emot överföringar), så inget återförs i Stripe och återbetalningen tas från vårt
                  saldo.{" "}
                  {split.hostKeeps > 0
                    ? `Värden ska få ${sek(split.hostKeeps)} för hand den ${shortDate(dueOn)}.`
                    : "Värden ska inte ha något för bokningen."}
                </p>
              ) : paidOut ? (
                <p>
                  Värdens andel är redan utbetald{hasTransfer ? "" : " (för hand)"}, så inget återförs från den.{" "}
                  {(hostSplit?.chargeNow ?? split.fromHostNow) > 0 ? (
                    <>
                      <strong>{sek(hostSplit?.chargeNow ?? split.fromHostNow)}</strong> registreras som en skuld i
                      host_charges och dras från värdens nästa utbetalning
                      {hasTransfer
                        ? "."
                        : " (via Stripe om värden har ett Stripe-konto, annars när du betalar värden för hand nästa gång)."}{" "}
                      Återbetalningen till gästen tas från vårt saldo tills dess.
                    </>
                  ) : (
                    "Värden behöver inte betala tillbaka något."
                  )}
                </p>
              ) : hostSplit ? (
                <div className="space-y-1">
                  <p>
                    Återförs nu från värdens Stripe-saldo: <strong>{sek(hostSplit.reverseNow)}</strong>
                    {payoutStatus === "held" && split.hostKeeps > 0 && (
                      <span className="text-muted-foreground">
                        {" "}
                        (värden får {sek(split.hostKeeps)} den {shortDate(dueOn)})
                      </span>
                    )}
                    {payoutStatus === "held" && split.hostKeeps === 0 && (
                      <span className="text-muted-foreground"> (värden får inget för bokningen)</span>
                    )}
                  </p>
                  {hostSplit.chargeNow > 0 && (
                    <p>
                      Registreras som skuld i host_charges och dras från värdens nästa utbetalning:{" "}
                      <strong>{sek(hostSplit.chargeNow)}</strong>.{" "}
                      {hostSplit.usedForCharges
                        ? "Den delen av bokningen är redan utbetald eller har gått till det värden var skyldig oss."
                        : "Den delen av bokningen är redan utbetald till värden."}{" "}
                      Återbetalningen till gästen tas från vårt saldo tills dess.
                    </p>
                  )}
                </div>
              ) : (
                <p>
                  Tas från värdens andel: <strong>{sek(split.fromHostNow)}</strong>
                  {payoutStatus === "held" && split.hostKeeps > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      (värden får {sek(split.hostKeeps)} den {shortDate(dueOn)})
                    </span>
                  )}
                  {payoutStatus === "held" && split.hostKeeps === 0 && (
                    <span className="text-muted-foreground"> (värden får inget för bokningen)</span>
                  )}
                  <span className="block text-xs text-muted-foreground">
                    Servern kunde inte räkna fram fördelningen. Det som fortfarande ligger i värdens Stripe-saldo återförs
                    direkt; en del som redan är utbetald (eller har gått till värdens skulder) registreras i stället som
                    skuld och dras från värdens nästa utbetalning.
                  </span>
                </p>
              )}

              <p>
                Vår serviceavgift:{" "}
                {split.feeRefunded > 0
                  ? `${sek(split.feeRefunded)} återbetalas till gästen${split.feeKept > 0 ? `, ${sek(split.feeKept)} behålls` : ""}`
                  : `${sek(split.feeKept)} behålls`}
              </p>

              {/* cancel-booking doesn't charge it for the old bookings paid to our account */}
              {cancelledBy === "host" && !legacyPlatform && (
                <p>
                  Stripes kortavgift
                  {isAmount(current.cardFee) ? ` (${sek(current.cardFee)})` : " (beloppet kunde inte läsas från Stripe)"}{" "}
                  debiteras värden.{" "}
                  {feeFromPayout
                    ? "Den dras från värdens nästa utbetalning."
                    : "Värden har inget Stripe-konto som tar emot överföringar, så den kan inte dras automatiskt: dra av den nästa gång du betalar värden för hand (den visas när du markerar en utbetalning som betald)."}
                </p>
              )}
              {cancelledBy === "platform" && <p>Vi står för Stripes kortavgift.</p>}

              {payoutStatus === "manual" && hasTransfer && (
                <p className="text-destructive">
                  Behöver åtgärd: utbetalningen är markerad &quot;betala för hand&quot; men en överföring till värdens
                  Stripe-konto finns ({booking.stripe_transfer_id}), så värdens andel ligger i värdens Stripe-saldo.
                  Betala inte värden för hand; stäm av överföringen i Stripe.
                </p>
              )}
              {current.earlierAttempt && (
                <p className="text-amber-700">
                  En tidigare avbokning av bokningen återbetalade {sek(current.earlierAttempt.refunded)} men blev inte
                  klar. Val och datum är ifyllda från den
                  {current.earlierAttempt.requestedOn ? ` (begärd ${shortDate(current.earlierAttempt.requestedOn)})` : ""}
                  ; inget återbetalas två gånger.
                </p>
              )}
              {serverRefund !== null && serverRefund !== split.guestRefund && (
                <p className="text-destructive">
                  Servern räknar med att återbetala {sek(serverRefund)} nu, inte {sek(split.guestRefund)}. Det är
                  serverns belopp som gäller; kontrollera betalningen i Stripe innan du avbokar.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={working}>
            Behåll bokningen
          </Button>
          <Button variant="destructive" onClick={cancel} disabled={!current || !cancelledBy || working}>
            {working ? "Avbokar…" : "Avboka"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelBookingDialog;
