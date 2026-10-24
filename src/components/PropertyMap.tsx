import { useEffect, useState, lazy, Suspense } from 'react';
// react-leaflet imports moved to lazy-loaded inner component
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { type Copy, useCopy } from '@/i18n';

const en = {
  notAvailable: 'Location not available.',
  credit: 'Map data © OpenStreetMap contributors',
};
const COPY: Copy<typeof en> = {
  en,
  sv: { notAvailable: 'Läget är inte tillgängligt.', credit: 'Kartdata © OpenStreetMap-bidragsgivare' },
  de: { notAvailable: 'Lage nicht verfügbar.', credit: 'Kartendaten © OpenStreetMap-Mitwirkende' },
};

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  propertyTitle: string;
  className?: string;
}

// Inner map is lazy-loaded to avoid context issues
const PropertyLeaflet = lazy(() => import('./maps/LeafletPropertyMapBasic'));

function PropertyMap({ latitude, longitude, propertyTitle, className = '' }: PropertyMapProps) {
  const t = useCopy(COPY);
  const [mounted, setMounted] = useState(false);
  const isValid = Number.isFinite(latitude) && Number.isFinite(longitude);
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  const position: [number, number] = [latitude, longitude];

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={`relative ${className}`} />;
  }

  if (!isValid) {
    return (
      <div className={`relative ${className}`}>
        <div className="p-3 text-sm text-muted-foreground">{t.notAvailable}</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="h-full w-full flex items-center justify-center">
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <PropertyLeaflet
            position={position}
            propertyTitle={propertyTitle}
            googleMapsUrl={googleMapsUrl}
          />
        </Suspense>
      </ErrorBoundary>
      <div className="absolute bottom-2 right-2 bg-background/80 px-2 py-1 rounded text-xs z-10">
        {t.credit}
      </div>
    </div>
  );
}

PropertyMap.displayName = 'PropertyMap';

export default PropertyMap;
