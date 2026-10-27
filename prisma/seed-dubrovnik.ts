/**
 * Dubrovnik (sud de la Croatie) — first Croatia destination, built from
 * the admin "Nouvelle destination" request queue (destinationRequest id
 * cmvmbbdxv00032adt044ez62q): "le sud de la Croatie en global autour de
 * Dubrovnik avec les petite ile visitable autour" — Dubrovnik itself
 * plus the real day-trip islands and towns around it (Lokrum, the
 * Elaphiti islands, Mljet, Korčula, the Pelješac peninsula and Ston,
 * Cavtat). Split and central Dalmatia are a separate destination
 * request ("pareil que pour le sud"), not covered here. Same pattern as
 * every other destination: real places, real coordinates, Wikimedia
 * Commons photos only when a genuine match exists, no zoos.
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

// Filled in after photo sourcing (same two-pass pattern as every other
// destination this session) — left empty for the first seed pass.
const GOOD_KEYS = new Set<string>([]);

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
  indicativePrice?: string;
  altText?: string;
};

const PLACES: PlaceDef[] = [
  // ---------- Vieille ville de Dubrovnik ----------
  {
    slug: "dubrovnik-city-walls",
    name: "Remparts de Dubrovnik",
    zone: "dubrovnik-old-town",
    categories: ["incontournables", "points-de-vue"],
    lat: 42.6412, lng: 18.1100,
    description: "Près de 2 km de remparts médiévaux quasiment intacts encerclant toute la vieille ville, que l'on peut parcourir intégralement à pied avec vue sur les toits de tuiles et la mer Adriatique.",
    whyVisit: "L'expérience la plus incontournable de Dubrovnik, et l'une des fortifications urbaines les mieux conservées d'Europe.",
    littleTip: "Faites le tour tôt le matin ou en fin d'après-midi pour éviter la chaleur et la foule, aucune ombre sur le parcours.",
    indicativeDuration: "2h",
  },
  {
    slug: "stradun",
    name: "Stradun (Placa)",
    zone: "dubrovnik-old-town",
    categories: ["incontournables", "quartiers-balades"],
    lat: 42.6411, lng: 18.1083,
    description: "L'artère principale et piétonne de la vieille ville, pavée de calcaire poli brillant au fil des siècles, qui traverse Dubrovnik de la Porte Pile à la Porte Ploče.",
    whyVisit: "La colonne vertébrale de la vieille ville, où se concentre l'essentiel de l'animation.",
    littleTip: "Le calcaire est glissant par temps de pluie — évitez les semelles lisses.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "rectors-palace",
    name: "Palais du Recteur",
    zone: "dubrovnik-old-town",
    categories: ["temples-patrimoine"],
    lat: 42.6400, lng: 18.1101,
    description: "Le siège du pouvoir de l'ancienne République de Raguse, où le recteur élu résidait un mois durant sans pouvoir en sortir sauf raison officielle, aujourd'hui musée d'histoire culturelle.",
    whyVisit: "Le meilleur endroit pour comprendre le système politique unique de la République de Raguse, rivale vénitienne.",
    littleTip: "La cour intérieure, avec ses concerts de musique classique en été, vaut la visite à elle seule.",
    indicativeDuration: "1h",
  },
  {
    slug: "dubrovnik-cathedral",
    name: "Cathédrale de l'Assomption",
    zone: "dubrovnik-old-town",
    categories: ["temples-patrimoine"],
    lat: 42.6399, lng: 18.1106,
    description: "Une cathédrale baroque du XVIIIe siècle, reconstruite après le séisme de 1667, qui abrite un trésor religieux avec des reliques de saint Blaise, le saint patron de Dubrovnik.",
    whyVisit: "Le trésor de la cathédrale conserve des pièces d'orfèvrerie religieuse parmi les plus précieuses de Croatie.",
    littleTip: "Le trésor se visite séparément de la cathédrale elle-même, avec un billet dédié.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "franciscan-monastery-dubrovnik",
    name: "Monastère franciscain et sa pharmacie",
    zone: "dubrovnik-old-town",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 42.6421, lng: 18.1072,
    description: "Un monastère du XIVe siècle qui abrite l'une des plus anciennes pharmacies d'Europe encore en activité, ouverte sans interruption depuis 1317.",
    whyVisit: "Une pharmacie médiévale toujours en activité, avec un cloître gothique-roman d'une grande sérénité.",
    littleTip: "Le petit musée attenant expose des registres et instruments pharmaceutiques datant de plusieurs siècles.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "onofrio-fountain",
    name: "Grande fontaine d'Onofrio",
    zone: "dubrovnik-old-town",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 42.6420, lng: 18.1073,
    description: "Une fontaine circulaire du XVe siècle, vestige d'un système d'aqueduc amenant l'eau potable depuis une source à 12 km de la ville.",
    whyVisit: "L'un des points de repère les plus photographiés juste après la Porte Pile.",
    littleTip: "L'eau qui coule des masques sculptés est toujours potable aujourd'hui.",
    indicativeDuration: "15 min",
  },
  {
    slug: "sponza-palace",
    name: "Palais Sponza",
    zone: "dubrovnik-old-town",
    categories: ["temples-patrimoine"],
    lat: 42.6413, lng: 18.1097,
    description: "Un palais du XVIe siècle mêlant architecture gothique et renaissance, qui a servi de douane, banque et école, aujourd'hui siège des archives d'État.",
    whyVisit: "L'un des rares bâtiments de la vieille ville à avoir survécu intact au séisme de 1667.",
    littleTip: "Une salle commémore gratuitement les habitants de Dubrovnik tués durant le siège de 1991-1992.",
    indicativeDuration: "30 min",
  },
  {
    slug: "war-photo-limited",
    name: "War Photo Limited",
    zone: "dubrovnik-old-town",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 42.6408, lng: 18.1096,
    description: "Une galerie de photojournalisme de guerre, avec des expositions tournantes sur les conflits des Balkans et d'ailleurs dans le monde.",
    whyVisit: "Un contrepoint nécessaire et saisissant à l'image carte postale de Dubrovnik, pour comprendre le siège de 1991-1992.",
    littleTip: "L'exposition permanente sur le siège de Dubrovnik est particulièrement poignante à visiter dans la ville elle-même.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "fort-lovrijenac",
    name: "Fort Lovrijenac",
    zone: "dubrovnik-old-town",
    categories: ["incontournables", "points-de-vue"],
    lat: 42.6421, lng: 18.1051,
    description: "Une forteresse du XIe siècle perchée sur un rocher de 37 mètres à l'extérieur des remparts, qui a servi de décor au Donjon Rouge dans la série Game of Thrones.",
    whyVisit: "L'une des plus belles vues sur les remparts et la vieille ville, en plus de son rôle dans la série culte.",
    littleTip: "Le billet combiné avec les remparts de la ville est plus économique si vous comptez faire les deux.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "dubrovnik-cable-car",
    name: "Téléphérique de Dubrovnik",
    zone: "dubrovnik-old-town",
    categories: ["incontournables", "points-de-vue"],
    lat: 42.6434, lng: 18.1114,
    description: "Un téléphérique qui grimpe en quelques minutes au sommet du mont Srđ, offrant une vue plongeante sur toute la vieille ville et la côte adriatique.",
    whyVisit: "La façon la plus rapide d'obtenir la vue aérienne emblématique de Dubrovnik, sans randonnée.",
    littleTip: "Réservez le dernier départ en fin d'après-midi pour voir la ville de jour puis au coucher du soleil.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "mount-srd",
    name: "Mont Srđ",
    zone: "dubrovnik-old-town",
    categories: ["points-de-vue", "temples-patrimoine"],
    lat: 42.6519, lng: 18.1142,
    description: "Le sommet surplombant Dubrovnik, avec les ruines du Fort Impérial napoléonien et un petit musée consacré au siège de la ville en 1991-1992.",
    whyVisit: "Le point de vue le plus spectaculaire sur l'ensemble de la côte, accessible en téléphérique.",
    littleTip: "Le petit musée de la guerre d'indépendance, dans le fort, donne un contexte historique rarement raconté ailleurs.",
    indicativeDuration: "1h",
  },
  {
    slug: "pile-gate",
    name: "Porte Pile",
    zone: "dubrovnik-old-town",
    categories: ["temples-patrimoine"],
    lat: 42.6426, lng: 18.1069,
    description: "L'entrée principale et historique de la vieille ville, franchie par un pont de pierre puis un pont-levis en bois d'origine, toujours relevé chaque soir en symbole.",
    whyVisit: "Le passage obligé pour entrer dans la vieille ville, et l'une des plus belles entrées fortifiées d'Europe.",
    littleTip: "C'est aussi l'un des meilleurs points de départ pour le tour des remparts, juste à côté de la billetterie.",
    indicativeDuration: "15 min",
  },
  {
    slug: "ploce-gate",
    name: "Porte Ploče",
    zone: "dubrovnik-old-town",
    categories: ["temples-patrimoine"],
    lat: 42.6407, lng: 18.1142,
    description: "L'entrée est de la vieille ville, qui s'ouvrait autrefois vers les routes commerciales de l'intérieur des terres et vers l'ancien port.",
    whyVisit: "Nettement moins fréquentée que la Porte Pile, pour une entrée plus tranquille dans la vieille ville.",
    littleTip: "Le vieux port, juste derrière, est un bon point de départ pour les excursions en bateau vers Lokrum.",
    indicativeDuration: "15 min",
  },
  {
    slug: "dominican-monastery-dubrovnik",
    name: "Monastère dominicain",
    zone: "dubrovnik-old-town",
    categories: ["temples-patrimoine"],
    lat: 42.6417, lng: 18.1113,
    description: "Un monastère gothique-renaissance avec un cloître planté de palmiers et d'orangers, abritant une collection de peintures religieuses de l'école de Dubrovnik.",
    whyVisit: "L'un des plus beaux cloîtres de la ville, nettement moins fréquenté que le monastère franciscain.",
    littleTip: "Le musée attenant conserve des reliquaires en argent et orfèvrerie d'une grande finesse.",
    indicativeDuration: "45 min",
  },
  {
    slug: "buza-bar",
    name: "Buža Bar",
    zone: "dubrovnik-old-town",
    categories: ["bars-rooftops", "experiences-insolites"],
    lat: 42.6396, lng: 18.1082,
    description: "Un bar littéralement creusé dans la falaise à l'extérieur des remparts, accessible par un trou dans le mur portant l'inscription « Cold drinks, nice view ».",
    whyVisit: "L'un des bars les plus insolites d'Europe, avec plongeons directs dans l'Adriatique depuis les rochers.",
    littleTip: "Deux bars du même nom existent côte à côte — le plus ancien (Buža I) est généralement le plus animé au coucher du soleil.",
    indicativeDuration: "1h à 2h",
  },
  {
    slug: "banje-beach",
    name: "Plage de Banje",
    zone: "dubrovnik-old-town",
    categories: ["quartiers-balades"],
    lat: 42.6406, lng: 18.1151,
    description: "La plage la plus proche de la vieille ville, avec une vue directe sur les remparts et Fort Lovrijenac depuis l'eau.",
    whyVisit: "La plage la plus pratique pour se baigner sans quitter le centre historique.",
    littleTip: "Arrivez tôt le matin en haute saison — c'est la plage la plus fréquentée de Dubrovnik.",
    indicativeDuration: "2h",
  },
  {
    slug: "dubrovnik-synagogue",
    name: "Synagogue de Dubrovnik",
    zone: "dubrovnik-old-town",
    categories: ["temples-patrimoine"],
    lat: 42.6411, lng: 18.1091,
    description: "L'une des plus anciennes synagogues d'Europe encore en activité, fondée au XVe siècle par des Juifs séfarades fuyant l'Inquisition espagnole.",
    whyVisit: "Un témoignage rare et émouvant de la présence juive séculaire à Dubrovnik.",
    littleTip: "Le petit musée attenant conserve des objets liturgiques et des documents sur la communauté juive locale.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "game-of-thrones-walking-tour",
    name: "Visite guidée Game of Thrones",
    zone: "dubrovnik-old-town",
    categories: ["experiences-insolites"],
    lat: 42.6410, lng: 18.1080,
    description: "Un circuit guidé à travers les décors naturels de Port-Réal dans la série Game of Thrones, des remparts à Fort Lovrijenac en passant par l'escalier des Jésuites.",
    whyVisit: "Une façon ludique de redécouvrir la vieille ville à travers les lieux de tournage les plus reconnaissables de la série.",
    littleTip: "Réservez plutôt en fin de matinée — les groupes partent souvent tôt et se concentrent devant les mêmes décors.",
    indicativeDuration: "2h",
  },
  {
    slug: "jesuit-staircase",
    name: "Escalier des Jésuites",
    zone: "dubrovnik-old-town",
    categories: ["experiences-insolites", "points-de-vue"],
    lat: 42.6397, lng: 18.1096,
    description: "Un escalier baroque monumental inspiré de la place d'Espagne à Rome, menant à l'église Saint-Ignace, devenu célèbre comme décor de la « marche de la honte » dans Game of Thrones.",
    whyVisit: "L'un des plus beaux escaliers baroques des Balkans, et un lieu de tournage culte pour les fans de la série.",
    littleTip: "L'église Saint-Ignace en haut des marches, moins visitée, mérite un coup d'œil pour son intérieur baroque.",
    indicativeDuration: "20 min",
  },
  {
    slug: "st-blaise-church",
    name: "Église Saint-Blaise",
    zone: "dubrovnik-old-town",
    categories: ["temples-patrimoine"],
    lat: 42.6412, lng: 18.1095,
    description: "Une église baroque du XVIIIe siècle dédiée au saint patron de Dubrovnik, dont la statue médiévale tenant une maquette de la ville a survécu à l'incendie qui a détruit l'édifice d'origine.",
    whyVisit: "Le cœur spirituel de Dubrovnik, dédié au saint dont la fête (le 3 février) est la plus grande célébration de la ville.",
    littleTip: "La statue de saint Blaise sur l'autel tient une maquette de Dubrovnik telle qu'elle était avant le séisme de 1667.",
    indicativeDuration: "20 à 30 min",
  },
  {
    slug: "fort-revelin",
    name: "Fort Revelin",
    zone: "dubrovnik-old-town",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 42.6410, lng: 18.1145,
    description: "Une imposante forteresse du XVIe siècle gardant l'entrée est de la ville, qui accueille aujourd'hui expositions et grands événements, dont certaines soirées du Festival d'été de Dubrovnik.",
    whyVisit: "L'une des fortifications les plus massives de la ville, avec une programmation culturelle et festive active.",
    littleTip: "Vérifiez le programme d'événements avant de passer — le fort se transforme parfois en salle de concert en plein air.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "nautika-restaurant",
    name: "Restaurant Nautika",
    zone: "dubrovnik-old-town",
    categories: ["restaurants"],
    lat: 42.6428, lng: 18.1058,
    description: "Un restaurant gastronomique installé juste sous Fort Lovrijenac, avec vue directe sur les remparts et la mer, réputé pour sa cuisine adriatique raffinée.",
    whyVisit: "L'une des tables les plus réputées de Dubrovnik, avec l'un des meilleurs cadres en bord de mer de la ville.",
    littleTip: "Réservez une table en terrasse plusieurs jours à l'avance en haute saison pour la vue sur Fort Lovrijenac au coucher du soleil.",
    indicativeDuration: "2h",
    indicativePrice: "$$$$",
  },

  // ---------- Dubrovnik au-delà des remparts ----------
  {
    slug: "lapad-peninsula",
    name: "Péninsule de Lapad",
    zone: "dubrovnik-beyond-walls",
    categories: ["quartiers-balades", "restaurants"],
    lat: 42.6517, lng: 18.0773,
    description: "Le quartier résidentiel et balnéaire de Dubrovnik, avec sa promenade ombragée de pins (Šetalište Kralja Zvonimira) bordée d'hôtels, restaurants et petites criques.",
    whyVisit: "Une alternative plus abordable et plus calme que la vieille ville pour loger, avec un accès direct à la mer.",
    littleTip: "Le bus local relie Lapad à la vieille ville en 15-20 minutes, fréquent et bon marché.",
    indicativeDuration: "2h",
  },
  {
    slug: "copacabana-beach-dubrovnik",
    name: "Plage Copacabana (Babin Kuk)",
    zone: "dubrovnik-beyond-walls",
    categories: ["quartiers-balades"],
    lat: 42.6577, lng: 18.0646,
    description: "Une grande plage de galets et de béton aménagé à la pointe de la péninsule de Babin Kuk, avec toboggans aquatiques et vue sur les îles Elaphites.",
    whyVisit: "L'une des plages les mieux équipées de Dubrovnik pour les familles, avec vue sur les îles au large.",
    littleTip: "Les toboggans aquatiques et le parasailing en font une bonne option pour les enfants et ados.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "dubrovnik-aquarium",
    name: "Aquarium de Dubrovnik",
    zone: "dubrovnik-beyond-walls",
    categories: ["activites-famille"],
    lat: 42.6410, lng: 18.1120,
    description: "Un petit aquarium installé dans les voûtes de pierre du Fort Saint-Jean, consacré à la faune marine de l'Adriatique.",
    whyVisit: "Une pause fraîche et éducative en famille, dans un cadre historique au bord du vieux port.",
    littleTip: "Le billet combiné avec le musée maritime, à l'étage du même fort, est économique.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "gradac-park",
    name: "Parc Gradac",
    zone: "dubrovnik-beyond-walls",
    categories: ["quartiers-balades"],
    lat: 42.6442, lng: 18.1035,
    description: "Un parc en pinède sur une petite colline juste à l'ouest de la vieille ville, avec des sentiers offrant des vues inattendues sur les remparts et la mer.",
    whyVisit: "Une pause verte et gratuite à deux pas de la vieille ville, loin de la foule.",
    littleTip: "Le sentier côtier du parc offre l'une des meilleures vues gratuites sur Fort Lovrijenac.",
    indicativeDuration: "45 min",
  },
  {
    slug: "rijeka-dubrovacka",
    name: "Rijeka Dubrovačka",
    zone: "dubrovnik-beyond-walls",
    categories: ["quartiers-balades", "points-de-vue"],
    lat: 42.6550, lng: 18.0467,
    description: "Une crique fluviale pittoresque au nord de Dubrovnik, bordée d'anciennes résidences d'été nobles et de petits restaurants de poisson en bord d'eau.",
    whyVisit: "Un Dubrovnik nettement plus tranquille et local, loin des foules de la vieille ville.",
    littleTip: "Plusieurs restaurants de poisson en bord d'eau y sont réputés plus authentiques et abordables qu'en vieille ville.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "konavle-valley",
    name: "Vallée de Konavle",
    zone: "dubrovnik-beyond-walls",
    categories: ["quartiers-balades", "experiences-insolites"],
    lat: 42.5700, lng: 18.2100,
    description: "Une vallée agricole fertile au sud-est de Dubrovnik, réputée pour ses costumes traditionnels brodés, ses moulins à eau historiques et ses vignobles.",
    whyVisit: "La campagne croate authentique, à seulement 30 minutes de Dubrovnik, loin du tourisme de masse côtier.",
    littleTip: "Le village de Ljuta, avec ses moulins à eau restaurés, est un bon point de départ pour explorer la vallée.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "trsteno-arboretum",
    name: "Arboretum de Trsteno",
    zone: "dubrovnik-beyond-walls",
    categories: ["incontournables", "quartiers-balades"],
    lat: 42.7114, lng: 17.9814,
    description: "Le plus ancien arboretum de Croatie, créé au XVe siècle par une famille noble de Dubrovnik, avec un aqueduc Renaissance et des platanes vieux de plus de 500 ans.",
    whyVisit: "Un jardin historique spectaculaire en surplomb de l'Adriatique, également utilisé comme décor des jardins du Donjon Rouge dans Game of Thrones.",
    littleTip: "L'aqueduc en forme de grotte, avec sa fontaine à Neptune, est l'un des recoins les plus photogéniques du jardin.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "orsan-boat-club",
    name: "Orsan Boat Club",
    zone: "dubrovnik-beyond-walls",
    categories: ["restaurants", "bars-rooftops"],
    lat: 42.6525, lng: 18.0760,
    description: "Un restaurant-bar convivial installé dans un ancien hangar à bateaux en bord de mer à Lapad, avec tables les pieds presque dans l'eau.",
    whyVisit: "Une ambiance décontractée et locale, loin des prix touristiques de la vieille ville.",
    littleTip: "La terrasse en bord de mer est idéale pour un dîner au coucher du soleil, à réserver à l'avance en été.",
    indicativeDuration: "1h30",
    indicativePrice: "$$",
  },
  {
    slug: "dubrovnik-summer-festival",
    name: "Festival d'été de Dubrovnik",
    zone: "dubrovnik-beyond-walls",
    categories: ["experiences-insolites"],
    lat: 42.6407, lng: 18.1077,
    description: "Un festival de théâtre, musique et danse qui se tient chaque année de juillet à août depuis 1950, utilisant les forts, palais et places de la vieille ville comme scènes à ciel ouvert.",
    whyVisit: "L'un des plus anciens et prestigieux festivals culturels d'Europe, avec des représentations dans des décors historiques uniques.",
    littleTip: "Les spectacles au Fort Lovrijenac et dans la cour du Palais du Recteur comptent parmi les plus spectaculaires.",
    indicativeDuration: "selon le spectacle",
  },
  {
    slug: "sv-jakov-beach",
    name: "Plage de Sveti Jakov",
    zone: "dubrovnik-beyond-walls",
    categories: ["quartiers-balades", "points-de-vue"],
    lat: 42.6330, lng: 18.1210,
    description: "Une plage de galets en contrebas d'une falaise à l'est de la vieille ville, nettement moins fréquentée que Banje, avec l'une des plus belles vues en recul sur Dubrovnik.",
    whyVisit: "La meilleure vue sur l'ensemble de la vieille ville et ses remparts depuis une plage.",
    littleTip: "L'accès se fait par un escalier assez long depuis la route — prévoyez d'y passer un bon moment une fois arrivé.",
    indicativeDuration: "2h",
  },

  // ---------- Lokrum ----------
  {
    slug: "lokrum-island",
    name: "Île de Lokrum",
    zone: "lokrum",
    categories: ["incontournables", "quartiers-balades"],
    lat: 42.6336, lng: 18.1198,
    description: "Une petite île boisée à 10 minutes en bateau de la vieille ville, inhabitée en permanence et classée réserve naturelle, où se promènent des paons en liberté.",
    whyVisit: "L'excursion la plus simple et la plus rapide depuis Dubrovnik, pour une parenthèse nature sans voiture.",
    littleTip: "Les derniers bateaux repartent généralement en fin d'après-midi — vérifiez les horaires de retour avant de débarquer.",
    indicativeDuration: "demi-journée",
  },
  {
    slug: "lokrum-botanical-garden",
    name: "Jardin botanique de Lokrum",
    zone: "lokrum",
    categories: ["quartiers-balades"],
    lat: 42.6330, lng: 18.1190,
    description: "Un jardin botanique planté par l'archiduc Maximilien d'Autriche au XIXe siècle, avec des cactus et plantes méditerranéennes rares autour de son ancien monastère.",
    whyVisit: "Un jardin historique surprenant, hérité de l'empereur du Mexique Maximilien Ier avant son exécution.",
    littleTip: "Le monastère bénédictin voisin, en ruine depuis le XIXe siècle, a aussi servi de décor à Game of Thrones.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "dead-sea-lokrum",
    name: "« Mer Morte » de Lokrum",
    zone: "lokrum",
    categories: ["experiences-insolites", "quartiers-balades"],
    lat: 42.6320, lng: 18.1175,
    description: "Un petit lac d'eau salée au cœur de l'île, relié à la mer par des fissures souterraines, dont le nom vient de sa salinité et de sa chaleur particulières.",
    whyVisit: "Une baignade insolite en eau calme et chaude, à l'abri des vagues de l'Adriatique.",
    littleTip: "L'eau y est sensiblement plus chaude que la mer ouverte, agréable même en avant-saison.",
    indicativeDuration: "45 min",
  },
  {
    slug: "fort-royal-lokrum",
    name: "Fort Royal (Lokrum)",
    zone: "lokrum",
    categories: ["temples-patrimoine", "points-de-vue"],
    lat: 42.6305, lng: 18.1170,
    description: "Une forteresse napoléonienne du début du XIXe siècle au sommet de l'île, offrant une vue à 360° sur Dubrovnik, l'Adriatique et les îles Elaphites.",
    whyVisit: "Le meilleur point de vue de Lokrum, et un vestige méconnu de la brève occupation française de la région.",
    littleTip: "La montée est courte mais raide — prévoyez de l'eau, surtout en plein été.",
    indicativeDuration: "45 min",
  },

  // ---------- Îles Elaphites ----------
  {
    slug: "kolocep-island",
    name: "Koločep",
    zone: "elaphiti-islands",
    categories: ["quartiers-balades"],
    lat: 42.6625, lng: 18.0319,
    description: "La plus proche des îles Elaphites, sans voitures, couverte de pins et d'oliviers, avec deux petits villages de pêcheurs reliés par un sentier côtier.",
    whyVisit: "L'île la plus paisible des Elaphites, idéale pour une baignade loin de toute circulation.",
    littleTip: "Le sentier entre les deux villages de l'île, Donje Čelo et Gornje Čelo, se parcourt en moins d'une heure.",
    indicativeDuration: "demi-journée",
  },
  {
    slug: "lopud-island",
    name: "Lopud",
    zone: "elaphiti-islands",
    categories: ["incontournables", "quartiers-balades"],
    lat: 42.6797, lng: 17.9636,
    description: "Une île sans voitures avec un unique village au charme désuet, bordée de couvents en ruine et de jardins subtropicaux légués par d'anciens capitaines au long cours.",
    whyVisit: "La plus belle des îles Elaphites pour une balade, mêlant patrimoine architectural et nature préservée.",
    littleTip: "Le monastère franciscain du XVe siècle, en bord de mer, abrite un jardin de cactus et palmiers à découvrir.",
    indicativeDuration: "demi-journée",
  },
  {
    slug: "sunj-beach-lopud",
    name: "Plage de Šunj",
    zone: "elaphiti-islands",
    categories: ["incontournables", "quartiers-balades"],
    lat: 42.6766, lng: 17.9611,
    description: "Une plage de sable rare en Croatie, avec une eau peu profonde sur plusieurs dizaines de mètres, nichée dans une baie protégée de l'autre côté de l'île de Lopud.",
    whyVisit: "L'une des rares vraies plages de sable de la région, idéale pour les familles avec jeunes enfants.",
    littleTip: "Un petit train électrique relie le village de Lopud à la plage à travers l'île, sinon comptez 20 minutes à pied.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "sipan-island",
    name: "Šipan",
    zone: "elaphiti-islands",
    categories: ["quartiers-balades"],
    lat: 42.7261, lng: 17.8508,
    description: "La plus grande des îles Elaphites, couverte de vergers d'oliviers et de vignes, avec les ruines de dizaines de résidences d'été de la noblesse de Dubrovnik.",
    whyVisit: "L'île la plus authentique et la moins touristique des Elaphites, pour une immersion rurale croate.",
    littleTip: "Le village de Šipanska Luka, au fond d'une baie abritée, concentre l'essentiel des restaurants de poisson de l'île.",
    indicativeDuration: "demi-journée",
  },
  {
    slug: "elaphiti-boat-tour",
    name: "Excursion en bateau aux îles Elaphites",
    zone: "elaphiti-islands",
    categories: ["experiences-insolites", "incontournables"],
    lat: 42.6700, lng: 18.0000,
    description: "Une excursion classique à la journée reliant Koločep, Lopud et Šipan, souvent avec déjeuner de poisson à bord et arrêts baignade entre les îles.",
    whyVisit: "La façon la plus simple de voir les trois îles Elaphites en une seule journée sans louer de bateau.",
    littleTip: "Les excursions dites « Island hopping » partent tôt le matin du vieux port — réservez la veille en haute saison.",
    indicativeDuration: "journée complète",
  },

  // ---------- Mljet ----------
  {
    slug: "mljet-national-park",
    name: "Parc national de Mljet",
    zone: "mljet",
    categories: ["incontournables", "quartiers-balades"],
    lat: 42.7750, lng: 17.5917,
    description: "La partie occidentale de l'île de Mljet, classée parc national depuis 1960, dominée par deux lacs salés entourés de pinèdes denses.",
    whyVisit: "L'une des îles les plus vertes et les moins développées de Croatie, à l'écart du tourisme de masse.",
    littleTip: "Le billet d'entrée au parc national inclut souvent la traversée en bateau vers l'îlot Sainte-Marie.",
    indicativeDuration: "journée complète",
  },
  {
    slug: "odysseus-cave-mljet",
    name: "Grotte d'Ulysse",
    zone: "mljet",
    categories: ["experiences-insolites", "quartiers-balades"],
    lat: 42.7458, lng: 17.6356,
    description: "Une grotte marine que la légende locale associe au naufrage d'Ulysse chez la nymphe Calypso dans l'Odyssée, accessible à la nage ou en petit bateau.",
    whyVisit: "Une baignade dans une grotte à la lumière turquoise spectaculaire, chargée de légende homérique.",
    littleTip: "La lumière est la plus belle en milieu de journée, quand le soleil est au plus haut au-dessus de l'ouverture.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "veliko-jezero",
    name: "Veliko Jezero (Grand Lac)",
    zone: "mljet",
    categories: ["quartiers-balades", "points-de-vue"],
    lat: 42.7764, lng: 17.5883,
    description: "Le plus grand des deux lacs salés du parc national de Mljet, relié à la mer par un étroit chenal, entouré d'un sentier cyclable et piéton ombragé.",
    whyVisit: "Un plan d'eau paisible et chaud pour se baigner, très différent de l'Adriatique ouverte.",
    littleTip: "Le tour complet du lac à vélo prend environ 1h30 à 2h, location possible près de l'entrée du parc.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "st-mary-island-mljet",
    name: "Îlot Sainte-Marie et monastère bénédictin",
    zone: "mljet",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 42.7770, lng: 17.5870,
    description: "Un îlot au cœur du Veliko Jezero, occupé par un monastère bénédictin du XIIe siècle aujourd'hui transformé en restaurant, accessible uniquement en bateau.",
    whyVisit: "L'un des cadres les plus romantiques de Croatie, un monastère médiéval posé au milieu d'un lac salé.",
    littleTip: "Un petit bateau navette fait l'aller-retour depuis le rivage toutes les 30 minutes environ en saison.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "mljet-cycling",
    name: "Balade à vélo autour des lacs de Mljet",
    zone: "mljet",
    categories: ["experiences-insolites"],
    lat: 42.7750, lng: 17.5917,
    description: "Un parcours à vélo plat et ombragé le long des deux lacs du parc national, avec arrêts baignade à volonté.",
    whyVisit: "La meilleure façon de profiter pleinement du parc national sur une journée, à son propre rythme.",
    littleTip: "Les vélos se louent directement à l'entrée du parc national, à Pristanište.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "polace-pomena-mljet",
    name: "Polače et Pomena",
    zone: "mljet",
    categories: ["quartiers-balades"],
    lat: 42.7822, lng: 17.6306,
    description: "Les deux petits ports d'entrée du parc national de Mljet, Polače avec ses ruines d'un palais romain du IVe siècle et Pomena niché dans une crique abritée.",
    whyVisit: "Les points de départ incontournables pour explorer le parc national, chacun avec son propre charme.",
    littleTip: "Les ruines romaines de Polače, en accès libre près du port, sont souvent ignorées des visiteurs pressés d'entrer dans le parc.",
    indicativeDuration: "1h",
  },

  // ---------- Korčula ----------
  {
    slug: "korcula-old-town",
    name: "Vieille ville de Korčula",
    zone: "korcula",
    categories: ["incontournables", "quartiers-balades"],
    lat: 42.9606, lng: 17.1350,
    description: "Une ville fortifiée en forme d'arête de poisson sur une péninsule, avec des rues perpendiculaires conçues pour capter la brise marine et limiter le vent froid.",
    whyVisit: "Souvent surnommée la « petite Dubrovnik », avec une ambiance nettement plus authentique et moins de foule.",
    littleTip: "Le plan urbain en arête de poisson est un chef-d'œuvre d'urbanisme médiéval pensé pour la ventilation naturelle.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "marco-polo-house",
    name: "Maison de Marco Polo",
    zone: "korcula",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 42.9608, lng: 17.1354,
    description: "Une maison-tour que la tradition locale présente comme le lieu de naissance de Marco Polo, bien que l'historicité de cette affirmation reste débattue par les historiens.",
    whyVisit: "Une légende locale tenace à découvrir avec un peu de recul critique, dans une tour médiévale authentique.",
    littleTip: "Montez au sommet de la tour pour une belle vue sur les toits de la vieille ville, l'intérieur muséal reste modeste.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "st-mark-cathedral-korcula",
    name: "Cathédrale Saint-Marc",
    zone: "korcula",
    categories: ["temples-patrimoine"],
    lat: 42.9607, lng: 17.1351,
    description: "Une cathédrale gothique-renaissance en pierre locale de Korčula, réputée pour sa qualité, qui a aussi servi à construire une partie de la Maison Blanche à Washington.",
    whyVisit: "Un exemple remarquable de l'architecture religieuse dalmate, avec une pierre locale exportée jusqu'aux États-Unis.",
    littleTip: "Le trésor de la cathédrale, dans le palais épiscopal voisin, conserve un tableau attribué à Tintoret.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "moreska-sword-dance",
    name: "Danse de l'épée Moreška",
    zone: "korcula",
    categories: ["experiences-insolites", "incontournables"],
    lat: 42.9606, lng: 17.1350,
    description: "Une danse-spectacle traditionnelle en costumes mettant en scène un combat chorégraphié à l'épée entre deux rois rivaux, dansée à Korčula depuis au moins le XVIe siècle.",
    whyVisit: "L'une des traditions folkloriques les plus spectaculaires et les mieux préservées de Croatie.",
    littleTip: "Des représentations pour touristes ont lieu en été à heures fixes — vérifiez le calendrier affiché en vieille ville.",
    indicativeDuration: "1h",
  },
  {
    slug: "korcula-city-walls",
    name: "Tours et remparts de Korčula",
    zone: "korcula",
    categories: ["temples-patrimoine", "points-de-vue"],
    lat: 42.9609, lng: 17.1346,
    description: "Les vestiges des fortifications qui protégeaient autrefois intégralement la vieille ville, dont certaines tours accueillent aujourd'hui cafés et galeries.",
    whyVisit: "Un aperçu de la puissance défensive de Korčula à l'époque où elle rivalisait commercialement avec Dubrovnik.",
    littleTip: "La tour Revelin, la plus impressionnante, offre une vue d'ensemble sur le plan en arête de poisson de la ville.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "lumbarda-beaches",
    name: "Plages de Lumbarda",
    zone: "korcula",
    categories: ["quartiers-balades"],
    lat: 42.9311, lng: 17.1850,
    description: "Un village viticole à la pointe sud-est de l'île de Korčula, entouré de plages de sable rares en Dalmatie, dont la célèbre Vela Pržina au sable presque blanc.",
    whyVisit: "L'une des meilleures options de plage de sable de toute la région, à 15 minutes de la vieille ville de Korčula.",
    littleTip: "Le cépage local Grk, cultivé uniquement autour de Lumbarda, se déguste directement dans les petites caves du village.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "korcula-wine-tasting",
    name: "Dégustation de vin à Korčula (Grk, Pošip)",
    zone: "korcula",
    categories: ["experiences-insolites"],
    lat: 42.9500, lng: 17.1500,
    description: "Une dégustation dans les vignobles de l'île de Korčula, berceau de deux cépages blancs autochtones rares, le Grk et le Pošip.",
    whyVisit: "Deux vins blancs que l'on ne trouve pratiquement nulle part ailleurs au monde, à déguster directement chez le producteur.",
    littleTip: "Le village de Smokvica est le berceau historique du Pošip, avec plusieurs petites caves familiales ouvertes à la dégustation.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "vela-luka-korcula",
    name: "Vela Luka",
    zone: "korcula",
    categories: ["quartiers-balades"],
    lat: 42.9586, lng: 16.7194,
    description: "La deuxième ville de l'île de Korčula, au fond d'une longue baie abritée à l'ouest, avec une ambiance plus locale et moins touristique que la vieille ville.",
    whyVisit: "Le vrai visage non touristique de l'île de Korčula, pour qui veut sortir des circuits classiques.",
    littleTip: "C'est le point de départ le plus pratique pour visiter la grotte préhistorique de Vela Spila, juste au-dessus de la ville.",
    indicativeDuration: "1h à 2h",
  },
  {
    slug: "vela-spila-cave",
    name: "Grotte de Vela Spila",
    zone: "korcula",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 42.9583, lng: 16.7208,
    description: "Un site archéologique majeur surplombant Vela Luka, occupé sans interruption depuis environ 20 000 ans, qui a livré certains des plus anciens vestiges humains d'Adriatique.",
    whyVisit: "L'un des sites préhistoriques les plus importants de Croatie, dans une grotte à la vue spectaculaire sur la baie.",
    littleTip: "Les fouilles sont toujours actives certains étés — vous pourrez parfois voir des archéologues au travail.",
    indicativeDuration: "1h",
  },

  // ---------- Pelješac & Ston ----------
  {
    slug: "ston-walls",
    name: "Remparts de Ston",
    zone: "peljesac-ston",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 42.8417, lng: 17.6975,
    description: "La deuxième plus longue fortification continue d'Europe après la Grande Muraille de Chine, construite par la République de Raguse pour protéger ses précieux marais salants.",
    whyVisit: "Une randonnée fortifiée spectaculaire, nettement moins fréquentée que les remparts de Dubrovnik.",
    littleTip: "La montée est raide mais sans ombre — partez tôt le matin ou en fin de journée en été.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "ston-salt-pans",
    name: "Marais salants de Ston",
    zone: "peljesac-ston",
    categories: ["incontournables", "experiences-insolites"],
    lat: 42.8364, lng: 17.6986,
    description: "Les plus anciens marais salants encore en activité d'Europe, exploités selon des méthodes quasiment inchangées depuis l'époque romaine.",
    whyVisit: "Un savoir-faire artisanal millénaire toujours vivant, qui a autrefois fait la richesse de la République de Raguse.",
    littleTip: "La boutique sur place vend le sel récolté à la main, un souvenir authentique et utile.",
    indicativeDuration: "1h",
  },
  {
    slug: "mali-ston-oysters",
    name: "Dégustation d'huîtres à Mali Ston",
    zone: "peljesac-ston",
    categories: ["experiences-insolites", "restaurants"],
    lat: 42.8508, lng: 17.7069,
    description: "Le petit port voisin de Ston, réputé depuis l'Antiquité pour l'élevage d'huîtres et de moules dans les eaux calmes et riches en nutriments de son canal.",
    whyVisit: "L'une des meilleures adresses d'Europe pour déguster des huîtres fraîchement sorties de l'eau.",
    littleTip: "Les huîtres se dégustent idéalement crues avec un simple filet de citron, directement sur les quais.",
    indicativeDuration: "1h30",
    indicativePrice: "$$$",
  },
  {
    slug: "peljesac-vineyards",
    name: "Vignobles de Pelješac (Dingač)",
    zone: "peljesac-ston",
    categories: ["experiences-insolites"],
    lat: 42.9306, lng: 17.3833,
    description: "Les vignobles en terrasses escarpées de la péninsule de Pelješac, berceau du Dingač, l'un des vins rouges les plus réputés et les plus chers de Croatie.",
    whyVisit: "Un paysage viticole spectaculaire à flanc de falaise, avec des vins rouges puissants typiques du climat méditerranéen.",
    littleTip: "Les vignes de Dingač, exposées plein sud face à la mer, sont parmi les plus difficiles à cultiver et récolter d'Europe.",
    indicativeDuration: "2h (avec dégustation)",
  },
  {
    slug: "orebic",
    name: "Orebić",
    zone: "peljesac-ston",
    categories: ["quartiers-balades", "points-de-vue"],
    lat: 42.9742, lng: 17.1814,
    description: "Une ville balnéaire sur la péninsule de Pelješac, ancien fief des capitaines au long cours, face à la vieille ville de Korčula de l'autre côté du détroit.",
    whyVisit: "Une belle vue sur Korčula depuis la plage, et un point de départ pratique pour le ferry rapide vers l'île.",
    littleTip: "Le ferry vers Korčula ne prend que 15-20 minutes — une excursion facile à improviser depuis Orebić.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "viganj-windsurfing",
    name: "Viganj (planche à voile et kitesurf)",
    zone: "peljesac-ston",
    categories: ["experiences-insolites"],
    lat: 42.9694, lng: 17.0908,
    description: "Un petit village de la péninsule de Pelješac devenu l'un des spots de planche à voile et de kitesurf les plus réputés d'Europe, grâce à un vent thermique régulier.",
    whyVisit: "Des conditions de vent exceptionnelles qui attirent des pratiquants du monde entier, débutants comme confirmés.",
    littleTip: "Plusieurs écoles proposent des cours d'initiation d'une demi-journée, même sans expérience préalable.",
    indicativeDuration: "demi-journée",
  },
  {
    slug: "peljesac-bridge",
    name: "Pont de Pelješac",
    zone: "peljesac-ston",
    categories: ["incontournables", "points-de-vue"],
    lat: 42.9847, lng: 17.5981,
    description: "Un pont à haubans de 2,4 km achevé en 2022, qui relie pour la première fois la péninsule de Pelješac au continent sans passer par le corridor bosnien de Neum.",
    whyVisit: "Un symbole d'ingénierie moderne spectaculaire, financé en grande partie par l'Union européenne.",
    littleTip: "Une aire de repos avec vue dégagée sur le pont se trouve juste avant son entrée côté continent.",
    indicativeDuration: "15 à 20 min (passage)",
  },

  // ---------- Cavtat ----------
  {
    slug: "cavtat-old-town",
    name: "Vieille ville de Cavtat",
    zone: "cavtat",
    categories: ["incontournables", "quartiers-balades"],
    lat: 42.5814, lng: 18.2156,
    description: "Une ancienne colonie grecque puis romaine (Epidaurum) devenue une charmante petite ville côtière, souvent visitée en escale depuis Dubrovnik.",
    whyVisit: "Une alternative plus paisible et tout aussi pittoresque à Dubrovnik, à 30 minutes en bateau ou en voiture.",
    littleTip: "Cavtat était en réalité la ville romaine d'origine, avant que ses habitants ne fondent Dubrovnik en fuyant les invasions slaves.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "cavtat-waterfront",
    name: "Front de mer de Cavtat",
    zone: "cavtat",
    categories: ["quartiers-balades", "points-de-vue"],
    lat: 42.5806, lng: 18.2156,
    description: "Une promenade bordée de palmiers encerclant la petite péninsule de Cavtat, avec restaurants de poisson en terrasse et vue sur la baie.",
    whyVisit: "L'une des plus belles promenades côtières de la région, sans les foules de Dubrovnik.",
    littleTip: "Le coucher de soleil vu depuis la pointe de la péninsule, face à l'ouest, est particulièrement réussi.",
    indicativeDuration: "1h",
  },
  {
    slug: "bukovac-house-cavtat",
    name: "Maison natale de Vlaho Bukovac",
    zone: "cavtat",
    categories: ["temples-patrimoine"],
    lat: 42.5806, lng: 18.2169,
    description: "La maison natale de Vlaho Bukovac, l'un des plus grands peintres croates du XIXe siècle, transformée en galerie consacrée à son œuvre.",
    whyVisit: "Une collection d'art croate de qualité, dans la maison d'enfance même de l'artiste.",
    littleTip: "Les plafonds peints par Bukovac lui-même, dans la maison, valent autant le détour que les toiles exposées.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "racic-mausoleum",
    name: "Mausolée de la famille Račić",
    zone: "cavtat",
    categories: ["temples-patrimoine"],
    lat: 42.5775, lng: 18.2142,
    description: "Un mausolée Art déco sculpté par Ivan Meštrović, le plus grand sculpteur croate du XXe siècle, dominant le cimetière de Cavtat au sommet d'une colline.",
    whyVisit: "Une œuvre majeure du plus grand sculpteur croate, dans un cadre serein avec vue sur la baie.",
    littleTip: "La montée vers le cimetière, par un chemin ombragé, offre déjà une belle vue sur Cavtat en contrebas.",
    indicativeDuration: "45 min",
  },
  {
    slug: "rat-peninsula-cavtat",
    name: "Péninsule de Rat",
    zone: "cavtat",
    categories: ["quartiers-balades", "points-de-vue"],
    lat: 42.5783, lng: 18.2211,
    description: "La petite péninsule boisée fermant la baie de Cavtat côté est, avec un sentier côtier ombragé et des criques tranquilles pour se baigner.",
    whyVisit: "Une balade facile et ombragée, rare sur cette côte autrement très ensoleillée.",
    littleTip: "Plusieurs criques rocheuses le long du sentier sont idéales pour une baignade sans la foule du front de mer.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "bugenvila-restaurant-cavtat",
    name: "Restaurant Bugenvila",
    zone: "cavtat",
    categories: ["restaurants"],
    lat: 42.5811, lng: 18.2158,
    description: "Un restaurant en bord de mer à Cavtat réputé pour sa cuisine dalmate revisitée, avec une terrasse donnant directement sur la baie.",
    whyVisit: "Une cuisine dalmate soignée dans un cadre maritime, à des prix plus doux qu'en vieille ville de Dubrovnik.",
    littleTip: "La terrasse en bord d'eau se réserve à l'avance les soirs d'été, surtout au coucher du soleil.",
    indicativeDuration: "1h30 à 2h",
    indicativePrice: "$$$",
  },
];

const ZONE_DEFS = [
  {
    slug: "dubrovnik-old-town",
    name: "Vieille ville de Dubrovnik",
    mapColor: "#a8422c",
    vibeText: "Le cœur historique fortifié de Dubrovnik, classé à l'UNESCO, entre remparts, palais Renaissance et ruelles de calcaire poli.",
    prosText: "Une densité exceptionnelle de patrimoine dans un espace compact, entièrement piéton.",
    consText: "Très touristique en haute saison, surtout aux heures de débarquement des bateaux de croisière.",
    transportText: "Entièrement piéton — les voitures restent hors les murs, parkings payants à proximité des portes.",
    nearbyText: "Lokrum est à 10 minutes en bateau depuis le vieux port, juste derrière la Porte Ploče.",
    profileFitText: "Incontournable pour tout séjour à Dubrovnik, quel que soit le profil de voyage.",
    hotelAdviceText: "Les hébergements en vieille ville sont rares et chers — beaucoup de visiteurs logent à Lapad ou Ploče et viennent à pied.",
  },
  {
    slug: "dubrovnik-beyond-walls",
    name: "Dubrovnik hors les murs",
    mapColor: "#2e86ab",
    vibeText: "Le Dubrovnik du quotidien, entre quartiers résidentiels de Lapad, plages locales et campagne de Konavle, loin de la carte postale de la vieille ville.",
    prosText: "Hébergements plus abordables, plages plus spacieuses, ambiance plus locale.",
    consText: "Nécessite un bus ou une voiture pour la plupart des sites, moins de patrimoine architectural concentré.",
    transportText: "Bus locaux fréquents vers la vieille ville depuis Lapad (15-20 min) ; voiture recommandée pour Konavle et Trsteno.",
    nearbyText: "La vieille ville reste accessible en 15-20 minutes de bus depuis la plupart de ces quartiers.",
    profileFitText: "Pour loger à prix plus doux ou prendre un peu de recul sur l'agitation touristique de la vieille ville.",
    hotelAdviceText: "Lapad offre le meilleur rapport qualité-prix, avec un accès direct à la mer et aux bus vers la vieille ville.",
  },
  {
    slug: "lokrum",
    name: "Lokrum",
    mapColor: "#3f8c5a",
    vibeText: "Une petite île-réserve naturelle à 10 minutes de bateau de Dubrovnik, sans habitants permanents, peuplée de paons en liberté.",
    prosText: "Excursion la plus rapide et la plus simple depuis Dubrovnik, nature préservée.",
    consText: "Pas d'hébergement sur place, dernier bateau de retour relativement tôt en soirée.",
    transportText: "Navettes en bateau fréquentes depuis le vieux port de Dubrovnik, environ 10 minutes de traversée.",
    nearbyText: "Visitable en demi-journée en complément d'une matinée ou après-midi dans la vieille ville.",
    profileFitText: "Pour une parenthèse nature rapide, sans organisation complexe ni location de bateau.",
    hotelAdviceText: "Aucun hébergement sur l'île — à visiter en journée depuis Dubrovnik.",
  },
  {
    slug: "elaphiti-islands",
    name: "Îles Elaphites",
    mapColor: "#c9972e",
    vibeText: "Un archipel de trois îles sans voitures au large de Dubrovnik — Koločep, Lopud et Šipan — entre villages de pêcheurs endormis et jardins subtropicaux.",
    prosText: "Une Croatie insulaire authentique et peu développée, à moins d'une heure de bateau de Dubrovnik.",
    consText: "Liaisons en bateau moins fréquentes hors saison, peu d'infrastructures touristiques.",
    transportText: "Ferries publics et excursions privées depuis le port de Gruž (Dubrovnik) vers les trois îles.",
    nearbyText: "Les trois îles se visitent bien en une seule excursion à la journée depuis Dubrovnik.",
    profileFitText: "Pour les amateurs d'îles tranquilles et de plages préservées, loin du tourisme de masse.",
    hotelAdviceText: "Quelques hébergements existent sur Lopud, pour qui veut une vraie coupure insulaire d'une ou deux nuits.",
  },
  {
    slug: "mljet",
    name: "Mljet",
    mapColor: "#6fae7c",
    vibeText: "Une île largement couverte de forêts, dont la moitié ouest forme un parc national construit autour de deux lacs salés d'un bleu profond.",
    prosText: "L'une des îles les plus vertes et les moins développées de Croatie, idéale pour la nature et le vélo.",
    consText: "Accès plus long depuis Dubrovnik (ferry d'environ 1h30), à prévoir sur une journée complète.",
    transportText: "Ferry ou catamaran depuis Dubrovnik (port de Gruž) vers Pomena ou Sobra, environ 1h15 à 1h30.",
    nearbyText: "Se combine bien avec une excursion vers Korčula si le temps le permet.",
    profileFitText: "Pour une journée nature intense, entre baignade en lac salé et vélo en forêt.",
    hotelAdviceText: "Peu d'hébergements près du parc national — la plupart des visiteurs viennent à la journée depuis Dubrovnik.",
  },
  {
    slug: "korcula",
    name: "Korčula",
    mapColor: "#d6479a",
    vibeText: "Une île viticole surnommée la « petite Dubrovnik », avec une vieille ville fortifiée en arête de poisson et des cépages blancs rares introuvables ailleurs.",
    prosText: "Patrimoine comparable à Dubrovnik avec nettement moins de foule, bonne gastronomie et vin.",
    consText: "Trajet depuis Dubrovnik assez long (ferry ou route via Pelješac), à prévoir sur une journée ou plus.",
    transportText: "Ferry rapide depuis Dubrovnik (environ 2h) ou route jusqu'à Orebić puis ferry de 15-20 minutes.",
    nearbyText: "Lumbarda et Vela Luka se visitent facilement en complément de la vieille ville, en voiture ou bus local.",
    profileFitText: "Pour les amateurs de patrimoine, de vin et de plages de sable, sur une étape d'une ou deux nuits.",
    hotelAdviceText: "La vieille ville et Lumbarda offrent les meilleures bases, selon que l'on préfère le patrimoine ou la plage.",
  },
  {
    slug: "peljesac-ston",
    name: "Pelješac & Ston",
    mapColor: "#8f2d2d",
    vibeText: "Une péninsule montagneuse réputée pour ses vins rouges puissants, ses huîtres et les plus longs remparts d'Europe après la Grande Muraille de Chine, à Ston.",
    prosText: "Vin, gastronomie et patrimoine fortifié impressionnant, nettement moins fréquenté que Dubrovnik.",
    consText: "Nécessite une voiture pour profiter pleinement de la péninsule, peu de transports en commun.",
    transportText: "Environ 1h à 1h15 de route depuis Dubrovnik via le nouveau pont de Pelješac.",
    nearbyText: "Orebić, à la pointe de la péninsule, permet un ferry rapide vers Korčula en 15-20 minutes.",
    profileFitText: "Pour les amateurs de vin, de fruits de mer et de randonnée fortifiée, idéalement avec une voiture.",
    hotelAdviceText: "Orebić offre le meilleur compromis entre plage, vue sur Korčula et accès à la péninsule.",
  },
  {
    slug: "cavtat",
    name: "Cavtat",
    mapColor: "#2a7a8c",
    vibeText: "L'ancienne cité romaine d'Epidaurum, devenue une charmante petite ville côtière au sud de Dubrovnik, souvent visitée en escale.",
    prosText: "Une alternative paisible à Dubrovnik, avec un vrai patrimoine historique et artistique propre.",
    consText: "Moins de sites qu'à Dubrovnik même, se visite bien en une demi-journée plutôt qu'en séjour complet.",
    transportText: "Environ 30 minutes de route ou de bateau depuis Dubrovnik ; navettes maritimes régulières en saison.",
    nearbyText: "L'aéroport de Dubrovnik se trouve à seulement 5 minutes de Cavtat, pratique en fin de séjour.",
    profileFitText: "Pour une excursion paisible depuis Dubrovnik, ou une dernière étape avant un vol depuis l'aéroport voisin.",
    hotelAdviceText: "Cavtat offre un bon compromis prix/calme pour qui veut éviter de loger en plein cœur de Dubrovnik.",
  },
];

async function main() {
  console.log("Seeding Dubrovnik destination…");

  const croatie = await prisma.country.upsert({
    where: { slug: "croatie" },
    update: {},
    create: { slug: "croatie", name: "Croatie" },
  });

  const dubrovnik = await prisma.destination.upsert({
    where: { slug: "dubrovnik" },
    update: { status: "PUBLISHED" },
    create: {
      countryId: croatie.id,
      slug: "dubrovnik",
      name: "Dubrovnik",
      kind: "CITY",
      size: "LARGE",
      status: "PUBLISHED",
    },
  });

  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const ENABLED_CATEGORIES = [
    "incontournables", "temples-patrimoine", "quartiers-balades", "experiences-insolites",
    "activites-famille", "restaurants", "street-food", "cafes-brunchs", "bars-rooftops",
    "marches", "shopping", "points-de-vue",
  ];
  await prisma.destination.update({
    where: { id: dubrovnik.id },
    data: {
      categories: {
        set: ENABLED_CATEGORIES.map((slug) => ({ id: categoryBySlug.get(slug)!.id })),
      },
    },
  });

  const zoneBySlug = new Map<string, { id: string }>();
  for (const z of ZONE_DEFS) {
    const zone = await prisma.zone.upsert({
      where: { destinationId_slug: { destinationId: dubrovnik.id, slug: z.slug } },
      update: {
        name: z.name, mapColor: z.mapColor, vibeText: z.vibeText, prosText: z.prosText,
        consText: z.consText, transportText: z.transportText, nearbyText: z.nearbyText,
        profileFitText: z.profileFitText, hotelAdviceText: z.hotelAdviceText,
      },
      create: { destinationId: dubrovnik.id, ...z },
    });
    zoneBySlug.set(z.slug, zone);
  }

  let manifest: PhotoManifestEntry[] = [];
  try {
    manifest = JSON.parse(
      await readFile(
        "/private/tmp/claude-501/-Users-constance/8b5fbae2-2d1e-4365-aae7-917e8137a620/scratchpad/photos_dubrovnik/manifest.json",
        "utf-8"
      )
    );
  } catch {
    console.log("No photo manifest found yet — seeding without photos.");
  }

  // Final accepted photos live in seed-assets/dubrovnik-photos/<slug>.jpg
  // (resized, false positives already excluded) — same pattern as
  // seed-new-york.ts / seed-miami.ts / seed-floride.ts. The Dockerfile
  // bakes this folder into storage/photos at build time.
  const PHOTOS_DIR = "seed-assets/dubrovnik-photos";

  let photoCount = 0;
  for (const def of PLACES) {
    let photoId: string | null = null;
    if (GOOD_KEYS.has(def.slug)) {
      const entry = manifest.find((m) => m.slug === def.slug && m.found && m.local_path);
      const srcPath = join(PHOTOS_DIR, `${def.slug}.jpg`);
      if (entry) {
        const storageKey = `photos/${def.slug}.jpg`;
        const destPath = join(STORAGE_ROOT, storageKey);
        await mkdir(dirname(destPath), { recursive: true });
        await copyFile(srcPath, destPath);
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
        name: def.name, destinationId: dubrovnik.id, zoneId: zone?.id, status: "PUBLISHED",
        lat: def.lat, lng: def.lng, description: def.description, whyVisit: def.whyVisit,
        littleTip: def.littleTip, indicativeDuration: def.indicativeDuration,
        indicativePrice: def.indicativePrice, isFictionalDemo: false,
      },
      create: {
        slug: def.slug, destinationId: dubrovnik.id, zoneId: zone?.id, name: def.name,
        status: "PUBLISHED", lat: def.lat, lng: def.lng, description: def.description,
        whyVisit: def.whyVisit, littleTip: def.littleTip, indicativeDuration: def.indicativeDuration,
        indicativePrice: def.indicativePrice, isFictionalDemo: false,
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

  console.log(`Dubrovnik seed complete: ${PLACES.length} places, ${photoCount} with real photos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
