import { prisma } from "@/lib/db";
import { hasAccess } from "@/lib/entitlements";

/**
 * Shared data-loading for anything that renders a place's full content —
 * today the web guide route, later the PDF print route too. Both must see
 * exactly the same data through exactly the same access check, or the PDF
 * and the web guide risk drifting apart.
 */
export async function getPlaceForGuide(
  slug: string,
  userId: string | undefined | null,
  role?: "USER" | "ADMIN" | null
) {
  const place = await prisma.place.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      destination: true,
      zone: true,
      categories: { include: { category: true } },
      photos: { include: { photo: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!place) return null;

  const allowed = await hasAccess(userId, place.destinationId, role);
  if (!allowed) return null;

  return place;
}

export type GuidePlace = NonNullable<Awaited<ReturnType<typeof getPlaceForGuide>>>;

export async function getDestinationForGuide(
  slug: string,
  userId: string | undefined | null,
  role?: "USER" | "ADMIN" | null
) {
  const destination = await prisma.destination.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      zones: {
        include: {
          places: {
            where: { status: "PUBLISHED" },
            include: { categories: { include: { category: true } } },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!destination) return null;

  const allowed = await hasAccess(userId, destination.id, role);
  if (!allowed) return null;

  return destination;
}

export type GuideDestination = NonNullable<Awaited<ReturnType<typeof getDestinationForGuide>>>;

/**
 * The mandatory country-wide "kit essentiel" — no entitlement check here,
 * since every purchase in that country includes it automatically and it's
 * meant to be seen before buying too (via the shop's preview).
 */
export async function getKitSections(countrySlug: string) {
  const country = await prisma.country.findUnique({
    where: { slug: countrySlug },
    include: {
      kitSections: {
        where: { status: "PUBLISHED" },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  return country?.kitSections ?? [];
}
