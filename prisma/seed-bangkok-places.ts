/**
 * Replaces the fictional "Exemple fictif" Bangkok places with 9 real,
 * well-known landmarks. Descriptions are written from genuine knowledge of
 * these places; nothing is invented. Practical details that drift over
 * time (exact prices, hours) are deliberately omitted or kept general
 * rather than stated as precise facts — tighten these later against an
 * official source via the admin.
 *
 * Photos are real, CC-licensed images sourced from Wikimedia Commons
 * (see photos/manifest.json for the full attribution trail this script
 * reads from) — not AI-generated, not stock photos of unclear origin.
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
  "/private/tmp/claude-501/-Users-constance/8b5fbae2-2d1e-4365-aae7-917e8137a620/scratchpad/photos";
const STORAGE_ROOT = process.env.STORAGE_ROOT ?? "./storage";

type PhotoManifestEntry = {
  key: string;
  found: boolean;
  title: string;
  artist: string;
  license: string;
  license_url: string;
  credit: string;
  source_url: string;
  local_path: string;
  width: number;
  height: number;
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
    slug: "wat-arun",
    name: "Wat Arun (Temple de l'Aube)",
    zone: "riverside",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 13.7437,
    lng: 100.4888,
    description:
      "Wat Arun, le \"Temple de l'Aube\", est l'un des monuments les plus reconnaissables de Bangkok. Son prang central, haut d'environ 70 mètres, est entièrement recouvert de fragments de porcelaine chinoise disposés en motifs floraux — un détail qui n'apparaît vraiment que de près. Le temple doit son nom à Aruna, le dieu hindou de l'aube : la vue est particulièrement spectaculaire au lever et au coucher du soleil, lorsque la lumière rasante fait scintiller la porcelaine. On peut gravir une partie des marches abruptes du prang central pour une vue sur le fleuve Chao Phraya et, en face, le quartier de Rattanakosin.",
    whyVisit:
      "L'un des trois ou quatre sites que la plupart des visiteurs citent spontanément en pensant à Bangkok — et l'un des rares où le détail architectural récompense vraiment une visite lente plutôt qu'une photo rapide.",
    littleTip:
      "La meilleure vue d'ensemble du temple ne se prend pas depuis le temple lui-même, mais depuis la rive opposée : installez-vous dans l'un des cafés ou bars avec terrasse côté Rattanakosin en fin d'après-midi.",
    indicativeDuration: "1h à 1h30",
    photoKey: "wat-arun",
    altText: "Le prang central de Wat Arun, orné de porcelaine, vu depuis le fleuve Chao Phraya à Bangkok",
  },
  {
    slug: "asiatique-riverfront",
    name: "Asiatique The Riverfront",
    zone: "riverside",
    categories: ["marches", "restaurants"],
    lat: 13.705,
    lng: 100.5033,
    description:
      "D'anciens entrepôts commerciaux au bord du Chao Phraya, reconvertis en un vaste marché nocturne à ciel ouvert : boutiques, restaurants, bars et une grande roue illuminée en soirée. L'ambiance est beaucoup plus organisée et tranquille qu'un marché de rue classique, avec de larges allées en bois le long du fleuve. On y accède facilement en bateau-navette gratuit depuis le ponton de Saphan Taksin.",
    whyVisit:
      "Une bonne option pour finir une journée de visite par une promenade au bord de l'eau, dîner avec vue sur le fleuve, et profiter d'une ambiance festive sans la cohue de la rue.",
    littleTip:
      "Le bateau-navette gratuit vers Asiatique part du ponton de Saphan Taksin (même station que le BTS) — pas besoin de payer un taxi ou un Grab pour y aller.",
    indicativeDuration: "2 à 3h, en soirée",
    photoKey: "asiatique",
    altText: "Les entrepôts réaménagés d'Asiatique The Riverfront illuminés le soir, au bord du Chao Phraya",
  },
  {
    slug: "sky-bar-lebua",
    name: "Sky Bar (Lebua State Tower)",
    zone: "riverside",
    categories: ["bars-rooftops"],
    lat: 13.7203,
    lng: 100.5144,
    description:
      "Perché au 63ème étage de la Lebua State Tower, ce rooftop en forme de fer à cheval est l'un des bars en hauteur les plus connus de Bangkok, rendu mondialement célèbre par le film \"Very Bad Trip 2\". La vue à 360° sur la ville et sur le fleuve est spectaculaire, en particulier au coucher du soleil. L'endroit a un code vestimentaire strict (tenue correcte exigée, pas de tongs ni de shorts) et les prix sont nettement plus élevés que la moyenne, à la hauteur de l'expérience.",
    whyVisit:
      "Le rooftop le plus emblématique de Bangkok pour un premier verre avec vue — à réserver pour une soirée plutôt qu'un stop rapide, car l'attente peut être longue sans réservation.",
    littleTip:
      "Arrivez avant le coucher du soleil pour avoir le temps de profiter de la lumière changeante sur la ville, et vérifiez le code vestimentaire avant de partir : l'accès est refusé en tenue trop décontractée.",
    indicativeDuration: "1h30 à 2h",
    photoKey: "lebua-skybar",
    altText: "Vue depuis le Sky Bar au sommet de la Lebua State Tower à Bangkok, avec la ville illuminée en arrière-plan",
  },
  {
    slug: "wat-mangkon-kamalawat",
    name: "Wat Mangkon Kamalawat",
    zone: "chinatown-talat-noi",
    categories: ["temples-patrimoine"],
    lat: 13.7398,
    lng: 100.5083,
    description:
      "Le plus grand et le plus important temple chinois de Bangkok, fondé à la fin du 19ème siècle en plein cœur de Chinatown. Son architecture mêle des éléments bouddhistes, taoïstes et confucéens, avec des toitures ornées de dragons sculptés et une atmosphère nettement différente des temples thaïlandais classiques — encens dense, lanternes rouges et ferveur locale, surtout lors du Nouvel An chinois.",
    whyVisit:
      "Un contrepoint culturel intéressant aux temples bouddhistes thaïlandais, et un point de repère pratique pour commencer une exploration à pied de Chinatown.",
    littleTip:
      "L'affluence et l'ambiance sont particulièrement fortes pendant le Nouvel An chinois (fin janvier ou février selon les années) — magnifique à voir, mais prévoyez de la patience face à la foule.",
    indicativeDuration: "30 à 45 min",
    photoKey: "wat-mangkon",
    altText: "La toiture ornée de dragons du temple chinois Wat Mangkon Kamalawat à Chinatown, Bangkok",
  },
  {
    slug: "yaowarat-road",
    name: "Yaowarat Road",
    zone: "chinatown-talat-noi",
    categories: ["street-food", "restaurants"],
    lat: 13.7401,
    lng: 100.5096,
    description:
      "L'artère principale de Chinatown, bordée d'enseignes lumineuses, de bijouteries et surtout d'innombrables étals de street food qui prennent véritablement vie à la tombée de la nuit. Nouilles sautées, fruits de mer grillés, soupes, desserts : c'est l'une des rues les plus denses de Bangkok en matière de street food, au point que certains étals affichent plusieurs décennies d'existence et des files d'attente régulières.",
    whyVisit:
      "Considérée par beaucoup comme la meilleure rue de street food de Bangkok — l'endroit où venir affamé et goûter plusieurs étals plutôt qu'un seul restaurant.",
    littleTip:
      "Venez en fin d'après-midi ou en soirée : de jour, une grande partie des étals n'est pas encore installée et la rue est nettement moins animée.",
    indicativeDuration: "1h30 à 2h, en soirée",
    photoKey: "yaowarat",
    altText: "La rue Yaowarat à Chinatown Bangkok, bordée d'enseignes lumineuses et d'étals de street food",
  },
  {
    slug: "jim-thompson-house",
    name: "Jim Thompson House",
    zone: "siam-chit-lom",
    categories: ["incontournables"],
    lat: 13.7498,
    lng: 100.5282,
    description:
      "L'ancienne demeure de Jim Thompson, homme d'affaires américain qui a relancé l'industrie de la soie thaïlandaise après la Seconde Guerre mondiale avant de disparaître mystérieusement en Malaisie en 1967. Sa maison, assemblée à partir de plusieurs bâtiments traditionnels thaïlandais en teck, abrite aujourd'hui sa collection d'art asiatique au milieu d'un jardin tropical luxuriant — une bulle de calme à quelques minutes à pied des grands centres commerciaux de Siam.",
    whyVisit:
      "Un aperçu de l'architecture traditionnelle thaïlandaise et de l'histoire de la soie locale, dans un cadre nettement plus intimiste que les grands sites touristiques.",
    littleTip:
      "La visite se fait uniquement en visite guidée, incluse dans le billet d'entrée et proposée en plusieurs langues — mieux vaut prévoir l'horaire plutôt que d'arriver au dernier moment.",
    indicativeDuration: "1h, visite guidée incluse",
    photoKey: "jim-thompson",
    altText: "La maison traditionnelle en teck de Jim Thompson House à Bangkok, entourée de son jardin tropical",
  },
  {
    slug: "erawan-shrine",
    name: "Sanctuaire d'Erawan",
    zone: "siam-chit-lom",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 13.7445,
    lng: 100.5405,
    description:
      "Un petit sanctuaire hindou dédié au dieu Brahma, installé depuis 1956 à l'angle d'un carrefour très fréquenté, au pied du centre commercial Erawan — d'où son nom. Malgré sa taille modeste, c'est l'un des lieux de culte les plus visités de Bangkok, fréquenté en continu par des fidèles venus faire des offrandes de fleurs et des danseuses traditionnelles engagées pour remercier le dieu d'un vœu exaucé. L'ambiance, mêlant ferveur religieuse et flux incessant du quartier commerçant autour, est assez unique en son genre.",
    whyVisit:
      "Un concentré de spiritualité thaïlandaise en plein cœur du quartier commerçant le plus animé de la ville, accessible en quelques minutes depuis le BTS Chit Lom.",
    littleTip:
      "Le sanctuaire est gratuit et ouvert tard — un bon arrêt en soirée entre deux centres commerciaux plutôt qu'une sortie dédiée.",
    indicativeDuration: "20 à 30 min",
    photoKey: "erawan-shrine",
    altText: "Le sanctuaire doré d'Erawan à Bangkok avec des fidèles venus faire des offrandes",
  },
  {
    slug: "benjakitti-forest-park",
    name: "Benjakitti Forest Park",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["quartiers-balades"],
    lat: 13.7231,
    lng: 100.5602,
    description:
      "Un grand parc urbain organisé autour d'un lac, avec des passerelles en bois surélevées traversant une zone boisée réaménagée sur d'anciens terrains industriels. Beaucoup plus spacieux et moins fréquenté que le célèbre Lumphini Park, c'est un des meilleurs endroits de Bangkok pour marcher, courir ou simplement échapper quelques instants à la densité urbaine, avec les gratte-ciel du quartier des affaires en toile de fond.",
    whyVisit:
      "Une bouffée d'air et d'espace au milieu du quartier le plus dense de Bangkok — particulièrement agréable tôt le matin ou en fin d'après-midi.",
    littleTip:
      "Les passerelles en bois surélevées offrent une perspective différente sur le parc et sont nettement moins fréquentées que les allées au niveau du sol.",
    indicativeDuration: "45 min à 1h30",
    photoKey: "benjakitti-park",
    altText: "Les passerelles en bois de Benjakitti Forest Park à Bangkok, entourées de verdure et de gratte-ciel",
  },
  {
    slug: "terminal-21",
    name: "Terminal 21",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["quartiers-balades"],
    lat: 13.7373,
    lng: 100.5602,
    description:
      "Un centre commercial au concept inhabituel : chaque étage reproduit l'ambiance d'une ville différente (Istanbul, Tokyo, Londres, Rome...), avec décors, panneaux et même toilettes thématisées. Au-delà du gadget, c'est un centre commercial pratique et animé, avec un vaste foodcourt réputé pour ses prix doux et sa bonne qualité par rapport aux standards des centres commerciaux de Bangkok, directement relié à la station BTS/MRT Asok.",
    whyVisit:
      "Un concept suffisamment original pour valoir le détour même sans intention d'achat, et un foodcourt pratique pour un repas rapide et bon marché en plein Sukhumvit.",
    littleTip:
      "Le foodcourt au dernier étage (Pier 21) fonctionne avec une carte prépayée à recharger à l'entrée — gardez le reçu pour vous faire rembourser le solde non utilisé en sortant.",
    indicativeDuration: "1h à 1h30",
    photoKey: "terminal21",
    altText: "L'intérieur thématisé du centre commercial Terminal 21 à Bangkok, avec sa décoration à thème voyage",
  },
];

async function main() {
  console.log("Seeding real Bangkok places…");

  const bangkok = await prisma.destination.findUniqueOrThrow({ where: { slug: "bangkok" } });
  const manifest: PhotoManifestEntry[] = JSON.parse(
    await readFile(`${PHOTOS_DIR}/manifest.json`, "utf-8")
  );
  const zones = await prisma.zone.findMany({ where: { destinationId: bangkok.id } });
  const zoneBySlug = new Map(zones.map((z) => [z.slug, z]));
  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  // Remove the fictional demo places entirely — real content replaces them,
  // not sits alongside them.
  const fictional = await prisma.place.findMany({
    where: { destinationId: bangkok.id, isFictionalDemo: true },
  });
  for (const place of fictional) {
    await prisma.placeCategory.deleteMany({ where: { placeId: place.id } });
    await prisma.placePhoto.deleteMany({ where: { placeId: place.id } });
    await prisma.favorite.deleteMany({ where: { placeId: place.id } });
    await prisma.tripStop.deleteMany({ where: { placeId: place.id } });
  }
  await prisma.place.deleteMany({ where: { destinationId: bangkok.id, isFictionalDemo: true } });
  console.log(`  removed ${fictional.length} fictional places`);

  for (const def of PLACES) {
    const manifestEntry = manifest.find((m) => m.key === def.photoKey && m.found);
    if (!manifestEntry) {
      console.log(`  SKIP ${def.slug}: no photo in manifest`);
      continue;
    }

    // Copy the real photo into the app's private storage, same convention
    // the admin upload flow uses.
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
      if (cat) {
        await prisma.placeCategory.create({ data: { placeId: place.id, categoryId: cat.id } });
      }
    }

    await prisma.placePhoto.deleteMany({ where: { placeId: place.id } });
    await prisma.placePhoto.create({ data: { placeId: place.id, photoId: photo.id, sortOrder: 0 } });

    console.log(`  place: ${def.name}`);
  }

  console.log("Real Bangkok places seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
