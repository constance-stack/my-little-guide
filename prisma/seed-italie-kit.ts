/**
 * Kit essentiel Italie — same pattern as the other country kits.
 * Italy is in the EU and Eurozone, so the friction points for French
 * travelers are mostly about meal-time culture, tipping norms (service
 * is almost always already included) and regional train logistics,
 * rather than visas or currency. Kept strictly country-wide — any
 * city-specific detail (Rome's metro, a particular excursion) belongs
 * in that city's own destination guide instead.
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
  const italie = await prisma.country.upsert({
    where: { slug: "italie" },
    update: {},
    create: { slug: "italie", name: "Italie" },
  });

  const kitSections = [
    {
      slug: "visa-entree",
      title: "Visa et entrée sur le territoire",
      content: [
        "L'Italie est membre de l'Union européenne et de l'espace Schengen : aucune formalité de visa pour les ressortissants français, belges ou suisses, une simple carte d'identité ou un passeport en cours de validité suffit.",
        "Aucun contrôle de passeport aux frontières terrestres ou aéroportuaires avec les autres pays Schengen.",
        "Aucune formalité sanitaire particulière n'est exigée à l'entrée.",
      ].join("\n"),
    },
    {
      slug: "monnaie-paiements",
      title: "Monnaie et paiements",
      content: [
        "La monnaie est l'euro, sans change à prévoir pour les voyageurs venant de France, de Belgique ou d'autres pays de la zone euro.",
        "Les cartes bancaires sont largement acceptées, y compris dans la plupart des restaurants et commerces, mais prévoyez quelques espèces pour les très petits établissements, les marchés et certains bars à café.",
        "La loi italienne impose à chaque client de recevoir un reçu fiscal (scontrino) ou une facture — un commerçant qui n'en délivre pas est en infraction.",
      ].join("\n"),
    },
    {
      slug: "transports",
      title: "Se déplacer",
      content: [
        "Les trains à grande vitesse (Frecciarossa, Italo) relient très rapidement les grandes villes italiennes — réservez en ligne à l'avance pour profiter des meilleurs tarifs, les prix augmentant à l'approche du départ.",
        "Dans les grandes villes, un ticket de bus ou de métro doit être validé (composté) dès la montée — un contrôle sans titre validé entraîne une amende même avec un billet en poche non validé.",
        "Les applications Uber, FreeNow et les taxis traditionnels sont disponibles dans les grandes villes, mais hélés dans la rue ou pris aux stations officielles plutôt qu'arrêtés au hasard.",
        "Pour les excursions vers des sites excentrés, vérifiez toujours les horaires de retour des trains régionaux ou bus locaux, souvent moins fréquents en fin de journée.",
      ].join("\n"),
    },
    {
      slug: "securite-sante",
      title: "Sécurité et santé",
      content: [
        "L'Italie est globalement très sûre pour les touristes, mais le vol à la tire reste fréquent dans les zones très touristiques et les transports en commun bondés des grandes villes.",
        "Restez vigilant avec sacs et téléphones dans les lieux bondés (gares, bus touristiques, grands sites) et évitez de laisser des affaires sans surveillance en terrasse.",
        "La carte européenne d'assurance maladie (CEAM) est valable en Italie — pensez à vous la procurer avant le départ.",
        "En cas d'urgence, composez le 112, numéro d'urgence européen valable dans toute l'Union européenne.",
        "L'eau du robinet est potable partout en Italie, y compris aux nombreuses fontaines publiques (nasoni) des grandes villes.",
      ].join("\n"),
    },
    {
      slug: "usages-tipping-horaires",
      title: "Usages, pourboires et horaires de repas",
      content: [
        "Le service (servizio) est très souvent déjà inclus dans l'addition, parfois mentionné comme \"coperto\" (couvert) — un pourboire supplémentaire n'est pas attendu, même si arrondir reste apprécié pour un bon service.",
        "Les horaires de repas sont plus tardifs qu'en France pour le dîner (rarement avant 19h30-20h) mais plus précoces pour le déjeuner (souvent dès midi).",
        "De nombreux commerces et restaurants ferment entre 13h et 16h, en particulier en dehors des zones très touristiques et dans le sud du pays.",
        "Commander un cappuccino après 11h du matin ou avec un repas fait sourire la plupart des Italiens, qui le réservent traditionnellement au petit-déjeuner.",
      ].join("\n"),
    },
  ];

  for (let i = 0; i < kitSections.length; i++) {
    const s = kitSections[i];
    await prisma.kitSection.upsert({
      where: { countryId_slug: { countryId: italie.id, slug: s.slug } },
      update: { title: s.title, content: s.content, sortOrder: i, status: "PUBLISHED" },
      create: {
        countryId: italie.id,
        slug: s.slug,
        title: s.title,
        content: s.content,
        sortOrder: i,
        status: "PUBLISHED",
      },
    });
    console.log("  kit section:", s.title);
  }

  console.log("Italie kit essentiel seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
