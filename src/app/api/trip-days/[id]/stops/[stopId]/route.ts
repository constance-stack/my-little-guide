import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; stopId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id, stopId } = await params;
  const day = await prisma.tripDay.findUnique({ where: { id } });
  if (!day || day.userId !== session.user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await prisma.tripStop.deleteMany({ where: { id: stopId, tripDayId: id } });
  return NextResponse.json({ ok: true });
}
