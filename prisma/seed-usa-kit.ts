/**
 * Kit essentiel États-Unis — same pattern as prisma/seed-real-content.ts's
 * Thailand kit, adapted for a US destination (New York being the first).
 * Replaces the Thai "vocabulaire" section with "pourboires et usages",
 * since tipping culture is the single biggest culture-shock point for
 * French travelers in the US, not a language barrier.
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
  const usa = await prisma.country.upsert({
    where: { slug: "etats-unis" },
    update: {},
    create: { slug: "etats-unis", name: "États-Unis" },
  });

  const kitSections = [
    {
      slug: "visa-entree",
      title: "Visa et entrée sur le territoire",
      content: [
        "Les ressortissants français, belges, suisses et de nombreux autres pays européens peuvent voyager aux États-Unis sans visa pour un séjour touristique de 90 jours maximum, via le programme d'exemption de visa (Visa Waiver Program).",
        "Une autorisation ESTA est obligatoire avant le départ : elle se demande en ligne sur le site officiel esta.cbp.dhs.gov, coûte environ 21 USD et reste valable 2 ans pour des séjours multiples.",
        "Méfiez-vous des sites non officiels qui facturent l'ESTA bien plus cher — ne passez que par le site gouvernemental officiel.",
        "Passeport électronique valide requis, ainsi qu'un billet retour ou de continuation. L'agent des douanes à l'arrivée peut poser des questions sur l'objet et la durée du séjour.",
      ].join("\n"),
    },
    {
      slug: "monnaie-paiements",
      title: "Monnaie et paiements",
      content: [
        "La monnaie est le dollar américain (USD).",
        "Les cartes bancaires (Visa, Mastercard) sont acceptées quasiment partout, y compris pour de très petits montants — les espèces ne sont quasiment jamais indispensables.",
        "Prévenez votre banque de votre voyage pour éviter un blocage de carte pour \"opération suspecte\".",
        "Les prix affichés en magasin et au restaurant n'incluent pas la taxe de vente (sales tax), ajoutée en caisse — à New York, comptez environ 8,875 % de plus que le prix affiché.",
        "Gardez quelques billets de 1 et 5 USD sur vous pour les pourboires (voir la section dédiée), rarement réglables par carte.",
      ].join("\n"),
    },
    {
      slug: "transports",
      title: "Se déplacer",
      content: [
        "Le métro de New York fonctionne 24h/24 et couvre l'essentiel de Manhattan, Brooklyn, Queens et le Bronx — c'est le moyen le plus rapide pour se déplacer aux heures de pointe.",
        "Le paiement se fait désormais directement par carte bancaire ou smartphone sans contact (OMNY) à chaque tourniquet, sans besoin d'acheter de ticket à l'avance.",
        "Une carte MetroCard classique reste disponible aux distributeurs si vous préférez un forfait illimité sur plusieurs jours.",
        "Les applications Uber et Lyft sont largement utilisées et souvent plus simples que de héler un taxi jaune dans la rue.",
        "Manhattan se parcourt très bien à pied grâce à son plan en damier — beaucoup de quartiers voisins se rejoignent plus vite à pied qu'en métro sur de courtes distances.",
      ].join("\n"),
    },
    {
      slug: "securite-sante",
      title: "Sécurité et santé",
      content: [
        "New York est globalement une ville sûre pour les touristes dans les quartiers centraux et touristiques, de jour comme de nuit.",
        "Comme partout, restez attentif à vos affaires dans le métro et les lieux très fréquentés (Times Square, marchés).",
        "Les soins médicaux aux États-Unis sont très coûteux sans assurance — une assurance voyage couvrant les frais médicaux et le rapatriement est indispensable, pas simplement recommandée.",
        "En cas d'urgence, composez le 911 (police, pompiers, ambulance), gratuit depuis n'importe quel téléphone.",
        "L'eau du robinet est potable à New York, contrairement à de nombreuses autres destinations de ce guide.",
      ].join("\n"),
    },
    {
      slug: "pourboires-usages",
      title: "Pourboires et usages",
      content: [
        "Le pourboire n'est pas une option aux États-Unis : il fait partie intégrante de la rémunération du personnel dans de nombreux métiers, dont les salaires de base sont légalement plus bas en conséquence.",
        "Au restaurant avec service à table, comptez 18 à 20 % de l'addition avant taxe — certains établissements l'ajoutent automatiquement pour les grandes tables, vérifiez l'addition.",
        "Pour un café ou un plat à emporter, un écran de paiement proposant un pourboire (souvent 15-20-25 %) s'affiche presque systématiquement — vous pouvez choisir \"no tip\" / \"custom\" sans gêne pour un simple comptoir.",
        "Dans les bars, comptez 1 à 2 USD par boisson commandée au comptoir.",
        "Pour les chauffeurs de taxi, Uber/Lyft et les livreurs, 15 à 20 % est l'usage ; pour le personnel d'hôtel (bagagiste, femme de chambre), 1 à 5 USD par service rendu.",
        "Ne pas laisser de pourboire du tout, sauf service réellement très mauvais, est perçu comme un véritable impair aux États-Unis — à anticiper dans le budget du voyage.",
      ].join("\n"),
    },
  ];

  for (let i = 0; i < kitSections.length; i++) {
    const s = kitSections[i];
    await prisma.kitSection.upsert({
      where: { countryId_slug: { countryId: usa.id, slug: s.slug } },
      update: { title: s.title, content: s.content, sortOrder: i, status: "PUBLISHED" },
      create: {
        countryId: usa.id,
        slug: s.slug,
        title: s.title,
        content: s.content,
        sortOrder: i,
        status: "PUBLISHED",
      },
    });
    console.log("  kit section:", s.title);
  }

  console.log("USA kit essentiel seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
