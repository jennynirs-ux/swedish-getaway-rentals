import { memo, Suspense, lazy } from 'react';
import { Link } from '@/i18n/router';
import { MapPin, Navigation } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AREAS } from '@/content/areas';
import { type Copy, useCopy } from '@/i18n';

const en = {
  heading: 'Location',
  noLocation: 'Location information not available',
  areaGuide: 'How to get here and what to do nearby →',
  directions: 'Get directions',
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    heading: 'Läge',
    noLocation: 'Information om läget saknas',
    areaGuide: 'Så tar du dig hit och vad du kan göra i närheten →',
    directions: 'Vägbeskrivning',
  },
  de: {
    heading: 'Lage',
    noLocation: 'Keine Angaben zur Lage verfügbar',
    areaGuide: 'Anreise und Ausflugstipps für die Umgebung →',
    directions: 'Route anzeigen',
  },
};

const PropertyMap = lazy(() => import('./PropertyMap'));

interface PropertyLocationProps {
  latitude: number | null;
  longitude: number | null;
  propertyTitle: string;
  location?: string;
  /** Verified travel facts; without them only the map and directions show */
  gettingHere?: string[];
  /** properties.city; the area-guide link shows only when a guide covers it */
  city?: string | null;
}

const PropertyLocation = memo(({ latitude, longitude, propertyTitle, location, gettingHere, city }: PropertyLocationProps) => {
  const t = useCopy(COPY);
  // Without a city, the town is the first part of the public location ("Lerum, Sweden")
  const town = (city ?? location?.split(',')[0])?.trim().toLowerCase();
  const area = AREAS.find((a) => a.city === town);

  if (!latitude || !longitude) {
    return (
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-6 h-6" />
              {t.heading}
            </h2>
            <div className="bg-card rounded-lg p-8 text-center border border-border">
              <p className="text-muted-foreground">
                {location || t.noLocation}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="location" className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-6 h-6" />
            {t.heading}
          </h2>
          
          <div className="bg-card rounded-lg overflow-hidden border border-border">
            <Suspense fallback={<Skeleton className="w-full h-[400px]" />}>
              <PropertyMap
                latitude={latitude}
                longitude={longitude}
                propertyTitle={propertyTitle}
                className="h-[400px]"
              />
            </Suspense>
            
            {latitude && longitude && (
              <div className="p-4 bg-card border-t border-border space-y-4">
                {/* Hand-checked facts only: the old box estimated distances from generic lists */}
                {((gettingHere && gettingHere.length > 0) || area) && (
                  <div className="flex items-start gap-3">
                    <Navigation className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 space-y-2 text-sm text-muted-foreground">
                      {gettingHere?.map((fact) => (
                        <p key={fact}>{fact}</p>
                      ))}
                      {area && (
                        <Link to={area.path} className="inline-block font-medium text-primary hover:underline">
                          {t.areaGuide}
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 w-full"
                  onClick={() => {
                    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
                    window.open(googleMapsUrl, '_blank');
                  }}
                >
                  <MapPin className="w-4 h-4" />
                  {t.directions}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});

PropertyLocation.displayName = 'PropertyLocation';

export default PropertyLocation;
