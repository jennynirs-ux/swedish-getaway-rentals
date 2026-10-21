import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Props {
  position: [number, number];
  propertyTitle: string;
  googleMapsUrl: string;
  routePositions?: [number, number][];
}

const LeafletPropertyMapBasic: React.FC<Props> = ({ position, propertyTitle, googleMapsUrl, routePositions = [] }) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return; // already initialized

    const map = L.map(containerRef.current).setView(position, 13);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const marker = L.marker(position);
    marker.addTo(map);
    // Hosts publish their own titles (and guide pin names) unreviewed, so the
    // popup is built from DOM nodes: an HTML string would run their markup
    const popup = document.createElement('div');
    popup.style.fontSize = '0.875rem';
    const title = document.createElement('div');
    title.style.fontWeight = '600';
    title.style.marginBottom = '0.25rem';
    title.textContent = propertyTitle;
    const directions = document.createElement('a');
    directions.href = googleMapsUrl;
    directions.target = '_blank';
    directions.rel = 'noopener noreferrer';
    directions.textContent = 'Get directions →';
    popup.append(title, directions);
    marker.bindPopup(popup);
    markerRef.current = marker;

    if (routePositions.length > 0) {
      const poly = L.polyline(routePositions);
      poly.addTo(map);
      polylineRef.current = poly;
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      polylineRef.current = null;
    };
  }, []);

  // Update position/route when props change
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(position, mapRef.current.getZoom());
    }
    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    }
  }, [position]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    if (routePositions.length > 0) {
      const poly = L.polyline(routePositions);
      poly.addTo(mapRef.current);
      polylineRef.current = poly;
    }
  }, [routePositions]);

  return <div ref={containerRef} className="w-full h-full rounded-lg" />;
};

export default LeafletPropertyMapBasic;
