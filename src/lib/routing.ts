/**
 * Real travel-time lookup via OpenRouteService — never fabricated. When no
 * key is configured this returns null and callers must simply omit the
 * estimate rather than inventing one (the spec is explicit: no made-up
 * travel times).
 */
export async function getWalkingMinutes(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<number | null> {
  const key = process.env.OPENROUTESERVICE_KEY;
  if (!key) return null;

  try {
    const res = await fetch("https://api.openrouteservice.org/v2/directions/foot-walking", {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: [[from.lng, from.lat], [to.lng, to.lat]] }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const seconds = data?.routes?.[0]?.summary?.duration;
    return typeof seconds === "number" ? Math.round(seconds / 60) : null;
  } catch {
    return null;
  }
}
