/**
 * Kit essentiel Monaco — same pattern as the other country kits (see
 * seed-maroc-kit.ts). Monaco is a genuine edge case for a "kit pays":
 * it's not in the EU or the Schengen area as a member state yet has no
 * real border formalities with France, uses the euro without being in
 * the eurozone as a full member, and is small enough that "transport"
 * mostly means walking, the lifts, and how to get in from Nice. Kept
 * strictly country-wide — Monaco-city sightseeing content (the Rocher,
 * Monte-Carlo, the Grand Prix circuit, etc.) belongs in seed-monaco.ts.
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
  const monaco = await prisma.country.upsert({
    where: { slug: "monaco" },
    update: {},
    create: { slug: "monaco", name: "Monaco" },
  });

  const kitSections = [
    {
      slug: "visa-entree",
      title: "Visa et entrée sur le territoire",
      content: [
        "Monaco n'est pas membre de l'Union européenne, mais applique de facto les règles françaises d'entrée : aucune formalité de douane ni de police ne vous attend en passant de France à Monaco, à pied, en voiture ou en bus — la frontière est totalement ouverte et le plus souvent impossible à repérer.",
        "Les ressortissants français, belges et suisses n'ont besoin d'aucun visa, la carte d'identité suffit comme pour un déplacement en France.",
        "Monaco fait partie de l'espace Schengen par accord avec la France : les mêmes règles de visa s'appliquent aux ressortissants d'autres nationalités que pour entrer en France.",
        "Il n'y a pas d'aéroport international à Monaco — l'arrivée se fait quasiment toujours par l'aéroport de Nice Côte d'Azur, puis par la route, le train ou l'hélicoptère.",
      ].join("\n"),
    },
    {
      slug: "monnaie-paiements",
      title: "Monnaie et paiements",
      content: [
        "Monaco utilise l'euro, bien qu'il ne soit pas membre de l'Union européenne — un accord monétaire avec la France lui permet de l'émettre, et la Principauté frappe même ses propres pièces, très recherchées des collectionneurs.",
        "Aucun change n'est nécessaire en venant de France, de Belgique ou de tout autre pays de la zone euro.",
        "Les cartes bancaires et le paiement sans contact sont acceptés quasiment partout, y compris pour de petits montants — les espèces sont rarement indispensables, sauf pour un pourboire.",
        "Monaco est l'une des destinations les plus chères d'Europe : un café en terrasse à Monte-Carlo coûte généralement plus cher qu'à Paris ou à Nice, à budgéter en conséquence.",
      ].join("\n"),
    },
    {
      slug: "transports",
      title: "Se déplacer",
      content: [
        "Monaco est minuscule (environ 2 km²) et presque tout se fait à pied, mais le relief est très escarpé — prévoyez des chaussures confortables, les dénivelés entre quartiers sont sérieux.",
        "Un réseau d'ascenseurs publics et d'escalators gratuits, souvent intégrés dans les immeubles, permet de remonter les pentes les plus raides sans effort — un vrai atout local à connaître dès l'arrivée.",
        "Un bus local (la CAM) relie efficacement tous les quartiers pour un tarif modeste ; une ligne de bus relie aussi directement l'aéroport de Nice à Monaco en environ 45 minutes à 1h selon le trafic.",
        "La gare SNCF de Monaco-Monte-Carlo, en grande partie souterraine, est desservie par les TER de la ligne Marseille-Vintimille — Nice est à environ 20-25 minutes de train.",
        "Pour un transfert rapide depuis l'aéroport de Nice, l'hélicoptère (Monacair) relie les deux en environ 7 minutes, une option de luxe mais emblématique de la Riviera.",
        "La circulation et le stationnement sont très denses, surtout en journée et lors des grands événements (Grand Prix, Monaco Yacht Show) — mieux vaut éviter la voiture sur place si possible.",
      ].join("\n"),
    },
    {
      slug: "securite-sante",
      title: "Sécurité et santé",
      content: [
        "Monaco est l'une des destinations les plus sûres d'Europe, avec une densité de police parmi les plus élevées au monde et une vidéosurveillance quasi intégrale de l'espace public.",
        "Le système de santé est de niveau équivalent à la France, avec le Centre Hospitalier Princesse Grace pour les urgences.",
        "En cas d'urgence, composez le 112 (numéro d'urgence européen, valable à Monaco) ou le 17 (police).",
        "Une assurance voyage couvrant les frais médicaux reste recommandée pour les visiteurs non européens, les tarifs de santé privés pouvant être élevés.",
      ].join("\n"),
    },
    {
      slug: "usages-budget",
      title: "Usages, tenue et budget",
      content: [
        "Une tenue correcte (pas de maillot de bain ni de torse nu en dehors des plages) est attendue dans les lieux publics, les restaurants et surtout au Casino de Monte-Carlo, où une veste est exigée en soirée dans les salles de jeux européennes.",
        "L'entrée aux salles de jeux du Casino de Monte-Carlo est payante et réservée aux non-résidents monégasques munis d'une pièce d'identité — les citoyens monégasques n'y sont traditionnellement pas admis.",
        "Le Grand Prix de Formule 1 (fin mai) transforme la Principauté pendant plusieurs semaines : hôtels complets des mois à l'avance, rues fermées, prix multipliés — à éviter si vous cherchez du calme, à prévoir longtemps en avance si c'est justement ce que vous venez voir.",
        "Le pourboire n'est pas obligatoire (le service est inclus par la loi), mais laisser l'arrondi ou quelques euros supplémentaires dans les restaurants est courant et appréciée.",
      ].join("\n"),
    },
  ];

  for (let i = 0; i < kitSections.length; i++) {
    const s = kitSections[i];
    await prisma.kitSection.upsert({
      where: { countryId_slug: { countryId: monaco.id, slug: s.slug } },
      update: { title: s.title, content: s.content, sortOrder: i, status: "PUBLISHED" },
      create: {
        countryId: monaco.id,
        slug: s.slug,
        title: s.title,
        content: s.content,
        sortOrder: i,
        status: "PUBLISHED",
      },
    });
    console.log("  kit section:", s.title);
  }

  console.log("Monaco kit essentiel seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
