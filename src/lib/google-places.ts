/**
 * Google Places API (New) fallback for places with no verified Wikimedia
 * Commons photo — mainly restaurants/bars/cafés, which are almost never on
 * Commons. Only `googlePlaceId` is ever persisted (Place.googlePlaceId):
 * Google's Places terms explicitly allow caching a place_id indefinitely
 * but forbid caching a photo "name"/reference or the image bytes
 * themselves (it can expire, and re-using a cached one is against the
 * terms) — see https://developers.google.com/maps/documentation/places/web-service/place-photos.
 * So every actual photo fetch below is live, never stored on our disk.
 *
 * Entirely optional: every function here is a no-op (returns null) when
 * GOOGLE_PLACES_API_KEY isn't set, so unsetting that one env var turns
 * this fallback off completely with no other change needed.
 */

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export type GooglePlacePhoto = {
  bytes: Buffer;
  contentType: string;
  attributionText: string | null;
};

/**
 * One-time lookup (run from the admin batch script, not per page view):
 * resolves our own place name + coordinates to a Google place_id via Text
 * Search (New), restricted to the IDs-only field mask so it bills at the
 * cheapest tier rather than pulling in paid Pro/Enterprise fields we don't
 * need just to get an ID.
 */
export async function findGooglePlaceId(query: string, lat: number, lng: number): Promise<string | null> {
  if (!API_KEY) return null;

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName",
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: { center: { latitude: lat, longitude: lng }, radius: 500 },
      },
      maxResultCount: 1,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { places?: { id?: string }[] };
  return data.places?.[0]?.id ?? null;
}

/**
 * Live fetch, called on every page view that needs it (never cached) —
 * Place Details (New) with field mask `photos` only (the cheap "Place
 * Details Photos" SKU, not the pricier Pro/Enterprise tiers triggered by
 * requesting other fields), then the actual image bytes from the photo
 * "name" it returns. Proxied server-side so the API key never reaches the
 * browser.
 */
export async function getLiveGooglePlacePhoto(googlePlaceId: string): Promise<GooglePlacePhoto | null> {
  if (!API_KEY) return null;

  const detailsRes = await fetch(`https://places.googleapis.com/v1/places/${googlePlaceId}`, {
    headers: { "X-Goog-Api-Key": API_KEY, "X-Goog-FieldMask": "photos" },
  });
  if (!detailsRes.ok) return null;
  const details = (await detailsRes.json()) as {
    photos?: { name: string; authorAttributions?: { displayName?: string }[] }[];
  };
  const photo = details.photos?.[0];
  if (!photo?.name) return null;

  const photoRes = await fetch(
    `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=1200&key=${API_KEY}`
  );
  if (!photoRes.ok) return null;

  const contentType = photoRes.headers.get("content-type") ?? "image/jpeg";
  const bytes = Buffer.from(await photoRes.arrayBuffer());
  const author = photo.authorAttributions?.[0]?.displayName;

  return {
    bytes,
    contentType,
    attributionText: author ? `Photo : ${author}, via Google` : "Photo via Google",
  };
}
