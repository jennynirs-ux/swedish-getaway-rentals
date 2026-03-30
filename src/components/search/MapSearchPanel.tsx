// @ts-nocheck
'use client';

import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
// CSS is imported here to ensure it's only loaded when this map component is used
import 'leaflet/dist/leaflet.css';

interface MapSearchPanelProps {
  properties: any[];
  hoveredPropertyId: string | null;
  onMapMove: (bounds: { north: number; south: number; east: number; west: number }) => void;
  onPropertySelect: (id: string) => void;
}

// Create a price marker icon
function createPriceIcon(price: number, currency: string, isHovered: boolean) {
  const formatted = currency === 'SEK' ? `${Math.round(price)} kr` : `€${Math.round(price)}`;
  return L.divIcon({
    className: 'price-marker',
    html: `<div class="${isHovered ? 'bg-primary text-white scale-110' : 'bg-white text-foreground'} shadow-lg rounded-full px-3 py-1.5 text-xs font-semibold border border-border whitespace-nowrap transition-all duration-200 hover:bg-primary hover:text-white cursor-pointer">${formatted}</div>`,
    iconSize: [80, 30],
    iconAnchor: [40, 15],
  });
}

// Component to track map movement
function MapEventHandler({ onMapMove }: { onMapMove: MapSearchPanelProps['onMapMove'] }) {
  const map = useMap();

  useEffect(() => {
    const handleMove = () => {
      const bounds = map.getBounds();
      onMapMove({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    };

    map.on('moveend', handleMove);
    handleMove(); // Initial bounds

    return () => { map.off('moveend', handleMove); };
  }, [map, onMapMove, properties]);

  return null;
}

export function MapSearchPanel({ properties, hoveredPropertyId, onMapMove, onPropertySelect }: MapSearchPanelProps) {
  const propertiesWithCoords = useMemo(
    () => properties.filter(p => p.latitude && p.longitude),
    [properties]
  );

  // Calculate center from properties or default to Sweden center
  const center = useMemo(() => {
    if (propertiesWithCoords.length === 0) return [62.0, 15.0] as [number, number];
    const avgLat = propertiesWithCoords.reduce((sum, p) => sum + p.latitude, 0) / propertiesWithCoords.length;
    const avgLng = propertiesWithCoords.reduce((sum, p) => sum + p.longitude, 0) / propertiesWithCoords.length;
    return [avgLat, avgLng] as [number, number];
  }, [propertiesWithCoords]);

  return (
    <div className="h-full w-full relative">
      <MapContainer center={center} zoom={6} className="h-full w-full z-0" scrollWheelZoom={true} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEventHandler onMapMove={onMapMove} />
        {propertiesWithCoords.map(property => (
          <Marker
            key={property.id}
            position={[property.latitude, property.longitude]}
            icon={createPriceIcon(property.price_per_night, property.currency || 'SEK', property.id === hoveredPropertyId)}
            eventHandlers={{
              click: () => onPropertySelect(property.id),
            }}
          >
            <Popup>
              <div className="text-sm font-medium">{property.title}</div>
              <div className="text-xs text-muted-foreground">{property.location}</div>
              <div className="text-sm font-semibold mt-1">
                {property.currency === 'SEK' ? `${property.price_per_night} kr` : `€${property.price_per_night}`} / night
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
