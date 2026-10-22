import Stripe from "stripe";

// No explicit apiVersion: the installed SDK pins its own default
// (checked directly in node_modules — this package version ships
// '2026-09-30.endive') and stays correct across SDK upgrades without a
// stale hardcoded guess here.
//
// The client is created lazily and nullable rather than at module load:
// `new Stripe("")` throws synchronously during import when the key is
// missing, which would crash every route that imports this file (even ones
// that don't need Stripe yet) instead of producing a catchable, per-request
// error. Callers use getStripe(), which throws a plain Error inside the
// request handler's own try/catch instead.
let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY n'est pas configuré. Créez un compte Stripe (mode test) et renseignez la clé dans .env."
    );
  }
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}
