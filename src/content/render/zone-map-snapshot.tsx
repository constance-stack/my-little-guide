"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyle } from "@/components/map/map-style";

/**
 * A small, non-interactive satellite snapshot of one zone's places,
 * printed just before that zone's "Où dormir" section in the country
 * PDF — reuses the exact same MapTiler style and real place coordinates
 * as the live interactive map (src/components/map/interactive-map.tsx)
 * rather than a hand-illustrated layout per destination (see
 * content/render/zones-map.tsx, which only has a handful of
 * destinations hand-drawn): this works for every destination
 * automatically, present and future, with zero per-city design work.
 *
 * MapTiler's paid Static Images API isn't enabled on the account's
 * current key (confirmed via a direct request — it 403s "Invalid key"
 * while the regular Maps/tiles API the live site already uses works
 * fine), so this renders a REAL MapLibre WebGL map instead, the same
 * way the live site does, and lets Playwright's headless Chromium
 * (already the whole PDF pipeline) print it like any other page
 * content — no separate paid product, no screenshot step.
 *
 * Sets data-map-ready="true" on its container once MapLibre's "idle"
 * event fires (all sources loaded, no pending tile requests) — see
 * renderCountryPdf() in lib/pdf.ts, which waits for every one of these
 * on the page before calling page.pdf(), so a zone's map is never
 * printed mid-load as a blank tile.
 */
export function ZoneMapSnapshot({
  places,
  accentColor,
}: {
  places: { lat: number; lng: number }[];
  accentColor: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || places.length === 0) return;

    maplibregl.config.WORKER_URL = "/maplibre-gl-worker.mjs";

    const lats = places.map((p) => p.lat);
    const lngs = places.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    // A single place (or several at virtually the same spot, e.g. an
    // airport zone) gives fitBounds a zero-size box, which MapLibre
    // handles by falling back to a near-world zoom showing nothing
    // useful — jump to a fixed, sensible zoom centered on the point(s)
    // instead whenever the spread is too small for fitBounds to size a
    // sane viewport from.
    const isPoint = maxLat - minLat < 0.0005 && maxLng - minLng < 0.0005;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle(),
      interactive: false,
      attributionControl: false,
      ...(isPoint
        ? { center: [lngs[0], lats[0]] as [number, number], zoom: 14 }
        : {
            bounds: [
              [minLng, minLat],
              [maxLng, maxLat],
            ] as [[number, number], [number, number]],
            fitBoundsOptions: { padding: 50, animate: false },
          }),
    });

    map.on("load", () => {
      map.addSource("zone-places", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: places.map((p) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [p.lng, p.lat] },
            properties: {},
          })),
        },
      });
      map.addLayer({
        id: "zone-places-dots",
        type: "circle",
        source: "zone-places",
        paint: {
          "circle-radius": 7,
          "circle-color": accentColor,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#faf8f3",
        },
      });
    });

    map.once("idle", () => {
      containerRef.current?.setAttribute("data-map-ready", "true");
    });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      data-map-snapshot
      data-map-ready="false"
      className="h-[260px] w-full overflow-hidden rounded-lg"
    />
  );
}
