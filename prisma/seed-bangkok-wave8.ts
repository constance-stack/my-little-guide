/**
 * Eighth content wave: the "Expériences insolites" and "Activités en
 * famille" entries that are specific, existence-verified places rather
 * than bookable experiences needing a provider (cooking classes, Muay
 * Thai lessons, ceramics workshops — still deferred, per the brief's own
 * "sélectionner et vérifier un prestataire précis" note).
 *
 * Each place's current operating status was checked via web search
 * before writing (see conversation) — notably Siam Amazing Park is
 * EXCLUDED here because it's closed indefinitely after September 2026
 * flood damage, confirmed via recent news coverage.
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
  "/private/tmp/claude-501/-Users-constance/8b5fbae2-2d1e-4365-aae7-917e8137a620/scratchpad/photos_wave8";
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
    slug: "baan-silapin",
    name: "Baan Silapin (Khlong Bang Luang Artist House)",
    zone: "thonburi",
    categories: ["experiences-insolites", "quartiers-balades"],
    lat: 13.7322,
    lng: 100.479,
    description:
      "Au bord du canal Khlong Bang Luang, cette ancienne maison de bois réunit ateliers d'artistes, galerie et café, et accueille traditionnellement une petite troupe de marionnettes thaïes (hun lakhon lek) qui se produit certains jours de la semaine. L'ensemble reste géré par une communauté locale attachée à préserver l'identité du quartier face à l'urbanisation.",
    whyVisit: "Une pause artistique et locale au fil de l'eau, loin des grands sites touristiques, dans un cadre qui a gardé son caractère de canal traditionnel.",
    littleTip: "Les horaires du spectacle de marionnettes varient selon les sources et la disponibilité de la troupe — considérez-le comme un bonus possible plutôt qu'une certitude, et profitez de la maison et du canal même en son absence.",
    indicativeDuration: "45 min à 1h",
    photoKey: "baan-silapin",
    altText: "Le canal Khlong Bang Luang bordé de maisons en bois traditionnelles près de Baan Silapin, Bangkok",
  },
  {
    slug: "rajadamnern-stadium",
    name: "Rajadamnern Stadium",
    zone: "rattanakosin-banglamphu",
    categories: ["experiences-insolites", "vie-nocturne"],
    lat: 13.7598,
    lng: 100.4998,
    description:
      "Le plus ancien stade de Muay Thai encore en activité à Bangkok, ouvert en 1945 sur l'avenue Ratchadamnoen. Les soirées de combat, rythmées par la musique traditionnelle sarama jouée en direct, mêlent spectateurs locaux passionnés et touristes venus découvrir ce sport national dans un lieu chargé d'histoire.",
    whyVisit: "L'endroit le plus authentique pour assister à une soirée de Muay Thai à Bangkok, dans un stade historique plutôt qu'une salle montée pour les touristes.",
    littleTip: "Les soirées et les types de programme (combats classiques, format Knockout) varient selon les jours de la semaine — vérifiez le calendrier et réservez avant de vous déplacer.",
    indicativeDuration: "2h à 3h, en soirée",
    photoKey: "rajadamnern-stadium",
    altText: "Façade jaune du stade historique de Muay Thai Rajadamnern à Bangkok",
  },
  {
    slug: "ko-kret",
    name: "Ko Kret",
    zone: "thonburi",
    categories: ["experiences-insolites", "excursions"],
    lat: 13.9089,
    lng: 100.4817,
    description:
      "Une petite île fluviale artificielle, formée par le creusement d'un canal au XVIIIe siècle, à la limite nord de l'agglomération de Bangkok (dans la province voisine de Nonthaburi). Sans voiture ni presque aucune route goudronnée, elle a conservé un artisanat de poterie mône traditionnel et une atmosphère rurale rare à si peu de distance du centre-ville.",
    whyVisit: "Une échappée complète du rythme urbain, accessible en une demi-journée, pour découvrir une poterie artisanale toujours vivante.",
    littleTip: "L'île se visite uniquement à pied ou à vélo — prévoyez le temps du trajet en bateau depuis Bangkok, assez long, en plus de la visite elle-même.",
    indicativeDuration: "demi-journée",
    photoKey: "ko-kret",
    altText: "Chedi blanc incliné au bord du fleuve sur l'île de Ko Kret, près de Bangkok",
  },
  {
    slug: "talat-phlu-market",
    name: "Talat Phlu",
    zone: "thonburi",
    categories: ["street-food", "marches"],
    lat: 13.7196,
    lng: 100.4789,
    description:
      "Un marché et un quartier de street food de Thonburi, récemment rénové, réputé pour ses spécialités chinoises-thaïes : riz au porc char siu, nouilles, raviolis à la ciboulette et desserts traditionnels, servis par des commerces parfois installés depuis plusieurs générations. Moins connu que Chinatown, il reste fréquenté avant tout par les habitants du quartier.",
    whyVisit: "Une scène de street food locale et authentique, à l'écart des circuits touristiques, facilement accessible par le MRT Talat Phlu.",
    littleTip: "Le quartier a rouvert après rénovation début 2025 — certaines échoppes historiques ont pu changer d'emplacement, mieux vaut explorer plutôt que chercher une adresse précise.",
    indicativeDuration: "1h à 1h30",
    photoKey: "talat-phlu",
    altText: "Étal de fruits frais au marché de Talat Phlu à Bangkok",
  },
  {
    slug: "sea-life-bangkok",
    name: "SEA LIFE Bangkok Ocean World",
    zone: "siam-chit-lom",
    categories: ["activites-famille"],
    lat: 13.746,
    lng: 100.5342,
    description:
      "L'un des plus grands aquariums d'Asie du Sud-Est, installé sur deux niveaux en sous-sol du centre commercial Siam Paragon. Tunnel sous-marin à 270°, requins, hippocampes et pingouins font partie des attractions d'un parcours pensé pour les familles, en plein cœur du quartier commerçant de Siam.",
    whyVisit: "Une sortie en famille facile d'accès (directement sous un centre commercial du BTS Siam) et une bonne option par temps de pluie.",
    littleTip: "L'entrée se trouve au niveau sous-sol de Siam Paragon — repérez les panneaux \"SEA LIFE\" près des escalators plutôt que de chercher une entrée extérieure.",
    indicativeDuration: "1h30 à 2h",
    photoKey: "sea-life-bangkok",
    altText: "Hippocampe parmi les algues dans un bassin de SEA LIFE Bangkok Ocean World",
  },
  {
    slug: "childrens-discovery-museum",
    name: "Children's Discovery Museum",
    zone: "ari",
    categories: ["activites-famille"],
    lat: 13.8103,
    lng: 100.5513,
    description:
      "Un musée gratuit et interactif pour les enfants d'environ 2 à 12 ans, installé dans Queen Sirikit Park à Chatuchak. Expositions pratiques sur les sciences, la nature et le corps humain, pensées pour être manipulées plutôt que simplement regardées.",
    whyVisit: "Une activité gratuite et ludique à combiner avec une visite des parcs voisins (Chatuchak, Queen Sirikit) ou du marché du week-end.",
    littleTip: "Fermé le lundi — vérifiez les horaires avant de vous déplacer, ils peuvent varier.",
    indicativeDuration: "1h à 1h30",
    photoKey: "childrens-discovery-museum",
    altText: "Exposition de fossile reconstitué au Children's Discovery Museum de Bangkok",
  },
  {
    slug: "bangkok-planetarium",
    name: "Bangkok Planetarium (Science Centre for Education)",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["activites-famille", "culture-musees"],
    lat: 13.7217,
    lng: 100.5831,
    description:
      "Un centre scientifique public près du terminal de bus Ekkamai, organisé autour d'un planétarium reconnaissable à son grand dôme. Expositions sur l'astronomie, les sciences naturelles et un espace dinosaures complètent la visite, pensée pour un public familial.",
    whyVisit: "Une activité éducative pour les familles, à l'écart des grands sites touristiques, bien desservie par le BTS Ekkamai.",
    littleTip: "Les séances du dôme planétarium lui-même dépendent d'un programme spécifique — vérifiez sa disponibilité avant de vous déplacer si c'est votre priorité, les autres espaces du centre restent ouverts indépendamment.",
    indicativeDuration: "1h à 2h",
    photoKey: "bangkok-planetarium",
    altText: "Façade du Bangkok Planetarium avec son dôme caractéristique et une réplique de module lunaire",
  },
  // Safari World intentionally removed (and deleted from the live DB): a
  // captive-animal park with recurring animal-welfare criticism, not the
  // kind of place this guide recommends — see the Chiang Mai equivalent
  // decision in seed-chiangmai.ts for the same policy.
];

async function main() {
  console.log("Seeding Bangkok content wave 8 (expériences et famille)…");

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

  console.log("Wave 8 seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
