/**
 * Koh Lanta & Koh Phi Phi — fourth destination, combined per the same
 * admin destination request as Phuket (destinationRequest id
 * cmvleuy9z000129cdmeal2bef). Two smaller, neighbouring islands grouped
 * into one guide rather than two very short standalone destinations.
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

// Sanity-checked matches only — filled in after the photo-sourcing wave.
const GOOD_KEYS = new Set<string>([
  "kantiang-bay",
  "mu-ko-lanta-national-park",
  "lanta-old-town",
  "saladan-pier-town",
  "koh-rok-day-trip",
  "loh-dalum-bay",
  "monkey-beach-phi-phi",
  "viking-cave",
  "bamboo-island",
  "mosquito-island",
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
  // ---------- Koh Lanta ----------
  {
    slug: "long-beach-lanta",
    name: "Long Beach (Phra Ae)",
    zone: "lanta",
    categories: ["incontournables"],
    lat: 7.485, lng: 99.038,
    description: "La plage la plus longue et la plus fréquentée de Koh Lanta, bordée de bars de plage et de petits restaurants, réputée pour ses couchers de soleil et son ambiance décontractée plutôt que pour une grande vie nocturne.",
    whyVisit: "Le cœur balnéaire de Koh Lanta, pratique pour loger et rayonner sur le reste de l'île.",
    littleTip: "Les bars de plage installent leurs tables dans le sable au coucher du soleil — une bonne option pour un verre les pieds dans l'eau.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "klong-dao-beach",
    name: "Klong Dao Beach",
    zone: "lanta",
    categories: ["quartiers-balades"],
    lat: 7.52, lng: 99.043,
    description: "Une plage au nord de l'île, proche de Saladan, à l'eau peu profonde et calme, particulièrement adaptée aux familles et aux baigneurs peu expérimentés.",
    whyVisit: "La plage la plus calme et la plus familiale du nord de Koh Lanta.",
    littleTip: "La marée basse découvre une grande étendue de sable — à vérifier si vous comptez surtout nager.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "khlong-nin-beach",
    name: "Khlong Nin Beach",
    zone: "lanta",
    categories: ["quartiers-balades"],
    lat: 7.445, lng: 99.047,
    description: "Une plage plus tranquille au centre-ouest de l'île, avec un bon spot de surf modéré pendant la mousson, et une ambiance nettement moins touristique que Long Beach.",
    whyVisit: "Une alternative plus paisible à Long Beach, à mi-chemin sur la côte ouest.",
    littleTip: "Quelques bons restaurants de fruits de mer en bord de plage, parfaits pour un dîner au coucher du soleil.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "kantiang-bay",
    name: "Kantiang Bay",
    zone: "lanta",
    categories: ["incontournables", "quartiers-balades"],
    lat: 7.398, lng: 99.054,
    description: "Une baie en forme de croissant dans le sud de l'île, entourée de collines boisées, considérée comme l'une des plus belles plages de Koh Lanta grâce à son cadre encore préservé.",
    whyVisit: "L'une des plus belles baies du sud de l'île, avec un cadre naturel encore intact.",
    littleTip: "Les falaises de chaque côté de la baie offrent de bons points de vue accessibles à pied.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "bamboo-bay-lanta",
    name: "Bamboo Bay",
    zone: "lanta",
    categories: ["quartiers-balades"],
    lat: 7.365, lng: 99.065,
    description: "Une petite baie isolée tout au sud de l'île, accessible par une route sinueuse, avec très peu d'hébergements et une ambiance nettement plus sauvage que le reste de la côte ouest.",
    whyVisit: "La baie la plus reculée et la plus tranquille de Koh Lanta, pour qui cherche l'isolement.",
    littleTip: "La route d'accès est pentue et sinueuse — à éviter en scooter si vous n'êtes pas à l'aise.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "mu-ko-lanta-national-park",
    name: "Parc national de Mu Ko Lanta",
    zone: "lanta",
    categories: ["incontournables", "quartiers-balades"],
    lat: 7.217, lng: 99.045,
    description: "La pointe sud protégée de Koh Lanta, un parc national couvrant forêt tropicale et récifs coralliens, avec plusieurs sentiers de randonnée courts et une plage encore sauvage.",
    whyVisit: "La nature la plus préservée de Koh Lanta, à l'écart des zones touristiques du nord.",
    littleTip: "L'entrée est payante et sert au financement direct du parc — prévoyez de l'argent liquide.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "lanta-lighthouse",
    name: "Phare de Koh Lanta",
    zone: "lanta",
    categories: ["points-de-vue"],
    lat: 7.2155, lng: 99.0445,
    description: "Un phare blanc à la pointe sud de l'île, au sein du parc national, offrant une vue dégagée sur la mer d'Andaman et les îles voisines depuis les rochers environnants.",
    whyVisit: "Le meilleur point de vue du sud de Koh Lanta, combiné naturellement avec la visite du parc national.",
    littleTip: "Le sentier jusqu'au phare passe par des rochers — de bonnes chaussures sont recommandées.",
    indicativeDuration: "45 min",
  },
  {
    slug: "khlong-chak-waterfall",
    name: "Cascade de Khlong Chak",
    zone: "lanta",
    categories: ["quartiers-balades"],
    lat: 7.38, lng: 99.075,
    description: "Une cascade à plusieurs niveaux dans la forêt intérieure de Koh Lanta, plus impressionnante pendant la saison des pluies (mai à octobre), au bout d'une courte marche à travers la végétation tropicale.",
    whyVisit: "Une excursion nature facile, pour varier des plages de l'île.",
    littleTip: "Le débit dépend beaucoup de la saison — à privilégier entre juin et octobre pour la voir à son maximum.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "lanta-old-town",
    name: "Lanta Old Town",
    zone: "lanta",
    categories: ["incontournables", "temples-patrimoine", "quartiers-balades"],
    lat: 7.505, lng: 99.075,
    description: "Un village historique sur la côte est de l'île, construit sur pilotis au-dessus de l'eau, avec ses maisons en bois chinoises centenaires, ses temples et ses restaurants de fruits de mer traditionnels.",
    whyVisit: "Le patrimoine architectural le plus marquant de Koh Lanta, très différent de l'ambiance plage de la côte ouest.",
    littleTip: "Le village est particulièrement agréable en fin d'après-midi, quand la lumière rasante éclaire les façades en bois.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "saladan-pier-town",
    name: "Saladan",
    zone: "lanta",
    categories: ["marches", "street-food"],
    lat: 7.5295, lng: 99.0508,
    description: "Le village principal au nord de l'île, autour du débarcadère des ferries et des speedboats, avec ses restaurants, ses agences d'excursions et son marché local animé en soirée.",
    whyVisit: "Le point d'arrivée et de départ de la plupart des visiteurs de Koh Lanta, pratique pour réserver des excursions.",
    littleTip: "Les restaurants du quai offrent une bonne vue sur le passage des bateaux au coucher du soleil.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "sea-gypsy-village-sanga-u",
    name: "Village des Chao Leh (Sanga-U)",
    zone: "lanta",
    categories: ["experiences-insolites", "quartiers-balades"],
    lat: 7.42, lng: 99.06,
    description: "Un village de pêcheurs Chao Leh (nomades de la mer), communauté autochtone présente sur l'île bien avant le tourisme, qui vit toujours en grande partie de la pêche traditionnelle.",
    whyVisit: "Une rencontre avec la culture autochtone de la mer d'Andaman, peu mise en avant ailleurs sur l'île.",
    littleTip: "Il s'agit d'un village habité, pas d'une attraction — mieux vaut s'y rendre avec discrétion et respect.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "lanta-animal-welfare",
    name: "Lanta Animal Welfare",
    zone: "lanta",
    categories: ["experiences-insolites", "activites-famille"],
    lat: 7.52, lng: 99.065,
    description: "Un refuge à but non lucratif qui soigne et stérilise les chiens et chats errants de l'île depuis le tsunami de 2004, ouvert aux visiteurs pour des visites et des promenades avec les animaux du refuge.",
    whyVisit: "Une visite à la fois attachante et utile, qui soutient directement une cause locale de protection animale.",
    littleTip: "Les promenades avec les chiens du refuge se réservent généralement à l'avance en ligne.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "mangrove-kayak-tour-lanta",
    name: "Kayak dans la mangrove de Thung Yee Peng",
    zone: "lanta",
    categories: ["activites-famille", "quartiers-balades"],
    lat: 7.57, lng: 99.045,
    description: "Une forêt de mangrove au nord de Koh Lanta, explorée en kayak à travers un dédale de chenaux bordés de palétuviers, avec une faune typique des zones humides côtières.",
    whyVisit: "Une activité nature douce et accessible aux familles, très différente des journées plage.",
    littleTip: "Les sorties au lever ou au coucher du soleil offrent la lumière la plus agréable pour la photo.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "time-for-lime-cooking-school",
    name: "Time for Lime (cours de cuisine)",
    zone: "lanta",
    categories: ["experiences-insolites", "restaurants"],
    lat: 7.398, lng: 99.053,
    description: "Une école de cuisine thaïlandaise installée à Kantiang Bay, qui reverse une partie de ses revenus à un refuge animalier local, proposant des cours pratiques autour des classiques de la cuisine thaïe.",
    whyVisit: "Une façon active d'approfondir la cuisine thaïlandaise, avec une démarche qui soutient une cause locale.",
    littleTip: "Les cours se réservent à l'avance, surtout en haute saison — mieux vaut s'y prendre quelques jours avant.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "koh-rok-day-trip",
    name: "Excursion à Koh Rok",
    zone: "lanta",
    categories: ["excursions"],
    lat: 7.19, lng: 99.04,
    description: "Un duo de petites îles au sud de Koh Lanta, au sable blanc immaculé et aux eaux turquoise exceptionnellement claires, protégées au sein du parc national de Mu Ko Lanta et réputées pour le snorkeling.",
    whyVisit: "L'une des meilleures excursions snorkeling à la journée depuis Koh Lanta.",
    littleTip: "Le nombre de visiteurs quotidiens est limité par le parc national — mieux vaut réserver son excursion à l'avance.",
    indicativeDuration: "journée complète",
  },
  {
    slug: "emerald-cave-koh-mook",
    name: "Grotte d'Émeraude (Koh Mook)",
    zone: "lanta",
    categories: ["excursions"],
    lat: 7.35, lng: 99.295,
    description: "Une grotte marine accessible uniquement à la nage ou en kayak à travers un tunnel sombre d'une quatre-vingtaine de mètres, qui débouche sur une lagune cachée entourée de falaises, sur l'île voisine de Koh Mook.",
    whyVisit: "L'une des excursions les plus singulières de la région, pour sa lagune cachée accessible uniquement par la grotte.",
    littleTip: "Le passage dans le tunnel se fait à la nage dans l'obscurité — prévoir une lampe étanche ou suivre un guide équipé.",
    indicativeDuration: "journée complète",
  },
  {
    slug: "four-island-tour-lanta",
    name: "Tour des quatre îles (Koh Ngai et environs)",
    zone: "lanta",
    categories: ["excursions"],
    lat: 7.4, lng: 99.17,
    description: "Une excursion en bateau combinant plusieurs petites îles au nord de Koh Lanta, dont Koh Ngai réputée pour son lagon peu profond, avec arrêts snorkeling et plage pour la journée.",
    whyVisit: "Une excursion multi-îles complète pour qui veut varier les plages en une seule journée.",
    littleTip: "Koh Ngai a très peu d'hébergements — l'île reste nettement plus calme que Koh Lanta elle-même.",
    indicativeDuration: "journée complète",
  },
  {
    slug: "lanta-reggae-bar",
    name: "Reggae Bar (Long Beach)",
    zone: "lanta",
    categories: ["bars-rooftops"],
    lat: 7.485, lng: 99.0375,
    description: "Un bar de plage emblématique de Long Beach, connu pour son ring de boxe thaïe improvisé dans le sable et son ambiance musicale reggae, point de ralliement classique des voyageurs en soirée.",
    whyVisit: "L'adresse de vie nocturne la plus connue de Koh Lanta, pour une ambiance décontractée en bord de plage.",
    littleTip: "Les soirées combats de boxe thaïe amateurs sont annoncées sur place — à vivre pour l'ambiance plus que pour la compétition.",
    indicativeDuration: "1h30 et plus",
  },
  {
    slug: "same-same-restaurant-lanta",
    name: "Same Same Restaurant",
    zone: "lanta",
    categories: ["restaurants"],
    lat: 7.486, lng: 99.039,
    description: "Un restaurant installé directement sur le sable de Long Beach, apprécié pour sa cuisine thaïlandaise généreuse et ses tables les pieds dans le sable au coucher du soleil.",
    whyVisit: "L'une des adresses les plus appréciées de Long Beach pour un dîner les pieds dans le sable.",
    littleTip: "Les tables en bord de plage se remplissent vite à l'heure du coucher du soleil — mieux vaut arriver un peu avant.",
    indicativeDuration: "1h à 1h30",
  },

  // ---------- Koh Phi Phi ----------
  {
    slug: "maya-bay",
    name: "Maya Bay",
    zone: "phi-phi",
    categories: ["incontournables", "points-de-vue"],
    lat: 7.678, lng: 98.766,
    description: "La baie la plus célèbre de Thaïlande, enserrée par de hautes falaises calcaires sur l'île de Koh Phi Phi Leh, rendue mondialement connue par le cinéma. Fermée plusieurs années pour restauration écologique, elle a rouvert avec un accès encadré et un nombre de visiteurs limité.",
    whyVisit: "La baie la plus photographiée de Thaïlande, aujourd'hui gérée de façon à préserver son récif corallien.",
    littleTip: "L'accès et les horaires de visite sont strictement encadrés par le parc national — vérifiez les conditions actuelles avant d'organiser l'excursion.",
    indicativeDuration: "1h à 2h (selon créneau)",
  },
  {
    slug: "loh-dalum-bay",
    name: "Loh Dalum Bay",
    zone: "phi-phi",
    categories: ["incontournables", "quartiers-balades"],
    lat: 7.744, lng: 98.777,
    description: "Une baie à l'eau turquoise peu profonde sur l'isthme de Koh Phi Phi Don, animée de jour par les baigneurs et le soir par les bars de plage et leurs spectacles de feu.",
    whyVisit: "La plage la plus centrale de Phi Phi Don, à la fois pour la baignade de jour et l'ambiance de soirée.",
    littleTip: "La marée basse découvre un grand banc de sable peu profond, agréable pour marcher dans l'eau.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "phi-phi-viewpoint",
    name: "Phi Phi Viewpoint",
    zone: "phi-phi",
    categories: ["incontournables", "points-de-vue"],
    lat: 7.739, lng: 98.782,
    description: "Un ensemble de points de vue en hauteur au-dessus de l'isthme de Phi Phi Don, accessibles par une montée en escaliers assez raide, offrant une vue simultanée sur les baies de Tonsai et de Loh Dalum.",
    whyVisit: "Le point de vue le plus emblématique de Koh Phi Phi, avec la vue sur les deux baies qui encadrent l'isthme.",
    littleTip: "Partez tôt le matin pour éviter la chaleur de la montée et profiter d'une lumière plus douce.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "monkey-beach-phi-phi",
    name: "Monkey Beach",
    zone: "phi-phi",
    categories: ["quartiers-balades", "activites-famille"],
    lat: 7.728, lng: 98.765,
    description: "Une petite plage accessible en bateau ou par un court sentier côtier, connue pour la troupe de macaques à longue queue qui s'y aventure régulièrement près des visiteurs.",
    whyVisit: "Une rencontre facile avec la faune locale, étape classique des excursions en bateau autour de Phi Phi.",
    littleTip: "Ne nourrissez pas les singes et gardez vos affaires fermées — ils sont habitués à fouiller les sacs des visiteurs.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "pileh-lagoon",
    name: "Pileh Lagoon",
    zone: "phi-phi",
    categories: ["points-de-vue", "excursions"],
    lat: 7.685, lng: 98.773,
    description: "Un lagon quasi fermé sur Koh Phi Phi Leh, entouré de falaises calcaires abruptes, aux eaux d'un vert émeraude intense — l'un des arrêts incontournables des excursions en bateau autour de Phi Phi Leh.",
    whyVisit: "L'un des plans d'eau les plus spectaculaires de la région, pour la couleur de son lagon fermé.",
    littleTip: "La baignade y est parfois restreinte selon la réglementation du parc — renseignez-vous auprès de votre excursion.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "viking-cave",
    name: "Viking Cave",
    zone: "phi-phi",
    categories: ["quartiers-balades", "excursions"],
    lat: 7.702, lng: 98.778,
    description: "Une grotte marine sur Koh Phi Phi Leh, célèbre pour ses nids d'hirondelles récoltés en hauteur sur des échafaudages en bambou pour la préparation de la soupe aux nids d'oiseau, et pour ses peintures rupestres anciennes représentant des bateaux.",
    whyVisit: "Un arrêt qui mêle curiosité naturelle et activité économique locale traditionnelle, rare à observer.",
    littleTip: "La grotte se visite généralement depuis le bateau, sans débarquer — un bon moment pour les photos au téléobjectif.",
    indicativeDuration: "20 à 30 min",
  },
  {
    slug: "bamboo-island",
    name: "Bamboo Island (Koh Mai Phai)",
    zone: "phi-phi",
    categories: ["excursions", "quartiers-balades"],
    lat: 7.801, lng: 98.794,
    description: "Une petite île au nord de Phi Phi Don, entourée d'un récif corallien peu profond, réputée pour être l'un des meilleurs spots de snorkeling accessibles à la journée depuis Phi Phi.",
    whyVisit: "L'un des meilleurs spots de snorkeling de l'archipel, avec un sable blanc très photogénique.",
    littleTip: "L'île se visite généralement en combiné avec Mosquito Island lors de la même excursion en bateau.",
    indicativeDuration: "demi-journée",
  },
  {
    slug: "mosquito-island",
    name: "Mosquito Island (Koh Yung)",
    zone: "phi-phi",
    categories: ["excursions"],
    lat: 7.795, lng: 98.79,
    description: "Une petite île voisine de Bamboo Island, malgré son nom sans moustiques particulièrement gênants, appréciée pour ses fonds coralliens et ses eaux calmes propices au snorkeling.",
    whyVisit: "Un bon complément à Bamboo Island pour une matinée de snorkeling au nord de Phi Phi.",
    littleTip: "Les eaux y sont généralement plus calmes qu'à Bamboo Island, agréable pour les nageurs moins expérimentés.",
    indicativeDuration: "demi-journée",
  },
  {
    slug: "shark-point-phi-phi",
    name: "Shark Point (Hin Bida)",
    zone: "phi-phi",
    categories: ["excursions"],
    lat: 7.655, lng: 98.77,
    description: "Un site de plongée et de snorkeling au sud de Phi Phi Leh, connu pour la présence régulière de requins pointe noire inoffensifs évoluant près du récif peu profond.",
    whyVisit: "L'un des meilleurs sites de la région pour observer des requins de récif sans plonger en profondeur.",
    littleTip: "Les requins pointe noire sont généralement visibles tôt le matin, quand l'eau est la plus calme.",
    indicativeDuration: "1h à 2h",
  },
  {
    slug: "long-beach-phi-phi",
    name: "Long Beach (Hat Yao)",
    zone: "phi-phi",
    categories: ["quartiers-balades"],
    lat: 7.73, lng: 98.785,
    description: "Une plage au sud de Tonsai, accessible à pied ou en longtail, à l'eau claire et peu profonde, nettement plus calme que Loh Dalum tout en restant facile d'accès.",
    whyVisit: "Une bonne alternative plus tranquille à Loh Dalum, à distance de marche du village de Tonsai.",
    littleTip: "Le bon spot de snorkeling le plus proche de Tonsai, sans besoin de prendre un bateau.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "lo-bakao-beach",
    name: "Lo Bakao Beach",
    zone: "phi-phi",
    categories: ["quartiers-balades"],
    lat: 7.76, lng: 98.77,
    description: "Une plage sur la côte est de Phi Phi Don, accessible uniquement en bateau ou par les sentiers de randonnée depuis les points de vue, beaucoup moins fréquentée que les plages de l'isthme central.",
    whyVisit: "L'une des plages les plus préservées de Phi Phi Don, loin de l'agitation de Tonsai et Loh Dalum.",
    littleTip: "Peu de services sur place — prévoyez eau et en-cas si vous y passez la journée.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "nui-bay-phi-phi",
    name: "Nui Bay",
    zone: "phi-phi",
    categories: ["quartiers-balades"],
    lat: 7.715, lng: 98.78,
    description: "Une petite baie au sud de Phi Phi Don, accessible en longtail ou par un sentier de randonnée, avec un bon récif corallien juste au large de la plage.",
    whyVisit: "Une plage plus confidentielle avec un bon snorkeling directement accessible depuis le sable.",
    littleTip: "Peu d'ombre sur la plage — crème solaire et chapeau sont indispensables.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "ton-sai-walking-street",
    name: "Ton Sai Walking Street",
    zone: "phi-phi",
    categories: ["marches", "street-food", "shopping"],
    lat: 7.7405, lng: 98.7775,
    description: "La rue principale piétonne du village de Tonsai, dense en restaurants, bars, agences d'excursions et échoppes de street food, cœur commercial et social de Koh Phi Phi Don.",
    whyVisit: "Le centre névralgique de Phi Phi Don, incontournable pour organiser excursions et repas.",
    littleTip: "La rue est nettement plus calme le matin — pratique pour réserver ses excursions du lendemain sans la foule du soir.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "slinky-bar",
    name: "Slinky Bar",
    zone: "phi-phi",
    categories: ["bars-rooftops"],
    lat: 7.7435, lng: 98.7765,
    description: "L'un des grands bars de plage de Loh Dalum Bay, avec spectacles de feu, musique et tables dans le sable, cœur de la vie nocturne de Phi Phi Don.",
    whyVisit: "L'une des adresses de soirée les plus connues de Phi Phi, pour l'ambiance festive en bord de plage.",
    littleTip: "Les spectacles de feu démarrent généralement en fin de soirée — gardez une distance de sécurité pendant les numéros.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "sunflower-bar-phi-phi",
    name: "Sunflower Bar",
    zone: "phi-phi",
    categories: ["bars-rooftops", "points-de-vue"],
    lat: 7.7395, lng: 98.78,
    description: "Un petit bar perché sur les hauteurs près du sentier du Phi Phi Viewpoint, prisé pour sa vue plongeante sur les deux baies de l'île au coucher du soleil, dans une ambiance nettement plus informelle que les bars de plage.",
    whyVisit: "Le meilleur endroit pour un verre avec vue en altitude sur l'île, en combiné avec la montée au viewpoint.",
    littleTip: "À combiner directement avec la montée au Phi Phi Viewpoint, juste à côté, pour ne faire qu'une seule montée.",
    indicativeDuration: "1h à 1h30",
  },
];

const ZONE_DEFS = [
  {
    slug: "lanta",
    name: "Koh Lanta",
    mapColor: "#2e7d6e",
    vibeText: "Une île allongée à l'ambiance nettement plus calme que Phuket ou Phi Phi, entre longues plages de la côte ouest, nature protégée au sud et patrimoine sino-thaï à Lanta Old Town.",
    prosText: "Ambiance détendue, belles plages peu bondées, bon point de départ pour les excursions vers Koh Rok et la Grotte d'Émeraude.",
    consText: "Île allongée : se déplacer d'un bout à l'autre prend du temps, peu de vie nocturne intense.",
    transportText: "Scooter de location ou taxi/songthaew — l'île fait une vingtaine de kilomètres de long.",
    nearbyText: "Saladan, Long Beach et Lanta Old Town sont les trois points d'ancrage pratiques pour explorer l'île.",
    profileFitText: "Pour qui cherche la détente et la nature plutôt que l'animation, en complément d'un séjour plus citadin.",
    hotelAdviceText: "La plupart des hébergements se concentrent sur la côte ouest, de Klong Dao à Kantiang Bay.",
  },
  {
    slug: "phi-phi",
    name: "Koh Phi Phi",
    mapColor: "#1f6f78",
    vibeText: "Un archipel calcaire spectaculaire autour de la seule île habitée, Phi Phi Don, entre falaises vertigineuses, lagons émeraude et vie nocturne parmi les plus animées de Thaïlande.",
    prosText: "Paysages parmi les plus spectaculaires de Thaïlande, excursions en bateau très accessibles, vie nocturne dense.",
    consText: "Très fréquenté en haute saison, pas de route ni de voiture sur l'île (tout se fait à pied ou en bateau).",
    transportText: "Aucune route carrossable sur l'île — déplacements à pied dans Tonsai, en longtail pour les autres plages.",
    nearbyText: "Tonsai et Loh Dalum sont à quelques minutes à pied l'une de l'autre, au cœur de l'isthme.",
    profileFitText: "Pour les amateurs de paysages spectaculaires et de vie nocturne, moins adapté à un séjour très calme.",
    hotelAdviceText: "La plupart des hébergements sont concentrés sur l'isthme central, entre Tonsai et Loh Dalum.",
  },
];

async function main() {
  console.log("Seeding Koh Lanta & Koh Phi Phi destination…");

  const thailand = await prisma.country.upsert({
    where: { slug: "thailande" },
    update: {},
    create: { slug: "thailande", name: "Thaïlande" },
  });

  const destination = await prisma.destination.upsert({
    where: { slug: "koh-lanta-koh-phi-phi" },
    update: { status: "PUBLISHED" },
    create: {
      countryId: thailand.id,
      slug: "koh-lanta-koh-phi-phi",
      name: "Koh Lanta & Koh Phi Phi",
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
    manifest = JSON.parse(await readFile(`${SCRATCH}/photos_lanta_phiphi/manifest.json`, "utf-8"));
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

  console.log(`Koh Lanta & Koh Phi Phi seed complete: ${PLACES.length} places, ${photoCount} with real photos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
