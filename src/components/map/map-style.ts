import type { StyleSpecification } from "maplibre-gl";

/**
 * Falls back to a flat ivory background with no external tile requests
 * when no MapTiler key is configured, so markers, clustering, filters and
 * deep-linking are all fully testable without any paid/signed-up service.
 * Swaps to real MapTiler vector tiles automatically once
 * NEXT_PUBLIC_MAPTILER_KEY is set — no other code change needed.
 *
 * Before going to production, the MapTiler (or Stadia Maps) free-tier key
 * used here must be replaced with a paid plan: raw OSM tiles and most free
 * tiers forbid commercial high-volume use.
 */
export function getMapStyle(): StyleSpecification | string {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (key) {
    // "hybrid" = satellite imagery with street/place labels on top, as
    // requested — plain "satellite" has no labels at all, which makes
    // clicking a specific place much harder.
    return `https://api.maptiler.com/maps/hybrid/style.json?key=${key}`;
  }

  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#f3ede0" },
      },
    ],
  };
}
