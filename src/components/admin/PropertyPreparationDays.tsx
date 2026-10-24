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
        title: "Klart",
        description: `Förberedelsedagar ändrade till ${preparationDays} ${preparationDays !== 1 ? 'dagar' : 'dag'}`,
      });

      onUpdate?.();
    } catch (error: any) {
      console.error('Error updating preparation days:', error);
      toast({
        title: "Något gick fel",
        description: error.message || "Det gick inte att spara förberedelsedagarna",
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
          <CardTitle>Förberedelsedagar</CardTitle>
        </div>
        <CardDescription>
          Ange hur många dagar du behöver mellan bokningar för städning och förberedelser.
          De dagarna blockeras automatiskt i kalendern.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prep-days">Antal förberedelsedagar</Label>
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
              ? "Inga dagar mellan bokningar"
              : `${preparationDays} ${preparationDays !== 1 ? 'dagar' : 'dag'} blockeras före och efter varje bokning`}
          </p>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Sparar...' : 'Spara förberedelsedagar'}
        </Button>
      </CardContent>
    </Card>
  );
};