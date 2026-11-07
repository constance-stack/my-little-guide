/**
 * Kit essentiel Maroc — same pattern as the other country kits. Unlike
 * the EU destinations built this session, Morocco requires a real
 * mental shift for French travelers: a closed currency that can't be
 * exchanged abroad, a bargaining culture that's expected rather than
 * optional, and modest dress norms around religious sites — these
 * matter far more here than visa or safety basics. Kept strictly
 * country-wide — city-specific detail belongs in the destination
 * guide itself.
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
  const maroc = await prisma.country.upsert({
    where: { slug: "maroc" },
    update: {},
    create: { slug: "maroc", name: "Maroc" },
  });

  const kitSections = [
    {
      slug: "visa-entree",
      title: "Visa et entrée sur le territoire",
      content: [
        "Les ressortissants français, belges et suisses n'ont besoin d'aucun visa pour un séjour touristique de moins de 90 jours — un passeport valide au moins 6 mois après la date de retour suffit.",
        "La carte d'identité seule ne suffit pas pour entrer au Maroc, contrairement à un déplacement au sein de l'Union européenne — le passeport est obligatoire.",
        "Un formulaire de déclaration à l'arrivée peut être demandé — gardez une copie de votre passeport et de votre billet retour à portée de main.",
      ].join("\n"),
    },
    {
      slug: "monnaie-paiements",
      title: "Monnaie et paiements",
      content: [
        "La monnaie est le dirham marocain (MAD), une monnaie fermée : il est interdit de l'exporter ou de l'importer, et elle ne se change pas en France avant le départ.",
        "Changez vos euros à l'arrivée (aéroport, banque ou bureau de change en ville) ou retirez directement des dirhams aux distributeurs, largement disponibles dans les grandes villes.",
        "Les cartes bancaires sont acceptées dans les hôtels, restaurants touristiques et grandes boutiques, mais les espèces restent indispensables dans les souks, petits restaurants et transports locaux.",
        "Gardez vos tickets de change — ils permettent, en théorie, de reconvertir jusqu'à 50 % des dirhams non dépensés en quittant le pays, bien que la pratique reste rarement utilisée.",
      ].join("\n"),
    },
    {
      slug: "transports",
      title: "Se déplacer",
      content: [
        "Les trains (ONCF) relient efficacement les grandes villes du nord et du centre du pays, confortables et ponctuels.",
        "Les petits taxis (couleur selon la ville) desservent les trajets urbains courts — négociez le prix avant de monter si le compteur n'est pas utilisé, ou insistez pour qu'il le soit.",
        "Les grands taxis partagés relient les villes proches à prix fixe par passager, une option économique mais moins confortable que le train ou le bus.",
        "Les applications comme Careem sont disponibles dans les grandes villes et évitent toute négociation de prix.",
        "Pour les excursions dans l'Atlas ou le désert, un chauffeur ou une excursion organisée reste la solution la plus simple, les routes de montagne étant sinueuses.",
      ].join("\n"),
    },
    {
      slug: "securite-sante",
      title: "Sécurité et santé",
      content: [
        "Le Maroc est globalement sûr pour les touristes, avec une criminalité violente rare dans les zones touristiques.",
        "Le harcèlement commercial (vendeurs insistants, faux guides) est fréquent dans les médinas — un \"non merci\" poli et répété, sans s'arrêter, reste la meilleure réponse.",
        "Une assurance voyage couvrant les frais médicaux est recommandée, les soins de qualité occidentale se concentrant surtout dans les cliniques privées des grandes villes.",
        "En cas d'urgence, composez le 19 (police) ou le 15 (SAMU, secours médicaux).",
        "L'eau du robinet est traitée mais peut provoquer des désagréments digestifs chez les visiteurs non habitués — l'eau en bouteille scellée reste recommandée.",
      ].join("\n"),
    },
    {
      slug: "usages-tenue",
      title: "Usages, tenue vestimentaire et marchandage",
      content: [
        "Une tenue couvrant les épaules et les genoux est appréciée en dehors des zones les plus touristiques, par respect pour les codes vestimentaires locaux — hommes et femmes.",
        "L'intérieur des mosquées en activité est généralement réservé aux musulmans ; seules quelques mosquées historiques hors d'usage religieux se visitent par tous.",
        "Le marchandage est la norme dans les souks, jamais dans les grands magasins ou restaurants à prix affiché — proposez environ un tiers à la moitié du prix annoncé pour démarrer la négociation.",
        "Le vendredi est le jour de prière principal — certains commerces ferment en début d'après-midi, notamment en dehors des grandes villes touristiques.",
        "Pendant le ramadan, manger, boire ou fumer en public dans la journée est à éviter par respect, même si les établissements touristiques restent généralement ouverts pour les visiteurs.",
      ].join("\n"),
    },
  ];

  for (let i = 0; i < kitSections.length; i++) {
    const s = kitSections[i];
    await prisma.kitSection.upsert({
      where: { countryId_slug: { countryId: maroc.id, slug: s.slug } },
      update: { title: s.title, content: s.content, sortOrder: i, status: "PUBLISHED" },
      create: {
        countryId: maroc.id,
        slug: s.slug,
        title: s.title,
        content: s.content,
        sortOrder: i,
        status: "PUBLISHED",
      },
    });
    console.log("  kit section:", s.title);
  }

  console.log("Maroc kit essentiel seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
