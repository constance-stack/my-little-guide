export const metadata = { title: "Politique de confidentialité — My Little Guide" };

export default function ConfidentialitePage() {
  return (
    <main className="px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 font-serif text-2xl text-sage-dark">Politique de confidentialité</h1>
        <p className="mb-8 text-sm text-foreground/60">
          Cette politique décrit les données personnelles traitées sur My Little Guide, conformément au Règlement
          Général sur la Protection des Données (RGPD).
        </p>

        <Section title="Responsable du traitement">
          <p>
            Constance Caron-Dufour, éditrice du site My Little Guide (voir les{" "}
            <a href="/mentions-legales" className="underline hover:text-sage-dark">
              mentions légales
            </a>{" "}
            pour les coordonnées complètes).
          </p>
        </Section>

        <Section title="Données que nous collectons">
          <ul className="list-disc space-y-1 pl-5">
            <li>Données de compte : adresse e-mail, mot de passe (stocké de façon chiffrée).</li>
            <li>Données de commande : guides achetés, montant, date, facture associée.</li>
            <li>Favoris et itinéraire : lieux enregistrés en favori, étapes de voyage organisées dans votre compte.</li>
            <li>
              Points personnels sur la carte : adresses que vous ajoutez vous-même (hôtel, rendez-vous…), géocodées
              via MapTiler.
            </li>
            <li>Données de paiement : traitées intégralement par Stripe, notre prestataire de paiement — nous ne
              stockons jamais votre numéro de carte bancaire.</li>
          </ul>
        </Section>

        <Section title="Pourquoi nous les utilisons">
          <ul className="list-disc space-y-1 pl-5">
            <li>Créer et gérer votre compte, et vous donner accès aux guides que vous avez achetés.</li>
            <li>Traiter vos commandes et générer votre PDF personnalisé.</li>
            <li>Afficher vos favoris, votre itinéraire et vos points personnels sur la carte interactive.</li>
            <li>Répondre à vos demandes lorsque vous nous contactez.</li>
          </ul>
          <p>
            Ces traitements reposent sur l&apos;exécution du contrat de vente (votre achat) et, pour les points
            personnels et favoris, sur votre consentement à les enregistrer dans votre compte.
          </p>
        </Section>

        <Section title="Avec qui nous les partageons">
          <ul className="list-disc space-y-1 pl-5">
            <li>Stripe, Inc. — traitement des paiements.</li>
            <li>Render Services, Inc. — hébergement du site et des données.</li>
            <li>MapTiler — géocodage des adresses que vous ajoutez sur votre carte personnelle.</li>
          </ul>
          <p>Nous ne vendons ni ne louons vos données personnelles à des tiers à des fins publicitaires.</p>
        </Section>

        <Section title="Cookies">
          <p>
            Le site utilise uniquement des cookies techniques nécessaires au fonctionnement du compte (maintien de
            votre session de connexion). Aucun cookie publicitaire ou de mesure d&apos;audience tiers n&apos;est
            déposé à ce jour.
          </p>
        </Section>

        <Section title="Durée de conservation">
          <p>
            Les données liées à votre compte sont conservées tant que celui-ci est actif. Les données de commande
            (factures) sont conservées pendant la durée requise par les obligations comptables et fiscales
            applicables aux micro-entreprises, puis supprimées ou anonymisées.
          </p>
        </Section>

        <Section title="Vos droits">
          <p>
            Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement,
            d&apos;opposition et de portabilité sur vos données personnelles.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Vous pouvez supprimer votre compte directement depuis votre{" "}
              <a href="/compte" className="underline hover:text-sage-dark">
                espace personnel
              </a>
              . Le compte est désactivé immédiatement ; les données liées à vos commandes sont conservées pour la
              durée légale requise, puis supprimées.
            </li>
            <li>
              Pour toute autre demande concernant vos données, contactez-nous à l&apos;adresse indiquée dans les{" "}
              <a href="/mentions-legales" className="underline hover:text-sage-dark">
                mentions légales
              </a>
              .
            </li>
            <li>
              Vous pouvez également déposer une réclamation auprès de la Commission Nationale de l&apos;Informatique
              et des Libertés (CNIL) — cnil.fr.
            </li>
          </ul>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 font-serif text-lg text-sage-dark">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-foreground/80">{children}</div>
    </section>
  );
}
