// @ts-nocheck
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

export default function PreArrivalSettings() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties-pre-arrival'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, check_in_instructions, parking_info, local_tips')
        .order('title');
      
      if (error) throw error;
      return data;
    },
  });

  const selectedProperty = properties?.find(p => p.id === selectedPropertyId);

  const updateMutation = useMutation({
    mutationFn: async (updates: { 
      check_in_instructions?: string; 
      parking_info?: string; 
      local_tips?: string;
    }) => {
      const { error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', selectedPropertyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties-pre-arrival'] });
      toast.success('Pre-arrival settings updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update settings: ' + error.message);
    },
  });

  const handleUpdate = (field: string, value: string) => {
    if (!selectedPropertyId) {
      toast.error('Please select a property first');
      return;
    }
    updateMutation.mutate({ [field]: value });
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
        <h2 className="text-2xl font-bold">Pre-Arrival Email Settings</h2>
        <p className="text-muted-foreground mt-1">
          Configure check-in instructions, parking info, and local tips sent 24-48 hours before guest arrival
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Property</CardTitle>
          <CardDescription>
            Choose which property to configure pre-arrival email content for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a property..." />
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

      {selectedProperty && (
        <Tabs defaultValue="instructions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="instructions">Check-In Instructions</TabsTrigger>
            <TabsTrigger value="parking">Parking Info</TabsTrigger>
            <TabsTrigger value="tips">Local Tips</TabsTrigger>
          </TabsList>

          <TabsContent value="instructions">
            <Card>
              <CardHeader>
                <CardTitle>Check-In Instructions</CardTitle>
                <CardDescription>
                  Detailed instructions for guests on how to access the property
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="E.g., The key lockbox is located on the right side of the front door. Your access code is sent separately. Please call us if you have any trouble accessing the property."
                  rows={8}
                  defaultValue={selectedProperty.check_in_instructions || ''}
                  onBlur={(e) => handleUpdate('check_in_instructions', e.target.value)}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  💡 Include details about key pickup, access codes, entry procedures, and who to contact for help
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parking">
            <Card>
              <CardHeader>
                <CardTitle>Parking Information</CardTitle>
                <CardDescription>
                  Where guests should park and any parking restrictions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="E.g., Free parking available in the driveway. Street parking is also available but requires a permit during weekdays. Parking permit can be obtained from the local municipality office."
                  rows={8}
                  defaultValue={selectedProperty.parking_info || ''}
                  onBlur={(e) => handleUpdate('parking_info', e.target.value)}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  🚗 Include parking locations, restrictions, permits, and any costs involved
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tips">
            <Card>
              <CardHeader>
                <CardTitle>Local Tips & Recommendations</CardTitle>
                <CardDescription>
                  Helpful local information to enhance the guest experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="E.g., The nearest grocery store (ICA) is 2 km away and open until 21:00. For authentic Swedish dining, try Restaurang Gamla Stan, just a 10-minute walk. The property is pet-friendly - there's a dog park 500m south."
                  rows={10}
                  defaultValue={selectedProperty.local_tips || ''}
                  onBlur={(e) => handleUpdate('local_tips', e.target.value)}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  💡 Include nearby shops, restaurants, attractions, and any special local insights
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!selectedProperty && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Select a property to configure pre-arrival email settings</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}