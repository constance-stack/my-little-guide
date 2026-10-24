/**
 * Koh Tao — fifth destination, built from the admin "Nouvelle destination"
 * request queue (destinationRequest id cmvlfcrxv000229cd3yzxequh): "guide
 * très complet", best beaches, insolite activities, food/drink, and an
 * intro covering how to actually get to the island (added as a hardcoded
 * intro block on the guide page, matching the existing Bangkok pattern).
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

const SCRATCH =
  "/private/tmp/claude-501/-Users-constance/8b5fbae2-2d1e-4365-aae7-917e8137a620/scratchpad";
const STORAGE_ROOT = process.env.STORAGE_ROOT ?? "./storage";

type PhotoManifestEntry = {
  slug: string;
  found: boolean;
  title?: string;
  artist?: string;
  license?: string;
  source_url?: string;
  local_path?: string;
};

const GOOD_KEYS = new Set<string>([
  "sairee-beach",
  "mango-bay",
  "mae-haad-beach",
  "mae-haad-pier",
  "john-suwan-viewpoint",
  "ao-leuk",
  "chumphon-pinnacle",
]);

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
  altText?: string;
};

const PLACES: PlaceDef[] = [
  // ---------- Sairee Beach ----------
  {
    slug: "sairee-beach",
    name: "Sairee Beach",
    zone: "sairee",
    categories: ["incontournables"],
    lat: 10.0963, lng: 99.8323,
    description: "La plus longue plage de Koh Tao, environ 1,8 km de sable bordé d'hôtels, de restaurants et de bars, cœur battant de l'île à la fois le jour pour la baignade et le soir pour sa vie nocturne.",
    whyVisit: "Le point de repère incontournable de Koh Tao, à la fois plage principale et centre de vie de l'île.",
    littleTip: "L'extrémité nord de la plage est nettement plus calme que le centre, pratique pour une baignade tranquille.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "lotus-bar",
    name: "Lotus Bar",
    zone: "sairee",
    categories: ["bars-rooftops"],
    lat: 10.0975, lng: 99.8325,
    description: "L'un des bars de plage les plus connus de Sairee, avec groupe live en début de soirée puis DJ plus tard dans la nuit, réputé pour son coucher de soleil et ses happy hours.",
    whyVisit: "L'une des adresses de soirée les plus populaires de Sairee Beach, pour le coucher de soleil comme pour la suite de soirée.",
    littleTip: "Les happy hours démarrent en fin d'après-midi — un bon moment pour profiter du coucher de soleil à prix réduit.",
    indicativeDuration: "1h30 et plus",
  },
  {
    slug: "choppers-sports-bar",
    name: "Chopper's Sports Bar",
    zone: "sairee",
    categories: ["bars-rooftops"],
    lat: 10.0970, lng: 99.8324,
    description: "Un bar sportif sur deux étages à Sairee, point de départ classique du pub crawl de Koh Tao, avec écrans de sport, billard et ambiance festive toute la soirée.",
    whyVisit: "Le point de ralliement habituel pour démarrer une soirée à Koh Tao.",
    littleTip: "C'est traditionnellement le point de départ du pub crawl de l'île, si vous voulez enchaîner plusieurs bars dans la soirée.",
    indicativeDuration: "1h30 et plus",
  },
  {
    slug: "fizz-beach-lounge",
    name: "Fizz Beach Lounge",
    zone: "sairee",
    categories: ["restaurants", "bars-rooftops"],
    lat: 10.0965, lng: 99.8322,
    description: "Un bar-restaurant en bord de plage à Sairee, apprécié pour son ambiance plus feutrée que les grands bars voisins, avec coussins au sol et vue dégagée sur le coucher de soleil.",
    whyVisit: "Une ambiance plus détendue sur la même plage que les bars les plus festifs, pour un dîner avec vue.",
    littleTip: "Les places en coussins face à la mer sont les plus demandées au moment du coucher de soleil — mieux vaut arriver tôt.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "whitening-restaurant",
    name: "Whitening",
    zone: "sairee",
    categories: ["restaurants"],
    lat: 10.0960, lng: 99.8320,
    description: "Un restaurant à Sairee Beach qui revisite les classiques thaïlandais avec des touches internationales, servi dans un cadre soigné en bord de plage.",
    whyVisit: "Une cuisine thaïlandaise plus élaborée que la moyenne des adresses de Sairee.",
    littleTip: "Réservez en soirée en haute saison, l'adresse est assez prisée des résidents de longue durée.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "maya-beach-club",
    name: "Maya Beach Club",
    zone: "sairee",
    categories: ["bars-rooftops"],
    lat: 10.0980, lng: 99.8328,
    description: "Un beach club à Sairee avec piscine à débordement, transats et programmation musicale, pensé pour une après-midi festive en bord de mer.",
    whyVisit: "L'option beach club la plus aboutie de Koh Tao pour une journée piscine et musique.",
    littleTip: "Un lit de plage ou transat se réserve généralement à l'avance en haute saison.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "charcoal-bay",
    name: "Charcoal Bay",
    zone: "sairee",
    categories: ["restaurants", "bars-rooftops"],
    lat: 10.0955, lng: 99.8318,
    description: "Un bar-restaurant réputé pour ses cocktails et sa vue sur le coucher de soleil, sur la côte ouest de Koh Tao, dans un cadre plus intime que les grands bars de plage.",
    whyVisit: "L'une des meilleures adresses de l'île pour un cocktail avec vue sur le coucher de soleil.",
    littleTip: "Idéal pour combiner un dîner léger et le coucher de soleil sans l'ambiance très festive de Sairee.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "freedom-beach-koh-tao",
    name: "Freedom Beach",
    zone: "sairee",
    categories: ["quartiers-balades"],
    lat: 10.0750, lng: 99.8280,
    description: "Une petite plage plus tranquille au sud de Sairee, moins fréquentée que la plage principale, appréciée pour ses rochers propices au snorkeling et son ambiance décontractée.",
    whyVisit: "Une alternative plus calme à Sairee Beach, à quelques minutes seulement du centre.",
    littleTip: "Les rochers à chaque extrémité de la plage offrent un bon snorkeling facile d'accès depuis le sable.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "west-coast-viewpoint",
    name: "West Coast Viewpoint",
    zone: "sairee",
    categories: ["points-de-vue"],
    lat: 10.0850, lng: 99.8300,
    description: "Un point de vue en hauteur sur les collines dominant la côte ouest de Koh Tao, offrant un panorama sur Sairee Beach et les baies environnantes, moins connu et moins fréquenté que John-Suwan.",
    whyVisit: "Un panorama complet sur la côte ouest de l'île, pour un coucher de soleil loin de la foule.",
    littleTip: "La montée se fait en partie sur piste non goudronnée — prévoir de bonnes chaussures ou un véhicule adapté.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "mango-bay",
    name: "Mango Bay",
    zone: "sairee",
    categories: ["quartiers-balades", "excursions"],
    lat: 10.1100, lng: 99.8280,
    description: "Une baie au nord de Koh Tao, accessible principalement par bateau, réputée pour ses fonds coralliens peu profonds adaptés aux débutants en plongée et en snorkeling.",
    whyVisit: "L'un des meilleurs spots d'initiation à la plongée et au snorkeling de l'île.",
    littleTip: "Profondeur généralement inférieure à 16 mètres — un site idéal pour un premier baptême de plongée.",
    indicativeDuration: "demi-journée",
  },

  // ---------- Mae Haad & Chalok Baan Kao ----------
  {
    slug: "mae-haad-beach",
    name: "Mae Haad Beach",
    zone: "mae-haad-chalok",
    categories: ["quartiers-balades"],
    lat: 10.0894, lng: 99.8386,
    description: "La plage située juste à côté du débarcadère principal de Koh Tao, avec une zone de baignade protégée, pratique pour un premier contact avec l'île dès la descente du bateau.",
    whyVisit: "La plage la plus pratique pour une baignade rapide et sûre, juste à côté du débarcadère.",
    littleTip: "La zone de baignade balisée devant les restaurants du quai est protégée du passage des bateaux.",
    indicativeDuration: "1h",
  },
  {
    slug: "mae-haad-pier",
    name: "Mae Haad (le débarcadère)",
    zone: "mae-haad-chalok",
    categories: ["marches"],
    lat: 10.0890, lng: 99.8390,
    description: "Le village principal de Koh Tao, autour du débarcadère des ferries, concentrant la majorité des agences de plongée, restaurants et commerces de l'île.",
    whyVisit: "Le point d'arrivée et le centre pratique de l'île, pour réserver excursions et sorties plongée.",
    littleTip: "C'est aussi le meilleur endroit pour comparer les écoles de plongée avant de réserver un baptême ou une certification.",
    indicativeDuration: "1h",
  },
  {
    slug: "chalok-baan-kao",
    name: "Chalok Baan Kao",
    zone: "mae-haad-chalok",
    categories: ["quartiers-balades"],
    lat: 10.0580, lng: 99.8419,
    description: "Une baie au sud de Koh Tao, deuxième zone d'hébergement la plus développée après Sairee, avec une ambiance plus familiale et nettement plus calme.",
    whyVisit: "Une bonne base plus tranquille que Sairee, à proximité du point de vue de John-Suwan.",
    littleTip: "Base pratique pour combiner plage et montée au John-Suwan Viewpoint tout proche.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "john-suwan-viewpoint",
    name: "John-Suwan Viewpoint",
    zone: "mae-haad-chalok",
    categories: ["incontournables", "points-de-vue"],
    lat: 10.0553, lng: 99.8407,
    description: "Le point de vue le plus emblématique de Koh Tao, sur le cap à la pointe sud de l'île, offrant une vue simultanée sur les baies de Chalok Baan Kao et de Thian Og.",
    whyVisit: "Le panorama le plus célèbre de l'île, à ne pas manquer malgré la montée.",
    littleTip: "Environ 20 minutes de montée depuis le parking — privilégiez le lever du soleil pour éviter la chaleur et la foule.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "shark-bay",
    name: "Shark Bay (Ao Thian Ok)",
    zone: "mae-haad-chalok",
    categories: ["quartiers-balades", "excursions"],
    lat: 10.0600, lng: 99.8500,
    description: "Une baie au sud-est de Koh Tao, connue pour la présence régulière de petits requins pointe noire inoffensifs dans ses eaux peu profondes, visibles en snorkeling depuis la plage.",
    whyVisit: "L'un des rares endroits où observer facilement des requins de récif sans sortir en bateau.",
    littleTip: "Les requins sont le plus souvent visibles tôt le matin, quand l'eau est encore calme.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "chu-chus-restaurant",
    name: "Chu Chu's",
    zone: "mae-haad-chalok",
    categories: ["restaurants"],
    lat: 10.0590, lng: 99.8415,
    description: "Un restaurant réputé pour sa cuisine thaïlandaise authentique, apprécié des habitants et des résidents de longue durée autant que des visiteurs, dans le secteur de Chalok Baan Kao.",
    whyVisit: "Une cuisine thaïlandaise authentique, loin des adresses les plus touristiques de Sairee.",
    littleTip: "Les plats épicés le sont vraiment — précisez votre niveau de tolérance au piment en commandant.",
    indicativeDuration: "1h à 1h30",
  },

  // ---------- Côte est & excursions ----------
  {
    slug: "ao-tanote",
    name: "Ao Tanote (Tanote Bay)",
    zone: "est-excursions-koh-tao",
    categories: ["quartiers-balades"],
    lat: 10.0847, lng: 99.8565,
    description: "Une baie sur la côte est de Koh Tao, moins développée que la côte ouest, bordée de rochers et d'une eau claire propice au snorkeling, accessible par une route de montagne sinueuse.",
    whyVisit: "Une baie plus sauvage de la côte est, pour échapper à l'agitation de Sairee.",
    littleTip: "La route d'accès est pentue et sinueuse — prudence à scooter, surtout après la pluie.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "ao-leuk",
    name: "Ao Leuk",
    zone: "est-excursions-koh-tao",
    categories: ["quartiers-balades"],
    lat: 10.0683, lng: 99.8537,
    description: "Une baie tranquille de la côte est de Koh Tao, au sable fin et à l'eau calme, nettement moins fréquentée que les plages de la côte ouest.",
    whyVisit: "Une des plages les plus paisibles de l'île, pour une après-midi loin de la foule.",
    littleTip: "Peu de services sur place — prévoyez eau et en-cas si vous y passez l'après-midi.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "hin-wong-bay",
    name: "Hin Wong Bay",
    zone: "est-excursions-koh-tao",
    categories: ["quartiers-balades"],
    lat: 10.0950, lng: 99.8550,
    description: "Une baie rocheuse de la côte est, bordée de bungalows rustiques, réputée pour son bon snorkeling directement depuis le rivage malgré l'absence de sable fin.",
    whyVisit: "Un cadre plus authentique et sauvage, pour qui privilégie le snorkeling à la plage de sable.",
    littleTip: "La baie est surtout rocheuse, pas sablonneuse — prévoir des chaussures d'eau pour entrer dans l'eau confortablement.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "koh-nang-yuan",
    name: "Koh Nang Yuan",
    zone: "est-excursions-koh-tao",
    categories: ["incontournables", "excursions", "points-de-vue"],
    lat: 10.1058, lng: 99.8094,
    description: "Trois îlots reliés par une langue de sable commune, juste au large de Koh Tao, avec un point de vue sur les hauteurs offrant l'une des vues les plus photographiées de Thaïlande.",
    whyVisit: "L'excursion la plus emblématique depuis Koh Tao, pour sa vue iconique depuis le point de vue.",
    littleTip: "Un droit d'entrée est demandé à l'arrivée en bateau — prévoyez de l'argent liquide.",
    indicativeDuration: "demi-journée",
  },
  {
    slug: "japanese-gardens-dive-site",
    name: "Japanese Gardens",
    zone: "est-excursions-koh-tao",
    categories: ["excursions"],
    lat: 10.1030, lng: 99.8130,
    description: "Un site de plongée et de snorkeling peu profond près de Koh Nang Yuan, parsemé de blocs coralliens, particulièrement adapté aux débutants et aux baptêmes de plongée.",
    whyVisit: "L'un des meilleurs sites pour un premier baptême de plongée à Koh Tao.",
    littleTip: "Profondeur généralement inférieure à 14 mètres — accessible même sans certification.",
    indicativeDuration: "demi-journée",
  },
  {
    slug: "sail-rock",
    name: "Sail Rock (Hin Bai)",
    zone: "est-excursions-koh-tao",
    categories: ["excursions"],
    lat: 10.0000, lng: 99.8690,
    description: "Un pinacle rocheux émergeant en pleine mer entre Koh Tao et Koh Phangan, considéré comme l'un des meilleurs sites de plongée du golfe de Thaïlande, avec une cheminée verticale traversante.",
    whyVisit: "L'un des sites de plongée les plus réputés de toute la région, pour les plongeurs certifiés.",
    littleTip: "Le site est plus éloigné que les autres — prévoyez une sortie à la journée plutôt qu'une demi-journée.",
    indicativeDuration: "journée complète",
  },
  {
    slug: "chumphon-pinnacle",
    name: "Chumphon Pinnacle",
    zone: "est-excursions-koh-tao",
    categories: ["excursions"],
    lat: 10.1500, lng: 99.7500,
    description: "Un pinacle sous-marin au large au nord-ouest de Koh Tao, l'un des sites de plongée les plus profonds et les plus réputés de l'île, parfois fréquenté par des requins-baleines.",
    whyVisit: "Le site de plongée en profondeur le plus recherché autour de Koh Tao.",
    littleTip: "Réservé aux plongeurs expérimentés en raison du courant et de la profondeur du site.",
    indicativeDuration: "journée complète",
  },
  {
    slug: "new-heaven-reef-conservation",
    name: "New Heaven Reef Conservation Program",
    zone: "est-excursions-koh-tao",
    categories: ["experiences-insolites"],
    lat: 10.0580, lng: 99.8420,
    description: "Un programme de conservation récifale basé à Koh Tao, qui propose aux plongeurs de participer à des actions concrètes de restauration corallienne plutôt qu'à de simples plongées d'observation.",
    whyVisit: "Une façon de plonger en contribuant directement à la préservation des récifs de l'île.",
    littleTip: "Les programmes s'adressent aussi bien aux plongeurs confirmés qu'aux débutants curieux de conservation marine.",
    indicativeDuration: "demi-journée à journée complète",
  },
  {
    slug: "twins-dive-site",
    name: "Twins",
    zone: "est-excursions-koh-tao",
    categories: ["excursions"],
    lat: 10.1150, lng: 99.8250,
    description: "Un site de plongée peu profond près de Mango Bay, composé de deux formations rocheuses coralliennes, apprécié pour sa facilité d'accès et sa richesse en vie marine.",
    whyVisit: "Un site facile et riche en vie marine, bon complément à Mango Bay pour une sortie plongée.",
    littleTip: "Souvent combiné avec Mango Bay et Japanese Gardens dans une même sortie bateau au nord de l'île.",
    indicativeDuration: "demi-journée",
  },
];

const ZONE_DEFS = [
  {
    slug: "sairee",
    name: "Sairee Beach",
    mapColor: "#2e7d6e",
    vibeText: "La plage principale et le cœur de la vie de Koh Tao, entre longue plage de sable, restaurants et vie nocturne la plus animée de l'île.",
    prosText: "Tout est accessible à pied, plus grand choix d'hébergements, bars et restaurants, vie nocturne la plus riche de l'île.",
    consText: "Plus animé et moins calme que le reste de l'île, surtout en soirée.",
    transportText: "Se parcourt à pied pour l'essentiel ; scooter ou taxi pour rejoindre le reste de l'île.",
    nearbyText: "Mae Haad et son débarcadère sont à quelques minutes au sud.",
    profileFitText: "Pour qui veut tout avoir à portée de main, plage, restaurants et vie nocturne.",
    hotelAdviceText: "Le plus grand choix d'hébergements de l'île, de l'auberge au resort.",
  },
  {
    slug: "mae-haad-chalok",
    name: "Mae Haad & Chalok Baan Kao",
    mapColor: "#4a7c59",
    vibeText: "Le débarcadère principal de l'île et, plus au sud, la baie de Chalok Baan Kao — plus calme, à proximité immédiate du point de vue emblématique de John-Suwan.",
    prosText: "Pratique pour arriver et repartir, ambiance plus familiale à Chalok, John-Suwan Viewpoint à proximité.",
    consText: "Mae Haad reste un secteur de passage, moins agréable pour un long séjour.",
    transportText: "Scooter ou taxi pour rejoindre Sairee ou la côte est ; Mae Haad se parcourt à pied.",
    nearbyText: "John-Suwan Viewpoint et Shark Bay sont à quelques minutes de Chalok Baan Kao.",
    profileFitText: "Pour qui cherche un bon compromis entre praticité et tranquillité.",
    hotelAdviceText: "Bon choix d'hébergements à Chalok Baan Kao, plus calme que Sairee.",
  },
  {
    slug: "est-excursions-koh-tao",
    name: "Côte est & excursions",
    mapColor: "#2a7a8c",
    vibeText: "La côte est de Koh Tao, plus sauvage et moins développée, ainsi que les meilleurs spots de plongée et l'excursion incontournable vers Koh Nang Yuan.",
    prosText: "Baies préservées, meilleurs sites de plongée de l'île, moins de monde qu'à Sairee.",
    consText: "Routes d'accès parfois difficiles, peu d'hébergements sur la côte est elle-même.",
    transportText: "Scooter recommandé pour la côte est (routes sinueuses) ; bateau pour les excursions et sites de plongée.",
    nearbyText: "Koh Nang Yuan et les principaux sites de plongée se rejoignent en bateau depuis Mae Haad ou Sairee.",
    profileFitText: "Pour les plongeurs et amateurs de nature, en complément d'un séjour côté Sairee ou Chalok.",
    hotelAdviceText: "Peu d'hébergements sur la côte est elle-même — secteur à visiter en excursion depuis Sairee ou Chalok.",
  },
];

async function main() {
  console.log("Seeding Koh Tao destination…");

  const thailand = await prisma.country.upsert({
    where: { slug: "thailande" },
    update: {},
    create: { slug: "thailande", name: "Thaïlande" },
  });

  const destination = await prisma.destination.upsert({
    where: { slug: "koh-tao" },
    update: { status: "PUBLISHED" },
    create: {
      countryId: thailand.id,
      slug: "koh-tao",
      name: "Koh Tao",
      kind: "ISLAND",
      size: "SMALL",
      status: "PUBLISHED",
    },
  });

  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const ENABLED_CATEGORIES = [
    "incontournables", "quartiers-balades", "experiences-insolites", "restaurants",
    "bars-rooftops", "marches", "excursions", "points-de-vue",
  ];
  await prisma.destination.update({
    where: { id: destination.id },
    data: {
      categories: {
        set: ENABLED_CATEGORIES.map((slug) => ({ id: categoryBySlug.get(slug)!.id })),
      },
    },
  });

  const zoneBySlug = new Map<string, { id: string }>();
  for (const z of ZONE_DEFS) {
    const zone = await prisma.zone.upsert({
      where: { destinationId_slug: { destinationId: destination.id, slug: z.slug } },
      update: {
        name: z.name, mapColor: z.mapColor, vibeText: z.vibeText, prosText: z.prosText,
        consText: z.consText, transportText: z.transportText, nearbyText: z.nearbyText,
        profileFitText: z.profileFitText, hotelAdviceText: z.hotelAdviceText,
      },
      create: { destinationId: destination.id, ...z },
    });
    zoneBySlug.set(z.slug, zone);
  }

  let manifest: PhotoManifestEntry[] = [];
  try {
    manifest = JSON.parse(await readFile(`${SCRATCH}/photos_koh_tao/manifest.json`, "utf-8"));
  } catch {
    console.log("No photo manifest found yet — seeding without photos.");
  }

  let photoCount = 0;
  for (const def of PLACES) {
    let photoId: string | null = null;
    if (GOOD_KEYS.has(def.slug)) {
      const entry = manifest.find((m) => m.slug === def.slug && m.found && m.local_path);
      if (entry && entry.local_path) {
        const ext = entry.local_path.split(".").pop() || "jpg";
        const storageKey = `photos/${def.slug}.${ext}`;
        const destPath = join(STORAGE_ROOT, storageKey);
        await mkdir(dirname(destPath), { recursive: true });
        await copyFile(entry.local_path, destPath);
        const artist = (entry.artist ?? "").split("\n")[0].replace(/Feel free to.*/i, "").trim();
        const photoStorageKey = `/api/storage/${storageKey}`;
        const existingPhoto = await prisma.photo.findFirst({ where: { storageKey: photoStorageKey } });
        const photoData = {
          storageKey: photoStorageKey,
          photographer: artist || "Non attribué (licence le permettant)",
          sourceName: "Wikimedia Commons",
          sourceUrl: entry.source_url ?? "",
          licenseType: entry.license ?? "",
          verifiedAt: new Date(),
          commercialOk: true,
          attributionText: artist ? `Photo : ${artist}, via Wikimedia Commons (${entry.license})` : null,
          altText: def.altText ?? def.name,
        };
        const photo = existingPhoto
          ? await prisma.photo.update({ where: { id: existingPhoto.id }, data: photoData })
          : await prisma.photo.create({ data: photoData });
        photoId = photo.id;
        photoCount++;
      }
    }

    const zone = zoneBySlug.get(def.zone);
    const place = await prisma.place.upsert({
      where: { slug: def.slug },
      update: {
        name: def.name, destinationId: destination.id, zoneId: zone?.id, status: "PUBLISHED",
        lat: def.lat, lng: def.lng, description: def.description, whyVisit: def.whyVisit,
        littleTip: def.littleTip, indicativeDuration: def.indicativeDuration, isFictionalDemo: false,
      },
      create: {
        slug: def.slug, destinationId: destination.id, zoneId: zone?.id, name: def.name,
        status: "PUBLISHED", lat: def.lat, lng: def.lng, description: def.description,
        whyVisit: def.whyVisit, littleTip: def.littleTip, indicativeDuration: def.indicativeDuration,
        isFictionalDemo: false,
      },
    });

    await prisma.placeCategory.deleteMany({ where: { placeId: place.id } });
    for (const catSlug of def.categories) {
      const cat = categoryBySlug.get(catSlug);
      if (cat) await prisma.placeCategory.create({ data: { placeId: place.id, categoryId: cat.id } });
    }
    if (photoId) {
      await prisma.placePhoto.deleteMany({ where: { placeId: place.id } });
      await prisma.placePhoto.create({ data: { placeId: place.id, photoId, sortOrder: 0 } });
    }

    console.log("  place:", def.name);
  }

  console.log(`Koh Tao seed complete: ${PLACES.length} places, ${photoCount} with real photos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
