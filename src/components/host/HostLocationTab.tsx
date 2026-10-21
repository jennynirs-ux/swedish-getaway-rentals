import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationEditor } from "@/components/LocationEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { fetchPropertyPrivateDetails, savePropertyPrivateDetails } from "@/lib/propertyPrivateDetails";
import { REGIONS_BY_NAME } from "@/content/regions";
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
        street: locationData.street || null,
        postal_code: locationData.postal_code || null,
      });

      toast({
        title: "Success",
        description: "Location updated",
      });
      onUpdate?.();
    } catch (error) {
      console.error("Error saving location:", error);
      toast({
        title: "Error",
        description: "Failed to save location",
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
        onChange={(data) =>
          setLocationData({
            street: data.street || "",
            postal_code: data.postal_code || "",
            city: data.city || "",
            country: data.country || "Sweden",
            latitude: data.latitude || null,
            longitude: data.longitude || null,
          })
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Area shown to guests
          </CardTitle>
          <CardDescription>
            Shown on your listing and in search, e.g. "Åre, Sweden" (town or village, then country). Your street
            address stays private: guests get it in their booking confirmation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="public-location" className="sr-only">Area shown to guests</Label>
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
          <CardTitle>County</CardTitle>
          <CardDescription>So your place appears in the right region.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="county" className="sr-only">County</Label>
          <Select value={county} onValueChange={setCounty}>
            <SelectTrigger id="county">
              <SelectValue placeholder="Choose a county" />
            </SelectTrigger>
            <SelectContent>
              {REGIONS_BY_NAME.map((r) => (
                <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveLocation} disabled={saving}>
          {saving ? "Saving..." : "Save Location"}
        </Button>
      </div>
    </div>
  );
};
