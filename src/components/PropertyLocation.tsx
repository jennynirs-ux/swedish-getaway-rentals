import { memo, Suspense, lazy, useMemo, useEffect, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { getClosestMajorCity, calculateDriveTime, getDetailedDistanceText, getDrivingRoute, formatDrivingDirections, type Coordinates, type RouteInfo } from '@/lib/distance';

const PropertyMap = lazy(() => import('./PropertyMap'));

interface PropertyLocationProps {
  latitude: number | null;
  longitude: number | null;
  propertyTitle: string;
  location?: string;
}

const PropertyLocation = memo(({ latitude, longitude, propertyTitle, location }: PropertyLocationProps) => {
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

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
      coordinates: closestCity.city === 'Stockholm' 
        ? { latitude: 59.3293, longitude: 18.0686 }
        : closestCity.city === 'Gothenburg'
        ? { latitude: 57.7089, longitude: 11.9746 }
        : { latitude: 55.6050, longitude: 13.0038 }
    };
  }, [latitude, longitude]);

  useEffect(() => {
    if (distanceInfo && latitude && longitude) {
      const loadRoute = async () => {
        setLoadingRoute(true);
        try {
          const propertyCoords: Coordinates = { latitude, longitude };
          const routeInfo = await getDrivingRoute(distanceInfo.coordinates, propertyCoords);
          setRoute(routeInfo);
        } catch (error) {
          console.error('Failed to load route:', error);
        } finally {
          setLoadingRoute(false);
        }
      };
      loadRoute();
    }
  }, [distanceInfo, latitude, longitude]);

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
                showRoute={true}
              />
            </Suspense>
            
            {distanceInfo && (
              <div className="p-4 bg-card border-t border-border space-y-3">
                <div className="flex items-start gap-3">
                  <Navigation className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">
                      {distanceInfo.text}
                    </p>
                    {route && !loadingRoute && (
                      <p className="text-sm text-muted-foreground">
                        {formatDrivingDirections(distanceInfo.city, route.distance, route.duration)}
                      </p>
                    )}
                    {loadingRoute && (
                      <p className="text-sm text-muted-foreground">
                        Calculating driving directions...
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const googleMapsUrl = `https://www.google.com/maps/dir/${distanceInfo.coordinates.latitude},${distanceInfo.coordinates.longitude}/${latitude},${longitude}`;
                    window.open(googleMapsUrl, '_blank');
                  }}
                >
                  <MapPin className="w-4 h-4" />
                  Get full directions
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
