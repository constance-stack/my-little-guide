import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { get } from "@/lib/storage";
import { DEMO_BANGKOK_SLUGS } from "@/lib/demo";

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
  const { path } = await params;
  const key = path.join("/");
  const extension = key.split(".").pop()?.toLowerCase() ?? "";

  // Photos of the fixed free-preview places are public, so the no-account
  // map demo and PDF preview can actually display them. Every other photo,
  // and anything else under storage/, stays behind the sign-in check below.
  const isDemoPhoto =
    key.startsWith("photos/") &&
    (await prisma.placePhoto.findFirst({
      where: { photo: { storageKey: `/api/storage/${key}` }, place: { slug: { in: [...DEMO_BANGKOK_SLUGS] } } },
    }));

  if (!isDemoPhoto) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (key.startsWith("pdfs/favoris-")) {
      const pdfUserId = key.slice("pdfs/favoris-".length).replace(/\.pdf$/, "");
      const isOwner = pdfUserId === session.user.id;
      const isAdmin = session.user.role === "ADMIN";
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
      }
    } else if (key.startsWith("pdfs/itineraire-")) {
      const pdfUserId = key.slice("pdfs/itineraire-".length).replace(/\.pdf$/, "");
      const isOwner = pdfUserId === session.user.id;
      const isAdmin = session.user.role === "ADMIN";
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
      }
    } else if (key.startsWith("pdfs/pays-")) {
      // Key shape: pdfs/pays-<userId>-<countryId>.pdf — both id halves are
      // themselves cuids with no separator of their own, so this isn't
      // split apart; ownership is checked against the DB row instead,
      // which is keyed the same way (userId_countryId) and already the
      // source of truth for which (user, country) the file belongs to.
      const rest = key.slice("pdfs/pays-".length).replace(/\.pdf$/, "");
      const job = await prisma.countryPdfJob.findFirst({ where: { storageKey: key } });
      const isOwner = job?.userId === session.user.id;
      const isAdmin = session.user.role === "ADMIN";
      if (!rest || !job || (!isOwner && !isAdmin)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
      }
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
