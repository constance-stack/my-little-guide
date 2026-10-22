/**
 * Twelfth content wave: the remaining "Street food" entries from the
 * brief (Yaowarat Road, Thipsamai, Raan Jay Fai, Banthat Thong Road
 * already seeded in earlier waves).
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
  "/private/tmp/claude-501/-Users-constance/8b5fbae2-2d1e-4365-aae7-917e8137a620/scratchpad/photos_wave12";
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
  photoKey?: string;
  altText?: string;
};

const PLACES: PlaceDef[] = [
  {
    slug: "nai-ek-roll-noodles",
    name: "Nai Ek Roll Noodles",
    zone: "chinatown-talat-noi",
    categories: ["street-food"],
    lat: 13.7398,
    lng: 100.5109,
    description:
      "Une échoppe de Yaowarat installée dans ses murs actuels depuis 1989, spécialisée dans le guay jub : une soupe de nouilles de riz roulées au bouillon poivré, servie avec du porc croustillant. Distinguée par un Bib Gourmand au Guide Michelin, c'est l'une des adresses de référence pour ce plat emblématique de Chinatown.",
    whyVisit: "Le guay jub le plus réputé de Chinatown, dans une échoppe ouverte depuis des décennies.",
    littleTip: "Commandez le porc croustillant en supplément si ce n'est pas déjà inclus — c'est la garniture classique de ce plat.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "guay-jub-ouan-pochana",
    name: "Guay Jub Ouan Pochana",
    zone: "chinatown-talat-noi",
    categories: ["street-food"],
    lat: 13.7397,
    lng: 100.5105,
    description:
      "Une autre adresse historique de guay jub sur Yaowarat Road, installée face à l'ancien cinéma China Town Rama, et distinguée elle aussi par un Bib Gourmand Michelin. Sa rivalité amicale avec Nai Ek, à quelques mètres de là, fait partie du folklore gourmand du quartier.",
    whyVisit: "L'autre grande table du guay jub à Yaowarat — beaucoup de visiteurs comparent les deux adresses dans la même soirée.",
    littleTip: "Fermé le lundi — les deux échoppes de guay jub rivales se trouvent à quelques mètres l'une de l'autre, assez proches pour comparer sans se déplacer.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "khao-gaeng-jek-pui",
    name: "Khao Gaeng Jek Pui",
    zone: "chinatown-talat-noi",
    categories: ["street-food"],
    lat: 13.7424,
    lng: 100.5078,
    description:
      "Un stand de curry et riz sur Mangkon Road, surnommé par les habitués le \"restaurant des chaises musicales\" faute de vraies places assises — on patiente pour un tabouret libre. Le curry jaune au porc en est la spécialité la plus demandée, à tel point que le stand peut être en rupture avant la fermeture annoncée.",
    whyVisit: "Une expérience de street food locale et sans artifice, loin des adresses les plus touristiques.",
    littleTip: "Le stand vend généralement jusqu'à épuisement des plats plutôt que jusqu'à une heure fixe — mieux vaut arriver dès l'ouverture en fin d'après-midi.",
    indicativeDuration: "30 min",
  },
  {
    slug: "pa-tong-go-savoey",
    name: "Pa Tong Go Savoey",
    zone: "chinatown-talat-noi",
    categories: ["street-food"],
    lat: 13.7396,
    lng: 100.5103,
    description:
      "Un stand familial de Yaowarat, tenu par la troisième génération de la même famille depuis près de 50 ans, spécialisé dans les pa thong ko (beignets chinois) servis avec une crème pâtissière parfumée au pandan. Le nom de la boutique garde le souvenir d'une époque où le personnel du palais royal venait y acheter ces beignets pour la famille royale.",
    whyVisit: "Une institution familiale de Yaowarat pour un encas sucré typique, reconnue sur les circuits de street food du quartier.",
    littleTip: "Les beignets se dégustent idéalement chauds, directement après la friture — évitez de les garder trop longtemps avant de les manger.",
    indicativeDuration: "15 à 20 min",
  },
  {
    slug: "or-tor-kor-market",
    name: "Or Tor Kor Market",
    zone: "ari",
    categories: ["marches", "street-food"],
    lat: 13.8018,
    lng: 100.5514,
    description:
      "Souvent considéré comme le plus beau marché alimentaire de Bangkok, Or Tor Kor rassemble des produits frais et préparés d'une qualité et d'une présentation nettement supérieures à la moyenne des marchés de la ville. Fruits exotiques impeccablement présentés, plats préparés et spécialités régionales thaïlandaises en font une destination autant gastronomique que pratique, juste en face de Chatuchak.",
    whyVisit: "Le marché alimentaire le plus qualitatif de Bangkok, pour goûter ou acheter des produits thaïlandais sans la cohue des marchés plus touristiques.",
    littleTip: "Combinez facilement la visite avec le marché de Chatuchak, juste en face, de l'autre côté de la voie ferrée.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "wang-lang-market",
    name: "Wang Lang Market",
    zone: "thonburi",
    categories: ["marches", "street-food"],
    lat: 13.7595,
    lng: 100.4845,
    description:
      "Un marché de rue couvert près de l'hôpital Siriraj, fréquenté avant tout par les habitants, le personnel médical et les étudiants du quartier plutôt que par les touristes. Nouilles, desserts thaïlandais traditionnels et plats préparés s'y trouvent à des prix nettement plus locaux que dans les zones touristiques du centre.",
    whyVisit: "L'une des expériences de marché les plus authentiques et les moins touristiques de Bangkok, à prix locaux.",
    littleTip: "Accessible facilement en bateau-taxi depuis le ponton de Chang (Tha Chang), juste en face sur l'autre rive — une courte traversée depuis le Grand Palais.",
    indicativeDuration: "45 min à 1h",
    photoKey: "wang-lang-market",
    altText: "Étal de sushis dans l'allée animée du marché de Wang Lang à Bangkok",
  },
  {
    slug: "phetchaburi-soi-5",
    name: "Phetchaburi Soi 5",
    zone: "siam-chit-lom",
    categories: ["street-food"],
    lat: 13.7513,
    lng: 100.5438,
    description:
      "Un secteur de street food concentré sur une courte section de Phetchaburi Road, réputé en particulier pour ses stands de nouilles au tofu fromagé, une spécialité locale assez inhabituelle. Le quartier compte aussi une présence musulmane historique, avec plusieurs adresses de cuisine halal aux alentours.",
    whyVisit: "Une rue de street food moins connue des visiteurs, pour sortir des itinéraires les plus fréquentés.",
    littleTip: "Le quartier abrite aussi plusieurs adresses de cuisine halal autour de Soi 7, à quelques minutes de marche, si vous cherchez des options certifiées.",
    indicativeDuration: "45 min",
    photoKey: "phetchaburi-soi-5",
    altText: "La rue Phetchaburi à Bangkok avec ses commerces et ses stands de rue",
  },
];

async function main() {
  console.log("Seeding Bangkok content wave 12 (street food restant)…");

  const bangkok = await prisma.destination.findUniqueOrThrow({ where: { slug: "bangkok" } });
  const manifest: PhotoManifestEntry[] = JSON.parse(await readFile(`${PHOTOS_DIR}/manifest.json`, "utf-8"));
  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  const zones = await prisma.zone.findMany({ where: { destinationId: bangkok.id } });
  const zoneBySlug = new Map(zones.map((z) => [z.slug, z]));

  for (const def of PLACES) {
    let photoId: string | null = null;
    if (def.photoKey) {
      const manifestEntry = manifest.find((m) => m.key === def.photoKey && m.found);
      if (manifestEntry) {
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
          altText: def.altText ?? def.name,
        };
        const photo = existingPhoto
          ? await prisma.photo.update({ where: { id: existingPhoto.id }, data: photoData })
          : await prisma.photo.create({ data: photoData });
        photoId = photo.id;
      }
    }

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
    if (photoId) await prisma.placePhoto.create({ data: { placeId: place.id, photoId, sortOrder: 0 } });

    console.log("  place:", def.name);
  }

  console.log("Wave 12 seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
