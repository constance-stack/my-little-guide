import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLiveGooglePlacePhoto } from "@/lib/google-places";

/**
 * Live proxy for a place's Google Places photo fallback — used only when
 * the place has no real Wikimedia Commons photo. Never caches the image;
 * see src/lib/google-places.ts for why. Matches the same "signed in"
 * access level as /api/storage/photos (see that route's own note on why
 * it isn't per-destination-entitlement-gated yet).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const place = await prisma.place.findUnique({ where: { slug }, select: { googlePlaceId: true } });
  if (!place?.googlePlaceId) {
    return NextResponse.json({ error: "Aucune photo disponible" }, { status: 404 });
  }

  const photo = await getLiveGooglePlacePhoto(place.googlePlaceId);
  if (!photo) {
    return NextResponse.json({ error: "Aucune photo disponible" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.contentType,
      // Never cached at the edge/CDN either — the underlying photo
      // reference itself isn't something we're allowed to cache.
      "Cache-Control": "no-store",
      ...(photo.attributionText ? { "X-Photo-Attribution": photo.attributionText } : {}),
    },
  });
}
