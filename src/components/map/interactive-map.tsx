"use client";

import { useEffect, useRef } from "react";
// maplibre-gl ships no default export (v6) — only named exports.
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyle } from "./map-style";
import { categoryIconEmoji } from "./category-icons";

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

export function InteractiveMap({
  data,
  selectedPlaceId,
  onSelectPlace,
  centerOn,
}: {
  data: PlaceFeatureCollection;
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
  centerOn: [number, number] | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectPlaceRef = useRef(onSelectPlace);
  onSelectPlaceRef.current = onSelectPlace;

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
        cluster: true,
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

      // One small category glyph per marker, on top of the colored dot —
      // rendered as text (an emoji) so no sprite sheet / addImage() is
      // needed for a simple per-category icon.
      map.addLayer({
        id: "unclustered-point-icon",
        type: "symbol",
        source: "places",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "icon"],
          "text-size": 10,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
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
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Data updates: push new GeoJSON + a derived "color" property (first
  // category's color) into the already-created source.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => {
      const source = map.getSource("places") as maplibregl.GeoJSONSource | undefined;
      if (!source) return;
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
