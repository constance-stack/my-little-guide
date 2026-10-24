export const metadata = { title: "Conditions générales de vente — My Little Guide" };

export default function CgvPage() {
  return (
    <main className="px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 font-serif text-2xl text-sage-dark">Conditions générales de vente</h1>
        <p className="mb-8 text-sm text-foreground/60">
          Les présentes conditions régissent les ventes réalisées sur le site My Little Guide, édité par Constance
          Caron-Dufour (voir les{" "}
          <a href="/mentions-legales" className="underline hover:text-sage-dark">
            mentions légales
          </a>
          ).
        </p>

        <Section title="1. Objet">
          <p>
            My Little Guide vend des guides de voyage numériques : accès à un guide en ligne organisé par quartiers
            et catégories, à une carte interactive présentant uniquement les lieux du ou des guides achetés, et à un
            PDF personnalisé téléchargeable depuis votre espace client. Un kit essentiel (vocabulaire de base,
            conseils généraux) est inclus gratuitement avec tout achat.
          </p>
        </Section>

        <Section title="2. Prix">
          <p>
            Les prix sont indiqués en euros. Le tarif d&apos;un guide dépend du nombre de lieux qu&apos;il contient et
            est affiché avant ajout au panier et au moment du paiement. En tant que micro-entreprise, TVA non
            applicable, art. 293 B du Code général des impôts (à confirmer/retirer dès l&apos;immatriculation
            définitive si le régime de TVA change). L&apos;éditeur se réserve le droit de modifier ses prix à tout
            moment ; le prix appliqué est celui en vigueur au moment de la commande.
          </p>
        </Section>

        <Section title="3. Commande et paiement">
          <p>
            La commande est finalisée après paiement sécurisé par carte bancaire via Stripe. My Little Guide ne
            stocke jamais vos coordonnées bancaires. Une fois le paiement confirmé, l&apos;accès aux guides achetés
            est accordé automatiquement sur votre compte.
          </p>
        </Section>

        <Section title="4. Accès et livraison">
          <p>
            L&apos;accès au guide en ligne, à la carte interactive et au téléchargement du PDF est disponible
            immédiatement après la confirmation du paiement, depuis votre espace personnel (&laquo;&nbsp;Mes
            guides&nbsp;&raquo;). Aucun envoi postal n&apos;est effectué : il s&apos;agit exclusivement d&apos;un
            contenu numérique. L&apos;accès est accordé pour une durée illimitée, tant que votre compte reste actif.
          </p>
        </Section>

        <Section title="5. Droit de rétractation">
          <p>
            Conformément à l&apos;article L221-28 13° du Code de la consommation, le droit de rétractation de 14
            jours ne s&apos;applique pas aux contenus numériques non fournis sur un support matériel dont
            l&apos;exécution a commencé après votre accord exprès et dont vous avez renoncé à votre droit de
            rétractation. En validant votre commande, qui vous donne un accès immédiat au guide, vous acceptez que
            l&apos;exécution commence sans délai et renoncez à votre droit de rétractation.
          </p>
          <p>
            Si vous rencontrez un problème technique vous empêchant d&apos;accéder à votre guide, contactez-nous
            avant toute chose — voir l&apos;article suivant.
          </p>
        </Section>

        <Section title="6. Problème d'accès et remboursement">
          <p>
            Si, pour une raison technique imputable à notre plateforme, vous n&apos;arrivez pas à accéder à un guide
            que vous avez acheté, contactez-nous à l&apos;adresse indiquée dans les mentions légales. Nous nous
            engageons à résoudre le problème ou, si cela n&apos;est pas possible, à vous rembourser intégralement la
            commande concernée.
          </p>
        </Section>

        <Section title="7. Propriété intellectuelle et usage personnel">
          <p>
            L&apos;achat d&apos;un guide donne un droit d&apos;usage personnel et non transférable. La revente, la
            copie, la redistribution ou la mise à disposition publique du contenu (textes, PDF, exports de carte) est
            interdite sans autorisation écrite préalable de l&apos;éditeur.
          </p>
        </Section>

        <Section title="8. Exactitude du contenu">
          <p>
            Les informations pratiques (horaires, prix, adresses des lieux tiers) sont fournies à titre indicatif et
            peuvent évoluer après la publication du guide. L&apos;éditeur apporte un soin particulier à la fiabilité
            du contenu mais ne peut garantir son exactitude permanente face aux changements opérés par des
            établissements tiers.
          </p>
        </Section>

        <Section title="9. Données personnelles">
          <p>
            Le traitement de vos données personnelles dans le cadre de votre commande est décrit dans notre{" "}
            <a href="/confidentialite" className="underline hover:text-sage-dark">
              politique de confidentialité
            </a>
            .
          </p>
        </Section>

        <Section title="10. Médiation de la consommation">
          <p>
            Conformément à l&apos;article L616-1 du Code de la consommation, en cas de litige non résolu directement
            avec nous, vous pouvez recourir gratuitement à un médiateur de la consommation. Les coordonnées du
            médiateur compétent seront communiquées sur cette page dès l&apos;immatriculation de la micro-entreprise
            finalisée.
          </p>
        </Section>

        <Section title="11. Droit applicable">
          <p>
            Les présentes conditions générales de vente sont soumises au droit français. En cas de litige, et à
            défaut de résolution amiable, les tribunaux français compétents seront saisis.
          </p>
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
