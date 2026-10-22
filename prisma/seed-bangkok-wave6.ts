/**
 * Sixth content wave: the remaining street-level "Quartiers et balades"
 * from the brief that aren't already covered by an existing zone or place
 * (Rattanakosin, Chinatown/Yaowarat, Talat Noi, Kudi Chin, Ari, Siam are
 * all zone-level or already-seeded places).
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
  "/private/tmp/claude-501/-Users-constance/8b5fbae2-2d1e-4365-aae7-917e8137a620/scratchpad/photos_wave6";
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
    slug: "song-wat-road",
    name: "Song Wat Road",
    zone: "chinatown-talat-noi",
    categories: ["quartiers-balades", "cafes-brunchs"],
    lat: 13.7389,
    lng: 100.5083,
    description:
      "Parallèle au fleuve, Song Wat Road était autrefois le centre du commerce de gros de Chinatown — épices, thé, produits secs. D'anciens entrepôts et maisons de commerce chinoises y sont progressivement réinvestis par des cafés de spécialité et de petites galeries, créant un contraste intéressant entre activité commerciale traditionnelle et nouvelle génération de commerces.",
    whyVisit: "Un visage différent de Chinatown, moins touristique que Yaowarat, où patrimoine commercial et renouveau urbain se côtoient.",
    littleTip: "C'est aussi l'une des rues les plus simples pour observer le fleuve et les anciens entrepôts sans la foule de Yaowarat le soir.",
    indicativeDuration: "45 min à 1h",
    photoKey: "song-wat-road",
    altText: "La rue Song Wat Road à Chinatown, Bangkok, bordée de bâtiments commerciaux anciens",
  },
  {
    slug: "khlong-bang-luang",
    name: "Khlong Bang Luang",
    zone: "thonburi",
    categories: ["quartiers-balades", "experiences-insolites"],
    lat: 13.7324,
    lng: 100.4785,
    description:
      "Un canal traditionnel de Thonburi bordé de maisons en bois sur pilotis, resté largement préservé de l'urbanisation qui a transformé la rive opposée. La communauté locale y organise un petit marché flottant artisanal le week-end, et plusieurs maisons-ateliers d'artistes se visitent le long du canal.",
    whyVisit: "Un aperçu du Bangkok fluvial d'autrefois, avec une atmosphère nettement plus authentique que les marchés flottants plus connus et plus éloignés de la ville.",
    littleTip: "Le marché flottant artisanal n'a lieu que le week-end — en semaine, le canal reste charmant mais nettement plus calme, presque désert.",
    indicativeDuration: "1h à 1h30",
    photoKey: "khlong-bang-luang",
    altText: "Bateaux traditionnels naviguant sur le canal Khlong Bang Luang, bordé de maisons en bois à Bangkok",
  },
  {
    slug: "banthat-thong-road",
    name: "Banthat Thong Road",
    zone: "siam-chit-lom",
    categories: ["street-food", "quartiers-balades"],
    lat: 13.7458,
    lng: 100.5276,
    description:
      "Une rue bordée d'étals de street food et de petits restaurants, fréquentée surtout par les étudiants des universités voisines (Chulalongkorn, Rangsit) — gage de prix serrés et de bonne qualité. L'ambiance monte nettement en soirée, quand la majorité des étals et restaurants ouvrent pour le service du dîner.",
    whyVisit: "Une alternative plus locale et moins touristique aux rues de street food plus connues, à deux pas du quartier de Siam.",
    littleTip: "La rue est relativement calme en journée — prévoyez d'y passer en soirée, quand la plupart des étals de street food sont réellement en activité.",
    indicativeDuration: "1h à 1h30, en soirée",
    photoKey: "banthat-thong-road",
    altText: "La rue Banthat Thong à Bangkok de nuit, bordée de commerces",
  },
];

async function main() {
  console.log("Seeding Bangkok content wave 6 (balades complémentaires)…");

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

  console.log("Wave 6 seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
