import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { entitledDestinationIds } from "@/lib/entitlements";
import { computeCartLines, sumCents } from "@/lib/pricing";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connectez-vous avant de payer." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const destinationIds: string[] = Array.isArray(body?.destinationIds) ? body.destinationIds : [];

  const owned = await entitledDestinationIds(session.user.id);

  // Server-computed line items — the client's cart is only a selection of
  // destination ids, never a source of prices. The kit is never one of
  // these lines (see computeCartLines) — it's granted for free by the
  // webhook alongside any destination purchase.
  const lines = await computeCartLines(destinationIds, owned);
  if (lines.length === 0) {
    return NextResponse.json({ error: "Panier vide ou déjà possédé." }, { status: 400 });
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  let checkoutSession;
  try {
    const stripe = getStripe();
    checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: session.user.email ?? undefined,
      line_items: lines.map((line) => ({
        price_data: {
          currency: "eur",
          unit_amount: line.amountCents,
          product_data: { name: line.label },
        },
        quantity: 1,
      })),
      metadata: {
        userId: session.user.id,
        destinationIds: lines
          .filter((l) => l.destinationId)
          .map((l) => l.destinationId)
          .join(","),
      },
      success_url: `${appUrl}/checkout/retour?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/panier`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur Stripe inconnue.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!checkoutSession.url) {
    return NextResponse.json({ error: "Impossible de créer la session de paiement." }, { status: 502 });
  }

  return NextResponse.json({ url: checkoutSession.url, totalCents: sumCents(lines) });
}
