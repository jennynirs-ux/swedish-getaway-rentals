import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationEditor } from "@/components/LocationEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MapPin, Plus, Trash2 } from "lucide-react";

interface LocationData {
  street?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface NearbyLocation {
  name: string;
  distance: number;
  type: string;
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
  const [nearbyLocations, setNearbyLocations] = useState<NearbyLocation[]>([
    { name: "Airport", distance: 0, type: "airport" },
    { name: "Bus Station", distance: 0, type: "bus_station" },
    { name: "Train Station", distance: 0, type: "train_station" },
    { name: "Grocery Store", distance: 0, type: "grocery" },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLocationData();
  }, [propertyId]);

  const loadLocationData = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("street, postal_code, city, country, latitude, longitude, transport_distances")
        .eq("id", propertyId)
        .single();

      if (error) throw error;

      if (data) {
        setLocationData({
          street: data.street || "",
          postal_code: data.postal_code || "",
          city: data.city || "",
          country: data.country || "Sweden",
          latitude: data.latitude || null,
          longitude: data.longitude || null,
        });

        // Load saved transport distances
        const saved = data.transport_distances as NearbyLocation[] | null;
        if (saved && Array.isArray(saved) && saved.length > 0) {
          setNearbyLocations(saved);
        }
      }
    } catch (error) {
      console.error("Error loading location data:", error);
    }
  };

  const handleSaveLocation = async () => {
    setSaving(true);
    try {
      // Filter out empty entries before saving
      const validDistances = nearbyLocations.filter(
        (loc) => loc.name.trim() !== "" && loc.distance > 0
      );

      const { error } = await supabase
        .from("properties")
        .update({
          street: locationData.street,
          postal_code: locationData.postal_code,
          city: locationData.city ? locationData.city.toLowerCase() : null,
          country: locationData.country,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          transport_distances: validDistances,
          updated_at: new Date().toISOString(),
        })
        .eq("id", propertyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Location and nearby distances updated successfully",
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

  const updateNearbyLocation = (index: number, field: keyof NearbyLocation, value: string | number) => {
    const updated = [...nearbyLocations];
    updated[index] = { ...updated[index], [field]: value };
    setNearbyLocations(updated);
  };

  const addNearbyLocation = () => {
    setNearbyLocations([...nearbyLocations, { name: "", distance: 0, type: "custom" }]);
  };

  const removeNearbyLocation = (index: number) => {
    setNearbyLocations(nearbyLocations.filter((_, i) => i !== index));
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
            Nearby Locations & Distances
          </CardTitle>
          <CardDescription>
            Enter distances to key locations (in kilometers)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {nearbyLocations.map((location, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border rounded-lg">
              <div className="space-y-2">
                <Label htmlFor={`location-name-${index}`}>Location Name</Label>
                <Input
                  id={`location-name-${index}`}
                  value={location.name}
                  onChange={(e) => updateNearbyLocation(index, "name", e.target.value)}
                  placeholder="e.g., Gothenburg Airport"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`location-distance-${index}`}>Distance (km)</Label>
                <Input
                  id={`location-distance-${index}`}
                  type="number"
                  min="0"
                  step="0.1"
                  value={location.distance}
                  onChange={(e) => updateNearbyLocation(index, "distance", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeNearbyLocation(index)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addNearbyLocation} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
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
