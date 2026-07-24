"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

const markerIcon = L.icon({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export type MapLocation = {
  id: string;
  name: string;
  notes?: string | null;
  lat: number;
  lng: number;
};

function ClickHandler({
  onMapClick,
}: {
  onMapClick?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function ResizeWatcher() {
  const map = useMap();
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    containerRef.current = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

export default function TripMap({
  locations,
  onMapClick,
  pendingMarker,
}: {
  locations: MapLocation[];
  onMapClick?: (lat: number, lng: number) => void;
  pendingMarker?: { lat: number; lng: number } | null;
}) {
  const center = useMemo<[number, number]>(() => {
    if (pendingMarker) return [pendingMarker.lat, pendingMarker.lng];
    if (locations.length > 0) return [locations[0].lat, locations[0].lng];
    return [20, 0];
  }, [locations, pendingMarker]);

  const zoom = locations.length > 0 || pendingMarker ? 10 : 2;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ResizeWatcher />
      {onMapClick && <ClickHandler onMapClick={onMapClick} />}
      {locations.map((loc) => (
        <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={markerIcon}>
          <Popup>
            <strong>{loc.name}</strong>
            {loc.notes && <div>{loc.notes}</div>}
          </Popup>
        </Marker>
      ))}
      {pendingMarker && (
        <Marker
          position={[pendingMarker.lat, pendingMarker.lng]}
          icon={markerIcon}
        >
          <Popup>New location</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
