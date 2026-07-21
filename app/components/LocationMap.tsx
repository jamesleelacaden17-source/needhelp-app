"use client";

import { useEffect, useRef } from "react";
import type L from "leaflet";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  color?: "teal" | "blue" | "amber";
};

const COLORS: Record<string, string> = {
  teal: "#0d9488",
  blue: "#2563eb",
  amber: "#d97706",
};

function makeDivIcon(leaflet: typeof L, color: string) {
  return leaflet.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:${COLORS[color] ?? COLORS.teal};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function LocationMap({
  center,
  zoom = 14,
  markers,
  onPick,
  height = "220px",
  className = "",
}: {
  center: [number, number];
  zoom?: number;
  markers: MapMarker[];
  onPick?: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    let cancelled = false;
    let map: L.Map | null = null;

    import("leaflet").then((leaflet) => {
      if (cancelled || !containerRef.current) return;
      const L = leaflet.default;

      map = L.map(containerRef.current, {
        center,
        zoom,
        scrollWheelZoom: false,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);

      if (onPickRef.current) {
        map.on("click", (e: L.LeafletMouseEvent) => {
          onPickRef.current?.(e.latlng.lat, e.latlng.lng);
        });
      }
    });

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;
    import("leaflet").then((leaflet) => {
      const L = leaflet.default;
      const group = layerGroupRef.current;
      if (!group) return;
      group.clearLayers();
      markers.forEach((m) => {
        const marker = L.marker([m.lat, m.lng], { icon: makeDivIcon(L, m.color ?? "teal") });
        if (m.label) marker.bindTooltip(m.label, { permanent: false, direction: "top" });
        marker.addTo(group);
      });
    });
  }, [markers]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className={`z-0 overflow-hidden rounded-lg border border-zinc-200 ${className}`}
    />
  );
}
