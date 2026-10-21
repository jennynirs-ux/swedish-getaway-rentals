import { useState, useEffect, lazy, Suspense } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { geocodeAddress } from '@/lib/geocoding';
import { toast } from '@/hooks/use-toast';
import ErrorBoundary from '@/components/common/ErrorBoundary';

const EditorMap = lazy(() => import('./maps/LeafletEditorBasic'));

interface LocationData {
  street?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface LocationEditorProps {
  value: LocationData;
  onChange: (data: LocationData) => void;
}


// Mid-Sweden: where the map opens for a place that has no pin yet, zoomed
// out to show the whole country
const SWEDEN_CENTER: [number, number] = [62.4, 16.5];

// Nominatim may name the country in the browser's language ("Sverige")
const normaliseCountry = (country?: string) =>
  country && /^(sverige|se|swe)$/i.test(country.trim()) ? 'Sweden' : country;

export function LocationEditor({ value, onChange }: LocationEditorProps) {
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hasPin = Number.isFinite(value.latitude) && Number.isFinite(value.longitude);
  const [mapPosition, setMapPosition] = useState<[number, number]>(
    hasPin ? [value.latitude as number, value.longitude as number] : SWEDEN_CENTER
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (value.latitude && value.longitude) {
      setMapPosition([value.latitude, value.longitude]);
    }
  }, [value.latitude, value.longitude]);

  const handleFieldChange = (field: keyof LocationData, fieldValue: string) => {
    onChange({
      ...value,
      [field]: fieldValue
    });
  };

  const handleGeocode = async () => {
    if (!value.street && !value.city) {
      toast({
        title: 'Missing information',
        description: 'Please enter at least a city or street address',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const addressParts = [
        value.street,
        value.postal_code,
        value.city,
        value.country || 'Sweden'
      ].filter(Boolean);
      
      const addressString = addressParts.join(', ');
      const result = await geocodeAddress(addressString);

      if (result) {
        onChange({
          ...value,
          latitude: result.latitude,
          longitude: result.longitude,
          // The host's own city is kept: for a rural address the lookup often
          // names a nearby village instead
          city: value.city || result.city,
          country: normaliseCountry(value.country || result.country)
        });
        setMapPosition([result.latitude, result.longitude]);
        toast({
          title: 'Location found',
          description: 'Coordinates have been updated. You can drag the pin to adjust.'
        });
      } else {
        toast({
          title: 'Location not found',
          description: 'Could not find coordinates for this address',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({
        title: 'Error',
        description: 'Failed to geocode address',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerMove = (lat: number, lng: number) => {
    onChange({
      ...value,
      latitude: lat,
      longitude: lng
    });
    setMapPosition([lat, lng]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Location & Address
        </CardTitle>
        <CardDescription>
          Enter the property address and adjust the location on the map
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              value={value.street || ''}
              onChange={(e) => handleFieldChange('street', e.target.value)}
              placeholder="Storgatan 123"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code">Postal Code</Label>
            <Input
              id="postal_code"
              value={value.postal_code || ''}
              onChange={(e) => handleFieldChange('postal_code', e.target.value)}
              placeholder="123 45"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={value.city || ''}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              placeholder="Åre"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={value.country || 'Sweden'}
              onChange={(e) => handleFieldChange('country', e.target.value)}
              placeholder="Sweden"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleGeocode}
            disabled={loading}
            className="gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Finding location...' : 'Find Coordinates'}
          </Button>
        </div>

        {mounted && (
          <div className="space-y-2">
            <Label>Map Preview</Label>
            <p className="text-sm text-muted-foreground mb-2">
              {hasPin
                ? "Drag the pin to adjust the exact location. Click anywhere on the map to move the pin."
                : "No pin yet. Find your address above, or click the map where your place is."}
            </p>
            <div className="h-[400px] rounded-lg overflow-hidden border">
              <ErrorBoundary>
                <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
                  <EditorMap
                    center={mapPosition}
                    zoom={hasPin ? 13 : 5}
                    showMarker={hasPin}
                    onPositionChange={handleMarkerMove}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
            {typeof value.latitude === 'number' && typeof value.longitude === 'number' && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Latitude:</span>
                  <span className="ml-2 font-mono">{value.latitude.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Longitude:</span>
                  <span className="ml-2 font-mono">{value.longitude.toFixed(6)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


