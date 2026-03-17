import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  });

  useEffect(() => {
    loadPropertyData();
  }, [propertyId]);

  const loadPropertyData = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('title, tagline_line1, introduction_text, get_in_touch_info, registration_number, requires_host_approval')
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
