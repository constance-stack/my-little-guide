import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasAccess } from "@/lib/entitlements";

async function assertOwnDay(userId: string, dayId: string) {
  const day = await prisma.tripDay.findUnique({ where: { id: dayId } });
  return day && day.userId === userId ? day : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const day = await assertOwnDay(session.user.id, id);
  if (!day) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const placeId = body?.placeId;
  if (typeof placeId !== "string") {
    return NextResponse.json({ error: "placeId manquant." }, { status: 400 });
  }

  const place = await prisma.place.findUnique({ where: { id: placeId } });
  if (!place) return NextResponse.json({ error: "Lieu introuvable." }, { status: 404 });

  const allowed = await hasAccess(session.user.id, place.destinationId, session.user.role);
  if (!allowed) return NextResponse.json({ error: "Destination non achetée." }, { status: 403 });

  const count = await prisma.tripStop.count({ where: { tripDayId: id } });
  const stop = await prisma.tripStop.create({ data: { tripDayId: id, placeId, sortOrder: count } });

  return NextResponse.json({ stop });
}

// Reorder: body { stopIds: [...] } in the desired order.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const day = await assertOwnDay(session.user.id, id);
  if (!day) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const stopIds: string[] = Array.isArray(body?.stopIds) ? body.stopIds : [];

  await prisma.$transaction(
    stopIds.map((stopId, index) =>
      prisma.tripStop.update({ where: { id: stopId }, data: { sortOrder: index } })
    )
  );

  return NextResponse.json({ ok: true });
}
