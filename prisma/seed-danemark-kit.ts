/**
 * Kit essentiel Danemark — même pattern que les autres kits pays
 * (seed-suisse-kit.ts, seed-italie-kit.ts…). Pays entièrement nouveau
 * pour l'app, créé pour la destination Copenhague (seed-copenhague.ts).
 * Contenu volontairement national : le Danemark est dans l'UE et
 * Schengen mais utilise la couronne danoise (pas l'euro), a des
 * transports publics denses et fiables, et une culture du vélo très
 * marquée. Aucun contenu spécifique à Copenhague ici — cela reste dans
 * le fichier de destination.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const isRemote = !process.env.DATABASE_URL?.includes("localhost");
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const danemark = await prisma.country.upsert({
    where: { slug: "danemark" },
    update: {},
    create: { slug: "danemark", name: "Danemark" },
  });

  const kitSections = [
    {
      slug: "visa-entree",
      title: "Visa et entrée sur le territoire",
      content: [
        "Le Danemark est membre de l'Union européenne et de l'espace Schengen : les ressortissants français, belges et suisses n'ont besoin d'aucun visa pour un séjour touristique, et il n'y a aucun contrôle aux frontières avec les autres pays Schengen.",
        "Une carte d'identité valide suffit pour les citoyens de l'UE/AELE, le passeport n'est pas obligatoire.",
        "Les îles Féroé et le Groenland, bien que rattachés au royaume du Danemark, ne font pas partie de l'UE ni de Schengen — ce kit concerne uniquement le Danemark continental et ses îles (dont le Jutland et la Sélande, où se trouve Copenhague).",
      ].join("\n"),
    },
    {
      slug: "monnaie-paiements",
      title: "Monnaie et paiements",
      content: [
        "La monnaie est la couronne danoise (DKK), et non l'euro — le Danemark a négocié une clause d'exemption et n'a pas adopté la monnaie unique malgré son appartenance à l'UE.",
        "Le taux de change avec l'euro est resté très stable depuis des décennies (autour de 7,45 DKK pour 1 €), ce qui facilite les conversions mentales rapides.",
        "Les cartes bancaires et le paiement sans contact sont acceptés quasiment partout, y compris pour de très petits montants — le Danemark est l'un des pays les moins friands de cash au monde, certains commerces n'acceptent même plus les espèces.",
        "L'application MobilePay (paiement mobile local) est omniprésente, mais réservée en pratique aux comptes bancaires scandinaves.",
        "Le coût de la vie est élevé, comparable à la Suisse ou à la Norvège, en particulier pour la restauration, l'alcool et l'hébergement.",
      ].join("\n"),
    },
    {
      slug: "transports",
      title: "Se déplacer",
      content: [
        "Le réseau ferroviaire danois (DSB) est dense, ponctuel et relie efficacement les grandes villes ; les trains régionaux et S-trains desservent aussi largement les zones périurbaines.",
        "Le vélo est roi au Danemark : pistes cyclables séparées omniprésentes, signalisation dédiée, et location de vélos facile dans toutes les villes — c'est souvent le moyen le plus rapide et le plus agréable de se déplacer en ville.",
        "L'application DOT (Rejseplanen) centralise tous les horaires de trains, bus et métro du pays, correspondances comprises.",
        "Les ponts et tunnels reliant les grandes îles danoises (pont de l'Øresund vers la Suède, pont du Grand Belt entre Fionie et Sélande) sont à péage pour les voitures, mais gratuits en train.",
        "Les taxis sont chers ; mieux vaut privilégier les transports publics ou le vélo dès que possible.",
      ].join("\n"),
    },
    {
      slug: "securite-sante",
      title: "Sécurité et santé",
      content: [
        "Le Danemark est l'un des pays les plus sûrs et les plus paisibles d'Europe, avec une criminalité très faible, y compris dans les grandes villes et en soirée.",
        "L'eau du robinet est potable et de très bonne qualité partout dans le pays.",
        "Une assurance voyage couvrant les frais médicaux est recommandée : les soins sont de bonne qualité mais les tarifs hors système public peuvent être élevés pour un visiteur étranger.",
        "En cas d'urgence, composez le 112 (police, pompiers, ambulance), numéro unique valable dans tout le pays.",
        "Le climat est frais et changeant même en été : prévoir des vêtements superposables et un coupe-vent imperméable quelle que soit la saison.",
      ].join("\n"),
    },
    {
      slug: "langues-usages",
      title: "Langues, pourboire et usages",
      content: [
        "La langue officielle est le danois, mais l'anglais est parlé avec un niveau d'aisance remarquable par la quasi-totalité de la population, y compris les personnes âgées — se faire comprendre en anglais ne pose quasiment jamais de problème.",
        "Le pourboire n'est pas une obligation sociale : le service est presque toujours inclus dans l'addition (selv ved bordet), et laisser un pourboire reste un geste apprécié mais jamais attendu, contrairement aux usages nord-américains.",
        "La ponctualité et un certain sens de l'ordre sont valorisés socialement, dans les transports comme dans la vie quotidienne.",
        "Le concept de « hygge » — une convivialité chaleureuse et simple, souvent associée à la lumière des bougies et aux moments partagés — est une vraie clé culturelle pour comprendre l'art de vivre danois, en particulier pendant les longs mois d'hiver.",
        "Le tri des déchets et une conscience écologique marquée (vélo, éolien, recyclage) sont profondément ancrés dans les habitudes locales.",
      ].join("\n"),
    },
  ];

  for (let i = 0; i < kitSections.length; i++) {
    const s = kitSections[i];
    await prisma.kitSection.upsert({
      where: { countryId_slug: { countryId: danemark.id, slug: s.slug } },
      update: { title: s.title, content: s.content, sortOrder: i, status: "PUBLISHED" },
      create: {
        countryId: danemark.id,
        slug: s.slug,
        title: s.title,
        content: s.content,
        sortOrder: i,
        status: "PUBLISHED",
      },
    });
    console.log("  kit section:", s.title);
  }

  console.log("Danemark kit essentiel seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
