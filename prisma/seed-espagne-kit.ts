/**
 * Kit essentiel Espagne — same pattern as the other country kits.
 * Spain is in the EU and Eurozone like Croatia, so the friction points
 * for French travelers are mostly about siesta-driven opening hours,
 * late meal times, and regional/language nuance (Catalan in Barcelona,
 * for instance) rather than visas or currency.
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
  const espagne = await prisma.country.upsert({
    where: { slug: "espagne" },
    update: {},
    create: { slug: "espagne", name: "Espagne" },
  });

  const kitSections = [
    {
      slug: "visa-entree",
      title: "Visa et entrée sur le territoire",
      content: [
        "L'Espagne est membre de l'Union européenne et de l'espace Schengen : aucune formalité de visa pour les ressortissants français, belges ou suisses, une simple carte d'identité ou un passeport en cours de validité suffit.",
        "Aucun contrôle de passeport aux frontières terrestres ou aéroportuaires avec les autres pays Schengen — le trajet est aussi simple qu'un déplacement en France.",
        "Aucune formalité sanitaire particulière n'est exigée à l'entrée.",
      ].join("\n"),
    },
    {
      slug: "monnaie-paiements",
      title: "Monnaie et paiements",
      content: [
        "La monnaie est l'euro, sans change à prévoir pour les voyageurs venant de France, de Belgique ou d'autres pays de la zone euro.",
        "Les cartes bancaires sont acceptées quasiment partout, y compris pour de très petits montants dans les bars à tapas.",
        "Prévoyez quelques espèces pour certains petits marchés ou chiringuitos de plage qui peuvent encore les préférer.",
        "Le pourboire n'est pas obligatoire mais apprécié : arrondir l'addition ou laisser 5-10% au restaurant est un usage courant, sans plus.",
      ].join("\n"),
    },
    {
      slug: "transports",
      title: "Se déplacer",
      content: [
        "Les trains à grande vitesse (AVE, Renfe) relient très rapidement les grandes villes espagnoles — Barcelone et Madrid, par exemple, se rejoignent en environ 2h30.",
        "Dans les grandes villes, le métro est généralement rapide et bon marché, avec des cartes rechargeables à plusieurs trajets nettement plus économiques que les tickets simples — le détail pratique de chaque réseau est précisé dans le guide de chaque ville.",
        "Les applications Uber, Bolt et Cabify sont largement disponibles dans toutes les grandes villes, en complément des taxis traditionnels.",
        "Pour les excursions en montagne ou vers de petites îles, les billets combinés (train + téléphérique, bus + bateau) achetés à l'avance sont souvent plus avantageux que les billets séparés sur place.",
      ].join("\n"),
    },
    {
      slug: "securite-sante",
      title: "Sécurité et santé",
      content: [
        "L'Espagne est globalement très sûre pour les touristes, mais le vol à la tire (pickpocket) est fréquent dans les zones très touristiques de Barcelone : La Rambla, le métro et les plages.",
        "Restez particulièrement vigilant avec sacs et téléphones dans les lieux bondés, et évitez de laisser des affaires sans surveillance sur la plage.",
        "La carte européenne d'assurance maladie (CEAM) est valable en Espagne — pensez à vous la procurer avant le départ.",
        "En cas d'urgence, composez le 112, numéro d'urgence européen valable dans toute l'Union européenne.",
        "L'eau du robinet est potable partout en Espagne.",
      ].join("\n"),
    },
    {
      slug: "usages-horaires",
      title: "Usages et horaires de vie",
      content: [
        "Les horaires de repas sont nettement plus tardifs qu'en France : le déjeuner commence souvent vers 13h30-14h30, et le dîner rarement avant 21h, parfois 22h en été.",
        "La sieste traditionnelle fait que de nombreux petits commerces ferment entre 14h et 17h, en particulier en dehors des zones très touristiques.",
        "En Catalogne, le catalan coexiste avec l'espagnol sur la signalisation et dans la vie quotidienne — \"adéu\" (au revoir) et \"si us plau\" (s'il vous plaît) sont appréciés des commerçants.",
        "Les tapas se commandent traditionnellement au fil du repas plutôt que toutes en même temps — n'hésitez pas à en recommander progressivement selon l'appétit du groupe.",
      ].join("\n"),
    },
  ];

  for (let i = 0; i < kitSections.length; i++) {
    const s = kitSections[i];
    await prisma.kitSection.upsert({
      where: { countryId_slug: { countryId: espagne.id, slug: s.slug } },
      update: { title: s.title, content: s.content, sortOrder: i, status: "PUBLISHED" },
      create: {
        countryId: espagne.id,
        slug: s.slug,
        title: s.title,
        content: s.content,
        sortOrder: i,
        status: "PUBLISHED",
      },
    });
    console.log("  kit section:", s.title);
  }

  console.log("Espagne kit essentiel seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
