/**
 * Tenth content wave: the brief's "Shopping" list (Terminal 21 already
 * seeded in wave 1). These are all large, well-established malls — lower
 * verification risk than independent restaurants/cafés, but existence
 * still checked before writing where the mall is recent (EmSphere).
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
  "/private/tmp/claude-501/-Users-constance/8b5fbae2-2d1e-4365-aae7-917e8137a620/scratchpad/photos_wave10";
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
    slug: "iconsiam",
    name: "ICONSIAM",
    zone: "thonburi",
    categories: ["shopping"],
    lat: 13.7267,
    lng: 100.51,
    description:
      "L'un des plus grands centres commerciaux d'Asie du Sud-Est, construit sur la rive de Thonburi face au centre historique. Son architecture mêle enseignes internationales, un étage entier dédié à la gastronomie thaïlandaise traditionnelle (Sook Siam) et une promenade au bord du fleuve particulièrement agréable en soirée.",
    whyVisit: "Le centre commercial le plus spectaculaire de Bangkok, avec une vue sur le Chao Phraya difficile à égaler ailleurs.",
    littleTip: "Une navette fluviale gratuite relie ICONSIAM au ponton de Saphan Taksin (BTS) — pas besoin de taxi pour s'y rendre.",
    indicativeDuration: "2h à 3h",
    photoKey: "iconsiam",
    altText: "Vue nocturne sur le Chao Phraya depuis la promenade d'ICONSIAM à Bangkok",
  },
  {
    slug: "siam-paragon",
    name: "Siam Paragon",
    zone: "siam-chit-lom",
    categories: ["shopping"],
    lat: 13.7462,
    lng: 100.5347,
    description:
      "L'un des centres commerciaux les plus emblématiques du quartier de Siam, mêlant boutiques de luxe, grande distribution, salles de cinéma et l'aquarium SEA LIFE Bangkok Ocean World en sous-sol. Directement relié au BTS Siam, c'est souvent le premier grand centre commercial que découvrent les visiteurs de la ville.",
    whyVisit: "Un repère central et facile d'accès, représentatif du shopping haut de gamme de Bangkok.",
    littleTip: "Le niveau sous-sol (Paragon Food Hall et SEA LIFE) mérite le détour même pour qui ne vient pas faire du shopping.",
    indicativeDuration: "1h30 à 2h",
    photoKey: "siam-paragon",
    altText: "Façade du centre commercial Siam Paragon à Bangkok",
  },
  {
    slug: "centralworld",
    name: "CentralWorld",
    zone: "siam-chit-lom",
    categories: ["shopping"],
    lat: 13.7466,
    lng: 100.5396,
    description:
      "L'un des plus grands centres commerciaux de Bangkok, qui s'étend sur plusieurs pâtés de maisons entre les quartiers de Siam et de Chit Lom. Sa place extérieure accueille régulièrement des événements et des décorations saisonnières, notamment un grand sapin de Noël très photographié en fin d'année.",
    whyVisit: "Une offre commerciale très large sous un même toit, au cœur du quartier commerçant de Bangkok.",
    littleTip: "Le centre est immense et peut désorienter — repérez d'abord les zones par étage plutôt que de chercher à tout parcourir.",
    indicativeDuration: "1h30 à 2h",
    photoKey: "centralworld",
    altText: "Façade du centre commercial CentralWorld à Bangkok avec ses tours environnantes",
  },
  {
    slug: "mbk-center",
    name: "MBK Center",
    zone: "siam-chit-lom",
    categories: ["shopping"],
    lat: 13.7445,
    lng: 100.5296,
    description:
      "Un grand centre commercial populaire organisé en une multitude de petites échoppes indépendantes plutôt qu'en boutiques de marque, où la négociation des prix fait partie du jeu. Électronique, souvenirs, vêtements et accessoires s'y trouvent à des tarifs généralement plus bas que dans les centres commerciaux voisins plus haut de gamme.",
    whyVisit: "Une ambiance de marché couvert à prix négociables, en contraste avec le luxe des centres commerciaux environnants.",
    littleTip: "N'hésitez pas à négocier les prix affichés dans les petites échoppes — ce n'est pas l'usage dans les boutiques de marque, mais c'est courant ici.",
    indicativeDuration: "1h à 1h30",
    photoKey: "mbk-center",
    altText: "Façade du centre commercial MBK Center à Bangkok",
  },
  {
    slug: "siam-center",
    name: "Siam Center",
    zone: "siam-chit-lom",
    categories: ["shopping"],
    lat: 13.746,
    lng: 100.533,
    description:
      "L'un des plus anciens centres commerciaux de Bangkok, repositionné ces dernières années sur la mode et les marques thaïlandaises émergentes plutôt que sur les grandes enseignes internationales. Son architecture contemporaine et sa programmation axée sur de jeunes créateurs en font une référence pour la mode locale.",
    whyVisit: "Un bon aperçu de la scène mode thaïlandaise contemporaine, moins générique que ses voisins.",
    littleTip: "Le centre est directement connecté à Siam Discovery et Siam Paragon par des passerelles couvertes — les trois se visitent d'affilée sans ressortir dans la rue.",
    indicativeDuration: "1h",
    photoKey: "siam-center",
    altText: "Façade illuminée de Siam Center avec sa fontaine la nuit à Bangkok",
  },
  {
    slug: "siam-discovery",
    name: "Siam Discovery",
    zone: "siam-chit-lom",
    categories: ["shopping"],
    lat: 13.7466,
    lng: 100.5325,
    description:
      "Repositionné comme un \"laboratoire\" du design et du style de vie, Siam Discovery mêle concept-stores, objets design et marques moins conventionnelles dans un cadre architectural reconnaissable à sa façade en treillis métallique. Le musée de cire Madame Tussauds Bangkok occupe l'un de ses étages supérieurs.",
    whyVisit: "Une expérience shopping plus design et moins générique que les grands centres commerciaux voisins.",
    littleTip: "Les étages supérieurs, organisés par thème de vie plutôt que par catégorie de produit, surprennent agréablement ceux qui s'attendent à un centre commercial classique.",
    indicativeDuration: "1h à 1h30",
    photoKey: "siam-discovery",
    altText: "Façade en treillis métallique de Siam Discovery à Bangkok",
  },
  {
    slug: "central-embassy",
    name: "Central Embassy",
    zone: "siam-chit-lom",
    categories: ["shopping"],
    lat: 13.744,
    lng: 100.5467,
    description:
      "Un centre commercial haut de gamme à l'architecture sculpturale distinctive, situé près de l'ambassade britannique sur Ploenchit Road. Boutiques de luxe, restaurants étoilés et le food court gastronomique Eathai, consacré à la cuisine régionale thaïlandaise, en font une adresse plus feutrée que les grands centres voisins de Siam.",
    whyVisit: "Une atmosphère plus calme et haut de gamme, avec une architecture qui vaut le coup d'œil à elle seule.",
    littleTip: "Le food court Eathai au sous-sol propose des spécialités régionales thaïlandaises moins courantes que la street food classique du centre-ville.",
    indicativeDuration: "1h à 1h30",
    photoKey: "central-embassy",
    altText: "Architecture sculpturale et futuriste de la façade de Central Embassy à Bangkok",
  },
  {
    slug: "emquartier",
    name: "EmQuartier",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["shopping"],
    lat: 13.7307,
    lng: 100.5693,
    description:
      "Un centre commercial haut de gamme réparti sur trois bâtiments reliés par des passerelles, directement connecté au BTS Phrom Phong. Sa cour intérieure végétalisée (le \"Helix Quartier\") et sa jungle verticale en font l'un des centres commerciaux les plus photogéniques de Bangkok, au cœur du quartier résidentiel aisé de Sukhumvit.",
    whyVisit: "Une architecture verte remarquable et une offre de restaurants particulièrement riche, dans le quartier le plus \"expat\" de la ville.",
    littleTip: "La jungle verticale intérieure se découvre mieux en empruntant les escalators extérieurs du bâtiment Helix plutôt que les ascenseurs classiques.",
    indicativeDuration: "1h30 à 2h",
    photoKey: "emquartier",
    altText: "Intérieur végétalisé du centre commercial EmQuartier à Bangkok",
  },
  {
    slug: "emsphere",
    name: "EmSphere",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["shopping", "vie-nocturne"],
    lat: 13.7319,
    lng: 100.5705,
    description:
      "Le plus récent des grands centres commerciaux du quartier de Sukhumvit, ouvert fin 2023 juste à côté d'EmQuartier. Premier magasin IKEA en centre-ville d'Asie du Sud-Est, salle de concert et large offre de divertissement nocturne en font une destination pensée pour prolonger la soirée plutôt qu'une simple sortie shopping.",
    whyVisit: "Une offre de loisirs et de vie nocturne plus développée que les centres commerciaux voisins, pour une soirée plutôt qu'un après-midi shopping.",
    littleTip: "EmQuartier, EmSphere et EmPorium forment ensemble le complexe \"The EM District\", reliés par des passerelles — prévoyez de les visiter ensemble.",
    indicativeDuration: "1h30 à 2h",
    photoKey: "emsphere",
    altText: "Façade du centre commercial EmSphere à Bangkok",
  },
  {
    slug: "river-city-bangkok",
    name: "River City Bangkok",
    zone: "riverside",
    categories: ["shopping", "culture-musees"],
    lat: 13.7442,
    lng: 100.5133,
    description:
      "Un centre spécialisé dans l'art et les antiquités, installé au bord du Chao Phraya près du quartier des anciens comptoirs commerciaux. Galeries d'art contemporain, antiquaires et ventes aux enchères y cohabitent dans une ambiance nettement plus feutrée que les grands centres commerciaux de Siam ou Sukhumvit.",
    whyVisit: "Une adresse à part pour les amateurs d'art et d'antiquités, avec une terrasse au bord du fleuve agréable en fin de journée.",
    littleTip: "Le site accueille régulièrement des ventes aux enchères d'art asiatique — vérifiez le calendrier si cela vous intéresse, même sans intention d'enchérir.",
    indicativeDuration: "1h à 1h30",
    photoKey: "river-city-bangkok",
    altText: "Intérieur des galeries d'art et d'antiquités de River City Bangkok",
  },
];

async function main() {
  console.log("Seeding Bangkok content wave 10 (shopping)…");

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

  console.log("Wave 10 seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
