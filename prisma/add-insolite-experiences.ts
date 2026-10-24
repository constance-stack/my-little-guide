/**
 * Adds a small batch of real, well-documented "expériences insolites"
 * (cooking classes, art workshops) to existing destinations — additive,
 * not a full reseed. Follow-up to the user's request to look at what
 * kind of hands-on experiences sites like GetYourGuide surface, then
 * write original entries in the guide's own voice (no scraped copy, no
 * booking links/affiliate content — this isn't a booking platform).
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const isRemote = !process.env.DATABASE_URL?.includes("localhost");
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});
const prisma = new PrismaClient({ adapter });

type PlaceDef = {
  slug: string;
  name: string;
  destinationSlug: string;
  zoneSlug: string;
  categories: string[];
  lat: number;
  lng: number;
  description: string;
  whyVisit: string;
  littleTip: string;
  indicativeDuration?: string;
};

const PLACES: PlaceDef[] = [
  {
    slug: "silom-thai-cooking-school",
    name: "Silom Thai Cooking School",
    destinationSlug: "bangkok",
    zoneSlug: "silom-sathorn",
    categories: ["experiences-insolites", "restaurants"],
    lat: 13.7246, lng: 100.5325,
    description: "Une école de cuisine dans le quartier de Silom, dont la séance démarre par une visite guidée d'un marché local avant de cuisiner quatre plats thaïlandais du jour à son propre poste de travail.",
    whyVisit: "L'une des écoles de cuisine les plus recommandées de Bangkok, pour repartir avec de vraies techniques et pas seulement une recette.",
    littleTip: "La visite du marché en début de séance est aussi intéressante que la cuisine elle-même — posez des questions sur les ingrédients que vous ne reconnaissez pas.",
    indicativeDuration: "3h à 4h",
  },
  {
    slug: "pcha-fine-art-studio",
    name: "PCHA Fine Art Studio",
    destinationSlug: "bangkok",
    zoneSlug: "sukhumvit-asok-phrom-phong",
    categories: ["experiences-insolites"],
    lat: 13.7194, lng: 100.5853,
    description: "Un atelier de céramique dans le quartier d'Ekkamai, où l'on façonne sa pièce à la main ou au tour avant qu'elle ne soit cuite et prête à récupérer quelques semaines plus tard.",
    whyVisit: "Une activité créative et tactile, pour varier des visites de temples et des marchés.",
    littleTip: "La pièce finie n'est prête que plusieurs semaines après cuisson — à prévoir si vous comptez repartir avec, sinon certains ateliers proposent un envoi postal.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "grandmas-home-cooking-school",
    name: "Grandma's Home Cooking School",
    destinationSlug: "chiang-mai",
    zoneSlug: "excursions-cm",
    categories: ["experiences-insolites", "restaurants"],
    lat: 18.830, lng: 99.030,
    description: "Une école de cuisine familiale aux abords de Chiang Mai, en petit groupe, dont la séance inclut généralement une visite de marché et un passage dans une ferme biologique avant de cuisiner.",
    whyVisit: "Une des écoles de cuisine les plus appréciées de la région de Chiang Mai, dans un cadre familial et en petit groupe.",
    littleTip: "Les groupes sont volontairement limités à une petite dizaine de participants — réservez à l'avance en haute saison.",
    indicativeDuration: "demi-journée",
  },
  {
    slug: "chiang-mai-thai-painting-workshop",
    name: "Atelier de peinture traditionnelle thaïe",
    destinationSlug: "chiang-mai",
    zoneSlug: "old-city",
    categories: ["experiences-insolites"],
    lat: 18.790, lng: 98.985,
    description: "Un atelier de peinture avec un artiste local dans la vieille ville, qui initie aux motifs traditionnels thaïlandais (lai thai) et à la symbolique derrière chaque dessin.",
    whyVisit: "Une façon originale de comprendre l'art et les symboles thaïlandais, au-delà de la simple observation dans les temples.",
    littleTip: "Le matériel est généralement fourni sur place — aucune expérience artistique préalable n'est nécessaire.",
    indicativeDuration: "2h",
  },
];

async function main() {
  console.log("Adding insolite experience places…");
  for (const def of PLACES) {
    const destination = await prisma.destination.findUniqueOrThrow({ where: { slug: def.destinationSlug } });
    const zone = await prisma.zone.findUniqueOrThrow({
      where: { destinationId_slug: { destinationId: destination.id, slug: def.zoneSlug } },
    });
    const place = await prisma.place.upsert({
      where: { slug: def.slug },
      update: {
        name: def.name, destinationId: destination.id, zoneId: zone.id, status: "PUBLISHED",
        lat: def.lat, lng: def.lng, description: def.description, whyVisit: def.whyVisit,
        littleTip: def.littleTip, indicativeDuration: def.indicativeDuration, isFictionalDemo: false,
      },
      create: {
        slug: def.slug, destinationId: destination.id, zoneId: zone.id, name: def.name,
        status: "PUBLISHED", lat: def.lat, lng: def.lng, description: def.description,
        whyVisit: def.whyVisit, littleTip: def.littleTip, indicativeDuration: def.indicativeDuration,
        isFictionalDemo: false,
      },
    });

    await prisma.placeCategory.deleteMany({ where: { placeId: place.id } });
    for (const catSlug of def.categories) {
      const cat = await prisma.category.findUniqueOrThrow({ where: { slug: catSlug } });
      await prisma.placeCategory.create({ data: { placeId: place.id, categoryId: cat.id } });
    }
    console.log("  place:", def.name, "->", def.destinationSlug);
  }
  console.log(`Done: ${PLACES.length} places added/updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
