"use client";

import { useEffect, useRef, useState } from "react";
// maplibre-gl ships no default export (v6) — only named exports.
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyle } from "@/components/map/map-style";

/**
 * A single-marker map for setting a place's GPS coordinates — click the
 * map or drag the pin, the two hidden inputs (submitted by the plain
 * <form action={...}> this sits in, same as every other admin field)
 * update to match. Standalone rather than reusing InteractiveMap, which
 * is built around many place markers, clustering and personal pins —
 * none of which apply to picking one point.
 */
export function GpsPicker({
  latName,
  lngName,
  initialLat,
  initialLng,
}: {
  latName: string;
  lngName: string;
  initialLat: number;
  initialLng: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);

  useEffect(() => {
    if (!containerRef.current) return;
    maplibregl.config.WORKER_URL = "/maplibre-gl-worker.mjs";

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle(),
      center: [initialLng, initialLat],
      zoom: 14,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const marker = new maplibregl.Marker({ draggable: true, color: "#a8422c" })
      .setLngLat([initialLng, initialLat])
      .addTo(map);

    const sync = () => {
      const pos = marker.getLngLat();
      setLat(Number(pos.lat.toFixed(6)));
      setLng(Number(pos.lng.toFixed(6)));
    };
    marker.on("dragend", sync);
    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      sync();
    });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div ref={containerRef} className="mb-2 h-64 w-full rounded border border-line" />
      <input type="hidden" name={latName} value={lat} />
      <input type="hidden" name={lngName} value={lng} />
      <p className="text-xs text-foreground/50">
        Cliquez sur la carte ou déplacez le repère — {lat.toFixed(6)}, {lng.toFixed(6)}
      </p>
    </div>
  );
}
