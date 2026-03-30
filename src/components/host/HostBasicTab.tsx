// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BankAccountSetup } from "@/components/admin/BankAccountSetup";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface HostBasicTabProps {
  propertyId: string;
  onUpdate?: () => void;
}

export const HostBasicTab = ({ propertyId, onUpdate }: HostBasicTabProps) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    tagline_line1: "",
    introduction_text: "",
    contact_email: "",
    contact_phone: "",
    registration_number: "",
    requires_host_approval: false,
    active: false,
    bedrooms: 1,
    bathrooms: 1,
    max_guests: 2,
    property_type: "Property",
    description: "",
  });

  useEffect(() => {
    loadPropertyData();
  }, [propertyId]);

  const loadPropertyData = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('title, tagline_line1, introduction_text, get_in_touch_info, registration_number, requires_host_approval, active, bedrooms, bathrooms, max_guests, property_type, description')
        .eq('id', propertyId)
        .single();

      if (error) throw error;

      if (data) {
        const getInTouchInfo = data.get_in_touch_info as any;
        setFormData({
          title: data.title || "",
          tagline_line1: data.tagline_line1 || "",
          introduction_text: data.introduction_text || "",
          contact_email: getInTouchInfo?.contact_email || "",
          contact_phone: getInTouchInfo?.contact_phone || "",
          registration_number: data.registration_number || "",
          requires_host_approval: data.requires_host_approval ?? false,
          active: data.active ?? false,
          bedrooms: data.bedrooms || 1,
          bathrooms: data.bathrooms || 1,
          max_guests: data.max_guests || 2,
          property_type: data.property_type || "Property",
          description: data.description || "",
        });
      }
    } catch (error) {
      console.error('Error loading property:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          title: formData.title,
          tagline_line1: formData.tagline_line1,
          introduction_text: formData.introduction_text,
          get_in_touch_info: {
            type: 'custom',
            contact_email: formData.contact_email,
            contact_phone: formData.contact_phone
          },
          registration_number: formData.registration_number || null,
          requires_host_approval: formData.requires_host_approval,
          active: formData.active,
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          max_guests: formData.max_guests,
          property_type: formData.property_type,
          description: formData.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Property information updated successfully'
      });
      onUpdate?.();
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Listing Status */}
      <Card className={formData.active ? "border-green-200 bg-green-50/50" : "border-orange-200 bg-orange-50/50"}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{formData.active ? "✅ Published" : "⏸ Unpublished"}</p>
              <p className="text-sm text-muted-foreground">
                {formData.active ? "This listing is visible to guests" : "This listing is hidden from guests"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="active-toggle">Active</Label>
              <Switch
                id="active-toggle"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Manage your property's core details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Property title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={formData.tagline_line1}
              onChange={(e) => setFormData(prev => ({ ...prev, tagline_line1: e.target.value }))}
              placeholder="A catchy tagline for your property"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="introduction">Introduction Text</Label>
            <Textarea
              id="introduction"
              value={formData.introduction_text}
              onChange={(e) => setFormData(prev => ({ ...prev, introduction_text: e.target.value }))}
              placeholder="Describe what makes your property special..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (shown on listing cards)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of your property for search results..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Property Type</Label>
              <Select value={formData.property_type} onValueChange={(v) => setFormData(prev => ({ ...prev, property_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Property">Property</SelectItem>
                  <SelectItem value="Villa">Villa</SelectItem>
                  <SelectItem value="Cabin">Cabin</SelectItem>
                  <SelectItem value="Lakehouse">Lakehouse</SelectItem>
                  <SelectItem value="Apartment">Apartment</SelectItem>
                  <SelectItem value="Cottage">Cottage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bedrooms</Label>
              <Input type="number" min="1" max="20" value={formData.bedrooms} onChange={(e) => setFormData(prev => ({ ...prev, bedrooms: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="space-y-2">
              <Label>Bathrooms</Label>
              <Input type="number" min="1" max="10" value={formData.bathrooms} onChange={(e) => setFormData(prev => ({ ...prev, bathrooms: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="space-y-2">
              <Label>Max Guests</Label>
              <Input type="number" min="1" max="30" value={formData.max_guests} onChange={(e) => setFormData(prev => ({ ...prev, max_guests: parseInt(e.target.value) || 2 }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                placeholder="contact@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                placeholder="+46 70 123 4567"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* EU Registration Number */}
      <Card>
        <CardHeader>
          <CardTitle>EU Rental Registration</CardTitle>
          <CardDescription>Required since July 1, 2025 per EU Short-Term Rental Regulation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              All short-term rental properties in the EU must display a valid registration number.
              Contact your municipality (kommun) to obtain yours.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="registration_number">Registration Number</Label>
            <Input
              id="registration_number"
              value={formData.registration_number}
              onChange={(e) => setFormData(prev => ({ ...prev, registration_number: e.target.value }))}
              placeholder="e.g., STR-2026-12345"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Registration'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Booking Approval Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Settings</CardTitle>
          <CardDescription>Control how bookings are handled for this property</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Manual Approval</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, bookings require your approval before being confirmed.
                When disabled, bookings are confirmed instantly after payment (recommended).
              </p>
            </div>
            <Switch
              checked={formData.requires_host_approval}
              onCheckedChange={(checked) =>
                setFormData(prev => ({ ...prev, requires_host_approval: checked }))
              }
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <BankAccountSetup />
    </div>
  );
};
