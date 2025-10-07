import { memo, Suspense, lazy, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getClosestMajorCity, calculateDriveTime, getDetailedDistanceText, type Coordinates } from '@/lib/distance';

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
      text: getDetailedDistanceText(closestCity.city, closestCity.distance, driveTime)
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
              />
            </Suspense>
            
            {distanceInfo && (
              <div className="p-4 bg-card border-t border-border">
                <p className="text-sm text-muted-foreground">
                  {distanceInfo.text}
                </p>
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
