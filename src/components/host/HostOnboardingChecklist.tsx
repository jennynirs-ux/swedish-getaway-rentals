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
import { HOST_PAYOUT_TIMING_TEXT } from "@/lib/constants";
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
      toast.error(`Could not save your acceptance: ${error.message}`);
      return;
    }
    toast.success("Thank you, the host terms are accepted.");
    onAccepted();
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <Checkbox id={id} checked={checked} onCheckedChange={(v) => setChecked(v === true)} className="mt-0.5" />
        <label htmlFor={id} className="text-sm leading-snug">
          I have read and accept the{" "}
          <a
            href={HOST_TERMS_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            host terms
          </a>
        </label>
      </div>
      <Button size="sm" onClick={accept} disabled={!checked || saving} className="shrink-0">
        {saving ? "Saving..." : "Accept"}
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
  /** DAC7 tax details saved and complete (publishing needs them) */
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
      label: "Create your first property",
      description: "Add a cabin, cottage, or apartment to start hosting.",
      done: !!target,
      actionLabel: "Create property",
      action: onCreateProperty,
    },
    {
      id: "photo",
      label: "Add photos",
      description: "Pick a main photo and a few more: listings with photos get far more bookings.",
      done: !!target?.hero_image_url,
      actionLabel: "Add photos",
      action: edit("gallery"),
    },
    {
      id: "description",
      label: "Write a description",
      description: "Tell guests what makes your place special.",
      done: (target?.description?.trim().length ?? 0) > 30,
      actionLabel: "Edit description",
      action: edit("basic"),
    },
    {
      id: "pricing",
      label: "Set your nightly rate",
      description: "Base price that shows in search results.",
      done: (target?.price_per_night ?? 0) > 0,
      actionLabel: "Set pricing",
      action: edit("pricing"),
    },
    {
      id: "location",
      label: "Pin your location",
      description: "Put the pin on the map and choose the county, so your place appears in the right region.",
      done: hasLocation,
      actionLabel: "Set location",
      action: edit("location"),
    },
    {
      id: "calendar",
      label: "Sync your other calendars",
      description:
        "Also on Airbnb, Booking.com or elsewhere? Link the calendars both ways so nobody can book the same night twice.",
      done: !!target && (data.targetHasCalendarFeed || isOnlyRentedHere(target.id)),
      actionLabel: "Add calendar links",
      action: edit("calendar"),
      secondaryLabel: target ? "I only rent here" : undefined,
      secondaryAction: target
        ? () => {
            markOnlyRentedHere(target.id);
            refresh();
          }
        : undefined,
    },
    {
      id: "terms",
      label: "Accept the host terms",
      description: "How fees, payouts, cancellations and refunds work.",
      done: data.termsAccepted,
      body: <HostTermsAcceptance onAccepted={refresh} />,
    },
    {
      id: "payout",
      label: "Connect your bank account",
      description: `Your price is paid out to your bank ${HOST_PAYOUT_TIMING_TEXT}.`,
      done: payoutReady,
      actionLabel: "Connect bank",
      action: () => onGoToTab("payouts"),
    },
    {
      id: "tax",
      label: "Add your tax details",
      description: "Swedish law (DAC7) requires a few details from every host before a listing goes live.",
      done: data.taxDone,
      actionLabel: "Add tax details",
      action: () => onGoToTab("payouts"),
    },
    {
      id: "publish",
      label: "Publish your listing",
      description: "Your place goes live straight away and guests can book it.",
      done: !!target?.active,
      actionLabel: publishing ? "Publishing..." : "Publish",
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
            <CardTitle className="text-base">Getting started as a host</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {completed}/{total} complete
              {target && !target.active ? ` for "${target.title}"` : ""}. Finish setup to start receiving bookings.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={dismiss} title="Dismiss" aria-label="Hide the checklist">
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
