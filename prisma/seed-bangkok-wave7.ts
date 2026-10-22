/**
 * Seventh content wave: the remaining "Marchés" from the brief
 * (Chatuchak and Pak Khlong Talat already seeded in earlier waves).
 * Existence and general activity verified via web search before writing
 * — hours vary by source for all five, so none are stated as precise
 * facts here, per the no-fabricated-data rule.
 */
import { mkdir, copyFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const isRemote = !process.env.DATABASE_URL?.includes("localhost");
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});
const prisma = new PrismaClient({ adapter });

const PHOTOS_DIR =
  "/private/tmp/claude-501/-Users-constance/8b5fbae2-2d1e-4365-aae7-917e8137a620/scratchpad/photos_wave7";
const STORAGE_ROOT = process.env.STORAGE_ROOT ?? "./storage";

type PhotoManifestEntry = {
  key: string;
  found: boolean;
  title: string;
  artist: string;
  license: string;
  source_url: string;
  local_path: string;
};

type PlaceDef = {
  slug: string;
  name: string;
  zone: string;
  categories: string[];
  lat: number;
  lng: number;
  description: string;
  whyVisit: string;
  littleTip: string;
  indicativeDuration?: string;
  photoKey: string;
  altText: string;
};

const PLACES: PlaceDef[] = [
  {
    slug: "sampeng-lane",
    name: "Sampeng Lane",
    zone: "chinatown-talat-noi",
    categories: ["marches", "shopping"],
    lat: 13.7407,
    lng: 100.5047,
    description:
      "Une étroite ruelle commerçante qui traverse Chinatown sur toute sa longueur, spécialisée dans la vente en gros : tissus, rubans, bijoux fantaisie, jouets, accessoires de téléphone, articles de fête. D'anciennes mobylettes chargées de rouleaux de tissu continuent de se faufiler entre les piétons pour livrer les boutiques du quartier.",
    whyVisit: "Une immersion dans le Chinatown commerçant, loin des attractions touristiques, pour qui aime fouiner dans un vrai marché de gros.",
    littleTip: "La plupart des boutiques vendent par lot plutôt qu'à l'unité — demandez avant de choisir si vous cherchez une seule pièce.",
    indicativeDuration: "30 à 45 min",
    photoKey: "sampeng-market",
    altText: "Ruelle étroite et animée du marché de gros Sampeng Lane à Chinatown, Bangkok",
  },
  {
    slug: "pratunam-market",
    name: "Pratunam Market",
    zone: "pratunam",
    categories: ["marches", "shopping"],
    lat: 13.7514,
    lng: 100.5402,
    description:
      "Le grand marché de vêtements du quartier de Pratunam, organisé en plusieurs bâtiments et étals de rue autour de la tour Baiyoke. Contrairement à Chatuchak, ouvert uniquement le week-end, Pratunam fonctionne tous les jours — un repère pour les acheteurs professionnels comme pour les touristes en quête de shopping à petit prix.",
    whyVisit: "Une alternative à Chatuchak pour le shopping vêtements, ouverte tous les jours de la semaine.",
    littleTip: "Les meilleurs prix s'obtiennent souvent par lots de plusieurs pièces — pour un achat à l'unité, les prix restent corrects mais moins avantageux.",
    indicativeDuration: "45 min à 1h",
    photoKey: "pratunam-market",
    altText: "Le quartier commerçant animé de Pratunam Market à Bangkok avec ses immeubles de vente en gros",
  },
  {
    slug: "khlong-toei-market",
    name: "Khlong Toei Market",
    zone: "silom-sathorn",
    categories: ["marches"],
    lat: 13.722,
    lng: 100.5557,
    description:
      "L'un des plus grands marchés de gros alimentaires de Bangkok, où transitent chaque jour fruits, légumes, poissons et viandes pour une bonne partie des restaurants de la ville. L'ambiance y est brute et authentique, à des années-lumière des marchés touristiques — un lieu de travail avant tout, où se croisent porteurs, grossistes et petits commerçants.",
    whyVisit: "Un aperçu sans filtre de la logistique alimentaire qui nourrit Bangkok, pour les voyageurs curieux de street photography et d'ambiance locale brute.",
    littleTip: "L'activité est la plus intense tôt le matin — venez avec des chaussures fermées, le sol est humide et parfois glissant.",
    indicativeDuration: "30 à 45 min, idéalement tôt le matin",
    photoKey: "khlong-toei-market",
    altText: "Déchargement de marchandises au marché de gros Khlong Toei à Bangkok",
  },
  {
    slug: "taling-chan-floating-market",
    name: "Taling Chan Floating Market",
    zone: "thonburi",
    categories: ["marches", "street-food"],
    lat: 13.7733,
    lng: 100.4575,
    description:
      "Un marché flottant de week-end organisé par le district de Taling Chan sur un canal de Thonburi, où des bateaux chargés de fruits et de plats préparés accostent le long de pontons en bois. Plus modeste et moins mis en scène que les marchés flottants plus célèbres et plus éloignés (Damnoen Saduak), il reste fréquenté surtout par des habitants de Bangkok le week-end.",
    whyVisit: "Une expérience de marché flottant accessible en une demi-journée depuis le centre, sans l'excursion de plusieurs heures que demandent les marchés flottants plus connus.",
    littleTip: "Ouvert uniquement le week-end — vérifiez les horaires avant de vous déplacer, ils varient selon les sources et peuvent évoluer.",
    indicativeDuration: "1h à 1h30, le week-end",
    photoKey: "taling-chan-floating-market",
    altText: "Bateaux de vendeurs amarrés le long des pontons du marché flottant de Taling Chan à Bangkok",
  },
  {
    slug: "khlong-lat-mayom-market",
    name: "Khlong Lat Mayom Floating Market",
    zone: "thonburi",
    categories: ["marches", "street-food"],
    lat: 13.7756,
    lng: 100.4162,
    description:
      "Un autre marché flottant de week-end sur les canaux de Thonburi, réputé pour son ambiance décontractée et sa street food servie en bordure de canal plutôt que depuis les bateaux eux-mêmes. Très fréquenté par les familles de Bangkok le week-end, il reste nettement moins touristique que les marchés flottants les plus connus du pays.",
    whyVisit: "Une alternative locale et gourmande à Taling Chan, pour prolonger la découverte des canaux de Thonburi.",
    littleTip: "Ouvert uniquement le week-end et les jours fériés — le trajet depuis le centre prend du temps, mieux vaut le combiner avec une autre visite du côté de Thonburi.",
    indicativeDuration: "1h à 1h30, le week-end",
    photoKey: "khlong-lat-mayom-market",
    altText: "Canal bordé d'échoppes couvertes et de bateaux au marché flottant de Khlong Lat Mayom, Bangkok",
  },
];

async function main() {
  console.log("Seeding Bangkok content wave 7 (marchés restants)…");

  const bangkok = await prisma.destination.findUniqueOrThrow({ where: { slug: "bangkok" } });
  const manifest: PhotoManifestEntry[] = JSON.parse(await readFile(`${PHOTOS_DIR}/manifest.json`, "utf-8"));
  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  const zones = await prisma.zone.findMany({ where: { destinationId: bangkok.id } });
  const zoneBySlug = new Map(zones.map((z) => [z.slug, z]));

  for (const def of PLACES) {
    const manifestEntry = manifest.find((m) => m.key === def.photoKey && m.found);
    if (!manifestEntry) {
      console.log(`  SKIP ${def.slug}: no photo in manifest`);
      continue;
    }

    const ext = manifestEntry.local_path.split(".").pop() || "jpg";
    const storageKey = `photos/${def.slug}.${ext}`;
    const destPath = join(STORAGE_ROOT, storageKey);
    await mkdir(dirname(destPath), { recursive: true });
    await copyFile(manifestEntry.local_path, destPath);

    const artist = manifestEntry.artist.split("\n")[0].replace(/Feel free to.*/i, "").trim();
    const photoStorageKey = `/api/storage/${storageKey}`;
    const existingPhoto = await prisma.photo.findFirst({ where: { storageKey: photoStorageKey } });
    const photoData = {
      storageKey: photoStorageKey,
      photographer: artist || "Non attribué (licence le permettant)",
      sourceName: "Wikimedia Commons",
      sourceUrl: manifestEntry.source_url,
      licenseType: manifestEntry.license,
      verifiedAt: new Date(),
      commercialOk: true,
      attributionText: artist ? `Photo : ${artist}, via Wikimedia Commons (${manifestEntry.license})` : null,
      altText: def.altText,
    };
    const photo = existingPhoto
      ? await prisma.photo.update({ where: { id: existingPhoto.id }, data: photoData })
      : await prisma.photo.create({ data: photoData });

    const zone = zoneBySlug.get(def.zone);
    const place = await prisma.place.upsert({
      where: { slug: def.slug },
      update: {
        name: def.name,
        zoneId: zone?.id,
        description: def.description,
        whyVisit: def.whyVisit,
        littleTip: def.littleTip,
        indicativeDuration: def.indicativeDuration,
        isFictionalDemo: false,
      },
      create: {
        slug: def.slug,
        destinationId: bangkok.id,
        zoneId: zone?.id,
        name: def.name,
        status: "PUBLISHED",
        lat: def.lat,
        lng: def.lng,
        description: def.description,
        whyVisit: def.whyVisit,
        littleTip: def.littleTip,
        indicativeDuration: def.indicativeDuration,
        isFictionalDemo: false,
      },
    });

    await prisma.placeCategory.deleteMany({ where: { placeId: place.id } });
    for (const catSlug of def.categories) {
      const cat = categoryBySlug.get(catSlug);
      if (cat) await prisma.placeCategory.create({ data: { placeId: place.id, categoryId: cat.id } });
    }

    await prisma.placePhoto.deleteMany({ where: { placeId: place.id } });
    await prisma.placePhoto.create({ data: { placeId: place.id, photoId: photo.id, sortOrder: 0 } });

    console.log("  place:", def.name);
  }

  console.log("Wave 7 seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
