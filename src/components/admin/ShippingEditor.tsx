import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2 } from "lucide-react";

interface ShippingRate {
  region: string;
  rate: number;
  currency: string;
}

interface ShippingSettings {
  use_printful: boolean;
  fallback_rates: ShippingRate[];
  free_shipping_threshold?: number;
}

export const ShippingEditor = () => {
  const [settings, setSettings] = useState<ShippingSettings>({
    use_printful: true,
    fallback_rates: [
      { region: "Sweden", rate: 4900, currency: "SEK" },
      { region: "Europe", rate: 9900, currency: "SEK" },
      { region: "World", rate: 19900, currency: "SEK" }
    ],
    free_shipping_threshold: 50000
  });

  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'shipping_settings')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.setting_value) {
        setSettings(data.setting_value as unknown as ShippingSettings);
      }
    } catch (error) {
      console.error('Error fetching shipping settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert(
          {
            setting_key: 'shipping_settings',
            setting_value: settings as any
          },
          { onConflict: 'setting_key' }
        );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Shipping settings saved successfully"
      });
    } catch (error) {
      console.error('Error saving shipping settings:', error);
      toast({
        title: "Error",
        description: "Failed to save shipping settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addRate = () => {
    setSettings(prev => ({
      ...prev,
      fallback_rates: [...prev.fallback_rates, { region: "", rate: 0, currency: "SEK" }]
    }));
  };

  const updateRate = (index: number, field: keyof ShippingRate, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      fallback_rates: prev.fallback_rates.map((rate, i) => 
        i === index ? { ...rate, [field]: value } : rate
      )
    }));
  };

  const removeRate = (index: number) => {
    setSettings(prev => ({
      ...prev,
      fallback_rates: prev.fallback_rates.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Shipping Settings</h2>
        <p className="text-muted-foreground">Configure shipping rates and Printful integration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Printful Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="use-printful"
              checked={settings.use_printful}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, use_printful: checked }))}
            />
            <Label htmlFor="use-printful">Use Printful for shipping rates</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            When enabled, shipping rates will be fetched dynamically from Printful. 
            Fallback rates below will be used if Printful is unavailable.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fallback Shipping Rates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.fallback_rates.map((rate, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
              <div>
                <Label htmlFor={`region-${index}`}>Region</Label>
                <Input
                  id={`region-${index}`}
                  value={rate.region}
                  onChange={(e) => updateRate(index, 'region', e.target.value)}
                  placeholder="Sweden, Europe, etc."
                />
              </div>
              <div>
                <Label htmlFor={`rate-${index}`}>Rate (in öre/cents)</Label>
                <Input
                  id={`rate-${index}`}
                  type="number"
                  value={rate.rate}
                  onChange={(e) => updateRate(index, 'rate', parseInt(e.target.value) || 0)}
                  placeholder="4900"
                />
              </div>
              <div>
                <Label htmlFor={`currency-${index}`}>Currency</Label>
                <Input
                  id={`currency-${index}`}
                  value={rate.currency}
                  onChange={(e) => updateRate(index, 'currency', e.target.value)}
                  placeholder="SEK"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeRate(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          <Button type="button" variant="outline" onClick={addRate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Shipping Rate
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Free Shipping</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="free-threshold">Free shipping threshold (in öre/cents)</Label>
            <Input
              id="free-threshold"
              type="number"
              value={settings.free_shipping_threshold || 0}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                free_shipping_threshold: parseInt(e.target.value) || undefined 
              }))}
              placeholder="50000 (500 SEK)"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Orders above this amount qualify for free shipping. Leave empty to disable.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving}>
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Save Shipping Settings'}
      </Button>
    </div>
  );
};