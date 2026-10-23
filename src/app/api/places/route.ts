import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { entitledDestinationIds } from "@/lib/entitlements";
import { DEMO_BANGKOK_SLUGS } from "@/lib/demo";

/**
 * Returns only places in destinations the requester is entitled to, and
 * only published ones — filtered server-side, never "all places" handed
 * to the client for it to filter.
 *
 * `?demo=1` is the one deliberate exception: it ignores auth/entitlement
 * entirely and returns only the fixed free-preview place list, for the
 * public map demo anyone can open without an account or purchase.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const destinationSlug = searchParams.get("destination");
  const isDemo = searchParams.get("demo") === "1";

  if (isDemo) {
    const places = await prisma.place.findMany({
      where: { status: "PUBLISHED", slug: { in: [...DEMO_BANGKOK_SLUGS] } },
      include: {
        zone: true,
        categories: { include: { category: true } },
        photos: { include: { photo: true }, orderBy: { sortOrder: "asc" } },
      },
    });
    return NextResponse.json(toFeatureCollection(places));
  }

  const session = await auth();
  const ownedDestinationIds = await entitledDestinationIds(session?.user?.id, session?.user?.role);

  if (ownedDestinationIds.length === 0) {
    return NextResponse.json({ type: "FeatureCollection", features: [] });
  }

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

  return NextResponse.json(toFeatureCollection(places));
}

type PlaceWithRelations = Awaited<ReturnType<typeof prisma.place.findMany<{
  include: {
    zone: true;
    categories: { include: { category: true } };
    photos: { include: { photo: true } };
  };
}>>>[number];

function toFeatureCollection(places: PlaceWithRelations[]) {
  return {
    type: "FeatureCollection" as const,
    features: places.map((place) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [Number(place.lng), Number(place.lat)] },
      properties: {
        id: place.id,
        slug: place.slug,
        name: place.name,
        zone: place.zone?.name ?? null,
        categories: place.categories.map((c) => ({ slug: c.category.slug, name: c.category.name, icon: c.category.icon, color: c.category.color })),
        thumbnail: place.photos[0]?.photo.storageKey ?? null,
      },
    })),
  };
}
