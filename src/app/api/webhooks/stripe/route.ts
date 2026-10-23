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
    }

    // The kit essentiel is free and automatic with any destination
    // purchase — not a Stripe line item, granted directly here rather
    // than inferred from one.
    if (destinationIds.length > 0) {
      const alreadyHasKit = await tx.entitlement.findFirst({ where: { userId, destinationId: null } });
      if (!alreadyHasKit) {
        await tx.entitlement.create({ data: { userId, destinationId: null, orderId: order.id } });
      }
    }

    // No EmailJob here — the buyer downloads their PDF from /compte on
    // demand (see /api/orders/[orderId]/pdf) rather than via an emailed
    // link, so there's no email provider to configure for the pilot. The
    // PdfJob row still exists: /api/orders/[orderId]/pdf uses its
    // QUEUED/RUNNING/DONE/FAILED status to generate (once) on first
    // download instead of relying on a separate polling worker.
    await tx.pdfJob.create({ data: { orderId: order.id, status: "QUEUED" } });
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
