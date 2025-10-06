import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock, Save } from "lucide-react";

interface PropertyPreparationDaysProps {
  propertyId: string;
  currentPreparationDays: number;
  onUpdate?: () => void;
}

export const PropertyPreparationDays = ({ 
  propertyId, 
  currentPreparationDays, 
  onUpdate 
}: PropertyPreparationDaysProps) => {
  const [preparationDays, setPreparationDays] = useState(currentPreparationDays || 0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({ preparation_days: preparationDays })
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Preparation days updated to ${preparationDays} day${preparationDays !== 1 ? 's' : ''}`,
      });

      onUpdate?.();
    } catch (error: any) {
      console.error('Error updating preparation days:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update preparation days",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle>Preparation Days</CardTitle>
        </div>
        <CardDescription>
          Set how many days are needed between bookings for cleaning and preparation. 
          These days will be automatically blocked in the calendar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prep-days">Number of Preparation Days</Label>
          <Input
            id="prep-days"
            type="number"
            min="0"
            max="7"
            value={preparationDays}
            onChange={(e) => setPreparationDays(Math.max(0, Math.min(7, parseInt(e.target.value) || 0)))}
          />
          <p className="text-sm text-muted-foreground">
            {preparationDays === 0 
              ? "No buffer days between bookings" 
              : `${preparationDays} day${preparationDays !== 1 ? 's' : ''} will be blocked before and after each booking`}
          </p>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Preparation Days'}
        </Button>
      </CardContent>
    </Card>
  );
};