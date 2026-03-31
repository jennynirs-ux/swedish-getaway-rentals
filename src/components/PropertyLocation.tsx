import { memo, Suspense, lazy, useMemo } from 'react';
import { MapPin, Navigation, Plane, Bus, Train, ShoppingCart, Tent } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { getClosestMajorCity, calculateDriveTime, getDetailedDistanceText, type Coordinates, getNearestTransportInfo } from '@/lib/distance';

const PropertyMap = lazy(() => import('./PropertyMap'));

interface PropertyLocationProps {
  latitude: number | null;
  longitude: number | null;
  propertyTitle: string;
  location?: string;
}

const PropertyLocation = memo(({ latitude, longitude, propertyTitle, location }: PropertyLocationProps) => {
  const distanceInfo = useMemo(() => {
    if (!latitude || !longitude) return null;
    
    const coordinates: Coordinates = { latitude, longitude };
    const closestCity = getClosestMajorCity(coordinates);
    
    if (!closestCity) return null;
    
    const driveTime = calculateDriveTime(closestCity.distance);
    return {
      city: closestCity.city,
      distance: closestCity.distance,
      driveTime,
      text: getDetailedDistanceText(closestCity.city, closestCity.distance, driveTime),
    };
  }, [latitude, longitude]);

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
            
            {distanceInfo && latitude && longitude && (
              <div className="p-4 bg-card border-t border-border space-y-4">
                <div className="flex items-start gap-3">
                  <Navigation className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">
                      {distanceInfo.text}
                    </p>
                  </div>
                </div>
                
                {(() => {
                  const transportInfo = getNearestTransportInfo({ latitude, longitude });
                  return (
                    <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Plane className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{transportInfo.airport}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Train className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{transportInfo.trainStation}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Bus className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{transportInfo.busStop}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{transportInfo.grocery}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tent className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{transportInfo.themePark}</span>
                      </div>
                    </div>
                  );
                })()}

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
                  Få vägbeskrivning
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
