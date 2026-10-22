// Success page only — it deliberately does NOT grant any entitlement.
// Access is activated exclusively by the Stripe webhook's verified
// checkout.session.completed event (see /api/webhooks/stripe), never by a
// client hitting this return URL, which anyone could do without paying.
export default function CheckoutRetourPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="mb-4 font-serif text-2xl text-sage-dark">Merci pour votre commande</h1>
      <p className="text-sm text-foreground/70">
        Votre paiement est en cours de confirmation. Vous recevrez un e-mail dès que votre guide sera prêt,
        avec un lien vers votre espace personnel et votre PDF à télécharger.
      </p>
    </main>
  );
}
