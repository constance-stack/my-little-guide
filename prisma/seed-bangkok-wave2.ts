/**
 * Second content wave: expands Bangkok from 4 to 9 real neighborhoods and
 * adds the remaining "incontournables" landmarks from the editorial brief
 * (Grand Palace, Wat Phra Kaew, Wat Pho, Golden Mount, Wat Traimit, Wat
 * Benchamabophit, Wat Suthat, Talat Noi, Pak Khlong Talat, Chatuchak
 * Weekend Market, the Chao Phraya River experience, Mahanakhon SkyWalk).
 * Wat Arun, Jim Thompson House and Yaowarat Road already carry the
 * "incontournables" tag from the first wave.
 *
 * The 9 neighborhoods are the touristic, indicative groupings from the
 * brief, not administrative boundaries (Wat Benchamabophit sits in Dusit,
 * which has no dedicated zone here, so it's grouped with the nearest
 * covered old-town zone, Rattanakosin/Banglamphu).
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
  "/private/tmp/claude-501/-Users-constance/8b5fbae2-2d1e-4365-aae7-917e8137a620/scratchpad/photos_wave2";
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

type ZoneDef = {
  slug: string;
  name: string;
  mapColor: string;
  vibeText: string;
  prosText: string;
  consText: string;
  transportText: string;
  nearbyText: string;
  profileFitText: string;
  hotelAdviceText: string;
};

const NEW_ZONES: ZoneDef[] = [
  {
    slug: "rattanakosin-banglamphu",
    name: "Rattanakosin / Banglamphu",
    mapColor: "#d4b483",
    vibeText:
      "Le berceau historique de Bangkok, autour du Grand Palais et des plus grands temples royaux. Rues larges et monuments imposants côtoient des quartiers plus populaires comme Banglamphu et Khao San Road.",
    prosText:
      "Concentration unique de temples et de patrimoine royal, quartier le plus \"carte postale\" de la ville, nombreux hébergements à petit budget autour de Khao San Road.",
    consText:
      "Peu ou pas desservi par le BTS/MRT direct — mieux vaut combiner bateau-taxi, marche et taxi. Très touristique et peu ombragé en journée sur les grandes esplanades.",
    transportText:
      "Chao Phraya Express Boat (pontons Tha Chang, Tha Tien, Phra Arthit) ; MRT Sanam Chai pour le Grand Palais et Wat Pho.",
    nearbyText: "Grand Palais, Wat Phra Kaew, Wat Pho, Wat Suthat, le Golden Mount (Wat Saket), Khao San Road.",
    profileFitText:
      "Voyageurs en quête d'histoire et de temples, petits budgets à l'aise avec moins de confort moderne, premier séjour culturel à Bangkok.",
    hotelAdviceText:
      "Les hébergements sont souvent simples (guesthouses, petits hôtels) ; pour plus de confort, mieux vaut loger ailleurs et visiter le quartier à la journée.",
  },
  {
    slug: "silom-sathorn",
    name: "Silom / Sathorn",
    mapColor: "#b5862e",
    vibeText:
      "Quartier d'affaires le jour, animé la nuit grâce à ses rooftops et ses restaurants. Mélange de gratte-ciel, de petits sois populaires et de quelques espaces verts.",
    prosText:
      "Excellente desserte BTS/MRT (Sala Daeng, Chong Nonsi, Surasak), nombreux rooftops et restaurants gastronomiques, proche du Lumphini Park.",
    consText:
      "Très calme le week-end dans sa partie purement \"bureaux\" ; certaines rues de Silom ont une vie nocturne très marquée, pas au goût de tous.",
    transportText:
      "Stations BTS Sala Daeng, Chong Nonsi, Surasak ; MRT Silom et Lumphini ; ponton Saphan Taksin tout proche pour le fleuve.",
    nearbyText: "Lumphini Park, Mahanakhon SkyWalk, de nombreux rooftops (Vertigo, Sky Bar), accès facile au Chao Phraya.",
    profileFitText:
      "Voyageurs d'affaires ou touristes qui veulent un bon compromis entre transports, gastronomie et vie nocturne.",
    hotelAdviceText:
      "Secteur fiable pour un hôtel bien desservi ; privilégiez Chong Nonsi ou Sala Daeng pour être au cœur de l'action sans être trop excentré.",
  },
  {
    slug: "ari",
    name: "Ari",
    mapColor: "#9b8aa3",
    vibeText:
      "Quartier résidentiel et branché, prisé des habitants de Bangkok pour ses cafés indépendants, ses petites boutiques et son ambiance plus calme que le centre touristique.",
    prosText:
      "Ambiance locale et authentique, excellents cafés et petits restaurants, bonne desserte BTS (ligne Sukhumvit).",
    consText:
      "Peu de sites \"incontournables\" sur place — plutôt un quartier à vivre qu'à visiter en coup de vent ; moins d'hébergements que les zones plus centrales.",
    transportText: "Stations BTS Ari et Saphan Khwai ; à une station de Mo Chit pour le marché de Chatuchak.",
    nearbyText: "Chatuchak Weekend Market et Chatuchak Park (une station de BTS), nombreux cafés de spécialité.",
    profileFitText: "Voyageurs qui reviennent à Bangkok ou veulent une ambiance plus locale, loin de la cohue touristique.",
    hotelAdviceText:
      "Bon choix pour un séjour plus long et plus tranquille, à condition d'être à l'aise avec un peu plus de trajet vers les grands sites touristiques.",
  },
  {
    slug: "pratunam",
    name: "Pratunam",
    mapColor: "#d9a7a0",
    vibeText:
      "Quartier dense et commerçant, célèbre pour son marché de vêtements en gros et ses tours hôtelières, au carrefour entre Siam et Victory Monument.",
    prosText:
      "Shopping abordable (vêtements en gros et au détail), bon rapport qualité-prix des hôtels, proche du Baiyoke Sky (vue panoramique).",
    consText:
      "Circulation et trottoirs très encombrés, peu d'accès direct au BTS/MRT (il faut un peu marcher ou emprunter le khlong Saen Saep).",
    transportText:
      "Bateau du khlong Saen Saep (ponton Pratunam) pour rejoindre rapidement Siam ou Asok en évitant les embouteillages ; BTS Chit Lom ou Ratchathewi à 10-15 minutes à pied.",
    nearbyText: "Marché de Pratunam, tour Baiyoke Sky, à proximité à pied de Siam et Chit Lom.",
    profileFitText: "Voyageurs orientés shopping et petits budgets, à l'aise avec un quartier dense et moins \"carte postale\".",
    hotelAdviceText:
      "Les tours hôtelières de Pratunam offrent souvent un bon rapport qualité-prix avec vue sur la ville ; vérifiez la distance exacte à pied jusqu'au BTS avant de réserver.",
  },
  {
    slug: "thonburi",
    name: "Thonburi",
    mapColor: "#7d8c4a",
    vibeText:
      "Sur la rive ouest du Chao Phraya, Thonburi a été la capitale du Siam avant Bangkok. Canaux (khlongs), temples et quartiers résidentiels plus calmes, à la fois proches du centre et clairement différents par leur atmosphère.",
    prosText: "Atmosphère plus locale et moins touristique, canaux et maisons traditionnelles, vue privilégiée sur Wat Arun depuis la rive.",
    consText:
      "Transports moins directs — la plupart des sites se visitent en bateau ou en combinant plusieurs modes plutôt qu'à pied depuis une seule station.",
    transportText: "Chao Phraya Express Boat et bateaux-taxis de khlong ; MRT Itsaraphap et BTS Wongwian Yai pour certains secteurs.",
    nearbyText: "Wat Arun, Khlong Bang Luang, Wat Kalayanamit, Wat Prayurawongsawat.",
    profileFitText: "Voyageurs curieux de sortir des sentiers battus, amateurs de balades en bateau et d'ambiance locale.",
    hotelAdviceText:
      "Quelques adresses de charme en bord de fleuve existent, mais mieux vaut vérifier précisément l'accès (navette privée ou embarcadère public) avant de réserver.",
  },
];

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
    slug: "grand-palace",
    name: "Grand Palais",
    zone: "rattanakosin-banglamphu",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 13.75,
    lng: 100.4913,
    description:
      "Résidence officielle des rois de Siam depuis 1782, le Grand Palais est un vaste complexe de bâtiments royaux, de pavillons cérémoniels et de jardins, mêlant architecture thaïe traditionnelle et influences occidentales introduites au XIXe siècle. La famille royale n'y réside plus au quotidien, mais le palais continue d'accueillir des cérémonies officielles. C'est aussi dans son enceinte que se trouve Wat Phra Kaew, le temple du Bouddha d'émeraude.",
    whyVisit: "Le site historique et architectural le plus important de Bangkok, souvent la première visite de tout séjour dans la ville.",
    littleTip:
      "Une tenue correcte est obligatoire (épaules et genoux couverts) ; des vêtements de prêt sont disponibles à l'entrée si besoin, mais prévoir sa propre tenue évite la queue.",
    indicativeDuration: "2h à 3h",
    photoKey: "grand-palace",
    altText: "Façade principale du Grand Palais de Bangkok avec ses toits dorés en étages",
  },
  {
    slug: "wat-phra-kaew",
    name: "Wat Phra Kaew (Temple du Bouddha d'émeraude)",
    zone: "rattanakosin-banglamphu",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 13.7515,
    lng: 100.4927,
    description:
      "Situé dans l'enceinte du Grand Palais, Wat Phra Kaew abrite la statue la plus vénérée de Thaïlande : le Bouddha d'émeraude, sculpté dans un seul bloc de jade et vêtu de tenues saisonnières changées par le roi lui-même lors de cérémonies. Le temple ne compte aucun moine résident — c'est un sanctuaire royal, pas un monastère actif.",
    whyVisit: "Le temple le plus sacré du pays, dont l'accès est inclus dans le même billet que le Grand Palais.",
    littleTip:
      "La statue du Bouddha d'émeraude est assez petite et se trouve en hauteur dans le viharn principal — prévoyez de lever les yeux et de prendre votre temps, la salle est souvent bondée.",
    indicativeDuration: "1h (inclus dans la visite du Grand Palais)",
    photoKey: "wat-phra-kaew",
    altText: "Chedi doré illuminé la nuit dans l'enceinte de Wat Phra Kaew à Bangkok",
  },
  {
    slug: "wat-pho",
    name: "Wat Pho",
    zone: "rattanakosin-banglamphu",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 13.7465,
    lng: 100.4927,
    description:
      "L'un des plus anciens et des plus grands temples de Bangkok, Wat Pho est surtout connu pour son immense Bouddha couché de 46 mètres de long, entièrement recouvert de feuilles d'or. Le temple est aussi le berceau historique du massage thaïlandais traditionnel, enseigné sur place depuis des générations.",
    whyVisit: "Un site d'une échelle impressionnante, moins fréquenté que le Grand Palais voisin tout en étant tout aussi marquant.",
    littleTip:
      "Terminez la visite par un massage thaï traditionnel à l'école de massage de Wat Pho, directement sur place — une façon authentique de prolonger l'expérience.",
    indicativeDuration: "1h30",
    photoKey: "wat-pho",
    altText: "Pavillon et chedi du complexe de Wat Pho à Bangkok",
  },
  {
    slug: "wat-saket-golden-mount",
    name: "Wat Saket (Golden Mount)",
    zone: "rattanakosin-banglamphu",
    categories: ["incontournables", "temples-patrimoine", "points-de-vue"],
    lat: 13.7537,
    lng: 100.5067,
    description:
      "Construit sur une colline artificielle au sommet d'un ancien temple effondré, le Golden Mount (Phu Khao Thong) est couronné d'un chedi doré visible de loin. Les marches qui mènent au sommet traversent une spirale ombragée jusqu'à une terrasse offrant l'une des meilleures vues panoramiques sur le vieux Bangkok.",
    whyVisit: "Le meilleur point de vue gratuit sur Rattanakosin et les toits dorés des temples environnants.",
    littleTip:
      "Montez en fin d'après-midi pour profiter de la lumière dorée du coucher de soleil sur les temples alentour, sans la chaleur du milieu de journée.",
    indicativeDuration: "45 min à 1h",
    photoKey: "wat-saket",
    altText: "Chedi doré au sommet du Golden Mount (Wat Saket) à Bangkok",
  },
  {
    slug: "wat-traimit",
    name: "Wat Traimit",
    zone: "chinatown-talat-noi",
    categories: ["temples-patrimoine"],
    lat: 13.7392,
    lng: 100.5139,
    description:
      "Ce temple de Chinatown abrite le plus grand Bouddha en or massif du monde : une statue de 3 mètres de haut pesant plus de 5 tonnes, dont l'origine est restée inconnue pendant des siècles sous une épaisse couche de plâtre, jusqu'à sa découverte accidentelle en 1955 lors d'un déplacement de la statue.",
    whyVisit: "Une histoire étonnante et une statue réellement impressionnante, à deux pas de Chinatown et de la gare de Hua Lamphong.",
    littleTip:
      "Le musée au rez-de-chaussée du bâtiment raconte l'histoire de la découverte de la statue — à ne pas manquer pour comprendre tout l'intérêt du lieu.",
    indicativeDuration: "45 min",
    photoKey: "wat-traimit",
    altText: "Façade blanche et dorée du temple Wat Traimit à Chinatown, Bangkok",
  },
  {
    slug: "wat-benchamabophit",
    name: "Wat Benchamabophit (temple de marbre)",
    zone: "rattanakosin-banglamphu",
    categories: ["temples-patrimoine"],
    lat: 13.7639,
    lng: 100.5133,
    description:
      "Surnommé le \"temple de marbre\" pour son revêtement en marbre blanc importé d'Italie, Wat Benchamabophit est l'un des temples les plus tardifs et les plus photogéniques de Bangkok, construit à la fin du XIXe siècle à la demande du roi Rama V. Sa cour intérieure rassemble une collection de statues de Bouddha de styles différents.",
    whyVisit: "Une architecture distincte des autres grands temples de la ville, dans un cadre plus calme et aéré.",
    littleTip:
      "Le temple se trouve dans le quartier de Dusit, un peu à l'écart des autres grands sites — à combiner avec une visite du quartier royal de Dusit tout proche.",
    indicativeDuration: "45 min",
    photoKey: "wat-benchamabophit",
    altText: "Vue sur la cour et le viharn en marbre blanc de Wat Benchamabophit à Bangkok",
  },
  {
    slug: "wat-suthat",
    name: "Wat Suthat et le Giant Swing",
    zone: "rattanakosin-banglamphu",
    categories: ["temples-patrimoine"],
    lat: 13.752,
    lng: 100.5008,
    description:
      "L'un des temples royaux les plus anciens et les plus prestigieux de Bangkok, reconnaissable à sa grande salle d'ordination entourée d'une galerie de Bouddhas dorés. Juste devant l'entrée se dresse le Giant Swing (Sao Ching Cha), une immense balançoire rouge autrefois utilisée pour une cérémonie brahmanique aujourd'hui interdite pour des raisons de sécurité.",
    whyVisit: "Moins visité que le Grand Palais ou Wat Pho, mais tout aussi riche sur le plan architectural, avec l'originalité du Giant Swing en prime.",
    littleTip: "Le Giant Swing ne sert plus à sa cérémonie d'origine, mais reste un excellent repère visuel et un bon point de photo pour la rue environnante.",
    indicativeDuration: "45 min à 1h",
    photoKey: "wat-suthat",
    altText: "Façade du viharn de Wat Suthat sous un ciel bleu à Bangkok",
  },
  {
    slug: "talat-noi",
    name: "Talat Noi",
    zone: "chinatown-talat-noi",
    categories: ["quartiers-balades"],
    lat: 13.737,
    lng: 100.5106,
    description:
      "Un dédale de ruelles entre Chinatown et le fleuve, resté largement à l'écart du tourisme de masse jusqu'à récemment. Ateliers mécaniques à ciel ouvert, maisons chinoises décaties, petits sanctuaires et fresques de street art se côtoient dans une atmosphère qui a inspiré de nombreux photographes.",
    whyVisit: "L'un des quartiers les plus photogéniques et les plus authentiques du vieux Bangkok, idéal pour une balade sans itinéraire précis.",
    littleTip:
      "Le meilleur moyen de découvrir Talat Noi est de s'y perdre à pied sans itinéraire fixe — les plus belles trouvailles sont souvent dans les détails d'une ruelle imprévue.",
    indicativeDuration: "1h à 1h30",
    photoKey: "talat-noi",
    altText: "Fresque murale colorée dans les ruelles du quartier de Talat Noi à Bangkok",
  },
  {
    slug: "pak-khlong-talat",
    name: "Pak Khlong Talat (marché aux fleurs)",
    zone: "rattanakosin-banglamphu",
    categories: ["marches"],
    lat: 13.7441,
    lng: 100.4958,
    description:
      "Le plus grand marché aux fleurs de Bangkok, actif jour et nuit près du pont Memorial Bridge. Des tonnes de fleurs fraîches — roses, orchidées, œillets d'Inde pour les offrandes — y transitent chaque jour, livrées puis revendues en gros et au détail dans une ambiance de ruche permanente.",
    whyVisit: "Une immersion sensorielle assez différente du reste des visites de temples, particulièrement spectaculaire tôt le matin ou tard le soir.",
    littleTip:
      "Le marché est à son plus intense entre 3h et 6h du matin pour les livraisons en gros, mais reste très actif et bien plus accessible en fin d'après-midi pour un visiteur de passage.",
    indicativeDuration: "30 à 45 min",
    photoKey: "pak-khlong-talat",
    altText: "Intérieur du marché aux fleurs Pak Khlong Talat à Bangkok avec des bouquets emballés",
  },
  {
    slug: "chatuchak-weekend-market",
    name: "Chatuchak Weekend Market",
    zone: "ari",
    categories: ["marches", "shopping"],
    lat: 13.7999,
    lng: 100.55,
    description:
      "L'un des plus grands marchés du monde, avec des milliers d'étals répartis en sections thématiques (vêtements, artisanat, plantes, antiquités, animaux, nourriture...) sur un vaste terrain au nord de la ville. Le marché n'ouvre que le week-end, attirant aussi bien les habitants de Bangkok que les touristes.",
    whyVisit: "Une expérience de shopping et de déambulation à l'échelle unique, impossible à reproduire ailleurs en ville.",
    littleTip:
      "Le plan du marché est notoirement difficile à suivre — mieux vaut accepter de se perdre un peu et repérer les sections par leur numéro plutôt que de chercher un itinéraire précis.",
    indicativeDuration: "2h à 4h, uniquement le week-end",
    photoKey: "chatuchak-market",
    altText: "Allée couverte bordée d'étals de vêtements et de souvenirs au marché de Chatuchak, Bangkok",
  },
  {
    slug: "chao-phraya-river",
    name: "Le Chao Phraya (balade fluviale)",
    zone: "riverside",
    categories: ["incontournables", "points-de-vue"],
    lat: 13.7193,
    lng: 100.5144,
    description:
      "Colonne vertébrale historique de Bangkok, le Chao Phraya traverse la ville du nord au sud et reste un axe de transport à part entière grâce aux bateaux-taxis publics (Chao Phraya Express Boat) qui relient la plupart des grands sites touristiques. Naviguer sur le fleuve, même pour un trajet utilitaire, offre une perspective différente sur la ville — temples, hôtels historiques et vie quotidienne des quartiers riverains.",
    whyVisit:
      "Un moyen à la fois pratique et spectaculaire de relier plusieurs visites tout en découvrant Bangkok depuis l'eau, en complément ou en alternative aux croisières touristiques dédiées.",
    littleTip:
      "Pas besoin de réserver une croisière touristique pour profiter du fleuve : les bateaux-taxis publics (Chao Phraya Express Boat) coûtent une fraction du prix et desservent directement Wat Arun, le Grand Palais et Chinatown.",
    indicativeDuration: "Variable selon le trajet",
    photoKey: "chao-phraya-river",
    altText: "Vue sur le fleuve Chao Phraya et les gratte-ciel du front de fleuve de Bangkok",
  },
  {
    slug: "mahanakhon-skywalk",
    name: "Mahanakhon SkyWalk",
    zone: "silom-sathorn",
    categories: ["incontournables", "points-de-vue"],
    lat: 13.7244,
    lng: 100.5288,
    description:
      "Au sommet de la tour King Power Mahanakhon, l'un des plus hauts gratte-ciel de Bangkok, le SkyWalk propose une plateforme d'observation à plus de 300 mètres de hauteur, dont une section au sol de verre transparent. La vue à 360° embrasse toute la ville, du fleuve Chao Phraya jusqu'aux tours de Sukhumvit.",
    whyVisit: "La vue panoramique la plus vertigineuse de Bangkok, particulièrement appréciée au coucher du soleil.",
    littleTip:
      "Les billets sont souvent moins chers à l'achat en ligne à l'avance ; passer en fin d'après-midi permet de voir la ville de jour puis illuminée, sans payer deux entrées.",
    indicativeDuration: "1h à 1h30",
    photoKey: "mahanakhon-skywalk",
    altText: "Vue panoramique sur les gratte-ciel de Bangkok depuis le sommet de la tour Mahanakhon",
  },
];

async function main() {
  console.log("Seeding Bangkok content wave 2 (9 zones, incontournables)…");

  const bangkok = await prisma.destination.findUniqueOrThrow({ where: { slug: "bangkok" } });
  const manifest: PhotoManifestEntry[] = JSON.parse(await readFile(`${PHOTOS_DIR}/manifest.json`, "utf-8"));
  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  for (const z of NEW_ZONES) {
    await prisma.zone.upsert({
      where: { destinationId_slug: { destinationId: bangkok.id, slug: z.slug } },
      update: {
        name: z.name,
        mapColor: z.mapColor,
        vibeText: z.vibeText,
        prosText: z.prosText,
        consText: z.consText,
        transportText: z.transportText,
        nearbyText: z.nearbyText,
        profileFitText: z.profileFitText,
        hotelAdviceText: z.hotelAdviceText,
      },
      create: {
        destinationId: bangkok.id,
        slug: z.slug,
        name: z.name,
        mapColor: z.mapColor,
        vibeText: z.vibeText,
        prosText: z.prosText,
        consText: z.consText,
        transportText: z.transportText,
        nearbyText: z.nearbyText,
        profileFitText: z.profileFitText,
        hotelAdviceText: z.hotelAdviceText,
      },
    });
    console.log("  zone:", z.name);
  }

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

  // Yaowarat Road appears in the brief's "incontournables" list too —
  // add the tag without disturbing its existing street-food/restaurants ones.
  const yaowarat = await prisma.place.findUnique({ where: { slug: "yaowarat-road" } });
  const incontournables = categoryBySlug.get("incontournables");
  if (yaowarat && incontournables) {
    await prisma.placeCategory.upsert({
      where: { placeId_categoryId: { placeId: yaowarat.id, categoryId: incontournables.id } },
      update: {},
      create: { placeId: yaowarat.id, categoryId: incontournables.id },
    });
    console.log("  tagged yaowarat-road as incontournables");
  }

  console.log("Wave 2 seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
