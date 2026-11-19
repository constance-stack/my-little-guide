import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await params;
  const pin = await prisma.personalPin.findUnique({ where: { id } });
  if (!pin || pin.userId !== session.user.id) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }

  await prisma.personalPin.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// Sets or clears the visitor-chosen category on an existing pin.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await params;
  const pin = await prisma.personalPin.findUnique({ where: { id } });
  if (!pin || pin.userId !== session.user.id) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const categoryId = body?.categoryId;
  if (categoryId !== null && typeof categoryId !== "string") {
    return NextResponse.json({ error: "categoryId invalide." }, { status: 400 });
  }

  let category = null;
  if (categoryId !== null) {
    category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json({ error: "Catégorie introuvable." }, { status: 404 });
    }
  }

  await prisma.personalPin.update({ where: { id }, data: { categoryId } });
  return NextResponse.json({
    categoryId,
    categoryIcon: category?.icon ?? null,
    categoryColor: category?.color ?? null,
  });
}
