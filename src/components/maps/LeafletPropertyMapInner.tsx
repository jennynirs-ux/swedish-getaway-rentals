import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

function MapUpdater({ center }: { center: LatLngExpression }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

type Props = {
  position: LatLngExpression;
  propertyTitle: string;
  googleMapsUrl: string;
  routePositions?: LatLngExpression[];
};

function LeafletPropertyMapInner({ position, propertyTitle, googleMapsUrl, routePositions = [] }: Props) {
  return (
    <MapContainer center={position} zoom={13} scrollWheelZoom={false} className="w-full h-full rounded-lg z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={position} />
      {routePositions.length > 0 && (
        <Polyline
          positions={routePositions}
          pathOptions={{ color: 'hsl(var(--primary))', weight: 4, opacity: 0.7 }}
        />
      )}
      <Marker position={position}>
        <Popup>
          <div className="text-sm">
            <p className="font-semibold mb-2">{propertyTitle}</p>
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Get directions →
            </a>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}

export default LeafletPropertyMapInner;
