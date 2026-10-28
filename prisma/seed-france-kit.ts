/**
 * Kit essentiel France — same pattern as the other country kits, but
 * written for the specific case of a French destination: most readers
 * of this app are themselves French, visiting Paris from elsewhere in
 * France, so the visa/currency sections are trivial by design rather
 * than omitted (kept short, for the rare international reader).
 * Practical Parisian specifics (scams to avoid, metro, tipping)
 * matter more here than anywhere else in the kit catalogue. Kept
 * strictly country-wide — city-specific detail belongs in the
 * destination guide itself.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const isRemote = !process.env.DATABASE_URL?.includes("localhost");
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const france = await prisma.country.upsert({
    where: { slug: "france" },
    update: {},
    create: { slug: "france", name: "France" },
  });

  const kitSections = [
    {
      slug: "visa-entree",
      title: "Visa et entrée sur le territoire",
      content: [
        "Pour un voyageur venant d'une autre région française, aucune formalité particulière n'est nécessaire — une simple carte d'identité suffit à tout moment.",
        "Pour un visiteur venant d'un autre pays de l'Union européenne ou de l'espace Schengen, aucun visa n'est requis, une carte d'identité ou un passeport en cours de validité suffit.",
        "Pour les ressortissants hors Union européenne, les règles standard de l'espace Schengen s'appliquent (visa éventuellement requis selon la nationalité, séjour touristique limité à 90 jours sur 180).",
      ].join("\n"),
    },
    {
      slug: "monnaie-paiements",
      title: "Monnaie et paiements",
      content: [
        "La monnaie est l'euro, sans change à prévoir pour les voyageurs venant de France ou d'un autre pays de la zone euro.",
        "Les cartes bancaires sont acceptées quasiment partout, y compris pour de très petits montants — le paiement sans contact est la norme dans la plupart des commerces.",
        "Prévoyez tout de même quelques espèces pour certains petits commerces, marchés ou toilettes publiques payantes qui peuvent encore les exiger.",
      ].join("\n"),
    },
    {
      slug: "transports",
      title: "Se déplacer",
      content: [
        "Le réseau de transport en commun (métro, bus, RER) est dense et efficace dans les grandes villes françaises — privilégiez un pass journalier ou hebdomadaire plutôt que des tickets à l'unité pour un séjour de plusieurs jours.",
        "Le TGV relie très rapidement les grandes villes françaises entre elles — réservez en ligne à l'avance pour profiter des meilleurs tarifs, les prix augmentant fortement à l'approche du départ.",
        "Les applications Uber, Bolt et Free Now sont largement disponibles dans les grandes villes, en complément des taxis traditionnels.",
        "Validez toujours votre titre de transport avant de monter — un contrôle sans titre validé entraîne une amende, même avec un billet valide en poche.",
      ].join("\n"),
    },
    {
      slug: "securite-arnaques",
      title: "Sécurité et arnaques à connaître",
      content: [
        "La France reste globalement sûre pour les touristes, mais le vol à la tire est fréquent dans les zones très touristiques et les transports en commun bondés des grandes villes.",
        "Méfiez-vous des arnaques classiques dans les lieux très fréquentés : le \"bracelet de l'amitié\" noué de force au poignet, la fausse pétition qui détourne l'attention pendant qu'un complice fait les poches, ou le jeu de bonneteau toujours truqué.",
        "Restez particulièrement vigilant avec sacs et téléphones dans le métro et sur les grands sites touristiques, surtout en haute saison.",
        "En cas d'urgence, composez le 112, numéro d'urgence européen valable dans toute l'Union européenne, ou le 17 pour la police en France.",
        "L'eau du robinet est potable partout en France.",
      ].join("\n"),
    },
    {
      slug: "usages-pourboires",
      title: "Usages et pourboires",
      content: [
        "Le service est toujours inclus dans l'addition au restaurant par la loi française (mention \"service compris\") — un pourboire supplémentaire n'est jamais obligatoire, même si arrondir ou laisser quelques euros pour un bon service reste apprécié.",
        "Il est tout à fait normal de s'attarder longuement à une terrasse de café après avoir consommé — contrairement à d'autres pays, personne ne viendra vous presser de partir.",
        "Dire \"bonjour\" en entrant dans un commerce avant de formuler une demande est une politesse de base en France, et son absence peut être perçue comme discourtoise.",
        "Les horaires de repas sont plus fixes qu'ailleurs en Europe : les cuisines de nombreux restaurants ferment entre les services, généralement entre 14h30 et 19h.",
      ].join("\n"),
    },
  ];

  for (let i = 0; i < kitSections.length; i++) {
    const s = kitSections[i];
    await prisma.kitSection.upsert({
      where: { countryId_slug: { countryId: france.id, slug: s.slug } },
      update: { title: s.title, content: s.content, sortOrder: i, status: "PUBLISHED" },
      create: {
        countryId: france.id,
        slug: s.slug,
        title: s.title,
        content: s.content,
        sortOrder: i,
        status: "PUBLISHED",
      },
    });
    console.log("  kit section:", s.title);
  }

  console.log("France kit essentiel seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
