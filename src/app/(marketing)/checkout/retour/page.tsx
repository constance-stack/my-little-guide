import Link from "next/link";

// Success page only — it deliberately does NOT grant any entitlement.
// Access is activated exclusively by the Stripe webhook's verified
// checkout.session.completed event (see /api/webhooks/stripe), never by a
// client hitting this return URL, which anyone could do without paying.
export default function CheckoutRetourPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="mb-4 font-serif text-2xl text-sage-dark">Merci pour votre commande</h1>
      <p className="mb-6 text-sm text-foreground/70">
        Votre paiement est en cours de confirmation — ça ne prend que quelques secondes. Rendez-vous dans votre
        espace personnel pour accéder à votre guide et télécharger votre PDF.
      </p>
      <Link href="/compte" className="inline-block rounded bg-sage-dark px-5 py-2.5 text-sm text-ivory hover:opacity-90">
        Accéder à mon compte
      </Link>
    </main>
  );
}
