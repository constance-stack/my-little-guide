import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasAccess } from "@/lib/entitlements";
import { isDemoPlaceSlug } from "@/lib/demo";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();

  const place = await prisma.place.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      destination: true,
      zone: true,
      categories: { include: { category: true } },
      photos: { include: { photo: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!place) {
    return NextResponse.json({ error: "Lieu introuvable." }, { status: 404 });
  }

  const allowed = isDemoPlaceSlug(place.slug) || (await hasAccess(session?.user?.id, place.destinationId, session?.user?.role));
  if (!allowed) {
    return NextResponse.json({ error: "Ce lieu fait partie d'une destination non achetée." }, { status: 403 });
  }

  let isFavorite = false;
  if (session?.user?.id) {
    const favorite = await prisma.favorite.findUnique({
      where: { userId_placeId: { userId: session.user.id, placeId: place.id } },
    });
    isFavorite = favorite !== null;
  }

  return NextResponse.json({
    id: place.id,
    slug: place.slug,
    name: place.name,
    destination: { slug: place.destination.slug, name: place.destination.name },
    zone: place.zone ? { slug: place.zone.slug, name: place.zone.name } : null,
    description: place.description,
    whyVisit: place.whyVisit,
    littleTip: place.littleTip,
    indicativePrice: place.indicativePrice,
    indicativeDuration: place.indicativeDuration,
    officialHours: place.officialHours,
    officialUrl: place.officialUrl,
    lat: Number(place.lat),
    lng: Number(place.lng),
    categories: place.categories.map((c) => ({
      slug: c.category.slug,
      name: c.category.name,
      icon: c.category.icon,
      color: c.category.color,
    })),
    photos: place.photos.map((p) => ({ src: p.photo.storageKey, alt: p.photo.altText })),
    isFavorite,
  });
}
