/**
 * Chiang Mai — second destination, built end-to-end as the spec's
 * "Chiang Mai test" before scaling to the rest of Thailand. Same method as
 * the Bangkok waves: real places, real coordinates, Wikimedia Commons
 * photos only when a genuine match exists (no photo otherwise), no
 * individual per-venue web verification (per standing user instruction to
 * go faster across future destinations).
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
  key: string;
  found: boolean;
  title?: string;
  artist?: string;
  license?: string;
  source_url?: string;
  local_path?: string;
};

// Only files that genuinely depict the named place after a title/subject
// sanity pass — PDFs, book scans, wrong-city or wrong-subject matches from
// the raw Commons search were dropped (not a per-photo aesthetic review,
// just "is this even a photo of this place").
const GOOD_KEYS = new Set([
  // photos_cm1
  "doi-suthep", "wat-chedi-luang", "wat-phra-singh", "tha-phae-gate", "wat-umong",
  "khao-soi-khun-yai", "akha-ama-coffee", "jing-jai-market",
  "doi-inthanon",
  // photos_cm2
  "wat-suan-dok", "wat-chiang-man", "wat-phan-tao", "wat-lok-moli", "wiang-kum-kam",
  "wat-ket-karam", "doi-pui-hmong-village", "royal-park-rajapruek", "night-bazaar-cm",
  "warorot-market", "one-nimman", "lamphun", "mae-sa-valley",
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
  photoKey?: string;
  altText?: string;
};

const PLACES: PlaceDef[] = [
  // ---------- Temples, patrimoine (vieille ville + alentours) ----------
  {
    slug: "wat-phra-that-doi-suthep",
    name: "Wat Phra That Doi Suthep",
    zone: "doi-suthep-nature",
    categories: ["incontournables", "temples-patrimoine", "points-de-vue"],
    lat: 18.8047, lng: 98.9217,
    description: "Le temple le plus vénéré de Chiang Mai, perché sur les flancs du Doi Suthep à environ 15 km du centre. Son chedi doré, fondé au 14e siècle selon la légende d'un éléphant sacré portant une relique du Bouddha, domine la ville depuis la montagne et offre un point de vue sur toute la plaine.",
    whyVisit: "Le site religieux et panoramique le plus emblématique de Chiang Mai, visible depuis toute la ville.",
    littleTip: "309 marches mènent au temple depuis le parking — un funiculaire existe pour qui préfère les éviter.",
    indicativeDuration: "1h30 à 2h (trajet inclus)",
    photoKey: "doi-suthep",
    altText: "Chedi doré du temple Wat Phra That Doi Suthep à Chiang Mai",
  },
  {
    slug: "wat-chedi-luang",
    name: "Wat Chedi Luang",
    zone: "old-city",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 18.7877, lng: 98.9853,
    description: "Les vestiges imposants d'un immense chedi du 14e siècle, partiellement effondré lors d'un tremblement de terre au 16e siècle, qui abrita autrefois la statue du Bouddha d'Émeraude. Ses proportions massives et sa brique patinée en font l'un des sites les plus photographiés de la vieille ville.",
    whyVisit: "Le chedi historique le plus impressionnant de la vieille ville, en plein cœur du quartier des temples.",
    littleTip: "Des séances de \"monk chat\" sont parfois organisées dans l'enceinte — une façon simple d'échanger avec de jeunes moines.",
    indicativeDuration: "45 min",
    photoKey: "wat-chedi-luang",
    altText: "Ruines du grand chedi de Wat Chedi Luang à Chiang Mai",
  },
  {
    slug: "wat-phra-singh",
    name: "Wat Phra Singh",
    zone: "old-city",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 18.7883, lng: 98.9828,
    description: "Le temple le plus important de la vieille ville de Chiang Mai, fondé au 14e siècle, connu pour son viharn Lai Kham richement décoré de fresques lanna et abritant le Phra Singh, une statue de bouddha très vénérée.",
    whyVisit: "Le temple le plus prestigieux de la vieille ville, exemple classique de l'architecture lanna.",
    littleTip: "La petite chapelle Lai Kham, à l'arrière, est la plus ornée du site — ne la manquez pas.",
    indicativeDuration: "45 min",
    photoKey: "wat-phra-singh",
    altText: "Façade du viharn Lai Kham au temple Wat Phra Singh à Chiang Mai",
  },
  {
    slug: "tha-phae-gate",
    name: "Tha Phae Gate",
    zone: "old-city",
    categories: ["incontournables", "quartiers-balades"],
    lat: 18.7877, lng: 98.9931,
    description: "La porte orientale, reconstruite, des anciennes fortifications de brique qui entouraient la vieille ville de Chiang Mai. Point de repère central et lieu de rassemblement, elle marque aussi le départ de la rue piétonne du dimanche.",
    whyVisit: "Le point de repère le plus central de la vieille ville, porte d'entrée naturelle pour explorer le quartier.",
    littleTip: "La place devant la porte s'anime particulièrement en fin d'après-midi, avec musiciens et nourrissage de pigeons.",
    indicativeDuration: "15 à 20 min",
    photoKey: "tha-phae-gate",
    altText: "Tha Phae Gate, porte historique de la vieille ville de Chiang Mai",
  },
  {
    slug: "wat-umong",
    name: "Wat Umong",
    zone: "old-city",
    categories: ["temples-patrimoine", "quartiers-balades"],
    lat: 18.7838, lng: 98.9594,
    description: "Un temple forestier atypique du 14e siècle, construit autour d'un réseau de tunnels de brique voûtés menant à des niches contenant des statues de bouddha. L'ensemble, noyé dans la végétation, dégage une atmosphère bien plus méditative que les temples du centre.",
    whyVisit: "Un temple hors du commun, pour sa forêt silencieuse et ses galeries souterraines plutôt que pour un chedi doré.",
    littleTip: "Des panneaux avec des citations bouddhistes traduites en anglais sont accrochés aux arbres tout autour du site.",
    indicativeDuration: "45 min à 1h",
    photoKey: "wat-umong",
    altText: "Tunnels de brique voûtés du temple forestier Wat Umong à Chiang Mai",
  },
  {
    slug: "wat-suan-dok",
    name: "Wat Suan Dok",
    zone: "old-city",
    categories: ["temples-patrimoine"],
    lat: 18.7936, lng: 98.9699,
    description: "Un grand temple du 14e siècle reconnaissable à son alignement de chedis blancs abritant les cendres de la famille royale de l'ancien royaume Lanna, avec un chedi doré central renfermant une relique du Bouddha.",
    whyVisit: "L'alignement de chedis blancs le plus photogénique de Chiang Mai, surtout au coucher du soleil.",
    littleTip: "Le temple propose aussi des programmes de \"monk chat\" en fin d'après-midi certains jours de la semaine.",
    indicativeDuration: "30 à 45 min",
    photoKey: "wat-suan-dok",
    altText: "Alignement de chedis blancs au temple Wat Suan Dok à Chiang Mai",
  },
  {
    slug: "wat-chiang-man",
    name: "Wat Chiang Man",
    zone: "old-city",
    categories: ["temples-patrimoine"],
    lat: 18.7925, lng: 98.9868,
    description: "Le plus ancien temple de Chiang Mai, fondé en 1296 par le roi Mengrai au moment même de la création de la ville. Son chedi repose sur une rangée de sculptures d'éléphants, et le site abrite deux statues de bouddha anciennes et très vénérées.",
    whyVisit: "Le temple fondateur de la ville, pour qui veut remonter aux origines de Chiang Mai.",
    littleTip: "Moins fréquenté que Chedi Luang ou Phra Singh, à deux pas pourtant — une bonne pause tranquille.",
    indicativeDuration: "30 min",
    photoKey: "wat-chiang-man",
    altText: "Chedi sur base d'éléphants sculptés au temple Wat Chiang Man",
  },
  {
    slug: "wat-phan-tao",
    name: "Wat Phan Tao",
    zone: "old-city",
    categories: ["temples-patrimoine"],
    lat: 18.7890, lng: 98.9847,
    description: "Un viharn entièrement construit en teck sombre, à l'origine un pavillon royal du palais Lanna déplacé et transformé en temple. Son bois patiné et ses colonnes massives en font l'un des sites les plus atmosphériques de la vieille ville, surtout au crépuscule.",
    whyVisit: "Le plus beau bâtiment en teck de la vieille ville, juste à côté de Chedi Luang.",
    littleTip: "Des lanternes sont parfois lâchées dans la cour le soir lors de festivals — à surveiller selon la saison.",
    indicativeDuration: "20 à 30 min",
    photoKey: "wat-phan-tao",
    altText: "Façade en teck sombre du viharn de Wat Phan Tao à Chiang Mai",
  },
  {
    slug: "three-kings-monument",
    name: "Three Kings Monument",
    zone: "old-city",
    categories: ["temples-patrimoine", "quartiers-balades"],
    lat: 18.7879, lng: 98.9887,
    description: "Une statue de bronze représentant les trois rois fondateurs de Chiang Mai, au centre d'une place pavée qui sert aussi de cœur culturel à la ville, entourée du musée d'art et de culture de Chiang Mai.",
    whyVisit: "Le point de repère historique central de la vieille ville, à combiner facilement avec le musée voisin.",
    littleTip: "La place est un bon point de pause ombragé entre deux visites de temples du centre.",
    indicativeDuration: "15 min",
  },
  {
    slug: "wat-lok-moli",
    name: "Wat Lok Moli",
    zone: "old-city",
    categories: ["temples-patrimoine"],
    lat: 18.7958, lng: 98.9860,
    description: "Un temple ancien juste au nord des remparts, connu pour son grand chedi de brique richement orné et pour avoir été un lieu de résidence pour des moines birmans durant la période où Chiang Mai fut sous contrôle de Birmanie.",
    whyVisit: "Un chedi impressionnant et moins touristique, à deux pas de la porte nord de la vieille ville.",
    littleTip: "Facile à combiner avec une balade le long du fossé nord des anciennes fortifications.",
    indicativeDuration: "20 à 30 min",
    photoKey: "wat-lok-moli",
    altText: "Grand chedi de brique du temple Wat Lok Moli à Chiang Mai",
  },
  {
    slug: "wat-jed-yod",
    name: "Wat Jed Yod",
    zone: "old-city",
    categories: ["temples-patrimoine"],
    lat: 18.8024, lng: 98.9655,
    description: "Un temple du 15e siècle dont l'architecture, inspirée du temple de Bodh Gaya en Inde, est unique à Chiang Mai avec ses sept flèches (jed yod) surmontant un sanctuaire couvert de bas-reliefs de divinités en stuc.",
    whyVisit: "L'architecture la plus singulière parmi les temples de Chiang Mai, sans équivalent dans la vieille ville.",
    littleTip: "Le site est un peu excentré, au nord-ouest, et se visite bien en même temps que le musée national.",
    indicativeDuration: "30 min",
  },
  {
    slug: "chiang-mai-national-museum",
    name: "Chiang Mai National Museum",
    zone: "old-city",
    categories: ["temples-patrimoine"],
    lat: 18.8027, lng: 98.9653,
    description: "Le principal musée régional du nord de la Thaïlande, retraçant l'histoire du royaume Lanna à travers des bouddhas anciens, des céramiques et de l'artisanat traditionnel, dans un bâtiment de style lanna.",
    whyVisit: "Le meilleur point d'entrée pour comprendre l'histoire du royaume Lanna avant de visiter ses temples.",
    littleTip: "Se combine naturellement avec la visite de Wat Jed Yod, juste en face.",
    indicativeDuration: "1h",
  },
  {
    slug: "wiang-kum-kam",
    name: "Wiang Kum Kam",
    zone: "riverside-cm",
    categories: ["temples-patrimoine", "quartiers-balades"],
    lat: 18.7398, lng: 99.0028,
    description: "Les vestiges d'une cité fortifiée fondée par le roi Mengrai avant Chiang Mai elle-même, abandonnée après des inondations répétées puis redécouverte au 20e siècle. Un ensemble de ruines de temples disséminées dans un cadre verdoyant, au sud de la ville actuelle.",
    whyVisit: "Un site archéologique méconnu, antérieur à la ville actuelle, pour sortir des temples les plus visités.",
    littleTip: "Des visites en charrette tirée par un cheval font le tour des différents sites du parc.",
    indicativeDuration: "1h à 1h30",
    photoKey: "wiang-kum-kam",
    altText: "Ruines de temple à Wiang Kum Kam près de Chiang Mai",
  },
  {
    slug: "wat-ket-karam",
    name: "Wat Ket Karam",
    zone: "riverside-cm",
    categories: ["temples-patrimoine"],
    lat: 18.7903, lng: 99.0010,
    description: "Un temple paisible sur la rive est de la rivière Ping, dans le quartier historique de Wat Ket, avec un petit musée attenant exposant des objets du quotidien donnés par les habitants du quartier.",
    whyVisit: "Un temple de quartier authentique, loin de l'agitation de la vieille ville, dans un secteur riverain agréable à pied.",
    littleTip: "Le quartier de Wat Ket autour du temple se prête bien à une balade tranquille le long du fleuve.",
    indicativeDuration: "30 min",
    photoKey: "wat-ket-karam",
    altText: "Viharn du temple Wat Ket Karam en bord de rivière à Chiang Mai",
  },

  // ---------- Nature et points de vue (Doi Suthep et environs) ----------
  {
    slug: "bua-tong-sticky-waterfalls",
    name: "Bua Tong Sticky Waterfalls",
    zone: "doi-suthep-nature",
    categories: ["quartiers-balades", "activites-famille"],
    lat: 19.1733, lng: 99.2144,
    description: "Une cascade calcaire inhabituelle dont la roche, riche en minéraux, offre une adhérence suffisante pour grimper pieds nus le long des paliers rocheux, à contre-courant de l'eau. Une activité ludique et gratuite, assez unique en son genre dans la région.",
    whyVisit: "L'une des expériences nature les plus singulières et ludiques des environs de Chiang Mai, adaptée aux familles.",
    littleTip: "La roche reste adhérente même mouillée, mais prévoyez des vêtements qui peuvent se salir et sécher vite.",
    indicativeDuration: "1h30 (trajet depuis Chiang Mai : environ 1h15)",
  },
  {
    slug: "huay-tung-tao-lake",
    name: "Huay Tung Tao Lake",
    zone: "doi-suthep-nature",
    categories: ["quartiers-balades", "activites-famille"],
    lat: 18.8486, lng: 98.9409,
    description: "Un lac de retenue au pied des montagnes, à une vingtaine de minutes du centre, bordé de petits restaurants sur pilotis avec coussins et tables basses où l'on grignote face à l'eau. Un lieu de détente très fréquenté par les habitants le week-end.",
    whyVisit: "Une escapade nature facile et locale, loin des circuits touristiques, pour un repas ou une balade au bord de l'eau.",
    littleTip: "Préférez une visite en semaine : le week-end, le site est très fréquenté par les familles locales.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "mon-cham",
    name: "Mon Cham",
    zone: "doi-suthep-nature",
    categories: ["points-de-vue", "quartiers-balades"],
    lat: 19.0611, lng: 98.8253,
    description: "Un point de vue en altitude sur une crête de montagne près de Mae Rim, aménagé en jardins en terrasses avec des cafés et des tentes de glamping, offrant une vue dégagée sur les collines environnantes, particulièrement appréciée à l'aube quand la mer de nuages recouvre les vallées.",
    whyVisit: "Le point de vue le plus spectaculaire des environs de Chiang Mai, surtout en saison fraîche (novembre-février).",
    littleTip: "La mer de nuages se voit surtout tôt le matin en saison fraîche — un lever avant l'aube est nécessaire.",
    indicativeDuration: "2h (trajet inclus)",
  },
  {
    slug: "doi-pui-hmong-village",
    name: "Doi Pui — village Hmong",
    zone: "doi-suthep-nature",
    categories: ["quartiers-balades", "experiences-insolites"],
    lat: 18.8294, lng: 98.8864,
    description: "Un village de la minorité Hmong installé sur les hauteurs du Doi Pui, au-delà du Wat Phra That Doi Suthep, avec des étals d'artisanat, de thé et de fleurs, et un petit jardin exposant les cultures traditionnelles de la montagne.",
    whyVisit: "Une façon simple de prolonger la visite de Doi Suthep vers les hauteurs et de découvrir une culture montagnarde locale.",
    littleTip: "Le village se visite facilement en continuant la route au-delà du temple de Doi Suthep, en voiture ou songthaew.",
    indicativeDuration: "1h",
    photoKey: "doi-pui-hmong-village",
    altText: "Village de la minorité Hmong sur les hauteurs du Doi Pui près de Chiang Mai",
  },
  {
    slug: "mae-sa-waterfall",
    name: "Mae Sa Waterfall",
    zone: "doi-suthep-nature",
    categories: ["quartiers-balades", "activites-famille"],
    lat: 18.9355, lng: 98.8797,
    description: "Une cascade à paliers multiples dans la vallée de Mae Sa, accessible par un sentier aménagé qui longe plusieurs bassins successifs, dans un parc national ombragé prisé pour les pique-niques en famille.",
    whyVisit: "Une cascade facilement accessible, avec plusieurs niveaux à explorer sans effort particulier.",
    littleTip: "Les premiers paliers, proches du parking, sont les plus fréquentés — les plus hauts sont souvent plus calmes.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "royal-park-rajapruek",
    name: "Royal Park Rajapruek",
    zone: "doi-suthep-nature",
    categories: ["quartiers-balades", "activites-famille"],
    lat: 18.7544, lng: 98.9158,
    description: "Un vaste jardin botanique royal créé à l'occasion d'une exposition horticole internationale, organisé en pavillons thématiques représentant différents pays et régions de Thaïlande, avec un grand pavillon royal doré en son centre.",
    whyVisit: "Le plus beau jardin botanique aménagé de la région de Chiang Mai, agréable toute l'année.",
    littleTip: "Un petit tram circule dans le parc pour qui ne veut pas tout parcourir à pied — le site est assez étendu.",
    indicativeDuration: "1h30 à 2h",
    photoKey: "royal-park-rajapruek",
    altText: "Pavillon royal doré au Royal Park Rajapruek de Chiang Mai",
  },
  {
    slug: "doi-suthep-pui-national-park",
    name: "Doi Suthep-Pui National Park",
    zone: "doi-suthep-nature",
    categories: ["quartiers-balades", "points-de-vue"],
    lat: 18.8167, lng: 98.9000,
    description: "Le parc national qui englobe la montagne du Doi Suthep, avec plusieurs sentiers de randonnée en forêt, des cascades secondaires et, au sommet, l'ancien palais d'été royal entouré de jardins de fleurs, à quelques kilomètres au-delà du grand temple.",
    whyVisit: "Pour prolonger la visite de Doi Suthep par de la vraie randonnée en forêt plutôt qu'un simple aller-retour au temple.",
    littleTip: "Le palais d'été (Phuping Palace) et ses jardins ne sont ouverts au public que lorsque la famille royale n'y réside pas.",
    indicativeDuration: "2h à 4h selon le sentier choisi",
  },

  // ---------- Restaurants ----------
  {
    slug: "khao-soi-khun-yai",
    name: "Khao Soi Khun Yai",
    zone: "old-city",
    categories: ["restaurants", "incontournables"],
    lat: 18.7935, lng: 98.9975,
    description: "Une adresse très réputée pour le khao soi, la soupe de curry au lait de coco et nouilles de blé croustillantes, plat signature du nord de la Thaïlande. Simplicité de la salle, générosité de l'assiette : l'un des repères les plus cités de la ville pour ce plat.",
    whyVisit: "Une référence pour découvrir le khao soi, le plat le plus emblématique de la cuisine du nord thaïlandais.",
    littleTip: "Demandez le poulet ou le bœuf selon votre préférence — les deux versions sont également courantes.",
    indicativeDuration: "45 min",
    photoKey: "khao-soi-khun-yai",
    altText: "Bol de khao soi, soupe de curry au nord de la Thaïlande",
  },
  {
    slug: "huen-phen",
    name: "Huen Phen",
    zone: "old-city",
    categories: ["restaurants"],
    lat: 18.7897, lng: 98.9918,
    description: "Un restaurant familial servant une cuisine du nord thaïlandais authentique dans un cadre rustique décoré d'antiquités, avec sai oua (saucisse épicée du nord) et nam prik ong parmi ses plats les plus demandés.",
    whyVisit: "Une des meilleures tables pour découvrir la diversité de la cuisine du nord, au-delà du seul khao soi.",
    littleTip: "La salle principale, plus décorée, se remplit vite au dîner — le déjeuner y est plus calme.",
    indicativeDuration: "1h",
  },
  {
    slug: "sp-chicken",
    name: "SP Chicken",
    zone: "old-city",
    categories: ["restaurants"],
    lat: 18.7868, lng: 98.9899,
    description: "Une rôtisserie spécialisée dans le poulet grillé mariné thaïlandais (gai yang), servi avec du riz gluant et une sauce au tamarin épicée, dans un cadre simple et efficace apprécié pour sa régularité.",
    whyVisit: "Un classique simple et fiable pour le poulet grillé thaïlandais, à prix très raisonnable.",
    littleTip: "Le poulet se vend souvent entier ou en demi-portion — pratique pour partager en petit groupe.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "the-riverside-bar-restaurant",
    name: "The Riverside Bar & Restaurant",
    zone: "riverside-cm",
    categories: ["restaurants", "bars-rooftops"],
    lat: 18.7913, lng: 99.0007,
    description: "Une institution au bord de la rivière Ping, avec terrasse en plein air, musique live chaque soir et une carte large allant de la cuisine thaïlandaise aux plats occidentaux. L'une des adresses les plus anciennes et les plus connues du secteur riverain.",
    whyVisit: "L'ambiance musique live en bord de rivière la plus connue de Chiang Mai, pour une soirée décontractée.",
    littleTip: "Réservez une table côté rivière si vous venez pour l'ambiance — les groupes s'enchaînent toute la soirée.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "antique-house-1955",
    name: "Antique House 1955",
    zone: "riverside-cm",
    categories: ["restaurants"],
    lat: 18.7930, lng: 99.0005,
    description: "Un restaurant installé dans une ancienne maison en teck au bord de la rivière Ping, décoré d'antiquités thaïlandaises, servant une cuisine thaï classique dans un cadre particulièrement photogénique au coucher du soleil.",
    whyVisit: "Le cadre architectural le plus marquant parmi les restaurants du secteur riverain.",
    littleTip: "Les tables en terrasse, près de l'eau, offrent la meilleure vue au coucher du soleil.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "dash-teak-house",
    name: "Dash! Teak House",
    zone: "nimmanhaemin",
    categories: ["restaurants"],
    lat: 18.8007, lng: 98.9683,
    description: "Un restaurant fusion installé dans une maison en teck traditionnelle rénovée, mêlant cuisine thaïlandaise revisitée et influences internationales, dans le quartier branché de Nimmanhaemin.",
    whyVisit: "Une cuisine créative dans un cadre architectural soigné, emblématique du Nimman contemporain.",
    littleTip: "Le jardin extérieur, à l'arrière de la maison, est plus calme que la salle principale.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "tong-tem-toh",
    name: "Tong Tem Toh",
    zone: "nimmanhaemin",
    categories: ["restaurants"],
    lat: 18.8057, lng: 98.9676,
    description: "Un restaurant populaire de cuisine du nord thaïlandais dans une grande maison en bois, très fréquenté par les habitants pour sa carte généreuse de plats régionaux à prix doux et son ambiance conviviale.",
    whyVisit: "Une cuisine du nord authentique et abordable, plébiscitée par les habitants de Chiang Mai eux-mêmes.",
    littleTip: "Le lieu est populaire au dîner — une arrivée un peu avant l'heure de pointe évite l'attente.",
    indicativeDuration: "1h",
  },
  {
    slug: "khao-soi-mae-sai",
    name: "Khao Soi Mae Sai",
    zone: "old-city",
    categories: ["restaurants"],
    lat: 18.7840, lng: 98.9880,
    description: "Une autre adresse très citée pour le khao soi, dans un style plus simple et local, souvent comparée à Khun Yai par les habitués qui débattent de laquelle propose le meilleur bouillon.",
    whyVisit: "Une alternative locale et moins touristique pour comparer les versions du khao soi à Chiang Mai.",
    littleTip: "Petite salle sans prétention — l'adresse est surtout fréquentée par des habitants du quartier.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "aroon-rai",
    name: "Aroon Rai",
    zone: "old-city",
    categories: ["restaurants"],
    lat: 18.7903, lng: 98.9890,
    description: "Un restaurant familial ouvert depuis plusieurs décennies près de Tha Phae Gate, servant une cuisine thaïlandaise et du nord à prix doux, en terrasse extérieure, fréquenté aussi bien par les habitants que par les visiteurs.",
    whyVisit: "Une adresse historique et sans prétention, idéalement placée pour une pause repas en explorant la vieille ville.",
    littleTip: "La terrasse extérieure, à l'ombre, est agréable même aux heures chaudes de la journée.",
    indicativeDuration: "45 min",
  },
  {
    slug: "the-house-by-ginger",
    name: "The House by Ginger",
    zone: "old-city",
    categories: ["restaurants"],
    lat: 18.7889, lng: 98.9897,
    description: "Un restaurant installé dans une ancienne résidence coloniale rénovée au cœur de la vieille ville, servant une cuisine thaïlandaise soignée dans un cadre élégant, avec une petite boutique de décoration attenante.",
    whyVisit: "Un cadre élégant et une cuisine thaïlandaise raffinée, pour un repas un peu plus habillé dans la vieille ville.",
    littleTip: "La maison vaut aussi le détour pour son architecture et sa boutique, même hors des heures de repas.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "blackitch-artisan-kitchen",
    name: "Blackitch Artisan Kitchen",
    zone: "nimmanhaemin",
    categories: ["restaurants"],
    lat: 18.8128, lng: 98.9661,
    description: "Un petit restaurant de dégustation en plusieurs services, porté par un chef passionné de fermentation et de produits locaux du nord thaïlandais, servant une cuisine créative dans un cadre intime à places limitées.",
    whyVisit: "La table la plus créative et la plus pointue de Chiang Mai pour une expérience gastronomique hors norme.",
    littleTip: "Les places sont limitées et la réservation à l'avance est indispensable.",
    indicativeDuration: "2h à 2h30",
  },
  {
    slug: "palaad-tawanron",
    name: "Palaad Tawanron",
    zone: "doi-suthep-nature",
    categories: ["restaurants", "points-de-vue"],
    lat: 18.8126, lng: 98.9478,
    description: "Un restaurant construit en terrasses au pied de la montagne, au bord d'une cascade et d'un petit lac, offrant une vue dégagée sur toute la ville de Chiang Mai en contrebas, particulièrement recherché au coucher du soleil.",
    whyVisit: "La meilleure vue sur la ville depuis une table en extérieur, surtout pour un dîner au coucher du soleil.",
    littleTip: "Réservez une table en hauteur à l'avance pour la meilleure vue, surtout le week-end.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "ginger-farm-kitchen",
    name: "Ginger Farm Kitchen",
    zone: "nimmanhaemin",
    categories: ["restaurants"],
    lat: 18.8050, lng: 98.9650,
    description: "Un restaurant approvisionné directement par la ferme biologique du même groupe dans la vallée de Mae Wang, mettant en avant des légumes et produits frais locaux dans une cuisine thaïlandaise soignée.",
    whyVisit: "Une cuisine thaïlandaise fraîche et traçable, portée par une démarche fermière assumée.",
    littleTip: "Les légumes de saison, en tête de carte, changent régulièrement selon les récoltes de la ferme.",
    indicativeDuration: "1h",
  },
  {
    slug: "taste-from-heaven",
    name: "Taste From Heaven",
    zone: "old-city",
    categories: ["restaurants"],
    lat: 18.7868, lng: 98.9850,
    description: "Un restaurant végétarien et végan réputé pour ses currys et ses plats thaïlandais classiques revisités sans viande, très prisé des voyageurs en quête d'options végétales fiables dans la vieille ville.",
    whyVisit: "Une des meilleures adresses végétariennes/véganes de la vieille ville, avec une carte thaï complète.",
    littleTip: "Les currys sont généralement proposés en plusieurs niveaux de piment — précisez votre tolérance en commandant.",
    indicativeDuration: "45 min",
  },
  {
    slug: "khao-soi-lam-duan",
    name: "Khao Soi Lam Duan",
    zone: "old-city",
    categories: ["restaurants"],
    lat: 18.7903, lng: 98.9928,
    description: "Encore une adresse de référence pour le khao soi, nichée près de Chang Puak Gate, fréquentée depuis des décennies par les habitants du quartier pour son bouillon épicé et parfumé.",
    whyVisit: "Une troisième option sérieuse pour qui veut comparer les meilleures versions du khao soi en ville.",
    littleTip: "Le secteur autour de Chang Puak Gate concentre plusieurs étals de street food le soir, à explorer après le repas.",
    indicativeDuration: "30 à 45 min",
  },

  // ---------- Cafés et brunchs ----------
  {
    slug: "akha-ama-coffee",
    name: "Akha Ama Coffee",
    zone: "old-city",
    categories: ["cafes-brunchs"],
    lat: 18.7903, lng: 98.9995,
    description: "Un café pionnier du commerce équitable à Chiang Mai, fondé par un membre de la minorité Akha pour valoriser le café cultivé par sa communauté dans les montagnes du nord. Torréfaction soignée et engagement social en font une référence de la scène café locale.",
    whyVisit: "L'une des histoires de café les plus intéressantes de Chiang Mai, portée par une vraie démarche communautaire.",
    littleTip: "Plusieurs origines de café des montagnes du nord sont proposées en filtre — l'occasion de comparer les terroirs.",
    indicativeDuration: "30 à 45 min",
    photoKey: "akha-ama-coffee",
    altText: "Intérieur du café Akha Ama Coffee à Chiang Mai",
  },
  {
    slug: "ristr8to",
    name: "Ristr8to",
    zone: "nimmanhaemin",
    categories: ["cafes-brunchs"],
    lat: 18.7998, lng: 98.9670,
    description: "Un café fondé par un barista plusieurs fois champion du monde de latte art, devenu une référence internationale pour la qualité de ses espressos et la précision de ses créations en mousse de lait.",
    whyVisit: "Une référence mondiale du café espresso et du latte art, incontournable pour les amateurs.",
    littleTip: "Le café d'origine, sur Nimmanhaemin, reste le plus emblématique malgré l'ouverture d'autres adresses en ville.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "graph-cafe",
    name: "Graph Cafe",
    zone: "nimmanhaemin",
    categories: ["cafes-brunchs"],
    lat: 18.8102, lng: 98.9665,
    description: "Un café design au mobilier épuré et à l'architecture ouverte, apprécié pour son cadre photogénique et sa carte de cafés de spécialité, devenu l'un des rendez-vous incontournables du quartier de Nimmanhaemin.",
    whyVisit: "Un des cafés les plus esthétiques du Nimman, pour une pause café dans un cadre soigné.",
    littleTip: "Les grandes baies vitrées en font un lieu lumineux idéal en matinée.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "woo-cafe",
    name: "Woo Cafe",
    zone: "riverside-cm",
    categories: ["cafes-brunchs"],
    lat: 18.7920, lng: 99.0015,
    description: "Un café-galerie installé dans un jardin tropical luxuriant au bord de la rivière Ping, combinant une carte de brunch soignée avec une boutique d'art et d'artisanat thaïlandais contemporain.",
    whyVisit: "Le cadre le plus verdoyant et photogénique pour un brunch en bord de rivière.",
    littleTip: "La galerie d'art attenante mérite un tour, même sans intention d'achat.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "omnia-roasters",
    name: "Omnia Roasters",
    zone: "nimmanhaemin",
    categories: ["cafes-brunchs"],
    lat: 18.8012, lng: 98.9661,
    description: "Un café et torréfacteur spécialisé dans les cafés de terroir thaïlandais, mettant en avant la traçabilité et la torréfaction artisanale dans un cadre minimaliste au cœur de Nimmanhaemin.",
    whyVisit: "Pour les amateurs de café de spécialité en quête de cafés d'origine thaïlandaise bien torréfiés.",
    littleTip: "Les grains sont aussi vendus en sachet pour qui veut rapporter du café thaïlandais à la maison.",
    indicativeDuration: "30 min",
  },
  {
    slug: "ombra-caffe",
    name: "Ombra Caffe",
    zone: "nimmanhaemin",
    categories: ["cafes-brunchs"],
    lat: 18.8042, lng: 98.9676,
    description: "Un petit café italien niché dans une ruelle de Nimmanhaemin, servant espresso, pâtisseries et une courte carte de plats, dans une ambiance intimiste très différente des grandes enseignes du quartier.",
    whyVisit: "Une pause café italienne discrète, loin de l'agitation des grandes artères du Nimman.",
    littleTip: "Les places sont limitées — mieux vaut éviter les heures de pointe du déjeuner si vous cherchez le calme.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "free-bird-cafe",
    name: "Free Bird Cafe",
    zone: "old-city",
    categories: ["cafes-brunchs"],
    lat: 18.7845, lng: 98.9850,
    description: "Un café associatif dont les bénéfices financent des programmes éducatifs locaux, avec un jardin ombragé agréable et une carte simple de boissons et de plats légers, dans un coin tranquille de la vieille ville.",
    whyVisit: "Une pause café à l'ambiance détendue qui soutient directement une cause éducative locale.",
    littleTip: "Le jardin extérieur à l'arrière est le coin le plus agréable du site.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "mix-coffee-roasters",
    name: "Mix Coffee Roasters",
    zone: "nimmanhaemin",
    categories: ["cafes-brunchs"],
    lat: 18.7985, lng: 98.9672,
    description: "Un café de quartier simple et sans artifice à Nimmanhaemin, fréquenté par les habitants et les étudiants des facultés proches pour sa torréfaction maison et ses prix raisonnables.",
    whyVisit: "Un café de quartier authentique, loin des adresses les plus instagrammées du Nimman.",
    littleTip: "Une bonne option pour travailler ou lire un moment, moins fréquentée que les cafés les plus connus du secteur.",
    indicativeDuration: "30 min",
  },
  {
    slug: "yesterday-the-hotel-cafe",
    name: "Yesterday The Hotel Cafe",
    zone: "old-city",
    categories: ["cafes-brunchs"],
    lat: 18.7868, lng: 98.9850,
    description: "Un café installé dans une maison coloniale restaurée du début du 20e siècle, rattaché à un petit hôtel-boutique, avec une déco d'époque soignée et une carte de pâtisseries et de boissons classiques.",
    whyVisit: "Le cadre architectural le plus charmant parmi les cafés de la vieille ville.",
    littleTip: "Le patio intérieur, à l'ombre, est le coin le plus agréable aux heures chaudes de la journée.",
    indicativeDuration: "45 min",
  },
  {
    slug: "cafe-de-nimman",
    name: "Cafe de Nimman",
    zone: "nimmanhaemin",
    categories: ["cafes-brunchs"],
    lat: 18.8010, lng: 98.9668,
    description: "Un café central du quartier de Nimmanhaemin, point de repère pratique pour une pause entre deux boutiques, avec une carte simple de boissons chaudes et froides et quelques pâtisseries.",
    whyVisit: "Un point de chute pratique et central pour explorer le quartier de Nimmanhaemin à pied.",
    littleTip: "Bien situé pour rayonner à pied vers One Nimman et les galeries voisines.",
    indicativeDuration: "30 min",
  },
  {
    slug: "the-barn-eatery-design",
    name: "The Barn: Eatery Design",
    zone: "nimmanhaemin",
    categories: ["cafes-brunchs"],
    lat: 18.8080, lng: 98.9650,
    description: "Un café-restaurant au décor industriel soigné, mêlant mobilier design et grandes verrières, proposant une carte de brunch et de pâtisseries occidentales appréciée des habitués du Nimman.",
    whyVisit: "Une adresse brunch au décor particulièrement travaillé, prisée des photographes amateurs.",
    littleTip: "Le lieu se remplit vite le week-end en milieu de matinée — une arrivée tôt évite l'attente.",
    indicativeDuration: "1h",
  },
  {
    slug: "fern-forest-cafe",
    name: "Fern Forest Café",
    zone: "doi-suthep-nature",
    categories: ["cafes-brunchs", "experiences-insolites"],
    lat: 18.8580, lng: 98.9130,
    description: "Un café immergé dans une véritable forêt de fougères géantes et de bambous, aménagé autour d'un cadre naturel luxuriant plutôt que dans une salle classique, aux abords de Mae Rim.",
    whyVisit: "Le cadre café le plus singulier des environs de Chiang Mai — on vient d'abord pour la forêt, le café ensuite.",
    littleTip: "Le site est en extérieur et peut fermer ou réduire son activité lors de fortes pluies — mieux vaut vérifier la météo.",
    indicativeDuration: "1h (trajet depuis le centre : environ 30 à 40 min)",
  },

  // ---------- Marchés et shopping ----------
  {
    slug: "jing-jai-market",
    name: "Jing Jai Market",
    zone: "nimmanhaemin",
    categories: ["marches", "incontournables"],
    lat: 18.8187, lng: 98.9697,
    description: "Un marché biologique et artisanal le week-end, très prisé des habitants, réunissant producteurs locaux, stands de nourriture fraîche et créateurs d'artisanat dans une ambiance nettement moins touristique que les marchés du centre.",
    whyVisit: "Le marché le plus authentique et le plus apprécié des habitants pour la nourriture et l'artisanat local du week-end.",
    littleTip: "Le marché est surtout actif le week-end en matinée — il vaut mieux y arriver avant la grosse chaleur de midi.",
    indicativeDuration: "1h à 1h30",
    photoKey: "jing-jai-market",
    altText: "Étals de producteurs locaux au marché de Jing Jai à Chiang Mai",
  },
  {
    slug: "sunday-walking-street",
    name: "Sunday Walking Street",
    zone: "old-city",
    categories: ["marches", "incontournables", "shopping"],
    lat: 18.7877, lng: 98.9890,
    description: "Le grand marché piéton du dimanche soir, qui transforme la rue Ratchadamnoen et les ruelles adjacentes de la vieille ville en un long marché d'artisanat, de street food et de musique, parmi les plus réputés de Thaïlande.",
    whyVisit: "Le plus grand et le plus réputé des marchés nocturnes de Chiang Mai, un rendez-vous hebdomadaire incontournable.",
    littleTip: "Arrivez en fin d'après-midi pour profiter de l'ambiance avant la foule la plus dense, en soirée.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "wua-lai-saturday-market",
    name: "Wua Lai Saturday Walking Street",
    zone: "old-city",
    categories: ["marches", "shopping"],
    lat: 18.7812, lng: 98.9870,
    description: "L'équivalent du samedi soir, sur la rue Wua Lai au sud de la vieille ville, traditionnellement associée aux artisans de l'argenterie. Marché plus modeste et moins fréquenté que celui du dimanche, mais apprécié pour son ambiance plus locale.",
    whyVisit: "Une alternative plus tranquille au grand marché du dimanche, dans un quartier historique de l'argenterie.",
    littleTip: "Moins couru que le marché du dimanche — une bonne option si vous voulez éviter la foule tout en gardant l'ambiance marché nocturne.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "chiang-mai-night-bazaar",
    name: "Chiang Mai Night Bazaar",
    zone: "riverside-cm",
    categories: ["marches", "shopping"],
    lat: 18.7865, lng: 99.0003,
    description: "Le marché nocturne permanent de Chiang Mai, installé chaque soir le long de Chang Khlan Road, avec des centaines d'étals de vêtements, souvenirs et artisanat, ainsi que des étages de restauration et de spectacles.",
    whyVisit: "Le marché nocturne ouvert tous les soirs, pratique pour qui ne passe pas un dimanche ou samedi en ville.",
    littleTip: "Moins authentique que les marchés du week-end, mais ouvert tous les soirs — pratique selon votre emploi du temps.",
    indicativeDuration: "1h à 2h",
    photoKey: "night-bazaar-cm",
    altText: "Rue animée de Chang Khlan Road, siège du marché nocturne de Chiang Mai",
  },
  {
    slug: "warorot-market",
    name: "Warorot Market",
    zone: "riverside-cm",
    categories: ["marches", "shopping", "street-food"],
    lat: 18.7903, lng: 98.9945,
    description: "Le plus grand marché couvert et traditionnel de Chiang Mai, fréquenté avant tout par les habitants, où l'on trouve produits frais, épices, textiles et objets du quotidien sur plusieurs étages, loin des circuits touristiques.",
    whyVisit: "Le marché quotidien le plus authentique de la ville, pour voir la vraie vie locale plutôt que de l'artisanat touristique.",
    littleTip: "Le marché aux fleurs voisin (Ton Lamyai) complète bien la visite, juste à côté sur la rive du fleuve.",
    indicativeDuration: "1h",
    photoKey: "warorot-market",
    altText: "Allée du marché couvert de Warorot à Chiang Mai",
  },
  {
    slug: "one-nimman",
    name: "One Nimman",
    zone: "nimmanhaemin",
    categories: ["shopping", "cafes-brunchs"],
    lat: 18.8018, lng: 98.9670,
    description: "Un complexe commercial à ciel ouvert au cœur de Nimmanhaemin, mêlant boutiques design, galeries d'art, cafés et un marché de créateurs le week-end, dans une architecture évoquant un village lanna contemporain.",
    whyVisit: "Le point de ralliement shopping et cafés du quartier de Nimmanhaemin, agréable même sans acheter.",
    littleTip: "Le marché de créateurs du week-end, en soirée, est le moment le plus animé du site.",
    indicativeDuration: "1h à 1h30",
    photoKey: "one-nimman",
    altText: "Architecture à ciel ouvert du complexe One Nimman à Chiang Mai",
  },
  {
    slug: "maya-lifestyle-shopping-center",
    name: "MAYA Lifestyle Shopping Center",
    zone: "nimmanhaemin",
    categories: ["shopping"],
    lat: 18.7998, lng: 98.9672,
    description: "Le grand centre commercial moderne du quartier de Nimmanhaemin, avec enseignes internationales, cinéma, supermarché et un rooftop avec vue sur la ville, pratique pour les achats classiques ou se mettre au frais.",
    whyVisit: "L'option shopping climatisée la plus pratique du secteur Nimman, utile en pleine chaleur.",
    littleTip: "Le rooftop, en soirée, offre une vue correcte sur la ville et quelques bars pour un verre.",
    indicativeDuration: "1h",
  },

  // ---------- Excursions depuis Chiang Mai ----------
  {
    slug: "mae-kampong-village",
    name: "Mae Kampong Village",
    zone: "excursions-cm",
    categories: ["excursions", "quartiers-balades"],
    lat: 18.8838, lng: 99.2278,
    description: "Un village de montagne traditionnel entouré de plantations de thé et de forêt tropicale, connu pour ses maisons en bois sur pilotis, une cascade accessible à pied et des séjours chez l'habitant très prisés pour un bol d'air loin de la ville.",
    whyVisit: "L'excursion nature et village la plus dépaysante dans les montagnes à l'est de Chiang Mai.",
    littleTip: "Une nuit sur place en famille d'accueil permet de profiter du calme du village au lever du jour, loin des visiteurs de la journée.",
    indicativeDuration: "demi-journée à une nuit (trajet depuis Chiang Mai : environ 1h)",
  },
  {
    slug: "chiang-dao-cave",
    name: "Chiang Dao Cave & Mountain",
    zone: "excursions-cm",
    categories: ["excursions", "quartiers-balades"],
    lat: 19.3813, lng: 98.9425,
    description: "Un vaste réseau de grottes sacrées au pied de l'imposant Doi Chiang Dao, la deuxième plus haute montagne du nord de la Thaïlande, avec des galeries ouvertes au public et des sanctuaires bouddhistes installés dans la roche.",
    whyVisit: "Une excursion combinant grotte sacrée et l'un des plus beaux massifs montagneux du nord de la Thaïlande.",
    littleTip: "Un guide local avec lanterne à gaz est nécessaire pour explorer les galeries les plus profondes, non éclairées.",
    indicativeDuration: "journée complète (trajet depuis Chiang Mai : environ 1h30)",
  },
  {
    slug: "pai",
    name: "Pai",
    zone: "excursions-cm",
    categories: ["excursions"],
    lat: 19.3583, lng: 98.4400,
    description: "Une petite ville de montagne devenue un haut lieu du tourisme alternatif du nord thaïlandais, accessible par une route sinueuse à travers les collines, connue pour son marché nocturne, ses sources chaudes voisines et son ambiance décontractée.",
    whyVisit: "L'excursion la plus emblématique du nord thaïlandais, pour qui a le temps d'une à deux journées supplémentaires.",
    littleTip: "La route depuis Chiang Mai compte plus de 760 virages — prévoyez de la marge si vous êtes sujet au mal des transports.",
    indicativeDuration: "1 à 2 jours (trajet depuis Chiang Mai : environ 3h)",
  },
  {
    slug: "doi-inthanon-national-park",
    name: "Doi Inthanon National Park",
    zone: "excursions-cm",
    categories: ["excursions", "points-de-vue", "quartiers-balades"],
    lat: 18.5897, lng: 98.4867,
    description: "Le parc national qui abrite le plus haut sommet de Thaïlande, avec des cascades, des sentiers en forêt de nuages, des rizières en terrasses de communautés Karen et deux chedis jumeaux construits en l'honneur du roi et de la reine, offrant une vue dégagée sur la vallée.",
    whyVisit: "Le point culminant de la Thaïlande et l'une des excursions nature les plus complètes depuis Chiang Mai.",
    littleTip: "Le sommet est nettement plus frais que la ville — prévoyez une veste même en pleine saison chaude.",
    indicativeDuration: "journée complète (trajet depuis Chiang Mai : environ 1h30 à 2h)",
    photoKey: "doi-inthanon",
    altText: "Forêt de nuages au sommet du parc national de Doi Inthanon",
  },
  {
    slug: "lamphun",
    name: "Lamphun",
    zone: "excursions-cm",
    categories: ["excursions", "temples-patrimoine"],
    lat: 18.5747, lng: 99.0086,
    description: "L'une des plus anciennes villes encore habitées de Thaïlande, capitale de l'ancien royaume de Hariphunchai, à une trentaine de minutes au sud de Chiang Mai, connue pour son temple Wat Phra That Hariphunchai et son atmosphère provinciale préservée.",
    whyVisit: "Une excursion courte et facile pour voir une ville historique authentique, sans la foule des sites plus connus.",
    littleTip: "La route entre Chiang Mai et Lamphun est bordée d'immenses arbres centenaires, plantés à l'époque coloniale.",
    indicativeDuration: "demi-journée (trajet depuis Chiang Mai : environ 30 min)",
    photoKey: "lamphun",
    altText: "Temple Wat Phra That Hariphunchai à Lamphun, près de Chiang Mai",
  },
  {
    slug: "mae-sa-valley",
    name: "Mae Sa Valley / Mae Rim",
    zone: "excursions-cm",
    categories: ["excursions", "quartiers-balades"],
    lat: 18.9333, lng: 98.8833,
    description: "Une vallée verdoyante au nord de Chiang Mai, concentrant fermes d'orchidées, plantations, cascades et plusieurs parcs animaliers, qui se prête bien à une journée combinant plusieurs arrêts nature sur le trajet vers les montagnes.",
    whyVisit: "Une vallée pratique pour combiner plusieurs activités nature en une seule excursion au nord de la ville.",
    littleTip: "La route continue ensuite vers Mon Cham et Mae Sa Waterfall — une journée peut facilement combiner les trois.",
    indicativeDuration: "demi-journée à journée complète",
  },

  // ---------- Expériences insolites ----------
  // Elephant Nature Park deliberately excluded: despite its genuine
  // conservation record, its visitor program still includes feeding and
  // sometimes bathing the elephants. Chang Chill below is strictly
  // observation-only (no riding, no feeding, no bathing by visitors),
  // developed with World Animal Protection — the bar this guide holds
  // elephant experiences to.
  {
    slug: "chang-chill",
    name: "Chang Chill",
    zone: "excursions-cm",
    categories: ["experiences-insolites"],
    lat: 18.5667, lng: 98.5333,
    description: "Un sanctuaire d'éléphants dans la vallée de Mae Wang, conçu avec l'ONG World Animal Protection selon un modèle strictement \"sans contact\" : les visiteurs observent les éléphants évoluer en semi-liberté depuis des plateformes dédiées, sans les nourrir à la main ni les baigner. Les éléphants suivent leur propre rythme plutôt qu'un programme organisé autour des visiteurs.",
    whyVisit: "L'un des rares sanctuaires de la région à exclure totalement le nourrissage et le bain par les visiteurs — une rencontre vraiment respectueuse du bien-être animal.",
    littleTip: "Le modèle \"observation uniquement\" signifie moins d'interaction directe qu'ailleurs — c'est un choix assumé, pas un manque : les éléphants ne sont jamais sollicités pour les visiteurs.",
    indicativeDuration: "demi-journée à journée complète (trajet depuis Chiang Mai : environ 1h30)",
  },
  {
    slug: "monk-chat",
    name: "Monk Chat",
    zone: "old-city",
    categories: ["experiences-insolites"],
    lat: 18.7877, lng: 98.9853,
    description: "Des séances informelles où de jeunes moines, souvent étudiants, échangent en anglais avec les visiteurs sur le bouddhisme, la vie monastique ou la culture thaïlandaise, organisées dans plusieurs temples de la vieille ville dont Wat Chedi Luang.",
    whyVisit: "Une occasion rare et authentique d'échanger directement avec des moines bouddhistes.",
    littleTip: "Les séances ont lieu à horaires fixes, généralement en fin d'après-midi — vérifiez le jour et l'heure au temple concerné.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "lila-thai-massage",
    name: "Lila Thai Massage",
    zone: "old-city",
    categories: ["experiences-insolites", "bien-etre-spas"],
    lat: 18.7940, lng: 98.9905,
    description: "Une chaîne de salons de massage thaïlandais entièrement tenus par des masseuses aveugles ou malvoyantes, formées à un massage traditionnel reconnu pour sa précision, dans une démarche d'insertion professionnelle unique en son genre.",
    whyVisit: "Un massage thaïlandais traditionnel de qualité, porté par une initiative sociale remarquable.",
    littleTip: "Plusieurs adresses existent en ville — réserver à l'avance évite l'attente, surtout en soirée.",
    indicativeDuration: "1h à 2h",
  },
  {
    slug: "flight-of-the-gibbon",
    name: "Flight of the Gibbon",
    zone: "excursions-cm",
    categories: ["experiences-insolites", "activites-famille"],
    lat: 18.8838, lng: 99.2278,
    description: "Un parcours de tyroliennes à travers la canopée de la forêt tropicale près de Mae Kampong, l'un des plus longs et des plus établis du pays, combinant vitesse, vues en hauteur sur la forêt et quelques ponts suspendus.",
    whyVisit: "L'expérience de tyrolienne en forêt la plus reconnue et la plus sécurisée des environs de Chiang Mai.",
    littleTip: "L'activité se combine facilement avec une visite du village de Mae Kampong, tout proche.",
    indicativeDuration: "demi-journée (trajet depuis Chiang Mai : environ 1h)",
  },

  // ---------- Bien-être et spas ----------
  {
    slug: "fah-lanna-spa",
    name: "Fah Lanna Spa",
    zone: "old-city",
    categories: ["bien-etre-spas"],
    lat: 18.7935, lng: 98.9860,
    description: "Un spa installé dans une maison traditionnelle en teck au cœur de la vieille ville, proposant massages thaïlandais, gommages et soins à base d'ingrédients locaux dans un cadre calme et soigné.",
    whyVisit: "Un cadre authentique en maison en teck pour un moment de bien-être dans la vieille ville.",
    littleTip: "Les forfaits combinant gommage et massage sont généralement plus avantageux que les soins à l'unité.",
    indicativeDuration: "1h30 à 2h30",
  },
  {
    slug: "oasis-spa-chiang-mai",
    name: "Oasis Spa Chiang Mai",
    zone: "nimmanhaemin",
    categories: ["bien-etre-spas"],
    lat: 18.8020, lng: 98.9670,
    description: "Une chaîne de spas haut de gamme organisée autour de jardins tropicaux et de salles de soin privatives, avec une carte de massages et de rituels bien-être étendue, réputée pour son niveau de service constant.",
    whyVisit: "Une expérience spa aboutie et fiable, pour qui cherche un haut niveau de confort et de service.",
    littleTip: "Les forfaits demi-journée incluent souvent l'accès au jardin et à une collation — à vérifier en réservant.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "chiang-mai-women-correctional-institution-massage",
    name: "Chiang Mai Women's Correctional Institution — massage",
    zone: "riverside-cm",
    categories: ["bien-etre-spas", "experiences-insolites"],
    lat: 18.7868, lng: 98.9980,
    description: "Un centre de massage traditionnel où les soins sont dispensés par des détenues de la prison pour femmes de Chiang Mai dans le cadre d'un programme de formation professionnelle et de réinsertion, à des tarifs très accessibles.",
    whyVisit: "Un massage traditionnel de qualité qui soutient directement un programme de réinsertion sociale.",
    littleTip: "Les créneaux et jours d'ouverture sont limités par le programme — mieux vaut appeler ou vérifier sur place en amont.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "dheva-spa",
    name: "Dheva Spa",
    zone: "riverside-cm",
    categories: ["bien-etre-spas"],
    lat: 18.7920, lng: 99.0010,
    description: "Un spa au bord de la rivière Ping, associé à un hôtel de charme, proposant des soins thaïlandais traditionnels dans des pavillons privés entourés de jardins, avec vue sur l'eau pour certains soins.",
    whyVisit: "Un cadre riverain apaisant pour un soin thaïlandais traditionnel, à l'écart de l'agitation du centre.",
    littleTip: "Les pavillons avec vue sur la rivière sont en nombre limité — précisez votre préférence en réservant.",
    indicativeDuration: "1h30 à 2h",
  },

  // ---------- Activités en famille ----------
  // Chiang Mai Zoo and Chiang Mai Night Safari intentionally excluded:
  // both are captive-animal parks (zoo enclosures, nocturnal tram viewing
  // of caged wildlife) — not the ethical bar this guide holds animal
  // attractions to. See Chang Chill above for the one elephant experience
  // kept, chosen specifically for its no-feeding, no-bathing policy.
  {
    slug: "grand-canyon-water-park",
    name: "Grand Canyon Water Park",
    zone: "excursions-cm",
    categories: ["activites-famille"],
    lat: 18.7211, lng: 98.9344,
    description: "Un parc aquatique aménagé autour d'une ancienne carrière de pierre remplie d'eau turquoise, avec plongeoirs, structures flottantes et un cadre naturel spectaculaire assez différent d'un parc aquatique classique.",
    whyVisit: "Un cadre naturel inhabituel pour une après-midi rafraîchissante en famille ou entre amis.",
    littleTip: "Les gilets de sécurité sont obligatoires pour la plupart des zones de baignade, parfois fournis sur place.",
    indicativeDuration: "demi-journée",
  },
  {
    slug: "art-in-paradise-chiang-mai",
    name: "Art in Paradise Chiang Mai",
    zone: "nimmanhaemin",
    categories: ["activites-famille", "experiences-insolites"],
    lat: 18.7944, lng: 98.9803,
    description: "Un musée d'illusions optiques en trompe-l'œil où chaque fresque murale en 3D est pensée pour être photographiée, les visiteurs s'intégrant dans la scène peinte — un format ludique très prisé des familles et des amateurs de photo.",
    whyVisit: "Une activité ludique et photogénique adaptée à tous les âges, pour varier des visites de temples.",
    littleTip: "Prévoyez un peu de temps devant chaque fresque pour trouver le bon angle de photo — certaines illusions demandent un essai.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "x-centre-chiang-mai",
    name: "X Centre Chiang Mai",
    zone: "excursions-cm",
    categories: ["activites-famille", "experiences-insolites"],
    lat: 18.9522, lng: 98.9433,
    description: "Un parc d'activités d'aventure près de Mae Rim combinant tyroliennes, parcours dans les arbres et autres activités à sensation, pensé comme une sortie active pour familles et groupes sur une demi-journée.",
    whyVisit: "Une sortie active et ludique dans la vallée au nord de Chiang Mai, à combiner avec Mon Cham ou Mae Sa.",
    littleTip: "L'activité se combine bien avec une étape à Mon Cham ou dans la vallée de Mae Sa, sur le même axe routier.",
    indicativeDuration: "demi-journée",
  },
];

const ZONE_DEFS = [
  {
    slug: "old-city",
    name: "Vieille Ville (Old City)",
    mapColor: "#a8422c",
    vibeText: "Le cœur historique de Chiang Mai, entouré de ses remparts et de son fossé carré, concentre la plus grande densité de temples de la ville et se parcourt facilement à pied ou à vélo.",
    prosText: "Marchable, dense en temples et en petites adresses, très central pour rayonner vers le reste de la ville.",
    consText: "Circulation dense aux heures de pointe autour des portes ; certaines rues manquent d'ombre en pleine journée.",
    transportText: "Se visite à pied ou à vélo ; songthaews (camionnettes collectives rouges) et tuk-tuks pour les trajets plus longs.",
    nearbyText: "Tha Phae Gate, Wat Chedi Luang, Wat Phra Singh et la majorité des temples historiques sont à distance de marche les uns des autres.",
    profileFitText: "Idéal pour un premier séjour : tout est proche, entre histoire, street food et marchés nocturnes.",
    hotelAdviceText: "Le secteur le plus pratique pour loger sans dépendre des transports, avec un grand choix d'hôtels-boutiques.",
  },
  {
    slug: "nimmanhaemin",
    name: "Nimmanhaemin (Nimman)",
    mapColor: "#3f8ea8",
    vibeText: "Le quartier contemporain et créatif de Chiang Mai, porté par sa jeunesse étudiante et sa scène café, avec des galeries, des boutiques design et une vie nocturne plus discrète que dans la vieille ville.",
    prosText: "Scène café et restaurants parmi les plus intéressantes de la ville, ambiance jeune et créative.",
    consText: "Plus excentré que la vieille ville, nécessite un trajet pour rejoindre les temples historiques.",
    transportText: "Songthaews et applications de VTC locales (Grab) pour rejoindre la vieille ville en 10 à 15 minutes.",
    nearbyText: "One Nimman, Jing Jai Market et plusieurs des meilleurs cafés et restaurants de la ville.",
    profileFitText: "Parfait pour les amateurs de café, de design et de gastronomie, moins pour qui veut tout faire à pied depuis les temples.",
    hotelAdviceText: "Un bon compromis pour qui veut la scène café/restaurant sans être dans le tumulte touristique de la vieille ville.",
  },
  {
    slug: "riverside-cm",
    name: "Bord de la rivière Ping",
    mapColor: "#4a7c59",
    vibeText: "Le quartier historique de Wat Ket et les rives de la rivière Ping, entre marchés traditionnels, restaurants en terrasse et une atmosphère plus locale que touristique.",
    prosText: "Ambiance riveraine agréable en soirée, marchés authentiques, bon équilibre entre calme et vie locale.",
    consText: "Moins concentré en sites que la vieille ville ; nécessite de se déplacer un peu plus entre les points d'intérêt.",
    transportText: "À pied le long du fleuve pour les courtes distances ; songthaew ou Grab pour rejoindre la vieille ville ou Nimman.",
    nearbyText: "Warorot Market, Chiang Mai Night Bazaar et plusieurs restaurants réputés en bord de rivière.",
    profileFitText: "Pour qui apprécie une ambiance plus locale et les dîners au bord de l'eau.",
    hotelAdviceText: "Plusieurs hôtels de charme en bord de rivière, un peu plus calmes que le cœur de la vieille ville.",
  },
  {
    slug: "doi-suthep-nature",
    name: "Doi Suthep et nature environnante",
    mapColor: "#6fae7c",
    vibeText: "Les montagnes et forêts qui surplombent Chiang Mai au nord-ouest, entre temple emblématique, parc national, cascades et points de vue sur la ville.",
    prosText: "Nature accessible en moins d'une heure depuis le centre, points de vue spectaculaires, fraîcheur en altitude.",
    consText: "Nécessite un véhicule (location, songthaew ou excursion organisée) ; certains sites se visitent surtout avec du temps.",
    transportText: "Songthaews partagés ou véhicule privé depuis la vieille ville ; la route grimpe en lacets jusqu'au temple.",
    nearbyText: "Wat Phra That Doi Suthep, le village Hmong de Doi Pui et le zoo de Chiang Mai sont sur le même axe routier.",
    profileFitText: "Pour les amateurs de nature, de randonnée légère et de points de vue, en complément des visites en ville.",
    hotelAdviceText: "Peu d'hébergements sur place — ce secteur se visite en journée depuis un logement en ville.",
  },
  {
    slug: "excursions-cm",
    name: "Excursions depuis Chiang Mai",
    mapColor: "#3457a6",
    vibeText: "Les destinations d'une demi-journée à plusieurs jours accessibles depuis Chiang Mai : montagnes, sanctuaires d'éléphants, villages de thé et petites villes historiques.",
    prosText: "Permet de sortir du cadre urbain et de découvrir la diversité des paysages du nord thaïlandais.",
    consText: "Trajets plus longs, souvent nécessaires en véhicule privé ou via une excursion organisée.",
    transportText: "Location de voiture ou de scooter, songthaew partagé, ou excursion organisée selon la destination.",
    nearbyText: "Ces sites sont dispersés autour de Chiang Mai — à combiner selon la direction (nord, sud, est ou ouest).",
    profileFitText: "Pour qui dispose d'au moins une journée supplémentaire et veut aller au-delà de la ville elle-même.",
    hotelAdviceText: "Pas de logement en ville pour cette zone ; certaines excursions (Pai, Mae Kampong) se prêtent à une nuit sur place.",
  },
];

async function main() {
  console.log("Seeding Chiang Mai destination…");

  const thailand = await prisma.country.upsert({
    where: { slug: "thailande" },
    update: {},
    create: { slug: "thailande", name: "Thaïlande" },
  });

  const chiangMai = await prisma.destination.upsert({
    where: { slug: "chiang-mai" },
    update: { status: "PUBLISHED" },
    create: {
      countryId: thailand.id,
      slug: "chiang-mai",
      name: "Chiang Mai",
      kind: "CITY",
      size: "LARGE",
      status: "PUBLISHED",
    },
  });

  // No per-destination Price row to seed here: pricing is driven by live
  // published-place count (see PLACE_COUNT_TIERS in src/lib/pricing.ts),
  // not a fixed SMALL/LARGE field — the four shared tier rows come from
  // prisma/seed.ts.

  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const ENABLED_CATEGORIES = [
    "incontournables", "temples-patrimoine", "quartiers-balades", "experiences-insolites",
    "activites-famille", "restaurants", "street-food", "cafes-brunchs", "bars-rooftops",
    "marches", "shopping", "excursions", "bien-etre-spas", "points-de-vue",
  ];
  await prisma.destination.update({
    where: { id: chiangMai.id },
    data: {
      categories: {
        connect: ENABLED_CATEGORIES.map((slug) => ({ id: categoryBySlug.get(slug)!.id })),
      },
    },
  });

  const zoneBySlug = new Map<string, { id: string }>();
  for (const z of ZONE_DEFS) {
    const zone = await prisma.zone.upsert({
      where: { destinationId_slug: { destinationId: chiangMai.id, slug: z.slug } },
      update: {
        name: z.name, mapColor: z.mapColor, vibeText: z.vibeText, prosText: z.prosText,
        consText: z.consText, transportText: z.transportText, nearbyText: z.nearbyText,
        profileFitText: z.profileFitText, hotelAdviceText: z.hotelAdviceText,
      },
      create: { destinationId: chiangMai.id, ...z },
    });
    zoneBySlug.set(z.slug, zone);
  }

  const manifest1: PhotoManifestEntry[] = JSON.parse(
    await readFile(`${SCRATCH}/photos_cm1/manifest.json`, "utf-8").catch(() => "[]"),
  );
  const manifest2: PhotoManifestEntry[] = JSON.parse(
    await readFile(`${SCRATCH}/photos_cm2/manifest.json`, "utf-8").catch(() => "[]"),
  );
  const manifest = [...manifest1, ...manifest2];

  let photoCount = 0;
  for (const def of PLACES) {
    let photoId: string | null = null;
    if (def.photoKey && GOOD_KEYS.has(def.photoKey)) {
      const entry = manifest.find((m) => m.key === def.photoKey && m.found && m.local_path);
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
        name: def.name, destinationId: chiangMai.id, zoneId: zone?.id, status: "PUBLISHED",
        lat: def.lat, lng: def.lng, description: def.description, whyVisit: def.whyVisit,
        littleTip: def.littleTip, indicativeDuration: def.indicativeDuration, isFictionalDemo: false,
      },
      create: {
        slug: def.slug, destinationId: chiangMai.id, zoneId: zone?.id, name: def.name,
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
    await prisma.placePhoto.deleteMany({ where: { placeId: place.id } });
    if (photoId) await prisma.placePhoto.create({ data: { placeId: place.id, photoId, sortOrder: 0 } });

    console.log("  place:", def.name);
  }

  console.log(`Chiang Mai seed complete: ${PLACES.length} places, ${photoCount} with real photos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
