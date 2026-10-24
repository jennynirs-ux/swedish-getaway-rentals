import { memo, useMemo } from 'react';
import { Link } from '@/i18n/router';
import { MapPin } from 'lucide-react';
import { calculateDistance, type Coordinates } from '@/lib/distance';
import LazyImage from './LazyImage';
import { type Copy, useCopy } from '@/i18n';
import { translateListing, useListingTranslations } from '@/i18n/listingTexts';
import { listingTexts } from '../../supabase/functions/_shared/listing-text';

const en = {
  title: "Nearby Properties",
  nextDoor: "Next door",
  away: (km: number) => `${km} km away`,
};
const COPY: Copy<typeof en> = {
  en,
  sv: { title: "Stugor i närheten", nextDoor: "Alldeles intill", away: (km) => `${km} km bort` },
  de: { title: "Ferienhäuser in der Nähe", nextDoor: "Gleich nebenan", away: (km) => `${km} km entfernt` },
};

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
  const t = useCopy(COPY);
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

  // Titles in the page's language: one query for the cabins shown
  const translations = useListingTranslations(nearbyProperties.map((p) => p.id));

  if (nearbyProperties.length === 0) return null;
  const shown = nearbyProperties.map((p) => translateListing(p, translations[p.id], listingTexts(p)));

  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            {t.title}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {shown.map(property => (
              <Link
                key={property.id}
                to={`/property/${property.id}`}
                className="group"
              >
                <div className="bg-card rounded-lg overflow-hidden border border-border hover:border-primary transition-colors">
                  <div className="relative h-48">
                    <LazyImage
                      sizes="(max-width: 768px) 100vw, 420px"
                      src={property.hero_image_url || '/placeholder.svg'}
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
                      {property.distance < 1 ? t.nextDoor : t.away(Math.round(property.distance))}
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
