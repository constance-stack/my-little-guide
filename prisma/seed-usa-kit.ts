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
        "Les prix affichés en magasin et au restaurant n'incluent jamais la taxe de vente (sales tax), ajoutée seulement en caisse — elle varie selon l'État et la ville, généralement entre 4 et 10 % du prix affiché.",
        "Gardez quelques billets de 1 et 5 USD sur vous pour les pourboires (voir la section dédiée), rarement réglables par carte.",
      ].join("\n"),
    },
    {
      slug: "transports",
      title: "Se déplacer",
      content: [
        "Les États-Unis sont immenses : les distances entre villes se comptent souvent en heures de vol plutôt qu'en heures de route — les vols intérieurs (Delta, American, United, Southwest…) sont la norme pour relier deux villes éloignées.",
        "En dehors des grandes métropoles (New York, Chicago, San Francisco, Boston, Washington D.C.), les transports en commun sont peu développés et une voiture de location est souvent indispensable pour se déplacer.",
        "Les applications Uber et Lyft sont disponibles dans la quasi-totalité du pays et souvent plus simples que de héler un taxi dans la rue.",
        "Le permis de conduire français suffit pour louer une voiture, mais un permis international est recommandé en complément — vérifiez les conditions d'âge minimum selon les loueurs (souvent 25 ans sans supplément).",
        "Dans les villes qui disposent d'un bon réseau (métro, bus), le paiement se fait de plus en plus par carte bancaire ou smartphone sans contact directement au portillon, sans besoin d'acheter de ticket à l'avance.",
      ].join("\n"),
    },
    {
      slug: "securite-sante",
      title: "Sécurité et santé",
      content: [
        "Les États-Unis sont globalement sûrs pour les touristes dans les quartiers centraux et touristiques des grandes villes, de jour comme de nuit — le niveau de sécurité varie cependant beaucoup d'un quartier à l'autre, renseignez-vous avant de vous aventurer hors des zones touristiques.",
        "Comme partout, restez attentif à vos affaires dans les transports en commun et les lieux très fréquentés.",
        "Les soins médicaux aux États-Unis sont extrêmement coûteux sans assurance — une assurance voyage couvrant les frais médicaux et le rapatriement est indispensable, pas simplement recommandée.",
        "En cas d'urgence, composez le 911 (police, pompiers, ambulance), gratuit depuis n'importe quel téléphone.",
        "L'eau du robinet est potable dans la quasi-totalité du pays.",
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
