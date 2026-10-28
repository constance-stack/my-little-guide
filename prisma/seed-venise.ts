/**
 * Venice — third Italy destination, built from the admin "Nouvelle
 * destination" request queue: "faire Venise globalement avec les
 * incontournables les musées mais aussi les tips pour les transports
 * notamment payer 2 euro pour faire une traverse en grande barque
 * plutôt que payer cher un tour de barque privé" (75 places targeted).
 * Covers the six sestieri plus the lagoon islands (Murano, Burano,
 * Torcello) as day-trip excursions. Explicitly includes a dedicated
 * traghetto place and practical vaporetto/traghetto tips throughout,
 * per Constance's specific request to favor the ~2€ traghetto gondola
 * crossing over an expensive private gondola tour. Same pattern as
 * every other destination: real places, real coordinates, Wikimedia
 * Commons photos only when a genuine match exists, no zoos, restaurants
 * priced across every range.
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
  // ---------- San Marco ----------
  {
    slug: "piazza-san-marco",
    name: "Piazza San Marco",
    zone: "san-marco",
    categories: ["incontournables", "quartiers-balades"],
    lat: 45.4342, lng: 12.3388,
    description: "La place centrale et symbolique de Venise, que Napoléon surnomma \"le plus beau salon d'Europe\", entourée de la basilique, du palais des Doges et de longues arcades.",
    whyVisit: "Le cœur monumental de Venise, et le point de départ naturel de toute visite.",
    littleTip: "Visitez très tôt le matin (avant 9h) pour voir la place quasiment vide, avant l'afflux massif des groupes touristiques.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "basilica-san-marco",
    name: "Basilica di San Marco",
    zone: "san-marco",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4345, lng: 12.3397,
    description: "Une basilique byzantine éblouissante couverte de plus de 8 000 m² de mosaïques dorées, construite pour abriter les reliques de saint Marc rapportées d'Alexandrie.",
    whyVisit: "L'un des plus beaux exemples d'art byzantin en Occident, à l'intérieur absolument époustouflant.",
    littleTip: "Réservez un créneau coupe-file en ligne (quelques euros) pour éviter une file qui peut dépasser une heure en haute saison.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "palazzo-ducale-venezia",
    name: "Palazzo Ducale",
    zone: "san-marco",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4337, lng: 12.3403,
    description: "Le palais gothique des doges de Venise, siège du pouvoir politique et judiciaire de la République pendant près d'un millénaire, avec la salle du Grand Conseil ornée du plus grand tableau à l'huile au monde.",
    whyVisit: "Le cœur politique de l'ancienne République de Venise, avec des salles d'apparat somptueuses.",
    littleTip: "L'itinéraire secret (Itinerari Segreti), à réserver séparément, permet d'accéder aux prisons et bureaux cachés du palais.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "campanile-san-marco",
    name: "Campanile di San Marco",
    zone: "san-marco",
    categories: ["incontournables", "points-de-vue"],
    lat: 45.4340, lng: 12.3390,
    description: "Le clocher de 98,6 mètres de la basilique Saint-Marc, reconstruit à l'identique après son effondrement en 1902, offrant la plus belle vue panoramique sur la lagune.",
    whyVisit: "Le meilleur point de vue aérien sur Venise et sa lagune, accessible par ascenseur sans monter d'escaliers.",
    littleTip: "Montez tôt le matin ou en fin de journée pour une lumière douce et une file nettement plus courte.",
    indicativeDuration: "30-45 min",
    indicativePrice: "$$",
  },
  {
    slug: "ponte-dei-sospiri",
    name: "Ponte dei Sospiri",
    zone: "san-marco",
    categories: ["incontournables", "experiences-insolites"],
    lat: 45.4336, lng: 12.3407,
    description: "Un pont baroque fermé reliant le Palazzo Ducale aux anciennes prisons, par lequel passaient les condamnés pour leur dernier regard sur Venise avant l'enfermement.",
    whyVisit: "L'un des ponts les plus romantiques et photographiés de Venise, malgré son origine carcérale sombre.",
    littleTip: "La meilleure vue sur le pont s'obtient depuis le Ponte della Paglia, juste à côté, au bord de l'eau.",
    indicativeDuration: "10-15 min",
  },
  {
    slug: "torre-orologio-venezia",
    name: "Torre dell'Orologio",
    zone: "san-marco",
    categories: ["temples-patrimoine", "incontournables"],
    lat: 45.4343, lng: 12.3384,
    description: "Une tour de l'horloge Renaissance du XVe siècle, surmontée de deux statues de bronze (les \"Maures\") qui frappent les heures, dominant l'entrée des Mercerie.",
    whyVisit: "Un chef-d'œuvre d'horlogerie Renaissance, visible gratuitement depuis la Piazza San Marco.",
    littleTip: "La visite guidée intérieure, en petit groupe, permet de voir le mécanisme d'origine et de monter jusqu'aux Maures qui sonnent les heures.",
    indicativeDuration: "15-20 min (extérieur)",
  },
  {
    slug: "museo-correr",
    name: "Museo Correr",
    zone: "san-marco",
    categories: ["temples-patrimoine"],
    lat: 45.4336, lng: 12.3376,
    description: "Un musée retraçant l'histoire de Venise depuis ses origines jusqu'à la chute de la République, installé dans les anciennes ailes napoléoniennes de la place.",
    whyVisit: "Le billet combiné avec le Palazzo Ducale en fait une visite complémentaire naturelle pour comprendre l'histoire vénitienne.",
    littleTip: "Les salles néoclassiques napoléoniennes, à l'intérieur, contrastent fortement avec le style byzantin du reste de la place.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "caffe-florian",
    name: "Caffè Florian",
    zone: "san-marco",
    categories: ["cafes-brunchs", "temples-patrimoine"],
    lat: 45.4338, lng: 12.3383,
    description: "Le plus ancien café d'Italie encore en activité, ouvert en 1720 sur la Piazza San Marco, fréquenté jadis par Casanova, Goethe et Proust.",
    whyVisit: "Boire un café dans un décor doré et historique inchangé depuis trois siècles, sur la plus belle place de Venise.",
    littleTip: "Les prix incluent un supplément pour l'orchestre en terrasse — demandez à vous asseoir à l'intérieur pour l'éviter si besoin.",
    indicativeDuration: "30-45 min",
    indicativePrice: "$$$",
  },
  {
    slug: "teatro-la-fenice",
    name: "Teatro La Fenice",
    zone: "san-marco",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4336, lng: 12.3324,
    description: "L'opéra historique de Venise, reconstruit trois fois après des incendies (dont un en 1996), littéralement \"renaissant de ses cendres\" comme son nom l'indique.",
    whyVisit: "Une salle d'opéra somptueuse, pour un spectacle ou simplement une visite audioguidée de la salle.",
    littleTip: "La visite audioguidée en journée permet d'admirer la salle dorée sans avoir à assister à un spectacle complet.",
    indicativeDuration: "45 min (visite) à 3h (spectacle)",
  },
  {
    slug: "ponte-accademia",
    name: "Ponte dell'Accademia",
    zone: "san-marco",
    categories: ["incontournables", "points-de-vue"],
    lat: 45.4316, lng: 12.3283,
    description: "Un pont en bois emblématique sur le Grand Canal, construit à l'origine comme solution temporaire en 1933 et jamais remplacé depuis, offrant l'une des plus belles vues du canal.",
    whyVisit: "L'un des meilleurs points de vue gratuits sur le Grand Canal, particulièrement au coucher du soleil.",
    littleTip: "La vue vers la Basilique della Salute depuis le centre du pont est l'une des perspectives les plus photographiées de Venise.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "harrys-bar-venezia",
    name: "Harry's Bar",
    zone: "san-marco",
    categories: ["restaurants", "temples-patrimoine"],
    lat: 45.4316, lng: 12.3370,
    description: "Un bar-restaurant légendaire fondé en 1931, qui inventa le cocktail Bellini et accueillit Hemingway, Chaplin et Churchill parmi ses habitués.",
    whyVisit: "L'endroit où fut inventé le Bellini, dans un cadre élégant resté fidèle à son identité d'origine.",
    littleTip: "Le Bellini original, préparé avec de la pulpe de pêche blanche fraîche, diffère nettement des versions servies ailleurs dans le monde.",
    indicativeDuration: "45 min-1h",
    indicativePrice: "$$$$",
  },
  {
    slug: "chiesa-san-moise",
    name: "Chiesa di San Moisè",
    zone: "san-marco",
    categories: ["temples-patrimoine"],
    lat: 45.4330, lng: 12.3368,
    description: "Une église baroque à la façade surchargée de sculptures, considérée comme l'un des exemples les plus extravagants du baroque vénitien.",
    whyVisit: "Un contraste saisissant avec la sobriété byzantine de la basilique voisine, à voir au moins pour sa façade.",
    littleTip: "La façade est si chargée en ornements qu'elle fut critiquée dès son époque pour son excès baroque.",
    indicativeDuration: "15 min",
  },

  // ---------- Rialto & San Polo ----------
  {
    slug: "ponte-rialto",
    name: "Ponte di Rialto",
    zone: "rialto-san-polo",
    categories: ["incontournables", "quartiers-balades"],
    lat: 45.4380, lng: 12.3358,
    description: "Le plus ancien des quatre ponts enjambant le Grand Canal, achevé en 1591, bordé de boutiques et offrant une vue spectaculaire sur le canal dans les deux sens.",
    whyVisit: "Le pont le plus emblématique de Venise, avec l'une des meilleures vues sur le Grand Canal.",
    littleTip: "Les marches latérales du pont offrent une vue dégagée sans les boutiques qui encombrent le centre du passage.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "mercato-rialto",
    name: "Mercato di Rialto",
    zone: "rialto-san-polo",
    categories: ["marches", "street-food", "incontournables"],
    lat: 45.4385, lng: 12.3345,
    description: "Le marché alimentaire historique de Venise, avec sa halle aux poissons (Pescaria) et ses étals de fruits et légumes, actif depuis près de mille ans au même emplacement.",
    whyVisit: "L'un des plus anciens marchés d'Europe encore en activité, pour voir le Venise authentique et quotidien.",
    littleTip: "Venez tôt le matin (avant 10h) pour voir le marché au plus animé, avant qu'il ne commence à fermer en début d'après-midi.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "basilica-frari",
    name: "Basilica di Santa Maria Gloriosa dei Frari",
    zone: "rialto-san-polo",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4374, lng: 12.3262,
    description: "L'une des plus grandes églises gothiques de Venise, qui abrite deux chefs-d'œuvre majeurs du Titien, dont son tombeau monumental qu'il dessina lui-même.",
    whyVisit: "Une des plus belles collections d'art religieux de Venise, avec l'Assomption du Titien comme point culminant.",
    littleTip: "Les stalles de bois sculpté du chœur, du XVe siècle, comptent parmi les plus belles boiseries gothiques conservées en Italie.",
    indicativeDuration: "1h-1h15",
  },
  {
    slug: "scuola-grande-san-rocco",
    name: "Scuola Grande di San Rocco",
    zone: "rialto-san-polo",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4368, lng: 12.3257,
    description: "Une confrérie du XVIe siècle entièrement décorée par le Tintoret, qui y peignit plus de 60 toiles monumentales sur plus de vingt ans de sa vie.",
    whyVisit: "Considéré comme la \"Chapelle Sixtine vénitienne\", un ensemble unique du Tintoret dans son intégralité.",
    littleTip: "Des miroirs sont disponibles en prêt à l'accueil pour admirer les plafonds peints sans se tordre le cou.",
    indicativeDuration: "1h-1h15",
  },
  {
    slug: "campo-san-polo",
    name: "Campo San Polo",
    zone: "rialto-san-polo",
    categories: ["quartiers-balades", "activites-famille"],
    lat: 45.4374, lng: 12.3307,
    description: "La deuxième plus grande place de Venise après San Marco, aujourd'hui lieu de vie de quartier où les enfants vénitiens jouent encore au ballon.",
    whyVisit: "Une place de quartier authentique, loin de la foule touristique, pour voir le Venise du quotidien.",
    littleTip: "En hiver, la place accueille parfois une petite patinoire temporaire, une tradition locale appréciée des familles.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "fondaco-tedeschi",
    name: "Fondaco dei Tedeschi (terrazza)",
    zone: "rialto-san-polo",
    categories: ["points-de-vue", "shopping"],
    lat: 45.4387, lng: 12.3357,
    description: "Un ancien comptoir commercial allemand du Moyen Âge, transformé en grand magasin de luxe, dont la terrasse panoramique sur le toit offre une vue exceptionnelle sur le Grand Canal.",
    whyVisit: "L'une des meilleures vues gratuites sur le Grand Canal et les toits de Venise, juste à côté du pont du Rialto.",
    littleTip: "La terrasse nécessite une réservation gratuite en ligne à l'avance, avec un créneau horaire limité à 15 minutes.",
    indicativeDuration: "30 min",
  },
  {
    slug: "casa-carlo-goldoni",
    name: "Casa di Carlo Goldoni",
    zone: "rialto-san-polo",
    categories: ["temples-patrimoine"],
    lat: 45.4370, lng: 12.3332,
    description: "La maison natale du plus célèbre dramaturge vénitien, aujourd'hui petit musée dédié au théâtre vénitien du XVIIIe siècle.",
    whyVisit: "Un musée intimiste pour les passionnés de théâtre et de littérature italienne, dans une demeure gothique authentique.",
    littleTip: "Le petit puits (vera da pozzo) dans la cour intérieure est un bel exemple de l'architecture domestique vénitienne d'origine.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "cantina-do-mori",
    name: "Cantina Do Mori",
    zone: "rialto-san-polo",
    categories: ["bars-rooftops", "street-food"],
    lat: 45.4387, lng: 12.3348,
    description: "Le plus ancien bacaro (bar à vin) de Venise, ouvert en 1462 près du marché du Rialto, référence pour les cicchetti (tapas vénitiennes) et l'ombra (petit verre de vin).",
    whyVisit: "L'expérience la plus authentique du \"giro di ombre\" (tournée de bars à cicchetti) typiquement vénitien.",
    littleTip: "On ne s'assoit pas chez Do Mori — on commande debout au comptoir, dans la pure tradition du bacaro vénitien.",
    indicativeDuration: "30-45 min",
    indicativePrice: "$$",
  },
  {
    slug: "san-giacomo-rialto",
    name: "Chiesa di San Giacomo di Rialto",
    zone: "rialto-san-polo",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 45.4383, lng: 12.3352,
    description: "Selon la légende, la plus ancienne église de Venise, fondée dès 421, juste à côté du marché du Rialto, avec sa célèbre horloge toujours légèrement décalée.",
    whyVisit: "Un petit édifice chargé de légende fondatrice de Venise, juste à l'entrée du marché.",
    littleTip: "L'horloge de la façade est traditionnellement toujours en retard — une plaisanterie locale qui perdure depuis des générations.",
    indicativeDuration: "15 min",
  },
  {
    slug: "chiesa-san-giacomo-dallorio",
    name: "Chiesa di San Giacomo dall'Orio",
    zone: "rialto-san-polo",
    categories: ["temples-patrimoine", "quartiers-balades"],
    lat: 45.4410, lng: 12.3270,
    description: "Une église médiévale sur l'une des places les plus authentiques et paisibles de Venise, mêlant styles byzantin, gothique et Renaissance accumulés au fil des siècles.",
    whyVisit: "Un campo vénitien encore très local, loin des circuits touristiques du Rialto voisin.",
    littleTip: "La place autour de l'église est l'une des rares de Venise à rester calme même en pleine haute saison.",
    indicativeDuration: "20-30 min",
  },

  // ---------- Dorsoduro ----------
  {
    slug: "gallerie-accademia",
    name: "Gallerie dell'Accademia",
    zone: "dorsoduro",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4316, lng: 12.3278,
    description: "La plus importante collection de peinture vénitienne au monde, avec des œuvres de Titien, Véronèse, Bellini et Tintoret couvrant cinq siècles d'art.",
    whyVisit: "La référence absolue pour comprendre l'évolution de la peinture vénitienne depuis ses origines.",
    littleTip: "Le Repas chez Lévi de Véronèse, à l'origine censuré par l'Inquisition pour son sujet religieux jugé trop profane, est l'une des pièces maîtresses.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "peggy-guggenheim-collection",
    name: "Peggy Guggenheim Collection",
    zone: "dorsoduro",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4308, lng: 12.3317,
    description: "La collection d'art moderne de la mécène américaine Peggy Guggenheim, installée dans son ancien palais inachevé au bord du Grand Canal, avec des œuvres de Picasso, Pollock et Dalí.",
    whyVisit: "L'une des meilleures collections d'art du XXe siècle en Europe, dans un cadre intimiste au bord de l'eau.",
    littleTip: "Le jardin de sculptures, où repose Peggy Guggenheim elle-même aux côtés de ses chiens bien-aimés, est une pause paisible dans la visite.",
    indicativeDuration: "1h30",
  },
  {
    slug: "basilica-santa-maria-salute",
    name: "Basilica di Santa Maria della Salute",
    zone: "dorsoduro",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4310, lng: 12.3360,
    description: "Une basilique baroque construite en 1631 en remerciement de la fin d'une épidémie de peste, dont le dôme massif domine l'entrée du Grand Canal depuis trois siècles.",
    whyVisit: "L'un des plus beaux dômes baroques de Venise, et un des points de vue les plus photogéniques sur le bassin de Saint-Marc.",
    littleTip: "Chaque 21 novembre, un pont flottant temporaire relie l'église au reste de la ville pour la fête de la Madonna della Salute.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "zattere-venezia",
    name: "Le Zattere",
    zone: "dorsoduro",
    categories: ["quartiers-balades", "points-de-vue"],
    lat: 45.4280, lng: 12.3290,
    description: "Une longue promenade ensoleillée le long du canal de la Giudecca, bordée de cafés avec vue sur l'île de la Giudecca, prisée des Vénitiens pour les glaces et le soleil d'après-midi.",
    whyVisit: "L'une des promenades les plus agréables et lumineuses de Venise, loin de l'agitation du centre.",
    littleTip: "C'est le meilleur endroit de Venise pour profiter du soleil l'après-midi, le quai étant orienté plein sud.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "squero-san-trovaso",
    name: "Squero di San Trovaso",
    zone: "dorsoduro",
    categories: ["experiences-insolites", "incontournables"],
    lat: 45.4305, lng: 12.3260,
    description: "L'un des derniers chantiers navals traditionnels de Venise encore en activité, où les gondoles sont construites et réparées à la main selon des méthodes séculaires.",
    whyVisit: "Voir de vos propres yeux comment sont fabriquées les gondoles, un artisanat vénitien millénaire en voie de disparition.",
    littleTip: "Le chantier se visite uniquement depuis l'extérieur, depuis l'autre rive du canal — mais l'activité y est souvent visible en journée.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "campo-santa-margherita",
    name: "Campo Santa Margherita",
    zone: "dorsoduro",
    categories: ["quartiers-balades", "bars-rooftops"],
    lat: 45.4330, lng: 12.3245,
    description: "Une grande place animée de Dorsoduro, fréquentée par les étudiants de l'université voisine, avec marché quotidien et nombreux bars le soir.",
    whyVisit: "Le meilleur endroit pour sentir le pouls de la vie étudiante vénitienne, loin des foules touristiques.",
    littleTip: "La place accueille un petit marché alimentaire quotidien en matinée, plus local et moins cher que le Rialto.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "ca-rezzonico",
    name: "Ca' Rezzonico",
    zone: "dorsoduro",
    categories: ["temples-patrimoine"],
    lat: 45.4322, lng: 12.3270,
    description: "Un palais baroque sur le Grand Canal, aujourd'hui musée du XVIIIe siècle vénitien, avec des plafonds peints par Tiepolo et un mobilier d'époque somptueux.",
    whyVisit: "La meilleure immersion dans le faste de la vie vénitienne du XVIIIe siècle, à son apogée culturelle avant le déclin de la République.",
    littleTip: "Le plafond de la salle de bal, peint par Giambattista Tiepolo, est l'un des plus spectaculaires de tout Venise.",
    indicativeDuration: "1h-1h15",
  },
  {
    slug: "scuola-grande-carmini",
    name: "Scuola Grande dei Carmini",
    zone: "dorsoduro",
    categories: ["temples-patrimoine"],
    lat: 45.4328, lng: 12.3225,
    description: "Une confrérie religieuse du XVIIe siècle décorée de neuf plafonds peints par Giambattista Tiepolo, nettement moins fréquentée que la Scuola di San Rocco.",
    whyVisit: "Une autre œuvre majeure de Tiepolo, dans un cadre intimiste loin de la foule.",
    littleTip: "Le plafond central, représentant la Vierge remettant le scapulaire à saint Simon Stock, est considéré comme un chef-d'œuvre absolu de Tiepolo.",
    indicativeDuration: "45 min",
  },
  {
    slug: "punta-della-dogana",
    name: "Punta della Dogana",
    zone: "dorsoduro",
    categories: ["temples-patrimoine", "points-de-vue"],
    lat: 45.4303, lng: 12.3368,
    description: "L'ancienne douane maritime de Venise, à la pointe extrême de Dorsoduro, transformée par l'architecte Tadao Ando en espace d'art contemporain pour la collection Pinault.",
    whyVisit: "Un contraste saisissant entre art contemporain et architecture historique, avec une vue imprenable sur le bassin de Saint-Marc.",
    littleTip: "La pointe extérieure du bâtiment, surmontée d'une statue dorée de la Fortune, offre l'une des meilleures vues gratuites sur l'entrée du Grand Canal.",
    indicativeDuration: "1h-1h15",
  },
  {
    slug: "gelateria-nico",
    name: "Gelateria Nico",
    zone: "dorsoduro",
    categories: ["cafes-brunchs", "street-food"],
    lat: 45.4292, lng: 12.3278,
    description: "Une gelateria historique des Zattere, célèbre dans toute Venise pour son \"gianduiotto\", un bloc de glace au chocolat-noisette noyé dans la chantilly.",
    whyVisit: "Une pause glace incontournable après une balade sur les Zattere, avec vue sur le canal de la Giudecca.",
    littleTip: "Le gianduiotto se mange traditionnellement en terrasse face au canal — demandez-le \"da passeggio\" pour l'emporter en promenade.",
    indicativeDuration: "20-30 min",
    indicativePrice: "$",
  },
  {
    slug: "chiesa-san-sebastiano",
    name: "Chiesa di San Sebastiano",
    zone: "dorsoduro",
    categories: ["temples-patrimoine"],
    lat: 45.4325, lng: 12.3220,
    description: "Une église Renaissance entièrement décorée par Véronèse, qui y est également enterré, considérée comme son véritable chef-d'œuvre d'ensemble.",
    whyVisit: "L'église la plus représentative de l'art de Véronèse, peinte dans son intégralité par l'artiste lui-même.",
    littleTip: "Véronèse, mort en 1588, est enterré dans cette même église qu'il passa des années à décorer — un hommage posthume mérité.",
    indicativeDuration: "30-45 min",
  },

  // ---------- Cannaregio ----------
  {
    slug: "ghetto-ebraico-venezia",
    name: "Ghetto Ebraico di Venezia",
    zone: "cannaregio",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4453, lng: 12.3280,
    description: "Le tout premier \"ghetto\" de l'histoire, créé en 1516 par la République de Venise pour y confiner la communauté juive, qui a donné son nom à tous les ghettos du monde.",
    whyVisit: "Un lieu d'importance historique mondiale, avec des synagogues anciennes encore actives.",
    littleTip: "Le mot \"ghetto\" vient du vénitien \"geto\", qui désignait une fonderie située à cet emplacement avant la création du quartier juif.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "museo-ebraico-venezia",
    name: "Museo Ebraico di Venezia",
    zone: "cannaregio",
    categories: ["temples-patrimoine"],
    lat: 45.4455, lng: 12.3283,
    description: "Un musée retraçant l'histoire de la communauté juive vénitienne depuis le XVIe siècle, avec accès à trois des cinq synagogues historiques du ghetto.",
    whyVisit: "Le meilleur point de départ pour comprendre l'histoire complexe du ghetto avant de l'explorer à pied.",
    littleTip: "Les visites guidées des synagogues, organisées par le musée, sont le seul moyen d'accéder à leur intérieur.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "madonna-dellorto",
    name: "Chiesa della Madonna dell'Orto",
    zone: "cannaregio",
    categories: ["temples-patrimoine"],
    lat: 45.4458, lng: 12.3330,
    description: "Une église gothique qui fut la paroisse du Tintoret, qui y est enterré et dont plusieurs toiles majeures ornent encore l'intérieur.",
    whyVisit: "L'église personnelle du Tintoret, nettement moins fréquentée que ses œuvres plus célèbres de la Scuola di San Rocco.",
    littleTip: "Le Tintoret vivait juste en face de l'église — sa maison porte encore une plaque commémorative visible depuis la place.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "strada-nova",
    name: "Strada Nova",
    zone: "cannaregio",
    categories: ["quartiers-balades", "shopping"],
    lat: 45.4420, lng: 12.3330,
    description: "La plus large rue commerçante de Venise, percée au XIXe siècle à travers le tissu urbain médiéval, qui relie la gare au Rialto.",
    whyVisit: "Un axe pratique et animé pour relier à pied la gare ferroviaire au cœur de Venise.",
    littleTip: "C'est aussi l'un des axes les plus fréquentés de Venise — attendez-vous à de la foule aux heures de pointe.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "fondamenta-misericordia",
    name: "Fondamenta della Misericordia",
    zone: "cannaregio",
    categories: ["bars-rooftops", "quartiers-balades"],
    lat: 45.4440, lng: 12.3290,
    description: "Un quai bordé de bacari et restaurants, devenu l'une des adresses favorites des Vénitiens pour l'apéritif en soirée, loin de l'agitation touristique.",
    whyVisit: "L'une des meilleures adresses pour un \"giro di ombre\" authentique, fréquentée surtout par des habitants.",
    littleTip: "Le quai est particulièrement agréable en soirée d'été, quand les bars installent leurs tables directement au bord du canal.",
    indicativeDuration: "1h-1h30",
    indicativePrice: "$$",
  },
  {
    slug: "ca-doro",
    name: "Ca' d'Oro",
    zone: "cannaregio",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4408, lng: 12.3357,
    description: "Le plus bel exemple de gothique fleuri vénitien sur le Grand Canal, dont la façade était autrefois entièrement recouverte de feuille d'or, d'où son nom de \"maison d'or\".",
    whyVisit: "L'une des plus belles façades du Grand Canal, aujourd'hui musée de peinture avec une collection de qualité.",
    littleTip: "La loggia du premier étage offre l'une des plus belles vues directes sur le Grand Canal depuis l'intérieur d'un palais.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "ponte-guglie",
    name: "Ponte delle Guglie",
    zone: "cannaregio",
    categories: ["quartiers-balades"],
    lat: 45.4428, lng: 12.3270,
    description: "Un pont du XVIe siècle orné de petites flèches décoratives (guglie), qui marque l'entrée du quartier du Ghetto depuis le Canal di Cannaregio.",
    whyVisit: "Un point de passage incontournable entre la gare et le Ghetto, avec une architecture distinctive.",
    littleTip: "Le canal de Cannaregio, juste en dessous, est l'un des plus larges et photogéniques de la ville en dehors du Grand Canal.",
    indicativeDuration: "10 min",
  },
  {
    slug: "traghetto-santa-sofia",
    name: "Traghetto di Santa Sofia",
    zone: "cannaregio",
    categories: ["experiences-insolites"],
    lat: 45.4400, lng: 12.3350,
    description: "Une traversée du Grand Canal en grande gondole collective, debout, pilotée par deux gondoliers — le moyen le plus simple et le plus authentique de traverser le canal sans pont à proximité.",
    whyVisit: "Vivre l'expérience de la gondole pour une fraction du prix d'un tour privé, exactement comme le font les Vénitiens au quotidien.",
    littleTip: "Comptez environ 2 euros pour la traversée (payable en espèces au gondolier), contre 80 euros ou plus pour un tour de gondole privé de 30 minutes — un traghetto ne fait que traverser le canal, mais l'expérience de la gondole, debout, est la même.",
    indicativeDuration: "2-3 min",
    indicativePrice: "$",
  },
  {
    slug: "campo-dei-mori",
    name: "Campo dei Mori",
    zone: "cannaregio",
    categories: ["quartiers-balades", "experiences-insolites"],
    lat: 45.4453, lng: 12.3305,
    description: "Une petite place ornée de quatre statues orientales du XIIIe siècle encastrées dans les murs, représentant selon la légende des marchands grecs pétrifiés.",
    whyVisit: "Un coin pittoresque et méconnu de Cannaregio, chargé de légendes vénitiennes.",
    littleTip: "L'une des statues porte un nez en métal, régulièrement remplacé après avoir été cassé par des farceurs au fil des siècles.",
    indicativeDuration: "10-15 min",
  },

  // ---------- Castello ----------
  {
    slug: "arsenale-venezia",
    name: "Arsenale di Venezia",
    zone: "castello",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4347, lng: 12.3530,
    description: "L'ancien chantier naval et arsenal militaire de la République de Venise, qui employait jusqu'à 16 000 ouvriers et pouvait construire une galère entière en une seule journée.",
    whyVisit: "Le symbole de la puissance industrielle et navale qui fit de Venise une superpuissance méditerranéenne pendant des siècles.",
    littleTip: "La porte monumentale de l'Arsenale, gardée par des lions antiques rapportés de Grèce, est l'une des plus belles entrées Renaissance de Venise.",
    indicativeDuration: "30-45 min (extérieur, selon expositions en cours)",
  },
  {
    slug: "san-zanipolo",
    name: "Basilica dei Santi Giovanni e Paolo (San Zanipolo)",
    zone: "castello",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 45.4393, lng: 12.3420,
    description: "Une immense basilique gothique qui abrite les tombeaux de 25 doges de Venise, véritable panthéon de la République, sur une place dominée par une statue équestre du Colleone.",
    whyVisit: "Le plus grand panthéon funéraire de l'histoire vénitienne, comparable en importance à Santa Maria dei Frari.",
    littleTip: "La statue équestre de Bartolomeo Colleone devant l'église, par Verrocchio, est considérée comme l'une des plus grandes statues équestres de la Renaissance.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "riva-schiavoni",
    name: "Riva degli Schiavoni",
    zone: "castello",
    categories: ["quartiers-balades", "points-de-vue"],
    lat: 45.4335, lng: 12.3440,
    description: "La large promenade qui longe le bassin de Saint-Marc depuis le Palazzo Ducale, historiquement le quai d'accostage des marchands dalmates (\"schiavoni\").",
    whyVisit: "L'une des plus belles promenades au bord de l'eau de Venise, avec vue sur l'île de San Giorgio Maggiore.",
    littleTip: "Le soir, la promenade est magnifiquement éclairée et nettement moins fréquentée qu'en journée.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "giardini-biennale",
    name: "Giardini della Biennale",
    zone: "castello",
    categories: ["quartiers-balades", "activites-famille"],
    lat: 45.4290, lng: 12.3560,
    description: "Des jardins publics napoléoniens qui accueillent tous les deux ans la plus prestigieuse exposition d'art contemporain au monde, avec des pavillons nationaux permanents.",
    whyVisit: "Un vrai espace vert rare à Venise, et un passage obligé les années de Biennale d'art ou d'architecture.",
    littleTip: "Même hors période de Biennale, les jardins restent un agréable espace de promenade, nettement moins fréquenté que le centre.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "via-garibaldi-venezia",
    name: "Via Garibaldi",
    zone: "castello",
    categories: ["quartiers-balades", "street-food"],
    lat: 45.4330, lng: 12.3540,
    description: "La plus large rue de Venise, en réalité un ancien canal comblé au XIXe siècle, bordée de commerces de quartier et de bacari populaires.",
    whyVisit: "Un axe vivant et authentique, loin des circuits touristiques, parfait pour observer le Venise du quotidien.",
    littleTip: "Les bacari de la rue servent des cicchetti nettement moins chers que ceux situés près de San Marco ou du Rialto.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "scuola-san-giorgio-schiavoni",
    name: "Scuola di San Giorgio degli Schiavoni",
    zone: "castello",
    categories: ["temples-patrimoine"],
    lat: 45.4360, lng: 12.3430,
    description: "Une petite confrérie dalmate entièrement décorée par Vittore Carpaccio, avec un cycle de peintures narratives considéré comme l'un de ses chefs-d'œuvre les plus complets.",
    whyVisit: "Une pépite méconnue de l'art vénitien, dans un espace intimiste rarement bondé.",
    littleTip: "Le cycle narratif de saint Georges terrassant le dragon est l'une des scènes les plus vivantes et détaillées de tout Carpaccio.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "san-francesco-vigna",
    name: "Chiesa di San Francesco della Vigna",
    zone: "castello",
    categories: ["temples-patrimoine"],
    lat: 45.4388, lng: 12.3480,
    description: "Une église Renaissance dessinée en partie par Palladio, construite sur un ancien vignoble franciscain, avec un cloître paisible rarement visité.",
    whyVisit: "Un exemple de l'architecture de Palladio à Venise même, avant ses chefs-d'œuvre plus célèbres de la lagune.",
    littleTip: "Le cloître franciscain, accessible librement, reste l'un des coins les plus silencieux de tout Castello.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "libreria-acqua-alta",
    name: "Libreria Acqua Alta",
    zone: "castello",
    categories: ["experiences-insolites", "shopping"],
    lat: 45.4355, lng: 12.3420,
    description: "Une librairie excentrique qui stocke ses livres dans des gondoles, baignoires et canots pour les protéger des inondations récurrentes de Venise (acqua alta).",
    whyVisit: "L'une des librairies les plus photographiées au monde, aussi amusante à visiter qu'insolite dans son concept.",
    littleTip: "Un escalier fait de vieux livres gonflés par l'humidité, à l'arrière de la boutique, mène à une petite terrasse avec vue sur un canal.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "corte-sconta",
    name: "Trattoria Corte Sconta",
    zone: "castello",
    categories: ["restaurants"],
    lat: 45.4345, lng: 12.3490,
    description: "Une trattoria familiale cachée dans une cour de Castello, référence pour les fruits de mer frais et la cuisine vénitienne traditionnelle.",
    whyVisit: "Une des meilleures tables de fruits de mer de Venise, dans un cadre convivial loin du tourisme de masse.",
    littleTip: "Réservez impérativement à l'avance — la petite salle et la cour extérieure affichent souvent complet plusieurs jours en avance.",
    indicativeDuration: "1h30-2h",
    indicativePrice: "$$$",
  },
  {
    slug: "san-pietro-castello",
    name: "Chiesa di San Pietro di Castello",
    zone: "castello",
    categories: ["temples-patrimoine", "quartiers-balades"],
    lat: 45.4355, lng: 12.3620,
    description: "L'ancienne cathédrale de Venise avant que Saint-Marc ne devienne officiellement la cathédrale en 1807, sur une île paisible à l'extrémité est de Castello.",
    whyVisit: "Un site historique majeur pourtant méconnu, dans l'un des quartiers les plus calmes et les moins touristiques de Venise.",
    littleTip: "Le campanile penché de l'église, visible de loin, rappelle celui de Pise à plus petite échelle.",
    indicativeDuration: "30-45 min",
  },

  // ---------- Murano (excursion) ----------
  {
    slug: "isola-murano",
    name: "Isola di Murano",
    zone: "murano",
    categories: ["incontournables", "quartiers-balades", "excursions"],
    lat: 45.4580, lng: 12.3540,
    description: "L'île lagunaire célèbre dans le monde entier pour sa production de verre soufflé depuis que les fours furent déplacés de Venise par crainte d'incendie en 1291.",
    whyVisit: "Le berceau du verre vénitien, avec ses propres canaux et son propre campanile, en miniature de Venise.",
    littleTip: "L'île se visite facilement en une demi-journée depuis Venise, en vaporetto depuis Fondamente Nove.",
    indicativeDuration: "2h-3h",
  },
  {
    slug: "museo-vetro-murano",
    name: "Museo del Vetro",
    zone: "murano",
    categories: ["temples-patrimoine", "excursions"],
    lat: 45.4590, lng: 12.3555,
    description: "Un musée retraçant plus de sept siècles d'histoire du verre vénitien, avec des pièces exceptionnelles allant de l'époque romaine aux créations contemporaines.",
    whyVisit: "Comprendre l'histoire et les techniques du verre de Murano avant d'en acheter en boutique.",
    littleTip: "Le billet combiné avec d'autres musées civiques de Venise offre souvent un bon rapport qualité-prix.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "fornace-murano",
    name: "Fornace (démonstration de soufflage du verre)",
    zone: "murano",
    categories: ["experiences-insolites", "excursions"],
    lat: 45.4585, lng: 12.3530,
    description: "Plusieurs ateliers de Murano proposent des démonstrations en direct de soufflage du verre, où un maître verrier façonne une pièce en quelques minutes devant les visiteurs.",
    whyVisit: "Voir en direct un savoir-faire artisanal vieux de sept siècles, impressionnant de précision et de rapidité.",
    littleTip: "Les démonstrations gratuites sont souvent suivies d'une invitation à acheter en boutique — aucune obligation d'achat n'est réellement imposée.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "basilica-santi-maria-donato",
    name: "Basilica dei Santi Maria e Donato",
    zone: "murano",
    categories: ["temples-patrimoine", "excursions"],
    lat: 45.4595, lng: 12.3545,
    description: "Une basilique byzantine du XIIe siècle à Murano, avec un sol en mosaïque de marbre polychrome exceptionnellement bien conservé et des ossements de dragon légendaires exposés derrière l'autel.",
    whyVisit: "Un joyau byzantin méconnu, aussi beau que certaines églises de Venise même mais sans la foule.",
    littleTip: "Les \"os de dragon\" exposés sont en réalité des os de baleine ou de crocodile rapportés par des marchands médiévaux.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "faro-murano",
    name: "Faro di Murano",
    zone: "murano",
    categories: ["points-de-vue", "excursions"],
    lat: 45.4610, lng: 12.3480,
    description: "Un phare du XIXe siècle à la pointe nord de Murano, qui guidait les bateaux vers la lagune avant l'ère moderne.",
    whyVisit: "Un point de vue tranquille sur la lagune nord, loin de la foule des boutiques de verre.",
    littleTip: "La promenade jusqu'au phare offre une vue dégagée sur la lagune vers les îles plus septentrionales.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "ponte-vivarini-murano",
    name: "Ponte Vivarini",
    zone: "murano",
    categories: ["quartiers-balades", "excursions"],
    lat: 45.4588, lng: 12.3535,
    description: "Le principal pont de Murano, qui enjambe le Canal Grande de l'île, bordé de boutiques de verre et de petits restaurants.",
    whyVisit: "Le point central de Murano, idéal pour s'orienter et observer l'animation de l'île.",
    littleTip: "La vue depuis le pont sur le Canal Grande de Murano rappelle en miniature celle du Grand Canal de Venise.",
    indicativeDuration: "15 min",
  },
  {
    slug: "chiesa-san-pietro-martire-murano",
    name: "Chiesa di San Pietro Martire",
    zone: "murano",
    categories: ["temples-patrimoine", "excursions"],
    lat: 45.4583, lng: 12.3548,
    description: "Une église dominicaine de Murano qui conserve plusieurs tableaux de Giovanni Bellini et Véronèse, surprenants pour une église d'île aussi modeste en apparence.",
    whyVisit: "Des œuvres de grands maîtres vénitiens dans un cadre insulaire paisible, loin de la foule des grands musées.",
    littleTip: "La Vierge en trône de Bellini, peinte pour cette même église en 1488, y est encore exposée à son emplacement d'origine.",
    indicativeDuration: "30 min",
  },

  // ---------- Burano & Torcello (excursion) ----------
  {
    slug: "isola-burano",
    name: "Isola di Burano",
    zone: "burano-torcello",
    categories: ["incontournables", "quartiers-balades", "excursions"],
    lat: 45.4853, lng: 12.4165,
    description: "Une île de pêcheurs célèbre dans le monde entier pour ses maisons peintes de couleurs vives, une tradition qui aurait permis aux marins de repérer leur maison dans le brouillard.",
    whyVisit: "L'île la plus photogénique de toute la lagune, un enchantement de couleurs sur fond de canaux.",
    littleTip: "Les couleurs des maisons sont réglementées par la municipalité — chaque propriétaire doit demander une autorisation avant de repeindre sa façade.",
    indicativeDuration: "2h-3h",
  },
  {
    slug: "san-martino-burano",
    name: "Chiesa di San Martino (clocher penché)",
    zone: "burano-torcello",
    categories: ["incontournables", "temples-patrimoine", "excursions"],
    lat: 45.4850, lng: 12.4175,
    description: "L'église principale de Burano, dont le campanile penché de près de deux mètres rivalise visuellement avec les maisons colorées environnantes.",
    whyVisit: "Un autre clocher penché célèbre d'Italie, moins connu que celui de Pise mais tout aussi photogénique.",
    littleTip: "L'inclinaison du campanile, due à un terrain instable typique de la lagune, s'est stabilisée au fil des siècles sans jamais s'effondrer.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "museo-merletto-burano",
    name: "Museo del Merletto",
    zone: "burano-torcello",
    categories: ["temples-patrimoine", "excursions"],
    lat: 45.4851, lng: 12.4168,
    description: "Un musée dédié à la dentelle de Burano, art textile séculaire pratiqué par les femmes de l'île dont les pièces ornaient les cours royales d'Europe.",
    whyVisit: "Comprendre l'artisanat qui a fait la renommée de Burano au même titre que le verre a fait celle de Murano.",
    littleTip: "Méfiez-vous des boutiques vendant de la dentelle \"de Burano\" en réalité importée — le musée aide à reconnaître les pièces authentiques faites à la main.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "via-baldassare-galuppi",
    name: "Via Baldassare Galuppi",
    zone: "burano-torcello",
    categories: ["quartiers-balades", "street-food", "excursions"],
    lat: 45.4850, lng: 12.4160,
    description: "La rue principale et animée de Burano, bordée de maisons colorées, de boutiques de dentelle et de petits restaurants de poisson.",
    whyVisit: "L'axe central pour découvrir à pied l'ensemble des façades colorées de l'île.",
    littleTip: "Les petits restaurants de la rue sont réputés pour leur risotto de go (petit poisson local typique de la lagune).",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "isola-torcello",
    name: "Isola di Torcello",
    zone: "burano-torcello",
    categories: ["incontournables", "temples-patrimoine", "excursions"],
    lat: 45.5025, lng: 12.4175,
    description: "L'île la plus ancienne et autrefois la plus peuplée de la lagune, qui précéda Venise même avant de décliner et de devenir aujourd'hui presque déserte, sillonnée de canaux champêtres.",
    whyVisit: "Un voyage dans le temps vers la Venise d'avant Venise, dans un cadre champêtre et silencieux.",
    littleTip: "Le sentier qui relie l'embarcadère à la cathédrale, bordé de canaux et de prairies, est l'une des plus belles marches tranquilles de toute la lagune.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "cattedrale-torcello",
    name: "Cattedrale di Santa Maria Assunta (Torcello)",
    zone: "burano-torcello",
    categories: ["incontournables", "temples-patrimoine", "excursions"],
    lat: 45.5030, lng: 12.4180,
    description: "La plus ancienne église de la lagune, fondée en 639, avec une mosaïque byzantine du Jugement dernier d'une puissance visuelle exceptionnelle sur tout le mur ouest.",
    whyVisit: "L'une des plus anciennes et des plus impressionnantes mosaïques byzantines d'Italie, antérieure à Venise elle-même.",
    littleTip: "Montez au campanile pour une vue sur toute la lagune nord, nettement moins fréquentée que celle de San Marco.",
    indicativeDuration: "1h-1h15",
  },
  {
    slug: "ponte-diavolo-torcello",
    name: "Ponte del Diavolo",
    zone: "burano-torcello",
    categories: ["experiences-insolites", "excursions"],
    lat: 45.5020, lng: 12.4172,
    description: "Un des rares ponts de la lagune sans parapet, entouré de légendes locales impliquant le diable, qui l'aurait construit en une nuit.",
    whyVisit: "Un petit pont chargé de légende, dans le cadre champêtre et silencieux de Torcello.",
    littleTip: "L'absence de parapet, rare à Venise où la sécurité est généralement très encadrée, alimente encore la légende locale.",
    indicativeDuration: "10 min",
  },
  {
    slug: "locanda-cipriani",
    name: "Locanda Cipriani",
    zone: "burano-torcello",
    categories: ["restaurants", "excursions"],
    lat: 45.5028, lng: 12.4178,
    description: "Une auberge historique de Torcello fondée en 1934 par la famille Cipriani (créateurs du Bellini et du Harry's Bar), fréquentée jadis par Hemingway et la reine d'Angleterre.",
    whyVisit: "Un déjeuner élégant dans un cadre champêtre unique, chargé d'histoire littéraire et royale.",
    littleTip: "Hemingway y séjourna plusieurs mois pour écrire, et la chambre qu'il occupait se visite encore aujourd'hui.",
    indicativeDuration: "1h30-2h",
    indicativePrice: "$$$$",
  },

  // ---------- Aéroport ----------
  {
    slug: "aeroporto-marco-polo",
    name: "Aeroporto Venezia Marco Polo",
    zone: "aeroport",
    categories: [],
    lat: 45.5053, lng: 12.3519,
    description: "L'aéroport international de Venise, sur la terre ferme à environ 12 km au nord de la ville historique, relié au centre uniquement par bateau ou par bus jusqu'au Piazzale Roma.",
    whyVisit: "Repère pratique pour organiser son arrivée ou son départ de Venise.",
    littleTip: "Le bateau-bus Alilaguna relie directement l'aéroport au centre historique en 1h-1h15 — plus lent mais bien plus pittoresque que le bus jusqu'au Piazzale Roma suivi d'un vaporetto.",
  },
];

const ZONE_DEFS = [
  {
    slug: "san-marco",
    name: "San Marco",
    mapColor: "#a8422c",
    vibeText: "Le cœur monumental et historique de Venise, entre la basilique byzantine, le palais des Doges et les grands cafés historiques de la place.",
    prosText: "La plus forte concentration de monuments emblématiques, cœur de la vie vénitienne depuis mille ans.",
    consText: "Le quartier le plus touristique et le plus cher de Venise, surtout autour de la place elle-même.",
    transportText: "Vaporetto lignes 1 et 2, arrêt San Marco-Vallaresso ou San Zaccaria.",
    nearbyText: "Rialto et Dorsoduro se rejoignent à pied en 10-15 minutes.",
    profileFitText: "Incontournable pour tout premier séjour à Venise.",
    hotelAdviceText: "Hôtels nombreux mais très chers — envisager Castello ou Cannaregio pour un meilleur rapport qualité-prix à quelques minutes à pied.",
  },
  {
    slug: "rialto-san-polo",
    name: "Rialto & San Polo",
    mapColor: "#c9972e",
    vibeText: "Le cœur commerçant historique de Venise depuis mille ans, entre le pont du Rialto, son marché quotidien et les chefs-d'œuvre du Tintoret.",
    prosText: "Excellent marché local, grands sites d'art moins fréquentés que San Marco, bonne offre de bacari.",
    consText: "Le pont du Rialto lui-même reste très bondé toute la journée en haute saison.",
    transportText: "Vaporetto ligne 1, arrêt Rialto Mercato ou San Silvestro.",
    nearbyText: "San Marco se rejoint à pied en 10 minutes via le pont du Rialto.",
    profileFitText: "Pour le marché authentique, les cicchetti et l'art du Tintoret.",
    hotelAdviceText: "Bon compromis entre emplacement central et prix plus raisonnables qu'à San Marco.",
  },
  {
    slug: "dorsoduro",
    name: "Dorsoduro",
    mapColor: "#2e86ab",
    vibeText: "Le quartier artistique et étudiant de Venise, entre grandes galeries d'art, promenade ensoleillée des Zattere et ambiance de vie locale.",
    prosText: "Grands musées d'art (Accademia, Guggenheim), ambiance moins touristique, excellentes gelaterias.",
    consText: "Quartier assez étendu, nécessitant de la marche entre les différents pôles d'intérêt.",
    transportText: "Vaporetto lignes 1 et 2, arrêts Accademia, Ca' Rezzonico ou Zattere.",
    nearbyText: "San Marco se rejoint à pied en 10 minutes via le Ponte dell'Accademia.",
    profileFitText: "Pour les passionnés d'art moderne et une ambiance plus locale et étudiante.",
    hotelAdviceText: "Quartier résidentiel agréable et plus calme le soir, excellent compromis charme et emplacement.",
  },
  {
    slug: "cannaregio",
    name: "Cannaregio",
    mapColor: "#d6479a",
    vibeText: "Le plus grand sestiere de Venise et son quartier le plus local, entre le premier ghetto juif de l'histoire et les bacari authentiques de la Fondamenta della Misericordia.",
    prosText: "Ambiance authentique et locale, excellents bacari, bon rapport qualité-prix pour se loger.",
    consText: "Un peu plus excentré de San Marco, nécessite davantage de marche ou de vaporetto.",
    transportText: "Vaporetto lignes 1 et 2, arrêts Ferrovia (gare), Guglie ou Ca' d'Oro.",
    nearbyText: "Le Rialto se rejoint à pied en 15-20 minutes via la Strada Nova.",
    profileFitText: "Pour une ambiance authentiquement locale et les meilleurs bacari de Venise.",
    hotelAdviceText: "L'un des meilleurs rapports qualité-prix de Venise, à quelques minutes à pied du centre historique.",
  },
  {
    slug: "castello",
    name: "Castello",
    mapColor: "#8f2d2d",
    vibeText: "Le plus grand sestiere de Venise par sa superficie, entre l'ancien arsenal militaire de la République et des quartiers résidentiels authentiques loin de la foule.",
    prosText: "Patrimoine historique et naval exceptionnel, ambiance locale préservée, excellents bacari sur Via Garibaldi.",
    consText: "Certaines parties excentrées nécessitent davantage de marche depuis San Marco.",
    transportText: "Vaporetto lignes 1 et 2, arrêts Arsenale, Giardini ou San Zaccaria.",
    nearbyText: "San Marco se rejoint à pied en 10-15 minutes le long de la Riva degli Schiavoni.",
    profileFitText: "Pour l'histoire navale de Venise et une ambiance résidentielle plus authentique.",
    hotelAdviceText: "Bon compromis entre calme résidentiel et proximité du centre, surtout près de la Riva degli Schiavoni.",
  },
  {
    slug: "murano",
    name: "Murano (excursion)",
    mapColor: "#6fae7c",
    vibeText: "L'île du verre soufflé, à quelques minutes de vaporetto de Venise, avec ses propres canaux et son propre campanile en miniature.",
    prosText: "Artisanat du verre unique au monde, trajet rapide depuis Venise, ambiance d'île paisible.",
    consText: "Les boutiques près de l'embarcadère peuvent être plus chères et moins authentiques que celles plus loin dans l'île.",
    transportText: "Vaporetto ligne 3 ou 4.1/4.2 depuis Fondamente Nove (environ 10-15 minutes).",
    nearbyText: "Burano et Torcello se rejoignent en vaporetto direct depuis Murano, pour combiner les trois îles en une journée.",
    profileFitText: "Pour les passionnés d'artisanat et de verre soufflé, en demi-journée depuis Venise.",
    hotelAdviceText: "Généralement visité en demi-journée depuis Venise, peu d'hébergements nécessaires sur place.",
  },
  {
    slug: "burano-torcello",
    name: "Burano & Torcello (excursion)",
    mapColor: "#2a7a8c",
    vibeText: "Deux îles contrastées de la lagune nord : les maisons éclatantes de couleurs de Burano, et le silence champêtre et millénaire de Torcello.",
    prosText: "Burano est l'une des îles les plus photogéniques du monde, Torcello offre un contraste de calme absolu.",
    consText: "Nécessite une bonne partie de la journée pour visiter les deux îles confortablement.",
    transportText: "Vaporetto ligne 12 depuis Fondamente Nove (environ 40-45 minutes jusqu'à Burano, puis navette courte vers Torcello).",
    nearbyText: "Murano se rejoint en vaporetto direct, pour combiner les trois îles de la lagune en une seule journée.",
    profileFitText: "Pour les amateurs de photographie et de paysages de lagune, sur une demi-journée à une journée complète.",
    hotelAdviceText: "Quelques hébergements de charme à Burano pour qui veut voir l'île sans la foule des excursions à la journée.",
  },
  {
    slug: "aeroport",
    name: "Aéroport",
    mapColor: "#888888",
    vibeText: "L'aéroport international de Venise, repéré sur la carte pour organiser facilement son arrivée ou son départ.",
    prosText: "Utile pour visualiser la distance et l'orientation par rapport au centre historique avant de réserver un transfert.",
    consText: "N'est pas un lieu à visiter — purement un repère pratique.",
    transportText: "Bateau-bus Alilaguna directement vers le centre, ou bus jusqu'au Piazzale Roma puis vaporetto.",
    nearbyText: "Cannaregio est le sestiere le plus proche de l'aéroport en arrivant par bateau.",
    profileFitText: "Repère pratique pour tous les profils de voyage.",
    hotelAdviceText: "Aucun hébergement recommandé à proximité directe de l'aéroport — mieux vaut loger dans le centre historique.",
  },
];

async function main() {
  console.log("Seeding Venice destination…");

  const italie = await prisma.country.upsert({
    where: { slug: "italie" },
    update: {},
    create: { slug: "italie", name: "Italie" },
  });

  const venise = await prisma.destination.upsert({
    where: { slug: "venise" },
    update: { status: "PUBLISHED" },
    create: {
      countryId: italie.id,
      slug: "venise",
      name: "Venise",
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
    where: { id: venise.id },
    data: {
      categories: {
        set: ENABLED_CATEGORIES.map((slug) => ({ id: categoryBySlug.get(slug)!.id })),
      },
    },
  });

  const zoneBySlug = new Map<string, { id: string }>();
  for (const z of ZONE_DEFS) {
    const zone = await prisma.zone.upsert({
      where: { destinationId_slug: { destinationId: venise.id, slug: z.slug } },
      update: {
        name: z.name, mapColor: z.mapColor, vibeText: z.vibeText, prosText: z.prosText,
        consText: z.consText, transportText: z.transportText, nearbyText: z.nearbyText,
        profileFitText: z.profileFitText, hotelAdviceText: z.hotelAdviceText,
      },
      create: { destinationId: venise.id, ...z },
    });
    zoneBySlug.set(z.slug, zone);
  }

  let manifest: PhotoManifestEntry[] = [];
  try {
    manifest = JSON.parse(
      await readFile(
        "/private/tmp/claude-501/-Users-constance/f6c42bbe-3c4a-4229-b982-d00b14542e1b/scratchpad/photos_venise/manifest.json",
        "utf-8"
      )
    );
  } catch {
    console.log("No photo manifest found yet — seeding without photos.");
  }

  // Final accepted photos live in seed-assets/venise-photos/<slug>.jpg
  // (resized, false positives already excluded) — same pattern as every
  // other destination this session. The Dockerfile bakes this folder
  // into storage/photos at build time.
  const PHOTOS_DIR = "seed-assets/venise-photos";

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
        name: def.name, destinationId: venise.id, zoneId: zone?.id, status: "PUBLISHED",
        lat: def.lat, lng: def.lng, description: def.description, whyVisit: def.whyVisit,
        littleTip: def.littleTip, indicativeDuration: def.indicativeDuration,
        indicativePrice: def.indicativePrice, isFictionalDemo: false,
      },
      create: {
        slug: def.slug, destinationId: venise.id, zoneId: zone?.id, name: def.name,
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

  console.log(`Venice seed complete: ${PLACES.length} places, ${photoCount} with real photos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
