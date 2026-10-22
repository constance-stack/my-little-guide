import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getWalkingMinutes } from "@/lib/routing";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const day = await prisma.tripDay.findUnique({
    where: { id },
    include: { stops: { orderBy: { sortOrder: "asc" }, include: { place: true } } },
  });
  if (!day || day.userId !== session.user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const legs = [];
  for (let i = 0; i < day.stops.length - 1; i++) {
    const from = day.stops[i].place;
    const to = day.stops[i + 1].place;
    const minutes = await getWalkingMinutes(
      { lat: Number(from.lat), lng: Number(from.lng) },
      { lat: Number(to.lat), lng: Number(to.lng) }
    );
    legs.push({ fromStopId: day.stops[i].id, toStopId: day.stops[i + 1].id, minutes });
  }

  return NextResponse.json({ legs });
}
