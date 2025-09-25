import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Download, Share, Image as ImageIcon, Home, MapPin, Coffee, Key, Wifi, Utensils, Cog, Landmark, BookOpen, Shield, LogOut, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GuidebookSection {
  id: string;
  icon: React.ElementType;
  title: string;
  content: string;
  image_url?: string;
}

interface GuidebookEditorProps {
  sections: GuidebookSection[];
  onChange: (sections: GuidebookSection[]) => void;
  onSave?: () => Promise<void>;
  saving?: boolean;
  propertyTitle?: string;
}

const FIXED_SECTIONS: Omit<GuidebookSection, "content">[] = [
  { id: "home", icon: Home, title: "Home" },
  { id: "directions", icon: MapPin, title: "Directions" },
  { id: "stop", icon: Coffee, title: "Stop on the way" },
  { id: "checkin", icon: Key, title: "Check in" },
  { id: "wifi", icon: Wifi, title: "Wi-Fi" },
  { id: "kitchen", icon: Utensils, title: "Kitchen" },
  { id: "howthingswork", icon: Cog, title: "How things work" },
  { id: "places", icon: Landmark, title: "Places to visit" },
  { id: "customs", icon: BookOpen, title: "Swedish customs" },
  { id: "rules", icon: Shield, title: "House rules" },
  { id: "checkout", icon: LogOut, title: "Check out" },
  { id: "hoststory", icon: Heart, title: "Host Story" },
];

export const GuidebookEditor = ({
  sections,
  onChange,
  onSave,
  saving = false,
  propertyTitle = "Property",
}: GuidebookEditorProps) => {
  const { toast } = useToast();

  const [localSections, setLocalSections] = useState<GuidebookSection[]>(
    FIXED_SECTIONS.map((s) => ({
      ...s,
      content: sections.find((sec) => sec.id === s.id)?.content || "",
      image_url: sections.find((sec) => sec.id === s.id)?.image_url,
    }))
  );

  const updateSection = (id: string, field: keyof GuidebookSection, value: any) => {
    const updated = localSections.map((s) =>
      s.id === id ? { ...s, [field]: value } : s
    );
    setLocalSections(updated);
    onChange(updated);
  };

  const handleSave = async () => {
    if (onSave) {
      try {
        await onSave();
        toast({
          title: "Success",
          description: "Guest guide saved successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save guest guide",
          variant: "destructive",
        });
      }
    }
  };

  const generateShareableLink = () => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/property-guide/${propertyTitle}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link copied!",
        description: "Shareable guest guide link copied to clipboard",
      });
    });
  };

  const exportToPDF = () => {
    toast({
      title: "PDF Export",
      description: "PDF export functionality will be implemented",
    });
  };

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">Guest Guide for {propertyTitle}</Label>
          <p className="text-sm text-muted-foreground">
            Fill in the guidebook information for your guests
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={generateShareableLink}>
            <Share className="h-4 w-4 mr-2" />
            Share Link
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={exportToPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          {onSave && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </div>

      {/* Fixed section editors */}
      {localSections.map((section) => {
        const Icon = section.icon;
        return (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={section.content}
                  onChange={(e) =>
                    updateSection(section.id, "content", e.target.value)
                  }
                  placeholder={`Write content for ${section.title}`}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Image (optional)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById(`section-image-${section.id}`)?.click()
                    }
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                  <input
                    id={`section-image-${section.id}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () =>
                          updateSection(section.id, "image_url", reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
                {section.image_url && (
                  <img
                    src={section.image_url}
                    alt={section.title}
                    className="w-32 h-32 object-cover rounded-md"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
