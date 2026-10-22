import { useState, useEffect, lazy, Suspense, type ReactNode } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  /** Shown between the country and the address, e.g. the county */
  children?: ReactNode;
  /** Without the card frame, e.g. inside the new-listing guide */
  bare?: boolean;
  mapHeightClass?: string;
}

/** Listings are in Sweden only (counties, prices in kronor) */
const COUNTRIES = ['Sweden'];


// Mid-Sweden: where the map opens for a place that has no pin yet, zoomed
// out to show the whole country
const SWEDEN_CENTER: [number, number] = [62.4, 16.5];

// Nominatim may name the country in the browser's language ("Sverige")
const normaliseCountry = (country?: string) =>
  country && /^(sverige|se|swe)$/i.test(country.trim()) ? 'Sweden' : country;

export function LocationEditor({ value, onChange, children, bare = false, mapHeightClass = 'h-[400px]' }: LocationEditorProps) {
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
        description: 'Enter the street address or the town first.',
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
          title: 'Found it',
          description: 'Check the pin and drag it if it is not quite right.'
        });
      } else {
        toast({
          title: 'Address not found',
          description: 'Click the map where your place is instead.',
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

  const body = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Select value={normaliseCountry(value.country) || 'Sweden'} onValueChange={(v) => handleFieldChange('country', v)}>
          <SelectTrigger id="country"><SelectValue /></SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {children}

      <div className="space-y-2">
        <Label htmlFor="street">Street address</Label>
        <Input
          id="street"
          value={value.street || ''}
          onChange={(e) => handleFieldChange('street', e.target.value)}
          placeholder="Storgatan 12"
          autoComplete="street-address"
        />
        <p className="text-xs text-muted-foreground">Private: only guests with a booking get the address.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[10rem_1fr]">
        <div className="space-y-2">
          <Label htmlFor="postal_code">Postal code</Label>
          <Input
            id="postal_code"
            value={value.postal_code || ''}
            onChange={(e) => handleFieldChange('postal_code', e.target.value)}
            placeholder="123 45"
            autoComplete="postal-code"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Town or village</Label>
          <Input
            id="city"
            value={value.city || ''}
            onChange={(e) => handleFieldChange('city', e.target.value)}
            placeholder="Åre"
            autoComplete="address-level2"
          />
        </div>
      </div>

      <Button type="button" variant="outline" onClick={handleGeocode} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
        {loading ? 'Finding it…' : 'Find on map'}
      </Button>

      {mounted && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {hasPin
              ? 'Is the pin in the right spot? Drag it, or click the map where your place is.'
              : 'No pin yet. Press "Find on map", or click the map where your place is.'}
          </p>
          <div className={`${mapHeightClass} rounded-lg overflow-hidden border`}>
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
        </div>
      )}
    </div>
  );

  if (bare) return body;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Address
        </CardTitle>
        <CardDescription>Where your place is. Guests see the area; the street address only after booking.</CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}


