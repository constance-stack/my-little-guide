import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { entitledDestinationIds } from "@/lib/entitlements";

/**
 * Returns only places in destinations the requester is entitled to, and
 * only published ones — filtered server-side, never "all places" handed
 * to the client for it to filter.
 */
export async function GET(request: Request) {
  const session = await auth();
  const ownedDestinationIds = await entitledDestinationIds(session?.user?.id, session?.user?.role);

  if (ownedDestinationIds.length === 0) {
    return NextResponse.json({ type: "FeatureCollection", features: [] });
  }

  const { searchParams } = new URL(request.url);
  const destinationSlug = searchParams.get("destination");

  const destinationFilter = destinationSlug
    ? { slug: destinationSlug, id: { in: ownedDestinationIds } }
    : { id: { in: ownedDestinationIds } };

  const places = await prisma.place.findMany({
    where: {
      status: "PUBLISHED",
      destination: destinationFilter,
    },
    include: {
      zone: true,
      categories: { include: { category: true } },
      photos: { include: { photo: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json({
    type: "FeatureCollection",
    features: places.map((place) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [Number(place.lng), Number(place.lat)] },
      properties: {
        id: place.id,
        slug: place.slug,
        name: place.name,
        zone: place.zone?.name ?? null,
        categories: place.categories.map((c) => ({ slug: c.category.slug, name: c.category.name, icon: c.category.icon, color: c.category.color })),
        thumbnail: place.photos[0]?.photo.storageKey ?? null,
      },
    })),
  });
}
