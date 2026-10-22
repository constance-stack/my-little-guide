/**
 * Third content wave: the editorial brief's "Temples et patrimoine —
 * Sélection complémentaire" (10 places beyond the incontournables already
 * seeded). All sit in zones already created in waves 1-2; the Thonburi
 * temples (Wat Paknam, Wat Kalayanamit, Wat Prayurawongsawat, Wat
 * Rakhang, Santa Cruz Church) finally give that zone real content.
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
  "/private/tmp/claude-501/-Users-constance/8b5fbae2-2d1e-4365-aae7-917e8137a620/scratchpad/photos_wave3";
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
    slug: "wat-ratchanatdaram",
    name: "Wat Ratchanatdaram et Loha Prasat",
    zone: "rattanakosin-banglamphu",
    categories: ["temples-patrimoine"],
    lat: 13.753,
    lng: 100.5013,
    description:
      "Ce temple doit sa célébrité au Loha Prasat, le \"Château de métal\", une structure à plusieurs niveaux hérissée de 37 flèches métalliques symbolisant les 37 vertus menant à l'illumination bouddhiste. C'est l'un des trois seuls édifices de ce type au monde encore debout, avec des exemples en Inde et au Sri Lanka aujourd'hui disparus.",
    whyVisit: "Une silhouette unique à Bangkok, très différente des chedis et prangs habituels, avec un escalier intérieur qui monte jusqu'à une terrasse offrant une belle vue sur le quartier.",
    littleTip: "Le temple se trouve juste à côté du Golden Mount (Wat Saket) — les deux se visitent facilement l'un après l'autre.",
    indicativeDuration: "30 à 45 min",
    photoKey: "wat-ratchanatdaram",
    altText: "Le Loha Prasat, château de métal à plusieurs niveaux du temple Wat Ratchanatdaram à Bangkok",
  },
  {
    slug: "wat-mahathat",
    name: "Wat Mahathat Yuwaratrangsarit",
    zone: "rattanakosin-banglamphu",
    categories: ["temples-patrimoine"],
    lat: 13.7554,
    lng: 100.4915,
    description:
      "Face au Grand Palais, de l'autre côté du terrain Sanam Luang, Wat Mahathat est l'un des temples les plus importants du bouddhisme thaïlandais et le siège de l'université monastique Mahachulalongkornrajavidyalaya. C'est aussi ici que se tient, le week-end, un marché réputé d'amulettes bouddhistes, fréquenté par des collectionneurs venus de tout le pays.",
    whyVisit: "Un temple d'une importance monastique majeure, avec une ambiance studieuse différente des grands sites touristiques voisins.",
    littleTip: "Le marché aux amulettes qui se tient aux abords du temple le week-end vaut le détour, même sans intention d'achat, pour observer les connaisseurs examiner les pièces à la loupe.",
    indicativeDuration: "30 à 45 min",
    photoKey: "wat-mahathat",
    altText: "Entrée du temple Wat Mahathat Yuwaratrangsarit près du Grand Palais à Bangkok",
  },
  {
    slug: "wat-bowonniwet",
    name: "Wat Bowonniwet Vihara",
    zone: "rattanakosin-banglamphu",
    categories: ["temples-patrimoine"],
    lat: 13.7595,
    lng: 100.5004,
    description:
      "Temple royal de premier rang, Wat Bowonniwet est étroitement lié à la monarchie thaïlandaise : plusieurs rois, dont Rama IV et Rama IX, y ont été moines avant ou pendant leur règne. Son architecture mêle des éléments chinois à la tradition thaïe, et son atmosphère reste nettement plus calme que celle des grands sites touristiques voisins malgré son importance historique.",
    whyVisit: "Un temple chargé d'histoire royale, à deux pas de Khao San Road, pour une pause plus posée entre deux visites.",
    littleTip: "Le temple est encore un monastère actif avec des moines résidents — gardez une attitude respectueuse et une tenue correcte, y compris en dehors des horaires de visite touristique.",
    indicativeDuration: "30 min",
    photoKey: "wat-bowonniwet",
    altText: "Le viharn principal de Wat Bowonniwet à Bangkok",
  },
  {
    slug: "wat-paknam-phasicharoen",
    name: "Wat Paknam Phasi Charoen",
    zone: "thonburi",
    categories: ["temples-patrimoine", "points-de-vue"],
    lat: 13.7193,
    lng: 100.4769,
    description:
      "Ce temple de Thonburi est devenu un site majeur grâce à son immense chedi doré de cinq étages, achevé au début des années 2020, dont le sommet abrite une mosaïque de Bouddha en cristal visible depuis une plateforme panoramique. Le complexe comprend aussi une statue de Bouddha assis parmi les plus grandes de Thaïlande.",
    whyVisit: "L'un des temples les plus spectaculaires et les plus récents de Bangkok, offrant à la fois une architecture impressionnante et une vue sur la ville depuis ses niveaux supérieurs.",
    littleTip: "Le temple est moins central que ceux de Rattanakosin — prévoyez un trajet en MRT (station Phasi Charoen ou Bang Phai selon l'itinéraire) plutôt qu'à pied depuis le centre.",
    indicativeDuration: "1h",
    photoKey: "wat-paknam",
    altText: "Intérieur doré de l'un des pavillons de Wat Paknam Phasi Charoen à Bangkok",
  },
  {
    slug: "wat-kalayanamit",
    name: "Wat Kalayanamit",
    zone: "thonburi",
    categories: ["temples-patrimoine"],
    lat: 13.7404,
    lng: 100.4913,
    description:
      "Sur la rive de Thonburi, juste en face de Chinatown, Wat Kalayanamit abrite l'un des plus grands Bouddhas assis à l'intérieur d'un bâtiment en Thaïlande, dans la posture Palilai (assis, jambes pendantes). Le temple mêle influences thaïes et chinoises, reflet de l'importante communauté chinoise qui l'a longtemps fréquenté.",
    whyVisit: "Un Bouddha assis impressionnant par sa taille, dans un temple nettement moins fréquenté par les touristes que ceux de la rive opposée.",
    littleTip: "Accessible facilement en bateau-taxi depuis le ponton de Ratchawong (Chinatown) — une courte traversée du fleuve qui vaut le détour.",
    indicativeDuration: "30 à 45 min",
    photoKey: "wat-kalayanamit",
    altText: "Grand Bouddha assis dans la posture Palilai à Wat Kalayanamit, Bangkok",
  },
  {
    slug: "wat-prayurawongsawat",
    name: "Wat Prayurawongsawat",
    zone: "thonburi",
    categories: ["temples-patrimoine"],
    lat: 13.7368,
    lng: 100.4934,
    description:
      "Reconnaissable à son grand chedi blanc visible depuis le fleuve, Wat Prayurawongsawat abrite aussi un jardin avec une colline artificielle (\"Khao Mo\") parsemée de petits sanctuaires, assez atypique parmi les temples de Bangkok. Le site est réputé plus calme et moins visité que ses équivalents sur la rive de Rattanakosin.",
    whyVisit: "Un chedi blanc immaculé et un jardin original, dans une ambiance nettement plus paisible que les grands sites touristiques.",
    littleTip: "La colline artificielle du jardin offre un point de vue inhabituel sur le temple — prenez le temps d'en faire le tour plutôt que de vous arrêter au seul chedi principal.",
    indicativeDuration: "30 à 45 min",
    photoKey: "wat-prayurawongsawat",
    altText: "Le grand chedi blanc de Wat Prayurawongsawat sur la rive de Thonburi à Bangkok",
  },
  {
    slug: "wat-rakhang",
    name: "Wat Rakhang Khositaram",
    zone: "thonburi",
    categories: ["temples-patrimoine"],
    lat: 13.7472,
    lng: 100.4867,
    description:
      "Situé juste en face du Grand Palais, sur la rive de Thonburi, Wat Rakhang (\"temple des cloches\") tire son nom des cloches que l'on y trouvait autrefois en abondance. Le temple abrite un ho trai (bibliothèque de manuscrits) en bois richement décoré, l'un des mieux conservés de Bangkok.",
    whyVisit: "Une vue magnifique sur le Grand Palais et Wat Arun depuis la rive opposée, dans un cadre bien plus tranquille que le centre touristique.",
    littleTip: "Le court trajet en bateau-taxi depuis le ponton de Tha Chang (juste devant le Grand Palais) ne prend que quelques minutes et offre déjà une belle perspective sur le fleuve.",
    indicativeDuration: "30 min",
    photoKey: "wat-rakhang",
    altText: "Le viharn de Wat Rakhang Khositaram sur la rive de Thonburi, Bangkok",
  },
  {
    slug: "wat-intharawihan",
    name: "Wat Intharawihan",
    zone: "rattanakosin-banglamphu",
    categories: ["temples-patrimoine"],
    lat: 13.7652,
    lng: 100.5008,
    description:
      "Ce temple du quartier de Banglamphu est surtout connu pour sa statue de Bouddha debout de 32 mètres de haut, Luang Pho To, visible de loin et recouverte de mosaïques dorées. Moins fréquenté que les grands temples du centre historique, il reste un site apprécié des habitants du quartier.",
    whyVisit: "Une statue de Bouddha debout impressionnante par sa taille, dans un quartier résidentiel plus authentique.",
    littleTip: "Il est possible de monter à l'intérieur de la statue jusqu'à une plateforme au niveau de la poitrine pour une vue sur le quartier environnant.",
    indicativeDuration: "30 à 45 min",
    photoKey: "wat-intharawihan",
    altText: "Grande statue de Bouddha debout doré au temple Wat Intharawihan à Bangkok",
  },
  {
    slug: "santa-cruz-church",
    name: "Santa Cruz Church",
    zone: "thonburi",
    categories: ["temples-patrimoine", "quartiers-balades"],
    lat: 13.7334,
    lng: 100.4958,
    description:
      "Au cœur du quartier historique de Kudi Chin, à majorité catholique depuis l'installation de marchands portugais au XVIIe siècle, Santa Cruz Church est une église au style néoclassique coloré, avec un dôme octogonal caractéristique. Le quartier environnant, mêlant héritages portugais, chinois et thaïs, se prête particulièrement bien à la balade à pied.",
    whyVisit: "Un témoignage rare du passé multiculturel de Bangkok, dans un quartier calme et riche en petites découvertes architecturales.",
    littleTip: "Combinez la visite avec une balade dans Kudi Chin pour découvrir les maisons portugaises traditionnelles et goûter le \"khanom farang kudi chin\", une pâtisserie locale héritée de cette communauté.",
    indicativeDuration: "30 min (plus la balade dans le quartier)",
    photoKey: "santa-cruz-church",
    altText: "Le dôme octogonal rouge et blanc de Santa Cruz Church dans le quartier de Kudi Chin, Bangkok",
  },
  {
    slug: "assumption-cathedral",
    name: "Assumption Cathedral",
    zone: "riverside",
    categories: ["temples-patrimoine"],
    lat: 13.7227,
    lng: 100.5147,
    description:
      "La principale cathédrale catholique de Bangkok, construite à la fin du XIXe siècle dans le quartier de Bang Rak, non loin du fleuve. Sa façade en briques rouges et ses deux clochers tranchent nettement avec les temples bouddhistes environnants, témoignage de la présence occidentale historique dans ce quartier marchand.",
    whyVisit: "Une architecture européenne surprenante en plein Bangkok, dans un quartier qui concentre plusieurs bâtiments coloniaux et hôtels historiques.",
    littleTip: "Le quartier autour de la cathédrale (Soi Charoen Krung 40) regroupe plusieurs bâtiments historiques intéressants à combiner dans une même balade à pied.",
    indicativeDuration: "20 à 30 min",
    photoKey: "assumption-cathedral",
    altText: "Façade en briques rouges et clochers jumeaux de l'Assumption Cathedral à Bangkok",
  },
];

async function main() {
  console.log("Seeding Bangkok content wave 3 (temples complémentaires)…");

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

  console.log("Wave 3 seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
