// @ts-nocheck
import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { calculateDistance, type Coordinates } from '@/lib/distance';
import LazyImage from './LazyImage';

interface Property {
  id: string;
  title: string;
  hero_image_url?: string;
  latitude?: number | null;
  longitude?: number | null;
  location?: string;
}

interface NearbyPropertiesProps {
  currentPropertyId: string;
  currentCoordinates: Coordinates;
  allProperties: Property[];
}

const NearbyProperties = memo(({ currentPropertyId, currentCoordinates, allProperties }: NearbyPropertiesProps) => {
  const nearbyProperties = useMemo(() => {
    const MAX_DISTANCE_KM = 25;
    const MAX_RESULTS = 3;

    const propertiesWithDistance = (allProperties || [])
      .filter(p => p.id !== currentPropertyId)
      .filter(p => p.latitude && p.longitude)
      .map(p => {
        const distance = calculateDistance(
          currentCoordinates,
          { latitude: p.latitude!, longitude: p.longitude! }
        );
        return { ...p, distance };
      })
      .filter(p => p.distance <= MAX_DISTANCE_KM)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, MAX_RESULTS);

    return propertiesWithDistance;
  }, [currentPropertyId, currentCoordinates, allProperties]);

  if (nearbyProperties.length === 0) return null;

  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Nearby Properties
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {nearbyProperties.map(property => (
              <Link
                key={property.id}
                to={`/property/${property.id}`}
                className="group"
              >
                <div className="bg-card rounded-lg overflow-hidden border border-border hover:border-primary transition-colors">
                  <div className="relative h-48">
                    <LazyImage
                      src={property.hero_image_url || '/placeholder.jpg'}
                      alt={property.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {property.title}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {Math.round(property.distance)} km away
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});

NearbyProperties.displayName = 'NearbyProperties';

export default NearbyProperties;
