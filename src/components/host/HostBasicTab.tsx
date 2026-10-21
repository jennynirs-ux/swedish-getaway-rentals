import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BankAccountSetup } from "@/components/admin/BankAccountSetup";

interface HostBasicTabProps {
  propertyId: string;
  onUpdate?: () => void;
}

const toCount = (value: string) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export const HostBasicTab = ({ propertyId, onUpdate }: HostBasicTabProps) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    tagline_line1: "",
    description: "",
    introduction_text: "",
    max_guests: "",
    bedrooms: "",
    bathrooms: "",
    contact_email: "",
    contact_phone: "",
  });

  useEffect(() => {
    loadPropertyData();
  }, [propertyId]);

  const loadPropertyData = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('title, tagline_line1, description, introduction_text, max_guests, bedrooms, bathrooms, get_in_touch_info')
        .eq('id', propertyId)
        .single();

      if (error) throw error;

      if (data) {
        const getInTouchInfo = data.get_in_touch_info as any;
        setFormData({
          title: data.title || "",
          tagline_line1: data.tagline_line1 || "",
          description: data.description || "",
          introduction_text: data.introduction_text || "",
          max_guests: data.max_guests?.toString() ?? "",
          bedrooms: data.bedrooms?.toString() ?? "",
          bathrooms: data.bathrooms?.toString() ?? "",
          contact_email: getInTouchInfo?.contact_email || "",
          contact_phone: getInTouchInfo?.contact_phone || "",
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
          description: formData.description,
          introduction_text: formData.introduction_text,
          // Empty boxes keep the saved number
          ...(toCount(formData.max_guests) !== null && { max_guests: toCount(formData.max_guests) }),
          ...(toCount(formData.bedrooms) !== null && { bedrooms: toCount(formData.bedrooms) }),
          ...(toCount(formData.bathrooms) !== null && { bathrooms: toCount(formData.bathrooms) }),
          get_in_touch_info: {
            type: 'custom',
            contact_email: formData.contact_email,
            contact_phone: formData.contact_phone
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Property information and contact details updated successfully'
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="The place, the area and what guests can do there"
              rows={5}
            />
            <p className="text-xs text-muted-foreground">Shown on your listing and in search results.</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_guests">Guests</Label>
              <Input
                id="max_guests"
                type="number"
                min={1}
                value={formData.max_guests}
                onChange={(e) => setFormData(prev => ({ ...prev, max_guests: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                min={0}
                value={formData.bedrooms}
                onChange={(e) => setFormData(prev => ({ ...prev, bedrooms: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                min={0}
                value={formData.bathrooms}
                onChange={(e) => setFormData(prev => ({ ...prev, bathrooms: e.target.value }))}
              />
            </div>
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

      <BankAccountSetup />
    </div>
  );
};