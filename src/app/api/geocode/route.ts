import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Thin server-side proxy to MapTiler's geocoding API, for turning an
 * address a visitor types into coordinates for a personal pin — reuses
 * the same MapTiler key already configured for the map tiles themselves
 * (NEXT_PUBLIC_MAPTILER_KEY), so no new service or cost. Server-side
 * rather than called directly from the client so the key never needs to
 * be duplicated into client code and so we can require a session the
 * same way every other write-adjacent route does.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connectez-vous pour rechercher une adresse." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (!key) {
    return NextResponse.json({ error: "Recherche d'adresse non configurée." }, { status: 503 });
  }

  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${key}&limit=5`;
  let data: { features?: { place_name?: string; text?: string; center?: [number, number] }[] };
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MapTiler returned ${res.status}`);
    data = await res.json();
  } catch {
    return NextResponse.json({ error: "Recherche d'adresse indisponible pour le moment." }, { status: 502 });
  }

  const results = (data.features ?? [])
    .filter((f) => Array.isArray(f.center) && f.center.length === 2)
    .map((f) => ({
      label: f.place_name ?? f.text ?? q,
      lng: f.center![0],
      lat: f.center![1],
    }));

  return NextResponse.json({ results });
}
