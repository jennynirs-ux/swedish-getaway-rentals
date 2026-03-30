import { useEffect, useRef, useState, lazy, Suspense } from 'react';
// react-leaflet imports moved to lazy-loaded inner component
// leaflet types used by lazy-loaded inner component
import { getDrivingRoute, getClosestMajorCity, type Coordinates, type RouteInfo } from '@/lib/distance';
import ErrorBoundary from '@/components/common/ErrorBoundary';

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  propertyTitle: string;
  className?: string;
  showRoute?: boolean;
}

// Inner map is lazy-loaded to avoid context issues
const PropertyLeaflet = lazy(() => import('./maps/LeafletPropertyMapBasic'));

function PropertyMap({ latitude, longitude, propertyTitle, className = '', showRoute = false }: PropertyMapProps) {
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMountedRef = useRef(true);
  const isValid = Number.isFinite(latitude) && Number.isFinite(longitude);
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  const position: [number, number] = [latitude, longitude];

  useEffect(() => {
    setMounted(true);
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (showRoute) {
      const loadRoute = async () => {
        setRouteLoading(true);
        try {
          const propertyCoords: Coordinates = { latitude, longitude };
          const closestCity = getClosestMajorCity(propertyCoords);

          if (closestCity) {
            const cityCoords = closestCity.city === 'Stockholm'
              ? { latitude: 59.3293, longitude: 18.0686 }
              : closestCity.city === 'Gothenburg'
              ? { latitude: 57.7089, longitude: 11.9746 }
              : { latitude: 55.6050, longitude: 13.0038 };

            const routeInfo = await getDrivingRoute(cityCoords, propertyCoords);
            // Only set state if component is still mounted
            if (isMountedRef.current) {
              setRoute(routeInfo);
            }
          }
        } catch (error) {
          console.error('Failed to load route:', error);
        } finally {
          if (isMountedRef.current) {
            setRouteLoading(false);
          }
        }
      };
      loadRoute();
    }
  }, [latitude, longitude, showRoute]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);


  // Convert route geometry to Leaflet LatLng format
  const routePositions: [number, number][] = route?.geometry.map(
    ([lng, lat]) => [lat, lng] as [number, number]
  ) || [];

  if (!mounted) {
    return <div className={`relative ${className}`} />;
  }

  if (!isValid) {
    return (
      <div className={`relative ${className}`}>
        <div className="p-3 text-sm text-muted-foreground">Location not available.</div>
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
            routePositions={routePositions}
          />
        </Suspense>
      </ErrorBoundary>
      <div className="absolute bottom-2 right-2 bg-background/80 px-2 py-1 rounded text-xs z-10">
        Map data © OpenStreetMap contributors
      </div>
      {routeLoading && (
        <div className="absolute top-2 right-2 bg-background/80 px-3 py-2 rounded text-xs z-10 flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading route...
        </div>
      )}
    </div>
  );
}

PropertyMap.displayName = 'PropertyMap';

export default PropertyMap;
