import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
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

type Props = {
  center: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
};

function DraggableMarker({
  position,
  onPositionChange,
}: {
  position: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
}) {
  const eventHandlers = {
    dragend: (e: L.LeafletEvent) => {
      const marker = e.target as L.Marker;
      const pos = marker.getLatLng();
      onPositionChange(pos.lat, pos.lng);
    },
  };

  return <Marker position={position} draggable={true} eventHandlers={eventHandlers} />;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LeafletEditorInner({ center, onPositionChange }: Props) {
  return (
    <MapContainer center={center} zoom={13} className="w-full h-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <DraggableMarker position={center} onPositionChange={onPositionChange} />
      <MapClickHandler onMapClick={onPositionChange} />
    </MapContainer>
  );
}
