/**
 * Milan — second Italy destination, built from the admin "Nouvelle
 * destination" request queue: "faire milan et alentour" (75 places
 * targeted). Covers the Duomo/centre, Brera, the Navigli canals,
 * Castello Sforzesco and the fashion Quadrilatero, plus two genuine
 * day-trip excursions captured by "alentour" — the Certosa di Pavia
 * and Lake Como. Same pattern as every other destination: real places,
 * real coordinates, Wikimedia Commons photos only when a genuine match
 * exists, no zoos, restaurants priced across every range.
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
  // ---------- Duomo & Centro ----------
  {
    slug: "duomo-milano",
    name: "Duomo di Milano",
    zone: "duomo-centro",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4642, lng: 9.1900,
    description: "La plus grande cathédrale gothique d'Italie, construite sur près de six siècles, hérissée de 135 flèches et de plus de 3 400 statues.",
    whyVisit: "Le symbole absolu de Milan, impressionnant tant pour son échelle que pour la finesse de ses détails sculptés.",
    littleTip: "Montez sur les terrasses du toit (par escalier ou ascenseur) pour marcher littéralement entre les flèches et statues, avec vue sur toute la ville.",
    indicativeDuration: "1h30-2h (avec les terrasses)",
  },
  {
    slug: "galleria-vittorio-emanuele",
    name: "Galleria Vittorio Emanuele II",
    zone: "duomo-centro",
    categories: ["incontournables", "shopping"],
    lat: 45.4654, lng: 9.1896,
    description: "L'une des plus anciennes galeries commerciales couvertes au monde, achevée en 1877, surnommée le \"salon de Milan\" pour son élégance architecturale.",
    whyVisit: "Un décor somptueux pour le shopping de luxe, juste à côté du Duomo.",
    littleTip: "Tournez trois fois sur le talon posé sur les testicules du taureau de la mosaïque centrale — la tradition locale promet bonne fortune.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "teatro-alla-scala",
    name: "Teatro alla Scala",
    zone: "duomo-centro",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4676, lng: 9.1897,
    description: "L'un des opéras les plus prestigieux au monde, où ont été créées des œuvres majeures de Verdi et Puccini, encore en activité depuis 1778.",
    whyVisit: "Le temple de l'opéra italien, pour un spectacle ou simplement la visite du musée attenant.",
    littleTip: "Le musée du théâtre permet souvent d'apercevoir la salle elle-même sans acheter de billet de spectacle, selon les répétitions en cours.",
    indicativeDuration: "45 min (musée) à 3h (spectacle)",
  },
  {
    slug: "piazza-mercanti-milano",
    name: "Piazza Mercanti",
    zone: "duomo-centro",
    categories: ["quartiers-balades", "temples-patrimoine"],
    lat: 45.4634, lng: 9.1876,
    description: "Une place médiévale cachée entre le Duomo et le Castello, cœur commercial et administratif de Milan avant l'urbanisation moderne.",
    whyVisit: "Un îlot médiéval paisible à deux pas du Duomo, souvent ignoré par les visiteurs pressés.",
    littleTip: "Le Palazzo della Ragione, qui domine la place, servait autrefois de tribunal et de lieu de marché couvert.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "palazzo-reale-milano",
    name: "Palazzo Reale",
    zone: "duomo-centro",
    categories: ["temples-patrimoine"],
    lat: 45.4624, lng: 9.1908,
    description: "L'ancienne résidence des ducs de Milan puis des gouverneurs autrichiens, aujourd'hui centre d'expositions d'art temporaires de grande qualité, juste derrière le Duomo.",
    whyVisit: "Des expositions temporaires de rang international, dans un cadre historique directement voisin du Duomo.",
    littleTip: "Vérifiez le programme d'exposition en cours avant de venir — la qualité et la thématique changent entièrement plusieurs fois par an.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "museo-novecento",
    name: "Museo del Novecento",
    zone: "duomo-centro",
    categories: ["temples-patrimoine"],
    lat: 45.4634, lng: 9.1897,
    description: "Un musée d'art italien du XXe siècle avec une vue imprenable sur le Duomo depuis ses baies vitrées, installé dans un palais fasciste réhabilité.",
    whyVisit: "Une collection d'art moderne italien de qualité, avec l'un des meilleurs points de vue gratuits sur le Duomo depuis l'intérieur.",
    littleTip: "La salle du dernier étage, entièrement vitrée face au Duomo, est aussi belle que les œuvres elles-mêmes.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "via-dante-milano",
    name: "Via Dante",
    zone: "duomo-centro",
    categories: ["quartiers-balades", "shopping"],
    lat: 45.4655, lng: 9.1840,
    description: "Une rue piétonne commerçante qui relie la Piazza Cordusio au Castello Sforzesco, bordée de boutiques et de cafés.",
    whyVisit: "Un axe pratique et agréable pour relier à pied le Duomo au Castello Sforzesco.",
    littleTip: "La rue est particulièrement animée en fin d'après-midi, quand les Milanais sortent du travail pour l'apéritif.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "piazza-della-scala",
    name: "Piazza della Scala",
    zone: "duomo-centro",
    categories: ["quartiers-balades", "incontournables"],
    lat: 45.4670, lng: 9.1895,
    description: "La place devant l'opéra de la Scala, ornée d'une statue de Léonard de Vinci entourée de ses élèves milanais.",
    whyVisit: "Un point de passage incontournable entre le Duomo et la Galleria Vittorio Emanuele.",
    littleTip: "La statue rappelle que Léonard de Vinci vécut près de vingt ans à Milan, au service des ducs Sforza.",
    indicativeDuration: "10-15 min",
  },
  {
    slug: "pasticceria-cova",
    name: "Pasticceria Cova",
    zone: "duomo-centro",
    categories: ["cafes-brunchs", "temples-patrimoine"],
    lat: 45.4686, lng: 9.1950,
    description: "Une pâtisserie historique fondée en 1817, fréquentée jadis par Verdi et Stendhal, référence du panettone artisanal milanais.",
    whyVisit: "Une institution de la pâtisserie milanaise, pour un café et une pâtisserie dans un cadre Belle Époque.",
    littleTip: "Le panettone de Cova, vendu toute l'année et pas seulement à Noël, reste l'un des plus réputés de Milan.",
    indicativeDuration: "30-45 min",
    indicativePrice: "$$",
  },
  {
    slug: "ristorante-savini",
    name: "Ristorante Savini",
    zone: "duomo-centro",
    categories: ["restaurants"],
    lat: 45.4654, lng: 9.1896,
    description: "Un restaurant historique niché dans la Galleria Vittorio Emanuele depuis 1867, référence de la haute gastronomie milanaise élégante.",
    whyVisit: "Un cadre Belle Époque raffiné pour un repas gastronomique, en plein cœur de la galerie la plus célèbre de Milan.",
    littleTip: "Le menu midi est nettement plus accessible que la carte du soir pour découvrir l'adresse sans se ruiner.",
    indicativeDuration: "1h30-2h",
    indicativePrice: "$$$$",
  },
  {
    slug: "biblioteca-ambrosiana",
    name: "Biblioteca Ambrosiana",
    zone: "duomo-centro",
    categories: ["temples-patrimoine"],
    lat: 45.4615, lng: 9.1870,
    description: "Une bibliothèque historique fondée en 1609, qui conserve le Codex Atlanticus, le plus grand recueil de dessins et notes de Léonard de Vinci.",
    whyVisit: "Voir des pages originales des carnets de Léonard de Vinci, en personne, loin de la foule des grands musées.",
    littleTip: "Les pages exposées du Codex Atlanticus changent régulièrement pour préserver les documents originaux de la lumière.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "giacomo-arengario",
    name: "Giacomo Arengario",
    zone: "duomo-centro",
    categories: ["restaurants", "points-de-vue"],
    lat: 45.4638, lng: 9.1898,
    description: "Un restaurant élégant installé au-dessus du Museo del Novecento, avec une terrasse offrant une vue directe et rapprochée sur les flèches du Duomo.",
    whyVisit: "Le meilleur cadre pour un déjeuner ou un apéritif avec vue imprenable sur le Duomo depuis une terrasse.",
    littleTip: "Réservez une table en terrasse à l'avance, surtout pour un coucher de soleil sur les flèches du Duomo.",
    indicativeDuration: "1h30",
    indicativePrice: "$$$$",
  },
  {
    slug: "chiesa-san-satiro",
    name: "Chiesa di San Satiro",
    zone: "duomo-centro",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 45.4625, lng: 9.1875,
    description: "Une petite église Renaissance célèbre pour son chœur en trompe-l'œil architectural, qui simule une profondeur de plusieurs mètres sur un espace de seulement quelques centimètres.",
    whyVisit: "Une illusion architecturale aussi brillante que celle de l'église Sant'Ignazio à Rome, mais nettement moins connue.",
    littleTip: "L'illusion ne fonctionne parfaitement que depuis l'entrée de l'église — approchez-vous ensuite pour voir le véritable espace, bien plus réduit.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "museo-poldi-pezzoli",
    name: "Museo Poldi Pezzoli",
    zone: "duomo-centro",
    categories: ["temples-patrimoine"],
    lat: 45.4698, lng: 9.1915,
    description: "L'ancien hôtel particulier d'un collectionneur milanais du XIXe siècle, avec des œuvres de Botticelli, du Pollaiuolo et une remarquable collection d'horloges et armures.",
    whyVisit: "Un musée intimiste de grande qualité, à deux pas du quartier de la mode.",
    littleTip: "Le Portrait de jeune femme attribué à Piero della Francesca ou au Pollaiuolo est la pièce la plus admirée de la collection.",
    indicativeDuration: "1h",
  },

  // ---------- Brera & Garibaldi ----------
  {
    slug: "pinacoteca-brera",
    name: "Pinacoteca di Brera",
    zone: "brera-garibaldi",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4718, lng: 9.1880,
    description: "La plus grande galerie de peinture de Milan, avec des chefs-d'œuvre de Mantegna, Raphaël, Caravage et Bellini, installée dans un ancien palais jésuite.",
    whyVisit: "La collection de peinture la plus riche de Milan, un incontournable pour les passionnés d'art italien.",
    littleTip: "Le Christ mort de Mantegna, avec sa perspective audacieuse, est considéré comme l'une des œuvres les plus novatrices de la Renaissance italienne.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "via-brera",
    name: "Via Brera",
    zone: "brera-garibaldi",
    categories: ["quartiers-balades", "shopping"],
    lat: 45.4710, lng: 9.1870,
    description: "La rue principale du quartier artistique de Brera, bordée de galeries d'art, antiquaires et terrasses de cafés.",
    whyVisit: "Le cœur bohème et élégant de Milan, parfait pour une balade entre deux musées.",
    littleTip: "Le quartier est particulièrement animé le week-end, quand artistes de rue et marchés d'art s'y installent parfois.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "orto-botanico-brera",
    name: "Orto Botanico di Brera",
    zone: "brera-garibaldi",
    categories: ["quartiers-balades", "activites-famille"],
    lat: 45.4722, lng: 9.1873,
    description: "Un petit jardin botanique secret du XVIIIe siècle, caché derrière le palais de Brera, quasiment inconnu des touristes.",
    whyVisit: "Une pause verte et silencieuse en plein centre de Milan, un des secrets les mieux gardés de la ville.",
    littleTip: "L'entrée est gratuite et l'accès se fait par une petite porte discrète, facile à manquer si l'on ne sait pas où regarder.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "chiesa-san-marco-milano",
    name: "Chiesa di San Marco",
    zone: "brera-garibaldi",
    categories: ["temples-patrimoine"],
    lat: 45.4745, lng: 9.1865,
    description: "Une église gothique du XIIIe siècle où fut célébré en 1807 le mariage religieux posthume des parents de Napoléon, avec un intérieur baroque richement décoré.",
    whyVisit: "Un bel exemple d'architecture gothique lombarde, nettement moins fréquenté que le Duomo.",
    littleTip: "L'église est réputée pour son excellente acoustique et accueille régulièrement des concerts de musique classique.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "corso-garibaldi",
    name: "Corso Garibaldi",
    zone: "brera-garibaldi",
    categories: ["quartiers-balades", "bars-rooftops"],
    lat: 45.4780, lng: 9.1830,
    description: "Une rue piétonne commerçante animée qui relie Brera au quartier moderne de Porta Nuova, bordée de bars et petits restaurants.",
    whyVisit: "Un bon axe pour l'apéritif milanais (aperitivo), tradition locale incontournable en fin de journée.",
    littleTip: "L'aperitivo milanais inclut traditionnellement un buffet généreux compris dans le prix de la boisson — demandez les horaires, généralement 18h-21h.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "basilica-sant-ambrogio",
    name: "Basilica di Sant'Ambrogio",
    zone: "brera-garibaldi",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4625, lng: 9.1750,
    description: "Une basilique romane fondée au IVe siècle par saint Ambroise lui-même, patron de Milan, l'une des plus anciennes églises de la ville encore en activité.",
    whyVisit: "Un témoignage architectural exceptionnel du début du christianisme milanais, dans un cadre roman austère et puissant.",
    littleTip: "La crypte conserve le corps de saint Ambroise, visible dans un reliquaire de verre entre deux autres saints martyrs.",
    indicativeDuration: "45 min",
  },
  {
    slug: "chiesa-santa-maria-carmine",
    name: "Chiesa di Santa Maria del Carmine",
    zone: "brera-garibaldi",
    categories: ["temples-patrimoine"],
    lat: 45.4720, lng: 9.1850,
    description: "Une église gothique sur une place paisible de Brera, dont la façade néogothique du XIXe siècle cache un intérieur plus ancien richement décoré.",
    whyVisit: "Une église typique du quartier de Brera, à intégrer naturellement dans une balade du secteur.",
    littleTip: "La place devant l'église est un bon point de pause tranquille, loin de l'agitation de la Via Brera voisine.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "bar-jamaica-milano",
    name: "Bar Jamaica",
    zone: "brera-garibaldi",
    categories: ["bars-rooftops", "experiences-insolites"],
    lat: 45.4725, lng: 9.1855,
    description: "Un bar historique de Brera fréquenté depuis les années 1920 par artistes et intellectuels milanais, dont un jeune Hemingway en son temps.",
    whyVisit: "Une capsule temporelle de la vie bohème milanaise du XXe siècle, toujours en activité.",
    littleTip: "Les murs sont couverts de photos et souvenirs des décennies d'artistes qui ont fréquenté l'endroit — un vrai petit musée informel.",
    indicativeDuration: "45 min-1h",
    indicativePrice: "$$",
  },
  {
    slug: "cenacolo-vinciano",
    name: "Cenacolo Vinciano (Santa Maria delle Grazie)",
    zone: "brera-garibaldi",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4659, lng: 9.1708,
    description: "La fresque de la Cène de Léonard de Vinci, peinte entre 1495 et 1498 sur le mur du réfectoire d'un couvent dominicain, l'une des œuvres les plus célèbres au monde.",
    whyVisit: "Voir en personne l'un des chefs-d'œuvre absolus de l'histoire de l'art, dans son emplacement d'origine inchangé depuis plus de cinq siècles.",
    littleTip: "Réservez impérativement plusieurs semaines, voire plusieurs mois à l'avance — seuls de petits groupes sont admis pour 15 minutes à la fois, afin de préserver la fresque fragile.",
    indicativeDuration: "15-20 min (créneau strict)",
  },
  {
    slug: "pirelli-hangarbicocca",
    name: "Pirelli HangarBicocca",
    zone: "brera-garibaldi",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 45.5180, lng: 9.2110,
    description: "Un ancien hangar industriel transformé en l'un des plus grands espaces d'art contemporain d'Europe, avec une installation permanente monumentale d'Anselm Kiefer.",
    whyVisit: "Un espace d'art contemporain spectaculaire et gratuit, dans un cadre industriel brut unique à Milan.",
    littleTip: "L'entrée est entièrement gratuite — une rareté pour un espace d'art de cette envergure.",
    indicativeDuration: "1h30-2h",
  },

  // ---------- Navigli ----------
  {
    slug: "naviglio-grande",
    name: "Naviglio Grande",
    zone: "navigli",
    categories: ["incontournables", "quartiers-balades"],
    lat: 45.4510, lng: 9.1730,
    description: "Le plus ancien et le plus animé des canaux de Milan, bordé de restaurants, bars et boutiques vintage, cœur de la vie nocturne milanaise depuis des décennies.",
    whyVisit: "L'ambiance la plus festive et pittoresque de Milan, surtout belle à la tombée de la nuit avec les reflets sur l'eau.",
    littleTip: "Le dernier dimanche du mois (sauf juillet-août), un grand marché aux puces d'antiquités s'installe le long du canal.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "naviglio-pavese",
    name: "Naviglio Pavese",
    zone: "navigli",
    categories: ["quartiers-balades", "bars-rooftops"],
    lat: 45.4450, lng: 9.1820,
    description: "Le second grand canal de Milan, qui relie la ville à Pavie, bordé lui aussi de bars et restaurants mais globalement plus calme que le Naviglio Grande.",
    whyVisit: "Une alternative plus tranquille au Naviglio Grande pour une balade ou un apéritif en soirée.",
    littleTip: "Les deux canaux se rejoignent à la Darsena — une promenade continue permet de voir les deux en une seule sortie.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "darsena-milano",
    name: "Darsena di Milano",
    zone: "navigli",
    categories: ["quartiers-balades", "incontournables"],
    lat: 45.4502, lng: 9.1795,
    description: "L'ancien bassin portuaire de Milan, rénové en vaste esplanade piétonne qui relie les deux canaux Navigli, avec de larges quais pour se promener.",
    whyVisit: "Le point de jonction idéal pour explorer les deux Navigli, avec de grands espaces pour se détendre au bord de l'eau.",
    littleTip: "Les escaliers-gradins descendant vers l'eau sont un lieu de rassemblement populaire pour l'apéritif en plein air aux beaux jours.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "vicolo-lavandai",
    name: "Vicolo dei Lavandai",
    zone: "navigli",
    categories: ["experiences-insolites", "quartiers-balades"],
    lat: 45.4525, lng: 9.1700,
    description: "Une ruelle miniature préservant d'anciens lavoirs publics en pierre et bois, derniers témoins du Milan ouvrier où l'on lavait le linge au bord du canal.",
    whyVisit: "Un petit coin pittoresque et méconnu, témoin du Milan populaire d'avant l'industrialisation moderne.",
    littleTip: "Le lieu est minuscule — comptez quelques minutes seulement, idéal en complément d'une balade plus longue le long du Naviglio Grande.",
    indicativeDuration: "10-15 min",
  },
  {
    slug: "colonne-san-lorenzo",
    name: "Colonne di San Lorenzo",
    zone: "navigli",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4585, lng: 9.1815,
    description: "Seize colonnes romaines antiques du IIe siècle, déplacées ici au IVe siècle, qui forment aujourd'hui un lieu de rassemblement populaire devant la basilique San Lorenzo Maggiore.",
    whyVisit: "Un vestige antique inattendu en plein quartier animé, devenu un lieu de vie nocturne étudiante très prisé.",
    littleTip: "La place devant les colonnes est l'un des lieux de rassemblement en plein air les plus populaires de Milan en soirée, surtout pour les étudiants.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "basilica-san-lorenzo-maggiore-milano",
    name: "Basilica di San Lorenzo Maggiore",
    zone: "navigli",
    categories: ["temples-patrimoine"],
    lat: 45.4583, lng: 9.1810,
    description: "L'une des plus anciennes églises de Milan, fondée au IVe siècle, dont la chapelle octogonale Sant'Aquilino conserve des mosaïques paléochrétiennes rares.",
    whyVisit: "Un témoignage architectural exceptionnel du Milan paléochrétien, juste derrière les colonnes romaines.",
    littleTip: "La chapelle Sant'Aquilino, payante séparément, conserve certaines des plus anciennes mosaïques chrétiennes du nord de l'Italie.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "chiesa-san-cristoforo-naviglio",
    name: "Chiesa di San Cristoforo sul Naviglio",
    zone: "navigli",
    categories: ["temples-patrimoine", "quartiers-balades"],
    lat: 45.4390, lng: 9.1830,
    description: "Une église médiévale au bord du Naviglio Grande, en réalité composée de deux églises jumelles bâties côte à côte au fil des siècles.",
    whyVisit: "Une étape paisible en bout de promenade le long du Naviglio Grande, loin de l'agitation du centre.",
    littleTip: "L'église doit son nom à saint Christophe, patron des voyageurs, invoqué autrefois par les bateliers du canal.",
    indicativeDuration: "20 min",
  },
  {
    slug: "ristorante-el-brellin",
    name: "Ristorante El Brellin",
    zone: "navigli",
    categories: ["restaurants"],
    lat: 45.4525, lng: 9.1710,
    description: "Un restaurant installé dans un ancien lavoir du XVIIIe siècle au bord du Naviglio Grande, réputé pour sa cuisine milanaise traditionnelle (risotto, cotoletta).",
    whyVisit: "Un cadre historique charmant au bord du canal, pour goûter les classiques de la cuisine milanaise.",
    littleTip: "La terrasse au bord du canal est particulièrement demandée en été — réservez à l'avance pour le dîner.",
    indicativeDuration: "1h30",
    indicativePrice: "$$$",
  },
  {
    slug: "mudec-milano",
    name: "MUDEC (Museo delle Culture)",
    zone: "navigli",
    categories: ["temples-patrimoine"],
    lat: 45.4530, lng: 9.1680,
    description: "Un musée contemporain dédié aux cultures du monde, installé dans une ancienne usine industrielle réhabilitée par l'architecte David Chipperfield.",
    whyVisit: "Des expositions temporaires de qualité internationale, dans un bâtiment industriel réhabilité avec élégance.",
    littleTip: "Le musée accueille régulièrement de grandes expositions photographiques, parfois plus intéressantes que la collection permanente.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "fondazione-prada",
    name: "Fondazione Prada",
    zone: "navigli",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 45.4440, lng: 9.1960,
    description: "Un ancien site industriel transformé par l'architecte Rem Koolhaas en centre d'art contemporain spectaculaire, dont l'un des bâtiments est entièrement recouvert de feuille d'or.",
    whyVisit: "Un espace architectural audacieux et des expositions d'art contemporain parmi les plus pointues de Milan.",
    littleTip: "Le bâtiment doré (\"Haunted House\") contraste volontairement avec le béton brut des entrepôts industriels d'origine, un choix architectural délibéré de Koolhaas.",
    indicativeDuration: "1h30-2h",
  },

  // ---------- Castello Sforzesco & Parco Sempione ----------
  {
    slug: "castello-sforzesco",
    name: "Castello Sforzesco",
    zone: "castello-sempione",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4706, lng: 9.1797,
    description: "Une forteresse ducale du XVe siècle construite par la famille Sforza, qui abrite aujourd'hui plusieurs musées, dont la dernière sculpture inachevée de Michel-Ange.",
    whyVisit: "Un château médiéval majestueux au cœur de Milan, avec une collection de musées variée incluse dans la visite.",
    littleTip: "La Pietà Rondanini, dernière œuvre inachevée de Michel-Ange, se trouve dans une salle dédiée au sein du musée du château.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "parco-sempione",
    name: "Parco Sempione",
    zone: "castello-sempione",
    categories: ["incontournables", "activites-famille"],
    lat: 45.4737, lng: 9.1750,
    description: "Le plus grand parc du centre de Milan, aménagé derrière le Castello Sforzesco, avec un style paysager anglais et un petit lac.",
    whyVisit: "Le poumon vert de Milan, parfait pour une pause après la visite du château.",
    littleTip: "Le parc relie directement le Castello Sforzesco à l'Arco della Pace, parfait pour une promenade continue.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "arco-della-pace",
    name: "Arco della Pace",
    zone: "castello-sempione",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4772, lng: 9.1711,
    description: "Un arc de triomphe néoclassique commencé par Napoléon pour célébrer ses victoires, achevé ensuite en hommage à la paix européenne après sa chute.",
    whyVisit: "Un monument monumental à l'entrée nord du Parco Sempione, souvent moins fréquenté que le centre historique.",
    littleTip: "Le rond-point autour de l'arc est particulièrement photogénique illuminé la nuit.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "torre-branca",
    name: "Torre Branca",
    zone: "castello-sempione",
    categories: ["points-de-vue", "experiences-insolites"],
    lat: 45.4740, lng: 9.1745,
    description: "Une tour d'observation métallique de 108 mètres construite en 1933, offrant une vue panoramique sur tout Milan et, par temps clair, sur les Alpes.",
    whyVisit: "Le meilleur point de vue aérien sur le Parco Sempione et le Castello Sforzesco depuis les hauteurs.",
    littleTip: "Par temps très clair, surtout en hiver, la chaîne des Alpes est visible à l'horizon depuis le sommet de la tour.",
    indicativeDuration: "30-45 min",
    indicativePrice: "$$",
  },
  {
    slug: "acquario-civico-milano",
    name: "Acquario Civico di Milano",
    zone: "castello-sempione",
    categories: ["activites-famille", "temples-patrimoine"],
    lat: 45.4735, lng: 9.1790,
    description: "Le plus ancien aquarium encore en activité d'Italie, construit en 1906 pour une exposition universelle, niché à l'entrée du Parco Sempione.",
    whyVisit: "Une sortie en famille agréable et rapide, dans un bâtiment Art nouveau historique.",
    littleTip: "L'entrée reste gratuite, une rareté pour ce type d'attraction dans une grande ville européenne.",
    indicativeDuration: "45 min",
  },
  {
    slug: "triennale-milano",
    name: "Triennale di Milano",
    zone: "castello-sempione",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 45.4745, lng: 9.1735,
    description: "Un palais des années 1930 dédié au design et à l'architecture italiens, qui organise régulièrement de grandes expositions internationales sur ces thèmes.",
    whyVisit: "Milan étant la capitale mondiale du design, cet espace en retrace l'histoire et les tendances actuelles.",
    littleTip: "Le café-restaurant du rez-de-chaussée, avec vue sur le parc, est agréable même sans visiter les expositions.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "cimitero-monumentale-milano",
    name: "Cimitero Monumentale",
    zone: "castello-sempione",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 45.4840, lng: 9.1790,
    description: "Un cimetière monumental du XIXe siècle considéré comme un véritable musée de sculpture funéraire à ciel ouvert, où reposent de grandes figures milanaises.",
    whyVisit: "Un musée de sculpture gratuit et impressionnant, nettement moins connu des visiteurs étrangers.",
    littleTip: "Le Famedio, bâtiment central, abrite les tombes des citoyens milanais les plus illustres, dont l'écrivain Alessandro Manzoni.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "piazzale-cadorna",
    name: "Piazzale Cadorna",
    zone: "castello-sempione",
    categories: ["experiences-insolites", "quartiers-balades"],
    lat: 45.4682, lng: 9.1755,
    description: "Une place devant la gare de Milano Cadorna, marquée par une sculpture monumentale colorée en forme d'aiguille et de fil, œuvre de Claes Oldenburg.",
    whyVisit: "Une sculpture contemporaine spectaculaire et inattendue devant une gare du quotidien.",
    littleTip: "La sculpture, surnommée \"l'Aiguille de Milan\", mesure plus de 19 mètres de haut et pèse plus de 70 tonnes.",
    indicativeDuration: "10-15 min",
  },
  {
    slug: "museo-boschi-di-stefano",
    name: "Casa Museo Boschi Di Stefano",
    zone: "castello-sempione",
    categories: ["temples-patrimoine"],
    lat: 45.4760, lng: 9.2050,
    description: "Un appartement privé des années 1930 transformé en musée, qui conserve plus de 300 œuvres d'art italien du XXe siècle collectionnées par un couple de mécènes milanais.",
    whyVisit: "Une collection d'art italien moderne intimiste, dans un appartement d'époque préservé dans ses moindres détails.",
    littleTip: "L'entrée est entièrement gratuite, et le musée reste très peu connu même des Milanais eux-mêmes.",
    indicativeDuration: "45 min-1h",
  },

  // ---------- Porta Nuova, Isola & Quadrilatero ----------
  {
    slug: "bosco-verticale",
    name: "Bosco Verticale",
    zone: "porta-nuova",
    categories: ["incontournables", "experiences-insolites"],
    lat: 45.4860, lng: 9.1905,
    description: "Deux tours résidentielles couvertes de plus de 800 arbres et 20 000 plantes, projet architectural récompensé mondialement pour sa vision de la ville verte verticale.",
    whyVisit: "L'un des symboles les plus photographiés du Milan contemporain, une vraie forêt suspendue en plein quartier d'affaires.",
    littleTip: "La meilleure vue d'ensemble des deux tours s'obtient depuis la Piazza Gae Aulenti, juste en face.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "piazza-gae-aulenti",
    name: "Piazza Gae Aulenti",
    zone: "porta-nuova",
    categories: ["incontournables", "quartiers-balades"],
    lat: 45.4840, lng: 9.1900,
    description: "Une place circulaire ultramoderne au cœur du quartier d'affaires de Porta Nuova, entourée de gratte-ciel et dotée d'une fontaine à jets d'eau synchronisés.",
    whyVisit: "Le symbole du Milan le plus contemporain et ambitieux, totalement différent du centre historique.",
    littleTip: "En été, les enfants s'amusent souvent dans les jets d'eau synchronisés de la fontaine centrale.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "torre-unicredit",
    name: "Torre UniCredit",
    zone: "porta-nuova",
    categories: ["points-de-vue", "experiences-insolites"],
    lat: 45.4845, lng: 9.1905,
    description: "Le plus haut gratte-ciel d'Italie, culminant à 231 mètres avec sa flèche, symbole du nouveau skyline financier de Milan.",
    whyVisit: "Le repère visuel incontournable du nouveau quartier d'affaires milanais, visible depuis une grande partie de la ville.",
    littleTip: "La tour ne se visite pas à l'intérieur (bureaux privés), mais son illumination nocturne change de couleur selon les événements de la ville.",
    indicativeDuration: "10-15 min",
  },
  {
    slug: "isola-quartiere",
    name: "Quartiere Isola",
    zone: "porta-nuova",
    categories: ["quartiers-balades", "bars-rooftops"],
    lat: 45.4865, lng: 9.1880,
    description: "Un ancien quartier ouvrier devenu l'un des plus créatifs de Milan, avec ses ruelles typiques coincées entre les gratte-ciel modernes de Porta Nuova.",
    whyVisit: "Un contraste saisissant entre village populaire ancien et skyline futuriste, à quelques mètres de distance.",
    littleTip: "Le marché de Isola, encore très local, contraste agréablement avec l'architecture ultramoderne alentour.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "corso-como",
    name: "Corso Como",
    zone: "porta-nuova",
    categories: ["shopping", "bars-rooftops"],
    lat: 45.4820, lng: 9.1880,
    description: "Une rue réputée pour le concept-store 10 Corso Como, référence mondiale de la mode et du design, et pour sa vie nocturne animée.",
    whyVisit: "Le meilleur axe pour la mode avant-gardiste et une vie nocturne élégante, à deux pas de Porta Nuova.",
    littleTip: "10 Corso Como combine boutique, galerie d'art, librairie et café — prévoyez du temps pour tout explorer.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "mercato-isola",
    name: "Mercato comunale di Isola",
    zone: "porta-nuova",
    categories: ["marches", "street-food"],
    lat: 45.4870, lng: 9.1875,
    description: "Un marché de quartier traditionnel au cœur de Isola, fréquenté par les habitants pour leurs courses quotidiennes, loin des circuits touristiques.",
    whyVisit: "Une immersion dans la vie de quartier milanaise authentique, à quelques mètres seulement des gratte-ciel.",
    littleTip: "Les étals de charcuterie et fromages y sont nettement moins chers que dans les épiceries fines du centre.",
    indicativeDuration: "30 min",
    indicativePrice: "$",
  },
  {
    slug: "via-montenapoleone",
    name: "Via Montenapoleone",
    zone: "porta-nuova",
    categories: ["incontournables", "shopping"],
    lat: 45.4690, lng: 9.1945,
    description: "La rue de la mode de luxe la plus prestigieuse de Milan, cœur du Quadrilatero della Moda, bordée des plus grandes maisons italiennes et internationales.",
    whyVisit: "Le meilleur axe pour le shopping de luxe et observer l'élégance milanaise par excellence.",
    littleTip: "Même sans acheter, les vitrines des grandes maisons sont redessinées régulièrement comme de véritables œuvres d'art éphémères.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "via-della-spiga",
    name: "Via della Spiga",
    zone: "porta-nuova",
    categories: ["shopping", "quartiers-balades"],
    lat: 45.4705, lng: 9.1955,
    description: "Une rue piétonne parallèle à la Via Montenapoleone, considérée comme encore plus élégante et paisible, au cœur du Quadrilatero della Moda.",
    whyVisit: "Une alternative plus tranquille à la Via Montenapoleone pour le même niveau de shopping de luxe.",
    littleTip: "La rue est entièrement piétonne, ce qui la rend plus agréable à parcourir que la Via Montenapoleone, partiellement ouverte à la circulation.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "palazzo-morando",
    name: "Palazzo Morando",
    zone: "porta-nuova",
    categories: ["temples-patrimoine"],
    lat: 45.4680, lng: 9.1965,
    description: "Un palais du Quadrilatero della Moda transformé en musée du costume, de la mode et des images, retraçant l'histoire de la mode milanaise.",
    whyVisit: "Un musée parfaitement complémentaire au shopping du quartier, pour comprendre l'histoire de la capitale mondiale de la mode.",
    littleTip: "L'entrée est gratuite et le musée reste nettement moins fréquenté que son emplacement prestigieux ne le laisserait penser.",
    indicativeDuration: "45 min",
  },
  {
    slug: "pasticceria-marchesi-montenapoleone",
    name: "Pasticceria Marchesi (Montenapoleone)",
    zone: "porta-nuova",
    categories: ["cafes-brunchs"],
    lat: 45.4695, lng: 9.1948,
    description: "Une pâtisserie historique milanaise fondée en 1824, dont la boutique du Quadrilatero della Moda, rachetée par le groupe Prada, a conservé tout son charme Belle Époque.",
    whyVisit: "Un café et une pâtisserie dans un décor somptueux, au cœur du quartier de la mode.",
    littleTip: "Le décor vert d'eau et les boiseries d'origine ont été minutieusement préservés lors de la rénovation par Prada.",
    indicativeDuration: "30-45 min",
    indicativePrice: "$$$",
  },
  {
    slug: "chiesa-san-babila",
    name: "Chiesa di San Babila",
    zone: "porta-nuova",
    categories: ["temples-patrimoine"],
    lat: 45.4668, lng: 9.1990,
    description: "Une des plus anciennes églises de Milan, d'origine paléochrétienne, reconstruite plusieurs fois, qui marque l'entrée du quartier de la mode.",
    whyVisit: "Un point de repère historique discret à l'entrée du Quadrilatero della Moda.",
    littleTip: "La place devant l'église est un bon point de départ pour explorer ensuite la Via Montenapoleone à pied.",
    indicativeDuration: "15-20 min",
  },

  // ---------- Certosa di Pavia (excursion) ----------
  {
    slug: "certosa-di-pavia",
    name: "Certosa di Pavia",
    zone: "pavia",
    categories: ["incontournables", "temples-patrimoine", "excursions"],
    lat: 45.2633, lng: 9.1420,
    description: "Un monastère chartreux du XVe siècle à la façade de marbre richement sculptée, l'un des chefs-d'œuvre absolus de l'architecture Renaissance lombarde.",
    whyVisit: "Une des plus belles façades Renaissance d'Italie, dans un cadre champêtre paisible à moins d'une heure de Milan.",
    littleTip: "Les moines cisterciens qui y résident encore vendent de la chartreuse et d'autres liqueurs produites sur place.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "centro-storico-pavia",
    name: "Centro storico di Pavia",
    zone: "pavia",
    categories: ["quartiers-balades", "excursions"],
    lat: 45.1847, lng: 9.1582,
    description: "Une ville universitaire médiévale aux rues pavées, ancienne capitale du royaume lombard, avec de nombreuses tours médiévales encore debout.",
    whyVisit: "Une petite ville italienne authentique, à combiner naturellement avec la visite de la Certosa.",
    littleTip: "Pavie conserve encore plusieurs tours médiévales penchées, vestiges d'une époque où la ville en comptait des dizaines.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "ponte-coperto-pavia",
    name: "Ponte Coperto",
    zone: "pavia",
    categories: ["incontournables", "temples-patrimoine", "excursions"],
    lat: 45.1820, lng: 9.1560,
    description: "Un pont couvert emblématique de Pavie sur le fleuve Tessin, reconstruit au XXe siècle dans le style de l'original médiéval détruit par les bombardements.",
    whyVisit: "Le symbole visuel de Pavie, particulièrement photogénique au coucher du soleil sur le Tessin.",
    littleTip: "Une petite chapelle est intégrée au milieu du pont, tradition qui remonte au pont médiéval d'origine.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "universita-pavia",
    name: "Università di Pavia",
    zone: "pavia",
    categories: ["temples-patrimoine", "excursions"],
    lat: 45.1860, lng: 9.1570,
    description: "Une des plus anciennes universités d'Europe, fondée en 1361, qui compta parmi ses professeurs le physicien Alessandro Volta.",
    whyVisit: "Un campus historique prestigieux, avec des cours intérieures Renaissance ouvertes au public.",
    littleTip: "Le musée d'histoire naturelle de l'université conserve certains instruments originaux ayant servi aux expériences de Volta.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "castello-visconteo-pavia",
    name: "Castello Visconteo di Pavia",
    zone: "pavia",
    categories: ["temples-patrimoine", "excursions"],
    lat: 45.1870, lng: 9.1530,
    description: "Un château médiéval fortifié construit par les Visconti, seigneurs de Milan avant les Sforza, aujourd'hui musée municipal de Pavie.",
    whyVisit: "Un château médiéval impressionnant, complément naturel à la visite de la Certosa construite par la même famille.",
    littleTip: "Le musée à l'intérieur conserve d'importantes collections archéologiques et de peinture lombarde.",
    indicativeDuration: "45 min-1h",
  },

  // ---------- Lago di Como (excursion) ----------
  {
    slug: "como-centro",
    name: "Como (centro storico & Duomo)",
    zone: "lago-como",
    categories: ["incontournables", "temples-patrimoine", "excursions"],
    lat: 45.8080, lng: 9.0852,
    description: "La ville principale du lac de Côme, dont la cathédrale gothique-Renaissance domine un centre historique élégant au bord de l'eau.",
    whyVisit: "Le point de départ idéal pour explorer le lac, avec un centre historique charmant à explorer avant de prendre le bateau.",
    littleTip: "Le funiculaire pour Brunate part à quelques minutes à pied du front de lac, parfait pour prolonger la visite en hauteur.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "funicolare-como-brunate",
    name: "Funicolare Como-Brunate",
    zone: "lago-como",
    categories: ["points-de-vue", "experiences-insolites", "excursions"],
    lat: 45.8130, lng: 9.0870,
    description: "Un funiculaire historique datant de 1894, qui grimpe en quelques minutes jusqu'au village de Brunate, offrant une vue plongeante sur tout le lac.",
    whyVisit: "La meilleure vue d'ensemble sur le lac de Côme et les Alpes environnantes, accessible rapidement depuis le centre-ville.",
    littleTip: "Une petite randonnée depuis Brunate mène jusqu'au phare Volta, qui offre une vue encore plus large sur le lac.",
    indicativeDuration: "1h-1h30",
    indicativePrice: "$$",
  },
  {
    slug: "villa-olmo",
    name: "Villa Olmo",
    zone: "lago-como",
    categories: ["temples-patrimoine", "quartiers-balades", "excursions"],
    lat: 45.8140, lng: 9.0700,
    description: "Une villa néoclassique du XVIIIe siècle au bord du lac de Côme, entourée d'un grand parc public gratuit avec vue dégagée sur l'eau.",
    whyVisit: "Un parc élégant et gratuit pour une pause au bord du lac, à quelques minutes à pied du centre de Côme.",
    littleTip: "Le parc est idéal pour un pique-nique avec vue sur le lac, nettement moins fréquenté que le centre-ville.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "bellagio-como",
    name: "Bellagio",
    zone: "lago-como",
    categories: ["incontournables", "quartiers-balades", "excursions"],
    lat: 45.9870, lng: 9.2590,
    description: "Surnommée la \"perle du lac de Côme\", cette petite ville pittoresque occupe la pointe où le lac se divise en deux branches, avec des ruelles en escalier fleuries.",
    whyVisit: "La ville la plus emblématique et photogénique de tout le lac de Côme.",
    littleTip: "Accédez-y en bateau plutôt qu'en voiture — le trajet lui-même offre certaines des plus belles vues du lac.",
    indicativeDuration: "2h-3h",
  },
  {
    slug: "villa-carlotta",
    name: "Villa Carlotta",
    zone: "lago-como",
    categories: ["incontournables", "temples-patrimoine", "excursions"],
    lat: 45.9980, lng: 9.2280,
    description: "Une villa baroque sur la rive ouest du lac, entourée de jardins botaniques spectaculaires, particulièrement célèbres pour leurs azalées et rhododendrons en fleur au printemps.",
    whyVisit: "Les plus beaux jardins botaniques de tout le lac de Côme, avec une collection d'art intérieure incluant des œuvres de Canova.",
    littleTip: "Visitez en avril-mai pour voir les azalées et rhododendrons en pleine floraison, le spectacle le plus spectaculaire des jardins.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "varenna-como",
    name: "Varenna",
    zone: "lago-como",
    categories: ["quartiers-balades", "excursions"],
    lat: 46.0160, lng: 9.2830,
    description: "Un village de pêcheurs pittoresque sur la rive est du lac, moins fréquenté que Bellagio mais tout aussi charmant, avec un château médiéval en hauteur.",
    whyVisit: "Une alternative plus tranquille à Bellagio, avec un charme de village de pêcheurs authentique.",
    littleTip: "Le Sentiero del Viandante, chemin de randonnée longeant le lac, part de Varenna pour qui veut prolonger l'excursion à pied.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "villa-balbianello",
    name: "Villa del Balbianello",
    zone: "lago-como",
    categories: ["temples-patrimoine", "points-de-vue", "excursions"],
    lat: 45.9980, lng: 9.2080,
    description: "Une villa du XVIIIe siècle perchée sur un promontoire du lac, célèbre pour avoir servi de décor à plusieurs films, dont un James Bond et Star Wars.",
    whyVisit: "Un des points de vue les plus romantiques et cinématographiques de tout le lac de Côme.",
    littleTip: "L'accès se fait uniquement à pied depuis Lenno (environ 20 minutes) ou en bateau-taxi directement jusqu'à la villa.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "isola-comacina",
    name: "Isola Comacina",
    zone: "lago-como",
    categories: ["experiences-insolites", "excursions"],
    lat: 45.9880, lng: 9.1650,
    description: "La seule île du lac de Côme, inhabitée depuis sa destruction au Moyen Âge, aujourd'hui site archéologique et lieu de feux d'artifice traditionnels chaque année.",
    whyVisit: "Une petite île chargée d'histoire, accessible uniquement en bateau depuis les villages voisins.",
    littleTip: "Le restaurant de l'île, Locanda dell'Isola Comacina, propose un menu unique fixe servi depuis des décennies selon la même recette.",
    indicativeDuration: "1h-1h30",
  },

  // ---------- Aéroports ----------
  {
    slug: "aeroporto-malpensa",
    name: "Aeroporto di Milano-Malpensa",
    zone: "aeroport",
    categories: [],
    lat: 45.6306, lng: 8.7281,
    description: "Le principal aéroport international de Milan, à environ 45 km au nord-ouest du centre-ville, point d'arrivée de la plupart des vols long-courriers.",
    whyVisit: "Repère pratique pour organiser son arrivée ou son départ de Milan.",
    littleTip: "Le Malpensa Express relie directement l'aéroport aux gares Centrale et Cadorna en 35 à 50 minutes — nettement plus simple qu'un taxi aux heures de pointe.",
  },
  {
    slug: "aeroporto-linate",
    name: "Aeroporto di Milano-Linate",
    zone: "aeroport",
    categories: [],
    lat: 45.4451, lng: 9.2767,
    description: "Le second aéroport de Milan, bien plus proche du centre que Malpensa, principalement utilisé pour les vols domestiques et européens courts.",
    whyVisit: "Repère pratique pour les vols intérieurs ou vers d'autres grandes villes européennes proches.",
    littleTip: "Le bus express 73 relie Linate au centre-ville (San Babila) en seulement 25 minutes environ.",
  },
];

const ZONE_DEFS = [
  {
    slug: "duomo-centro",
    name: "Duomo & Centro",
    mapColor: "#a8422c",
    vibeText: "Le cœur monumental de Milan, entre la cathédrale gothique, la Galleria Vittorio Emanuele et l'opéra de la Scala.",
    prosText: "La plus forte concentration de monuments emblématiques, idéal à pied, cœur de la vie milanaise.",
    consText: "Très touristique autour du Duomo, prix souvent plus élevés sur la Galleria elle-même.",
    transportText: "Stations de métro Duomo et Cordusio, au croisement des lignes M1 et M3.",
    nearbyText: "Brera se rejoint à pied en 10 minutes vers le nord.",
    profileFitText: "Incontournable pour tout premier séjour à Milan.",
    hotelAdviceText: "Hôtels nombreux et centraux, prix souvent élevés en raison de l'emplacement premium.",
  },
  {
    slug: "brera-garibaldi",
    name: "Brera & Garibaldi",
    mapColor: "#c9972e",
    vibeText: "Le quartier artistique et bohème de Milan, entre galeries d'art, la grande pinacothèque et la fresque la plus célèbre du monde.",
    prosText: "Ambiance élégante et artistique, excellents musées, bonne offre de bars pour l'apéritif.",
    consText: "Le Cenacolo Vinciano nécessite une réservation très anticipée, souvent complète des semaines à l'avance.",
    transportText: "Stations de métro Lanza et Moscova, sur la ligne M2.",
    nearbyText: "Le Centro se rejoint à pied en 10 minutes vers le sud.",
    profileFitText: "Pour les passionnés d'art et une ambiance de quartier élégante et bohème.",
    hotelAdviceText: "Quartier élégant et calme la nuit, excellent compromis entre charme et proximité du centre.",
  },
  {
    slug: "navigli",
    name: "Navigli",
    mapColor: "#2e86ab",
    vibeText: "Le quartier des canaux historiques de Milan, entre vie nocturne animée, marché aux antiquités et art contemporain industriel.",
    prosText: "Ambiance festive et pittoresque, excellente vie nocturne, architecture industrielle réhabilitée.",
    consText: "Très animé et bruyant en soirée le week-end, moins adapté à qui cherche le calme.",
    transportText: "Stations de métro Porta Genova sur la ligne M2.",
    nearbyText: "Le Duomo se rejoint à pied en 20-25 minutes ou en tram depuis la Darsena.",
    profileFitText: "Pour la vie nocturne, l'ambiance de canal pittoresque et l'art contemporain industriel.",
    hotelAdviceText: "Quartier animé le soir, un bon choix pour qui veut être au cœur de la vie nocturne milanaise.",
  },
  {
    slug: "castello-sempione",
    name: "Castello Sforzesco & Parco Sempione",
    mapColor: "#d6479a",
    vibeText: "Le poumon vert et historique de Milan, entre forteresse ducale, grand parc paysager et la fresque de Léonard de Vinci.",
    prosText: "Grand espace vert au centre-ville, patrimoine ducal exceptionnel, bonne offre de musées.",
    consText: "Le parc peut sembler désert et moins sûr tard le soir — privilégier les visites de jour.",
    transportText: "Stations de métro Cairoli et Cadorna, sur les lignes M1 et M2.",
    nearbyText: "Brera se rejoint à pied en 10-15 minutes vers l'est.",
    profileFitText: "Pour le patrimoine ducal, une pause verte en centre-ville et les œuvres de Léonard de Vinci.",
    hotelAdviceText: "Quartier central avec de bonnes options, à proximité immédiate du parc et du château.",
  },
  {
    slug: "porta-nuova",
    name: "Porta Nuova, Isola & Quadrilatero",
    mapColor: "#8f2d2d",
    vibeText: "Le Milan le plus contemporain et chic, entre gratte-ciel futuristes, forêt verticale et le quartier de la mode le plus prestigieux d'Italie.",
    prosText: "Architecture contemporaine spectaculaire, shopping de luxe, excellente vie nocturne.",
    consText: "L'un des quartiers les plus chers de Milan, peu d'options économiques sur place.",
    transportText: "Stations de métro Porta Garibaldi et Montenapoleone, sur plusieurs lignes.",
    nearbyText: "Brera se rejoint à pied en 10-15 minutes vers le sud-ouest.",
    profileFitText: "Pour le shopping de luxe, l'architecture contemporaine et une vie nocturne élégante.",
    hotelAdviceText: "Quartier moderne et central, excellents hôtels de design à des prix en conséquence.",
  },
  {
    slug: "pavia",
    name: "Certosa di Pavia (excursion)",
    mapColor: "#6fae7c",
    vibeText: "Une excursion rapide au sud de Milan, autour d'un monastère chartreux à la façade Renaissance parmi les plus belles d'Italie.",
    prosText: "Chef-d'œuvre architectural exceptionnel, trajet rapide depuis Milan, ville universitaire charmante en complément.",
    consText: "Nécessite environ 30-40 minutes de train puis un peu de marche ou de bus jusqu'à la Certosa elle-même.",
    transportText: "Train régional depuis Milano Centrale ou Milano Porta Garibaldi jusqu'à Pavia (environ 30 minutes), puis bus local jusqu'à la Certosa.",
    nearbyText: "Le centre historique de Pavie se visite facilement en complément, à 10 minutes de train de la Certosa.",
    profileFitText: "Pour les passionnés d'architecture Renaissance et de monastères historiques.",
    hotelAdviceText: "Généralement visité en demi-journée depuis Milan, peu d'hébergements nécessaires sur place.",
  },
  {
    slug: "lago-como",
    name: "Lago di Como (excursion)",
    mapColor: "#2a7a8c",
    vibeText: "Une excursion classique au nord de Milan, autour d'un lac alpin entouré de villas historiques et de villages pittoresques comme Bellagio.",
    prosText: "Paysages alpins et lacustres exceptionnels, villages photogéniques, accès rapide en train depuis Milan.",
    consText: "Nécessite une journée complète pour profiter de plusieurs villages, les bateaux reliant les rives prenant du temps.",
    transportText: "Train régional depuis Milano Centrale ou Milano Porta Garibaldi jusqu'à Como (environ 40 minutes), puis bateau pour les villages du lac.",
    nearbyText: "Bellagio, Varenna et Villa Carlotta se rejoignent facilement en bateau depuis Como, à des fréquences variables selon la saison.",
    profileFitText: "Pour une journée de paysages alpins et lacustres, loin de l'agitation urbaine de Milan.",
    hotelAdviceText: "Quelques hébergements de charme à Bellagio ou Varenna pour qui veut y passer une nuit plutôt qu'un aller-retour.",
  },
  {
    slug: "aeroport",
    name: "Aéroports",
    mapColor: "#888888",
    vibeText: "Les deux aéroports qui desservent Milan, repérés sur la carte pour organiser facilement son arrivée ou son départ.",
    prosText: "Utile pour visualiser la distance et l'orientation par rapport au centre-ville avant de réserver un transfert.",
    consText: "Ne sont pas des lieux à visiter — purement des repères pratiques.",
    transportText: "Malpensa Express (train) ou bus pour Malpensa ; bus express 73 pour Linate.",
    nearbyText: "Le Centro et Porta Nuova sont les points d'arrivée les plus pratiques depuis l'un ou l'autre aéroport.",
    profileFitText: "Repère pratique pour tous les profils de voyage.",
    hotelAdviceText: "Aucun hébergement recommandé à proximité directe des aéroports — mieux vaut loger en ville.",
  },
];

async function main() {
  console.log("Seeding Milan destination…");

  const italie = await prisma.country.upsert({
    where: { slug: "italie" },
    update: {},
    create: { slug: "italie", name: "Italie" },
  });

  const milan = await prisma.destination.upsert({
    where: { slug: "milan" },
    update: { status: "PUBLISHED" },
    create: {
      countryId: italie.id,
      slug: "milan",
      name: "Milan",
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
    where: { id: milan.id },
    data: {
      categories: {
        set: ENABLED_CATEGORIES.map((slug) => ({ id: categoryBySlug.get(slug)!.id })),
      },
    },
  });

  const zoneBySlug = new Map<string, { id: string }>();
  for (const z of ZONE_DEFS) {
    const zone = await prisma.zone.upsert({
      where: { destinationId_slug: { destinationId: milan.id, slug: z.slug } },
      update: {
        name: z.name, mapColor: z.mapColor, vibeText: z.vibeText, prosText: z.prosText,
        consText: z.consText, transportText: z.transportText, nearbyText: z.nearbyText,
        profileFitText: z.profileFitText, hotelAdviceText: z.hotelAdviceText,
      },
      create: { destinationId: milan.id, ...z },
    });
    zoneBySlug.set(z.slug, zone);
  }

  let manifest: PhotoManifestEntry[] = [];
  try {
    manifest = JSON.parse(
      await readFile(
        "/private/tmp/claude-501/-Users-constance/f6c42bbe-3c4a-4229-b982-d00b14542e1b/scratchpad/photos_milan/manifest.json",
        "utf-8"
      )
    );
  } catch {
    console.log("No photo manifest found yet — seeding without photos.");
  }

  // Final accepted photos live in seed-assets/milan-photos/<slug>.jpg
  // (resized, false positives already excluded) — same pattern as every
  // other destination this session. The Dockerfile bakes this folder
  // into storage/photos at build time.
  const PHOTOS_DIR = "seed-assets/milan-photos";

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
        name: def.name, destinationId: milan.id, zoneId: zone?.id, status: "PUBLISHED",
        lat: def.lat, lng: def.lng, description: def.description, whyVisit: def.whyVisit,
        littleTip: def.littleTip, indicativeDuration: def.indicativeDuration,
        indicativePrice: def.indicativePrice, isFictionalDemo: false,
      },
      create: {
        slug: def.slug, destinationId: milan.id, zoneId: zone?.id, name: def.name,
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

  console.log(`Milan seed complete: ${PLACES.length} places, ${photoCount} with real photos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
