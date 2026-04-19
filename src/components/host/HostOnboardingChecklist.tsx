// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, Circle, X, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  done: boolean;
  actionLabel: string;
  action: () => void;
}

interface Props {
  onGoToTab: (tab: string) => void;
  onCreateProperty: () => void;
}

/**
 * Onboarding checklist shown to new hosts.
 *
 * Items auto-check as the host completes them. Dismissible once all items
 * are done (or manually, preference stored in localStorage).
 */
const HostOnboardingChecklist = ({ onGoToTab, onCreateProperty }: Props) => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("hostOnboardingDismissed") === "1",
  );

  useEffect(() => {
    if (dismissed) {
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissed]);

  const load = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, stripe_connect_account_id")
        .eq("user_id", userData.user.id)
        .single();
      if (!profile) return;

      // Properties owned by this host
      const { data: properties } = await supabase
        .from("properties")
        .select("id, active, hero_image_url, description, price_per_night")
        .eq("host_id", profile.id);

      const hasProperty = (properties?.length ?? 0) > 0;
      const hasPublished = (properties || []).some((p) => p.active);
      const hasHero = (properties || []).some((p) => p.hero_image_url);
      const hasDescription = (properties || []).some((p) => p.description && p.description.length > 30);
      const hasPricing = (properties || []).some((p) => p.price_per_night && p.price_per_night > 0);
      const hasStripe = !!profile.stripe_connect_account_id;

      setItems([
        {
          id: "create",
          label: "Create your first property",
          description: "Add a cabin, cottage, or apartment to start hosting.",
          done: hasProperty,
          actionLabel: "Create property",
          action: onCreateProperty,
        },
        {
          id: "photo",
          label: "Add a hero photo",
          description: "Properties with photos get 10x more bookings.",
          done: hasHero,
          actionLabel: "Add photos",
          action: () => onGoToTab("properties"),
        },
        {
          id: "description",
          label: "Write a description",
          description: "Tell guests what makes your place special.",
          done: hasDescription,
          actionLabel: "Edit description",
          action: () => onGoToTab("properties"),
        },
        {
          id: "pricing",
          label: "Set your nightly rate",
          description: "Base price that shows in search results.",
          done: hasPricing,
          actionLabel: "Set pricing",
          action: () => onGoToTab("properties"),
        },
        {
          id: "payout",
          label: "Connect your bank account",
          description: "Required to receive payouts from bookings.",
          done: hasStripe,
          actionLabel: "Connect bank",
          action: () => onGoToTab("payouts"),
        },
        {
          id: "publish",
          label: "Publish your property",
          description: "Make it visible to guests and start taking bookings.",
          done: hasPublished,
          actionLabel: "Publish",
          action: () => onGoToTab("properties"),
        },
      ]);
    } catch {
      // Leave items empty on error
    } finally {
      setLoading(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem("hostOnboardingDismissed", "1");
    setDismissed(true);
  };

  if (dismissed || loading) return null;

  const completed = items.filter((i) => i.done).length;
  const total = items.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const allDone = completed === total && total > 0;

  // Auto-hide when fully complete
  if (allDone) return null;

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Getting started as a host</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {completed}/{total} complete. Finish setup to start receiving bookings.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={dismiss} title="Dismiss">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={progress} className="mt-3 h-2" />
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 rounded-md px-3 py-2 ${
              item.done ? "opacity-60" : "hover:bg-muted/50"
            }`}
          >
            {item.done ? (
              <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-green-700" />
              </div>
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${item.done ? "line-through" : ""}`}>
                {item.label}
              </p>
              {!item.done && (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              )}
            </div>
            {!item.done && (
              <Button variant="ghost" size="sm" onClick={item.action}>
                {item.actionLabel} <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default HostOnboardingChecklist;
