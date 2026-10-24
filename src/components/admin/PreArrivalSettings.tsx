import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchPropertyPrivateDetails, savePropertyPrivateDetails } from "@/lib/propertyPrivateDetails";

type PrivateField = 'check_in_instructions' | 'parking_info';
type Field = PrivateField | 'local_tips';

/** Admin: pick any property. Host editor: pass propertyId for that one only. */
export default function PreArrivalSettings({ propertyId }: { propertyId?: string } = {}) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(propertyId ?? "");
  const queryClient = useQueryClient();

  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties-pre-arrival', propertyId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('properties')
        .select('id, title, local_tips')
        .order('title');
      if (propertyId) query = query.eq('id', propertyId);
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  // Check-in instructions and parking info are guest-only (host/admin readable),
  // stored in property_private_details rather than the public properties row.
  const { data: privateDetails, isLoading: privateDetailsLoading } = useQuery({
    queryKey: ['property-private-details', selectedPropertyId],
    queryFn: () => fetchPropertyPrivateDetails(selectedPropertyId),
    enabled: !!selectedPropertyId,
  });

  const selectedProperty = properties?.find(p => p.id === selectedPropertyId);

  const updateMutation = useMutation({
    mutationFn: async ({ field, value }: { field: Field; value: string }) => {
      if (field === 'local_tips') {
        const { error } = await supabase
          .from('properties')
          .update({ local_tips: value })
          .eq('id', selectedPropertyId);

        if (error) throw error;
        return;
      }

      await savePropertyPrivateDetails(selectedPropertyId, { [field]: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties-pre-arrival'] });
      queryClient.invalidateQueries({ queryKey: ['property-private-details', selectedPropertyId] });
      toast.success('Ändringen är sparad');
    },
    onError: (error) => {
      toast.error('Det gick inte att spara: ' + error.message);
    },
  });

  const handleUpdate = (field: Field, value: string) => {
    if (!selectedPropertyId) {
      toast.error('Välj ett boende först');
      return;
    }
    updateMutation.mutate({ field, value });
  };

  if (propertiesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mejl före ankomst</h2>
        <p className="text-muted-foreground mt-1">
          Ange ankomstinformation, parkering och lokala tips som mejlas till gästerna 24–48 timmar före ankomst
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Bara gäster med bokning ser det här. Lägg portkoder och wifi-lösenord här, aldrig i gästguiden: den är
          öppen för alla.
        </p>
      </div>

      {!propertyId && (
      <Card>
        <CardHeader>
          <CardTitle>Välj boende</CardTitle>
          <CardDescription>
            Välj vilket boende du vill ställa in mejlet före ankomst för
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger>
              <SelectValue placeholder="Välj ett boende..." />
            </SelectTrigger>
            <SelectContent>
              {properties?.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      )}

      {selectedProperty && privateDetailsLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {selectedProperty && !privateDetailsLoading && (
        <Tabs key={selectedProperty.id} defaultValue="instructions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="instructions">Incheckning</TabsTrigger>
            <TabsTrigger value="parking">Parkering</TabsTrigger>
            <TabsTrigger value="tips">Lokala tips</TabsTrigger>
          </TabsList>

          <TabsContent value="instructions">
            <Card>
              <CardHeader>
                <CardTitle>Instruktioner för incheckning</CardTitle>
                <CardDescription>
                  Beskriv noga hur gästerna tar sig in i boendet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="T.ex. Nyckelboxen sitter till höger om ytterdörren. Koden skickas separat. Ring oss om du inte kommer in."
                  rows={8}
                  defaultValue={privateDetails?.check_in_instructions || ''}
                  onBlur={(e) => handleUpdate('check_in_instructions', e.target.value)}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  💡 Skriv hur gästerna får nyckeln, vilka koder som gäller, hur de kommer in och vem de kan ringa om något strular
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parking">
            <Card>
              <CardHeader>
                <CardTitle>Parkering</CardTitle>
                <CardDescription>
                  Var gästerna ska parkera och vilka regler som gäller
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="T.ex. Gratis parkering på uppfarten. Det går också att parkera på gatan, men då krävs tillstånd på vardagar. Tillstånd får du från kommunen."
                  rows={8}
                  defaultValue={privateDetails?.parking_info || ''}
                  onBlur={(e) => handleUpdate('parking_info', e.target.value)}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  🚗 Skriv var man kan parkera, vilka regler och tillstånd som gäller och vad det kostar
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tips">
            <Card>
              <CardHeader>
                <CardTitle>Lokala tips</CardTitle>
                <CardDescription>
                  Bra att veta om området, så att gästerna trivs ännu bättre
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="T.ex. Närmaste matbutik (ICA) ligger 2 km bort och har öppet till 21:00. Vill du äta svensk husmanskost, testa Restaurang Gamla Stan, tio minuter bort till fots. Husdjur är välkomna – det finns en hundrastgård 500 m söderut."
                  rows={10}
                  defaultValue={selectedProperty.local_tips || ''}
                  onBlur={(e) => handleUpdate('local_tips', e.target.value)}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  💡 Skriv om affärer, restauranger, sevärdheter och annat som är bra att veta i närheten
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!selectedProperty && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Välj ett boende för att ställa in mejlet före ankomst</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}