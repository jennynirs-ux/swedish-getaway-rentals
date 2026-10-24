import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationEditor } from "@/components/LocationEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { fetchPropertyPrivateDetails, savePropertyPrivateDetails } from "@/lib/propertyPrivateDetails";
import { CountySelect, publicAreaFrom } from "./CountySelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// The designation Skatteverket's yearly report asks for (DAC7), by kind of place
const DESIGNATION_KINDS = [
  { value: "fastighet", label: "Ett hus eller en stuga med egen fastighetsbeteckning", placeholder: "t.ex. Lerum Exempel 1:23" },
  { value: "lagenhet", label: "En lägenhet (ange lägenhetsnumret)", placeholder: "t.ex. lgh 1102" },
  { value: "stuga", label: "En stuga i en stugby (ange stugans nummer)", placeholder: "t.ex. stuga 14" },
  { value: "none", label: "Den har ingen egen beteckning", placeholder: "" },
] as const;
import { MapPin } from "lucide-react";

interface LocationData {
  street?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface HostLocationTabProps {
  propertyId: string;
  onUpdate?: () => void;
}

export const HostLocationTab = ({ propertyId, onUpdate }: HostLocationTabProps) => {
  const [locationData, setLocationData] = useState<LocationData>({
    street: "",
    postal_code: "",
    city: "",
    country: "Sweden",
    latitude: null,
    longitude: null,
  });
  // The area guests see on the listing, e.g. "Åre, Sweden"
  const [publicLocation, setPublicLocation] = useState("");
  // ISO 3166-2:SE code; publishing needs it (and the pin) so guests can find the place by region
  const [county, setCounty] = useState("");
  // DAC7: fastighetsbeteckning (or apartment / cabin number), private like the street
  const [designationKind, setDesignationKind] = useState("");
  const [designation, setDesignation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLocationData();
  }, [propertyId]);

  const loadLocationData = async () => {
    try {
      // Street and postal code are private (host/admin only), so they live in
      // property_private_details instead of the publicly readable properties row.
      const [{ data, error }, privateDetails] = await Promise.all([
        supabase
          .from("properties")
          .select("location, city, country, latitude, longitude, county")
          .eq("id", propertyId)
          .single(),
        fetchPropertyPrivateDetails(propertyId),
      ]);

      if (error) throw error;

      if (data) {
        setPublicLocation(data.location || "");
        setCounty(data.county || "");
        setDesignationKind(privateDetails?.designation_kind || "");
        setDesignation(privateDetails?.fastighetsbeteckning || "");
        setLocationData({
          street: privateDetails?.street || "",
          postal_code: privateDetails?.postal_code || "",
          city: data.city || "",
          country: data.country || "Sweden",
          latitude: data.latitude || null,
          longitude: data.longitude || null,
        });
      }
    } catch (error) {
      console.error("Error loading location data:", error);
    }
  };

  const handleSaveLocation = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("properties")
        .update({
          ...(publicLocation.trim() && { location: publicLocation.trim() }),
          city: locationData.city ? locationData.city.toLowerCase() : null,
          country: locationData.country,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          ...(county && { county }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", propertyId);

      if (error) throw error;

      await savePropertyPrivateDetails(propertyId, {
        designation_kind: designationKind || null,
        fastighetsbeteckning: designationKind && designationKind !== "none" ? designation.trim() || null : null,
        street: locationData.street || null,
        postal_code: locationData.postal_code || null,
      });

      toast({
        title: "Sparat",
        description: "Platsen är uppdaterad",
      });
      onUpdate?.();
    } catch (error) {
      console.error("Error saving location:", error);
      toast({
        title: "Något gick fel",
        description: "Det gick inte att spara platsen",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <LocationEditor
        value={locationData}
        onChange={(data) => {
          // The area guests see follows the town until the host writes their own
          if (publicLocation === publicAreaFrom(locationData.city, locationData.country) || !publicLocation.trim()) {
            setPublicLocation(publicAreaFrom(data.city, data.country || "Sweden"));
          }
          setLocationData({
            street: data.street || "",
            postal_code: data.postal_code || "",
            city: data.city || "",
            country: data.country || "Sweden",
            latitude: data.latitude || null,
            longitude: data.longitude || null,
          });
        }}
      >
        <CountySelect value={county} onChange={setCounty} />
      </LocationEditor>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Område som gästerna ser
          </CardTitle>
          <CardDescription>
            Visas i din annons och i sökningen i stället för adressen, t.ex. "Åre, Sweden". Fylls i från orten ovan.
            Ändra det om en mer känd plats i närheten säger mer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="public-location" className="sr-only">Område som gästerna ser</Label>
            <Input
              id="public-location"
              value={publicLocation}
              onChange={(e) => setPublicLocation(e.target.value)}
              placeholder="Åre, Sweden"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fastighetsbeteckning</CardTitle>
          <CardDescription>
            Behövs för den årliga rapporten till Skatteverket som lagen kräver (DAC7). Den är privat och gästerna ser
            den aldrig. Du hittar den i ditt lagfartsbevis, i din deklaration eller på lantmateriet.se.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="designation-kind">Vad är det för typ av boende?</Label>
            <Select value={designationKind} onValueChange={setDesignationKind}>
              <SelectTrigger id="designation-kind"><SelectValue placeholder="Välj" /></SelectTrigger>
              <SelectContent>
                {DESIGNATION_KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {designationKind && designationKind !== "none" && (
            <div className="space-y-2">
              <Label htmlFor="designation">{designationKind === "fastighet" ? "Fastighetsbeteckning" : designationKind === "lagenhet" ? "Lägenhetsnummer" : "Stugans nummer"}</Label>
              <Input
                id="designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder={DESIGNATION_KINDS.find((k) => k.value === designationKind)?.placeholder}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveLocation} disabled={saving}>
          {saving ? "Sparar…" : "Spara plats"}
        </Button>
      </div>
    </div>
  );
};
