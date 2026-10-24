"use client";

import { useEffect, useRef } from "react";
// maplibre-gl ships no default export (v6) — only named exports.
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyle } from "./map-style";
import { drawCategoryIcon, pickRepresentativeCategory } from "./category-icons";

// Renders a flat white category glyph (see drawCategoryIcon) to a small
// raster image via a 2D canvas — MapLibre's own text-field glyphs come
// from the style's single-color SDF font and can't render these shapes,
// so icon-image + addImage() is the only way to put a custom symbol on a
// marker. Registered once per distinct icon via addImage().
function categoryIconImageData(icon: string, size = 48): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  drawCategoryIcon(ctx, icon, size);
  return ctx.getImageData(0, 0, size, size);
}

// The personal-pin marker (📍) is a single fixed glyph, not one of the
// category icons above — real emoji rendering is fine here since there's
// no color-contrast or "too many stars" concern with just one marker type.
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
  fitBoundsData,
  selectedPlaceId,
  onSelectPlace,
  centerOn,
  personalPins = [],
  onSelectPersonalPin,
  clusterEnabled = true,
}: {
  data: PlaceFeatureCollection;
  // The destination's full, unfiltered place set — used only to fit the
  // camera when the destination itself changes (not on every category/
  // search filter, which only touches `data`). A new object reference
  // here means "a different destination's places just loaded".
  fitBoundsData?: PlaceFeatureCollection;
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
  centerOn: [number, number] | null;
  personalPins?: PersonalPinData[];
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
  // Latest-value refs for callbacks read from inside MapLibre event
  // handlers registered once in the map-creation effect below — kept in
  // sync after every render (not during render, which React's hooks lint
  // rule forbids) rather than re-registering the handlers on every change.
  const onSelectPlaceRef = useRef(onSelectPlace);
  const onSelectPersonalPinRef = useRef(onSelectPersonalPin);
  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace;
    onSelectPersonalPinRef.current = onSelectPersonalPin;
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
          "circle-color": "#a8573f",
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
          map.getCanvas().style.cursor = "";
        });
      }
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

      // The representative category is the most specific one tagged on a
      // place, not just the first — "incontournables" is applied so
      // broadly alongside a more specific category (temple, restaurant…)
      // that defaulting to categories[0] made most of the map gold stars.
      const repCategories = data.features.map((f) => pickRepresentativeCategory(f.properties.categories));

      // Register a map image for every distinct icon used by this dataset
      // before setting the data that references it — addImage() is
      // idempotent to call again, but hasImage() avoids redrawing one
      // that's already registered.
      const icons = new Set(repCategories.map((c) => c?.icon ?? "default"));
      for (const icon of icons) {
        const imageId = `cat-icon-${icon}`;
        if (!map.hasImage(imageId)) {
          map.addImage(imageId, categoryIconImageData(icon));
        }
      }

      const withColor: PlaceFeatureCollection = {
        ...data,
        features: data.features.map((f, i) => ({
          ...f,
          properties: {
            ...f.properties,
            color: repCategories[i]?.color ?? "#a8573f",
            icon: `cat-icon-${repCategories[i]?.icon ?? "default"}`,
          },
        })),
      };
      source.setData(withColor as unknown as GeoJSON.FeatureCollection);
    };
    // Try now (no-ops safely via the `!source` check above if the map's
    // initial "load" hasn't added the source yet) and also catch that
    // genuine first-mount race via "load" — deliberately not gated on
    // isStyleLoaded(), which briefly reports false right after any
    // source.setData() call while a large source reclusters; relying on
    // "load" as the fallback in that window is wrong since it only ever
    // fires once, for the map's initial style load (see the fitBounds
    // effect below for the case where that silently broke a feature).
    update();
    if (!map.getSource("places")) map.once("load", update);
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
    update();
    if (!map.getSource("personal-pins")) map.once("load", update);
  }, [personalPins]);

  // Fit the camera to the destination's places when the destination itself
  // changes (new fitBoundsData reference) — not on every category/search
  // filter, which only ever changes `data`. Falls back to the fixed
  // Bangkok startup view if a destination has just one place or none yet.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitBoundsData || fitBoundsData.features.length === 0) return;
    // Unconditional, unlike the other effects below — fitBounds/easeTo only
    // move the camera, they don't touch sources or layers, so they don't
    // need the style to be loaded first. That matters here specifically:
    // map.once("load", ...) would be the wrong fallback for an update this
    // far into the map's life, since MapLibre's "load" event fires once,
    // for the map's initial style load, and never again — and
    // isStyleLoaded() does briefly report false right after the sibling
    // data-update effect's source.setData() call (large GeoJSON sources
    // re-enter a loading state while they recluster), which is exactly
    // when this effect runs. Falling back to "load" in that window meant
    // the camera move silently never happened past the first destination
    // switch.
    const coords = fitBoundsData.features.map((f) => f.geometry.coordinates as [number, number]);
    if (coords.length === 1) {
      map.easeTo({ center: coords[0], zoom: 12 });
      return;
    }
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const [lng, lat] of coords) {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 60, maxZoom: 14, duration: 0 }
    );
  }, [fitBoundsData]);

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
