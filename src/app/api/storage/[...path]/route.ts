import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { get } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

// NOTE: photos only require being signed in for now — per-place entitlement
// checks on photos land once photos are served from gated place content
// rather than only the admin dashboard. PDFs under pdfs/ are stricter: a
// generated order PDF is personal (buyer's name on the cover), so this
// checks the requester actually owns that order, not just that they're
// signed in — otherwise any logged-in user could guess another customer's
// orderId and download their guide.
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { path } = await params;
  const key = path.join("/");
  const extension = key.split(".").pop()?.toLowerCase() ?? "";

  if (key.startsWith("pdfs/")) {
    const orderId = key.slice("pdfs/".length).replace(/\.pdf$/, "");
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    const isOwner = order?.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!order || (!isOwner && !isAdmin)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
  }

  try {
    const data = await get(key);
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream" },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }
}
