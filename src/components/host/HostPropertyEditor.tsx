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
import { HostBasicTab } from "./HostBasicTab";
import { HostAmenitiesTab } from "./HostAmenitiesTab";
import { HostGalleryTab } from "./HostGalleryTab";
import PropertyPricingRules from "@/components/PropertyPricingRules";
import PropertySpecialPricing from "@/components/admin/PropertySpecialPricing";
import CouponForm from "@/components/CouponForm";

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

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-1">
          <TabsTrigger value="basic" className="flex items-center gap-2 text-xs sm:text-sm">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Basic</span>
          </TabsTrigger>
          <TabsTrigger value="amenities" className="flex items-center gap-2 text-xs sm:text-sm">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Amenities</span>
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex items-center gap-2 text-xs sm:text-sm">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Gallery</span>
          </TabsTrigger>
          <TabsTrigger value="location" className="flex items-center gap-2 text-xs sm:text-sm">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Location</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2 text-xs sm:text-sm">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2 text-xs sm:text-sm">
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Pricing</span>
          </TabsTrigger>
          <TabsTrigger value="smartlock" className="flex items-center gap-2 text-xs sm:text-sm">
            <Lock className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Smart Lock</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-6">
          <HostBasicTab propertyId={propertyId} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="amenities" className="mt-6">
          <HostAmenitiesTab propertyId={propertyId} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="gallery" className="mt-6">
          <HostGalleryTab propertyId={propertyId} onUpdate={onUpdate} />
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

        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Availability Calendar</CardTitle>
              <CardDescription>Manage available dates and block preparation days</CardDescription>
            </CardHeader>
            <CardContent>
              <AvailabilityCalendar defaultPropertyId={propertyId} />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Preparation Days</CardTitle>
              <CardDescription>Set days needed between bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyPreparationDays 
                propertyId={propertyId} 
                currentPreparationDays={preparationDays}
                onUpdate={onUpdate}
              />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Check-in / Check-out Times</CardTitle>
              <CardDescription>Set your property's check-in and check-out times</CardDescription>
            </CardHeader>
            <CardContent>
              <CheckInOutTimes propertyId={propertyId} onUpdate={onUpdate} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Rules</CardTitle>
              <CardDescription>Add extra fees and services</CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyPricingRules propertyId={propertyId} />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Special Pricing</CardTitle>
              <CardDescription>Set special prices for specific dates</CardDescription>
            </CardHeader>
            <CardContent>
              <PropertySpecialPricing 
                propertyId={propertyId}
                basePrice={0}
                currency="SEK"
              />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Coupons</CardTitle>
              <CardDescription>Create discount coupons for your guests</CardDescription>
            </CardHeader>
            <CardContent>
              <CouponForm onSubmitted={onUpdate} propertyId={propertyId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="smartlock" className="mt-6">
          <SmartLockSetup propertyId={propertyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};