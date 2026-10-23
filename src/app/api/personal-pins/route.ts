import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasAccess } from "@/lib/entitlements";

// Personal pins are scoped to one destination at a time — ?destination=
// is the destination's slug, mirroring /api/places.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ pins: [] });
  }

  const { searchParams } = new URL(request.url);
  const destinationSlug = searchParams.get("destination");
  if (!destinationSlug) {
    return NextResponse.json({ error: "destination manquante." }, { status: 400 });
  }

  const destination = await prisma.destination.findUnique({ where: { slug: destinationSlug } });
  if (!destination) {
    return NextResponse.json({ pins: [] });
  }

  const pins = await prisma.personalPin.findMany({
    where: { userId: session.user.id, destinationId: destination.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    pins: pins.map((p) => ({ id: p.id, label: p.label, lat: Number(p.lat), lng: Number(p.lng) })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connectez-vous pour ajouter une adresse." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { destinationSlug, label, lat, lng } = body ?? {};
  if (
    typeof destinationSlug !== "string" ||
    typeof label !== "string" ||
    !label.trim() ||
    typeof lat !== "number" ||
    typeof lng !== "number"
  ) {
    return NextResponse.json({ error: "Champs manquants ou invalides." }, { status: 400 });
  }

  const destination = await prisma.destination.findUnique({ where: { slug: destinationSlug } });
  if (!destination) {
    return NextResponse.json({ error: "Destination introuvable." }, { status: 404 });
  }

  // A personal pin is for the visitor's own use on a map they already
  // have access to — same gate as the places on that map.
  const allowed = await hasAccess(session.user.id, destination.id, session.user.role);
  if (!allowed) {
    return NextResponse.json({ error: "Destination non achetée." }, { status: 403 });
  }

  const pin = await prisma.personalPin.create({
    data: { userId: session.user.id, destinationId: destination.id, label: label.trim().slice(0, 80), lat, lng },
  });

  return NextResponse.json({ id: pin.id, label: pin.label, lat: Number(pin.lat), lng: Number(pin.lng) });
}
