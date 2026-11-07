import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { tierKeyForPlaceCount } from "@/lib/pricing";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
  } else if (event.type === "charge.refunded") {
    await handleRefund(event.data.object as Stripe.Charge);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Idempotency: a retried webhook delivery for an already-processed
  // session is a no-op, never a duplicate order.
  const existing = await prisma.order.findUnique({ where: { stripeSessionId: session.id } });
  if (existing) return;

  const userId = session.metadata?.userId;
  if (!userId) return;

  const destinationIds = (session.metadata?.destinationIds ?? "").split(",").filter(Boolean);

  const lineItems = await getStripe().checkout.sessions.listLineItems(session.id, { limit: 100 });
  const items = lineItems.data;

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId,
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
        status: "SUCCEEDED",
        amountCents: session.amount_total ?? 0,
        currency: (session.currency ?? "eur").toUpperCase(),
      },
    });

    // Line items were created in the same order as destinationIds (see
    // computeCartLines() — the kit is never one of them, it's free).
    // Track each destination's country as we go, so every distinct
    // country touched by this order (there can be more than one — a
    // single checkout can mix destinations from several countries) gets
    // its kit granted and its PDF (re)queued below.
    const countryIdsTouched = new Set<string>();

    for (let i = 0; i < destinationIds.length; i++) {
      const destinationId = destinationIds[i];
      const item = items[i];
      const destination = await tx.destination.findUnique({
        where: { id: destinationId },
        include: { priceOverride: true, _count: { select: { places: { where: { status: "PUBLISHED" } } } } },
      });
      const priceKey = destination?.priceOverride?.key ?? tierKeyForPlaceCount(destination?._count.places ?? 0);
      await tx.orderLine.create({
        data: {
          orderId: order.id,
          destinationId,
          priceKey,
          amountCents: item?.amount_total ?? 0,
          label: item?.description ?? destinationId,
        },
      });

      const alreadyHas = await tx.entitlement.findUnique({
        where: { userId_destinationId: { userId, destinationId } },
      });
      if (!alreadyHas) {
        await tx.entitlement.create({ data: { userId, destinationId, orderId: order.id } });
      }

      if (destination) countryIdsTouched.add(destination.countryId);
    }

    // The kit essentiel is free and automatic with any destination
    // purchase — not a Stripe line item, granted directly here rather
    // than inferred from one. Granted per country (never a single global
    // flag): a customer who owns destinations in several countries must
    // see each country's own kit, and a second destination purchased
    // later in an already-owned country must not need to grant it again.
    for (const countryId of countryIdsTouched) {
      const alreadyHasKit = await tx.kitEntitlement.findUnique({
        where: { userId_countryId: { userId, countryId } },
      });
      if (!alreadyHasKit) {
        await tx.kitEntitlement.create({ data: { userId, countryId, orderId: order.id } });
      }
    }

    // No EmailJob here — the buyer downloads their PDF from /compte on
    // demand (see /api/compte/pdf/[countryId]) rather than via an emailed
    // link, so there's no email provider to configure for the pilot.
    //
    // One CountryPdfJob per distinct country in this order, not one PdfJob
    // per order: a customer's PDF for a country combines every
    // destination they own there. If this order adds a destination to a
    // country the customer already owned (from an earlier order), reset
    // that existing job to QUEUED so the next download regenerates it
    // with the new destination included — rather than leaving the old
    // (now incomplete) file in place or creating a second, separate PDF
    // for the same country.
    for (const countryId of countryIdsTouched) {
      const existingJob = await tx.countryPdfJob.findUnique({ where: { userId_countryId: { userId, countryId } } });
      if (existingJob) {
        await tx.countryPdfJob.update({
          where: { id: existingJob.id },
          data: { status: "QUEUED", attempts: 0, error: null },
        });
      } else {
        await tx.countryPdfJob.create({ data: { userId, countryId, status: "QUEUED" } });
      }
    }
  });
}

async function handleRefund(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const order = await prisma.order.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
  if (!order) return;

  await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } }),
    prisma.entitlement.deleteMany({ where: { orderId: order.id } }),
  ]);
}
