import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";

interface PricingRule {
  id: string;
  name: string;
  rule_type: string;
  price: number;
  is_per_night: boolean;
  is_active: boolean;
  currency: string;
}

interface PropertyPricingRulesEnhancedProps {
  propertyId: string;
  currency?: string;
}

const RULE_TEMPLATES = [
  { type: "cleaning_fee", label: "Cleaning Fee", isPerNight: false },
  { type: "extra_guest", label: "Extra Guest Fee (per night)", isPerNight: true },
  { type: "pet_fee", label: "Pet Fee", isPerNight: false },
  { type: "late_checkout", label: "Late Checkout Fee", isPerNight: false },
  { type: "early_checkin", label: "Early Check-in Fee", isPerNight: false },
];

export const PropertyPricingRulesEnhanced = ({ 
  propertyId, 
  currency = "SEK" 
}: PropertyPricingRulesEnhancedProps) => {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRules();
  }, [propertyId]);

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from("properties_pricing_rules")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at");

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error("Error loading pricing rules:", error);
      toast({
        title: "Error",
        description: "Failed to load pricing rules",
        variant: "destructive",
      });
    }
  };

  const addRule = async (template: typeof RULE_TEMPLATES[0]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("properties_pricing_rules")
        .insert({
          property_id: propertyId,
          name: template.label,
          rule_type: template.type,
          price: 0,
          is_per_night: template.isPerNight,
          is_active: false,
          currency: currency,
        })
        .select()
        .single();

      if (error) throw error;

      setRules([...rules, data]);
      toast({
        title: "Success",
        description: "Pricing rule added",
      });
    } catch (error) {
      console.error("Error adding rule:", error);
      toast({
        title: "Error",
        description: "Failed to add pricing rule",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRule = async (id: string, updates: Partial<PricingRule>) => {
    try {
      const { error } = await supabase
        .from("properties_pricing_rules")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
    } catch (error) {
      console.error("Error updating rule:", error);
      toast({
        title: "Error",
        description: "Failed to update pricing rule",
        variant: "destructive",
      });
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from("properties_pricing_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setRules(rules.filter(r => r.id !== id));
      toast({
        title: "Success",
        description: "Pricing rule deleted",
      });
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast({
        title: "Error",
        description: "Failed to delete pricing rule",
        variant: "destructive",
      });
    }
  };

  const availableTemplates = RULE_TEMPLATES.filter(
    template => !rules.some(rule => rule.rule_type === template.type)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing Rules</CardTitle>
        <CardDescription>
          Activate and configure additional fees for your property
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.length > 0 && (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <Switch
                  checked={rule.is_active}
                  onCheckedChange={(checked) =>
                    updateRule(rule.id, { is_active: checked })
                  }
                />
                <div className="flex-1">
                  <Label className="text-sm font-medium">{rule.name}</Label>
                  <p className="text-xs text-muted-foreground">
                    {rule.is_per_night ? "Per night" : "One-time fee"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={rule.price}
                    onChange={(e) =>
                      updateRule(rule.id, { price: parseInt(e.target.value) || 0 })
                    }
                    className="w-24"
                    disabled={!rule.is_active}
                  />
                  <span className="text-sm text-muted-foreground">{currency}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteRule(rule.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {availableTemplates.length > 0 && (
          <div className="border-t pt-4">
            <Label className="text-sm mb-2 block">Add New Rule</Label>
            <div className="flex flex-wrap gap-2">
              {availableTemplates.map((template) => (
                <Button
                  key={template.type}
                  variant="outline"
                  size="sm"
                  onClick={() => addRule(template)}
                  disabled={loading}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {template.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
