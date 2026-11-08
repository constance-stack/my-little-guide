/**
 * Kit essentiel Suisse — même pattern que les autres kits pays
 * (seed-maroc-kit.ts, seed-italie-kit.ts…). Pays entièrement nouveau
 * pour l'app, créé en parallèle par la session Zurich et la session
 * Genève (destination construite au même moment par une autre
 * session) — l'upsert du pays est idempotent et peut être exécuté par
 * l'une ou l'autre session sans conflit. Contenu volontairement
 * national : la Suisse n'est pas dans l'UE, utilise le franc suisse
 * (pas l'euro), a des transports publics célèbres pour leur
 * ponctualité mais chers, et l'eau du robinet y est partout potable.
 * Aucun contenu spécifique à Zurich ou Genève ici — cela reste dans
 * les fichiers de destination respectifs.
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
  const suisse = await prisma.country.upsert({
    where: { slug: "suisse" },
    update: {},
    create: { slug: "suisse", name: "Suisse" },
  });

  const kitSections = [
    {
      slug: "visa-entree",
      title: "Visa et entrée sur le territoire",
      content: [
        "La Suisse n'est pas membre de l'Union européenne mais fait partie de l'espace Schengen : les ressortissants français, belges et suisses voisins n'ont besoin d'aucun visa pour un séjour touristique, et les contrôles aux frontières terrestres sont généralement absents ou très légers.",
        "Une carte d'identité valide suffit pour les citoyens de l'UE/AELE, le passeport n'est pas obligatoire contrairement à certaines idées reçues.",
        "La Suisse applique ses propres règles douanières hors UE : attention aux franchises à l'achat d'alcool, de tabac ou de produits alimentaires en grande quantité, notamment dans les grandes surfaces frontalières.",
      ].join("\n"),
    },
    {
      slug: "monnaie-paiements",
      title: "Monnaie et paiements",
      content: [
        "La monnaie est le franc suisse (CHF), et non l'euro — un point qui surprend souvent les visiteurs venant de pays voisins de la zone euro.",
        "Les euros en espèces sont parfois acceptés dans les zones très touristiques, mais toujours à un taux de change défavorable et avec la monnaie rendue en francs — mieux vaut toujours payer en CHF.",
        "Les cartes bancaires et le paiement sans contact sont acceptés quasiment partout, y compris pour de très petits montants, et l'application Twint (paiement mobile local) est omniprésente mais réservée aux comptes bancaires suisses.",
        "Les distributeurs automatiques de billets sont nombreux et fiables, mais les frais de change et de retrait à l'étranger peuvent s'accumuler rapidement — vérifiez les conditions de votre carte avant de partir.",
        "La Suisse reste un pays cher par rapport à ses voisins : un café ou un sandwich coûtent facilement le double du prix pratiqué en France ou en Allemagne.",
      ].join("\n"),
    },
    {
      slug: "transports",
      title: "Se déplacer",
      content: [
        "Le réseau de transports publics suisses (trains CFF, trams, bus, bateaux) est réputé pour sa ponctualité et sa densité, considéré parmi les meilleurs du monde — les correspondances sont calculées à la minute.",
        "Le prix des billets est élevé mais proportionnel au niveau de service : pour un séjour de plusieurs jours avec de nombreux trajets, les abonnements touristiques (Swiss Travel Pass) ou les demi-tarifs peuvent être rentables.",
        "Les horaires affichés sont fiables à la minute — un train annoncé à 14h03 partira à 14h03, pas une minute de plus ni de moins, sauf incident exceptionnel.",
        "Dans les grandes villes, un même titre de transport (zone urbaine) couvre souvent bus, tram et parfois bateau — pratique pour combiner plusieurs modes sans acheter de billets séparés.",
        "Les applications SBB/CFF/FFS (nom officiel selon la langue) centralisent tous les horaires de trains, bus et bateaux du pays, y compris les correspondances complexes en montagne.",
      ].join("\n"),
    },
    {
      slug: "securite-sante",
      title: "Sécurité et santé",
      content: [
        "La Suisse est l'un des pays les plus sûrs d'Europe, avec une criminalité très faible, y compris dans les grandes villes et en soirée.",
        "L'eau du robinet est potable et de très bonne qualité partout dans le pays, y compris dans les fontaines publiques des villes — il est inutile d'acheter de l'eau en bouteille.",
        "Une assurance voyage couvrant les frais médicaux est vivement recommandée : les soins de santé suisses sont d'excellente qualité mais parmi les plus chers d'Europe, surtout hors couverture d'assurance locale.",
        "En cas d'urgence, composez le 144 (ambulance), le 117 (police) ou le 118 (pompiers) ; le 112 fonctionne aussi comme numéro d'urgence européen général.",
        "En montagne ou en randonnée, informez-vous sur la météo locale avant de partir : les conditions peuvent changer très vite, même en été, au-dessus de 2 000 mètres.",
      ].join("\n"),
    },
    {
      slug: "langues-usages",
      title: "Langues et usages",
      content: [
        "La Suisse compte quatre langues nationales — l'allemand (environ 62 % de la population), le français (23 %), l'italien (8 %) et le romanche (moins de 1 %) — réparties par régions linguistiques plutôt que mélangées partout.",
        "En Suisse alémanique (Zurich, Bâle, Berne...), la langue parlée au quotidien est le suisse-allemand, un dialecte oral assez éloigné de l'allemand standard appris à l'école — l'allemand écrit reste néanmoins compris et utilisé pour l'affichage.",
        "L'anglais est largement parlé dans les zones touristiques et les grandes villes, un bon recours si le français ou l'allemand standard ne suffisent pas.",
        "La ponctualité et le respect scrupuleux des horaires et files d'attente sont des valeurs sociales fortes, qu'il s'agisse des transports ou des rendez-vous.",
        "Le recyclage et le tri des déchets sont pris très au sérieux : des sacs-taxes officiels sont souvent obligatoires pour les ordures ménagères, un détail qui concerne surtout les séjours en location.",
      ].join("\n"),
    },
  ];

  for (let i = 0; i < kitSections.length; i++) {
    const s = kitSections[i];
    await prisma.kitSection.upsert({
      where: { countryId_slug: { countryId: suisse.id, slug: s.slug } },
      update: { title: s.title, content: s.content, sortOrder: i, status: "PUBLISHED" },
      create: {
        countryId: suisse.id,
        slug: s.slug,
        title: s.title,
        content: s.content,
        sortOrder: i,
        status: "PUBLISHED",
      },
    });
    console.log("  kit section:", s.title);
  }

  console.log("Suisse kit essentiel seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
