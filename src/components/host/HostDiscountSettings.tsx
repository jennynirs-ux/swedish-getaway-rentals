import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Percent, CalendarDays } from "lucide-react";

interface HostDiscountSettingsProps {
  propertyId: string;
  onUpdate?: () => void;
}

export const HostDiscountSettings = ({ propertyId, onUpdate }: HostDiscountSettingsProps) => {
  const [weeklyDiscount, setWeeklyDiscount] = useState<number>(0);
  const [monthlyDiscount, setMonthlyDiscount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDiscounts();
  }, [propertyId]);

  const loadDiscounts = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('weekly_discount_percentage, monthly_discount_percentage')
        .eq('id', propertyId)
        .single();

      if (error) throw error;
      
      setWeeklyDiscount(data?.weekly_discount_percentage || 0);
      setMonthlyDiscount(data?.monthly_discount_percentage || 0);
    } catch (error) {
      console.error('Error loading discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate percentages
    if (weeklyDiscount < 0 || weeklyDiscount > 100) {
      toast({
        title: 'Ogiltig rabatt',
        description: 'Veckorabatten måste vara mellan 0 och 100 %',
        variant: 'destructive'
      });
      return;
    }
    if (monthlyDiscount < 0 || monthlyDiscount > 100) {
      toast({
        title: 'Ogiltig rabatt',
        description: 'Månadsrabatten måste vara mellan 0 och 100 %',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          weekly_discount_percentage: weeklyDiscount,
          monthly_discount_percentage: monthlyDiscount,
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: 'Rabatterna är sparade',
        description: 'Vecko- och månadsrabatten är uppdaterade'
      });
      onUpdate?.();
    } catch (error) {
      console.error('Error saving discounts:', error);
      toast({
        title: 'Något gick fel',
        description: 'Det gick inte att spara rabatterna',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Rabatt för längre vistelser
        </CardTitle>
        <CardDescription>
          Ge rabatt på längre bokningar för att locka fler gäster
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weekly Discount */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="weekly-discount" className="font-medium">
                Veckorabatt (7 nätter eller fler)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="weekly-discount"
                type="number"
                min="0"
                max="100"
                value={weeklyDiscount}
                onChange={(e) => setWeeklyDiscount(parseFloat(e.target.value) || 0)}
                className="max-w-[120px]"
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Dras av automatiskt för vistelser på 7 nätter eller fler
            </p>
          </div>

          {/* Monthly Discount */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="monthly-discount" className="font-medium">
                Månadsrabatt (28 nätter eller fler)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="monthly-discount"
                type="number"
                min="0"
                max="100"
                value={monthlyDiscount}
                onChange={(e) => setMonthlyDiscount(parseFloat(e.target.value) || 0)}
                className="max-w-[120px]"
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Dras av automatiskt för vistelser på 28 nätter eller fler
            </p>
          </div>
        </div>

        {/* Preview */}
        {(weeklyDiscount > 0 || monthlyDiscount > 0) && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Så blir rabatten</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {weeklyDiscount > 0 && (
                <li>• Gäster som bokar 7 nätter eller fler sparar {weeklyDiscount} %</li>
              )}
              {monthlyDiscount > 0 && (
                <li>• Gäster som bokar 28 nätter eller fler sparar {monthlyDiscount} %</li>
              )}
            </ul>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Sparar…' : 'Spara rabatter'}
        </Button>
      </CardContent>
    </Card>
  );
};
