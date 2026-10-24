export const metadata = { title: "Mentions légales — My Little Guide" };

export default function MentionsLegalesPage() {
  return (
    <main className="px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 font-serif text-2xl text-sage-dark">Mentions légales</h1>

        <Section title="Éditeur du site">
          <p>
            Le site My Little Guide est édité par Constance Caron-Dufour, entrepreneure individuelle (micro-entreprise).
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>SIRET : en cours d&apos;attribution (immatriculation en cours)</li>
            <li>Adresse du siège : à compléter</li>
            <li>E-mail de contact : à compléter</li>
          </ul>
        </Section>

        <Section title="Directrice de la publication">
          <p>Constance Caron-Dufour.</p>
        </Section>

        <Section title="Hébergement">
          <p>
            Le site est hébergé par Render Services, Inc. (
            <a href="https://render.com" className="underline hover:text-sage-dark" target="_blank" rel="noopener noreferrer">
              render.com
            </a>
            ), San Francisco, États-Unis.
          </p>
        </Section>

        <Section title="Propriété intellectuelle">
          <p>
            L&apos;ensemble des contenus présents sur le site (textes, descriptions de lieux, cartes, mise en page,
            logo) est protégé par le droit d&apos;auteur et reste la propriété de l&apos;éditeur, sauf mention
            contraire. Les photographies utilisées proviennent de Wikimedia Commons et sont créditées individuellement
            selon leur licence d&apos;origine (voir la mention d&apos;attribution affichée avec chaque photo).
          </p>
          <p>
            Toute reproduction, distribution ou revente des guides, de leur contenu ou des accès associés, en dehors
            d&apos;un usage personnel, est interdite sans autorisation écrite préalable.
          </p>
        </Section>

        <Section title="Responsabilité">
          <p>
            Les informations pratiques fournies dans les guides (horaires, prix, accès) proviennent de recherches
            documentaires et sont données à titre indicatif. Elles peuvent évoluer après la publication du guide ;
            l&apos;éditeur ne saurait être tenu responsable des changements intervenus chez les établissements ou
            sites tiers mentionnés.
          </p>
        </Section>

        <Section title="Contact">
          <p>Pour toute question relative au site ou à une commande, contactez-nous à l&apos;adresse indiquée ci-dessus.</p>
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
