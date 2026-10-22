import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function assertOwnDay(userId: string, dayId: string) {
  const day = await prisma.tripDay.findUnique({ where: { id: dayId } });
  return day && day.userId === userId ? day : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const day = await assertOwnDay(session.user.id, id);
  if (!day) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const label = typeof body?.label === "string" ? body.label.trim() : undefined;

  const updated = await prisma.tripDay.update({
    where: { id },
    data: { ...(label ? { label } : {}) },
  });

  return NextResponse.json({ day: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const day = await assertOwnDay(session.user.id, id);
  if (!day) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.tripDay.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
