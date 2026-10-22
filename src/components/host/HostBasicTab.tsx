import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Stepper } from "./listingPrices";

interface HostBasicTabProps {
  propertyId: string;
  onUpdate?: () => void;
}

const PROPERTY_TYPES = ["Cabin", "Cottage", "House", "Villa", "Apartment", "Studio", "Chalet", "Loft"];

/**
 * The Details tab, like Airbnb's listing details: name, description, type,
 * guests and rooms first; the rest (a headline on the page, an introduction,
 * notes, contact details, a registration number) folded away as optional.
 * The bank account lives on the dashboard's Payouts tab, not per listing.
 */
export const HostBasicTab = ({ propertyId, onUpdate }: HostBasicTabProps) => {
  const [saving, setSaving] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    tagline_line1: "",
    tagline_line2: "",
    property_type: "",
    description: "",
    availability_text: "",
    contact_response_time: "",
    registration_number: "",
    introduction_text: "",
    max_guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    contact_email: "",
    contact_phone: "",
  });
  const set = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    loadPropertyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const loadPropertyData = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('title, tagline_line1, tagline_line2, property_type, description, introduction_text, max_guests, bedrooms, bathrooms, availability_text, contact_response_time, registration_number, get_in_touch_info')
        .eq('id', propertyId)
        .single();

      if (error) throw error;

      if (data) {
        const getInTouchInfo = data.get_in_touch_info as { contact_email?: string; contact_phone?: string } | null;
        setFormData({
          title: data.title || "",
          tagline_line1: data.tagline_line1 || "",
          tagline_line2: data.tagline_line2 || "",
          property_type: data.property_type || "",
          description: data.description || "",
          availability_text: data.availability_text || "",
          contact_response_time: data.contact_response_time || "",
          registration_number: data.registration_number || "",
          introduction_text: data.introduction_text || "",
          max_guests: data.max_guests ?? 2,
          bedrooms: data.bedrooms ?? 1,
          bathrooms: Number(data.bathrooms ?? 1),
          contact_email: getInTouchInfo?.contact_email || "",
          contact_phone: getInTouchInfo?.contact_phone || "",
        });
        // Open the optional part when the host has filled something in there
        setMoreOpen(
          !!(data.tagline_line1 || data.introduction_text || data.availability_text || data.contact_response_time ||
            data.registration_number || getInTouchInfo?.contact_email || getInTouchInfo?.contact_phone),
        );
      }
    } catch (error) {
      console.error('Error loading property:', error);
    }
  };

  const handleSave = async () => {
    if (formData.title.trim().length < 3) {
      toast({ title: 'Give your place a name', description: 'At least 3 characters.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          title: formData.title.trim(),
          tagline_line1: formData.tagline_line1 || null,
          tagline_line2: formData.tagline_line2 || null,
          ...(formData.property_type && { property_type: formData.property_type }),
          description: formData.description,
          availability_text: formData.availability_text || null,
          contact_response_time: formData.contact_response_time || null,
          registration_number: formData.registration_number || null,
          introduction_text: formData.introduction_text || null,
          max_guests: formData.max_guests,
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          get_in_touch_info: {
            type: 'custom',
            contact_email: formData.contact_email,
            contact_phone: formData.contact_phone
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyId);

      if (error) throw error;

      toast({ title: 'Details saved' });
      onUpdate?.();
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'Could not save',
        description: (error as { message?: string })?.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listing details</CardTitle>
        <CardDescription>What guests see first about your place</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Name</Label>
          <Input
            id="title"
            value={formData.title}
            maxLength={60}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Lakeside cabin with sauna in Dalarna"
          />
          <p className="text-xs text-muted-foreground">{formData.title.length}/60. Short and specific works best.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="The place, the area and what guests can do there"
            rows={6}
          />
          <p className="text-xs text-muted-foreground">Shown on your listing and in search results.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="property_type">Type of place</Label>
          <Select value={formData.property_type} onValueChange={(v) => set("property_type", v)}>
            <SelectTrigger id="property_type"><SelectValue placeholder="Choose a type" /></SelectTrigger>
            <SelectContent>
              {[...new Set([...PROPERTY_TYPES, formData.property_type].filter(Boolean))].map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="divide-y rounded-lg border px-4">
          <Stepper id="details-guests" label="Guests" hint="The most people who can stay" value={formData.max_guests} min={1} max={30} onChange={(n) => set("max_guests", n)} />
          <Stepper id="details-bedrooms" label="Bedrooms" hint="0 for a studio" value={formData.bedrooms} min={0} max={20} onChange={(n) => set("bedrooms", n)} />
          <Stepper id="details-bathrooms" label="Bathrooms" hint="Half: a toilet without a shower" value={formData.bathrooms} min={0} max={10} step={0.5} onChange={(n) => set("bathrooms", n)} />
        </div>

        <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="-ml-3 gap-1">
              <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              More (optional)
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-5 pt-3">
            <div className="space-y-2">
              <Label htmlFor="tagline">Headline at the top of your page</Label>
              <Input id="tagline" value={formData.tagline_line1} onChange={(e) => set("tagline_line1", e.target.value)} placeholder="e.g. Wake up to the lake" />
              <Input id="tagline2" aria-label="Headline, second line" value={formData.tagline_line2} onChange={(e) => set("tagline_line2", e.target.value)} placeholder="Second line" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="introduction">Introduction above the description</Label>
              <Textarea id="introduction" value={formData.introduction_text} onChange={(e) => set("introduction_text", e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="availability_text">Availability note</Label>
                <Input id="availability_text" value={formData.availability_text} onChange={(e) => set("availability_text", e.target.value)} placeholder="e.g. Open all year" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_response_time">Response time</Label>
                <Input id="contact_response_time" value={formData.contact_response_time} onChange={(e) => set("contact_response_time", e.target.value)} placeholder="e.g. Usually within a few hours" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact e-mail on your page</Label>
                <Input id="contact_email" type="email" value={formData.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact phone on your page</Label>
                <Input id="contact_phone" type="tel" value={formData.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration_number">Registration number</Label>
              <Input id="registration_number" value={formData.registration_number} onChange={(e) => set("registration_number", e.target.value)} placeholder="If your municipality requires one" />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save details'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
