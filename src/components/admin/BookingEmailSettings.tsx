import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Mail, Eye, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Property {
  id: string;
  title: string;
  cancellation_policy: string;
  guidebook_sections: any;
}

interface EmailTracking {
  id: string;
  booking_id: string;
  recipient_email: string;
  sent_at: string;
  opened_at: string | null;
  opened_count: number;
}

export const BookingEmailSettings = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [emailStats, setEmailStats] = useState<EmailTracking[]>([]);
  
  const [formData, setFormData] = useState({
    cancellation_policy: "moderate" as "flexible" | "moderate" | "strict",
    house_rules: [] as string[],
    guidebook_url: "",
  });

  useEffect(() => {
    loadProperties();
    loadEmailStats();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      loadPropertySettings();
    }
  }, [selectedProperty]);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, cancellation_policy, guidebook_sections")
        .order("title");
      
      if (error) throw error;
      setProperties(data || []);
      if (data && data.length > 0) {
        setSelectedProperty(data[0].id);
      }
    } catch (error) {
      console.error("Error loading properties:", error);
      toast({ title: "Error", description: "Failed to load properties", variant: "destructive" });
    }
  };

  const loadPropertySettings = async () => {
    if (!selectedProperty) return;

    const property = properties.find(p => p.id === selectedProperty);
    if (!property) return;

    // Extract house rules from guidebook sections
    const guidebookSections = (typeof property.guidebook_sections === 'string' 
      ? JSON.parse(property.guidebook_sections) 
      : property.guidebook_sections) || [];
    const rulesSection = guidebookSections.find((s: any) => s.id === 'rules');
    const houseRules = rulesSection?.blocks?.filter((b: any) => b.type === 'list')
      .flatMap((b: any) => b.items || []) || [];

    setFormData({
      cancellation_policy: (property.cancellation_policy || "moderate") as any,
      house_rules: houseRules,
      guidebook_url: `${window.location.origin}/property/${property.id}/guide`,
    });
  };

  const loadEmailStats = async () => {
    try {
      const { data, error } = await supabase
        .from("booking_email_tracking")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setEmailStats(data || []);
    } catch (error) {
      console.error("Error loading email stats:", error);
    }
  };

  const handleSave = async () => {
    if (!selectedProperty) return;

    setLoading(true);
    try {
      // Update cancellation policy
      const { error: policyError } = await supabase
        .from("properties")
        .update({ cancellation_policy: formData.cancellation_policy })
        .eq("id", selectedProperty);

      if (policyError) throw policyError;

      // Update house rules in guidebook sections
      const property = properties.find(p => p.id === selectedProperty);
      const guidebookSections = (typeof property?.guidebook_sections === 'string' 
        ? JSON.parse(property.guidebook_sections) 
        : property?.guidebook_sections) || [];
      
      // Update or create rules section
      const rulesIndex = guidebookSections.findIndex((s: any) => s.id === 'rules');
      const rulesSection = {
        id: 'rules',
        title: 'House Rules',
        blocks: [
          {
            type: 'list',
            items: formData.house_rules.filter(r => r.trim()),
          }
        ]
      };

      if (rulesIndex >= 0) {
        guidebookSections[rulesIndex] = rulesSection;
      } else {
        guidebookSections.push(rulesSection);
      }

      const { error: rulesError } = await supabase
        .from("properties")
        .update({ guidebook_sections: guidebookSections })
        .eq("id", selectedProperty);

      if (rulesError) throw rulesError;

      toast({ title: "Saved", description: "Email settings updated successfully" });
      await loadProperties();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addHouseRule = () => {
    setFormData(prev => ({
      ...prev,
      house_rules: [...prev.house_rules, ""]
    }));
  };

  const updateHouseRule = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      house_rules: prev.house_rules.map((rule, i) => i === index ? value : rule)
    }));
  };

  const removeHouseRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      house_rules: prev.house_rules.filter((_, i) => i !== index)
    }));
  };

  const calculateOpenRate = () => {
    if (emailStats.length === 0) return 0;
    const opened = emailStats.filter(e => e.opened_at).length;
    return Math.round((opened / emailStats.length) * 100);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="settings" className="w-full">
        <TabsList>
          <TabsTrigger value="settings">
            <Mail className="w-4 h-4 mr-2" />
            Email Settings
          </TabsTrigger>
          <TabsTrigger value="tracking">
            <Eye className="w-4 h-4 mr-2" />
            Email Tracking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automated Booking Email Settings</CardTitle>
              <CardDescription>
                Configure cancellation policies and house rules that will be automatically included in booking confirmation emails.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Select Property</Label>
                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(property => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cancellation Policy</Label>
                <Select 
                  value={formData.cancellation_policy} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, cancellation_policy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flexible">
                      Flexible - Full refund up to 1 day before
                    </SelectItem>
                    <SelectItem value="moderate">
                      Moderate - Full refund up to 5 days before
                    </SelectItem>
                    <SelectItem value="strict">
                      Strict - 50% refund up to 7 days before
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Guest Guidebook URL</Label>
                <Input 
                  value={formData.guidebook_url} 
                  readOnly
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  This link will be included in booking confirmation emails
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>House Rules</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addHouseRule}>
                    Add Rule
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.house_rules.map((rule, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={rule}
                        onChange={(e) => updateHouseRule(index, e.target.value)}
                        placeholder="Enter house rule..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeHouseRule(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  {formData.house_rules.length === 0 && (
                    <p className="text-sm text-muted-foreground">No house rules added yet</p>
                  )}
                </div>
              </div>

              <Button onClick={handleSave} disabled={loading}>
                {loading ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Emails Sent</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{emailStats.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Emails Opened</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {emailStats.filter(e => e.opened_at).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{calculateOpenRate()}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Emails</CardTitle>
              <CardDescription>Track the delivery and open status of booking confirmation emails</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emailStats.slice(0, 20).map((email) => (
                  <div key={email.id} className="flex items-center justify-between border-b pb-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{email.recipient_email}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Sent: {new Date(email.sent_at).toLocaleString()}
                      </p>
                      {email.opened_at && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Opened: {new Date(email.opened_at).toLocaleString()} ({email.opened_count}x)
                        </p>
                      )}
                    </div>
                    <Badge variant={email.opened_at ? "default" : "secondary"}>
                      {email.opened_at ? "Opened" : "Sent"}
                    </Badge>
                  </div>
                ))}
                {emailStats.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No emails sent yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
