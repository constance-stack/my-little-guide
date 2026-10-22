import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const days = await prisma.tripDay.findMany({
    where: { userId: session.user.id },
    include: {
      stops: {
        orderBy: { sortOrder: "asc" },
        include: { place: { select: { id: true, slug: true, name: true, lat: true, lng: true } } },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ days });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const label = typeof body?.label === "string" && body.label.trim() ? body.label.trim() : "Nouveau jour";

  const count = await prisma.tripDay.count({ where: { userId: session.user.id } });
  const day = await prisma.tripDay.create({
    data: { userId: session.user.id, label, sortOrder: count },
  });

  return NextResponse.json({ day });
}
