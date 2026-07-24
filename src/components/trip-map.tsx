"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

// MapContainer's center/zoom props only apply on first mount, so recentering
// once geolocation resolves asynchronously needs an imperative setView call.
function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function TripMap({
  locations,
  onMapClick,
  pendingMarker,
  interactive = true,
}: {
  locations: MapLocation[];
  onMapClick?: (lat: number, lng: number) => void;
  pendingMarker?: { lat: number; lng: number } | null;
  interactive?: boolean;
}) {
  const hasFixedFocus = locations.length > 0 || Boolean(pendingMarker);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Only an empty map (no pins to already center on, nothing being placed)
  // benefits from defaulting to the visitor's own location -- a map with
  // real content should keep centering on that content.
  useEffect(() => {
    if (hasFixedFocus) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {}, // permission denied or unavailable -- keep the world-view fallback
      { timeout: 8000 },
    );
  }, [hasFixedFocus]);

  const center = useMemo<[number, number]>(() => {
    if (pendingMarker) return [pendingMarker.lat, pendingMarker.lng];
    if (locations.length > 0) return [locations[0].lat, locations[0].lng];
    if (userLocation) return userLocation;
    return [20, 0];
  }, [locations, pendingMarker, userLocation]);

  const zoom = hasFixedFocus ? 10 : userLocation ? 11 : 2;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      boxZoom={interactive}
      keyboard={interactive}
      zoomControl={interactive}
      attributionControl={interactive}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ResizeWatcher />
      {!hasFixedFocus && userLocation && (
        <Recenter center={userLocation} zoom={11} />
      )}
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
