"use client";

import { useEffect, useRef } from "react";
// maplibre-gl ships no default export (v6) — only named exports.
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyle } from "./map-style";
import { categoryIconEmoji } from "./category-icons";

// Renders one emoji to a small raster image via a 2D canvas — canvas text
// uses the browser's normal (color) font rendering, unlike MapLibre's own
// monochrome SDF glyphs, so this is what actually makes the emoji show up
// as a map icon. Registered once per distinct emoji via addImage(), keyed
// by the emoji string itself.
function emojiToImageData(emoji: string, size = 48): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${Math.round(size * 0.75)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2 + 2);
  return ctx.getImageData(0, 0, size, size);
}

export type PlaceFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  {
    id: string;
    slug: string;
    name: string;
    zone: string | null;
    categories: { slug: string; name: string; icon: string; color: string }[];
    thumbnail: string | null;
  }
>;

export type PersonalPinData = { id: string; label: string; lat: number; lng: number };

const PERSONAL_PIN_EMOJI = "📍";

export function InteractiveMap({
  data,
  selectedPlaceId,
  onSelectPlace,
  centerOn,
  personalPins = [],
  placingPin = false,
  onMapClickForPin,
  onSelectPersonalPin,
  clusterEnabled = true,
}: {
  data: PlaceFeatureCollection;
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
  centerOn: [number, number] | null;
  personalPins?: PersonalPinData[];
  placingPin?: boolean;
  onMapClickForPin?: (lng: number, lat: number) => void;
  onSelectPersonalPin?: (id: string) => void;
  // Off for the free map demo: with only ~10 fixed places scattered
  // across a whole city, clustering mostly hides them behind a couple of
  // flat green count bubbles (clusters never show category color/icon,
  // by design — they mix categories) instead of showing off the colored,
  // iconed markers the demo exists to show. Read once at mount, since the
  // GeoJSON source's cluster option can't change after creation.
  clusterEnabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const clusterEnabledRef = useRef(clusterEnabled);
  // Latest-value refs for callbacks/flags read from inside MapLibre event
  // handlers registered once in the map-creation effect below — kept in
  // sync after every render (not during render, which React's hooks lint
  // rule forbids) rather than re-registering the handlers on every change.
  const onSelectPlaceRef = useRef(onSelectPlace);
  const onSelectPersonalPinRef = useRef(onSelectPersonalPin);
  const placingPinRef = useRef(placingPin);
  const onMapClickForPinRef = useRef(onMapClickForPin);
  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace;
    onSelectPersonalPinRef.current = onSelectPersonalPin;
    placingPinRef.current = placingPin;
    onMapClickForPinRef.current = onMapClickForPin;
  });

  // Map instance: created once.
  useEffect(() => {
    if (!containerRef.current) return;

    // MapLibre computes its default worker URL from import.meta.url, which
    // points at a bundler-internal chunk URL once Turbopack processes this
    // module — not a URL that actually serves the worker script — so the
    // worker silently fails to load. Pointing it at a copy of the worker
    // bundle served from /public (kept in sync by the postinstall script)
    // sidesteps that bundler/library mismatch entirely.
    maplibregl.config.WORKER_URL = "/maplibre-gl-worker.mjs";

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle(),
      center: [100.5018, 13.7563], // Bangkok
      zoom: 11,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      map.addSource("places", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: clusterEnabledRef.current,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "places",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#4a7c59",
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 25, 26],
          "circle-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "places",
        filter: ["has", "point_count"],
        layout: { "text-field": "{point_count_abbreviated}", "text-size": 12 },
        paint: { "text-color": "#faf8f3" },
      });

      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "places",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#faf8f3",
        },
      });

      // One small category glyph per marker, on top of the colored dot.
      // MapLibre's text-field renders glyphs from the style's own
      // single-color SDF font, which has no emoji coverage — an emoji
      // character in text-field silently renders as nothing. Icons are
      // instead pre-rendered to raster images via emojiToImageData() (see
      // below) and registered with addImage(), then referenced here as
      // icon-image, which is a normal raster icon and renders emoji fine.
      map.addLayer({
        id: "unclustered-point-icon",
        type: "symbol",
        source: "places",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": ["get", "icon"],
          "icon-size": 0.5,
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = features[0]?.properties?.cluster_id;
        const source = map.getSource("places") as maplibregl.GeoJSONSource;
        if (clusterId === undefined) return;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          const geometry = features[0].geometry as GeoJSON.Point;
          map.easeTo({ center: geometry.coordinates as [number, number], zoom });
        });
      });

      const selectFeatureAt = (e: maplibregl.MapLayerMouseEvent) => {
        const feature = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (!feature) return;
        onSelectPlaceRef.current(feature.properties.id as string);
      };
      map.on("click", "unclustered-point", selectFeatureAt);
      map.on("click", "unclustered-point-icon", selectFeatureAt);

      for (const layer of ["unclustered-point", "unclustered-point-icon"]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      if (!map.hasImage(PERSONAL_PIN_EMOJI)) {
        map.addImage(PERSONAL_PIN_EMOJI, emojiToImageData(PERSONAL_PIN_EMOJI));
      }

      // Personal pins: a visitor's own points (hotel, meeting spot…),
      // visually distinct from the editorial place markers — dark,
      // unclustered, always on top.
      map.addSource("personal-pins", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "personal-pin-point",
        type: "circle",
        source: "personal-pins",
        paint: {
          "circle-color": "#2b2b2b",
          "circle-radius": 9,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#faf8f3",
        },
      });
      map.addLayer({
        id: "personal-pin-icon",
        type: "symbol",
        source: "personal-pins",
        layout: { "icon-image": PERSONAL_PIN_EMOJI, "icon-size": 0.5, "icon-allow-overlap": true, "icon-ignore-placement": true },
      });
      map.on("click", "personal-pin-point", (e) => {
        const feature = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (feature) onSelectPersonalPinRef.current?.(feature.properties.id as string);
      });
      map.on("click", "personal-pin-icon", (e) => {
        const feature = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (feature) onSelectPersonalPinRef.current?.(feature.properties.id as string);
      });
      for (const layer of ["personal-pin-point", "personal-pin-icon"]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = placingPinRef.current ? "crosshair" : "";
        });
      }

      // "Add a personal pin" mode: the next plain map click (not on an
      // existing marker) drops a pin there instead of doing nothing.
      map.on("click", (e) => {
        if (!placingPinRef.current) return;
        const hits = map.queryRenderedFeatures(e.point, {
          layers: ["unclustered-point", "unclustered-point-icon", "clusters", "personal-pin-point", "personal-pin-icon"],
        });
        if (hits.length > 0) return;
        onMapClickForPinRef.current?.(e.lngLat.lng, e.lngLat.lat);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Data updates: push new GeoJSON + a derived "color" property (first
  // category's color) into the already-created source.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => {
      const source = map.getSource("places") as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      // Register a map image for every distinct emoji used by this
      // dataset before setting the data that references it — addImage()
      // is idempotent to call again, but hasImage() avoids redrawing one
      // that's already registered.
      const emojis = new Set(data.features.map((f) => categoryIconEmoji(f.properties.categories[0]?.icon ?? "")));
      for (const emoji of emojis) {
        if (!map.hasImage(emoji)) {
          map.addImage(emoji, emojiToImageData(emoji));
        }
      }

      const withColor: PlaceFeatureCollection = {
        ...data,
        features: data.features.map((f) => ({
          ...f,
          properties: {
            ...f.properties,
            color: f.properties.categories[0]?.color ?? "#4a7c59",
            icon: categoryIconEmoji(f.properties.categories[0]?.icon ?? ""),
          },
        })),
      };
      source.setData(withColor as unknown as GeoJSON.FeatureCollection);
    };
    if (map.isStyleLoaded()) update();
    else map.once("load", update);
  }, [data]);

  // Personal pin data updates.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => {
      const source = map.getSource("personal-pins") as maplibregl.GeoJSONSource | undefined;
      if (!source) return;
      source.setData({
        type: "FeatureCollection",
        features: personalPins.map((p) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          properties: { id: p.id, label: p.label },
        })),
      });
    };
    if (map.isStyleLoaded()) update();
    else map.once("load", update);
  }, [personalPins]);

  // Placing-pin mode: a crosshair cursor over the whole map as a hint,
  // overridden back to pointer while actually hovering a marker (handled
  // by the per-layer mouseenter/mouseleave handlers above).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    canvas.style.cursor = placingPin ? "crosshair" : "";
  }, [placingPin]);

  // Center on a specific point (deep-link / list click) without changing
  // which place is selected.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !centerOn) return;
    const run = () => map.easeTo({ center: centerOn, zoom: Math.max(map.getZoom(), 15) });
    if (map.isStyleLoaded()) run();
    else map.once("load", run);
  }, [centerOn]);

  return <div ref={containerRef} className="h-full w-full" data-selected={selectedPlaceId ?? undefined} />;
}
