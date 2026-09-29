import { memo, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const PropertyMap = lazy(() => import('./PropertyMap'));

interface PropertyLocationProps {
  latitude: number | null;
  longitude: number | null;
  propertyTitle: string;
  location?: string;
  /** Verified travel facts; without them only the map and directions show */
  gettingHere?: string[];
}

const PropertyLocation = memo(({ latitude, longitude, propertyTitle, location, gettingHere }: PropertyLocationProps) => {
  if (!latitude || !longitude) {
    return (
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-6 h-6" />
              Location
            </h2>
            <div className="bg-card rounded-lg p-8 text-center border border-border">
              <p className="text-muted-foreground">
                {location || 'Location information not available'}
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
            Location
          </h2>
          
          <div className="bg-card rounded-lg overflow-hidden border border-border">
            <Suspense fallback={<Skeleton className="w-full h-[400px]" />}>
              <PropertyMap
                latitude={latitude}
                longitude={longitude}
                propertyTitle={propertyTitle}
                className="h-[400px]"
                showRoute={false}
              />
            </Suspense>
            
            {latitude && longitude && (
              <div className="p-4 bg-card border-t border-border space-y-4">
                {/* Hand-checked facts only: the old box estimated distances from generic lists */}
                {gettingHere && gettingHere.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Navigation className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 space-y-2 text-sm text-muted-foreground">
                      {gettingHere.map((fact) => (
                        <p key={fact}>{fact}</p>
                      ))}
                      <Link to="/stora-harsjon-lerum" className="inline-block font-medium text-primary hover:underline">
                        How to get here and what to do nearby →
                      </Link>
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
                  Get directions
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
