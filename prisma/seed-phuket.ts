/**
 * Phuket — third destination, built via the admin "Nouvelle destination"
 * request queue (destinationRequest id cmvleuy9z000129cdmeal2bef). Same
 * method as Bangkok/Chiang Mai: real places, real coordinates, Wikimedia
 * Commons photos only when a genuine match exists.
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

// Sanity-checked matches only (wrong-subject/wrong-city/non-photo files
// dropped), same policy as every earlier wave.
const GOOD_KEYS = new Set<string>([
  "big-buddha-phuket",
  "wat-chalong",
  "promthep-cape",
  "nai-harn-beach",
  "baba-nest-sripanwa",
  "phuket-old-town",
  "thai-hua-museum",
  "phuket-weekend-market-naka",
  "patong-beach",
  "jungceylon",
  "simon-cabaret",
  "kata-beach",
  "karon-beach",
  "freedom-beach",
  "kamala-beach",
  "wat-phra-thong",
  "sirinat-national-park-nai-yang",
  "thanyapura",
  "koh-similan",
  "koh-yao-noi",
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
  // ---------- Rawai / Nai Harn / Cap Promthep ----------
  {
    slug: "big-buddha-phuket",
    name: "Big Buddha Phuket",
    zone: "rawai-nai-harn",
    categories: ["incontournables", "temples-patrimoine", "points-de-vue"],
    lat: 7.8278, lng: 98.3119,
    description: "Une statue de Bouddha assis de 45 mètres de haut, en marbre blanc birman, érigée au sommet du Nakkerd Hills. Visible depuis une grande partie du sud de l'île, le site offre un panorama à 360° sur Chalong, Kata et Karon.",
    whyVisit: "Le point de vue et le monument religieux les plus emblématiques du sud de Phuket.",
    littleTip: "Une tenue couvrant épaules et genoux est demandée pour accéder à la plateforme autour de la statue.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "wat-chalong",
    name: "Wat Chalong",
    zone: "rawai-nai-harn",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 7.8456, lng: 98.3375,
    description: "Le plus grand et le plus vénéré des temples bouddhistes de Phuket, connu pour son chedi doré à plusieurs étages contenant un fragment d'os du Bouddha, et pour les statues commémorant deux moines guérisseurs très respectés sur l'île.",
    whyVisit: "Le temple le plus important de Phuket, riche en légendes locales et en détails architecturaux.",
    littleTip: "Montez jusqu'au sommet du chedi doré : les étages supérieurs sont peints de fresques moins visitées que le rez-de-chaussée.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "promthep-cape",
    name: "Laem Promthep (Cap Promthep)",
    zone: "rawai-nai-harn",
    categories: ["incontournables", "points-de-vue"],
    lat: 7.7633, lng: 98.2958,
    description: "La pointe la plus méridionale de Phuket, un promontoire rocheux où se rassemblent chaque soir visiteurs et habitants pour admirer le coucher de soleil sur la mer d'Andaman, avec un petit phare et un sanctuaire dédié à Brahma.",
    whyVisit: "Le point de vue sur le coucher de soleil le plus célèbre de l'île.",
    littleTip: "Arrivez environ 45 minutes avant le coucher du soleil : le parking et les meilleurs points de vue se remplissent vite.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "nai-harn-beach",
    name: "Nai Harn Beach",
    zone: "rawai-nai-harn",
    categories: ["incontournables", "quartiers-balades"],
    lat: 7.7769, lng: 98.3042,
    description: "Une plage au sable fin bordée d'un lagon et d'un lac d'eau douce, considérée par beaucoup comme l'une des plus belles de Phuket, nettement moins bâtie que Patong ou Karon malgré sa proximité avec le Cap Promthep.",
    whyVisit: "Une des plages les plus préservées et élégantes de Phuket, idéale pour nager.",
    littleTip: "La houle est plus forte pendant la mousson (mai à octobre) — préférez la baignade en saison sèche.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "rawai-seafood-market",
    name: "Marché aux poissons de Rawai",
    zone: "rawai-nai-harn",
    categories: ["marches", "restaurants", "street-food"],
    lat: 7.7783, lng: 98.3200,
    description: "Un marché aux poissons animé en bord de mer où l'on choisit soi-même poissons, crustacés et coquillages frais auprès des étals, avant de les faire cuisiner sur place dans l'un des restaurants attenants.",
    whyVisit: "Une façon simple et conviviale de manger du poisson très frais pour le prix du marché.",
    littleTip: "Négociez le prix du poisson au marché avant de le confier au restaurant, qui facture ensuite seulement la préparation.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "baba-nest-sripanwa",
    name: "Baba Nest (Sri Panwa)",
    zone: "rawai-nai-harn",
    categories: ["bars-rooftops", "points-de-vue"],
    lat: 7.8167, lng: 98.3833,
    description: "Un bar perché au sommet du resort Sri Panwa, à la pointe sud-est de Phuket, offrant une vue panoramique à 360° sur la mer d'Andaman et la baie de Chalong, particulièrement recherché au coucher du soleil.",
    whyVisit: "L'un des rooftops les plus spectaculaires de Phuket, pour un coucher de soleil avec vue dégagée sur la mer.",
    littleTip: "Une tenue correcte (pas de maillot de bain) et une réservation à l'avance sont généralement nécessaires.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "tunk-ka-cafe",
    name: "Tunk Ka Café",
    zone: "rawai-nai-harn",
    categories: ["cafes-brunchs", "points-de-vue"],
    lat: 7.8310, lng: 98.3080,
    description: "Un café perché sur les hauteurs près du Big Buddha, aménagé en terrasses dans la végétation, avec une vue dégagée sur les collines et la mer environnantes — une pause fraîcheur bienvenue après la montée au Big Buddha.",
    whyVisit: "Une pause avec vue agréable à combiner directement avec la visite du Big Buddha, à proximité immédiate.",
    littleTip: "Les tables en terrasse extérieure offrent la meilleure vue, mieux vaut y aller en dehors de l'heure du déjeuner.",
    indicativeDuration: "45 min",
  },
  {
    slug: "mor-mu-dong",
    name: "Mor Mu Dong",
    zone: "rawai-nai-harn",
    categories: ["restaurants", "street-food"],
    lat: 7.8450, lng: 98.3300,
    description: "Une adresse locale réputée pour le mu dong, une spécialité de porc grillé mariné typique du sud de la Thaïlande, servie avec du riz gluant et une sauce épicée, dans un cadre simple fréquenté surtout par les habitants.",
    whyVisit: "Une spécialité régionale du sud thaïlandais, loin des restaurants les plus touristiques.",
    littleTip: "Le porc grillé se vend souvent jusqu'à épuisement du stock du jour — mieux vaut y aller tôt.",
    indicativeDuration: "30 à 45 min",
  },

  // ---------- Vieille ville de Phuket ----------
  {
    slug: "phuket-old-town",
    name: "Vieille ville de Phuket (Old Town)",
    zone: "phuket-town",
    categories: ["incontournables", "quartiers-balades"],
    lat: 7.8833, lng: 98.3900,
    description: "Le cœur historique de la ville de Phuket, avec ses rangées de shophouses sino-portugaises colorées héritées de l'essor de l'industrie de l'étain au 19e siècle, aujourd'hui transformées en cafés, galeries et boutiques.",
    whyVisit: "L'architecture la plus singulière de Phuket, très différente de l'image \"plage et bord de mer\" de l'île.",
    littleTip: "Thalang Road et Soi Romanee concentrent les façades les plus photogéniques — à parcourir à pied, idéalement en matinée.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "soi-romanee",
    name: "Soi Romanee",
    zone: "phuket-town",
    categories: ["quartiers-balades", "experiences-insolites"],
    lat: 7.8838, lng: 98.3895,
    description: "La ruelle la plus photographiée de la vieille ville de Phuket, bordée de façades sino-portugaises pastel restaurées, autrefois un quartier de maisons closes à l'époque de l'essor minier de l'île.",
    whyVisit: "La ruelle la plus pittoresque de la vieille ville, incontournable pour les photos d'architecture.",
    littleTip: "La rue est courte mais très fréquentée en journée — une visite tôt le matin évite la foule des photographes.",
    indicativeDuration: "20 à 30 min",
  },
  {
    slug: "chinpracha-house",
    name: "Chinpracha House",
    zone: "phuket-town",
    categories: ["temples-patrimoine"],
    lat: 7.8842, lng: 98.3882,
    description: "Une demeure sino-portugaise ancienne ouverte à la visite, meublée dans le style d'une riche famille de marchands de l'étain du début du 20e siècle, avec sa cour intérieure caractéristique de l'architecture coloniale locale.",
    whyVisit: "La meilleure façon de voir l'intérieur d'une demeure sino-portugaise d'époque plutôt que seulement ses façades.",
    littleTip: "La maison sert parfois de décor pour des tournages de films — vérifiez les horaires d'ouverture avant de vous déplacer.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "thai-hua-museum",
    name: "Thai Hua Museum",
    zone: "phuket-town",
    categories: ["temples-patrimoine"],
    lat: 7.8846, lng: 98.3889,
    description: "Une ancienne école chinoise de 1934 reconvertie en musée, qui retrace l'histoire des communautés chinoises venues travailler dans les mines d'étain et raconte la naissance du style architectural sino-portugais de Phuket.",
    whyVisit: "Le meilleur endroit pour comprendre l'histoire minière et chinoise qui a façonné la vieille ville.",
    littleTip: "Le bâtiment lui-même, avec sa façade Art déco, vaut le détour même sans entrer dans les salles d'exposition.",
    indicativeDuration: "45 min",
  },
  {
    slug: "lard-yai-sunday-walking-street",
    name: "Lard Yai (Sunday Walking Street)",
    zone: "phuket-town",
    categories: ["marches", "street-food", "incontournables"],
    lat: 7.8838, lng: 98.3903,
    description: "Le marché piéton du dimanche soir qui anime Thalang Road et les rues voisines de la vieille ville, avec artisanat local, musique live et une large offre de street food, dans le cadre des façades sino-portugaises illuminées.",
    whyVisit: "Le meilleur moment pour vivre la vieille ville de Phuket animée, en soirée et en musique.",
    littleTip: "N'a lieu que le dimanche soir — à caler en priorité dans votre itinéraire si votre séjour inclut un dimanche.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "khao-rang-hill",
    name: "Khao Rang Hill (Rang Hill)",
    zone: "phuket-town",
    categories: ["points-de-vue", "quartiers-balades"],
    lat: 7.8903, lng: 98.3836,
    description: "Une colline boisée surplombant la ville de Phuket, aménagée en parc avec plusieurs points de vue sur la vieille ville, le port et les collines environnantes — un lieu de promenade et de sport apprécié des habitants.",
    whyVisit: "Le meilleur point de vue sur la ville de Phuket elle-même, moins touristique que les points de vue du sud de l'île.",
    littleTip: "Plusieurs petits restaurants en plein air au sommet sont parfaits pour un dîner avec vue sur la ville illuminée.",
    indicativeDuration: "1h",
  },
  {
    slug: "raya-restaurant",
    name: "Raya Restaurant",
    zone: "phuket-town",
    categories: ["restaurants"],
    lat: 7.8841, lng: 98.3886,
    description: "Un restaurant installé dans une ancienne demeure sino-portugaise de la vieille ville, réputé pour sa cuisine thaïlandaise du sud authentique, notamment son curry au crabe, et fréquenté aussi bien par les habitants que par les visiteurs.",
    whyVisit: "L'une des tables les plus réputées de la vieille ville pour la cuisine du sud thaïlandais, dans un cadre historique.",
    littleTip: "Le curry au crabe (poo phad pong kari) est le plat signature de la maison — à réserver si vous venez en groupe.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "kopitiam-by-wilai",
    name: "Kopitiam by Wilai",
    zone: "phuket-town",
    categories: ["restaurants", "cafes-brunchs"],
    lat: 7.8833, lng: 98.3886,
    description: "Un restaurant-café dans la vieille ville qui revisite les recettes peranakan et sino-phuketoises traditionnelles, dans un décor vintage évoquant les kopitiam (cafés chinois) historiques de la région.",
    whyVisit: "Une cuisine locale peranakan peu représentée ailleurs, dans un cadre qui raconte l'histoire du quartier.",
    littleTip: "Le hokkien mee (nouilles sautées) et le o-aew (dessert local) sont deux spécialités à ne pas manquer.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "blue-elephant-phuket",
    name: "Blue Elephant Phuket",
    zone: "phuket-town",
    categories: ["restaurants"],
    lat: 7.8847, lng: 98.3881,
    description: "Un restaurant gastronomique thaïlandais installé dans l'ancien manoir du gouverneur de Phuket, bâtiment sino-portugais emblématique datant de 1903, qui propose aussi des cours de cuisine dans ses jardins.",
    whyVisit: "Le cadre architectural le plus prestigieux parmi les restaurants de la vieille ville.",
    littleTip: "Le déjeuner, moins cher que le dîner, permet de découvrir le lieu et la cuisine à moindre coût.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "phuket-butterfly-garden",
    name: "Phuket Butterfly Garden",
    zone: "phuket-town",
    categories: ["activites-famille"],
    lat: 7.8858, lng: 98.3978,
    description: "Un jardin couvert abritant plusieurs centaines de papillons de dizaines d'espèces différentes en semi-liberté, accompagné d'un petit aquarium et de présentations sur le cycle de vie des papillons.",
    whyVisit: "Une activité familiale tranquille et éducative, agréable aux heures chaudes de la journée.",
    littleTip: "La première heure après l'ouverture est généralement la plus calme pour observer les papillons.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "chillva-market",
    name: "Chillva Market",
    zone: "phuket-town",
    categories: ["marches", "street-food", "bars-rooftops"],
    lat: 7.8961, lng: 98.3673,
    description: "Un marché nocturne construit en conteneurs maritimes recyclés, pensé pour une clientèle jeune et locale, avec food trucks, bars en plein air et ambiance musicale décontractée, loin de l'atmosphère très touristique de Patong.",
    whyVisit: "Un marché nocturne local et créatif, pour voir une facette plus contemporaine de Phuket.",
    littleTip: "Ouvert uniquement en soirée — une bonne option pour dîner de façon informelle entre deux visites de temples.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "phuket-weekend-market-naka",
    name: "Phuket Weekend Market (Naka Market)",
    zone: "phuket-town",
    categories: ["marches", "street-food"],
    lat: 7.8750, lng: 98.3800,
    description: "Le grand marché hebdomadaire de Phuket, le week-end, mêlant produits frais, artisanat, vêtements et une vaste offre de street food, fréquenté très majoritairement par les habitants plutôt que par les touristes.",
    whyVisit: "Le marché le plus authentique et le moins touristique de l'île pour un week-end sur Phuket.",
    littleTip: "Le marché est immense — comptez large et venez l'estomac vide pour goûter un maximum de spécialités.",
    indicativeDuration: "1h30 à 2h",
  },

  // ---------- Patong ----------
  {
    slug: "patong-beach",
    name: "Patong Beach",
    zone: "patong",
    categories: ["incontournables"],
    lat: 7.8966, lng: 98.2960,
    description: "La plage la plus fréquentée et la plus développée de Phuket, bordée d'hôtels, de restaurants et de sports nautiques, au cœur du quartier touristique et nocturne le plus animé de l'île.",
    whyVisit: "Le point de repère incontournable de Phuket pour qui cherche l'ambiance balnéaire la plus animée.",
    littleTip: "Pour une baignade plus calme, les extrémités nord et sud de la plage sont nettement moins fréquentées que le centre.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "bangla-road",
    name: "Bangla Road",
    zone: "patong",
    categories: ["bars-rooftops", "experiences-insolites"],
    lat: 7.8958, lng: 98.2965,
    description: "La rue piétonne la plus connue de Phuket après la tombée de la nuit, saturée de bars, de néons et de musique, cœur de la vie nocturne de Patong — une expérience assumée, à vivre une fois plus pour l'ambiance que pour la tranquillité.",
    whyVisit: "La rue de vie nocturne la plus emblématique de Phuket, unique en son genre.",
    littleTip: "L'ambiance démarre vraiment après 22h — prévoyez de la monnaie en liquide pour les petites échoppes.",
    indicativeDuration: "1h30 et plus",
  },
  {
    slug: "jungceylon",
    name: "Jungceylon",
    zone: "patong",
    categories: ["shopping"],
    lat: 7.8945, lng: 98.2967,
    description: "Le plus grand centre commercial de Patong, regroupant enseignes internationales, cinéma et restaurants climatisés, à deux pas de la plage et de Bangla Road.",
    whyVisit: "L'option shopping climatisée la plus pratique du secteur de Patong.",
    littleTip: "Pratique pour une pause fraîcheur en pleine journée entre deux sessions plage.",
    indicativeDuration: "1h",
  },
  {
    slug: "banzaan-fresh-market",
    name: "Banzaan Fresh Market",
    zone: "patong",
    categories: ["marches", "street-food"],
    lat: 7.8937, lng: 98.2964,
    description: "Un marché couvert au cœur de Patong, avec un rez-de-chaussée de produits frais et un étage de stands de cuisine de rue où l'on peut faire préparer directement le poisson acheté en bas, à prix local.",
    whyVisit: "Une alternative pratique et locale pour manger du poisson frais sans sortir du centre de Patong.",
    littleTip: "Vérifiez le prix affiché avant de commander — certains stands pratiquent des tarifs plus élevés pour les touristes.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "illuzion-nightclub",
    name: "Illuzion",
    zone: "patong",
    categories: ["bars-rooftops"],
    lat: 7.8954, lng: 98.2963,
    description: "L'une des plus grandes discothèques de Phuket, connue pour ses spectacles et ses décors changeants, au bout de Bangla Road — un rendez-vous classique pour qui prolonge la soirée après les bars de rue.",
    whyVisit: "La boîte de nuit la plus connue de Patong pour prolonger la soirée après Bangla Road.",
    littleTip: "L'entrée est généralement payante mais inclut souvent une boisson — l'ambiance monte surtout après minuit.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "suay-restaurant",
    name: "Suay Restaurant",
    zone: "patong",
    categories: ["restaurants"],
    lat: 7.8946, lng: 98.2970,
    description: "Un restaurant thaïlandais contemporain à Patong, apprécié pour une cuisine soignée qui revisite les classiques thaïlandais dans un cadre élégant, loin de l'agitation de Bangla Road toute proche.",
    whyVisit: "Une cuisine thaïlandaise plus raffinée, pour sortir des adresses les plus touristiques de Patong.",
    littleTip: "Réservez en soirée, surtout en haute saison — le lieu est assez prisé des visiteurs avertis.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "simon-cabaret",
    name: "Simon Cabaret",
    zone: "patong",
    categories: ["experiences-insolites"],
    lat: 7.8900, lng: 98.2980,
    description: "Un spectacle de cabaret thaïlandais mettant en scène des artistes transgenres, mêlant danse, costumes spectaculaires et numéros musicaux, l'un des plus anciens et des plus connus de ce type en Thaïlande.",
    whyVisit: "Un classique du divertissement nocturne à Phuket, accessible même sans connaître le thaï.",
    littleTip: "Réservez à l'avance en haute saison et arrivez un peu en avance pour profiter du hall d'entrée, lui aussi très mis en scène.",
    indicativeDuration: "1h",
  },
  {
    slug: "phuket-trickeye-museum",
    name: "Phuket Trickeye Museum",
    zone: "patong",
    categories: ["activites-famille", "experiences-insolites"],
    lat: 7.8870, lng: 98.2900,
    description: "Un musée d'illusions optiques en trompe-l'œil où chaque fresque est pensée pour être photographiée, les visiteurs s'intégrant dans la scène peinte — un format ludique apprécié des familles et des amateurs de photo.",
    whyVisit: "Une activité ludique et ultra photogénique, pour varier des plages et des temples.",
    littleTip: "Prévoyez un peu de temps devant chaque fresque pour trouver le bon angle de photo.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "oasis-spa-phuket",
    name: "Oasis Spa Phuket",
    zone: "patong",
    categories: ["bien-etre-spas"],
    lat: 7.8920, lng: 98.2955,
    description: "Une chaîne de spas haut de gamme organisée autour de jardins tropicaux et de salles de soin privatives, avec une large carte de massages et de rituels bien-être, réputée pour son niveau de service constant.",
    whyVisit: "Une expérience spa aboutie et fiable, pour qui cherche un haut niveau de confort après une journée de plage.",
    littleTip: "Les forfaits demi-journée incluent souvent l'accès au jardin et à une collation — à vérifier en réservant.",
    indicativeDuration: "2h à 3h",
  },

  // ---------- Kata / Karon ----------
  {
    slug: "kata-beach",
    name: "Kata Beach",
    zone: "kata-karon",
    categories: ["incontournables"],
    lat: 7.8198, lng: 98.2975,
    description: "Une plage en forme de croissant, plus familiale et plus calme que Patong, bordée de restaurants et de petits hôtels, réputée pour son bon spot de surf en saison de mousson (mai à octobre).",
    whyVisit: "Un bon compromis entre ambiance balnéaire animée et atmosphère nettement plus détendue que Patong.",
    littleTip: "La saison de mousson (mai-octobre) y attire les surfeurs débutants grâce à des vagues modérées.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "karon-beach",
    name: "Karon Beach",
    zone: "kata-karon",
    categories: ["incontournables"],
    lat: 7.8440, lng: 98.2941,
    description: "L'une des plus longues plages de Phuket, large bande de sable blanc bordée d'une promenade, avec une ambiance plus résidentielle et familiale que Patong, malgré une offre hôtelière importante.",
    whyVisit: "Une grande plage spacieuse, moins dense que Patong, adaptée aux familles.",
    littleTip: "La partie sud de la plage, près du rond-point, est généralement plus calme que le centre.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "karon-viewpoint",
    name: "Karon Viewpoint (Point de vue des trois plages)",
    zone: "kata-karon",
    categories: ["points-de-vue", "incontournables"],
    lat: 7.8339, lng: 98.2932,
    description: "Un point de vue en hauteur sur la route reliant Kata et Nai Harn, offrant une vue simultanée sur les trois plages de Kata Noi, Kata et Karon — l'un des panoramas les plus photographiés du sud de Phuket.",
    whyVisit: "La vue la plus complète sur les plages du sud-ouest de Phuket, en un seul arrêt.",
    littleTip: "La lumière de fin d'après-midi met particulièrement bien en valeur les trois baies.",
    indicativeDuration: "20 à 30 min",
  },
  {
    slug: "freedom-beach",
    name: "Freedom Beach",
    zone: "kata-karon",
    categories: ["quartiers-balades"],
    lat: 7.8703, lng: 98.2831,
    description: "Une petite plage isolée accessible uniquement par bateau depuis Patong ou par un sentier de randonnée, au sable fin et à l'eau turquoise, nettement plus tranquille que les plages principales de Phuket.",
    whyVisit: "Une plage préservée et plus sauvage, pour qui veut s'éloigner un peu des plages principales.",
    littleTip: "Les bateaux-taxis depuis Patong Beach sont l'option la plus simple pour s'y rendre.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "wat-suwan-khiri-khet",
    name: "Wat Suwan Khiri Khet",
    zone: "kata-karon",
    categories: ["temples-patrimoine"],
    lat: 7.8441, lng: 98.2969,
    description: "Le temple bouddhiste principal du quartier de Karon, moins visité que les grands temples touristiques de l'île, offrant un aperçu de la vie religieuse locale loin de l'agitation côtière.",
    whyVisit: "Un temple de quartier authentique, pour qui loge du côté de Karon.",
    littleTip: "Une bonne étape tranquille en fin de journée, avant de rejoindre la plage pour le coucher du soleil.",
    indicativeDuration: "20 à 30 min",
  },
  {
    slug: "the-sense-spa-kata",
    name: "The Sense Spa",
    zone: "kata-karon",
    categories: ["bien-etre-spas"],
    lat: 7.8200, lng: 98.2960,
    description: "Un spa niché dans les collines au-dessus de Kata, aménagé en pavillons ouverts sur la végétation tropicale, avec une vue partielle sur la mer depuis certaines salles de soin.",
    whyVisit: "Un cadre naturel et surélevé, pour un soin avec un peu de hauteur sur la baie de Kata.",
    littleTip: "Les soins en fin d'après-midi permettent souvent de profiter de la lumière du coucher de soleil depuis les pavillons.",
    indicativeDuration: "1h30 à 2h",
  },

  // ---------- Kamala / Surin / Bang Tao ----------
  {
    slug: "kamala-beach",
    name: "Kamala Beach",
    zone: "kamala-surin-bang-tao",
    categories: ["incontournables", "quartiers-balades"],
    lat: 7.9519, lng: 98.2814,
    description: "Une plage plus tranquille que Patong ou Karon, prisée des familles et des résidents étrangers installés à Phuket, bordée de petits restaurants plutôt que de grands complexes hôteliers.",
    whyVisit: "Une plage résidentielle et paisible, pour qui cherche à éviter l'agitation du sud de l'île.",
    littleTip: "L'extrémité nord de la plage, près des rochers, est la plus calme pour nager.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "surin-beach",
    name: "Surin Beach",
    zone: "kamala-surin-bang-tao",
    categories: ["quartiers-balades"],
    lat: 7.9739, lng: 98.2812,
    description: "Une plage élégante bordée de restaurants de plage haut de gamme, surnommée parfois la \"Riviera de Phuket\" pour son ambiance plus feutrée que les plages du sud de l'île.",
    whyVisit: "Une ambiance plage plus chic, pour un déjeuner ou un coucher de soleil soigné en bord de mer.",
    littleTip: "Les restaurants de plage avec transats proposent souvent un accès gratuit en échange d'une consommation.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "bang-tao-beach",
    name: "Bang Tao Beach",
    zone: "kamala-surin-bang-tao",
    categories: ["incontournables", "quartiers-balades"],
    lat: 7.9906, lng: 98.2944,
    description: "Une plage de plusieurs kilomètres bordée au nord par la zone de resorts et de lagons de Laguna Phuket, offrant à la fois de grands espaces tranquilles et une offre de restaurants et de bars de plage.",
    whyVisit: "L'une des plus longues et des plus spacieuses plages de l'île, avec une offre de restauration soignée.",
    littleTip: "Le secteur Laguna, au nord de la plage, concentre la majorité des bars et restaurants de plage.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "catch-beach-club",
    name: "Catch Beach Club",
    zone: "kamala-surin-bang-tao",
    categories: ["bars-rooftops"],
    lat: 7.9906, lng: 98.2938,
    description: "Un beach club animé sur Bang Tao, avec piscine, transats et programmation musicale, particulièrement couru en fin d'après-midi et en soirée pour une ambiance festive en bord de plage.",
    whyVisit: "L'un des beach clubs les plus animés de Phuket pour une après-midi festive en bord de mer.",
    littleTip: "Réserver un lit de plage à l'avance évite de se retrouver sans place aux heures de pointe du week-end.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "phuket-fantasea",
    name: "Phuket FantaSea",
    zone: "kamala-surin-bang-tao",
    categories: ["experiences-insolites", "activites-famille"],
    lat: 7.9736, lng: 98.3034,
    description: "Un grand parc à thème culturel près de Kamala, construit autour d'un spectacle nocturne mêlant effets spéciaux, animaux et légendes thaïlandaises, accompagné d'un marché artisanal et de restaurants.",
    whyVisit: "Un spectacle à grand spectacle sur la culture thaïlandaise, pensé pour toute la famille.",
    littleTip: "Le parc propose généralement un dîner-buffet avant le spectacle — vérifiez si cette formule est incluse dans votre billet.",
    indicativeDuration: "3h à 4h",
  },
  {
    slug: "black-rock-viewpoint",
    name: "Black Rock Viewpoint",
    zone: "kamala-surin-bang-tao",
    categories: ["points-de-vue"],
    lat: 7.9560, lng: 98.2790,
    description: "Un point de vue plus confidentiel entre Kamala et Surin, sur un promontoire rocheux offrant une vue dégagée sur la côte ouest de Phuket, apprécié des photographes pour sa relative tranquillité.",
    whyVisit: "Un point de vue moins fréquenté que Promthep Cape, pour un coucher de soleil plus intimiste.",
    littleTip: "L'accès se fait par un petit sentier depuis la route côtière — prévoir des chaussures fermées.",
    indicativeDuration: "30 à 45 min",
  },

  // ---------- Thalang / Nord de l'île ----------
  {
    slug: "wat-phra-thong",
    name: "Wat Phra Thong",
    zone: "thalang-nord",
    categories: ["temples-patrimoine"],
    lat: 8.0642, lng: 98.3283,
    description: "Un temple abritant une statue de Bouddha à demi enterrée dans le sol, selon la légende impossible à déterrer entièrement sans provoquer de malheur — l'un des temples les plus singuliers et les plus anciens de Phuket.",
    whyVisit: "Un temple à la légende unique en Thaïlande, loin des circuits touristiques du sud de l'île.",
    littleTip: "Le temple est assez excentré, dans le district de Thalang — à combiner avec une visite du nord de l'île.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "khao-phra-thaeo-gibbon",
    name: "Gibbon Rehabilitation Project (Khao Phra Thaeo)",
    zone: "thalang-nord",
    categories: ["experiences-insolites", "activites-famille"],
    lat: 7.9850, lng: 98.3700,
    description: "Un centre de réhabilitation à but non lucratif qui recueille des gibbons retirés du commerce illégal d'animaux ou du tourisme, dans le dernier massif de forêt tropicale primaire de Phuket, en vue de leur réintroduction en milieu naturel.",
    whyVisit: "Une rencontre éthique avec des gibbons, portée par une véritable démarche de conservation plutôt que de divertissement.",
    littleTip: "L'entrée est gratuite mais fonctionne par donation — c'est ce qui finance directement les soins et la réintroduction des animaux.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "ton-sai-waterfall",
    name: "Cascade de Ton Sai",
    zone: "thalang-nord",
    categories: ["quartiers-balades", "activites-famille"],
    lat: 7.9870, lng: 98.3680,
    description: "Une cascade au cœur du parc forestier de Khao Phra Thaeo, dans le dernier vestige de forêt tropicale primaire de Phuket, plus spectaculaire pendant la saison des pluies (juin à novembre) que le reste de l'année.",
    whyVisit: "Une immersion dans la forêt tropicale originelle de Phuket, rare sur une île très urbanisée.",
    littleTip: "Le débit varie beaucoup selon la saison — la cascade est à son maximum entre septembre et novembre.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "splash-jungle-waterpark",
    name: "Splash Jungle Waterpark",
    zone: "thalang-nord",
    categories: ["activites-famille"],
    lat: 8.0269, lng: 98.3144,
    description: "Un parc aquatique familial dans le nord de Phuket, avec toboggans, piscine à vagues et rivière paresseuse, aménagé dans un cadre tropical verdoyant.",
    whyVisit: "La sortie parc aquatique classique de Phuket, pour une journée rafraîchissante en famille.",
    littleTip: "Les casiers et serviettes sont généralement payants en supplément — prévoyez votre propre serviette si possible.",
    indicativeDuration: "demi-journée",
  },
  {
    slug: "sirinat-national-park-nai-yang",
    name: "Sirinat National Park (Nai Yang Beach)",
    zone: "thalang-nord",
    categories: ["quartiers-balades", "incontournables"],
    lat: 8.1100, lng: 98.2967,
    description: "Un parc national côtier près de l'aéroport, englobant la plage de Nai Yang bordée de pins, une forêt littorale préservée et un site de ponte de tortues marines protégé entre novembre et février.",
    whyVisit: "La plage la plus préservée et la moins bâtie de Phuket, idéale pour une sortie nature.",
    littleTip: "La plage est pratique pour une dernière baignade juste avant un vol, vu sa proximité avec l'aéroport.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "thanyapura",
    name: "Thanyapura",
    zone: "thalang-nord",
    categories: ["bien-etre-spas"],
    lat: 7.9397, lng: 98.3433,
    description: "Un centre de bien-être et de sport haut de gamme dans le nord de Phuket, mêlant installations sportives professionnelles, spa et cuisine saine, fréquenté aussi bien par des sportifs en stage que par des visiteurs en quête de bien-être.",
    whyVisit: "Une offre bien-être plus complète qu'un simple spa, pour qui veut combiner sport et détente.",
    littleTip: "Les soins et la salle de sport sont accessibles à la journée, sans réservation de séjour complet.",
    indicativeDuration: "2h et plus",
  },

  // ---------- Excursions depuis Phuket ----------
  {
    slug: "phang-nga-bay-james-bond-island",
    name: "Baie de Phang Nga (Koh Tapu / James Bond Island)",
    zone: "excursions-phuket",
    categories: ["excursions", "points-de-vue"],
    lat: 8.2833, lng: 98.5000,
    description: "Une baie spectaculaire de formations karstiques émergeant d'une mer calme, rendue célèbre par le film de James Bond \"L'Homme au pistolet d'or\" tourné sur l'îlot de Koh Tapu, et explorée en bateau ou en canoë à travers des grottes marines.",
    whyVisit: "Le paysage de karst le plus spectaculaire accessible en excursion depuis Phuket.",
    littleTip: "Les excursions en petit groupe en canoë permettent d'explorer les grottes marines (hongs), inaccessibles aux grands bateaux.",
    indicativeDuration: "journée complète",
  },
  {
    slug: "koh-racha",
    name: "Koh Racha (Raya Island)",
    zone: "excursions-phuket",
    categories: ["excursions", "quartiers-balades"],
    lat: 7.6000, lng: 98.3667,
    description: "Une petite île au sud de Phuket réputée pour ses eaux turquoise exceptionnellement claires et ses spots de snorkeling et de plongée, avec nettement moins d'infrastructures que les îles plus connues comme Phi Phi.",
    whyVisit: "L'une des meilleures excursions snorkeling à la journée depuis Phuket, avec une eau très claire.",
    littleTip: "L'île se visite bien en demi-journée en speedboat, ce qui laisse du temps pour une autre activité le même jour.",
    indicativeDuration: "demi-journée à journée complète",
  },
  {
    slug: "koh-similan",
    name: "Îles Similan",
    zone: "excursions-phuket",
    categories: ["excursions", "points-de-vue"],
    lat: 8.6500, lng: 97.6500,
    description: "Un archipel de neuf îles granitiques classé parc national, considéré comme l'un des meilleurs sites de plongée de Thaïlande pour la clarté de son eau et la richesse de ses fonds marins, accessible uniquement de mi-octobre à mi-mai.",
    whyVisit: "L'une des meilleures destinations de plongée et de snorkeling d'Asie du Sud-Est, pour qui visite en saison.",
    littleTip: "Le parc ferme chaque année de mi-mai à mi-octobre pendant la mousson — vérifiez les dates avant de planifier.",
    indicativeDuration: "journée complète",
  },
  {
    slug: "khao-sok-national-park",
    name: "Parc national de Khao Sok",
    zone: "excursions-phuket",
    categories: ["excursions", "quartiers-balades"],
    lat: 8.9000, lng: 98.5333,
    description: "L'une des plus anciennes forêts tropicales du monde, avec ses falaises calcaires spectaculaires, son lac de Cheow Lan aux eaux émeraude et ses bungalows flottants, à environ deux à trois heures de route de Phuket.",
    whyVisit: "L'excursion nature la plus complète depuis Phuket, loin des plages, pour une vraie immersion en forêt tropicale.",
    littleTip: "Une nuit sur un bungalow flottant du lac Cheow Lan transforme l'excursion en une expérience à part entière plutôt qu'une simple visite.",
    indicativeDuration: "1 à 2 jours",
  },
  {
    slug: "koh-yao-noi",
    name: "Koh Yao Noi",
    zone: "excursions-phuket",
    categories: ["excursions", "quartiers-balades"],
    lat: 8.1167, lng: 98.5833,
    description: "Une île au rythme de vie resté très local, entre Phuket et Krabi, bordée de plantations de caoutchouc et de petits villages de pêcheurs, avec une vue sur les pitons karstiques de la baie de Phang Nga.",
    whyVisit: "Une excursion pour voir une Thaïlande insulaire beaucoup plus authentique et moins développée que Phuket.",
    littleTip: "Louer un vélo sur place est la meilleure façon d'explorer l'île à son propre rythme.",
    indicativeDuration: "journée complète à une nuit",
  },
];

const ZONE_DEFS = [
  {
    slug: "patong",
    name: "Patong",
    mapColor: "#c1440e",
    vibeText: "Le quartier le plus animé et le plus touristique de Phuket, entre grande plage, centres commerciaux et vie nocturne dense autour de Bangla Road.",
    prosText: "Tout est accessible à pied, vie nocturne la plus riche de l'île, large choix d'hébergements.",
    consText: "Très touristique et bruyant, plage parfois surchargée, ambiance peu adaptée à un séjour calme.",
    transportText: "Se parcourt à pied pour l'essentiel ; songthaews et Grab pour rejoindre les autres plages.",
    nearbyText: "Jungceylon, Bangla Road et Banzaan Market sont à distance de marche les uns des autres.",
    profileFitText: "Pour qui cherche l'ambiance festive et la vie nocturne plutôt que la tranquillité.",
    hotelAdviceText: "Le secteur le plus pratique pour loger sans dépendre des transports, avec un grand choix d'hôtels.",
  },
  {
    slug: "kata-karon",
    name: "Kata & Karon",
    mapColor: "#3f8ea8",
    vibeText: "Deux grandes plages voisines au sud-ouest de Phuket, plus familiales et nettement plus calmes que Patong, tout en restant bien équipées.",
    prosText: "Plages spacieuses, ambiance plus détendue, bon compromis entre services et tranquillité.",
    consText: "Moins de vie nocturne qu'à Patong, nécessite un trajet pour explorer la vieille ville.",
    transportText: "Songthaews réguliers vers Patong et la ville de Phuket ; Grab pour le reste.",
    nearbyText: "Karon Viewpoint et Freedom Beach sont à proximité immédiate.",
    profileFitText: "Idéal pour les familles et les couples cherchant la plage sans l'agitation de Patong.",
    hotelAdviceText: "Large choix d'hôtels de milieu et haut de gamme, plus calmes que ceux de Patong.",
  },
  {
    slug: "phuket-town",
    name: "Vieille ville de Phuket",
    mapColor: "#a8422c",
    vibeText: "Le centre historique de l'île, loin des plages, avec son architecture sino-portugaise, ses cafés et ses marchés — la facette la plus culturelle de Phuket.",
    prosText: "Architecture unique, scène café et restaurants de qualité, marché du dimanche animé.",
    consText: "Pas de plage à proximité immédiate, nécessite un trajet pour rejoindre la côte.",
    transportText: "Se visite à pied pour l'essentiel ; songthaews et Grab pour rejoindre les plages.",
    nearbyText: "Khao Rang Hill et le marché de Naka sont accessibles en quelques minutes.",
    profileFitText: "Pour les amateurs d'architecture, de café et de culture locale, en complément d'un séjour à la plage.",
    hotelAdviceText: "Plusieurs hôtels-boutiques installés dans d'anciennes demeures sino-portugaises.",
  },
  {
    slug: "rawai-nai-harn",
    name: "Rawai, Nai Harn & Cap Promthep",
    mapColor: "#4a7c59",
    vibeText: "La pointe sud de Phuket, entre plages préservées, point de vue sur le coucher de soleil et ambiance de pêcheurs à Rawai, plus résidentielle que touristique.",
    prosText: "Plages parmi les plus belles de l'île, ambiance plus locale, excellents restaurants de poisson.",
    consText: "Plus excentré que Patong ou Kata, moins de vie nocturne.",
    transportText: "Nécessite un véhicule (scooter, Grab) pour rejoindre les autres secteurs de l'île.",
    nearbyText: "Big Buddha et Wat Chalong sont sur le même axe routier, à quelques minutes.",
    profileFitText: "Pour qui privilégie de belles plages et une ambiance locale à la vie nocturne.",
    hotelAdviceText: "Secteur apprécié des résidents de longue durée, avec des locations à la semaine ou au mois.",
  },
  {
    slug: "kamala-surin-bang-tao",
    name: "Kamala, Surin & Bang Tao",
    mapColor: "#6a8caf",
    vibeText: "La côte nord-ouest de Phuket, entre plages résidentielles tranquilles (Kamala), ambiance chic (Surin) et grands complexes de la zone Laguna (Bang Tao).",
    prosText: "Plages plus calmes, offre de restaurants et beach clubs soignée, bonne option familiale.",
    consText: "Plus excentré du centre-ville et de Patong, nécessite un véhicule.",
    transportText: "Songthaews moins fréquents que plus au sud ; Grab ou véhicule loué recommandés.",
    nearbyText: "Phuket FantaSea et Black Rock Viewpoint sont à proximité de Kamala.",
    profileFitText: "Pour les familles et les couples cherchant confort et tranquillité sans renoncer aux bonnes adresses.",
    hotelAdviceText: "Nombreux resorts et villas, notamment dans le complexe Laguna à Bang Tao.",
  },
  {
    slug: "thalang-nord",
    name: "Thalang et le nord de l'île",
    mapColor: "#8a6ba0",
    vibeText: "L'intérieur et le nord de Phuket, entre forêt tropicale primaire, temples excentrés et plages préservées près de l'aéroport — la facette la plus nature de l'île.",
    prosText: "Nature préservée, moins de monde, bonnes activités familiales.",
    consText: "Peu d'hébergements, se visite surtout en excursion à la journée depuis un logement ailleurs sur l'île.",
    transportText: "Nécessite un véhicule loué ou un chauffeur pour enchaîner les sites, assez dispersés.",
    nearbyText: "Le parc de Khao Phra Thaeo regroupe plusieurs sites (gibbons, cascade) en un seul secteur.",
    profileFitText: "Pour les amateurs de nature et de randonnée légère, en complément d'un séjour balnéaire.",
    hotelAdviceText: "Peu d'hébergements sur place — secteur à visiter en journée depuis un logement ailleurs sur l'île.",
  },
  {
    slug: "excursions-phuket",
    name: "Excursions depuis Phuket",
    mapColor: "#3457a6",
    vibeText: "Les îles et parcs accessibles en excursion d'une journée ou plus depuis Phuket : baies karstiques, îles de plongée et forêt tropicale.",
    prosText: "Paysages très différents de Phuket elle-même, bonne diversité d'activités.",
    consText: "Trajets en bateau ou en véhicule plus longs, certains sites saisonniers.",
    transportText: "Excursions organisées en bateau ou en véhicule privé selon la destination.",
    nearbyText: "Ces sites sont dispersés autour de Phuket — à combiner selon la direction et le temps disponible.",
    profileFitText: "Pour qui dispose d'au moins une journée supplémentaire et veut varier les paysages.",
    hotelAdviceText: "Pas de logement sur Phuket pour cette zone ; Khao Sok et Koh Yao Noi se prêtent à une nuit sur place.",
  },
];

async function main() {
  console.log("Seeding Phuket destination…");

  const thailand = await prisma.country.upsert({
    where: { slug: "thailande" },
    update: {},
    create: { slug: "thailande", name: "Thaïlande" },
  });

  const phuket = await prisma.destination.upsert({
    where: { slug: "phuket" },
    update: { status: "PUBLISHED" },
    create: {
      countryId: thailand.id,
      slug: "phuket",
      name: "Phuket",
      kind: "ISLAND",
      size: "LARGE",
      status: "PUBLISHED",
    },
  });

  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const ENABLED_CATEGORIES = [
    "incontournables", "temples-patrimoine", "quartiers-balades", "experiences-insolites",
    "activites-famille", "restaurants", "street-food", "cafes-brunchs", "bars-rooftops",
    "marches", "shopping", "excursions", "bien-etre-spas", "points-de-vue",
  ];
  await prisma.destination.update({
    where: { id: phuket.id },
    data: {
      categories: {
        set: ENABLED_CATEGORIES.map((slug) => ({ id: categoryBySlug.get(slug)!.id })),
      },
    },
  });

  const zoneBySlug = new Map<string, { id: string }>();
  for (const z of ZONE_DEFS) {
    const zone = await prisma.zone.upsert({
      where: { destinationId_slug: { destinationId: phuket.id, slug: z.slug } },
      update: {
        name: z.name, mapColor: z.mapColor, vibeText: z.vibeText, prosText: z.prosText,
        consText: z.consText, transportText: z.transportText, nearbyText: z.nearbyText,
        profileFitText: z.profileFitText, hotelAdviceText: z.hotelAdviceText,
      },
      create: { destinationId: phuket.id, ...z },
    });
    zoneBySlug.set(z.slug, zone);
  }

  let manifest: PhotoManifestEntry[] = [];
  try {
    manifest = JSON.parse(await readFile(`${SCRATCH}/photos_phuket/manifest.json`, "utf-8"));
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
        name: def.name, destinationId: phuket.id, zoneId: zone?.id, status: "PUBLISHED",
        lat: def.lat, lng: def.lng, description: def.description, whyVisit: def.whyVisit,
        littleTip: def.littleTip, indicativeDuration: def.indicativeDuration, isFictionalDemo: false,
      },
      create: {
        slug: def.slug, destinationId: phuket.id, zoneId: zone?.id, name: def.name,
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

  console.log(`Phuket seed complete: ${PLACES.length} places, ${photoCount} with real photos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
