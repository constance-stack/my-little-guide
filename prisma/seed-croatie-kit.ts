/**
 * Kit essentiel Croatie — same pattern as the Thailand and USA kits,
 * adapted for a country that, unlike those two, is in the EU and the
 * Eurozone: no visa, no currency exchange, no driving-side difference
 * for French travelers. The real friction points for this destination
 * are different — ferry/boat logistics between islands, and the switch
 * from kuna to euro being recent enough that some confusion lingers.
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
  const croatie = await prisma.country.upsert({
    where: { slug: "croatie" },
    update: {},
    create: { slug: "croatie", name: "Croatie" },
  });

  const kitSections = [
    {
      slug: "visa-entree",
      title: "Visa et entrée sur le territoire",
      content: [
        "La Croatie est membre de l'Union européenne depuis 2013 et de l'espace Schengen depuis 2023 : aucune formalité de visa pour les ressortissants français, belges ou suisses, juste une carte d'identité ou un passeport en cours de validité.",
        "Depuis l'entrée dans Schengen, il n'y a plus de contrôle de passeport aux frontières terrestres ou aéroportuaires avec les autres pays Schengen — le trajet est aussi simple qu'un déplacement en France.",
        "Aucune formalité sanitaire particulière n'est exigée à l'entrée.",
      ].join("\n"),
    },
    {
      slug: "monnaie-paiements",
      title: "Monnaie et paiements",
      content: [
        "La Croatie a adopté l'euro le 1er janvier 2023, en remplacement de la kuna — un simple voyage en zone euro, sans change à prévoir.",
        "Les cartes bancaires sont largement acceptées, y compris dans la plupart des petits restaurants et commerces, même sur les îles.",
        "Dans les villages les plus reculés ou pour de très petits montants (marché, glacier), prévoyez quelques espèces en complément.",
        "D'anciens prix en kuna traînent encore parfois sur de vieilles affiches ou menus non mis à jour — ne vous fiez qu'aux prix en euros.",
      ].join("\n"),
    },
    {
      slug: "transports",
      title: "Se déplacer (et prendre les bateaux)",
      content: [
        "Une voiture de location est quasiment indispensable pour explorer la côte et l'arrière-pays au-delà de Dubrovnik même — les transports en commun entre petites villes sont limités.",
        "Pour les îles, les ferries et catamarans de la compagnie nationale Jadrolinija (et plusieurs opérateurs privés comme Krilo ou TP Line) desservent les destinations touristiques, avec des fréquences réduites hors saison.",
        "Réservez vos trajets en ferry à l'avance en haute saison (juillet-août), surtout pour transporter une voiture — les départs à vide sont rares mais les files d'attente, longues.",
        "Le pont de Pelješac (ouvert en 2022) permet désormais de rejoindre la péninsule sans passer par le court corridor bosnien de Neum, qui imposait auparavant un contrôle de passeport.",
        "Dubrovnik dispose d'un aéroport international bien desservi depuis la France, à seulement 20 minutes du centre-ville.",
      ].join("\n"),
    },
    {
      slug: "securite-sante",
      title: "Sécurité et santé",
      content: [
        "La Croatie est un pays très sûr pour les touristes, avec une criminalité faible même dans les zones les plus fréquentées.",
        "La carte européenne d'assurance maladie (CEAM) est valable en Croatie — pensez à vous la procurer avant le départ.",
        "L'eau du robinet est potable partout dans le pays, y compris sur les îles.",
        "En cas d'urgence, composez le 112, numéro d'urgence européen valable dans toute l'Union européenne.",
        "Le soleil adriatique est plus fort qu'il n'y paraît en bord de mer — la protection solaire reste la précaution la plus souvent négligée par les visiteurs.",
      ].join("\n"),
    },
    {
      slug: "iles-et-saisonnalite",
      title: "Îles et saisonnalité",
      content: [
        "La Croatie compte plus de 1 200 îles et îlots, dont une cinquantaine seulement sont habités en permanence — beaucoup de services (restaurants, liaisons bateau) ferment totalement hors saison (novembre à avril).",
        "La haute saison (juillet-août) concentre l'essentiel de l'affluence et des prix les plus élevés — juin et septembre offrent un très bon compromis météo/fréquentation.",
        "Beaucoup de petites îles et criques ne sont accessibles qu'en bateau — louer un bateau à la journée (avec ou sans skipper) est une façon courante et abordable d'explorer la côte dalmate.",
        "Le mistral (bura) peut occasionnellement interrompre les liaisons en ferry, surtout en automne et en hiver — prévoyez une marge dans votre planning si vous dépendez d'un bateau pour un vol ou un train.",
      ].join("\n"),
    },
  ];

  for (let i = 0; i < kitSections.length; i++) {
    const s = kitSections[i];
    await prisma.kitSection.upsert({
      where: { countryId_slug: { countryId: croatie.id, slug: s.slug } },
      update: { title: s.title, content: s.content, sortOrder: i, status: "PUBLISHED" },
      create: {
        countryId: croatie.id,
        slug: s.slug,
        title: s.title,
        content: s.content,
        sortOrder: i,
        status: "PUBLISHED",
      },
    });
    console.log("  kit section:", s.title);
  }

  console.log("Croatie kit essentiel seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
