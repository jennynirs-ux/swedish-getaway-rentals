import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Mail } from "lucide-react";

interface EmailTemplate {
  enabled: boolean;
  subject: string;
  message: string;
}

interface EmailTemplates {
  booking_confirmation?: EmailTemplate;
  pre_arrival?: EmailTemplate;
  check_out?: EmailTemplate;
  thank_you?: EmailTemplate;
}

interface EmailTemplatesEditorProps {
  propertyId: string;
  templates: EmailTemplates;
  onUpdate: () => void;
}

const TEMPLATE_PLACEHOLDERS = [
  "{guest_name}",
  "{property_name}",
  "{check_in_date}",
  "{check_out_date}",
  "{check_in_time}",
  "{check_out_time}",
  "{number_of_guests}",
  "{total_amount}",
  "{currency}",
  "{property_address}",
  "{check_in_instructions}",
];

// BUG-040: Required placeholders for email templates
const REQUIRED_PLACEHOLDERS: Record<string, string[]> = {
  booking_confirmation: ["{guest_name}", "{property_name}", "{check_in_date}"],
  pre_arrival: ["{guest_name}", "{check_in_date}", "{check_in_time}"],
  check_out: ["{guest_name}", "{check_out_date}", "{check_out_time}"],
  thank_you: ["{guest_name}", "{property_name}"]
};

// Helper to validate placeholders
const validatePlaceholders = (templateType: keyof EmailTemplates, message: string): string | null => {
  const required = REQUIRED_PLACEHOLDERS[templateType];
  if (!required) return null;

  const missing = required.filter(placeholder => !message.includes(placeholder));
  if (missing.length > 0) {
    return `Missing required placeholders: ${missing.join(", ")}`;
  }
  return null;
};

const DEFAULT_TEMPLATES: EmailTemplates = {
  booking_confirmation: {
    enabled: true,
    subject: "Booking Confirmation - {property_name}",
    message: "Dear {guest_name},\n\nThank you for booking {property_name}!\n\nBooking Details:\n- Check-in: {check_in_date} at {check_in_time}\n- Check-out: {check_out_date} at {check_out_time}\n- Guests: {number_of_guests}\n- Total: {total_amount} {currency}\n\nWe look forward to welcoming you!\n\nBest regards,\nYour Host"
  },
  pre_arrival: {
    enabled: true,
    subject: "Your Stay is Coming Up - {property_name}",
    message: "Hi {guest_name},\n\nYour stay at {property_name} is approaching!\n\nCheck-in Information:\n- Date: {check_in_date}\n- Time: {check_in_time}\n- Address: {property_address}\n\nCheck-in Instructions:\n{check_in_instructions}\n\nIf you have any questions, feel free to reach out.\n\nLooking forward to hosting you!\n\nBest regards,\nYour Host"
  },
  check_out: {
    enabled: true,
    subject: "Check-out Information - {property_name}",
    message: "Hello {guest_name},\n\nWe hope you enjoyed your stay at {property_name}!\n\nCheck-out Details:\n- Date: {check_out_date}\n- Time: {check_out_time}\n\nPlease ensure:\n- All doors and windows are locked\n- Lights and heating/cooling are turned off\n- Keys are returned as instructed\n\nThank you for staying with us!\n\nBest regards,\nYour Host"
  },
  thank_you: {
    enabled: true,
    subject: "Thank You for Staying with Us!",
    message: "Dear {guest_name},\n\nThank you for choosing {property_name} for your stay!\n\nWe hope you had a wonderful experience. We would love to hear about your stay and welcome any feedback.\n\nWe hope to see you again soon!\n\nWarm regards,\nYour Host"
  }
};

export const EmailTemplatesEditor = ({ propertyId, templates, onUpdate }: EmailTemplatesEditorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [localTemplates, setLocalTemplates] = useState<EmailTemplates>(
    templates || DEFAULT_TEMPLATES
  );

  const updateTemplate = (type: keyof EmailTemplates, field: keyof EmailTemplate, value: any) => {
    setLocalTemplates((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("properties")
        .update({ email_templates: localTemplates as any })
        .eq("id", propertyId);

      if (error) throw error;

      toast({
        title: "Email Templates Saved",
        description: "Your email templates have been updated successfully.",
      });
      onUpdate();
    } catch (error: any) {
      console.error("Error saving email templates:", error);
      toast({
        title: "Error",
        description: "Failed to save email templates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderTemplateEditor = (type: keyof EmailTemplates, title: string, description: string) => {
    const template = localTemplates[type] || DEFAULT_TEMPLATES[type]!;
    const validationError = validatePlaceholders(type, template.message);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor={`${type}-enabled`}>Enabled</Label>
              <Switch
                id={`${type}-enabled`}
                checked={template.enabled}
                onCheckedChange={(checked) => updateTemplate(type, "enabled", checked)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor={`${type}-subject`}>Email Subject</Label>
            <Input
              id={`${type}-subject`}
              value={template.subject}
              onChange={(e) => updateTemplate(type, "subject", e.target.value)}
              placeholder="Enter email subject"
              disabled={!template.enabled}
            />
          </div>
          <div>
            <Label htmlFor={`${type}-message`}>Email Message</Label>
            <Textarea
              id={`${type}-message`}
              value={template.message}
              onChange={(e) => updateTemplate(type, "message", e.target.value)}
              placeholder="Enter email message"
              rows={10}
              disabled={!template.enabled}
              className="font-mono text-sm"
            />
            {validationError && (
              <p className="text-destructive text-sm mt-2">{validationError}</p>
            )}
          </div>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Available placeholders:</p>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATE_PLACEHOLDERS.map((placeholder) => (
                    <code
                      key={placeholder}
                      className="px-2 py-1 bg-muted rounded text-xs cursor-pointer hover:bg-muted/80"
                      onClick={() => {
                        navigator.clipboard.writeText(placeholder);
                        toast({ description: `Copied ${placeholder}` });
                      }}
                    >
                      {placeholder}
                    </code>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Click any placeholder to copy it to your clipboard
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Automated Email Templates</h2>
          <p className="text-muted-foreground">
            Customize automated emails sent to your guests at different stages of their booking
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Templates"}
        </Button>
      </div>

      <Tabs defaultValue="booking_confirmation" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="booking_confirmation">Booking Confirmation</TabsTrigger>
          <TabsTrigger value="pre_arrival">Pre-Arrival</TabsTrigger>
          <TabsTrigger value="check_out">Check-Out</TabsTrigger>
          <TabsTrigger value="thank_you">Thank You</TabsTrigger>
        </TabsList>

        <TabsContent value="booking_confirmation" className="space-y-4">
          {renderTemplateEditor(
            "booking_confirmation",
            "Booking Confirmation Email",
            "Sent immediately after a guest completes their booking"
          )}
        </TabsContent>

        <TabsContent value="pre_arrival" className="space-y-4">
          {renderTemplateEditor(
            "pre_arrival",
            "Pre-Arrival Email",
            "Sent 24-48 hours before check-in with arrival details"
          )}
        </TabsContent>

        <TabsContent value="check_out" className="space-y-4">
          {renderTemplateEditor(
            "check_out",
            "Check-Out Email",
            "Sent on check-out day with departure instructions"
          )}
        </TabsContent>

        <TabsContent value="thank_you" className="space-y-4">
          {renderTemplateEditor(
            "thank_you",
            "Thank You Email",
            "Sent 1 day after check-out to thank guests for their stay"
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
