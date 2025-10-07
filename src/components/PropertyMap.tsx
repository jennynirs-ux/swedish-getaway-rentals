import { memo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, MapContainerProps, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { getDrivingRoute, getClosestMajorCity, type Coordinates, type RouteInfo } from '@/lib/distance';

// Fix Leaflet default icon issue
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  propertyTitle: string;
  className?: string;
  showRoute?: boolean;
}

// Component to handle map center updates
const MapUpdater = memo(({ center }: { center: LatLngExpression }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
});

MapUpdater.displayName = 'MapUpdater';

const PropertyMap = memo(({ latitude, longitude, propertyTitle, className = '', showRoute = false }: PropertyMapProps) => {
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  const position: LatLngExpression = [latitude, longitude];

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
            setRoute(routeInfo);
          }
        } catch (error) {
          console.error('Failed to load route:', error);
        } finally {
          setRouteLoading(false);
        }
      };
      loadRoute();
    }
  }, [latitude, longitude, showRoute]);

  const mapProps: MapContainerProps = {
    center: position,
    zoom: 13,
    scrollWheelZoom: false,
    className: "w-full h-full rounded-lg z-0"
  };

  // Convert route geometry to Leaflet LatLng format
  const routePositions: LatLngExpression[] = route?.geometry.map(
    ([lng, lat]) => [lat, lng] as LatLngExpression
  ) || [];

  return (
    <div className={`relative ${className}`}>
      <MapContainer {...mapProps}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={position} />
        
        {route && routePositions.length > 0 && (
          <Polyline
            positions={routePositions}
            pathOptions={{ 
              color: 'hsl(var(--primary))',
              weight: 4,
              opacity: 0.7
            }}
          />
        )}
        
        <Marker position={position}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold mb-2">{propertyTitle}</p>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Get directions →
              </a>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
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
});

PropertyMap.displayName = 'PropertyMap';

export default PropertyMap;
