/**
 * Koh Samui & Koh Phangan — seventh destination, built from the admin
 * "Nouvelle destination" request queue (destinationRequest id
 * cmvlfdxcu000329cdul4j0fqb): "guide très complet... même demande que
 * Koh Tao" (beaches, insolite activities, food/drink). Combines the two
 * neighbouring islands plus the Ang Thong Marine Park day-trip, same
 * pattern as the Koh Lanta & Koh Phi Phi destination.
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
  "chaweng-beach",
  "chaweng-noi-beach",
  "ark-bar-beach-club",
  "lamai-beach",
  "hin-ta-hin-yai",
  "lamai-night-market",
  "big-buddha-wat-phra-yai",
  "choeng-mon-beach",
  "na-muang-waterfall",
  "coral-cove-beach",
  "haad-rin-beach",
  "bottle-beach",
  "phaeng-waterfall",
  "than-sadet-waterfall",
  "ang-thong-marine-park",
  "koh-wua-talap-viewpoint",
  "ang-thong-kayaking",
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
  // ---------- Chaweng ----------
  {
    slug: "chaweng-beach",
    name: "Chaweng Beach",
    zone: "chaweng",
    categories: ["incontournables"],
    lat: 9.5407, lng: 100.0622,
    description: "La plage la plus longue et la plus animée de Koh Samui, environ 7 km de sable bordés d'hôtels, de restaurants et de bars, cœur touristique et festif de l'île.",
    whyVisit: "Le point de repère incontournable de Koh Samui, pour la plage comme pour l'animation.",
    littleTip: "Chaweng Noi, à l'extrémité sud, est nettement plus calme tout en restant à distance de marche.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "chaweng-noi-beach",
    name: "Chaweng Noi Beach",
    zone: "chaweng",
    categories: ["quartiers-balades"],
    lat: 9.5180, lng: 100.0680,
    description: "La partie sud de Chaweng, séparée de la plage principale par un promontoire rocheux, à l'eau plus calme et à l'ambiance nettement plus tranquille.",
    whyVisit: "Une version plus paisible de Chaweng, à deux pas de l'animation principale.",
    littleTip: "Le sentier côtier qui longe le promontoire offre un bon point de vue entre les deux plages.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "soi-green-mango",
    name: "Soi Green Mango",
    zone: "chaweng",
    categories: ["bars-rooftops"],
    lat: 9.5420, lng: 100.0610,
    description: "La rue de vie nocturne la plus connue de Chaweng, concentrant bars, clubs et néons sur une ruelle animée jusqu'au bout de la nuit.",
    whyVisit: "Le cœur de la vie nocturne de Koh Samui, à vivre au moins une fois pour l'ambiance.",
    littleTip: "L'ambiance démarre vraiment après 23h — prévoyez du liquide pour les petites échoppes et bars de rue.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "ark-bar-beach-club",
    name: "Ark Bar Beach Club",
    zone: "chaweng",
    categories: ["bars-rooftops"],
    lat: 9.5390, lng: 100.0625,
    description: "Un beach club en plein cœur de Chaweng Beach, avec transats, piscine et programmation musicale, qui enchaîne l'ambiance plage de la journée aux soirées DJ du soir.",
    whyVisit: "L'un des beach clubs les plus animés de Chaweng, pour une après-midi festive en bord de plage.",
    littleTip: "Les soirées DJ du dimanche sont parmi les plus courues de la semaine sur Chaweng.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "central-festival-samui",
    name: "Central Festival Samui",
    zone: "chaweng",
    categories: ["shopping"],
    lat: 9.5330, lng: 100.0580,
    description: "Le plus grand centre commercial de l'île, à Chaweng, regroupant enseignes internationales, cinéma et restaurants climatisés.",
    whyVisit: "L'option shopping climatisée la plus pratique de Koh Samui.",
    littleTip: "Pratique pour une pause fraîcheur en pleine journée entre deux sessions plage.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "chaweng-walking-street-market",
    name: "Chaweng Walking Street Market",
    zone: "chaweng",
    categories: ["marches", "street-food"],
    lat: 9.5400, lng: 100.0615,
    description: "Un marché de rue animé en soirée au cœur de Chaweng, avec stands de street food, artisanat et vêtements, dans une ambiance musicale continue.",
    whyVisit: "Une bonne option pour un dîner informel et varié en plein cœur de Chaweng.",
    littleTip: "Les stands de street food sont généralement moins chers et tout aussi bons que les restaurants voisins.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "silver-beach",
    name: "Silver Beach",
    zone: "chaweng",
    categories: ["quartiers-balades"],
    lat: 9.5050, lng: 100.0700,
    description: "Une petite baie cachée entre Chaweng et Lamai, au sable fin et à l'eau claire, nettement moins fréquentée que les deux grandes plages voisines.",
    whyVisit: "Une des plages les plus discrètes et préservées entre Chaweng et Lamai.",
    littleTip: "L'accès se fait par une petite route facile à manquer — repérez les panneaux des restaurants de plage voisins.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "khaw-glong-restaurant",
    name: "Khaw Glong",
    zone: "chaweng",
    categories: ["restaurants"],
    lat: 9.5350, lng: 100.0600,
    description: "Un restaurant thaïlandais niché dans une ruelle de Chaweng, loin de l'agitation de la plage, réputé pour sa cuisine thaïe authentique et généreuse.",
    whyVisit: "L'une des adresses les plus appréciées de Chaweng pour une vraie cuisine thaïlandaise, loin des pièges à touristes.",
    littleTip: "Un peu excentré de la plage — mieux vaut s'y rendre en taxi ou en scooter plutôt qu'à pied.",
    indicativeDuration: "1h à 1h30",
  },

  // ---------- Lamai ----------
  {
    slug: "lamai-beach",
    name: "Lamai Beach",
    zone: "lamai",
    categories: ["incontournables"],
    lat: 9.4700, lng: 100.0600,
    description: "La deuxième plage de Koh Samui par la taille, à l'ambiance plus calme que Chaweng tout en gardant un bon choix de restaurants, bars de plage et hébergements.",
    whyVisit: "Un bon compromis entre animation et tranquillité, pour qui veut éviter l'intensité de Chaweng.",
    littleTip: "Les restaurants de plage au sud de Lamai sont généralement meilleur marché que ceux du centre.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "lamai-viewpoint-cable-car",
    name: "Lamai Viewpoint",
    zone: "lamai",
    categories: ["points-de-vue", "activites-famille"],
    lat: 9.4750, lng: 100.0400,
    description: "Un point de vue en hauteur au-dessus de Lamai, accessible en télécabine, aménagé avec tyrolienne, jardin de rochers, bassin de poissons et bar, pour un panorama complet sur la côte.",
    whyVisit: "Un point de vue facile d'accès combiné à plusieurs activités pour toute la famille.",
    littleTip: "Le billet d'entrée inclut généralement l'accès au jardin de rochers et au bassin baignable — à vérifier sur place.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "hin-ta-hin-yai",
    name: "Hin Ta Hin Yai (rochers Grand-père et Grand-mère)",
    zone: "lamai",
    categories: ["experiences-insolites"],
    lat: 9.4650, lng: 100.0580,
    description: "Deux formations rocheuses naturelles à l'extrémité sud de Lamai Beach, dont les formes rappellent des organes génitaux masculin et féminin, sujet d'une légende locale largement relayée.",
    whyVisit: "L'une des curiosités naturelles les plus connues de Koh Samui, autant pour la forme que pour la légende.",
    littleTip: "Les rochers sont visibles gratuitement depuis la plage, pas besoin de payer une excursion dédiée.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "overlap-stone-viewpoint",
    name: "Overlap Stone Viewpoint (Hin Lad)",
    zone: "lamai",
    categories: ["points-de-vue"],
    lat: 9.4700, lng: 100.0400,
    description: "Un point de vue dans les collines au-dessus du sud de l'île, nommé d'après un empilement rocheux caractéristique, réputé pour ses couchers de soleil sur la mer.",
    whyVisit: "L'un des meilleurs points de vue coucher de soleil du sud de Koh Samui.",
    littleTip: "Mieux vaut y monter environ une heure avant le coucher du soleil pour profiter de la lumière changeante.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "lamai-night-market",
    name: "Lamai Night Market",
    zone: "lamai",
    categories: ["marches", "street-food"],
    lat: 9.4720, lng: 100.0610,
    description: "Un marché nocturne hebdomadaire dans le centre de Lamai, mêlant stands de street food, artisanat local et vêtements, dans une ambiance plus locale que celui de Chaweng.",
    whyVisit: "Une bonne alternative plus locale au marché nocturne de Chaweng.",
    littleTip: "Vérifiez les jours d'ouverture sur place, le marché ne se tient généralement pas tous les soirs.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "secret-buddha-garden",
    name: "Secret Buddha Garden (Magic Garden)",
    zone: "lamai",
    categories: ["experiences-insolites"],
    lat: 9.4450, lng: 99.9950,
    description: "Un jardin de sculptures en pierre dissimulé dans la jungle des hauteurs de Koh Samui, créé par un fermier local à partir des années 1970, mêlant statues bouddhiques et figures fantastiques.",
    whyVisit: "L'un des sites les plus singuliers et les moins touristiques de l'île, en pleine nature.",
    littleTip: "La route d'accès est escarpée et peu entretenue — un véhicule tout-terrain ou un taxi est recommandé.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "kob-thai-restaurant",
    name: "Kob Thai",
    zone: "lamai",
    categories: ["restaurants"],
    lat: 9.4680, lng: 100.0590,
    description: "Un restaurant familial à quelques pas de la route principale de Lamai, réputé pour ses plats thaïlandais traditionnels à prix raisonnable.",
    whyVisit: "Une cuisine thaïlandaise traditionnelle fiable, loin des adresses les plus touristiques de la plage.",
    littleTip: "Un peu excentré de la plage, à environ 200 mètres de la route principale — facile en scooter.",
    indicativeDuration: "1h à 1h30",
  },

  // ---------- Bophut & Mae Nam ----------
  {
    slug: "big-buddha-wat-phra-yai",
    name: "Big Buddha (Wat Phra Yai)",
    zone: "bophut-maenam",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 9.5942, lng: 100.0589,
    description: "Un bouddha assis doré de 12 mètres de haut, installé sur un îlot relié à Koh Samui par une chaussée, l'un des temples les plus visités et les plus photographiés de l'île.",
    whyVisit: "Le monument religieux le plus emblématique de Koh Samui.",
    littleTip: "Une tenue couvrant épaules et genoux est demandée pour monter jusqu'à la statue.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "wat-plai-laem",
    name: "Wat Plai Laem",
    zone: "bophut-maenam",
    categories: ["temples-patrimoine", "points-de-vue"],
    lat: 9.5958, lng: 100.0567,
    description: "Un temple construit autour d'un lac, dominé par une statue de Guanyin à dix-huit bras, à quelques minutes du Big Buddha, entrée gratuite et parking sur place.",
    whyVisit: "Un cadre spectaculaire autour d'un lac, à combiner facilement avec la visite du Big Buddha tout proche.",
    littleTip: "Entrée et parking gratuits — une tenue couvrant épaules et genoux reste demandée près des sanctuaires.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "fishermans-village-bophut",
    name: "Fisherman's Village (Bophut)",
    zone: "bophut-maenam",
    categories: ["incontournables", "quartiers-balades", "marches"],
    lat: 9.5558, lng: 100.0383,
    description: "Un ancien village de pêcheurs chinois reconverti en rue piétonne bordée de restaurants, galeries et boutiques, avec un marché nocturne les lundi, mercredi et vendredi soir.",
    whyVisit: "Le quartier le plus charmant de Koh Samui pour une balade et un dîner en bord de mer.",
    littleTip: "Le marché nocturne (lundi, mercredi, vendredi) est le meilleur moment pour découvrir le quartier animé.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "mae-nam-beach",
    name: "Mae Nam Beach",
    zone: "bophut-maenam",
    categories: ["quartiers-balades"],
    lat: 9.5700, lng: 100.0150,
    description: "Une plage calme et peu développée au nord de l'île, à l'eau peu profonde, appréciée des familles et des visiteurs cherchant à éviter l'agitation de Chaweng.",
    whyVisit: "Une des plages les plus tranquilles et familiales du nord de Koh Samui.",
    littleTip: "L'eau peu profonde en fait un bon choix pour les familles avec jeunes enfants.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "bang-po-beach",
    name: "Bang Po Beach",
    zone: "bophut-maenam",
    categories: ["quartiers-balades"],
    lat: 9.5500, lng: 99.9850,
    description: "Une plage préservée à l'extrémité nord-ouest de Koh Samui, nettement moins développée que le reste de la côte nord, avec vue sur Koh Phangan au loin par temps clair.",
    whyVisit: "L'une des plages les plus paisibles et les moins bâties de l'île.",
    littleTip: "Peu de services sur place — prévoyez eau et en-cas si vous y passez l'après-midi.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "choeng-mon-beach",
    name: "Choeng Mon Beach",
    zone: "bophut-maenam",
    categories: ["quartiers-balades"],
    lat: 9.5900, lng: 100.0750,
    description: "Une baie abritée au nord-est de l'île, à l'eau calme et peu profonde, entourée de resorts haut de gamme et appréciée des familles.",
    whyVisit: "L'une des meilleures plages familiales de Koh Samui, à l'eau calme toute l'année.",
    littleTip: "La pointe rocheuse à l'extrémité de la baie offre un bon point de vue sur l'ensemble de la plage.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "samui-elephant-sanctuary",
    name: "Samui Elephant Sanctuary",
    zone: "bophut-maenam",
    categories: ["experiences-insolites", "activites-famille"],
    lat: 9.5100, lng: 100.0150,
    description: "Un sanctuaire à but éthique où les éléphants ne sont ni montés ni forcés à faire des numéros, observés en semi-liberté dans un environnement naturel.",
    whyVisit: "Une rencontre respectueuse avec les éléphants, alternative aux camps qui proposent des balades à dos d'éléphant.",
    littleTip: "Réservez à l'avance, les créneaux de visite sont limités pour préserver le bien-être des animaux.",
    indicativeDuration: "demi-journée",
  },
  {
    slug: "coco-tams",
    name: "Coco Tam's",
    zone: "bophut-maenam",
    categories: ["restaurants", "bars-rooftops"],
    lat: 9.5555, lng: 100.0380,
    description: "Un bar-restaurant sur la plage de Bophut, célèbre pour ses coussins géants dans le sable et ses couchers de soleil, l'une des adresses les plus photographiées de Fisherman's Village.",
    whyVisit: "L'adresse coucher de soleil la plus emblématique de Bophut.",
    littleTip: "Les coussins en bord de plage se remplissent vite en fin d'après-midi — mieux vaut arriver avant le coucher du soleil.",
    indicativeDuration: "1h30 et plus",
  },
  {
    slug: "krua-bophut",
    name: "Krua Bophut",
    zone: "bophut-maenam",
    categories: ["restaurants"],
    lat: 9.5560, lng: 100.0385,
    description: "Un restaurant familial dans Fisherman's Village, réputé pour sa cuisine de fruits de mer et ses plats thaïlandais traditionnels à prix raisonnable.",
    whyVisit: "L'une des adresses les plus appréciées de Fisherman's Village pour les fruits de mer.",
    littleTip: "Les fruits de mer du jour, affichés à l'entrée, sont généralement le meilleur choix.",
    indicativeDuration: "1h à 1h30",
  },

  // ---------- Sud & intérieur de Koh Samui ----------
  {
    slug: "na-muang-waterfall",
    name: "Na Muang Waterfall",
    zone: "sud-samui",
    categories: ["incontournables", "quartiers-balades"],
    lat: 9.4917, lng: 99.9742,
    description: "La cascade la plus accessible de Koh Samui, à quelques minutes à pied du parking, avec un bassin où il est possible de se baigner, nichée dans la végétation tropicale.",
    whyVisit: "La cascade la plus facile d'accès de l'île, avec un vrai bassin de baignade.",
    littleTip: "Le débit est nettement plus impressionnant pendant et juste après la saison des pluies (octobre à décembre).",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "na-muang-2-waterfall",
    name: "Na Muang 2",
    zone: "sud-samui",
    categories: ["quartiers-balades"],
    lat: 9.4870, lng: 99.9700,
    description: "La deuxième cascade de Na Muang, plus haute et plus sauvage que la première, accessible par une marche plus longue et plus escarpée à travers la forêt.",
    whyVisit: "Une cascade plus spectaculaire que Na Muang 1, pour qui est prêt à marcher un peu plus.",
    littleTip: "Le sentier est glissant par endroits — de bonnes chaussures de marche sont recommandées.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "wat-khunaram",
    name: "Wat Khunaram",
    zone: "sud-samui",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 9.4833, lng: 99.9850,
    description: "Un temple abritant le corps momifié d'un moine vénéré, Luang Pordaeng, exposé assis en position de méditation dans une vitrine, décédé dans les années 1970 selon son propre souhait.",
    whyVisit: "L'un des sites les plus singuliers de Koh Samui, entre tradition bouddhiste et curiosité.",
    littleTip: "Le respect du lieu est attendu : silence et tenue correcte, comme dans tout temple en activité.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "hua-thanon-fishing-village",
    name: "Hua Thanon",
    zone: "sud-samui",
    categories: ["quartiers-balades", "marches"],
    lat: 9.4450, lng: 100.0150,
    description: "Un village de pêcheurs à majorité musulmane au sud de l'île, avec son marché aux poissons matinal animé et sa mosquée, loin de l'ambiance touristique du reste de Koh Samui.",
    whyVisit: "Un aperçu authentique de la vie locale de Koh Samui, loin des zones touristiques.",
    littleTip: "Le marché aux poissons est le plus animé tôt le matin, à l'arrivée des bateaux.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "coral-cove-beach",
    name: "Coral Cove Beach",
    zone: "sud-samui",
    categories: ["quartiers-balades"],
    lat: 9.5050, lng: 100.0680,
    description: "Une petite baie entre Chaweng et Lamai, entourée de rochers, réputée pour son bon snorkeling directement accessible depuis le sable.",
    whyVisit: "L'un des meilleurs spots de snorkeling facilement accessible entre Chaweng et Lamai.",
    littleTip: "L'accès se fait par un escalier depuis la route principale — repérez le petit parking en bord de route.",
    indicativeDuration: "1h30 à 2h",
  },

  // ---------- Koh Phangan ----------
  {
    slug: "haad-rin-beach",
    name: "Haad Rin Beach",
    zone: "koh-phangan",
    categories: ["incontournables", "bars-rooftops"],
    lat: 9.6700, lng: 100.0680,
    description: "La plage la plus connue de Koh Phangan, scène mondialement connue de la Full Moon Party mensuelle, animée toute l'année par ses bars et son ambiance festive.",
    whyVisit: "La plage la plus emblématique de Koh Phangan, incontournable que vous tombiez sur une Full Moon Party ou non.",
    littleTip: "Les soirs de Full Moon Party, les hébergements et ferries affichent complet des jours à l'avance — réservez tôt.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "chicken-corner",
    name: "Chicken Corner",
    zone: "koh-phangan",
    categories: ["bars-rooftops"],
    lat: 9.6720, lng: 100.0670,
    description: "Un carrefour de bars à Haad Rin, point de ralliement classique avant de rejoindre la plage pour la Full Moon Party ou toute autre soirée.",
    whyVisit: "Le point de départ traditionnel d'une soirée à Haad Rin.",
    littleTip: "Beaucoup de visiteurs s'y retrouvent avant de descendre sur la plage pour la soirée.",
    indicativeDuration: "1h et plus",
  },
  {
    slug: "bottle-beach",
    name: "Bottle Beach (Haad Khuat)",
    zone: "koh-phangan",
    categories: ["incontournables", "quartiers-balades"],
    lat: 9.7900, lng: 100.0150,
    description: "Une plage isolée au nord de Koh Phangan, accessible uniquement en bateau ou par une randonnée d'une à deux heures, à l'ambiance nettement plus sauvage et préservée.",
    whyVisit: "L'une des plages les plus préservées de Koh Phangan, loin des foules du sud de l'île.",
    littleTip: "Le bateau-taxi depuis Haad Salad ou Chaloklum est l'option la plus simple si vous ne voulez pas marcher.",
    indicativeDuration: "demi-journée",
  },
  {
    slug: "bottle-beach-viewpoint",
    name: "Bottle Beach Viewpoint",
    zone: "koh-phangan",
    categories: ["points-de-vue"],
    lat: 9.7850, lng: 100.0100,
    description: "Un point de vue sur le sentier de randonnée menant à Bottle Beach, considéré comme l'un des plus beaux panoramas de Koh Phangan sur la côte nord de l'île.",
    whyVisit: "L'un des plus beaux points de vue de Koh Phangan, accessible en combiné avec la randonnée vers Bottle Beach.",
    littleTip: "Le sentier traverse la jungle et demande un bon effort par forte chaleur — partez tôt avec de l'eau.",
    indicativeDuration: "2h à 3h (aller-retour)",
  },
  {
    slug: "khao-ra-peak",
    name: "Khao Ra",
    zone: "koh-phangan",
    categories: ["points-de-vue", "excursions"],
    lat: 9.7450, lng: 100.0100,
    description: "Le point culminant de Koh Phangan, atteint par une randonnée de deux à trois heures aller-retour à travers la jungle, récompensée par une vue panoramique sur toute l'île.",
    whyVisit: "La plus belle vue d'ensemble sur Koh Phangan, pour les randonneurs prêts à l'effort.",
    littleTip: "La randonnée est exigeante par forte chaleur — partez tôt le matin avec suffisamment d'eau.",
    indicativeDuration: "3h à 4h",
  },
  {
    slug: "phaeng-waterfall",
    name: "Phaeng Waterfall",
    zone: "koh-phangan",
    categories: ["quartiers-balades"],
    lat: 9.7400, lng: 100.0250,
    description: "Une cascade facilement accessible au centre de Koh Phangan, avec un sentier de difficulté modérée ponctué de petits points de vue, plus impressionnante pendant la saison des pluies.",
    whyVisit: "La cascade la plus facile d'accès de Koh Phangan.",
    littleTip: "Le débit est nettement plus faible en saison sèche — à privilégier entre juillet et novembre.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "than-sadet-waterfall",
    name: "Than Sadet Waterfall",
    zone: "koh-phangan",
    categories: ["quartiers-balades", "temples-patrimoine"],
    lat: 9.7100, lng: 100.0550,
    description: "Une cascade historique sur la côte est de Koh Phangan, visitée à plusieurs reprises par des rois de Thaïlande dont les initiales sont gravées sur certains rochers du site.",
    whyVisit: "Une cascade au double intérêt, naturel et historique, rare sur l'île.",
    littleTip: "Cherchez les inscriptions royales gravées sur les rochers près du bassin principal.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "haad-salad",
    name: "Haad Salad",
    zone: "koh-phangan",
    categories: ["quartiers-balades"],
    lat: 9.7650, lng: 99.9800,
    description: "Une plage de la côte nord-ouest de Koh Phangan, au sable fin et à l'eau claire, réputée pour son bon snorkeling et son ambiance nettement plus calme que Haad Rin.",
    whyVisit: "Une des meilleures plages de Koh Phangan pour le snorkeling, loin de l'agitation du sud.",
    littleTip: "L'eau est particulièrement claire tôt le matin, avant que le vent ne se lève.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "haad-seekantang",
    name: "Haad Seekantang (Leela's Beach)",
    zone: "koh-phangan",
    categories: ["quartiers-balades"],
    lat: 9.6950, lng: 100.0450,
    description: "Une petite plage au sud-est de Koh Phangan, encadrée de rochers et de palmiers, à l'ambiance paisible malgré sa proximité relative avec Haad Rin.",
    whyVisit: "Une plage photogénique et tranquille, à proximité de Haad Rin sans en avoir l'agitation.",
    littleTip: "L'accès se fait par un petit sentier depuis la route — repérez les panneaux des hébergements voisins.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "haad-son-secret-beach",
    name: "Haad Son (Secret Beach)",
    zone: "koh-phangan",
    categories: ["quartiers-balades"],
    lat: 9.7600, lng: 99.9750,
    description: "Une petite plage confidentielle de la côte nord-ouest de Koh Phangan, au sable fin encadré de rochers, nettement moins connue que les grandes plages de l'île.",
    whyVisit: "L'une des plages les plus discrètes de Koh Phangan, pour qui cherche l'isolement.",
    littleTip: "Peu signalée depuis la route principale — mieux vaut demander confirmation sur place ou utiliser le GPS.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "thong-sala-market",
    name: "Thong Sala Walking Street",
    zone: "koh-phangan",
    categories: ["marches", "street-food"],
    lat: 9.7150, lng: 99.9950,
    description: "Le marché piéton du samedi soir dans la ville principale de Koh Phangan, autour du débarcadère, avec artisanat local et une large offre de street food.",
    whyVisit: "Le meilleur moment pour découvrir la vie locale de Thong Sala, en dehors des zones les plus touristiques.",
    littleTip: "N'a lieu que le samedi soir — à caler en priorité si votre séjour inclut un samedi.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "wat-khao-tahm",
    name: "Wat Khao Tahm",
    zone: "koh-phangan",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 9.6900, lng: 100.0150,
    description: "Un temple-monastère sur les hauteurs du sud de Koh Phangan, connu pour ses retraites de méditation internationales, avec une vue dégagée sur la mer depuis son terrain.",
    whyVisit: "Un lieu de retraite spirituelle réputé, mais aussi un simple point de vue tranquille même pour une courte visite.",
    littleTip: "Les retraites de méditation se réservent longtemps à l'avance — pour une simple visite, le respect du calme du lieu reste de mise.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "amsterdam-bar",
    name: "Amsterdam Bar",
    zone: "koh-phangan",
    categories: ["bars-rooftops"],
    lat: 9.6980, lng: 100.0480,
    description: "Un bar perché sur une falaise du sud-est de Koh Phangan, autour d'un bassin naturel creusé dans la roche, réputé pour sa vue plongeante sur la mer au coucher du soleil.",
    whyVisit: "L'un des bars les plus spectaculaires de Koh Phangan pour un coucher de soleil en hauteur.",
    littleTip: "Le bassin naturel se prête à la baignade — prévoyez un maillot si vous comptez en profiter.",
    indicativeDuration: "1h30 et plus",
  },

  // ---------- Ang Thong & excursions ----------
  {
    slug: "ang-thong-marine-park",
    name: "Parc national marin de Mu Ko Ang Thong",
    zone: "ang-thong-excursions",
    categories: ["incontournables", "excursions", "points-de-vue"],
    lat: 9.6800, lng: 99.6600,
    description: "Un archipel de 42 îles calcaires au large de Koh Samui, classé parc national marin, avec lagons cachés, falaises et points de vue spectaculaires, exploré en excursion à la journée.",
    whyVisit: "L'excursion la plus spectaculaire depuis Koh Samui, pour ses paysages de karst et ses lagons cachés.",
    littleTip: "Les excursions à la journée combinent généralement kayak, snorkeling et montée au point de vue de Koh Wua Talap.",
    indicativeDuration: "journée complète",
  },
  {
    slug: "koh-mae-ko-emerald-lake",
    name: "Koh Mae Ko (Lac Émeraude)",
    zone: "ang-thong-excursions",
    categories: ["excursions", "points-de-vue"],
    lat: 9.6450, lng: 99.6700,
    description: "Une île du parc d'Ang Thong abritant un lac intérieur aux eaux vert émeraude, entouré de falaises calcaires, visible depuis un point de vue en hauteur accessible par un escalier abrupt.",
    whyVisit: "Le lagon le plus photogénique du parc d'Ang Thong, emblème du parc marin.",
    littleTip: "La montée au point de vue est raide mais courte — de bonnes chaussures fermées sont recommandées.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "koh-wua-talap-viewpoint",
    name: "Point de vue de Koh Wua Talap",
    zone: "ang-thong-excursions",
    categories: ["excursions", "points-de-vue"],
    lat: 9.6850, lng: 99.6580,
    description: "Le point de vue principal du parc d'Ang Thong, sur l'île centrale qui abrite le bureau du parc, offrant un panorama sur l'ensemble de l'archipel après une montée assez raide.",
    whyVisit: "Le meilleur panorama d'ensemble sur l'archipel d'Ang Thong.",
    littleTip: "La montée prend environ 30 à 45 minutes sur un sentier parfois glissant — partez avec de l'eau.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "ang-thong-kayaking",
    name: "Kayak dans le parc d'Ang Thong",
    zone: "ang-thong-excursions",
    categories: ["excursions", "activites-famille"],
    lat: 9.6700, lng: 99.6650,
    description: "Une activité kayak proposée lors des excursions dans le parc d'Ang Thong, permettant d'explorer les lagons et les grottes marines à faible profondeur inaccessibles aux grands bateaux.",
    whyVisit: "La meilleure façon d'explorer les recoins les plus cachés du parc d'Ang Thong.",
    littleTip: "Généralement inclus dans les excursions à la journée — vérifiez qu'il est bien au programme en réservant.",
    indicativeDuration: "1h à 2h",
  },
];

const ZONE_DEFS = [
  {
    slug: "chaweng",
    name: "Chaweng",
    mapColor: "#c1440e",
    vibeText: "La plage la plus longue et la plus touristique de Koh Samui, entre grande plage, centres commerciaux et vie nocturne la plus dense de l'île.",
    prosText: "Tout est accessible à pied, vie nocturne la plus riche de l'île, large choix d'hébergements et de restaurants.",
    consText: "Très touristique et animé, plage parfois dense, ambiance peu adaptée à un séjour très calme.",
    transportText: "Se parcourt à pied pour l'essentiel ; songthaews et taxis pour rejoindre le reste de l'île.",
    nearbyText: "Chaweng Noi et Coral Cove sont à distance de marche ou de courte course en songthaew.",
    profileFitText: "Pour qui cherche l'ambiance festive et la vie nocturne plutôt que la tranquillité.",
    hotelAdviceText: "Le secteur le plus pratique pour loger sans dépendre des transports, avec un grand choix d'hôtels.",
  },
  {
    slug: "lamai",
    name: "Lamai",
    mapColor: "#3f8ea8",
    vibeText: "La deuxième plage de l'île par la taille, plus calme que Chaweng, entre plage principale, curiosités naturelles et points de vue dans les collines voisines.",
    prosText: "Ambiance plus détendue qu'à Chaweng, bon rapport qualité-prix, curiosités naturelles à proximité.",
    consText: "Moins de vie nocturne qu'à Chaweng, certains sites nécessitent un véhicule.",
    transportText: "Scooter ou taxi pour rejoindre les points de vue et le Secret Buddha Garden dans les collines.",
    nearbyText: "Hin Ta Hin Yai et le point de vue d'Overlap Stone sont accessibles rapidement depuis la plage.",
    profileFitText: "Pour qui veut la plage et l'animation sans l'intensité de Chaweng.",
    hotelAdviceText: "Large choix d'hôtels de milieu de gamme, plus calmes que ceux de Chaweng.",
  },
  {
    slug: "bophut-maenam",
    name: "Bophut & Mae Nam",
    mapColor: "#4a7c59",
    vibeText: "La côte nord de Koh Samui, entre le charme de Fisherman's Village, les grands temples du Big Buddha et les plages familiales de Mae Nam et Choeng Mon.",
    prosText: "Fisherman's Village pour le dîner et les sorties, plages plus calmes, bonne base familiale.",
    consText: "Plus excentré de Chaweng, nécessite un véhicule pour enchaîner les sites du nord de l'île.",
    transportText: "Songthaews réguliers le long de la côte nord ; scooter pratique pour enchaîner les plages.",
    nearbyText: "Le Big Buddha et Wat Plai Laem sont à quelques minutes l'un de l'autre.",
    profileFitText: "Pour les familles et les amateurs de bonnes tables, en alternative plus calme à Chaweng.",
    hotelAdviceText: "Bon choix de resorts familiaux le long de la côte nord, de Bophut à Choeng Mon.",
  },
  {
    slug: "sud-samui",
    name: "Sud et intérieur de Koh Samui",
    mapColor: "#8a6ba0",
    vibeText: "L'intérieur montagneux et la côte sud de l'île, entre cascades, temple au moine momifié et village de pêcheurs authentique, loin des grandes plages touristiques.",
    prosText: "Nature préservée, sites culturels moins fréquentés, bon complément à un séjour plage.",
    consText: "Peu d'hébergements sur place, se visite surtout en excursion à la journée.",
    transportText: "Scooter ou taxi loué recommandé pour enchaîner les sites, assez dispersés dans l'intérieur de l'île.",
    nearbyText: "Na Muang 1 et 2 se visitent en une seule sortie, à quelques minutes l'une de l'autre.",
    profileFitText: "Pour les amateurs de nature et de randonnée légère, en complément d'un séjour balnéaire.",
    hotelAdviceText: "Peu d'hébergements sur place — secteur à visiter en journée depuis Chaweng ou Lamai.",
  },
  {
    slug: "koh-phangan",
    name: "Koh Phangan",
    mapColor: "#2a7a8c",
    vibeText: "L'île voisine de Koh Samui, mondialement connue pour la Full Moon Party, mais tout aussi riche en cascades, points de vue et plages isolées loin de Haad Rin.",
    prosText: "Ambiance festive à Haad Rin, nature préservée dans le reste de l'île, plages nettement moins fréquentées qu'à Samui.",
    consText: "Les taxis d'application ne fonctionnent pas sur l'île, déplacements en songthaew partagé ou scooter.",
    transportText: "Ferry depuis Koh Samui (environ 30 à 45 minutes) ; songthaews partagés ou scooter pour se déplacer sur l'île.",
    nearbyText: "Bottle Beach et son point de vue se visitent dans la même sortie au nord de l'île.",
    profileFitText: "Pour qui veut combiner vie nocturne à Haad Rin et nature préservée sur le reste de l'île.",
    hotelAdviceText: "La plupart des hébergements se concentrent à Haad Rin ; le reste de l'île offre des options plus isolées.",
  },
  {
    slug: "ang-thong-excursions",
    name: "Parc d'Ang Thong & excursions",
    mapColor: "#3457a6",
    vibeText: "L'archipel karstique de Mu Ko Ang Thong, accessible en excursion à la journée depuis Koh Samui, entre lagons cachés et points de vue spectaculaires.",
    prosText: "Paysages très différents de Samui et Phangan, bonne diversité d'activités en une seule journée.",
    consText: "Trajet en bateau assez long, certaines montées assez raides.",
    transportText: "Excursions organisées en bateau depuis Koh Samui, généralement à la journée.",
    nearbyText: "Koh Mae Ko et Koh Wua Talap se visitent dans la même excursion.",
    profileFitText: "Pour qui dispose d'une journée supplémentaire et veut varier les paysages.",
    hotelAdviceText: "Pas de logement sur place — excursion à la journée depuis Koh Samui.",
  },
];

async function main() {
  console.log("Seeding Koh Samui & Koh Phangan destination…");

  const thailand = await prisma.country.upsert({
    where: { slug: "thailande" },
    update: {},
    create: { slug: "thailande", name: "Thaïlande" },
  });

  const destination = await prisma.destination.upsert({
    where: { slug: "koh-samui-koh-phangan" },
    update: { status: "PUBLISHED" },
    create: {
      countryId: thailand.id,
      slug: "koh-samui-koh-phangan",
      name: "Koh Samui & Koh Phangan",
      kind: "ISLAND",
      size: "LARGE",
      status: "PUBLISHED",
    },
  });

  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const ENABLED_CATEGORIES = [
    "incontournables", "temples-patrimoine", "quartiers-balades", "experiences-insolites",
    "activites-famille", "restaurants", "street-food", "bars-rooftops", "marches",
    "shopping", "excursions", "points-de-vue",
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
    manifest = JSON.parse(await readFile(`${SCRATCH}/photos_samui_phangan/manifest.json`, "utf-8"));
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

  console.log(`Koh Samui & Koh Phangan seed complete: ${PLACES.length} places, ${photoCount} with real photos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
