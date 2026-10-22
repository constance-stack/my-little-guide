/**
 * Fifth content wave: the editorial brief's "Nature et parcs" list.
 * Benjakitti Forest Park is already seeded (wave 1) — it gets the
 * nature-randonnees tag added here rather than a duplicate entry.
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
  "/private/tmp/claude-501/-Users-constance/8b5fbae2-2d1e-4365-aae7-917e8137a620/scratchpad/photos_wave5";
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
    slug: "lumphini-park",
    name: "Lumphini Park",
    zone: "silom-sathorn",
    categories: ["nature-randonnees", "quartiers-balades"],
    lat: 13.7308,
    lng: 100.5418,
    description:
      "Le plus célèbre parc urbain de Bangkok, avec son grand lac central où l'on peut louer des pédalos, ses allées ombragées très fréquentées par les joggeurs tôt le matin et en fin de journée, et sa population de varans d'eau qui vivent en liberté dans le parc depuis des décennies. Entouré par les gratte-ciel de Silom et Sathorn, le contraste entre nature et skyline y est saisissant.",
    whyVisit: "Le poumon vert historique de Bangkok, idéal pour une pause ou une sortie sportive en plein cœur du quartier d'affaires.",
    littleTip: "Les varans d'eau (proches des dragons de Komodo, mais inoffensifs pour l'homme s'ils ne sont pas dérangés) sont une attraction en soi — gardez une distance respectueuse et ne les nourrissez pas.",
    indicativeDuration: "45 min à 1h30",
    photoKey: "lumphini-park",
    altText: "Vue sur Lumphini Park avec ses fontaines et les gratte-ciel de Bangkok en arrière-plan",
  },
  {
    slug: "chatuchak-park",
    name: "Chatuchak Park",
    zone: "ari",
    categories: ["nature-randonnees"],
    lat: 13.8038,
    lng: 100.5538,
    description:
      "Juste à côté du célèbre marché du même nom, Chatuchak Park est un grand espace vert organisé autour d'un lac, avec des pistes cyclables et de jogging. Beaucoup plus tranquille que le marché voisin, c'est une bonne option pour se reposer après plusieurs heures de shopping dans les allées de Chatuchak.",
    whyVisit: "Une pause verte à deux pas du marché, pratique pour couper la journée en deux.",
    littleTip: "Le parc loue des vélos à la journée — une façon agréable de rejoindre ensuite les parcs voisins (Queen Sirikit Park et Wachirabenchathat Park) qui forment avec lui un vaste ensemble vert continu.",
    indicativeDuration: "30 à 45 min",
    photoKey: "chatuchak-park",
    altText: "Lac et pelouses de Chatuchak Park avec la skyline de Bangkok en arrière-plan",
  },
  {
    slug: "queen-sirikit-park",
    name: "Queen Sirikit Park",
    zone: "ari",
    categories: ["nature-randonnees"],
    lat: 13.8103,
    lng: 100.5524,
    description:
      "Contigu à Chatuchak Park, ce parc à vocation plus botanique rassemble une collection variée d'arbres et de plantes tropicales étiquetées, dans un cadre plus calme et moins fréquenté que ses voisins. Il fait partie du même grand ensemble vert du nord de Bangkok, aménagé à l'origine pour le jubilé royal.",
    whyVisit: "Un parc plus posé et moins fréquenté pour les amateurs de botanique, à combiner facilement avec Chatuchak Park et le marché voisin.",
    littleTip: "Les trois parcs contigus (Chatuchak, Queen Sirikit, Wachirabenchathat) se visitent sans couture d'un seul tenant à pied ou à vélo — pas besoin de ressortir et rentrer à chaque fois.",
    indicativeDuration: "30 à 45 min",
    photoKey: "queen-sirikit-park",
    altText: "Végétation tropicale et pelouse dans Queen Sirikit Park à Bangkok",
  },
  {
    slug: "wachirabenchathat-park",
    name: "Wachirabenchathat Park (Rot Fai Park)",
    zone: "ari",
    categories: ["nature-randonnees"],
    lat: 13.8155,
    lng: 100.5545,
    description:
      "Le plus grand des parcs du nord de Bangkok, aménagé sur l'ancien terrain de la gare de triage des chemins de fer thaïlandais (d'où son surnom de \"Rot Fai Park\", littéralement \"parc du train\"). Jardins thématiques, étangs, ponts et larges pelouses en font un lieu particulièrement apprécié pour le vélo et le pique-nique en famille.",
    whyVisit: "Le plus vaste et le plus varié des parcs du secteur, avec suffisamment d'espace pour une vraie sortie à vélo plutôt qu'une simple promenade.",
    littleTip: "La location de vélos sur place permet de couvrir facilement l'ensemble des trois parcs contigus en une seule sortie.",
    indicativeDuration: "1h à 2h",
    photoKey: "rot-fai-park",
    altText: "Jardin de pierres et étang dans Wachirabenchathat Park (Rot Fai Park) à Bangkok",
  },
  {
    slug: "bang-krachao",
    name: "Bang Krachao",
    zone: "riverside",
    categories: ["nature-randonnees", "experiences-insolites"],
    lat: 13.6897,
    lng: 100.5469,
    description:
      "Surnommé le \"poumon vert\" de Bangkok, Bang Krachao occupe une boucle du Chao Phraya restée volontairement non urbanisée malgré sa proximité immédiate avec le centre-ville. Jardins, petits temples, cafés cachés et pistes cyclables serpentent entre les cocotiers, offrant un contraste total avec le reste de la ville à seulement quelques minutes de bateau.",
    whyVisit: "L'une des échappées les plus dépaysantes possibles depuis le centre de Bangkok, sans quitter les limites de la ville.",
    littleTip: "On y accède par un petit bateau-navette depuis plusieurs pontons (dont Khlong Toei) — la traversée elle-même, courte et pittoresque, fait déjà partie de l'expérience.",
    indicativeDuration: "2h à 4h, idéalement à vélo",
    photoKey: "bang-krachao",
    altText: "Lac entouré de végétation tropicale dans le parc Sri Nakhon Khuean Khan à Bang Krachao, Bangkok",
  },
  {
    slug: "chula-centenary-park",
    name: "Chulalongkorn University Centenary Park",
    zone: "siam-chit-lom",
    categories: ["nature-randonnees"],
    lat: 13.7368,
    lng: 100.5276,
    description:
      "Créé pour le centenaire de l'université Chulalongkorn, ce parc au design contemporain se distingue par sa grande pelouse inclinée, conçue pour absorber les eaux de pluie et limiter les inondations du quartier. Les toits-jardins des bâtiments environnants et la perspective sur les tours de Siam et Sam Yan en font un lieu particulièrement photogénique.",
    whyVisit: "Un parc au design urbain contemporain remarquable, à deux pas du quartier commerçant de Siam.",
    littleTip: "Montez jusqu'au sommet de la pelouse inclinée en fin d'après-midi pour une vue dégagée sur les tours environnantes, particulièrement belle à l'heure dorée.",
    indicativeDuration: "30 à 45 min",
    photoKey: "chula-centenary-park",
    altText: "La pelouse inclinée du Chulalongkorn University Centenary Park avec la skyline de Bangkok en fond",
  },
];

async function main() {
  console.log("Seeding Bangkok content wave 5 (nature et parcs)…");

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

  const benjakitti = await prisma.place.findUnique({ where: { slug: "benjakitti-forest-park" } });
  const nature = categoryBySlug.get("nature-randonnees");
  if (benjakitti && nature) {
    await prisma.placeCategory.upsert({
      where: { placeId_categoryId: { placeId: benjakitti.id, categoryId: nature.id } },
      update: {},
      create: { placeId: benjakitti.id, categoryId: nature.id },
    });
    console.log("  tagged benjakitti-forest-park as nature-randonnees");
  }

  console.log("Wave 5 seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
