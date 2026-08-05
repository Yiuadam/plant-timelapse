"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";

export type PickableArea = {
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
};

// Area names come straight from OpenStreetMap tags, and divIcon takes raw
// HTML -- so they're escaped rather than interpolated as-is.
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// A named pill rather than a pin: which district is which is the entire
// question being asked here, so an unlabelled marker would force a tap
// just to find out what it is. iconSize [0,0] lets the pill size itself
// to the text, and the CSS centres it over the real coordinate.
function areaIcon(name: string) {
  return L.divIcon({
    className: "area-pick-marker",
    html: `<span class="area-pick-pill">${escapeHtml(name)}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function FitToAreas({ areas }: { areas: PickableArea[] }) {
  const map = useMap();
  useEffect(() => {
    if (areas.length === 0) return;
    const bounds = L.latLngBounds(
      areas.map((a) => [a.lat, a.lng] as [number, number]),
    );
    // maxZoom stops a city with one lone area from zooming to street level.
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 });
  }, [areas, map]);
  return null;
}

function ResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export default function AreaPickerMap({
  areas,
  onPick,
  disabled = false,
}: {
  areas: PickableArea[];
  onPick: (name: string) => void;
  disabled?: boolean;
}) {
  const center = useMemo<[number, number]>(() => {
    if (areas.length === 0) return [0, 0];
    return [areas[0].lat, areas[0].lng];
  }, [areas]);

  return (
    <MapContainer
      center={center}
      zoom={11}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ResizeWatcher />
      <FitToAreas areas={areas} />
      {areas.map((area) => (
        <Marker
          key={area.name}
          position={[area.lat, area.lng]}
          icon={areaIcon(area.name)}
          eventHandlers={{
            click: () => {
              if (!disabled) onPick(area.name);
            },
          }}
        />
      ))}
    </MapContainer>
  );
}
