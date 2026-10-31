import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Check, Circle, X, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HOST_TERMS_PATH, HOST_TERMS_VERSION } from "@/content/hostTerms";
import { HOST_PAYOUT_TIMING_SV } from "@/lib/hostDashboard";
import { useHostPayoutStatus } from "@/components/admin/BankAccountSetup";

/** Invalidate this after anything that changes a step (wizard, editor saves, publishing, terms) */
export const HOST_CHECKLIST_KEY = ["host-onboarding-checklist"];

/** Which rule of the database's publish check stopped a publish (tested in src/lib/hostDashboard.test.ts) */
export { publishBlocker, type PublishBlocker } from "@/lib/hostDashboard";

// "I only rent here": the host's answer to the calendar step, per listing.
// There is no column for it, so it is kept in this browser; asking again on
// another device costs one click.
const onlyHereKey = (propertyId: string) => `calendarOnlyHere:${propertyId}`;
export const isOnlyRentedHere = (propertyId: string) => {
  try {
    return localStorage.getItem(onlyHereKey(propertyId)) === "1";
  } catch {
    return false;
  }
};
export const markOnlyRentedHere = (propertyId: string) => {
  try {
    localStorage.setItem(onlyHereKey(propertyId), "1");
  } catch {
    // Private mode: the step simply stays open
  }
};

const DISMISSED_KEY = "hostOnboardingDismissed";
const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Tick + link + Accept: stores the acceptance through accept_host_terms
 * (publishing needs profiles.host_terms_accepted_at). Also used by the
 * dashboard when a Publish is refused for missing terms.
 */
export const HostTermsAcceptance = ({ onAccepted, idSuffix = "checklist" }: { onAccepted: () => void; idSuffix?: string }) => {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const id = `accept-host-terms-${idSuffix}`;

  const accept = async () => {
    setSaving(true);
    const { error } = await supabase.rpc("accept_host_terms", { _version: HOST_TERMS_VERSION });
    setSaving(false);
    if (error) {
      toast.error(`Det gick inte att spara ditt godkännande: ${error.message}`);
      return;
    }
    toast.success("Tack! Du har godkänt värdvillkoren.");
    onAccepted();
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <Checkbox id={id} checked={checked} onCheckedChange={(v) => setChecked(v === true)} className="mt-0.5" />
        <label htmlFor={id} className="text-sm leading-snug">
          Jag har läst och godkänner{" "}
          <a
            href={HOST_TERMS_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            värdvillkoren
          </a>{" "}
          (på engelska)
        </label>
      </div>
      <Button size="sm" onClick={accept} disabled={!checked || saving} className="shrink-0">
        {saving ? "Sparar …" : "Godkänn"}
      </Button>
    </div>
  );
};

interface ChecklistProperty {
  id: string;
  title: string;
  active: boolean;
  hero_image_url: string | null;
  description: string | null;
  price_per_night: number | null;
  latitude: number | null;
  longitude: number | null;
  county: string | null;
}

interface ChecklistData {
  termsAccepted: boolean;
  /** DAC7 tax details saved and complete (payouts need them, publishing doesn't) */
  taxDone: boolean;
  /** The profile's stored flag, used until Stripe's live answer is in */
  storedPayoutReady: boolean;
  /** The listing the steps are about: the first draft, else the first listing */
  target: ChecklistProperty | null;
  targetHasCalendarFeed: boolean;
}

const loadChecklist = async (): Promise<ChecklistData | null> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, stripe_connect_ready, host_terms_accepted_at, host_terms_version")
    .eq("user_id", userData.user.id)
    .single();
  if (profileError) throw profileError;

  const { data: properties, error: propertiesError } = await supabase
    .from("properties")
    .select("id, title, active, hero_image_url, description, price_per_night, latitude, longitude, county")
    .eq("host_id", profile.id)
    .order("created_at", { ascending: true });
  if (propertiesError) throw propertiesError;

  const { data: tax } = await supabase.from("host_tax_profiles").select("dac7_complete").eq("profile_id", profile.id).maybeSingle();

  const list = (properties || []) as ChecklistProperty[];
  const target = list.find((p) => !p.active) ?? list[0] ?? null;

  let targetHasCalendarFeed = false;
  if (target) {
    const { count } = await supabase
      .from("ical_feeds")
      .select("id", { count: "exact", head: true })
      .eq("property_id", target.id);
    targetHasCalendarFeed = (count ?? 0) > 0;
  }

  return {
    // A new version of the terms asks again (publishing only needs some acceptance)
    termsAccepted: !!profile.host_terms_accepted_at && profile.host_terms_version === HOST_TERMS_VERSION,
    taxDone: !!tax?.dac7_complete,
    storedPayoutReady: !!profile.stripe_connect_ready,
    target,
    targetHasCalendarFeed,
  };
};

interface Props {
  /** Switch the dashboard tab, e.g. "payouts" */
  onGoToTab: (tab: string) => void;
  onCreateProperty: () => void;
  /** Open the listing editor on one of its tabs */
  onEditProperty: (propertyId: string, tab: string) => void;
  /** The dashboard's publish (same checks and messages as the card's Publish button) */
  onPublish: (propertyId: string) => void;
  /** A publish is running: the Publish button waits, so a double click can't publish twice */
  publishing?: boolean;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  done: boolean;
  actionLabel?: string;
  action?: () => void;
  actionDisabled?: boolean;
  secondaryLabel?: string;
  secondaryAction?: () => void;
  /** Custom controls instead of the action button */
  body?: React.ReactNode;
}

/**
 * Onboarding checklist shown to new hosts.
 *
 * It reads the same live data as the rest of the dashboard: the Stripe status
 * shared with the Bank Account tab, and the listing itself, reloaded when the
 * window regains focus and whenever the dashboard invalidates
 * HOST_CHECKLIST_KEY. Publishing is left to the dashboard and the database's
 * publish check, so the checklist can never contradict it.
 */
const HostOnboardingChecklist = ({ onGoToTab, onCreateProperty, onEditProperty, onPublish, publishing = false }: Props) => {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(readDismissed);

  const { data, isLoading } = useQuery({
    queryKey: HOST_CHECKLIST_KEY,
    queryFn: loadChecklist,
    enabled: !dismissed,
    refetchOnWindowFocus: true,
  });
  const { data: payout } = useHostPayoutStatus(!dismissed);

  const refresh = () => queryClient.invalidateQueries({ queryKey: HOST_CHECKLIST_KEY });

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Hidden for this visit only
    }
    setDismissed(true);
  };

  if (dismissed || isLoading || !data) return null;

  const { target } = data;
  const payoutReady = payout ? payout.ready : data.storedPayoutReady;
  const hasLocation = !!target && target.latitude != null && target.longitude != null && !!target.county;
  // Without a listing, every listing step starts with creating one
  const edit = (tab: string) => (target ? () => onEditProperty(target.id, tab) : onCreateProperty);

  const items: ChecklistItem[] = [
    {
      id: "create",
      label: "Lägg till ditt första boende",
      description: "Lägg till en stuga, ett fritidshus eller en lägenhet för att börja hyra ut.",
      done: !!target,
      actionLabel: "Lägg till boende",
      action: onCreateProperty,
    },
    {
      id: "photo",
      label: "Lägg till bilder",
      description: "Välj en huvudbild och några till. Annonser med bilder får många fler bokningar.",
      done: !!target?.hero_image_url,
      actionLabel: "Lägg till bilder",
      action: edit("gallery"),
    },
    {
      id: "description",
      label: "Skriv en beskrivning",
      description: "Berätta för gästerna vad som gör ditt boende speciellt.",
      done: (target?.description?.trim().length ?? 0) > 30,
      actionLabel: "Redigera beskrivning",
      action: edit("basic"),
    },
    {
      id: "pricing",
      label: "Ange ditt pris per natt",
      description: "Grundpriset som visas i sökresultaten.",
      done: (target?.price_per_night ?? 0) > 0,
      actionLabel: "Ange pris",
      action: edit("pricing"),
    },
    {
      id: "location",
      label: "Sätt ut boendet på kartan",
      description: "Placera nålen på kartan och välj län, så att ditt boende visas i rätt region.",
      done: hasLocation,
      actionLabel: "Ange plats",
      action: edit("location"),
    },
    {
      id: "calendar",
      label: "Synka dina andra kalendrar",
      description:
        "Hyr du också ut via Airbnb, Booking.com eller någon annanstans? Koppla ihop kalendrarna åt båda hållen, så att ingen kan boka samma natt två gånger.",
      done: !!target && (data.targetHasCalendarFeed || isOnlyRentedHere(target.id)),
      actionLabel: "Lägg till kalenderlänkar",
      action: edit("calendar"),
      secondaryLabel: target ? "Jag hyr bara ut här" : undefined,
      secondaryAction: target
        ? () => {
            markOnlyRentedHere(target.id);
            refresh();
          }
        : undefined,
    },
    {
      id: "terms",
      label: "Godkänn värdvillkoren",
      description: "Hur avgifter, utbetalningar, avbokningar och återbetalningar fungerar.",
      done: data.termsAccepted,
      body: <HostTermsAcceptance onAccepted={refresh} />,
    },
    {
      id: "tax",
      label: "Lägg till dina skatteuppgifter",
      description:
        "Enligt lag (EU:s DAC7-regler) måste vi samla in några uppgifter från alla värdar. Du kan publicera utan dem, men vi betalar ut först när de är ifyllda. Fyller du i dem före Stripe fyller vi i ditt namn och din adress där åt dig.",
      done: data.taxDone,
      actionLabel: "Lägg till skatteuppgifter",
      action: () => onGoToTab("payouts"),
    },
    {
      id: "payout",
      label: "Ställ in utbetalningar via Stripe",
      description: `Ett kostnadsfritt Stripe-konto betalar ut ditt pris till din bank ${HOST_PAYOUT_TIMING_SV}. Det tar ungefär fem minuter.`,
      done: payoutReady,
      actionLabel: "Ställ in utbetalningar",
      action: () => onGoToTab("payouts"),
    },
    {
      id: "publish",
      label: "Publicera din annons",
      description: "Ditt boende publiceras direkt och gäster kan boka det.",
      done: !!target?.active,
      actionLabel: publishing ? "Publicerar …" : "Publicera",
      action: target ? () => onPublish(target.id) : onCreateProperty,
      actionDisabled: !!target && publishing,
    },
  ];

  const completed = items.filter((i) => i.done).length;
  const total = items.length;
  const progress = (completed / total) * 100;

  // Auto-hide when fully complete
  if (completed === total) return null;

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">Kom igång som värd</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {completed} av {total} klara
              {target && !target.active ? ` för ”${target.title}”` : ""}.{" "}
              {/* A live listing takes bookings; what it still needs is the tax details, for payouts */}
              {target?.active && !data.taxDone
                ? "Lägg till dina skatteuppgifter, så att vi kan betala ut till dig."
                : "Gör klart resten så kan du börja ta emot bokningar."}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={dismiss} title="Dölj" aria-label="Dölj checklistan">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={progress} className="mt-3 h-2" />
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex flex-col gap-2 rounded-md px-3 py-2 sm:flex-row sm:items-center sm:gap-3 ${
              item.done ? "opacity-60" : "hover:bg-muted/50"
            }`}
          >
            <div className="flex flex-1 items-start gap-3 min-w-0">
              {item.done ? (
                <div className="mt-0.5 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-green-700" />
                </div>
              ) : (
                <Circle className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${item.done ? "line-through" : ""}`}>{item.label}</p>
                {!item.done && <p className="text-xs text-muted-foreground">{item.description}</p>}
                {!item.done && item.body && <div className="mt-2">{item.body}</div>}
              </div>
            </div>
            {!item.done && !item.body && (
              <div className="flex flex-wrap gap-1 pl-8 sm:pl-0 sm:justify-end">
                {item.secondaryLabel && (
                  <Button variant="ghost" size="sm" onClick={item.secondaryAction}>
                    {item.secondaryLabel}
                  </Button>
                )}
                {item.action && (
                  <Button variant="ghost" size="sm" onClick={item.action} disabled={item.actionDisabled}>
                    {item.actionLabel} <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default HostOnboardingChecklist;
