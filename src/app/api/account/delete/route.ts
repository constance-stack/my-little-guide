import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Self-service GDPR deletion request: marks the account rather than
 * hard-deleting immediately. Order/Entitlement history stays (needed for
 * accounting/legal retention and so an already-issued PDF link keeps
 * working for the owner), but the account can no longer sign in and no
 * longer shows up as an active user. A real hard-purge job (erasing
 * personal fields after a retention window) is a separate, deliberately
 * out-of-scope piece for this pilot phase.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { deletedAt: new Date() },
  });

  // The client signs itself out via next-auth/react after this succeeds —
  // signOut() from lib/auth relies on next/navigation's redirect(), which
  // only works inside the Server Component/Action render pipeline, not a
  // plain Route Handler.
  return NextResponse.json({ ok: true });
}
