import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropertyPreparationDays } from "@/components/admin/PropertyPreparationDays";
import AvailabilityCalendar from "@/components/admin/AvailabilityCalendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Settings, DollarSign, Lock, Clock, MapPin } from "lucide-react";
import { SmartLockSetup } from "@/components/host/SmartLockSetup";
import { CheckInOutTimes } from "@/components/admin/CheckInOutTimes";
import { LocationEditor } from "@/components/LocationEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface HostPropertyEditorProps {
  propertyId: string;
  propertyTitle: string;
  preparationDays: number;
  onUpdate?: () => void;
}

export const HostPropertyEditor = ({ 
  propertyId, 
  propertyTitle, 
  preparationDays,
  onUpdate 
}: HostPropertyEditorProps) => {
  const [locationData, setLocationData] = useState({
    street: "",
    postal_code: "",
    city: "",
    country: "Sweden",
    latitude: null as number | null,
    longitude: null as number | null
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLocationData();
  }, [propertyId]);

  const loadLocationData = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('street, postal_code, city, country, latitude, longitude')
        .eq('id', propertyId)
        .single();

      if (error) throw error;

      if (data) {
        setLocationData({
          street: data.street || "",
          postal_code: data.postal_code || "",
          city: data.city || "",
          country: data.country || "Sweden",
          latitude: data.latitude || null,
          longitude: data.longitude || null
        });
      }
    } catch (error) {
      console.error('Error loading location data:', error);
    }
  };

  const handleSaveLocation = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          street: locationData.street,
          postal_code: locationData.postal_code,
          city: locationData.city ? locationData.city.toLowerCase() : null,
          country: locationData.country,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Location updated successfully'
      });
      onUpdate?.();
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: 'Error',
        description: 'Failed to save location',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{propertyTitle}</h2>
        <p className="text-muted-foreground">Manage your property settings, availability, and pricing</p>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location
          </TabsTrigger>
          <TabsTrigger value="times" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Check-in/out
          </TabsTrigger>
          <TabsTrigger value="preparation" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preparation
          </TabsTrigger>
          <TabsTrigger value="smartlock" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Smart Lock
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <AvailabilityCalendar defaultPropertyId={propertyId} />
        </TabsContent>

        <TabsContent value="location" className="mt-6 space-y-4">
          <LocationEditor
            value={locationData}
            onChange={(data) => setLocationData({
              street: data.street || "",
              postal_code: data.postal_code || "",
              city: data.city || "",
              country: data.country || "Sweden",
              latitude: data.latitude || null,
              longitude: data.longitude || null
            })}
          />
          <div className="flex justify-end">
            <Button onClick={handleSaveLocation} disabled={saving}>
              {saving ? 'Saving...' : 'Save Location'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="times" className="mt-6">
          <CheckInOutTimes propertyId={propertyId} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="preparation" className="mt-6">
          <PropertyPreparationDays 
            propertyId={propertyId} 
            currentPreparationDays={preparationDays}
            onUpdate={onUpdate}
          />
        </TabsContent>

        <TabsContent value="smartlock" className="mt-6">
          <SmartLockSetup propertyId={propertyId} />
        </TabsContent>

        <TabsContent value="pricing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Rules</CardTitle>
              <CardDescription>
                Additional pricing features coming soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You can currently set seasonal prices directly in the Calendar tab.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};