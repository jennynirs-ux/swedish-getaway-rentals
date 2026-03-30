// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PolicyTier {
  min_days: number;
  max_days?: number;
  refund_percentage: number;
  label: string;
}

interface CancellationPolicyData {
  tiers: PolicyTier[];
  footer_note: string;
}

export const CancellationPolicySettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<CancellationPolicyData>({
    tiers: [],
    footer_note: "",
  });

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "cancellation_policy")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data?.setting_value) {
        setPolicy(data.setting_value as unknown as CancellationPolicyData);
      }
    } catch (error) {
      console.error("Error loading cancellation policy:", error);
      toast({
        title: "Error",
        description: "Failed to load cancellation policy",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // First check if setting exists
      const { data: existing } = await supabase
        .from("platform_settings")
        .select("id")
        .eq("setting_key", "cancellation_policy")
        .single();

      // Cast policy to Json type
      const policyJson = JSON.parse(JSON.stringify(policy));

      let error;
      if (existing) {
        // Update existing
        const result = await supabase
          .from("platform_settings")
          .update({
            setting_value: policyJson,
            updated_at: new Date().toISOString(),
          })
          .eq("setting_key", "cancellation_policy");
        error = result.error;
      } else {
        // Insert new
        const result = await supabase
          .from("platform_settings")
          .insert([{
            setting_key: "cancellation_policy",
            setting_value: policyJson,
          }]);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Cancellation policy updated successfully",
      });
    } catch (error) {
      console.error("Error saving cancellation policy:", error);
      toast({
        title: "Error",
        description: "Failed to save cancellation policy",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateTier = (index: number, field: keyof PolicyTier, value: string | number) => {
    setPolicy((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier, i) =>
        i === index ? { ...tier, [field]: value } : tier
      ),
    }));
  };

  const addTier = () => {
    setPolicy((prev) => ({
      ...prev,
      tiers: [
        ...prev.tiers,
        { min_days: 0, max_days: undefined, refund_percentage: 0, label: "New tier" },
      ],
    }));
  };

  const removeTier = (index: number) => {
    setPolicy((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Cancellation Policy Settings
        </CardTitle>
        <CardDescription>
          Configure the cancellation policy tiers and refund percentages shown to guests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Changes here will affect how the cancellation policy is displayed on all property booking pages.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Policy Tiers</Label>
            <Button type="button" variant="outline" size="sm" onClick={addTier}>
              <Plus className="w-4 h-4 mr-2" />
              Add Tier
            </Button>
          </div>

          {policy.tiers.map((tier, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg bg-muted/30"
            >
              <div className="space-y-2">
                <Label htmlFor={`min-days-${index}`}>Min Days</Label>
                <Input
                  id={`min-days-${index}`}
                  type="number"
                  min={0}
                  value={tier.min_days}
                  onChange={(e) => updateTier(index, "min_days", parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`max-days-${index}`}>Max Days (optional)</Label>
                <Input
                  id={`max-days-${index}`}
                  type="number"
                  min={0}
                  value={tier.max_days ?? ""}
                  placeholder="No limit"
                  onChange={(e) =>
                    updateTier(index, "max_days", e.target.value ? parseInt(e.target.value) : undefined as any)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`refund-${index}`}>Refund %</Label>
                <Input
                  id={`refund-${index}`}
                  type="number"
                  min={0}
                  max={100}
                  value={tier.refund_percentage}
                  onChange={(e) =>
                    updateTier(index, "refund_percentage", parseInt(e.target.value) || 0)
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-1">
                <Label htmlFor={`label-${index}`}>Display Label</Label>
                <Input
                  id={`label-${index}`}
                  value={tier.label}
                  onChange={(e) => updateTier(index, "label", e.target.value)}
                  placeholder="e.g. More than 21 days before arrival"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeTier(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {policy.tiers.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No policy tiers configured. Add a tier to get started.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="footer-note">Footer Note</Label>
          <Textarea
            id="footer-note"
            value={policy.footer_note}
            onChange={(e) => setPolicy((prev) => ({ ...prev, footer_note: e.target.value }))}
            placeholder="Additional information shown below the policy tiers..."
            rows={3}
          />
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Preview</Label>
          <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
            <div className="font-semibold">Cancellation Policy – Nordic Getaway</div>
            {policy.tiers.map((tier, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{tier.label}:</span>
                <span
                  className={`font-medium ${
                    tier.refund_percentage > 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {tier.refund_percentage > 0 ? `${tier.refund_percentage}% refund` : "No refund"}
                </span>
              </div>
            ))}
            {policy.footer_note && (
              <p className="text-xs text-muted-foreground pt-2 border-t">
                {policy.footer_note}
              </p>
            )}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Cancellation Policy"}
        </Button>
      </CardContent>
    </Card>
  );
};
