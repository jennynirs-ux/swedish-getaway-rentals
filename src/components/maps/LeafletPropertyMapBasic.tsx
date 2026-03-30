// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
// CSS is imported here to ensure it's only loaded when this map component is used
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

// Utility function to escape HTML special characters
const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
};

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
    marker.bindPopup(
      `<div style="font-size: 0.875rem;">
        <div style="font-weight:600; margin-bottom: 0.25rem;">${escapeHtml(propertyTitle)}</div>
        <a href="${escapeHtml(googleMapsUrl)}" target="_blank" rel="noopener noreferrer">Get directions →</a>
      </div>`
    );
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

  // Update marker popup content when title changes
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setPopupContent(
        `<div style="font-size: 0.875rem;">
          <div style="font-weight:600; margin-bottom: 0.25rem;">${escapeHtml(propertyTitle)}</div>
          <a href="${escapeHtml(googleMapsUrl)}" target="_blank" rel="noopener noreferrer">Get directions →</a>
        </div>`
      );
    }
  }, [propertyTitle, googleMapsUrl]);

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
