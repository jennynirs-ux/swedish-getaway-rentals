import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HOST_TERMS_VERSION } from "@/content/hostTerms";
import { payoutState, stripeRequirementLabels } from "@/lib/hostDashboard";
import { startStripeOnboarding, stripeOpenFailed, useHostPayoutStatus } from "@/components/admin/BankAccountSetup";
import { HostTermsAcceptance, isOnlyRentedHere, markOnlyRentedHere } from "./HostOnboardingChecklist";
import { HostTaxDetails, useHostTaxDetails } from "./HostTaxDetails";
import { CalendarExportLink } from "./CalendarExportLink";

// Publishing a listing in one place (like Airbnb's "Publish" step): every
// step that is still missing for this listing, each done right here or with
// one click, without leaving the listing. Stripe brings the host back to the
// same listing and this window (?publish=<id>&edit=<id> on the dashboard).
// The database (prevent_self_publish) checks the same things again on publish.

interface Props {
  propertyId: string | null;
  onOpenChange: (open: boolean) => void;
  /** Publishes; true when it went live */
  onPublish: (propertyId: string) => Promise<boolean>;
  /** Opens the listing's editor on a tab (the window closes) */
  onOpenEditor: (propertyId: string, tab: string) => void;
  /** The editor is open behind this window, so Stripe brings the host back into it */
  fromEditor: boolean;
  publishing: boolean;
}

const READINESS_KEY = "publish-readiness";

export function HostPublishDialog({ propertyId, onOpenChange, onPublish, onOpenEditor, fromEditor, publishing }: Props) {
  const queryClient = useQueryClient();
  const open = !!propertyId;
  const [openingStripe, setOpeningStripe] = useState(false);
  // "I only rent it here", answered in this window
  const [onlyHere, setOnlyHere] = useState(false);

  const { data: listing, refetch } = useQuery({
    queryKey: [READINESS_KEY, propertyId],
    enabled: open,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const [{ data: property }, { data: profile }, { count }] = await Promise.all([
        supabase.from("properties").select("title, latitude, longitude, county, active").eq("id", propertyId!).single(),
        supabase.from("profiles").select("host_terms_accepted_at, host_terms_version").eq("user_id", userData.user?.id ?? "").single(),
        supabase.from("ical_feeds").select("id", { count: "exact", head: true }).eq("property_id", propertyId!),
      ]);
      return {
        title: property?.title ?? "din annons",
        hasLocation: property?.latitude != null && property?.longitude != null && !!property?.county,
        termsAccepted: !!profile?.host_terms_accepted_at && profile?.host_terms_version === HOST_TERMS_VERSION,
        hasCalendarFeed: (count ?? 0) > 0,
      };
    },
  });
  const { data: tax } = useHostTaxDetails();
  const { data: payout, isLoading: payoutLoading } = useHostPayoutStatus(open);
  const stripe = payoutState(payout);

  if (!propertyId) return null;

  const calendarAnswered = !!listing?.hasCalendarFeed || onlyHere || isOnlyRentedHere(propertyId);
  const steps: { id: string; title: string; done: boolean; body?: ReactNode }[] = [
    {
      id: "location",
      title: "Plats på kartan och län",
      done: !!listing?.hasLocation,
      body: (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Gäster söker boenden efter region, så platsen på kartan och länet behövs.</p>
          <Button variant="outline" size="sm" onClick={() => onOpenEditor(propertyId, "location")}>
            Ange plats
          </Button>
        </div>
      ),
    },
    {
      id: "terms",
      title: "Godkänn värdvillkoren",
      done: !!listing?.termsAccepted,
      body: <HostTermsAcceptance idSuffix="publish-window" onAccepted={() => refetch()} />,
    },
    {
      id: "tax",
      title: "Skatteuppgifter",
      done: !!tax?.dac7_complete,
      body: <HostTaxDetails />,
    },
    {
      id: "payouts",
      title: "Utbetalningar via Stripe",
      done: stripe === "ready",
      body: payoutLoading ? (
        <p className="text-sm text-muted-foreground">Kollar med Stripe …</p>
      ) : stripe === "verifying" ? (
        <p className="text-sm text-muted-foreground">
          Stripe kontrollerar dina uppgifter. Det brukar ta några minuter, och det här fönstret kollar igen av sig självt.
        </p>
      ) : stripe === "action_needed" ? (
        <p className="text-sm text-muted-foreground">
          Stripe har stoppat ditt konto. Mejla support@mojjo.se så löser vi det med Stripe.
        </p>
      ) : (
        <div className="space-y-2">
          {stripe === "details_missing" && stripeRequirementLabels(payout?.currentlyDue).length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">Stripe behöver fortfarande:</p>
              <ul className="list-disc pl-5 text-sm">
                {stripeRequirementLabels(payout?.currentlyDue).map((label) => <li key={label}>{label}</li>)}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ett kostnadsfritt Stripe-konto betalar ut din del av varje bokning till din bank. Det tar ungefär fem
              minuter, och Stripe skickar dig tillbaka hit när du är klar.
            </p>
          )}
          <Button
            size="sm"
            disabled={openingStripe}
            onClick={async () => {
              setOpeningStripe(true);
              try {
                await startStripeOnboarding(`/host-dashboard?publish=${propertyId}${fromEditor ? `&edit=${propertyId}` : ""}`);
              } catch (error) {
                stripeOpenFailed(error);
                setOpeningStripe(false);
              }
            }}
          >
            {openingStripe && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {stripe === "details_missing" ? "Slutför hos Stripe" : "Ställ in utbetalningar via Stripe"}
          </Button>
        </div>
      ),
    },
    {
      id: "calendar",
      title: "Andra bokningssajter",
      done: calendarAnswered,
      body: (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Bokningar här bekräftas direkt. Finns boendet också på Airbnb eller Booking.com? Koppla då ihop
            kalendrarna först, så att ingen kan boka samma natt två gånger.
          </p>
          <CalendarExportLink propertyId={propertyId} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenEditor(propertyId, "calendar")}>
              Lägg till kalenderlänkar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                markOnlyRentedHere(propertyId);
                setOnlyHere(true);
              }}
            >
              Jag hyr bara ut här
            </Button>
          </div>
        </div>
      ),
    },
  ];
  const allDone = steps.every((s) => s.done);
  const firstOpen = steps.find((s) => !s.done)?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publicera {listing?.title ?? "din annons"}</DialogTitle>
          <DialogDescription>
            {allDone ? "Allt är klart. Gäster kan boka så fort du publicerar." : "Några steg kvar innan gäster kan boka."}
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-3">
          {steps.map((step) => (
            <li key={step.id} className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <span className={`font-medium ${step.done ? "text-muted-foreground" : ""}`}>{step.title}</span>
              </div>
              {/* One step at a time: the first one still missing is open */}
              {!step.done && step.id === firstOpen && <div className="mt-3">{step.body}</div>}
            </li>
          ))}
        </ol>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Senare
          </Button>
          <Button
            disabled={!allDone || publishing}
            onClick={async () => {
              if (await onPublish(propertyId)) onOpenChange(false);
              else queryClient.invalidateQueries({ queryKey: [READINESS_KEY, propertyId] });
            }}
          >
            {publishing ? "Publicerar …" : "Publicera nu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
