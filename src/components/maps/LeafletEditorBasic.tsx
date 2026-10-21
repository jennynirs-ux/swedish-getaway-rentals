import React, { useCallback, useEffect, useRef } from 'react';
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
  center: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
  /** Zoom to open at, and to switch to whenever it changes (default 13) */
  zoom?: number;
  /** False while the place has no pin: no marker until the host clicks the map */
  showMarker?: boolean;
}

// A draggable marker that reports where the host drops it
const addDraggableMarker = (map: L.Map, position: L.LatLngExpression, onDrop: (lat: number, lng: number) => void) => {
  const marker = L.marker(position, { draggable: true }).addTo(map);
  marker.on('dragend', () => {
    const pos = marker.getLatLng();
    onDrop(pos.lat, pos.lng);
  });
  return marker;
};

const LeafletEditorBasic: React.FC<Props> = ({ center, onPositionChange, zoom = 13, showMarker = true }) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // The map is built once: the callback and the first view are read through
  // refs, so a parent re-render doesn't rebuild it and reset the host's zoom
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;
  const initialView = useRef({ center, zoom, showMarker });
  const appliedZoom = useRef(zoom);
  // Where the host last put the pin, so the map doesn't jump to it
  const pickedPosition = useRef<[number, number] | null>(null);

  const pick = useCallback((lat: number, lng: number) => {
    pickedPosition.current = [lat, lng];
    onPositionChangeRef.current(lat, lng);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const { center: firstCenter, zoom: firstZoom, showMarker: firstMarker } = initialView.current;
    const map = L.map(containerRef.current).setView(firstCenter, firstZoom);
    mapRef.current = map;

    // Tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    if (firstMarker) markerRef.current = addDraggableMarker(map, firstCenter, pick);

    // Without a pin yet, the first click places the marker
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
      else markerRef.current = addDraggableMarker(map, [lat, lng], pick);
      pick(lat, lng);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [pick]);

  // Follow position changes from outside the map (e.g. an address lookup).
  // The host's own zoom is kept unless the zoom prop changes (first pin)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const zoomChanged = appliedZoom.current !== zoom;
    appliedZoom.current = zoom;
    const picked = pickedPosition.current;
    const pickedHere = !!picked && picked[0] === center[0] && picked[1] === center[1];
    if (zoomChanged || !pickedHere) {
      map.setView(center, zoomChanged ? zoom : map.getZoom());
    }
    if (!showMarker) return;
    if (markerRef.current) markerRef.current.setLatLng(center);
    else markerRef.current = addDraggableMarker(map, center, pick);
  }, [center, zoom, showMarker, pick]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default LeafletEditorBasic;
