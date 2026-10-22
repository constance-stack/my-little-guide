/**
 * Eleventh content wave: the brief's "Restaurants" list. Each place's
 * current operating status was checked via web search before writing
 * (see conversation) — notably Raan Jay Fai's famously limited, variable
 * schedule and Sorn/Nusara/Sühring's booking difficulty are called out
 * in their Little Tip rather than glossed over.
 *
 * Unlike landmarks, independent restaurants rarely have a genuine,
 * specific photo on Wikimedia Commons — only 5 of these 20 do. Rather
 * than attach a generic "Thai food" stock photo that isn't verifiably
 * *this* restaurant, the other 15 are published without a photo; the
 * PlaceDetail component already handles that gracefully. The site owner
 * can add an authorized hero photo for these later via the admin.
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
  "/private/tmp/claude-501/-Users-constance/8b5fbae2-2d1e-4365-aae7-917e8137a620/scratchpad/photos_wave11";
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
    slug: "thipsamai",
    name: "Thipsamai",
    zone: "rattanakosin-banglamphu",
    categories: ["restaurants", "street-food"],
    lat: 13.7536,
    lng: 100.5033,
    description:
      "Ouvert depuis 1966 sur Maha Chai Road, Thipsamai est considéré par beaucoup comme la meilleure adresse de pad thaï de Bangkok, au point d'être devenu une institution à lui seul plutôt qu'une simple échoppe de rue. La recette, gardée secrète depuis des décennies, se décline en plusieurs versions, dont une enveloppée dans une fine omelette.",
    whyVisit: "Le pad thaï le plus réputé de la ville, dans un décor de restaurant de rue resté authentique malgré la notoriété.",
    littleTip: "L'attente peut être longue aux heures de pointe (18h-21h) — venez plus tôt en soirée ou en fin d'après-midi pour l'éviter.",
    indicativeDuration: "45 min à 1h",
    photoKey: "thipsamai",
    altText: "L'équipe de cuisiniers de Thipsamai préparant le pad thaï dans la rue à Bangkok",
  },
  {
    slug: "somtum-der",
    name: "Somtum Der",
    zone: "silom-sathorn",
    categories: ["restaurants"],
    lat: 13.7281,
    lng: 100.5346,
    description:
      "Un restaurant spécialisé dans la cuisine du nord-est de la Thaïlande (Isan), en particulier le som tam (salade de papaye verte pilée), décliné en de nombreuses variantes. L'ambiance, plus animée et moins guindée que la gastronomie thaïlandaise centrale, reflète l'esprit convivial de la cuisine de rue d'Isan.",
    whyVisit: "Une des meilleures adresses pour découvrir la cuisine d'Isan, épicée et moins connue des visiteurs que la cuisine centrale thaïlandaise.",
    littleTip: "Demandez le niveau de piment adapté à votre tolérance — la cuisine d'Isan traditionnelle est nettement plus relevée que la moyenne.",
    indicativeDuration: "1h",
  },
  {
    slug: "supanniga-eating-room",
    name: "Supanniga Eating Room",
    zone: "riverside",
    categories: ["restaurants"],
    lat: 13.7458,
    lng: 100.4918,
    description:
      "Installé sur Maha Rat Road près de Wat Pho, ce restaurant met en avant des recettes familiales de l'est de la Thaïlande, transmises par la grand-mère de la fondatrice. La terrasse en bord de fleuve offre une vue sur le Chao Phraya, en complément d'une cuisine thaïlandaise régionale moins souvent proposée aux visiteurs.",
    whyVisit: "Une cuisine thaïlandaise régionale authentique dans un cadre élégant avec vue sur le fleuve.",
    littleTip: "Réservez une table côté terrasse à l'avance pour profiter de la vue sur le Chao Phraya, particulièrement agréable au coucher du soleil.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "krua-apsorn",
    name: "Krua Apsorn",
    zone: "rattanakosin-banglamphu",
    categories: ["restaurants"],
    lat: 13.7536,
    lng: 100.5022,
    description:
      "Un restaurant familial réputé depuis les années 1990 pour sa cuisine thaïlandaise traditionnelle, en particulier son omelette au crabe moelleuse et son curry de crabe au curry jaune. Sa réputation doit beaucoup au bouche-à-oreille et à l'appréciation d'un membre de la famille royale thaïlandaise pour certains de ses plats.",
    whyVisit: "Une cuisine thaïlandaise classique exécutée avec un soin rare, loin de l'agitation des adresses plus touristiques.",
    littleTip: "Fermé le dimanche — vérifiez les horaires avant de vous déplacer, ils varient légèrement selon les sources.",
    indicativeDuration: "1h",
  },
  {
    slug: "raan-jay-fai",
    name: "Raan Jay Fai",
    zone: "rattanakosin-banglamphu",
    categories: ["restaurants", "street-food"],
    lat: 13.7524,
    lng: 100.5035,
    description:
      "La cuisinière de rue la plus célèbre de Bangkok, reconnaissable à ses lunettes de ski portées pour cuisiner au wok au-dessus de braises à ciel ouvert. Son omelette au crabe et ses nouilles sautées au crabe (phat khi mao) lui ont valu une étoile au Guide Michelin, fait rarissime pour un stand de rue.",
    whyVisit: "L'une des très rares adresses de street food au monde distinguées par une étoile Michelin, et une expérience de cuisine de rue devenue légendaire.",
    littleTip: "Les horaires sont réduits et irréguliers (généralement quelques jours par semaine seulement) et les réservations ne sont pas garanties — prévoyez de la flexibilité et vérifiez le jour même avant de vous déplacer.",
    indicativeDuration: "1h, avec possible attente",
    photoKey: "raan-jay-fai",
    altText: "Jay Fai cuisinant au wok avec ses lunettes de ski caractéristiques dans son restaurant de rue à Bangkok",
  },
  {
    slug: "savoey-seafood",
    name: "Savoey Seafood",
    zone: "siam-chit-lom",
    categories: ["restaurants"],
    lat: 13.7441,
    lng: 100.5461,
    description:
      "Une chaîne de restaurants de fruits de mer thaïlandais établie depuis plus de 45 ans, avec plusieurs adresses à Bangkok dont une au Mercury Ville sur Ploenchit Road. Crabe au curry, crevettes grillées et poissons frais composent une carte de fruits de mer classique thaïlandaise, à des prix plus accessibles que les grandes tables gastronomiques.",
    whyVisit: "Une valeur sûre pour les fruits de mer thaïlandais, fiable et bien établie depuis des décennies.",
    littleTip: "Plusieurs succursales existent dans la ville — vérifiez laquelle est la plus proche de votre hébergement plutôt que de viser une adresse précise.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "here-hai",
    name: "Here Hai",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["restaurants"],
    lat: 13.7214,
    lng: 100.5853,
    description:
      "Un restaurant de fruits de mer sur deux étages dans le quartier d'Ekkamai, distingué par un Bib Gourmand au Guide Michelin pour son rapport qualité-prix. L'ambiance reste simple et bruyante, typique des bonnes adresses de quartier plutôt qu'une table gastronomique.",
    whyVisit: "Des fruits de mer de qualité à des prix raisonnables, reconnus par le Michelin sans les codes de la haute gastronomie.",
    littleTip: "Fermé le lundi — l'endroit est plein tous les soirs, mieux vaut arriver tôt ou réserver.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "sorn-restaurant",
    name: "Sorn",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["restaurants"],
    lat: 13.7246,
    lng: 100.5658,
    description:
      "Premier restaurant thaïlandais au monde à obtenir trois étoiles au Guide Michelin, Sorn est entièrement consacré à la cuisine du sud de la Thaïlande, réputée pour son intensité et ses saveurs épicées et acidulées. L'approche est rigoureusement traditionnelle, avec des ingrédients et des techniques de cuisson spécifiques au sud du pays, rarement présentés à ce niveau de gastronomie.",
    whyVisit: "Une référence mondiale de la gastronomie thaïlandaise, pour une expérience exceptionnelle autour d'une région culinaire peu représentée ailleurs.",
    littleTip: "Les réservations sont extrêmement disputées compte tenu de la renommée du lieu — réservez plusieurs semaines, voire plusieurs mois à l'avance.",
    indicativeDuration: "2h30 à 3h",
  },
  {
    slug: "le-du",
    name: "Le Du",
    zone: "silom-sathorn",
    categories: ["restaurants"],
    lat: 13.7265,
    lng: 100.528,
    description:
      "Un restaurant étoilé au Michelin proposant une cuisine thaïlandaise contemporaine construite autour de produits locaux de saison, souvent issus de petits producteurs thaïlandais mis en avant sur la carte. L'approche, plus épurée que la cuisine traditionnelle, a largement contribué à faire connaître la scène gastronomique thaïlandaise moderne à l'international.",
    whyVisit: "L'une des tables qui a lancé la vague de la gastronomie thaïlandaise contemporaine, dans le quartier de Silom.",
    littleTip: "Fermé le dimanche — les menus dégustation changent selon les saisons et les arrivages, demandez les options végétariennes à la réservation si besoin.",
    indicativeDuration: "2h à 2h30",
  },
  {
    slug: "nusara",
    name: "Nusara",
    zone: "rattanakosin-banglamphu",
    categories: ["restaurants"],
    lat: 13.746,
    lng: 100.492,
    description:
      "Installé près de Wat Pho dans le vieux Bangkok, Nusara propose une cuisine thaïlandaise patrimoniale revisitée, portée par la même équipe que le restaurant Sorn. Le lieu a rapidement été reconnu par le Guide Michelin, confirmant l'intérêt pour une gastronomie thaïlandaise ancrée dans les traditions régionales plutôt que dans la fusion internationale.",
    whyVisit: "Une gastronomie thaïlandaise raffinée dans le cadre historique du vieux Bangkok, à deux pas de Wat Pho.",
    littleTip: "Fermé le lundi — comme pour les autres tables étoilées de la ville, réservez bien à l'avance.",
    indicativeDuration: "2h à 2h30",
  },
  {
    slug: "potong",
    name: "Potong",
    zone: "chinatown-talat-noi",
    categories: ["restaurants"],
    lat: 13.7393,
    lng: 100.5063,
    description:
      "Installé dans un ancien bâtiment pharmaceutique historique de Chinatown, Potong propose une cuisine gastronomique mêlant héritage sino-thaïlandais et techniques contemporaines, portée par une cheffe reconnue internationalement. Le cadre, entre galerie d'art et salle à manger, renforce le lien entre la cuisine et l'histoire du quartier chinois de Bangkok.",
    whyVisit: "Une gastronomie créative ancrée dans l'histoire sino-thaïlandaise de Chinatown, dans un cadre architectural remarquable.",
    littleTip: "Fermé le lundi — le bâtiment historique lui-même vaut le détour, prenez le temps d'observer le décor avant le repas.",
    indicativeDuration: "2h à 2h30",
  },
  {
    slug: "gaggan-anand",
    name: "Gaggan Anand",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["restaurants"],
    lat: 13.7355,
    lng: 100.5693,
    description:
      "Un menu dégustation en une vingtaine de plats mêlant cuisine indienne et techniques créatives contemporaines, accompagné d'une mise en scène lumineuse et musicale pensée comme une expérience à part entière. Le chef, déjà connu pour avoir dirigé l'un des restaurants les plus primés d'Asie sous son nom, propose ici une cuisine résolument expérimentale, loin des classiques indiens attendus.",
    whyVisit: "Une expérience gastronomique spectaculaire et inventive, pour qui cherche davantage qu'un simple repas.",
    littleTip: "Les places au comptoir sont limitées à deux services par soir (jeudi à dimanche) — réservez largement à l'avance.",
    indicativeDuration: "2h30 à 3h",
    photoKey: "gaggan-anand",
    altText: "Dessert créatif présenté lors du menu dégustation du restaurant Gaggan à Bangkok",
  },
  {
    slug: "suhring",
    name: "Sühring",
    zone: "silom-sathorn",
    categories: ["restaurants"],
    lat: 13.7119,
    lng: 100.5389,
    description:
      "Tenu par des frères jumeaux chefs allemands, Sühring revisite la cuisine allemande classique avec une approche contemporaine, dans une villa thaïlandaise rénovée du quartier de Yen Akat. Devenu l'un des deux seuls restaurants de Thaïlande à détenir trois étoiles au Guide Michelin, c'est une proposition culinaire assez unique dans le paysage gastronomique de Bangkok, loin de la cuisine thaïlandaise.",
    whyVisit: "Une gastronomie allemande contemporaine rare et distinguée, pour une soirée très différente du reste de la scène gastronomique de la ville.",
    littleTip: "Les réservations sont très demandées depuis l'obtention de la troisième étoile — anticipez largement, idéalement plusieurs mois à l'avance.",
    indicativeDuration: "2h30 à 3h",
  },
  {
    slug: "blue-elephant",
    name: "Blue Elephant",
    zone: "silom-sathorn",
    categories: ["restaurants"],
    lat: 13.7215,
    lng: 100.5214,
    description:
      "Installé dans un manoir historique du début du XXe siècle face à la station BTS Surasak, Blue Elephant propose une cuisine royale thaïlandaise raffinée, avec une école de cuisine attenante ouverte aux visiteurs souhaitant apprendre quelques recettes. L'enseigne, présente dans plusieurs pays, a largement contribué à faire connaître la gastronomie thaïlandaise classique à l'international.",
    whyVisit: "Une cuisine thaïlandaise royale dans un cadre architectural remarquable, avec la possibilité de prolonger l'expérience par un cours de cuisine.",
    littleTip: "L'école de cuisine attenante au restaurant permet de prolonger l'expérience par un atelier pratique, à réserver séparément.",
    indicativeDuration: "1h30 à 2h",
    photoKey: "blue-elephant",
    altText: "Le manoir historique illuminé abritant le restaurant Blue Elephant à Bangkok",
  },
  {
    slug: "eighty-twenty",
    name: "80/20",
    zone: "riverside",
    categories: ["restaurants"],
    lat: 13.7392,
    lng: 100.5134,
    description:
      "Installé dans un ensemble de maisons de commerce (shophouses) de Charoen Krung Road, 80/20 propose une cuisine thaïlandaise contemporaine distinguée par le Guide Michelin, construite autour de produits locaux et de techniques de fermentation maison. Le nom fait référence à la part belle laissée aux producteurs locaux dans la composition des menus.",
    whyVisit: "Une cuisine thaïlandaise contemporaine et créative, dans le quartier historique de Bang Rak proche de Chinatown.",
    littleTip: "Fermé le lundi et le mardi — les réservations se font directement sur le site du restaurant, jusqu'à trois semaines à l'avance.",
    indicativeDuration: "2h à 2h30",
  },
  {
    slug: "sala-rattanakosin",
    name: "Sala Rattanakosin Eatery and Bar",
    zone: "riverside",
    categories: ["restaurants", "points-de-vue"],
    lat: 13.7456,
    lng: 100.4915,
    description:
      "Le restaurant en terrasse de l'hôtel-boutique Sala Rattanakosin, offrant l'une des meilleures vues directes sur Wat Arun depuis la rive de Rattanakosin. La carte propose une cuisine thaïlandaise contemporaine, mais c'est surtout le panorama sur le temple et le fleuve, particulièrement spectaculaire au coucher du soleil, qui fait la réputation du lieu.",
    whyVisit: "L'une des meilleures vues sur Wat Arun depuis un restaurant, idéale pour un dîner au coucher du soleil.",
    littleTip: "Réservez une table en terrasse à l'avance, surtout pour l'heure du coucher du soleil — les places avec vue directe sont limitées et très demandées.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "the-deck-arun-residence",
    name: "The Deck by Arun Residence",
    zone: "riverside",
    categories: ["restaurants", "points-de-vue"],
    lat: 13.744,
    lng: 100.4905,
    description:
      "Le restaurant en terrasse de l'hôtel Arun Residence, directement en face de Wat Arun sur l'autre rive du Chao Phraya. L'une des adresses historiques de la rive de Rattanakosin pour dîner avec vue sur le temple, dans une ambiance décontractée malgré le cadre spectaculaire.",
    whyVisit: "Une vue frontale sur Wat Arun, dans l'une des adresses les plus anciennes et les plus connues du genre sur cette rive du fleuve.",
    littleTip: "Les meilleures tables en bord de terrasse partent vite au coucher du soleil — réservez ou arrivez en avance pour les obtenir.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "above-riva",
    name: "Above Riva",
    zone: "riverside",
    categories: ["restaurants", "points-de-vue"],
    lat: 13.7445,
    lng: 100.491,
    description:
      "Le restaurant en hauteur de l'hôtel Riva Arun, proposant une cuisine mêlant classiques occidentaux et touches thaïlandaises, avec une vue dégagée sur le Chao Phraya et Wat Arun. Moins connu que ses voisins The Deck et Sala Rattanakosin, il offre une alternative avec une carte plus internationale.",
    whyVisit: "Une vue sur le fleuve et Wat Arun avec une carte plus internationale que ses voisins immédiats, pour varier des classiques thaïlandais.",
    littleTip: "Le service du petit-déjeuner avec vue sur le fleuve est une option moins connue que le dîner, et nettement plus calme.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "the-never-ending-summer",
    name: "The Never Ending Summer",
    zone: "thonburi",
    categories: ["restaurants"],
    lat: 13.7295,
    lng: 100.5027,
    description:
      "Installé dans un ancien entrepôt industriel réhabilité au sein du complexe The Jam Factory, sur la rive de Thonburi, The Never Ending Summer sert une cuisine thaïlandaise familiale dans un cadre architectural remarquable signé par un architecte thaïlandais reconnu. Le complexe environnant mêle librairie, galerie d'art et espaces créatifs.",
    whyVisit: "Une cuisine thaïlandaise généreuse dans un cadre architectural industriel-chic, à combiner avec une visite du complexe créatif environnant.",
    littleTip: "Prenez le temps d'explorer le reste du complexe The Jam Factory (librairie, galerie) avant ou après le repas plutôt que de repartir directement.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "baan-phadthai",
    name: "Baan Phadthai",
    zone: "riverside",
    categories: ["restaurants", "street-food"],
    lat: 13.7225,
    lng: 100.5155,
    description:
      "Un petit restaurant niché dans une ruelle du quartier de Bang Rak, entièrement consacré au pad thaï, décliné en plusieurs versions (classique aux grosses crevettes, poulet grillé, végétarien, crabe). Distingué par un Bib Gourmand au Guide Michelin, il propose une version soignée de ce plat emblématique dans un cadre de petit restaurant de quartier plutôt qu'un simple étal de rue.",
    whyVisit: "Une version soignée et reconnue du pad thaï, dans un cadre plus confortable qu'un stand de rue classique.",
    littleTip: "Le restaurant est caché dans une petite ruelle (soi) de Charoen Krung — repérez bien l'adresse exacte avant de partir, il est facile de le manquer.",
    indicativeDuration: "45 min à 1h",
    photoKey: "baan-phadthai",
    altText: "L'intérieur chaleureux en bois du restaurant Baan Phadthai à Bangkok",
  },
];

async function main() {
  console.log("Seeding Bangkok content wave 11 (restaurants)…");

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
    if (photoId) {
      await prisma.placePhoto.create({ data: { placeId: place.id, photoId, sortOrder: 0 } });
    }

    console.log("  place:", def.name, photoId ? "(avec photo)" : "(sans photo)");
  }

  console.log("Wave 11 seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
