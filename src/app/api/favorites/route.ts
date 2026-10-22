import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasAccess } from "@/lib/entitlements";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connectez-vous pour ajouter un favori." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const placeId = body?.placeId;
  if (typeof placeId !== "string") {
    return NextResponse.json({ error: "placeId manquant." }, { status: 400 });
  }

  const place = await prisma.place.findUnique({ where: { id: placeId } });
  if (!place) {
    return NextResponse.json({ error: "Lieu introuvable." }, { status: 404 });
  }

  const allowed = await hasAccess(session.user.id, place.destinationId);
  if (!allowed) {
    return NextResponse.json({ error: "Destination non achetée." }, { status: 403 });
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_placeId: { userId: session.user.id, placeId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { userId_placeId: { userId: session.user.id, placeId } } });
    return NextResponse.json({ isFavorite: false });
  }

  await prisma.favorite.create({ data: { userId: session.user.id, placeId } });
  return NextResponse.json({ isFavorite: true });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ favorites: [] });
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    include: { place: { include: { destination: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    favorites: favorites.map((f) => ({
      placeId: f.placeId,
      slug: f.place.slug,
      name: f.place.name,
      destinationSlug: f.place.destination.slug,
    })),
  });
}
