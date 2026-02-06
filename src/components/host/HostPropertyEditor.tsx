import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropertyPreparationDays } from "@/components/admin/PropertyPreparationDays";
import AvailabilityCalendar from "@/components/admin/AvailabilityCalendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Settings, DollarSign, Lock, Clock, MapPin, Image } from "lucide-react";
import { SmartLockSetup } from "@/components/host/SmartLockSetup";
import { CheckInOutTimes } from "@/components/admin/CheckInOutTimes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { HostBasicTab } from "./HostBasicTab";
import { HostAmenitiesTab } from "./HostAmenitiesTab";
import { HostGalleryTab } from "./HostGalleryTabEnhanced";
import { HostLocationTab } from "./HostLocationTab";
import { EmailTemplatesEditor } from "@/components/admin/EmailTemplatesEditor";
import { HostPricingCalculator } from "./HostPricingCalculator";
import { HostDiscountSettings } from "./HostDiscountSettings";
import PropertyPricingRules from "@/components/PropertyPricingRules";
import { PropertySpecialPricingEnhanced } from "@/components/admin/PropertySpecialPricingEnhanced";
import CouponForm from "@/components/CouponForm";
import { PropertyCouponsList } from "@/components/PropertyCouponsList";
import { GuidebookEditor } from "@/components/admin/GuidebookEditorEnhanced";
import { AirbnbSyncManager } from "@/components/admin/AirbnbSyncManager";

interface HostPropertyEditorProps {
  propertyId: string;
  propertyTitle: string;
  preparationDays: number;
  basePrice: number;
  currency: string;
  onUpdate?: () => void;
}

export const HostPropertyEditor = ({ 
  propertyId, 
  propertyTitle, 
  preparationDays,
  basePrice,
  currency,
  onUpdate 
}: HostPropertyEditorProps) => {
  const [guidebookSections, setGuidebookSections] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState({});
  const [saving, setSaving] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const [nightlyPrice, setNightlyPrice] = useState<number>(basePrice);

  useEffect(() => {
    loadPropertyData();
  }, [propertyId]);

  const loadPropertyData = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('guidebook_sections, email_templates')
        .eq('id', propertyId)
        .single();

      if (error) throw error;
      if (data?.guidebook_sections) {
        setGuidebookSections(Array.isArray(data.guidebook_sections) ? data.guidebook_sections : []);
      }
      if (data?.email_templates) {
        setEmailTemplates(data.email_templates);
      }
    } catch (error) {
      console.error('Error loading property data:', error);
    }
  };

   const handleSaveGuidebook = async () => {
     setSaving(true);
     try {
       const { error } = await supabase
         .from('properties')
         .update({
           guidebook_sections: guidebookSections,
           updated_at: new Date().toISOString()
         })
         .eq('id', propertyId);
 
       if (error) throw error;
 
       toast({
         title: 'Success',
         description: 'Guest guide updated successfully'
       });
        onUpdate?.();
      } catch (error) {
        console.error('Error saving guidebook:', error);
        toast({
          title: 'Error',
          description: 'Failed to save guest guide',
          variant: 'destructive'
        });
      } finally {
        setSaving(false);
      }
    };

   const handleSaveNightlyPrice = async () => {
     setSavingPrice(true);
     try {
       const { error } = await supabase
         .from('properties')
         .update({
           price_per_night: nightlyPrice,
           updated_at: new Date().toISOString()
         })
         .eq('id', propertyId);
       if (error) throw error;
       toast({ title: 'Success', description: 'Nightly price updated' });
       onUpdate?.();
     } catch (error) {
       console.error('Error updating nightly price:', error);
       toast({ title: 'Error', description: 'Failed to update nightly price', variant: 'destructive' });
     } finally {
       setSavingPrice(false);
     }
   };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-9 gap-1 mb-2">
          <TabsTrigger value="basic" className="flex items-center gap-2 text-xs sm:text-sm">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Basic</span>
          </TabsTrigger>
          <TabsTrigger value="amenities" className="flex items-center gap-2 text-xs sm:text-sm">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Amenities</span>
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex items-center gap-2 text-xs sm:text-sm">
            <Image className="h-3 w-3 sm:h-4 sm:w-4" />
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
          <TabsTrigger value="guide" className="flex items-center gap-2 text-xs sm:text-sm">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Guide</span>
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex items-center gap-2 text-xs sm:text-sm">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Emails</span>
          </TabsTrigger>
          <TabsTrigger value="smartlock" className="flex items-center gap-2 text-xs sm:text-sm">
            <Lock className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Smart Lock</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">{propertyTitle}</h2>
            <p className="text-muted-foreground">Basic property information and settings</p>
          </div>
          <HostBasicTab propertyId={propertyId} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="amenities" className="mt-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Amenities</h2>
            <p className="text-muted-foreground">Configure property features and highlights</p>
          </div>
          <HostAmenitiesTab propertyId={propertyId} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="gallery" className="mt-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Gallery</h2>
            <p className="text-muted-foreground">Manage property images and photos</p>
          </div>
          <HostGalleryTab propertyId={propertyId} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="location" className="mt-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Location</h2>
            <p className="text-muted-foreground">Set location and nearby points of interest</p>
          </div>
          <HostLocationTab propertyId={propertyId} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Calendar</h2>
            <p className="text-muted-foreground">Manage availability and booking dates</p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Availability Calendar</CardTitle>
              <CardDescription>Block dates or adjust availability (synced dates are read-only)</CardDescription>
            </CardHeader>
            <CardContent>
              <AvailabilityCalendar defaultPropertyId={propertyId} />
            </CardContent>
          </Card>

          <AirbnbSyncManager propertyId={propertyId} propertyTitle={propertyTitle} />

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

        <TabsContent value="pricing" className="mt-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">Pricing</h2>
            <p className="text-muted-foreground">Configure pricing rules and special rates</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Nightly Base Price</CardTitle>
              <CardDescription>Set your standard nightly rate</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nightly-price">Price per night</Label>
                <Input id="nightly-price" type="number" value={nightlyPrice}
                  onChange={(e) => setNightlyPrice(parseInt(e.target.value) || 0)} />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSaveNightlyPrice} disabled={savingPrice}>
                  {savingPrice ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <PropertyPricingRules propertyId={propertyId} />

          <PropertySpecialPricingEnhanced
            propertyId={propertyId}
            basePrice={basePrice}
            currency={currency}
          />

          <Card>
            <CardHeader>
              <CardTitle>Coupons</CardTitle>
              <CardDescription>Create discount coupons for your guests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display existing coupons */}
              <PropertyCouponsList propertyId={propertyId} onUpdate={onUpdate} />
              
              {/* Create new coupon */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Create New Coupon</h3>
                <CouponForm onSubmitted={onUpdate} propertyId={propertyId} />
              </div>
            </CardContent>
          </Card>

          <HostPricingCalculator 
            propertyId={propertyId}
            basePrice={basePrice}
            currency={currency}
          />
        </TabsContent>

        <TabsContent value="guide" className="mt-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Guest Guide</h2>
            <p className="text-muted-foreground">Create helpful information for your guests</p>
          </div>
          <GuidebookEditor
            sections={guidebookSections}
            onChange={setGuidebookSections}
            onSave={handleSaveGuidebook}
            saving={saving}
            propertyTitle={propertyTitle}
          />
        </TabsContent>

        <TabsContent value="emails" className="mt-6 space-y-4">
          <EmailTemplatesEditor 
            propertyId={propertyId} 
            templates={emailTemplates}
            onUpdate={() => {
              loadPropertyData();
              onUpdate?.();
            }}
          />
        </TabsContent>

        <TabsContent value="smartlock" className="mt-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Smart Lock</h2>
            <p className="text-muted-foreground">Connect Yale Doorman for automatic access codes</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Yale Doorman Lock Integration</CardTitle>
              <CardDescription>Automatic access code management for your guests</CardDescription>
            </CardHeader>
            <CardContent>
              <SmartLockSetup propertyId={propertyId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};