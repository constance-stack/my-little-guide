/**
 * Koh Samui & Koh Phangan was seeded conservatively (46 places) to stay
 * on well-documented ground. Adds 9 more real, well-documented places —
 * still none fabricated — to push it past the 50-place pricing tier, per
 * the user's "tu n'arrives pas à dépasser les 50 lieux ?" follow-up.
 * Additive, not a reseed.
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
    slug: "wang-sai-thong-waterfall",
    name: "Wang Sai Thong",
    zoneSlug: "sud-samui",
    categories: ["quartiers-balades"],
    lat: 9.430, lng: 99.950,
    description: "Une cascade peu connue du sud-ouest de Koh Samui, à l'eau particulièrement claire, dans un cadre nettement plus tranquille que Na Muang.",
    whyVisit: "Une cascade confidentielle, pour qui a déjà vu Na Muang et cherche un site moins fréquenté.",
    littleTip: "Peu signalée depuis la route principale — mieux vaut repérer l'itinéraire à l'avance ou demander sur place.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "wat-samret",
    name: "Wat Samret",
    zoneSlug: "sud-samui",
    categories: ["temples-patrimoine"],
    lat: 9.460, lng: 99.960,
    description: "Un temple du sud de Koh Samui connu pour sa statue de Bouddha assis en marbre blanc, moins visité que les grands temples du nord de l'île.",
    whyVisit: "Un temple authentique et paisible, loin des circuits les plus touristiques.",
    littleTip: "Une tenue couvrant épaules et genoux reste de mise, comme dans tout temple en activité.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "taling-ngam-beach",
    name: "Taling Ngam Beach",
    zoneSlug: "sud-samui",
    categories: ["quartiers-balades"],
    lat: 9.510, lng: 99.930,
    description: "Une plage de la côte ouest de Koh Samui, nettement moins développée que les plages de l'est, avec vue sur le parc marin d'Ang Thong au loin par temps clair.",
    whyVisit: "L'une des plages les plus tranquilles et les moins touristiques de l'île.",
    littleTip: "Le coucher de soleil y est particulièrement dégagé, avec les îles d'Ang Thong en silhouette au loin.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "tan-rua-waterfall",
    name: "Tan Rua (Secret Falls)",
    zoneSlug: "lamai",
    categories: ["quartiers-balades", "experiences-insolites"],
    lat: 9.460, lng: 100.035,
    description: "Une cascade cachée dans la jungle près de Lamai, accessible par un sentier à travers une végétation dense, nettement moins fréquentée que les cascades principales de l'île.",
    whyVisit: "Une petite aventure en pleine jungle, à deux pas de Lamai.",
    littleTip: "Le sentier est peu balisé — prévoyez de bonnes chaussures et un peu de temps pour trouver l'accès.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "nakee-thai-massage",
    name: "Nakee Thai Massage",
    zoneSlug: "chaweng",
    categories: ["bien-etre-spas"],
    lat: 9.538, lng: 100.0605,
    description: "Un salon de massage traditionnel thaïlandais sur Chaweng Beach Road, apprécié pour son bon rapport qualité-prix et la régularité de ses massages.",
    whyVisit: "Une adresse fiable pour un massage traditionnel sans les tarifs des spas de resort.",
    littleTip: "Les massages aux pieds et le massage thaï traditionnel sont les spécialités les plus demandées.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "thong-nai-pan-noi",
    name: "Thong Nai Pan Noi",
    zoneSlug: "koh-phangan",
    categories: ["quartiers-balades"],
    lat: 9.780, lng: 100.045,
    description: "Une baie au nord-est de Koh Phangan, plus difficile d'accès que le sud de l'île, à l'ambiance paisible et nettement moins développée que Haad Rin.",
    whyVisit: "Une des plages les plus tranquilles du nord-est de Koh Phangan.",
    littleTip: "La route d'accès est sinueuse — mieux vaut un véhicule adapté ou un transfert organisé.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "thong-nai-pan-yai",
    name: "Thong Nai Pan Yai",
    zoneSlug: "koh-phangan",
    categories: ["quartiers-balades"],
    lat: 9.770, lng: 100.047,
    description: "La baie voisine de Thong Nai Pan Noi, légèrement plus grande et un peu plus équipée, partageant la même ambiance préservée du nord-est de l'île.",
    whyVisit: "Une alternative tout aussi préservée à Thong Nai Pan Noi, avec un peu plus de choix de restaurants.",
    littleTip: "Les deux baies de Thong Nai Pan se visitent facilement dans la même sortie, séparées par un seul promontoire.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "chaloklum-village",
    name: "Chaloklum",
    zoneSlug: "koh-phangan",
    categories: ["quartiers-balades", "marches"],
    lat: 9.775, lng: 99.995,
    description: "Un village de pêcheurs traditionnel au nord de Koh Phangan, autour d'une baie en croissant à l'eau peu profonde, avec un vrai marché de pêcheurs local et de bonnes adresses de fruits de mer.",
    whyVisit: "Un village de pêcheurs authentique, pour voir une facette de Koh Phangan loin de Haad Rin.",
    littleTip: "C'est aussi un bon point de départ pour la plongée libre, l'eau y est particulièrement claire.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "paradise-waterfall",
    name: "Paradise Waterfall",
    zoneSlug: "koh-phangan",
    categories: ["quartiers-balades"],
    lat: 9.760, lng: 100.010,
    description: "Une cascade facilement accessible non loin de la route menant à Chaloklum, dans le nord de Koh Phangan, plus impressionnante pendant la saison des pluies.",
    whyVisit: "Une cascade facile à combiner avec une visite de Chaloklum, au nord de l'île.",
    littleTip: "Le débit varie beaucoup selon la saison — à privilégier entre juillet et novembre.",
    indicativeDuration: "45 min à 1h",
  },
];

async function main() {
  console.log("Adding more Koh Samui & Koh Phangan places…");

  const destination = await prisma.destination.findUniqueOrThrow({ where: { slug: "koh-samui-koh-phangan" } });

  // Nakee Thai Massage needs "bien-etre-spas" enabled on the destination
  // (controls which category checkboxes the admin place-edit form shows),
  // which the original seed didn't include.
  const spaCategory = await prisma.category.findUniqueOrThrow({ where: { slug: "bien-etre-spas" } });
  await prisma.destination.update({
    where: { id: destination.id },
    data: { categories: { connect: { id: spaCategory.id } } },
  });

  for (const def of PLACES) {
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
    console.log("  place:", def.name);
  }

  const total = await prisma.place.count({ where: { destinationId: destination.id, status: "PUBLISHED" } });
  console.log(`Done: ${PLACES.length} places added. Destination total: ${total} places.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
