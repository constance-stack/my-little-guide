/**
 * Rome — first Italy destination, built from the admin "Nouvelle
 * destination" request queue: "tous les classiques de Rome et autour
 * capital donc beaucoup d'adresse" (100 places targeted). Covers the
 * historic centre, the Colosseum/Forum, the Vatican, Trastevere, and
 * two genuine day-trip excursions captured by "autour" — Tivoli and
 * Ostia Antica. Same pattern as every other destination: real places,
 * real coordinates, Wikimedia Commons photos only when a genuine match
 * exists, no zoos (Villa Borghese is described for its park, gallery
 * and little lake, never the Bioparco), restaurants priced across
 * every range.
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
  // ---------- Centro Storico ----------
  {
    slug: "pantheon-roma",
    name: "Panthéon",
    zone: "centro-storico",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 41.8986, lng: 12.4769,
    description: "Un temple romain antique du IIe siècle devenu église, dont la coupole en béton non armé, percée d'un oculus, reste la plus grande au monde construite sans armature.",
    whyVisit: "Le monument antique le mieux conservé de Rome, et un prodige d'ingénierie resté inégalé pendant presque deux mille ans.",
    littleTip: "Levez les yeux vers l'oculus un jour de pluie : l'eau tombe directement dans l'édifice par un système de drainage dissimulé dans le sol.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "piazza-navona",
    name: "Piazza Navona",
    zone: "centro-storico",
    categories: ["incontournables", "quartiers-balades"],
    lat: 41.8992, lng: 12.4731,
    description: "Une place baroque animée construite sur un ancien stade romain, dominée par la Fontaine des Quatre Fleuves sculptée par le Bernin.",
    whyVisit: "L'une des plus belles places de Rome, avec trois fontaines monumentales et une ambiance animée à toute heure.",
    littleTip: "La forme allongée et incurvée de la place révèle encore clairement le tracé de l'ancien stade antique sur lequel elle fut bâtie.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "fontana-trevi",
    name: "Fontana di Trevi",
    zone: "centro-storico",
    categories: ["incontournables"],
    lat: 41.9009, lng: 12.4833,
    description: "La plus grande et célèbre fontaine baroque de Rome, achevée en 1762, qui met en scène Neptune triomphant au milieu de chevaux marins sculptés.",
    whyVisit: "L'image la plus iconique de Rome, immortalisée par le cinéma et visitée par des millions de personnes chaque année.",
    littleTip: "La tradition veut qu'on jette une pièce par-dessus l'épaule gauche dans la fontaine pour être assuré de revenir un jour à Rome.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "via-coronari",
    name: "Via dei Coronari",
    zone: "centro-storico",
    categories: ["quartiers-balades", "shopping"],
    lat: 41.9010, lng: 12.4710,
    description: "Une rue pavée pittoresque bordée d'antiquaires et de galeries d'art, l'une des plus anciennes du centre historique de Rome.",
    whyVisit: "Une balade charmante loin de la foule, pour les amateurs d'antiquités et d'architecture Renaissance.",
    littleTip: "Les devantures d'antiquaires valent le détour même sans acheter, pour observer meubles et objets d'époque.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "chiesa-sant-ignazio",
    name: "Chiesa di Sant'Ignazio",
    zone: "centro-storico",
    categories: ["temples-patrimoine"],
    lat: 41.8982, lng: 12.4797,
    description: "Une église baroque célèbre pour sa fresque en trompe-l'œil au plafond, qui crée l'illusion d'une coupole inexistante vue depuis le centre de la nef.",
    whyVisit: "Une des plus belles illusions d'optique baroques de Rome, gratuite et peu fréquentée.",
    littleTip: "Un petit miroir est posé au sol au centre de la nef pour admirer confortablement la fresque du plafond sans se tordre le cou.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "chiesa-san-luigi-francesi",
    name: "Chiesa di San Luigi dei Francesi",
    zone: "centro-storico",
    categories: ["temples-patrimoine"],
    lat: 41.8996, lng: 12.4756,
    description: "Une église française de Rome qui abrite trois tableaux majeurs du Caravage consacrés à saint Matthieu, dans la chapelle Contarelli.",
    whyVisit: "Voir trois chefs-d'œuvre du Caravage gratuitement, sans la foule des grands musées.",
    littleTip: "Apportez des pièces pour l'éclairage automatique de la chapelle, qui s'éteint après quelques minutes.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "palazzo-altemps",
    name: "Palazzo Altemps",
    zone: "centro-storico",
    categories: ["temples-patrimoine"],
    lat: 41.9015, lng: 12.4725,
    description: "Un palais Renaissance abritant une collection de sculptures antiques remarquable, annexe du Museo Nazionale Romano, nettement moins fréquentée que les grands musées.",
    whyVisit: "Une collection de sculptures antiques de qualité musée national, dans un cadre de palais intimiste.",
    littleTip: "La cour intérieure Renaissance, à elle seule, justifie une visite même rapide.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "elefantino-bernini",
    name: "Elefantino di Bernini (Piazza della Minerva)",
    zone: "centro-storico",
    categories: ["quartiers-balades", "experiences-insolites"],
    lat: 41.8982, lng: 12.4775,
    description: "Une petite sculpture d'éléphant du Bernin portant un obélisque égyptien sur son dos, devant l'église Santa Maria sopra Minerva.",
    whyVisit: "Un détail baroque amusant et méconnu, juste derrière le Panthéon.",
    littleTip: "L'église derrière abrite le tombeau de sainte Catherine de Sienne et une sculpture du Christ par Michel-Ange.",
    indicativeDuration: "10-15 min",
  },
  {
    slug: "via-del-corso",
    name: "Via del Corso",
    zone: "centro-storico",
    categories: ["shopping", "quartiers-balades"],
    lat: 41.9020, lng: 12.4800,
    description: "L'artère commerçante principale du centre de Rome, qui relie la Piazza del Popolo à la Piazza Venezia sur plus d'un kilomètre.",
    whyVisit: "Le meilleur axe de shopping pour qui veut du choix entre grandes marques et boutiques italiennes.",
    littleTip: "Les petites rues perpendiculaires à la Via del Corso cachent souvent de meilleures boutiques indépendantes que l'avenue elle-même.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "galleria-doria-pamphilj",
    name: "Galleria Doria Pamphilj",
    zone: "centro-storico",
    categories: ["temples-patrimoine"],
    lat: 41.8970, lng: 12.4810,
    description: "Une collection d'art privée exceptionnelle appartenant toujours à la famille Doria Pamphilj, avec des œuvres du Caravage, du Titien et de Vélasquez.",
    whyVisit: "Une des plus riches collections privées d'Europe, dans un palais encore habité par ses propriétaires.",
    littleTip: "Le portrait du pape Innocent X par Vélasquez, considéré comme l'un des plus grands portraits de l'histoire de l'art, s'y trouve en personne.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "area-sacra-largo-argentina",
    name: "Area Sacra di Largo Argentina",
    zone: "centro-storico",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 41.8958, lng: 12.4766,
    description: "Les vestiges de quatre temples romains républicains, découverts en contrebas de la rue moderne, sur le site présumé de l'assassinat de Jules César.",
    whyVisit: "Des ruines antiques spectaculaires visibles gratuitement depuis la rue, en plein centre-ville.",
    littleTip: "Le site abrite aussi un refuge pour chats errants géré par des bénévoles, visible depuis les ruines.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "armando-al-pantheon",
    name: "Armando al Pantheon",
    zone: "centro-storico",
    categories: ["restaurants"],
    lat: 41.8990, lng: 12.4760,
    description: "Un restaurant familial romain tenu par la même famille depuis 1961, à deux pas du Panthéon, réputé pour sa cuisine romaine traditionnelle sans concession touristique.",
    whyVisit: "Une table authentiquement romaine malgré l'emplacement ultra-touristique, avec des classiques comme la carbonara ou l'amatriciana.",
    littleTip: "Réservez impérativement à l'avance — ce petit restaurant familial affiche complet des semaines en avance.",
    indicativeDuration: "1h30",
    indicativePrice: "$$$",
  },
  {
    slug: "palazzo-madama-roma",
    name: "Palazzo Madama",
    zone: "centro-storico",
    categories: ["temples-patrimoine"],
    lat: 41.9003, lng: 12.4740,
    description: "Le siège du Sénat italien depuis 1871, dans un palais Renaissance qui fut autrefois la résidence de Catherine de Médicis avant son mariage avec le roi de France.",
    whyVisit: "Un symbole discret du pouvoir politique italien actuel, dans un cadre historique chargé.",
    littleTip: "La façade se visite uniquement de l'extérieur, le palais n'étant pas ouvert au public en dehors de journées portes ouvertes ponctuelles.",
    indicativeDuration: "10 min",
  },

  // ---------- Colosseo & Fori ----------
  {
    slug: "colosseo",
    name: "Colosseo",
    zone: "colosseo-fori",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 41.8902, lng: 12.4922,
    description: "Le plus grand amphithéâtre jamais construit par l'Empire romain, achevé en 80 après J.-C., qui pouvait accueillir jusqu'à 80 000 spectateurs pour des jeux spectaculaires.",
    whyVisit: "Le symbole le plus universellement reconnu de la Rome antique, et l'un des monuments les plus visités au monde.",
    littleTip: "Réservez le billet combiné incluant l'arène et le sous-sol (hypogée) en ligne plusieurs semaines à l'avance pour éviter la revente à prix fort.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "foro-romano",
    name: "Foro Romano",
    zone: "colosseo-fori",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 41.8925, lng: 12.4853,
    description: "Le centre politique, religieux et commercial de la Rome antique pendant presque mille ans, aujourd'hui un vaste champ de ruines à ciel ouvert.",
    whyVisit: "Marcher littéralement sur les lieux où se décidait le destin de l'Empire romain.",
    littleTip: "Le billet combiné avec le Colisée et le Palatin est valable deux jours consécutifs — répartissez la visite si la chaleur est forte.",
    indicativeDuration: "2h-2h30",
  },
  {
    slug: "palatino",
    name: "Palatino",
    zone: "colosseo-fori",
    categories: ["incontournables", "temples-patrimoine", "points-de-vue"],
    lat: 41.8886, lng: 12.4875,
    description: "La colline où Rome aurait été fondée selon la légende de Romulus et Remus, couverte des vestiges de palais impériaux et offrant une vue dégagée sur le Circus Maximus.",
    whyVisit: "Le berceau mythique de Rome, avec l'une des meilleures vues sur le Circo Massimo depuis les jardins Farnèse.",
    littleTip: "Les Jardins Farnèse, aménagés au XVIe siècle sur les ruines du palais impérial, offrent une pause ombragée bienvenue en été.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "arco-costantino",
    name: "Arco di Costantino",
    zone: "colosseo-fori",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 41.8897, lng: 12.4906,
    description: "Le plus grand arc de triomphe romain conservé, érigé en 315 pour célébrer la victoire de Constantin, juste entre le Colisée et le Palatin.",
    whyVisit: "Un monument spectaculaire souvent photographié en passant entre les deux grands sites voisins.",
    littleTip: "De nombreux reliefs furent récupérés sur des monuments plus anciens — un véritable patchwork de différentes époques impériales.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "fori-imperiali",
    name: "Fori Imperiali",
    zone: "colosseo-fori",
    categories: ["temples-patrimoine", "points-de-vue"],
    lat: 41.8955, lng: 12.4853,
    description: "Un ensemble de forums construits par les empereurs successifs pour étendre le Forum Romain originel, dont le Marché de Trajan, considéré comme le premier centre commercial de l'histoire.",
    whyVisit: "Une vue impressionnante sur des siècles d'urbanisme impérial, visible gratuitement depuis la Via dei Fori Imperiali.",
    littleTip: "Le Marché de Trajan se visite séparément (Musei Fori Imperiali) et offre une vue en hauteur sur l'ensemble du site.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "colonna-traiana",
    name: "Colonna Traiana",
    zone: "colosseo-fori",
    categories: ["temples-patrimoine"],
    lat: 41.8958, lng: 12.4838,
    description: "Une colonne de marbre de 30 mètres couverte d'une frise sculptée en spirale racontant les campagnes militaires de l'empereur Trajan en Dacie.",
    whyVisit: "Un chef-d'œuvre de sculpture narrative romaine, remarquablement bien conservé depuis près de deux mille ans.",
    littleTip: "Les détails de la frise sont difficiles à voir à l'œil nu depuis le sol — des jumelles ou un bon zoom photo aident beaucoup.",
    indicativeDuration: "15 min",
  },
  {
    slug: "vittoriano",
    name: "Altare della Patria (Vittoriano)",
    zone: "colosseo-fori",
    categories: ["incontournables", "points-de-vue"],
    lat: 41.8955, lng: 12.4823,
    description: "Un monument monumental blanc édifié pour l'unification italienne, qui abrite la tombe du Soldat inconnu et offre depuis sa terrasse l'une des meilleures vues gratuites sur Rome.",
    whyVisit: "La terrasse panoramique, accessible par ascenseur payant, offre une vue à 360° sur toute la ville antique et moderne.",
    littleTip: "L'ascenseur de verre qui monte à la terrasse (Roma dal Cielo) offre une vue encore plus large que les marches du monument elles-mêmes.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "campidoglio",
    name: "Campidoglio & Musei Capitolini",
    zone: "colosseo-fori",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 41.8935, lng: 12.4830,
    description: "La plus petite des sept collines de Rome, aménagée par Michel-Ange, abritant les premiers musées publics du monde modernes, fondés en 1471.",
    whyVisit: "Les plus anciens musées publics au monde, avec la statue équestre originale de Marc Aurèle et la louve capitoline.",
    littleTip: "La terrasse derrière le palais sénatorial offre une vue surprenante et peu connue sur le Forum Romain en contrebas.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "bocca-della-verita",
    name: "Bocca della Verità",
    zone: "colosseo-fori",
    categories: ["experiences-insolites", "incontournables"],
    lat: 41.8886, lng: 12.4812,
    description: "Un masque de marbre antique encastré dans le mur de l'église Santa Maria in Cosmedin, selon la légende capable de mordre la main des menteurs qui s'y risquent.",
    whyVisit: "Une tradition romaine amusante popularisée par le film Vacances romaines avec Audrey Hepburn.",
    littleTip: "Il s'agit probablement à l'origine d'une plaque d'égout antique ou d'un masque décoratif de fontaine, détourné en légende au Moyen Âge.",
    indicativeDuration: "10-15 min",
  },
  {
    slug: "circo-massimo",
    name: "Circo Massimo",
    zone: "colosseo-fori",
    categories: ["temples-patrimoine", "activites-famille"],
    lat: 41.8858, lng: 12.4858,
    description: "Le plus grand stade de l'Antiquité romaine, qui pouvait accueillir jusqu'à 150 000 spectateurs pour les courses de chars, aujourd'hui un grand espace vert ouvert.",
    whyVisit: "Un vaste espace vert gratuit en plein centre historique, parfait pour imaginer l'ampleur des spectacles antiques.",
    littleTip: "C'est aussi un lieu de jogging très prisé des Romains au coucher du soleil, avec une vue sur le Palatin.",
    indicativeDuration: "30-45 min",
  },

  // ---------- Vaticano ----------
  {
    slug: "basilica-san-pietro",
    name: "Basilica di San Pietro",
    zone: "vaticano",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 41.9022, lng: 12.4539,
    description: "La plus grande église catholique du monde, construite sur le tombeau présumé de saint Pierre, avec une coupole dessinée par Michel-Ange visible depuis toute la ville.",
    whyVisit: "Le cœur spirituel du catholicisme mondial, et un chef-d'œuvre architectural signé par les plus grands maîtres de la Renaissance.",
    littleTip: "La montée à la coupole (par ascenseur puis escaliers) offre l'une des plus belles vues de tout Rome, mais l'attente peut être longue sans réservation.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "piazza-san-pietro",
    name: "Piazza San Pietro",
    zone: "vaticano",
    categories: ["incontournables", "quartiers-balades"],
    lat: 41.9025, lng: 12.4564,
    description: "Une place ovale monumentale dessinée par le Bernin, entourée d'une colonnade de 284 colonnes représentant symboliquement les bras de l'Église accueillant les fidèles.",
    whyVisit: "L'entrée grandiose du Vatican, où le pape s'adresse aux foules lors de l'angélus dominical.",
    littleTip: "Deux pavés marqués au sol, de part et d'autre de la place, indiquent le point où la colonnade de quatre rangs apparaît optiquement comme une seule rangée.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "musei-vaticani",
    name: "Musei Vaticani",
    zone: "vaticano",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 41.9065, lng: 12.4536,
    description: "Un ensemble de musées parmi les plus riches du monde, qui culmine avec la Chapelle Sixtine et son plafond peint par Michel-Ange.",
    whyVisit: "Une des plus grandes collections d'art au monde, point culminant de toute visite de Rome.",
    littleTip: "Réservez un créneau en ligne plusieurs semaines à l'avance, idéalement en début de matinée, pour éviter des heures de queue.",
    indicativeDuration: "3h-4h",
  },
  {
    slug: "cappella-sistina",
    name: "Cappella Sistina",
    zone: "vaticano",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 41.9029, lng: 12.4545,
    description: "La chapelle papale dont le plafond, peint par Michel-Ange entre 1508 et 1512, est considéré comme l'un des sommets absolus de l'art occidental.",
    whyVisit: "Voir en personne le plafond le plus célèbre de l'histoire de l'art, point d'orgue de la visite des musées du Vatican.",
    littleTip: "Le silence est strictement exigé dans la chapelle — les gardiens font régulièrement \"chut\" face à la foule malgré l'interdiction de parler fort.",
    indicativeDuration: "30-45 min (incluse dans la visite des musées)",
  },
  {
    slug: "castel-sant-angelo",
    name: "Castel Sant'Angelo",
    zone: "vaticano",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 41.9031, lng: 12.4663,
    description: "Un mausolée impérial antique transformé en forteresse papale puis en prison, aujourd'hui musée offrant une vue imprenable sur le Vatican et le Tibre.",
    whyVisit: "Une histoire de presque deux mille ans condensée en un seul monument, avec une des meilleures vues sur Rome.",
    littleTip: "La terrasse sommitale, où se déroule le dernier acte de l'opéra Tosca de Puccini, offre un panorama exceptionnel au coucher du soleil.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "ponte-sant-angelo",
    name: "Ponte Sant'Angelo",
    zone: "vaticano",
    categories: ["incontournables", "quartiers-balades"],
    lat: 41.9024, lng: 12.4660,
    description: "Un pont antique romain bordé de dix statues d'anges baroques sculptées en partie par le Bernin, menant directement au Castel Sant'Angelo.",
    whyVisit: "L'une des plus belles perspectives photogéniques sur le Castel Sant'Angelo et la coupole de Saint-Pierre à l'arrière-plan.",
    littleTip: "Le pont est particulièrement magique à la tombée de la nuit, quand le château est illuminé et le Tibre reflète les lumières.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "giardini-vaticani",
    name: "Giardini Vaticani",
    zone: "vaticano",
    categories: ["quartiers-balades", "experiences-insolites"],
    lat: 41.9040, lng: 12.4500,
    description: "Les jardins privés du Vatican, accessibles uniquement en visite guidée réservée à l'avance, mêlant fontaines monumentales et végétation méditerranéenne.",
    whyVisit: "Un accès rare à l'intimité verte du plus petit État du monde, loin de la foule des musées.",
    littleTip: "La visite en petit train électrique est la façon la plus simple de découvrir les jardins sans trop marcher.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "borgo-pio",
    name: "Borgo Pio",
    zone: "vaticano",
    categories: ["quartiers-balades", "restaurants"],
    lat: 41.9030, lng: 12.4600,
    description: "Une rue pittoresque médiévale à deux pas de la basilique Saint-Pierre, bordée de petits restaurants et cafés fréquentés aussi par les habitants du quartier.",
    whyVisit: "Une pause déjeuner agréable après la visite intensive du Vatican, dans un cadre plus authentique que les abords immédiats de la place.",
    littleTip: "Les prix y restent plus raisonnables que sur la Piazza San Pietro elle-même, malgré la proximité.",
    indicativeDuration: "30-45 min",
    indicativePrice: "$$",
  },
  {
    slug: "necropoli-vaticana",
    name: "Necropoli Vaticana (Scavi)",
    zone: "vaticano",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 41.9018, lng: 12.4536,
    description: "Une nécropole antique découverte sous la basilique Saint-Pierre, qui aurait révélé le tombeau même de l'apôtre Pierre.",
    whyVisit: "Une expérience rare et émouvante, pour qui réserve suffisamment à l'avance (délai souvent de plusieurs mois).",
    littleTip: "La réservation se fait exclusivement par e-mail directement auprès du bureau des fouilles, et non en ligne comme pour les autres sites du Vatican.",
    indicativeDuration: "1h30 (visite guidée)",
  },

  // ---------- Trastevere ----------
  {
    slug: "piazza-santa-maria-trastevere",
    name: "Piazza di Santa Maria in Trastevere",
    zone: "trastevere",
    categories: ["incontournables", "quartiers-balades"],
    lat: 41.8894, lng: 12.4700,
    description: "La place centrale et animée de Trastevere, dominée par l'une des plus anciennes églises dédiées à la Vierge Marie à Rome, aux mosaïques byzantines éclatantes.",
    whyVisit: "Le cœur social de Trastevere, animé à toute heure du jour et surtout en soirée.",
    littleTip: "Les mosaïques de la façade, visibles de loin, s'illuminent magnifiquement au coucher du soleil.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "isola-tiberina",
    name: "Isola Tiberina",
    zone: "trastevere",
    categories: ["incontournables", "quartiers-balades"],
    lat: 41.8928, lng: 12.4780,
    description: "La seule île du Tibre à l'intérieur de Rome, reliée au reste de la ville par deux des ponts les plus anciens, vouée à la médecine depuis l'Antiquité.",
    whyVisit: "Un petit îlot paisible au milieu du fleuve, avec un hôpital toujours en activité depuis des siècles.",
    littleTip: "En été, un cinéma en plein air et des bars temporaires s'installent sur les berges autour de l'île.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "ponte-rotto",
    name: "Ponte Rotto",
    zone: "trastevere",
    categories: ["temples-patrimoine", "quartiers-balades"],
    lat: 41.8920, lng: 12.4785,
    description: "Les vestiges d'un pont romain antique, dont une seule arche subsiste au milieu du Tibre après plusieurs crues destructrices.",
    whyVisit: "Un témoignage insolite et photogénique de l'âge du Tibre à Rome, visible depuis les quais voisins.",
    littleTip: "La meilleure vue s'obtient depuis le Ponte Palatino, juste à côté, surtout à la lumière dorée du soir.",
    indicativeDuration: "10 min",
  },
  {
    slug: "gianicolo",
    name: "Gianicolo (Colle Gianicolo)",
    zone: "trastevere",
    categories: ["points-de-vue", "incontournables"],
    lat: 41.8910, lng: 12.4625,
    description: "Une colline surplombant Trastevere, offrant l'un des plus beaux panoramas gratuits sur toute la ville de Rome, dominé par une statue équestre de Garibaldi.",
    whyVisit: "Le meilleur point de vue au coucher du soleil sur Rome, loin de la foule des terrasses payantes.",
    littleTip: "Un canon tire symboliquement tous les jours à midi depuis la colline, une tradition qui remonte au XIXe siècle.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "orto-botanico-roma",
    name: "Orto Botanico di Roma",
    zone: "trastevere",
    categories: ["activites-famille", "quartiers-balades"],
    lat: 41.8870, lng: 12.4660,
    description: "Le jardin botanique de l'université de Rome, aménagé sur les anciens jardins de la famille Corsini, avec bambouseraie et jardin japonais.",
    whyVisit: "Une pause verte et paisible à deux pas de l'agitation de Trastevere.",
    littleTip: "La bambouseraie, dense et ombragée, offre une fraîcheur bienvenue en plein été romain.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "villa-farnesina",
    name: "Villa Farnesina",
    zone: "trastevere",
    categories: ["temples-patrimoine"],
    lat: 41.8933, lng: 12.4680,
    description: "Une villa Renaissance décorée de fresques de Raphaël et ses élèves, construite pour un riche banquier siennois au début du XVIe siècle.",
    whyVisit: "Des fresques de Raphaël en personne, dans un cadre intimiste bien moins fréquenté que les musées du Vatican.",
    littleTip: "La fresque de Galatée, au rez-de-chaussée, est considérée comme l'une des plus belles compositions de la Renaissance romaine.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "vicolo-del-cinque",
    name: "Vicolo del Cinque",
    zone: "trastevere",
    categories: ["bars-rooftops", "quartiers-balades"],
    lat: 41.8880, lng: 12.4705,
    description: "Une ruelle animée de Trastevere réputée pour sa vie nocturne, bordée de bars et petits restaurants fréquentés jusque tard dans la nuit.",
    whyVisit: "L'une des meilleures rues pour une soirée animée dans le quartier le plus festif de Rome.",
    littleTip: "La ruelle est particulièrement vivante du jeudi au samedi soir, nettement plus calme en semaine.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "da-enzo-al-29",
    name: "Da Enzo al 29",
    zone: "trastevere",
    categories: ["restaurants"],
    lat: 41.8870, lng: 12.4740,
    description: "Une petite trattoria familiale de Trastevere, référence pour la cuisine romaine traditionnelle (carbonara, cacio e pepe, coda alla vaccinara) dans un cadre simple et chaleureux.",
    whyVisit: "Une adresse authentiquement romaine, loin des pièges à touristes malgré sa popularité croissante.",
    littleTip: "Aucune réservation acceptée pour les petits groupes — arrivez dès l'ouverture ou attendez-vous à patienter.",
    indicativeDuration: "1h-1h30",
    indicativePrice: "$$",
  },
  {
    slug: "porta-portese",
    name: "Porta Portese (marché dominical)",
    zone: "trastevere",
    categories: ["marches"],
    lat: 41.8775, lng: 12.4740,
    description: "Le plus grand marché aux puces de Rome, qui se déploie chaque dimanche matin dans les rues au sud de Trastevere depuis l'après-guerre.",
    whyVisit: "Une expérience dominicale typiquement romaine, entre brocante, vêtements et ambiance populaire bruyante.",
    littleTip: "Surveillez bien vos affaires dans la foule dense — le marché est aussi connu pour quelques pickpockets.",
    indicativeDuration: "1h-1h30",
  },

  // ---------- Campo de' Fiori & Ghetto ----------
  {
    slug: "campo-de-fiori",
    name: "Campo de' Fiori",
    zone: "campo-fiori-ghetto",
    categories: ["incontournables", "marches"],
    lat: 41.8955, lng: 12.4722,
    description: "Une place animée de jour comme un marché aux fruits et légumes et de nuit comme un haut lieu de la vie nocturne romaine, marquée par la statue du philosophe Giordano Bruno brûlé ici en 1600.",
    whyVisit: "L'une des places les plus vivantes de Rome, à l'identité double entre marché traditionnel et fête nocturne.",
    littleTip: "Le marché matinal (jusqu'à environ 14h) est bien plus authentique et moins touristique que l'ambiance nocturne qui suit.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "piazza-farnese",
    name: "Piazza Farnese",
    zone: "campo-fiori-ghetto",
    categories: ["quartiers-balades", "temples-patrimoine"],
    lat: 41.8947, lng: 12.4716,
    description: "Une place élégante et paisible juste à côté de Campo de' Fiori, dominée par le Palazzo Farnese, aujourd'hui ambassade de France en Italie.",
    whyVisit: "Un contraste calme et aristocratique avec l'agitation de Campo de' Fiori à deux pas.",
    littleTip: "Les deux fontaines monumentales en granit égyptien proviennent des thermes de Caracalla, récupérées à la Renaissance.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "ghetto-ebraico-roma",
    name: "Ghetto Ebraico di Roma",
    zone: "campo-fiori-ghetto",
    categories: ["quartiers-balades", "temples-patrimoine"],
    lat: 41.8930, lng: 12.4770,
    description: "L'un des plus anciens quartiers juifs d'Europe, établi en 1555 et resté le cœur de la communauté juive romaine, la plus ancienne diaspora juive d'Occident.",
    whyVisit: "Un quartier à l'identité forte, mêlant histoire millénaire et une cuisine judéo-romaine réputée dans toute l'Italie.",
    littleTip: "Les carciofi alla giudia (artichauts frits à la juive) sont la spécialité culinaire incontournable du quartier.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "grande-sinagoga-roma",
    name: "Grande Sinagoga di Roma",
    zone: "campo-fiori-ghetto",
    categories: ["temples-patrimoine"],
    lat: 41.8928, lng: 12.4772,
    description: "La principale synagogue de Rome, achevée en 1904, dont le dôme carré distinctif domine les toits du Ghetto sur les bords du Tibre.",
    whyVisit: "Un symbole architectural fort de la plus ancienne communauté juive d'Europe occidentale.",
    littleTip: "Le musée juif de Rome, attenant à la synagogue, retrace plus de deux mille ans de présence juive dans la ville.",
    indicativeDuration: "45 min (avec le musée)",
  },
  {
    slug: "teatro-marcello",
    name: "Teatro di Marcello",
    zone: "campo-fiori-ghetto",
    categories: ["temples-patrimoine", "incontournables"],
    lat: 41.8915, lng: 12.4810,
    description: "Un théâtre antique romain achevé sous Auguste, dont la silhouette ressemble à une version réduite du Colisée, encore partiellement habité aux étages supérieurs.",
    whyVisit: "Souvent confondu avec un petit Colisée, ce théâtre antique est pourtant plus ancien et toujours partiellement utilisé comme habitation.",
    littleTip: "La vue depuis la Via del Teatro di Marcello au coucher du soleil, avec le temple d'Apollon Sosien à côté, est particulièrement photogénique.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "fontana-tartarughe",
    name: "Fontana delle Tartarughe",
    zone: "campo-fiori-ghetto",
    categories: ["experiences-insolites", "quartiers-balades"],
    lat: 41.8928, lng: 12.4765,
    description: "Une fontaine Renaissance délicate représentant quatre jeunes hommes de bronze aidant des tortues à grimper dans un bassin, ajoutées ultérieurement par le Bernin.",
    whyVisit: "Une des fontaines les plus élégantes et méconnues de Rome, sur une petite place paisible du Ghetto.",
    littleTip: "Les tortues de bronze furent ajoutées presque un siècle après la fontaine elle-même, sur une idée attribuée au Bernin.",
    indicativeDuration: "10-15 min",
  },
  {
    slug: "palazzo-spada",
    name: "Palazzo Spada",
    zone: "campo-fiori-ghetto",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 41.8950, lng: 12.4700,
    description: "Un palais baroque célèbre pour sa galerie en perspective forcée conçue par Borromini, qui semble s'étendre sur 30 mètres alors qu'elle n'en mesure que 8.",
    whyVisit: "Une des plus brillantes illusions d'optique architecturales jamais construites, toujours surprenante en personne.",
    littleTip: "La statuette au bout du couloir semble grandeur nature à distance, mais mesure en réalité moins de 60 centimètres.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "da-giggetto",
    name: "Da Giggetto al Portico d'Ottavia",
    zone: "campo-fiori-ghetto",
    categories: ["restaurants"],
    lat: 41.8930, lng: 12.4775,
    description: "Un restaurant historique du Ghetto, référence pour la cuisine judéo-romaine, avec vue sur les ruines antiques du Portique d'Octavie juste en face.",
    whyVisit: "Le meilleur endroit pour goûter les carciofi alla giudia et autres spécialités judéo-romaines, dans un cadre historique unique.",
    littleTip: "Demandez une table en terrasse pour manger directement face aux colonnes antiques du Portique d'Octavie.",
    indicativeDuration: "1h30",
    indicativePrice: "$$$",
  },
  {
    slug: "via-giulia",
    name: "Via Giulia",
    zone: "campo-fiori-ghetto",
    categories: ["quartiers-balades", "temples-patrimoine"],
    lat: 41.8965, lng: 12.4680,
    description: "Une rue Renaissance rectiligne tracée sur ordre du pape Jules II, bordée de palais aristocratiques et d'une arche suspendue emblématique reliant deux bâtiments.",
    whyVisit: "L'une des plus élégantes rues de Rome, nettement moins fréquentée que les grandes places voisines.",
    littleTip: "L'arche de lierre suspendue entre le Palazzo Farnese et les jardins de l'autre côté de la rue devait à l'origine relier les deux par un pont fermé.",
    indicativeDuration: "20-30 min",
  },

  // ---------- Tridente & Villa Borghese ----------
  {
    slug: "piazza-di-spagna",
    name: "Piazza di Spagna & Scalinata di Trinità dei Monti",
    zone: "tridente-borghese",
    categories: ["incontournables"],
    lat: 41.9058, lng: 12.4823,
    description: "La célèbre escalier monumental de 135 marches reliant la Piazza di Spagna à l'église Trinità dei Monti, l'un des rendez-vous les plus photographiés de Rome.",
    whyVisit: "Un décor romantique emblématique, surtout beau tôt le matin avant l'afflux de la foule.",
    littleTip: "S'asseoir sur les marches est désormais interdit et sanctionné d'une amende — l'ancien rituel romain a disparu depuis 2019.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "via-dei-condotti",
    name: "Via dei Condotti",
    zone: "tridente-borghese",
    categories: ["shopping", "incontournables"],
    lat: 41.9040, lng: 12.4800,
    description: "La rue du shopping de luxe la plus prestigieuse de Rome, qui relie la Piazza di Spagna à la Via del Corso.",
    whyVisit: "Le meilleur axe pour le shopping haut de gamme et observer l'élégance romaine classique.",
    littleTip: "Le célèbre Caffè Greco, au numéro 86, accueillit jadis Goethe, Byron et Keats — une pause café chargée d'histoire littéraire.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "villa-borghese-parco",
    name: "Villa Borghese (parc)",
    zone: "tridente-borghese",
    categories: ["incontournables", "activites-famille"],
    lat: 41.9142, lng: 12.4822,
    description: "Le plus grand parc public du centre de Rome, ancienne propriété de la famille Borghese transformée en jardin paysager au XVIIe siècle.",
    whyVisit: "Le poumon vert du centre de Rome, parfait pour une pause après la densité du centre historique.",
    littleTip: "La location de vélos ou de voiturettes électriques permet de couvrir facilement l'ensemble du vaste parc en une demi-journée.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "galleria-borghese",
    name: "Galleria Borghese",
    zone: "tridente-borghese",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 41.9145, lng: 12.4845,
    description: "Une collection d'art exceptionnelle rassemblée par le cardinal Scipione Borghese, avec des sculptures majeures du Bernin et des tableaux du Caravage.",
    whyVisit: "Une des plus belles collections privées devenues publiques au monde, dans un cadre de villa somptueux.",
    littleTip: "La réservation est obligatoire avec un créneau horaire strict de deux heures — réservez plusieurs semaines à l'avance.",
    indicativeDuration: "2h",
  },
  {
    slug: "piazza-del-popolo",
    name: "Piazza del Popolo",
    zone: "tridente-borghese",
    categories: ["incontournables", "quartiers-balades"],
    lat: 41.9109, lng: 12.4763,
    description: "Une vaste place ovale néoclassique, l'une des plus grandes de Rome, marquée par un obélisque égyptien antique et deux églises jumelles symétriques.",
    whyVisit: "Un espace monumental impressionnant à l'entrée nord du centre historique.",
    littleTip: "L'obélisque égyptien, rapporté d'Héliopolis par Auguste, se trouvait à l'origine dans le Circus Maximus.",
    indicativeDuration: "30 min",
  },
  {
    slug: "terrazza-pincio",
    name: "Terrazza del Pincio",
    zone: "tridente-borghese",
    categories: ["points-de-vue", "incontournables"],
    lat: 41.9120, lng: 12.4790,
    description: "Une terrasse panoramique surplombant la Piazza del Popolo, avec une vue qui s'étend jusqu'à la coupole de Saint-Pierre à l'horizon.",
    whyVisit: "Un des plus beaux couchers de soleil de Rome, gratuit et accessible directement depuis Villa Borghese.",
    littleTip: "Arrivez environ 30 minutes avant le coucher du soleil pour trouver une bonne place face à l'ouest.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "mausoleo-augusto",
    name: "Mausoleo di Augusto",
    zone: "tridente-borghese",
    categories: ["temples-patrimoine"],
    lat: 41.9048, lng: 12.4760,
    description: "L'immense tombeau circulaire construit par l'empereur Auguste pour lui-même et sa famille, récemment restauré et rouvert au public après des décennies de fermeture.",
    whyVisit: "Le plus grand mausolée circulaire de l'Antiquité romaine, longtemps inaccessible et désormais restauré.",
    littleTip: "La réservation est recommandée à l'avance, le site n'accueillant que des groupes limités à la fois.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "ara-pacis",
    name: "Ara Pacis",
    zone: "tridente-borghese",
    categories: ["temples-patrimoine"],
    lat: 41.9055, lng: 12.4755,
    description: "Un autel monumental dédié à la paix romaine sous Auguste, orné de reliefs sculptés d'une finesse exceptionnelle, abrité dans un pavillon de verre contemporain signé Richard Meier.",
    whyVisit: "L'un des plus beaux reliefs sculptés de l'art augustéen, dans un écrin architectural moderne qui met l'œuvre en valeur.",
    littleTip: "Les reliefs représentent la famille impériale lors d'une procession religieuse réelle — un rare document historique visuel.",
    indicativeDuration: "45 min",
  },
  {
    slug: "via-margutta",
    name: "Via Margutta",
    zone: "tridente-borghese",
    categories: ["quartiers-balades", "experiences-insolites"],
    lat: 41.9070, lng: 12.4798,
    description: "Une rue pittoresque et fleurie, historiquement habitée par artistes et galeries d'art, où vivait le personnage de Gregory Peck dans Vacances romaines.",
    whyVisit: "Une des plus charmantes et paisibles rues du centre de Rome, loin de la foule touristique.",
    littleTip: "Les façades fleuries et les galeries d'art en font l'une des rues les plus photographiées par les amateurs de belles ruelles.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "casina-valadier",
    name: "Casina Valadier",
    zone: "tridente-borghese",
    categories: ["restaurants", "points-de-vue"],
    lat: 41.9135, lng: 12.4815,
    description: "Un élégant restaurant néoclassique perché au sommet du Pincio, avec une des plus belles vues sur Rome depuis sa terrasse.",
    whyVisit: "Un cadre historique raffiné pour un repas avec vue, fréquenté jadis par Casanova et Stendhal.",
    littleTip: "Même sans dîner, le bar offre un accès à la terrasse pour un café ou un apéritif avec vue.",
    indicativeDuration: "1h30-2h",
    indicativePrice: "$$$$",
  },
  {
    slug: "laghetto-villa-borghese",
    name: "Laghetto di Villa Borghese",
    zone: "tridente-borghese",
    categories: ["activites-famille", "quartiers-balades"],
    lat: 41.9155, lng: 12.4855,
    description: "Un petit lac romantique au cœur du parc, dominé par un temple néoclassique dédié à Esculape, où l'on peut louer des barques à rames.",
    whyVisit: "Une pause tranquille et romantique en plein parc, loin de la foule des grands musées voisins.",
    littleTip: "La location de barque est particulièrement agréable en fin de matinée, avant que la chaleur ne s'installe en été.",
    indicativeDuration: "30-45 min",
  },

  // ---------- Aventino & Testaccio ----------
  {
    slug: "giardino-aranci",
    name: "Giardino degli Aranci",
    zone: "aventino-testaccio",
    categories: ["points-de-vue", "quartiers-balades"],
    lat: 41.8850, lng: 12.4810,
    description: "Un jardin paisible sur la colline de l'Aventin, planté d'orangers, offrant une vue dégagée et peu fréquentée sur le centre historique de Rome.",
    whyVisit: "Un point de vue gratuit et romantique, loin de la foule du Gianicolo ou du Vittoriano.",
    littleTip: "Le jardin est particulièrement agréable au printemps, quand les orangers sont en fleur et parfument l'air.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "buco-serratura",
    name: "Buco della Serratura",
    zone: "aventino-testaccio",
    categories: ["experiences-insolites", "incontournables"],
    lat: 41.8830, lng: 12.4790,
    description: "Un trou de serrure célèbre dans une porte de l'Aventin, qui cadre parfaitement la coupole de Saint-Pierre à travers une allée de haies taillées, créant un effet de perspective saisissant.",
    whyVisit: "Une des vues les plus insolites et surprenantes de Rome, cachée dans une simple porte en bois.",
    littleTip: "Une petite file se forme souvent devant la porte — l'attente ne dure généralement que quelques minutes.",
    indicativeDuration: "10-15 min",
  },
  {
    slug: "piramide-cestio",
    name: "Piramide di Cestio",
    zone: "aventino-testaccio",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 41.8763, lng: 12.4805,
    description: "Une pyramide romaine antique construite comme tombeau pour un riche magistrat, inspirée de la mode égyptienne qui fascinait Rome après la conquête de l'Égypte.",
    whyVisit: "Un monument antique totalement inattendu dans le paysage urbain romain, étonnamment bien conservé.",
    littleTip: "La pyramide fut intégrée aux murs d'Aurélien au IIIe siècle, ce qui explique en partie son excellent état de conservation.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "cimitero-acattolico-roma",
    name: "Cimitero Acattolico (Cimitero dei Protestanti)",
    zone: "aventino-testaccio",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 41.8758, lng: 12.4810,
    description: "Un cimetière non-catholique paisible et verdoyant, à côté de la pyramide, où reposent notamment les poètes anglais John Keats et une partie de la famille de Percy Shelley.",
    whyVisit: "Un lieu de mémoire littéraire émouvant, dans un cadre verdoyant surprenant au cœur de Rome.",
    littleTip: "La tombe de Keats porte une épitaphe qu'il avait lui-même choisie : \"Ici repose un homme dont le nom fut écrit sur l'eau\".",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "monte-testaccio",
    name: "Monte Testaccio",
    zone: "aventino-testaccio",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 41.8740, lng: 12.4745,
    description: "Une colline artificielle entièrement formée de fragments d'amphores antiques accumulés pendant des siècles par les dockers du port fluvial voisin.",
    whyVisit: "Un vestige archéologique unique au monde, qui a donné son nom à tout le quartier populaire de Testaccio.",
    littleTip: "La colline n'est généralement pas accessible librement — certains bars et clubs nocturnes construits dans ses grottes offrent un accès partiel.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "mercato-testaccio",
    name: "Mercato di Testaccio",
    zone: "aventino-testaccio",
    categories: ["marches", "street-food"],
    lat: 41.8765, lng: 12.4755,
    description: "Un marché couvert moderne et lumineux, considéré par beaucoup de Romains comme l'un des meilleurs marchés alimentaires de la ville.",
    whyVisit: "Une pause déjeuner authentique dans un quartier populaire romain, loin des marchés touristiques du centre.",
    littleTip: "Le comptoir Mordi e Vai, dedans, sert l'un des meilleurs sandwichs aux abats à la romaine de toute la ville.",
    indicativeDuration: "45 min",
    indicativePrice: "$$",
  },
  {
    slug: "centrale-montemartini",
    name: "Centrale Montemartini",
    zone: "aventino-testaccio",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 41.8560, lng: 12.4720,
    description: "Une ancienne centrale électrique industrielle du début du XXe siècle, transformée en musée où des sculptures antiques classiques sont exposées entre turbines et machines d'époque.",
    whyVisit: "Un contraste saisissant et original entre art antique et architecture industrielle, loin de la foule des grands musées.",
    littleTip: "Le musée est nettement moins fréquenté que les sites du centre, idéal pour une visite tranquille même en haute saison.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "trattoria-da-felice",
    name: "Trattoria da Felice",
    zone: "aventino-testaccio",
    categories: ["restaurants"],
    lat: 41.8745, lng: 12.4750,
    description: "Une trattoria historique de Testaccio, référence absolue pour la cacio e pepe et les plats romains traditionnels à base d'abats.",
    whyVisit: "Une table authentiquement romaine dans le quartier populaire qui a donné naissance à cette cuisine.",
    littleTip: "La cacio e pepe se prépare traditionnellement en salle, directement devant le client, dans une grande roue de fromage creusée.",
    indicativeDuration: "1h30",
    indicativePrice: "$$$",
  },

  // ---------- Monti & Esquilino ----------
  {
    slug: "rione-monti",
    name: "Rione Monti",
    zone: "monti-esquilino",
    categories: ["quartiers-balades", "shopping"],
    lat: 41.8945, lng: 12.4895,
    description: "Le plus ancien quartier populaire de Rome, aujourd'hui devenu un repaire bohème de boutiques indépendantes et bars à vins, juste derrière le Colisée.",
    whyVisit: "L'ambiance de quartier la plus authentique et créative à deux pas des grands sites antiques.",
    littleTip: "La Via del Boschetto et la Via dei Serpenti concentrent les meilleures boutiques de créateurs et friperies vintage du quartier.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "santa-maria-maggiore",
    name: "Basilica di Santa Maria Maggiore",
    zone: "monti-esquilino",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 41.8986, lng: 12.4992,
    description: "La plus grande des quatre basiliques papales majeures de Rome, dont les mosaïques du Ve siècle comptent parmi les plus anciennes représentations chrétiennes conservées.",
    whyVisit: "Un trésor de mosaïques paléochrétiennes exceptionnel, dans l'une des plus importantes basiliques de Rome.",
    littleTip: "Le campanile roman, le plus haut de Rome, domine encore tout le quartier de l'Esquilin.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "san-pietro-in-vincoli",
    name: "San Pietro in Vincoli",
    zone: "monti-esquilino",
    categories: ["temples-patrimoine"],
    lat: 41.8920, lng: 12.4915,
    description: "Une église qui abrite les chaînes qui auraient enchaîné saint Pierre en prison, ainsi que le Moïse de Michel-Ange, l'une de ses sculptures les plus puissantes.",
    whyVisit: "Voir une sculpture majeure de Michel-Ange gratuitement, loin de la foule de ses œuvres plus célèbres.",
    littleTip: "Le Moïse devait à l'origine faire partie d'un tombeau monumental bien plus vaste pour le pape Jules II, jamais achevé.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "domus-aurea",
    name: "Domus Aurea",
    zone: "monti-esquilino",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 41.8905, lng: 12.4955,
    description: "Le palais somptueux et démesuré construit par Néron après l'incendie de Rome en 64, enfoui et oublié pendant des siècles avant sa redécouverte à la Renaissance.",
    whyVisit: "Un palais impérial fascinant, visité en réalité virtuelle pour reconstituer sa splendeur d'origine disparue.",
    littleTip: "La visite inclut des lunettes de réalité virtuelle permettant de voir les salles reconstituées numériquement telles qu'elles étaient à l'époque de Néron.",
    indicativeDuration: "1h-1h15",
  },
  {
    slug: "case-romane-celio",
    name: "Case Romane del Celio",
    zone: "monti-esquilino",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 41.8870, lng: 12.4900,
    description: "Un ensemble de maisons romaines antiques superposées sous une basilique, avec des fresques murales remarquablement conservées sur plusieurs niveaux souterrains.",
    whyVisit: "Un voyage souterrain à travers plusieurs siècles d'habitat romain, peu connu et rarement bondé.",
    littleTip: "Les fresques du \"Nympheum\" (maison des façades peintes) comptent parmi les mieux conservées de toute la Rome antique.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "san-giovanni-laterano",
    name: "San Giovanni in Laterano & Scala Santa",
    zone: "monti-esquilino",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 41.8864, lng: 12.5063,
    description: "La cathédrale officielle de Rome et siège historique de la papauté avant le Vatican, avec un escalier sacré que les pèlerins montent traditionnellement à genoux.",
    whyVisit: "La véritable cathédrale de Rome, souvent éclipsée par Saint-Pierre mais hiérarchiquement supérieure.",
    littleTip: "L'escalier sacré (Scala Santa), à côté, serait selon la tradition celui gravi par le Christ lors de son procès à Jérusalem.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "mercato-monti",
    name: "Mercato Monti Urban Market",
    zone: "monti-esquilino",
    categories: ["marches", "shopping"],
    lat: 41.8955, lng: 12.4885,
    description: "Un marché de créateurs et de vintage le week-end dans une cave voûtée du quartier de Monti, réputé pour la qualité de ses stands indépendants.",
    whyVisit: "Le meilleur marché de créateurs locaux de Rome, pour trouver des pièces uniques loin de la production de masse.",
    littleTip: "Le marché n'ouvre que le samedi et dimanche — vérifiez le calendrier avant de vous y rendre spécifiquement.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "la-carbonara-monti",
    name: "La Carbonara",
    zone: "monti-esquilino",
    categories: ["restaurants"],
    lat: 41.8948, lng: 12.4890,
    description: "Un restaurant historique du quartier de Monti dont le nom même fait référence au plat qu'il revendique avoir contribué à populariser dans sa forme moderne.",
    whyVisit: "Une référence pour goûter une carbonara exécutée dans les règles, sans crème, juste œuf, guanciale et pecorino.",
    littleTip: "Le restaurant se trouve sur la place historique de Campo de' Fiori à l'origine, mais une seconde adresse plus récente existe aussi à Monti — vérifiez laquelle vous réservez.",
    indicativeDuration: "1h-1h30",
    indicativePrice: "$$",
  },

  // ---------- Appia Antica (excursion courte) ----------
  {
    slug: "via-appia-antica",
    name: "Via Appia Antica",
    zone: "appia-antica",
    categories: ["incontournables", "temples-patrimoine", "excursions"],
    lat: 41.8540, lng: 12.5150,
    description: "La plus ancienne et stratégiquement la plus importante des routes consulaires romaines, dite \"regina viarum\", encore pavée de ses dalles de basalte antiques par endroits.",
    whyVisit: "Marcher littéralement sur une route vieille de plus de deux mille ans, bordée de tombeaux antiques.",
    littleTip: "Les dimanches, une grande partie de la route est fermée à la circulation, idéale pour marcher ou louer un vélo en toute tranquillité.",
    indicativeDuration: "2h-3h",
  },
  {
    slug: "catacombe-san-callisto",
    name: "Catacombe di San Callisto",
    zone: "appia-antica",
    categories: ["temples-patrimoine", "experiences-insolites", "excursions"],
    lat: 41.8495, lng: 12.5160,
    description: "Le plus grand complexe de catacombes chrétiennes de Rome, qui s'étend sur plus de 20 kilomètres de galeries souterraines et accueillit plusieurs papes des premiers siècles.",
    whyVisit: "Une plongée impressionnante dans les débuts du christianisme romain, visitée uniquement en groupe guidé.",
    littleTip: "La température reste fraîche en sous-sol toute l'année — une bonne option pour échapper à la chaleur romaine en été.",
    indicativeDuration: "45 min (visite guidée)",
  },
  {
    slug: "catacombe-san-sebastiano",
    name: "Catacombe di San Sebastiano",
    zone: "appia-antica",
    categories: ["temples-patrimoine", "excursions"],
    lat: 41.8512, lng: 12.5190,
    description: "Des catacombes chrétiennes antiques où aurait été temporairement conservé le corps de saint Sébastien, avec des fresques et inscriptions anciennes bien préservées.",
    whyVisit: "Une alternative moins fréquentée aux catacombes de San Callisto, tout aussi riche en histoire paléochrétienne.",
    littleTip: "La basilique au-dessus des catacombes conserve encore la colonne à laquelle saint Sébastien aurait été attaché pour son martyre.",
    indicativeDuration: "45 min (visite guidée)",
  },
  {
    slug: "terme-caracalla",
    name: "Terme di Caracalla",
    zone: "appia-antica",
    categories: ["incontournables", "temples-patrimoine", "excursions"],
    lat: 41.8778, lng: 12.4927,
    description: "Les deuxièmes plus grands thermes impériaux de Rome, qui pouvaient accueillir jusqu'à 1 600 baigneurs simultanément, avec des murs encore debout sur plusieurs dizaines de mètres.",
    whyVisit: "L'une des ruines antiques les plus impressionnantes de Rome par son échelle, bien moins fréquentée que le Forum.",
    littleTip: "Des opéras et concerts en plein air s'y déroulent en été, offrant une mise en scène spectaculaire parmi les ruines.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "mausoleo-cecilia-metella",
    name: "Mausoleo di Cecilia Metella",
    zone: "appia-antica",
    categories: ["temples-patrimoine", "excursions"],
    lat: 41.8524, lng: 12.5200,
    description: "Un imposant tombeau cylindrique du Ier siècle avant notre ère, construit pour une noble romaine, qui domine toujours la Via Appia Antica.",
    whyVisit: "Un des monuments funéraires antiques les mieux conservés et les plus photogéniques de la voie Appienne.",
    littleTip: "Le tombeau fut transformé en forteresse médiévale au Moyen Âge, ce qui explique sa silhouette crénelée actuelle.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "circo-massenzio",
    name: "Circo di Massenzio",
    zone: "appia-antica",
    categories: ["temples-patrimoine", "excursions"],
    lat: 41.8528, lng: 12.5195,
    description: "Les vestiges d'un cirque antique construit par l'empereur Maxence au début du IVe siècle pour des courses de chars privées, remarquablement bien conservés.",
    whyVisit: "Un cirque romain antique étonnamment intact, nettement moins visité que le Circus Maximus du centre.",
    littleTip: "Le site fait partie du même complexe funéraire que le mausolée de Romulus, fils de Maxence mort en bas âge.",
    indicativeDuration: "30-45 min",
  },

  // ---------- Tivoli (excursion) ----------
  {
    slug: "villa-d-este-tivoli",
    name: "Villa d'Este",
    zone: "tivoli",
    categories: ["incontournables", "temples-patrimoine", "excursions"],
    lat: 41.9640, lng: 12.7960,
    description: "Un palais Renaissance classé à l'Unesco, célèbre pour ses jardins en terrasses et ses centaines de fontaines alimentées sans aucune pompe, par la seule force de la gravité.",
    whyVisit: "L'un des plus beaux jardins Renaissance au monde, véritable chef-d'œuvre d'ingénierie hydraulique.",
    littleTip: "L'Allée des Cent Fontaines et la Fontaine de l'Orgue (qui joue encore de la musique grâce à la pression de l'eau) sont les points forts de la visite.",
    indicativeDuration: "2h",
  },
  {
    slug: "villa-adriana-tivoli",
    name: "Villa Adriana",
    zone: "tivoli",
    categories: ["incontournables", "temples-patrimoine", "excursions"],
    lat: 41.9450, lng: 12.7720,
    description: "La résidence privée démesurée de l'empereur Hadrien, qui reconstitua sur ce site les monuments les plus admirés de ses voyages à travers l'Empire.",
    whyVisit: "Le plus grand complexe de villa impériale romaine jamais construit, dans un cadre naturel verdoyant.",
    littleTip: "Le Canope, bassin bordé de statues évoquant l'Égypte, et le Théâtre Maritime, pavillon entouré d'un canal circulaire, sont les vestiges les plus photogéniques.",
    indicativeDuration: "2h-2h30",
  },
  {
    slug: "centro-storico-tivoli",
    name: "Centro storico di Tivoli",
    zone: "tivoli",
    categories: ["quartiers-balades", "excursions"],
    lat: 41.9630, lng: 12.7980,
    description: "Le centre historique perché de Tivoli, aux ruelles médiévales offrant des vues dégagées sur la campagne romaine et la vallée de l'Aniene.",
    whyVisit: "Une petite ville italienne authentique, à combiner naturellement avec la visite des deux grandes villas.",
    littleTip: "Un déjeuner dans l'une des trattorias du centre est l'occasion de goûter la cuisine simple des Castelli Romani, la campagne autour de Rome.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "tempio-vesta-tivoli",
    name: "Tempio di Vesta a Tivoli",
    zone: "tivoli",
    categories: ["temples-patrimoine", "points-de-vue", "excursions"],
    lat: 41.9625, lng: 12.8010,
    description: "Un temple rond antique perché au bord d'une gorge spectaculaire, qui a inspiré des générations de peintres paysagistes depuis le XVIIIe siècle.",
    whyVisit: "Une des vues les plus romantiques et photographiées de Tivoli, surplombant les gorges de l'Aniene.",
    littleTip: "Le point de vue depuis le restaurant voisin (Sibilla) offre la perspective la plus célèbre sur le temple et la cascade en contrebas.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "cascate-villa-gregoriana",
    name: "Parco Villa Gregoriana",
    zone: "tivoli",
    categories: ["activites-famille", "points-de-vue", "excursions"],
    lat: 41.9655, lng: 12.8000,
    description: "Un parc naturel du XIXe siècle aménagé autour de spectaculaires cascades naturelles créées par la rivière Aniene, avec des sentiers descendant jusqu'au fond de la gorge.",
    whyVisit: "Un contraste rafraîchissant avec les jardins Renaissance de Villa d'Este, entre nature sauvage et cascades impressionnantes.",
    littleTip: "Les sentiers peuvent être glissants après la pluie — de bonnes chaussures de marche sont recommandées.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "ristorante-sibilla-tivoli",
    name: "Ristorante Sibilla",
    zone: "tivoli",
    categories: ["restaurants", "excursions"],
    lat: 41.9630, lng: 12.8015,
    description: "Un restaurant historique niché face au Tempio di Vesta, avec une terrasse offrant l'une des plus belles vues sur les gorges de Tivoli.",
    whyVisit: "Le meilleur cadre pour un déjeuner avec vue, après la visite des deux grandes villas de Tivoli.",
    littleTip: "Réservez une table en terrasse pour profiter de la vue sur le temple et la cascade pendant le repas.",
    indicativeDuration: "1h30",
    indicativePrice: "$$$",
  },

  // ---------- Ostia Antica (excursion) ----------
  {
    slug: "scavi-ostia-antica",
    name: "Scavi di Ostia Antica",
    zone: "ostia-antica",
    categories: ["incontournables", "temples-patrimoine", "excursions"],
    lat: 41.7556, lng: 12.2900,
    description: "Les vestiges exceptionnellement bien conservés de l'ancien port de Rome sur le Tibre, souvent comparés à Pompéi mais à seulement 30 minutes de train du centre-ville.",
    whyVisit: "Une ville romaine antique entière à explorer, avec nettement moins de foule que Pompéi et un accès bien plus rapide depuis Rome.",
    littleTip: "Prévoyez de l'eau et un chapeau : le site est vaste et offre peu d'ombre en plein été.",
    indicativeDuration: "2h-3h",
  },
  {
    slug: "teatro-romano-ostia",
    name: "Teatro Romano di Ostia",
    zone: "ostia-antica",
    categories: ["temples-patrimoine", "excursions"],
    lat: 41.7558, lng: 12.2895,
    description: "Un théâtre antique restauré au sein du site d'Ostia Antica, toujours utilisé aujourd'hui pour des représentations en plein air en été.",
    whyVisit: "L'un des monuments les mieux conservés du site, qui donne une idée vivante de la vie culturelle du port antique.",
    littleTip: "Les gradins supérieurs offrent une belle vue d'ensemble sur la place des Corporations juste derrière.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "terme-ostia",
    name: "Terme di Ostia (Terme di Neptuno)",
    zone: "ostia-antica",
    categories: ["temples-patrimoine", "excursions"],
    lat: 41.7550, lng: 12.2905,
    description: "Les thermes publics du port antique, dont la salle principale conserve une mosaïque de sol spectaculaire représentant Neptune entouré de créatures marines.",
    whyVisit: "Une des plus belles mosaïques romaines encore en place dans son contexte d'origine.",
    littleTip: "Une petite plateforme surélevée permet d'observer correctement l'ensemble de la mosaïque de Neptune depuis le dessus.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "castello-giulio-ii-ostia",
    name: "Castello di Giulio II",
    zone: "ostia-antica",
    categories: ["temples-patrimoine", "excursions"],
    lat: 41.7445, lng: 12.2885,
    description: "Une forteresse de la Renaissance construite pour défendre l'embouchure du Tibre, dans le village médiéval d'Ostia Antica juste à côté du site archéologique.",
    whyVisit: "Un complément médiéval et Renaissance à la visite antique, dans un village pittoresque peu connu des touristes.",
    littleTip: "Le petit village médiéval autour du château est charmant et quasiment désert, même en haute saison.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "lido-di-ostia",
    name: "Lido di Ostia",
    zone: "ostia-antica",
    categories: ["activites-famille", "excursions"],
    lat: 41.7230, lng: 12.2800,
    description: "La plage la plus proche de Rome, accessible directement en train depuis le centre, très fréquentée par les Romains en été pour échapper à la chaleur de la ville.",
    whyVisit: "Une option simple pour combiner la visite d'Ostia Antica avec une après-midi à la plage.",
    littleTip: "Les stabilimenti (clubs de plage payants avec transats) sont la norme ici — les plages entièrement libres et gratuites sont plus rares et moins équipées.",
    indicativeDuration: "2h-3h",
  },
];

const ZONE_DEFS = [
  {
    slug: "centro-storico",
    name: "Centro Storico",
    mapColor: "#a8422c",
    vibeText: "Le cœur baroque et Renaissance de Rome, entre le Panthéon antique, les places animées et la Fontaine de Trevi.",
    prosText: "La plus forte concentration de monuments emblématiques, idéal à pied, cœur de la vie romaine.",
    consText: "Très touristique autour des grands sites (Trevi, Panthéon), prix souvent plus élevés sur les places principales.",
    transportText: "Quartier essentiellement piéton ; bus et métro périphériques (Spagna, Barberini) à quelques minutes à pied.",
    nearbyText: "Le Vatican se rejoint à pied en 20-25 minutes ou en quelques stations de métro/bus.",
    profileFitText: "Incontournable pour tout premier séjour à Rome.",
    hotelAdviceText: "Hôtels nombreux et centraux, mais parfois bruyants la nuit près des places principales.",
  },
  {
    slug: "colosseo-fori",
    name: "Colosseo & Fori",
    mapColor: "#c9972e",
    vibeText: "Le centre monumental de la Rome antique, entre le Colisée, le Forum Romain et le Palatin.",
    prosText: "La plus forte concentration de vestiges antiques, patrimoine mondial exceptionnel.",
    consText: "Chaleur intense en été sur un site majoritairement sans ombre, prévoir eau et chapeau.",
    transportText: "Station de métro Colosseo, sur la ligne B, directement à l'entrée du site.",
    nearbyText: "Monti se rejoint à pied en 10 minutes vers le nord.",
    profileFitText: "Incontournable pour les passionnés d'histoire antique et d'architecture romaine.",
    hotelAdviceText: "Peu d'hôtels directement sur le site, mais Monti et Celio, juste à côté, offrent de bonnes options à pied.",
  },
  {
    slug: "vaticano",
    name: "Vaticano",
    mapColor: "#d6479a",
    vibeText: "Le plus petit État du monde, entre la basilique Saint-Pierre monumentale et les trésors artistiques des Musées du Vatican.",
    prosText: "Patrimoine artistique et spirituel d'exception, incluant la Chapelle Sixtine.",
    consText: "Files d'attente très longues sans réservation, surtout en haute saison.",
    transportText: "Station de métro Ottaviano ou Cipro, sur la ligne A.",
    nearbyText: "Trastevere se rejoint à pied en 15-20 minutes en traversant le Tibre.",
    profileFitText: "Incontournable pour tout premier séjour à Rome, quel que soit le profil de voyage.",
    hotelAdviceText: "Quartier calme avec de bonnes options, à proximité immédiate du Vatican mais hors du centre historique animé.",
  },
  {
    slug: "trastevere",
    name: "Trastevere",
    mapColor: "#2e86ab",
    vibeText: "Le quartier le plus pittoresque et festif de Rome, entre ruelles médiévales, places animées et vie nocturne romaine authentique.",
    prosText: "Ambiance romaine authentique, excellente gastronomie, vie nocturne animée.",
    consText: "Ruelles pavées parfois difficiles pour les poussettes ou valises à roulettes.",
    transportText: "Tram 8 depuis le centre, ou environ 20 minutes à pied depuis le centre historique.",
    nearbyText: "Le Vatican se rejoint à pied en 15-20 minutes en traversant le Tibre.",
    profileFitText: "Pour la vie nocturne, la gastronomie romaine authentique et l'ambiance de quartier.",
    hotelAdviceText: "Quartier animé et charmant, excellent choix pour une immersion dans le Rome authentique.",
  },
  {
    slug: "campo-fiori-ghetto",
    name: "Campo de' Fiori & Ghetto",
    mapColor: "#8f2d2d",
    vibeText: "Entre le marché animé de Campo de' Fiori et l'histoire millénaire du Ghetto Ebraico, le cœur commerçant et culinaire historique de Rome.",
    prosText: "Excellente gastronomie judéo-romaine, ambiance de marché authentique, patrimoine Renaissance.",
    consText: "Campo de' Fiori devient très bruyant en soirée, moins adapté à qui cherche le calme.",
    transportText: "Quartier essentiellement piéton, à 10-15 minutes à pied du Panthéon.",
    nearbyText: "Le Centro Storico se rejoint à pied en quelques minutes vers le nord.",
    profileFitText: "Pour la gastronomie romaine et judéo-romaine, et l'ambiance de marché romain traditionnel.",
    hotelAdviceText: "Emplacement central et charmant, quelques options plus calmes autour de la Piazza Farnese.",
  },
  {
    slug: "tridente-borghese",
    name: "Tridente & Villa Borghese",
    mapColor: "#3f8c5a",
    vibeText: "Le quartier élégant du shopping de luxe, entre l'escalier de la Piazza di Spagna et le plus grand parc du centre de Rome.",
    prosText: "Shopping haut de gamme, grand parc pour se détendre, musées de rang mondial (Galleria Borghese).",
    consText: "La Galleria Borghese nécessite une réservation avec créneau strict, à anticiper plusieurs semaines à l'avance.",
    transportText: "Station de métro Spagna ou Flaminio, sur la ligne A.",
    nearbyText: "Le Centro Storico se rejoint à pied en 15 minutes vers le sud.",
    profileFitText: "Pour le shopping de luxe et une pause verte dans le plus beau parc du centre de Rome.",
    hotelAdviceText: "Quartier élégant et central, prix élevés mais emplacement idéal pour explorer à pied.",
  },
  {
    slug: "aventino-testaccio",
    name: "Aventino & Testaccio",
    mapColor: "#6fae7c",
    vibeText: "Le Rome populaire et authentique au sud du centre, entre la colline tranquille de l'Aventin et le quartier gourmand de Testaccio.",
    prosText: "Ambiance locale authentique, excellente gastronomie romaine traditionnelle, vues peu fréquentées.",
    consText: "Moins de sites touristiques majeurs, davantage une immersion dans le Rome quotidien.",
    transportText: "Station de métro Piramide, sur la ligne B.",
    nearbyText: "Le Circo Massimo et les Fori se rejoignent à pied en 10-15 minutes vers le nord.",
    profileFitText: "Pour la gastronomie romaine traditionnelle et une ambiance de quartier authentique.",
    hotelAdviceText: "Quartier résidentiel calme et authentique, à quelques stations de métro du centre historique.",
  },
  {
    slug: "monti-esquilino",
    name: "Monti & Esquilino",
    mapColor: "#2a7a8c",
    vibeText: "Entre le quartier bohème de Monti et les grandes basiliques de l'Esquilin, un mélange d'histoire antique, paléochrétienne et de boutiques créatives.",
    prosText: "Ambiance de quartier créative et vivante, excellentes basiliques paléochrétiennes, bonne offre de restaurants.",
    consText: "L'Esquilin, un peu plus excentré et populaire, reste globalement sûr mais moins homogène que Monti.",
    transportText: "Stations de métro Cavour et Vittorio Emanuele, sur la ligne B et C.",
    nearbyText: "Le Colisée se rejoint à pied en 10 minutes depuis Monti.",
    profileFitText: "Pour une ambiance de quartier créative juste à côté des grands sites antiques.",
    hotelAdviceText: "Monti offre un excellent compromis charme et emplacement central, à deux pas du Colisée.",
  },
  {
    slug: "appia-antica",
    name: "Via Appia Antica (excursion courte)",
    mapColor: "#a8422c",
    vibeText: "La plus ancienne route de l'Empire romain, bordée de tombeaux antiques et de catacombes chrétiennes, à la lisière sud de la ville.",
    prosText: "Patrimoine antique exceptionnel, ambiance champêtre rare si proche du centre-ville.",
    consText: "Nécessite un bus ou un vélo pour couvrir l'ensemble du site, assez étendu.",
    transportText: "Bus 118 ou 218 depuis la station de métro Circo Massimo ou San Giovanni.",
    nearbyText: "Les Terme di Caracalla se rejoignent facilement à pied ou en bus depuis le début de la voie.",
    profileFitText: "Pour les passionnés d'histoire antique et de catacombes paléochrétiennes.",
    hotelAdviceText: "Peu d'hébergements sur place — à visiter en demi-journée depuis le centre de Rome.",
  },
  {
    slug: "tivoli",
    name: "Tivoli (excursion)",
    mapColor: "#c9972e",
    vibeText: "Une excursion classique à l'est de Rome, entre les jardins Renaissance de la Villa d'Este et la villa impériale démesurée d'Hadrien.",
    prosText: "Deux sites Unesco majeurs en une seule journée, cadre naturel rafraîchissant en été.",
    consText: "Nécessite une journée complète pour visiter les deux villas confortablement.",
    transportText: "Train régional depuis Roma Tiburtina (environ 1h), ou bus COTRAL depuis Ponte Mammolo.",
    nearbyText: "Les deux villas se rejoignent en bus local ou taxi, à environ 10 minutes l'une de l'autre.",
    profileFitText: "Pour les passionnés de jardins Renaissance et de villégiature impériale romaine.",
    hotelAdviceText: "Quelques hébergements simples à Tivoli même pour qui veut y passer la nuit, surtout utile en été.",
  },
  {
    slug: "ostia-antica",
    name: "Ostia Antica (excursion)",
    mapColor: "#8a7a63",
    vibeText: "Une excursion rapide vers l'ancien port de Rome, aussi bien conservé que Pompéi mais à seulement 30 minutes de train du centre.",
    prosText: "Site antique exceptionnel, nettement moins fréquenté que les grands sites du centre, accès très rapide.",
    consText: "Site vaste et peu ombragé — prévoir de l'eau et éviter les heures les plus chaudes en été.",
    transportText: "Train régional depuis Roma Porta San Paolo (métro Piramide), environ 30 minutes.",
    nearbyText: "Le Lido di Ostia se rejoint en 10 minutes de train supplémentaires pour combiner avec la plage.",
    profileFitText: "Pour les passionnés d'archéologie romaine en quête d'une alternative plus rapide à Pompéi.",
    hotelAdviceText: "Généralement visité en demi-journée depuis Rome, peu d'hébergements nécessaires sur place.",
  },
];

async function main() {
  console.log("Seeding Rome destination…");

  const italie = await prisma.country.upsert({
    where: { slug: "italie" },
    update: {},
    create: { slug: "italie", name: "Italie" },
  });

  const rome = await prisma.destination.upsert({
    where: { slug: "rome" },
    update: { status: "PUBLISHED" },
    create: {
      countryId: italie.id,
      slug: "rome",
      name: "Rome",
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
    "marches", "shopping", "excursions", "points-de-vue",
  ];
  await prisma.destination.update({
    where: { id: rome.id },
    data: {
      categories: {
        set: ENABLED_CATEGORIES.map((slug) => ({ id: categoryBySlug.get(slug)!.id })),
      },
    },
  });

  const zoneBySlug = new Map<string, { id: string }>();
  for (const z of ZONE_DEFS) {
    const zone = await prisma.zone.upsert({
      where: { destinationId_slug: { destinationId: rome.id, slug: z.slug } },
      update: {
        name: z.name, mapColor: z.mapColor, vibeText: z.vibeText, prosText: z.prosText,
        consText: z.consText, transportText: z.transportText, nearbyText: z.nearbyText,
        profileFitText: z.profileFitText, hotelAdviceText: z.hotelAdviceText,
      },
      create: { destinationId: rome.id, ...z },
    });
    zoneBySlug.set(z.slug, zone);
  }

  let manifest: PhotoManifestEntry[] = [];
  try {
    manifest = JSON.parse(
      await readFile(
        "/private/tmp/claude-501/-Users-constance/f6c42bbe-3c4a-4229-b982-d00b14542e1b/scratchpad/photos_rome/manifest.json",
        "utf-8"
      )
    );
  } catch {
    console.log("No photo manifest found yet — seeding without photos.");
  }

  // Final accepted photos live in seed-assets/rome-photos/<slug>.jpg
  // (resized, false positives already excluded) — same pattern as every
  // other destination this session. The Dockerfile bakes this folder
  // into storage/photos at build time.
  const PHOTOS_DIR = "seed-assets/rome-photos";

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
        name: def.name, destinationId: rome.id, zoneId: zone?.id, status: "PUBLISHED",
        lat: def.lat, lng: def.lng, description: def.description, whyVisit: def.whyVisit,
        littleTip: def.littleTip, indicativeDuration: def.indicativeDuration,
        indicativePrice: def.indicativePrice, isFictionalDemo: false,
      },
      create: {
        slug: def.slug, destinationId: rome.id, zoneId: zone?.id, name: def.name,
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

  console.log(`Rome seed complete: ${PLACES.length} places, ${photoCount} with real photos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
