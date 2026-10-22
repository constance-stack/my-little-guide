/**
 * Ninth content wave: the brief's "Excursions depuis Bangkok" list.
 * These places aren't in any Bangkok neighborhood — they're day trips
 * outside the city — so rather than force them into an unrelated zone,
 * this creates a dedicated "Excursions" pseudo-zone to group them in the
 * guide and on the map, consistent with how every other place is shown.
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
  "/private/tmp/claude-501/-Users-constance/8b5fbae2-2d1e-4365-aae7-917e8137a620/scratchpad/photos_wave9";
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
    slug: "ayutthaya",
    name: "Ayutthaya",
    categories: ["excursions", "temples-patrimoine"],
    lat: 14.3539,
    lng: 100.5686,
    description:
      "Capitale du royaume du Siam pendant plus de 400 ans jusqu'à sa destruction par l'armée birmane en 1767, Ayutthaya est aujourd'hui un vaste parc historique classé à l'UNESCO, parsemé de ruines de temples, de chedis et de statues de Bouddha décapitées par les pillages. L'ancienne ville se trouve sur une île entourée de trois rivières, à environ 1h30 de route au nord de Bangkok.",
    whyVisit: "L'excursion d'une journée la plus riche historiquement depuis Bangkok, pour comprendre l'histoire du Siam avant la fondation de la capitale actuelle.",
    littleTip: "Louer un vélo sur place permet de rayonner facilement entre les différents temples du site, assez étendu pour rendre la marche fatigante en pleine chaleur.",
    indicativeDuration: "journée complète",
    photoKey: "ayutthaya",
    altText: "Les trois chedis de Wat Phra Si Sanphet dans le parc historique d'Ayutthaya",
  },
  {
    slug: "ancient-city-muang-boran",
    name: "Ancient City (Muang Boran)",
    categories: ["excursions", "culture-musees"],
    lat: 13.5445,
    lng: 100.6103,
    description:
      "Le plus grand musée à ciel ouvert au monde selon ses promoteurs : un parc de plus de 80 hectares reproduisant à échelle réduite ou réelle les monuments les plus importants de Thaïlande, dont certains aujourd'hui disparus ailleurs dans le pays. Le site, dessiné pour épouser la forme de la carte de la Thaïlande, se visite à pied, à vélo ou en voiturette électrique.",
    whyVisit: "Un condensé du patrimoine architectural thaïlandais, utile pour qui n'a pas le temps de visiter toutes les régions du pays.",
    littleTip: "Le site est immense — prévoyez de louer un vélo ou une voiturette électrique sur place plutôt que de tout parcourir à pied.",
    indicativeDuration: "demi-journée à journée complète",
    photoKey: "ancient-city",
    altText: "Réplique dorée d'un temple thaïlandais dans le parc d'Ancient City (Muang Boran), Samut Prakan",
  },
  {
    slug: "erawan-museum",
    name: "Erawan Museum",
    categories: ["excursions", "culture-musees"],
    lat: 13.5917,
    lng: 100.6089,
    description:
      "Un musée reconnaissable entre tous : une statue d'éléphant à trois têtes de 29 mètres de haut, en bronze, dont l'intérieur abrite des collections d'art et d'antiquités réparties sur plusieurs niveaux symboliques (enfer, terre, paradis). L'ensemble, œuvre d'un collectionneur thaïlandais, se trouve à Samut Prakan, à la limite sud de l'agglomération de Bangkok.",
    whyVisit: "L'une des silhouettes les plus spectaculaires et les plus photographiées des environs de Bangkok.",
    littleTip: "L'intérieur du corps de l'éléphant est aussi surprenant que l'extérieur — ne vous arrêtez pas à la photo depuis le jardin, montez à l'intérieur.",
    indicativeDuration: "1h30 à 2h",
    photoKey: "erawan-museum",
    altText: "La statue monumentale d'éléphant à trois têtes de l'Erawan Museum à Samut Prakan",
  },
  {
    slug: "maeklong-railway-market",
    name: "Maeklong Railway Market",
    categories: ["excursions", "marches"],
    lat: 13.4097,
    lng: 99.9994,
    description:
      "Un marché installé directement sur une voie ferrée active, où les étals rétractent en quelques secondes leurs auvents et leurs marchandises à l'approche du train, qui passe à quelques dizaines de centimètres des étalages avant que tout ne se remette en place. Le spectacle, répété plusieurs fois par jour, a rendu ce marché de Samut Songkhram mondialement connu.",
    whyVisit: "L'une des scènes les plus insolites de la région de Bangkok, à combiner facilement avec Amphawa, tout proche.",
    littleTip: "Les horaires de passage du train varient selon les sources et évoluent parfois — vérifiez l'horaire du jour auprès d'une source récente avant de vous déplacer.",
    indicativeDuration: "30 à 45 min",
    photoKey: "maeklong-railway-market",
    altText: "Un train traversant les étals du marché ferroviaire de Maeklong, les vendeurs ayant replié leurs auvents",
  },
  {
    slug: "amphawa-floating-market",
    name: "Amphawa Floating Market",
    categories: ["excursions", "marches", "street-food"],
    lat: 13.4259,
    lng: 99.9519,
    description:
      "Un marché flottant de week-end organisé le long d'un canal bordé de maisons en bois traditionnelles, à Samut Songkhram. Contrairement à Damnoen Saduak, l'essentiel de l'activité se déroule en fin d'après-midi et en soirée, avec une ambiance plus locale et des bateaux de croisière proposant d'observer les lucioles sur la rivière Mae Klong à la tombée de la nuit.",
    whyVisit: "Un marché flottant à l'atmosphère plus authentique et moins matinale que ses équivalents les plus touristiques, facilement combinable avec Maeklong.",
    littleTip: "N'ouvre que le week-end (vendredi à dimanche selon les sources) et uniquement en fin d'après-midi — une visite du matin trouvera le canal largement désert.",
    indicativeDuration: "2h à 3h, en fin d'après-midi le week-end",
    photoKey: "amphawa-floating-market",
    altText: "Bateau traditionnel sur le canal du marché flottant d'Amphawa, bordé de maisons en bois",
  },
  {
    slug: "damnoen-saduak-floating-market",
    name: "Damnoen Saduak Floating Market",
    categories: ["excursions", "marches"],
    lat: 13.5176,
    lng: 99.9544,
    description:
      "Le plus célèbre marché flottant de Thaïlande, où des dizaines de bateaux chargés de fruits, de plats cuisinés et de souvenirs se faufilent chaque matin dans un réseau de canaux à Ratchaburi. Très touristique mais spectaculaire par son ampleur et ses couleurs, c'est l'image que beaucoup associent au mot \"marché flottant\" avant même de venir en Thaïlande.",
    whyVisit: "L'expérience de marché flottant la plus photogénique et la plus intense en activité, pour qui ne craint pas l'affluence touristique.",
    littleTip: "L'activité est concentrée le matin et se termine vers midi — partez tôt depuis Bangkok pour éviter à la fois la chaleur et la foule la plus dense.",
    indicativeDuration: "2h à 3h, le matin",
    photoKey: "damnoen-saduak-floating-market",
    altText: "Bateau chargé de fruits et de bananes au marché flottant de Damnoen Saduak",
  },
];

async function main() {
  console.log("Seeding Bangkok content wave 9 (excursions)…");

  const bangkok = await prisma.destination.findUniqueOrThrow({ where: { slug: "bangkok" } });

  const excursionsZone = await prisma.zone.upsert({
    where: { destinationId_slug: { destinationId: bangkok.id, slug: "excursions" } },
    update: {},
    create: {
      destinationId: bangkok.id,
      slug: "excursions",
      name: "Excursions depuis Bangkok",
      mapColor: "#3457a6",
      vibeText:
        "Au-delà de Bangkok, plusieurs destinations accessibles en une demi-journée ou une journée complète permettent de varier les plaisirs : cité historique classée à l'UNESCO, marchés flottants, musée à ciel ouvert et marché ferroviaire insolite.",
      prosText: "Un vrai dépaysement sans sortir de la région, avec des sites impossibles à recréer en ville (ruines historiques, marchés sur l'eau, marché ferroviaire).",
      consText: "Chaque excursion demande une demi-journée au minimum, souvent une journée complète avec le trajet — à planifier plutôt qu'à improviser au dernier moment.",
      transportText: "Train, minivan partagé ou excursion organisée selon la destination — les options varient, voir la fiche de chaque lieu pour le détail.",
      nearbyText: "Ayutthaya, Ancient City, le musée Erawan, le marché ferroviaire de Maeklong, les marchés flottants d'Amphawa et de Damnoen Saduak.",
      profileFitText: "Voyageurs qui restent plusieurs jours à Bangkok et veulent varier avec une ou deux sorties hors de la ville.",
      hotelAdviceText: "Ces excursions se font en aller-retour depuis votre hébergement à Bangkok — aucun hébergement sur place n'est nécessaire, sauf choix personnel de prolonger le séjour.",
    },
  });

  const manifest: PhotoManifestEntry[] = JSON.parse(await readFile(`${PHOTOS_DIR}/manifest.json`, "utf-8"));
  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

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

    const place = await prisma.place.upsert({
      where: { slug: def.slug },
      update: {
        name: def.name,
        zoneId: excursionsZone.id,
        description: def.description,
        whyVisit: def.whyVisit,
        littleTip: def.littleTip,
        indicativeDuration: def.indicativeDuration,
        isFictionalDemo: false,
      },
      create: {
        slug: def.slug,
        destinationId: bangkok.id,
        zoneId: excursionsZone.id,
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

  console.log("Wave 9 seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
