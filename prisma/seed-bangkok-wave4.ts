/**
 * Fourth content wave: the editorial brief's "Culture et musées" list.
 * Jim Thompson House already exists (seeded as an "incontournables" place
 * in wave 1) — it gets the culture-musees tag added here rather than a
 * duplicate entry. Erawan Museum and Ancient City (Muang Boran), also
 * listed under "Culture et musées" in the brief, are both technically in
 * Samut Prakan, not Bangkok proper — they're deferred to the future
 * "Excursions depuis Bangkok" wave where the brief lists them again,
 * rather than forcing them into a Bangkok zone they don't belong to.
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
  "/private/tmp/claude-501/-Users-constance/8b5fbae2-2d1e-4365-aae7-917e8137a620/scratchpad/photos_wave4";
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
    slug: "bangkok-national-museum",
    name: "Bangkok National Museum",
    zone: "rattanakosin-banglamphu",
    categories: ["culture-musees"],
    lat: 13.7567,
    lng: 100.4927,
    description:
      "L'un des plus grands musées d'Asie du Sud-Est, installé dans un ancien palais à deux pas du Grand Palais et de Sanam Luang. Ses collections couvrent l'histoire thaïlandaise depuis la préhistoire jusqu'à la période moderne : art bouddhique, objets royaux, armes anciennes, chars funéraires royaux et une riche collection de céramiques.",
    whyVisit: "Le meilleur endroit pour comprendre, en une seule visite, la profondeur historique de ce que l'on découvre ensuite dans les temples de la ville.",
    littleTip: "Des visites guidées gratuites en anglais sont proposées par des bénévoles certains jours de la semaine — un bon moyen de ne pas se perdre dans l'immensité des collections.",
    indicativeDuration: "1h30 à 2h",
    photoKey: "bangkok-national-museum",
    altText: "Façade de l'un des pavillons du Bangkok National Museum",
  },
  {
    slug: "museum-siam",
    name: "Museum Siam",
    zone: "rattanakosin-banglamphu",
    categories: ["culture-musees"],
    lat: 13.7445,
    lng: 100.4934,
    description:
      "Installé dans un ancien bâtiment du ministère du Commerce, Museum Siam propose une approche résolument moderne et interactive de l'identité thaïlandaise : qu'est-ce qui fait qu'on est \"thaï\" ? Multimédia, installations ludiques et perspective volontairement moins académique que le National Museum voisin.",
    whyVisit: "Une manière vivante et accessible d'aborder l'histoire et la culture thaïlandaises, appréciée aussi bien des familles que des voyageurs curieux.",
    littleTip: "Le musée est directement relié à la station MRT Sanam Chai, l'une des stations les plus décorées du réseau — l'occasion de l'admirer en passant.",
    indicativeDuration: "1h30",
    photoKey: "museum-siam",
    altText: "Façade jaune et toit rouge du bâtiment de Museum Siam à Bangkok",
  },
  {
    slug: "bacc",
    name: "Bangkok Art and Culture Centre (BACC)",
    zone: "siam-chit-lom",
    categories: ["culture-musees"],
    lat: 13.7466,
    lng: 100.5307,
    description:
      "Un grand centre d'art contemporain organisé autour d'un atrium en spirale sur plusieurs étages, au cœur du quartier de Siam. Expositions temporaires, galeries indépendantes, librairies d'art et cafés se côtoient dans un bâtiment qui tranche avec les centres commerciaux environnants.",
    whyVisit: "Une respiration culturelle gratuite en plein cœur du quartier le plus commercial de Bangkok, avec une programmation qui change régulièrement.",
    littleTip: "L'entrée est gratuite et le centre est directement relié au BTS National Stadium — facile à combiner avec une sortie shopping à Siam.",
    indicativeDuration: "1h à 1h30",
    photoKey: "bacc",
    altText: "Façade circulaire du Bangkok Art and Culture Centre avec son enseigne",
  },
  {
    slug: "moca-bangkok",
    name: "MOCA Bangkok",
    zone: "ari",
    categories: ["culture-musees"],
    lat: 13.8328,
    lng: 100.5614,
    description:
      "Le Museum of Contemporary Art rassemble l'une des plus importantes collections privées d'art thaïlandais moderne et contemporain, dans un grand bâtiment blanc au nord de la ville. Peinture, sculpture et installations y sont présentées sur plusieurs étages, avec un accent marqué sur les artistes thaïlandais du XXe siècle à aujourd'hui.",
    whyVisit: "La collection la plus complète d'art contemporain thaïlandais, dans un cadre spacieux loin de la cohue touristique du centre.",
    littleTip: "Le musée est assez excentré — prévoyez un taxi ou un Grab depuis la station BTS la plus proche plutôt qu'une longue marche.",
    indicativeDuration: "1h30 à 2h",
    photoKey: "moca-bangkok",
    altText: "Enseigne MOCA sur la façade du Museum of Contemporary Art à Bangkok",
  },
  {
    slug: "queen-sirikit-textile-museum",
    name: "Queen Sirikit Museum of Textiles",
    zone: "rattanakosin-banglamphu",
    categories: ["culture-musees"],
    lat: 13.7508,
    lng: 100.4919,
    description:
      "Installé dans l'enceinte du Grand Palais, ce musée retrace l'histoire du textile royal thaïlandais, en particulier le rôle de la reine Sirikit dans la relance de la soie et des techniques de tissage traditionnelles au XXe siècle. Les collections incluent robes officielles, tenues traditionnelles régionales et pièces de soie historiques.",
    whyVisit: "Un angle différent et moins visité sur le patrimoine thaïlandais, à combiner facilement avec la visite du Grand Palais tout proche.",
    littleTip: "L'entrée est payante séparément du billet du Grand Palais — vérifiez les horaires avant de vous y rendre car ils diffèrent parfois de ceux du palais.",
    indicativeDuration: "45 min à 1h",
    photoKey: "queen-sirikit-textile-museum",
    altText: "Bâtiment du Queen Sirikit Museum of Textiles dans l'enceinte du Grand Palais à Bangkok",
  },
  {
    slug: "rattanakosin-exhibition-hall",
    name: "Rattanakosin Exhibition Hall",
    zone: "rattanakosin-banglamphu",
    categories: ["culture-musees"],
    lat: 13.7557,
    lng: 100.5016,
    description:
      "Installé dans un élégant bâtiment Art déco de l'avenue Ratchadamnoen, ce centre d'exposition retrace l'histoire de Bangkok et du quartier de Rattanakosin à travers des maquettes, des projections et des installations multimédias. Moins connu que les grands musées voisins, il offre une mise en contexte utile avant d'explorer le vieux Bangkok à pied.",
    whyVisit: "Une bonne introduction visuelle à l'histoire du quartier avant de partir explorer les temples environnants.",
    littleTip: "Le bâtiment lui-même, avec sa façade arrondie caractéristique, vaut le coup d'œil même pour qui n'a pas le temps de visiter l'exposition.",
    indicativeDuration: "45 min",
    photoKey: "rattanakosin-exhibition-hall",
    altText: "Façade Art déco incurvée du Rattanakosin Exhibition Hall à Bangkok, illuminée de nuit",
  },
  {
    slug: "royal-barges-museum",
    name: "Royal Barges National Museum",
    zone: "thonburi",
    categories: ["culture-musees"],
    lat: 13.7627,
    lng: 100.4805,
    description:
      "Sur un canal de Thonburi, ce musée abrite les barges royales cérémonielles, dont la Suphannahong, embarcation du roi sculptée dans un seul tronc et longue de près de 50 mètres. Ces bateaux ne naviguent que très rarement, lors de processions fluviales royales exceptionnelles, ce qui rend leur observation au musée d'autant plus précieuse.",
    whyVisit: "Un artisanat royal spectaculaire, rarement visible ailleurs qu'ici en dehors des processions fluviales elles-mêmes.",
    littleTip: "Le musée est accessible en bateau-taxi privé depuis les pontons du Chao Phraya ou par une petite marche depuis le khlong Bangkok Noi — vérifiez l'accès avant de partir, il est un peu à l'écart.",
    indicativeDuration: "45 min",
    photoKey: "royal-barges-museum",
    altText: "Barges royales dorées exposées au Royal Barges National Museum à Bangkok",
  },
  {
    slug: "bangkokian-museum",
    name: "Bangkokian Museum",
    zone: "riverside",
    categories: ["culture-musees"],
    lat: 13.7226,
    lng: 100.5157,
    description:
      "Trois maisons en bois datant des années 1930-1950, préservées en l'état par leur ancienne propriétaire et transformées en musée, dans une petite ruelle du quartier de Bang Rak. L'intérieur, mobilier d'époque compris, offre un aperçu rare du quotidien d'une famille bangkokienne de classe moyenne au milieu du XXe siècle.",
    whyVisit: "Une pause intimiste et gratuite, à mille lieues des grands musées nationaux, pour imaginer la vie quotidienne à Bangkok avant les gratte-ciel.",
    littleTip: "Le musée est minuscule et discret dans sa ruelle — repérez bien l'adresse à l'avance, il est facile de passer devant sans le voir.",
    indicativeDuration: "30 min",
    photoKey: "bangkokian-museum",
    altText: "Véranda en bois d'une des maisons traditionnelles du Bangkokian Museum à Bangkok",
  },
];

async function main() {
  console.log("Seeding Bangkok content wave 4 (culture et musées)…");

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

  // Jim Thompson House is already seeded (wave 1, "incontournables") — it
  // belongs on the brief's "Culture et musées" list too, so tag it rather
  // than creating a duplicate place.
  const jimThompson = await prisma.place.findUnique({ where: { slug: "jim-thompson-house" } });
  const cultureMusees = categoryBySlug.get("culture-musees");
  if (jimThompson && cultureMusees) {
    await prisma.placeCategory.upsert({
      where: { placeId_categoryId: { placeId: jimThompson.id, categoryId: cultureMusees.id } },
      update: {},
      create: { placeId: jimThompson.id, categoryId: cultureMusees.id },
    });
    console.log("  tagged jim-thompson-house as culture-musees");
  }

  console.log("Wave 4 seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
