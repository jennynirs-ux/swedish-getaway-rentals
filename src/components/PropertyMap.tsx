import { memo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, MapContainerProps } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
}

const PropertyMap = memo(({ latitude, longitude, propertyTitle, className = '' }: PropertyMapProps) => {
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  const position: LatLngExpression = [latitude, longitude];

  const mapProps: MapContainerProps = {
    center: position,
    zoom: 13,
    scrollWheelZoom: false,
    className: "w-full h-full rounded-lg z-0"
  };

  return (
    <div className={`relative ${className}`}>
      <MapContainer {...mapProps}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
    </div>
  );
});

PropertyMap.displayName = 'PropertyMap';

export default PropertyMap;
