import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { auth } from "@/lib/auth";
import { entitledDestinationIds } from "@/lib/entitlements";
import { computeCartLines, sumCents } from "@/lib/pricing";
import { getStripe } from "@/lib/stripe";

// "Managed Payments" is a newer Stripe account-level feature (Stripe acts
// as merchant of record: it takes over tax, fraud and dispute handling)
// that some accounts now default to for new Checkout Sessions. Once on,
// Stripe computes tax itself and requires a Stripe tax code on every
// line item's product_data — our ad-hoc price_data line items don't set
// one, which is the exact cause of the "product tax code is missing"
// error. We don't want Stripe-managed tax/compliance for a destination
// guide at this stage, so this opts the session back out explicitly
// rather than registering tax codes for a feature we're not using.
// Not yet in the installed stripe SDK's TS types (brand new API field),
// so it's merged in via an intersection type rather than widening the
// whole params object to `any`.
type SessionCreateParamsWithManagedPayments = Stripe.Checkout.SessionCreateParams & {
  managed_payments?: { enabled: boolean };
};

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
    const params: SessionCreateParamsWithManagedPayments = {
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
      managed_payments: { enabled: false },
      // Stripe's dashboard has a separate "enable tax by default for
      // Checkout Sessions" account setting that can silently turn this on
      // too, with the same tax-code requirement — belt and braces against
      // whichever of the two settings the account actually has on.
      automatic_tax: { enabled: false },
    };
    checkoutSession = await stripe.checkout.sessions.create(params);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur Stripe inconnue.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!checkoutSession.url) {
    return NextResponse.json({ error: "Impossible de créer la session de paiement." }, { status: 502 });
  }

  return NextResponse.json({ url: checkoutSession.url, totalCents: sumCents(lines) });
}
