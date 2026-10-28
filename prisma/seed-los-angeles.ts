/**
 * Los Angeles — first USA West Coast addition in this batch, built
 * from the admin "Nouvelle destination" request queue (100 places
 * targeted). Covers Hollywood, Downtown, the beach cities, the museum
 * district, and two genuine day-trip areas captured implicitly by the
 * sprawling nature of LA — Malibu's coastline and Pasadena. Same
 * pattern as every other destination: real places, real coordinates,
 * Wikimedia Commons photos only when a genuine match exists, no zoos
 * (Griffith Park is described for the observatory, the park and the
 * Greek Theatre, never the LA Zoo), restaurants priced across every
 * range.
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
  // ---------- Hollywood & Los Feliz ----------
  {
    slug: "hollywood-walk-of-fame",
    name: "Hollywood Walk of Fame",
    zone: "hollywood",
    categories: ["incontournables", "quartiers-balades"],
    lat: 34.1016, lng: -118.3269,
    description: "Un trottoir de plus de 2,7 km incrusté de plus de 2 700 étoiles de bronze et de terrazzo, chacune dédiée à une personnalité du cinéma, de la télévision ou de la musique.",
    whyVisit: "Le symbole le plus connu de l'industrie du divertissement américaine, à parcourir en cherchant ses stars préférées.",
    littleTip: "Les étoiles les plus célèbres sont souvent entourées de touristes — les sections moins centrales sont plus tranquilles pour les photos.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "tcl-chinese-theatre",
    name: "TCL Chinese Theatre",
    zone: "hollywood",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 34.1022, lng: -118.3410,
    description: "Un cinéma emblématique de 1927 au style pagode exubérant, dont la cour d'entrée conserve les empreintes de mains et de pieds de centaines de stars hollywoodiennes.",
    whyVisit: "Le cinéma le plus photographié d'Hollywood, et le lieu de la plupart des grandes premières de films depuis un siècle.",
    littleTip: "Comparez votre main à celle de vos acteurs préférés dans le ciment — certaines empreintes datent de plus de 90 ans.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "dolby-theatre",
    name: "Dolby Theatre",
    zone: "hollywood",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 34.1023, lng: -118.3400,
    description: "La salle qui accueille la cérémonie des Oscars chaque année depuis 2002, au cœur du complexe commercial Hollywood & Highland.",
    whyVisit: "Voir en vrai le tapis rouge et la salle où se joue chaque année la plus grande cérémonie du cinéma mondial.",
    littleTip: "Les visites guidées des coulisses, hors période de cérémonie, permettent de monter sur la scène même des Oscars.",
    indicativeDuration: "45 min (visite guidée)",
  },
  {
    slug: "hollywood-highland",
    name: "Hollywood & Highland",
    zone: "hollywood",
    categories: ["shopping", "points-de-vue"],
    lat: 34.1023, lng: -118.3390,
    description: "Un complexe commercial à ciel ouvert dont la cour centrale, encadrée d'éléphants monumentaux inspirés d'Intolérance de D. W. Griffith, cadre parfaitement le panneau Hollywood au loin.",
    whyVisit: "L'une des meilleures vues gratuites sur le panneau Hollywood, intégrée à l'architecture même du complexe.",
    littleTip: "Montez jusqu'à la cour supérieure, entre les colonnes d'éléphants, pour la photo la plus classique du panneau Hollywood.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "capitol-records-building",
    name: "Capitol Records Building",
    zone: "hollywood",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 34.1016, lng: -118.3256,
    description: "Le premier bâtiment de bureaux circulaire au monde, construit en 1956 en forme de pile de disques vinyles, siège historique du label qui signa les Beatles aux États-Unis.",
    whyVisit: "Une architecture originale et un symbole de l'âge d'or de l'industrie musicale américaine.",
    littleTip: "La lumière rouge au sommet de l'antenne clignote en morse le mot \"Hollywood\", une tradition depuis l'ouverture du bâtiment.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "el-capitan-theatre",
    name: "El Capitan Theatre",
    zone: "hollywood",
    categories: ["temples-patrimoine", "incontournables"],
    lat: 34.1020, lng: -118.3384,
    description: "Un cinéma historique de 1926 au décor espagnol-mauresque somptueux, propriété de Disney depuis 1989, qui projette principalement les premières de films Disney et Marvel.",
    whyVisit: "L'un des plus beaux intérieurs de cinéma restaurés d'Hollywood, pour une séance dans un décor d'époque exceptionnel.",
    littleTip: "Les projections s'accompagnent parfois d'un petit spectacle sur scène avant le film, une tradition propre à ce cinéma.",
    indicativeDuration: "2h-2h30 (séance)",
  },
  {
    slug: "griffith-observatory",
    name: "Griffith Observatory",
    zone: "hollywood",
    categories: ["incontournables", "points-de-vue"],
    lat: 34.1184, lng: -118.3004,
    description: "Un observatoire Art déco de 1935 perché sur les collines d'Hollywood, offrant l'une des meilleures vues gratuites sur Los Angeles et le panneau Hollywood.",
    whyVisit: "La meilleure vue gratuite sur toute la ville de Los Angeles, avec un planétarium et des expositions astronomiques.",
    littleTip: "Venez au coucher du soleil pour voir la ville s'illuminer progressivement depuis la terrasse, un moment particulièrement photogénique.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "griffith-park",
    name: "Griffith Park",
    zone: "hollywood",
    categories: ["incontournables", "activites-famille"],
    lat: 34.1365, lng: -118.2942,
    description: "L'un des plus grands parcs urbains d'Amérique du Nord, plus de cinq fois la taille de Central Park, avec des sentiers de randonnée offrant des vues sur toute la ville.",
    whyVisit: "Un vaste espace naturel en pleine ville, parfait pour la randonnée avec vue sur le panneau Hollywood et la skyline.",
    littleTip: "Le sentier vers le panneau Hollywood lui-même (Mount Lee) part du parc et prend environ 3h aller-retour.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "lake-hollywood-park",
    name: "Lake Hollywood Park (vue sur le panneau Hollywood)",
    zone: "hollywood",
    categories: ["incontournables", "points-de-vue"],
    lat: 34.1341, lng: -118.3215,
    description: "Un petit parc de quartier dont la pelouse offre l'une des vues les plus dégagées et les moins fréquentées sur le panneau Hollywood, sans randonnée nécessaire.",
    whyVisit: "La photo classique du panneau Hollywood sans effort physique, loin de la foule de Hollywood & Highland.",
    littleTip: "Le parking est limité et se remplit vite au coucher du soleil — venez tôt ou prévoyez de vous garer dans les rues environnantes.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "los-feliz-neighborhood",
    name: "Los Feliz (Vermont Avenue)",
    zone: "hollywood",
    categories: ["quartiers-balades", "cafes-brunchs"],
    lat: 34.1081, lng: -118.2904,
    description: "Un quartier résidentiel élégant et bohème au pied de Griffith Park, avec une avenue commerçante bordée de cafés indépendants et librairies.",
    whyVisit: "Une ambiance de quartier local et créative, loin de l'agitation touristique d'Hollywood Boulevard.",
    littleTip: "Le quartier abrite plusieurs maisons de l'architecte Frank Lloyd Wright, dont la célèbre Ennis House, visible depuis la rue.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "greek-theatre-la",
    name: "Greek Theatre",
    zone: "hollywood",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 34.1198, lng: -118.2923,
    description: "Un amphithéâtre en plein air niché dans les collines de Griffith Park, inspiré de l'architecture grecque antique, qui accueille concerts et spectacles en soirée.",
    whyVisit: "Une salle de concert en plein air au cadre naturel exceptionnel, parmi les plus réputées de Los Angeles.",
    littleTip: "Les sièges en gradins supérieurs, moins chers, offrent souvent une meilleure vue d'ensemble sur la scène et les collines environnantes.",
    indicativeDuration: "2h-3h (concert)",
  },
  {
    slug: "musso-frank-grill",
    name: "Musso & Frank Grill",
    zone: "hollywood",
    categories: ["restaurants", "temples-patrimoine"],
    lat: 34.1018, lng: -118.3375,
    description: "Le plus ancien restaurant d'Hollywood, ouvert en 1919, fréquenté par Charlie Chaplin, Marilyn Monroe et des générations de scénaristes et stars de cinéma.",
    whyVisit: "Manger dans un décor hollywoodien resté quasiment inchangé depuis un siècle, véritable institution du quartier.",
    littleTip: "Les habitués recommandent de s'asseoir au bar en acajou d'origine plutôt qu'en salle, pour l'ambiance la plus authentique.",
    indicativeDuration: "1h30",
    indicativePrice: "$$$",
  },
  {
    slug: "hollywood-forever-cemetery",
    name: "Hollywood Forever Cemetery",
    zone: "hollywood",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 34.0875, lng: -118.3090,
    description: "Un cimetière historique où reposent Rudolph Valentino, Judy Garland et d'autres stars du cinéma classique, qui organise des projections de films en plein air en été.",
    whyVisit: "Un lieu de mémoire du vieil Hollywood, avec l'une des plus belles vues sur le panneau depuis un lac paisible.",
    littleTip: "Les projections estivales de films sur la pelouse, pique-nique compris, sont devenues une tradition très prisée des Angelenos.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "echo-park-lake",
    name: "Echo Park Lake",
    zone: "hollywood",
    categories: ["quartiers-balades", "activites-famille"],
    lat: 34.0781, lng: -118.2606,
    description: "Un lac urbain entouré de lotus et de palmiers, cœur d'un quartier hipster en pleine effervescence, avec location de pédalos et vue sur la skyline de Downtown.",
    whyVisit: "Une pause paisible et photogénique, dans l'un des quartiers les plus créatifs et en vogue de Los Angeles.",
    littleTip: "Les lotus du lac fleurissent spectaculairement en été, attirant photographes et promeneurs chaque année en juillet-août.",
    indicativeDuration: "45 min-1h",
  },

  // ---------- Downtown LA ----------
  {
    slug: "walt-disney-concert-hall",
    name: "Walt Disney Concert Hall",
    zone: "downtown-la",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 34.0554, lng: -118.2496,
    description: "Une salle de concert aux courbes d'acier inoxydable spectaculaires, conçue par Frank Gehry, domicile de l'Orchestre Philharmonique de Los Angeles depuis 2003.",
    whyVisit: "L'une des œuvres architecturales les plus audacieuses de Los Angeles, et une acoustique saluée internationalement.",
    littleTip: "Les jardins publics sur le toit, accessibles gratuitement, offrent une perspective originale sur la structure métallique.",
    indicativeDuration: "45 min-1h (extérieur) à 2h30 (concert)",
  },
  {
    slug: "the-broad",
    name: "The Broad",
    zone: "downtown-la",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 34.0541, lng: -118.2503,
    description: "Un musée d'art contemporain gratuit à la façade alvéolée distinctive, qui abrite notamment plusieurs Infinity Rooms de Yayoi Kusama très prisées.",
    whyVisit: "Une collection d'art contemporain majeure, entièrement gratuite, dans un bâtiment architecturalement remarquable.",
    littleTip: "Les Infinity Rooms nécessitent une réservation de créneau séparée, à prendre dès l'arrivée tant la demande est forte.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "grand-central-market",
    name: "Grand Central Market",
    zone: "downtown-la",
    categories: ["marches", "street-food"],
    lat: 34.0506, lng: -118.2487,
    description: "Un marché couvert historique de 1917, aujourd'hui réputé pour sa scène gastronomique variée, des tacos traditionnels aux comptoirs les plus tendances de Downtown.",
    whyVisit: "Le meilleur endroit pour un déjeuner varié à Downtown LA, entre cuisine traditionnelle et concepts modernes.",
    littleTip: "Le marché est particulièrement animé à l'heure du déjeuner en semaine — venez tôt ou tard pour éviter la foule.",
    indicativeDuration: "45 min-1h",
    indicativePrice: "$$",
  },
  {
    slug: "angels-flight-railway",
    name: "Angels Flight Railway",
    zone: "downtown-la",
    categories: ["experiences-insolites", "incontournables"],
    lat: 34.0508, lng: -118.2494,
    description: "Le plus court chemin de fer funiculaire du monde, en service depuis 1901 (avec une interruption), qui relie Hill Street à Bunker Hill sur seulement 90 mètres.",
    whyVisit: "Une curiosité historique amusante, pour une mini-ascension emblématique du vieux Downtown.",
    littleTip: "Le trajet ne dure qu'une minute, mais c'est l'une des expériences les plus photographiées de tout Downtown LA.",
    indicativeDuration: "10 min",
    indicativePrice: "$",
  },
  {
    slug: "olvera-street",
    name: "Olvera Street",
    zone: "downtown-la",
    categories: ["incontournables", "marches"],
    lat: 34.0562, lng: -118.2367,
    description: "Le berceau historique de Los Angeles, une rue piétonne mexicaine colorée bordée d'étals artisanaux, à l'emplacement même de la fondation de la ville en 1781.",
    whyVisit: "Le site fondateur de Los Angeles, avec une ambiance mexicaine festive et authentique.",
    littleTip: "L'Avila Adobe, la plus ancienne maison de Los Angeles encore debout, se visite gratuitement sur la rue même.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "union-station-la",
    name: "Union Station",
    zone: "downtown-la",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 34.0561, lng: -118.2365,
    description: "La dernière grande gare construite aux États-Unis dans le style mission-revival espagnol, inaugurée en 1939, surnommée \"la dernière des grandes gares américaines\".",
    whyVisit: "Une architecture ferroviaire spectaculaire, qui a servi de décor à de nombreux films hollywoodiens.",
    littleTip: "Le hall principal, avec ses lustres en fer forgé et son sol en marbre, mérite une visite même sans prendre de train.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "little-tokyo-la",
    name: "Little Tokyo",
    zone: "downtown-la",
    categories: ["quartiers-balades", "street-food"],
    lat: 34.0500, lng: -118.2400,
    description: "Le plus ancien quartier japonais des États-Unis, avec ses restaurants, épiceries et le musée national japonais-américain retraçant l'histoire de la communauté nippo-américaine.",
    whyVisit: "Un quartier culturel riche en histoire et en gastronomie japonaise authentique.",
    littleTip: "Le Japanese American National Museum retrace l'histoire difficile des camps d'internement pendant la Seconde Guerre mondiale.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "arts-district-la",
    name: "Arts District",
    zone: "downtown-la",
    categories: ["quartiers-balades", "bars-rooftops"],
    lat: 34.0407, lng: -118.2335,
    description: "D'anciens entrepôts industriels reconvertis en galeries d'art, brasseries artisanales et fresques murales monumentales, l'un des quartiers les plus créatifs de Los Angeles.",
    whyVisit: "Le meilleur quartier pour le street art et une scène créative indépendante en pleine effervescence.",
    littleTip: "Les fresques murales changent régulièrement — une balade dans le quartier révèle toujours de nouvelles œuvres.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "moca-la",
    name: "MOCA (Museum of Contemporary Art)",
    zone: "downtown-la",
    categories: ["temples-patrimoine", "incontournables"],
    lat: 34.0537, lng: -118.2500,
    description: "Le musée d'art contemporain de Los Angeles, dans un bâtiment signé Arata Isozaki, avec une collection couvrant l'art américain depuis 1940.",
    whyVisit: "Une collection d'art contemporain de référence, dans un bâtiment architecturalement singulier à Bunker Hill.",
    littleTip: "L'entrée est gratuite le jeudi après-midi, un bon moyen d'économiser sur le billet complet.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "bradbury-building",
    name: "Bradbury Building",
    zone: "downtown-la",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 34.0505, lng: -118.2485,
    description: "Un immeuble de bureaux de 1893 à l'intérieur spectaculaire baigné de lumière naturelle, avec des cages d'ascenseur en fer forgé ouvragé, devenu décor culte du film Blade Runner.",
    whyVisit: "L'un des intérieurs les plus photogéniques et cinématographiques de tout Los Angeles.",
    littleTip: "Le rez-de-chaussée est accessible gratuitement au public — les étages supérieurs restent des bureaux privés.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "the-last-bookstore",
    name: "The Last Bookstore",
    zone: "downtown-la",
    categories: ["experiences-insolites", "shopping"],
    lat: 34.0486, lng: -118.2512,
    description: "La plus grande librairie indépendante de livres neufs et d'occasion de Californie, installée dans un ancien hall de banque, avec des installations artistiques faites de livres.",
    whyVisit: "L'une des plus belles librairies au monde, avec des tunnels de livres sculptés devenus viraux sur les réseaux sociaux.",
    littleTip: "Le \"tunnel de livres\" et la voûte de l'ancienne banque, à l'étage, sont les installations les plus photographiées de la boutique.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "city-hall-la",
    name: "Los Angeles City Hall (observation deck)",
    zone: "downtown-la",
    categories: ["points-de-vue", "incontournables"],
    lat: 34.0537, lng: -118.2428,
    description: "L'hôtel de ville de Los Angeles, achevé en 1928, dont l'observatoire du 27e étage offre une vue gratuite à 360° sur Downtown et au-delà.",
    whyVisit: "Une vue panoramique gratuite sur toute la ville, bien moins connue que les rooftops payants.",
    littleTip: "Le bâtiment a servi de décor au Daily Planet de Superman dans les films des années 1950 à 1970.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "dodger-stadium",
    name: "Dodger Stadium",
    zone: "downtown-la",
    categories: ["incontournables", "activites-famille"],
    lat: 34.0739, lng: -118.2400,
    description: "Le troisième plus ancien stade de baseball encore en activité aux États-Unis, domicile des Dodgers de Los Angeles depuis 1962, niché dans les collines de Chavez Ravine.",
    whyVisit: "Vivre un match de baseball américain dans l'un des stades les plus mythiques du pays, avec vue sur les collines environnantes.",
    littleTip: "Le \"Dodger Dog\", hot-dog emblématique du stade, fait partie intégrante de l'expérience d'un match.",
    indicativeDuration: "3h (match)",
    indicativePrice: "$$",
  },
  {
    slug: "chinatown-la",
    name: "Chinatown (Central Plaza)",
    zone: "downtown-la",
    categories: ["quartiers-balades", "street-food"],
    lat: 34.0616, lng: -118.2384,
    description: "Le quartier chinois historique de Los Angeles, réaménagé dans les années 1930 avec des pagodes colorées et des néons vintage toujours en activité.",
    whyVisit: "Une ambiance rétro et colorée unique, mêlant gastronomie chinoise traditionnelle et galeries d'art contemporain.",
    littleTip: "Le quartier abrite aujourd'hui autant de galeries d'art contemporain que de commerces traditionnels, un mélange surprenant.",
    indicativeDuration: "45 min-1h",
  },

  // ---------- Santa Monica & Venice ----------
  {
    slug: "santa-monica-pier",
    name: "Santa Monica Pier",
    zone: "santa-monica-venice",
    categories: ["incontournables", "activites-famille"],
    lat: 34.0094, lng: -118.4973,
    description: "Une jetée emblématique de 1909 avec parc d'attractions, grande roue solaire et pêcheurs en tout genre, marquant symboliquement la fin de la mythique Route 66.",
    whyVisit: "Le symbole même de la Californie balnéaire, et le point final officiel de la Route 66.",
    littleTip: "La grande roue, alimentée à l'énergie solaire, offre une vue sur toute la baie de Santa Monica en soirée illuminée.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "santa-monica-state-beach",
    name: "Santa Monica State Beach",
    zone: "santa-monica-venice",
    categories: ["incontournables", "activites-famille"],
    lat: 34.0100, lng: -118.4965,
    description: "Une large plage de sable doré qui s'étend sur plusieurs kilomètres, l'une des plages urbaines les plus fréquentées de Californie.",
    whyVisit: "Une plage californienne classique, facilement accessible depuis le centre-ville sans voiture.",
    littleTip: "La piste cyclable qui longe la plage (The Strand) permet de rejoindre Venice Beach à vélo en moins de 30 minutes.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "third-street-promenade",
    name: "Third Street Promenade",
    zone: "santa-monica-venice",
    categories: ["shopping", "quartiers-balades"],
    lat: 34.0160, lng: -118.4965,
    description: "Une rue piétonne commerçante animée de Santa Monica, bordée de boutiques, restaurants et artistes de rue, à quelques pas de la plage.",
    whyVisit: "Le meilleur axe de shopping et d'animation en soirée de Santa Monica.",
    littleTip: "Les musiciens et artistes de rue s'y produisent surtout en fin d'après-midi et le soir, créant une ambiance festive.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "palisades-park-santa-monica",
    name: "Palisades Park",
    zone: "santa-monica-venice",
    categories: ["points-de-vue", "quartiers-balades"],
    lat: 34.0165, lng: -118.5010,
    description: "Un parc en bord de falaise qui longe l'océan sur plus d'un kilomètre, offrant une vue dégagée sur la baie de Santa Monica et, par temps clair, Catalina Island.",
    whyVisit: "L'une des meilleures vues gratuites sur l'océan Pacifique et les couchers de soleil de la région.",
    littleTip: "Le coucher de soleil depuis le parc, surtout en hiver quand le ciel est plus dégagé, attire régulièrement une petite foule silencieuse.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "venice-beach-boardwalk",
    name: "Venice Beach Boardwalk",
    zone: "santa-monica-venice",
    categories: ["incontournables", "experiences-insolites"],
    lat: 33.9850, lng: -118.4695,
    description: "Une promenade bohème et excentrique bordée de vendeurs de rue, artistes, cartomanciens et body-builders, l'une des scènes les plus singulières de toute la Californie.",
    whyVisit: "L'expression la plus pure et la plus décalée de la culture californienne, à vivre au moins une fois.",
    littleTip: "Restez attentif à vos affaires — l'ambiance très fréquentée et décontractée attire aussi quelques petits vols occasionnels.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "venice-canals",
    name: "Venice Canals",
    zone: "santa-monica-venice",
    categories: ["incontournables", "quartiers-balades"],
    lat: 33.9810, lng: -118.4660,
    description: "Un réseau de canaux résidentiels paisibles creusé en 1905 pour recréer Venise en Californie, aujourd'hui bordé de maisons modernes et de jardins fleuris.",
    whyVisit: "Un contraste saisissant et paisible avec l'agitation de la promenade de Venice Beach, à quelques rues seulement.",
    littleTip: "Les petits ponts qui enjambent les canaux offrent les meilleurs angles photo, surtout en fin de journée.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "muscle-beach-venice",
    name: "Muscle Beach Venice",
    zone: "santa-monica-venice",
    categories: ["experiences-insolites", "activites-famille"],
    lat: 33.9870, lng: -118.4720,
    description: "Le gymnase extérieur légendaire qui a façonné le mythe du bodybuilder californien depuis les années 1930, où Arnold Schwarzenegger s'entraînait à ses débuts.",
    whyVisit: "Un lieu culte de la culture fitness américaine, spectacle gratuit de musculation en plein air.",
    littleTip: "Les week-ends ensoleillés sont les meilleurs moments pour voir les habitués du gymnase extérieur en pleine séance.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "abbot-kinney-boulevard",
    name: "Abbot Kinney Boulevard",
    zone: "santa-monica-venice",
    categories: ["shopping", "cafes-brunchs"],
    lat: 33.9920, lng: -118.4680,
    description: "Une avenue branchée de Venice, régulièrement citée parmi les rues les plus tendances des États-Unis, bordée de boutiques de créateurs et cafés instagrammables.",
    whyVisit: "Le meilleur axe pour le shopping de créateurs indépendants et les cafés à la mode de Venice.",
    littleTip: "Le premier mardi soir du mois, de nombreuses boutiques prolongent leurs horaires pour un \"First Fridays\" informel.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "santa-monica-pier-aquarium",
    name: "Santa Monica Pier Aquarium",
    zone: "santa-monica-venice",
    categories: ["activites-famille"],
    lat: 34.0088, lng: -118.4970,
    description: "Un petit aquarium pédagogique sous la jetée de Santa Monica, dédié à la faune marine de la baie de Santa Monica, géré par une organisation environnementale locale.",
    whyVisit: "Une sortie éducative et abordable en famille, dédiée à la préservation de l'écosystème marin local.",
    littleTip: "Les bassins tactiles permettent aux enfants de toucher certaines créatures marines sous supervision du personnel.",
    indicativeDuration: "45 min",
    indicativePrice: "$",
  },
  {
    slug: "looff-hippodrome",
    name: "Looff Hippodrome (carrousel historique)",
    zone: "santa-monica-venice",
    categories: ["temples-patrimoine", "activites-famille"],
    lat: 34.0098, lng: -118.4975,
    description: "Un carrousel historique de 1916 installé dans un pavillon classé monument historique, sur la jetée de Santa Monica, qui a servi de décor au film Le Flic de Beverly Hills.",
    whyVisit: "L'un des plus anciens carrousels encore en activité aux États-Unis, dans un bâtiment architecturalement précieux.",
    littleTip: "Les chevaux de bois, sculptés à la main, datent tous de la construction d'origine du carrousel en 1916.",
    indicativeDuration: "20-30 min",
    indicativePrice: "$",
  },
  {
    slug: "original-muscle-beach-santa-monica",
    name: "Original Muscle Beach (Santa Monica)",
    zone: "santa-monica-venice",
    categories: ["experiences-insolites", "activites-famille"],
    lat: 34.0070, lng: -118.4930,
    description: "Le site originel du mouvement Muscle Beach des années 1930-1950, avant son déplacement à Venice, avec des équipements de gymnastique et d'anneaux toujours en accès libre.",
    whyVisit: "Le berceau historique du culte californien du corps, à l'origine de celui aujourd'hui plus connu à Venice.",
    littleTip: "Les anneaux de gymnastique et barres parallèles sont en accès libre — de nombreux athlètes amateurs s'y entraînent au quotidien.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "gjelina-venice",
    name: "Gjelina",
    zone: "santa-monica-venice",
    categories: ["restaurants"],
    lat: 33.9925, lng: -118.4685,
    description: "Un restaurant emblématique d'Abbot Kinney, référence de la cuisine californienne moderne à base de produits locaux et de pizzas au four à bois.",
    whyVisit: "L'une des meilleures tables de la scène gastronomique californienne décontractée de Venice.",
    littleTip: "Réservez impérativement à l'avance — le restaurant affiche presque toujours complet, surtout le week-end.",
    indicativeDuration: "1h30-2h",
    indicativePrice: "$$$",
  },
  {
    slug: "annenberg-community-beach-house",
    name: "Annenberg Community Beach House",
    zone: "santa-monica-venice",
    categories: ["activites-famille", "experiences-insolites"],
    lat: 34.0268, lng: -118.5245,
    description: "Un ancien domaine balnéaire privé des années 1920, aujourd'hui espace public gratuit avec piscine, plage privée et pool house historique ouvert à tous.",
    whyVisit: "Un accès rare et gratuit à un ancien domaine de stars hollywoodiennes, directement sur la plage.",
    littleTip: "L'accès à la piscine nécessite une réservation payante séparée, mais la plage et les jardins restent en accès libre.",
    indicativeDuration: "1h-1h30",
  },

  // ---------- Beverly Hills & West Hollywood ----------
  {
    slug: "rodeo-drive",
    name: "Rodeo Drive",
    zone: "beverly-hills",
    categories: ["incontournables", "shopping"],
    lat: 34.0696, lng: -118.4016,
    description: "La rue du shopping de luxe la plus célèbre des États-Unis, bordée des plus grandes maisons de couture mondiales, sur trois pâtés de maisons élégants.",
    whyVisit: "Le symbole international du luxe et du glamour hollywoodien, même sans faire de shopping.",
    littleTip: "Le Two Rodeo, petite place piétonne pavée à l'européenne, offre le meilleur décor photo de toute la rue.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "beverly-hills-hotel",
    name: "Beverly Hills Hotel",
    zone: "beverly-hills",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 34.0818, lng: -118.4169,
    description: "Un hôtel de luxe rose emblématique de 1912, surnommé le \"Pink Palace\", qui a accueilli des générations de stars et de têtes couronnées.",
    whyVisit: "L'un des hôtels les plus photographiés et glamour de Los Angeles, symbole du vieil Hollywood.",
    littleTip: "Le Polo Lounge, bar historique de l'hôtel, reste accessible aux non-résidents pour un verre dans une ambiance hollywoodienne classique.",
    indicativeDuration: "30-45 min",
    indicativePrice: "$$$$",
  },
  {
    slug: "greystone-mansion",
    name: "Greystone Mansion",
    zone: "beverly-hills",
    categories: ["temples-patrimoine", "incontournables"],
    lat: 34.0892, lng: -118.4170,
    description: "Un manoir de 55 pièces construit en 1928 par un magnat du pétrole, dont les jardins publics gratuits ont servi de décor à des dizaines de films et séries.",
    whyVisit: "L'un des plus beaux domaines de Beverly Hills, avec des jardins gratuits et une vue sur toute la ville.",
    littleTip: "Les jardins sont gratuits et ouverts au public tous les jours, bien que l'intérieur du manoir ne se visite que lors d'événements spéciaux.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "sunset-strip",
    name: "Sunset Strip",
    zone: "beverly-hills",
    categories: ["incontournables", "bars-rooftops"],
    lat: 34.0900, lng: -118.3850,
    description: "Un tronçon mythique de Sunset Boulevard, cœur historique de la scène rock des années 1960-1980, bordé de panneaux publicitaires géants et de clubs légendaires.",
    whyVisit: "Le berceau de la scène rock californienne, avec des clubs encore en activité depuis des décennies.",
    littleTip: "Les panneaux publicitaires géants le long du Strip sont réputés pour leur originalité, régulièrement renouvelés par les plus grandes marques.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "comedy-store",
    name: "The Comedy Store",
    zone: "beverly-hills",
    categories: ["experiences-insolites", "bars-rooftops"],
    lat: 34.0904, lng: -118.3787,
    description: "L'un des clubs de stand-up les plus mythiques des États-Unis, où ont débuté Jim Carrey, Robin Williams et Dave Chappelle, sur le Sunset Strip depuis 1972.",
    whyVisit: "Voir ou avoir vu la scène qui a lancé certains des plus grands comiques américains.",
    littleTip: "Certaines soirées proposent des \"surprise sets\" de grands noms de la comédie qui viennent tester du nouveau matériel sans préavis.",
    indicativeDuration: "1h30-2h (spectacle)",
    indicativePrice: "$$",
  },
  {
    slug: "chateau-marmont",
    name: "Chateau Marmont",
    zone: "beverly-hills",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 34.0975, lng: -118.3666,
    description: "Un hôtel de style château français de 1929, connu pour sa discrétion absolue envers ses clients célèbres et pour avoir été le théâtre de nombreux scandales hollywoodiens.",
    whyVisit: "L'un des hôtels les plus mythiques et secrets d'Hollywood, dont l'architecture évoque la Loire en plein Sunset Strip.",
    littleTip: "Le bar et le restaurant du rez-de-chaussée sont accessibles sans être client de l'hôtel, pour un verre dans un cadre chargé d'histoire.",
    indicativeDuration: "45 min-1h",
    indicativePrice: "$$$$",
  },
  {
    slug: "pacific-design-center",
    name: "Pacific Design Center",
    zone: "beverly-hills",
    categories: ["temples-patrimoine", "shopping"],
    lat: 34.0836, lng: -118.3764,
    description: "Un complexe architectural aux façades de verre bleu, vert et rouge spectaculaires, surnommé \"the Blue Whale\", dédié au design d'intérieur et à l'architecture.",
    whyVisit: "Une architecture contemporaine remarquable, et des showrooms de design ouverts au public.",
    littleTip: "Le MOCA Pacific Design Center, annexe du musée d'art contemporain, y organise régulièrement des expositions gratuites.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "melrose-avenue",
    name: "Melrose Avenue",
    zone: "beverly-hills",
    categories: ["shopping", "street-food"],
    lat: 34.0837, lng: -118.3614,
    description: "Une avenue commerçante alternative et colorée, référence du streetwear et de la mode vintage à Los Angeles depuis les années 1980.",
    whyVisit: "Le meilleur axe pour la mode streetwear et les boutiques vintage, avec de nombreuses fresques murales instagrammables.",
    littleTip: "Le mur rose du Paul Smith, à l'angle de Melrose et La Cienega, est l'un des murs les plus photographiés de tout Los Angeles.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "troubadour-la",
    name: "The Troubadour",
    zone: "beverly-hills",
    categories: ["experiences-insolites", "temples-patrimoine"],
    lat: 34.0815, lng: -118.3886,
    description: "Une salle de concert légendaire ouverte en 1957, où Elton John fit ses débuts américains et où naquit la scène folk-rock californienne des années 1970.",
    whyVisit: "L'une des salles de concert les plus historiquement importantes de la musique américaine, toujours en activité.",
    littleTip: "La salle reste volontairement intimiste malgré son histoire prestigieuse, offrant une proximité rare avec les artistes qui s'y produisent.",
    indicativeDuration: "2h-3h (concert)",
  },
  {
    slug: "beverly-gardens-park",
    name: "Beverly Gardens Park (panneau Beverly Hills)",
    zone: "beverly-hills",
    categories: ["incontournables", "quartiers-balades"],
    lat: 34.0735, lng: -118.4007,
    description: "Un jardin linéaire qui s'étend sur plus de trois kilomètres, dont le célèbre panneau fleuri \"Beverly Hills\" est devenu l'un des spots photo les plus populaires de la ville.",
    whyVisit: "La photo emblématique du panneau Beverly Hills, dans un cadre fleuri agréable pour une promenade.",
    littleTip: "Une petite file se forme souvent devant le panneau pour la photo — les heures creuses en matinée sont plus tranquilles.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "west-hollywood-design-district",
    name: "West Hollywood Design District",
    zone: "beverly-hills",
    categories: ["shopping", "restaurants"],
    lat: 34.0775, lng: -118.3850,
    description: "Un quartier haut de gamme regroupant galeries d'art, boutiques de design et restaurants gastronomiques, dans une ambiance plus intimiste que Rodeo Drive.",
    whyVisit: "Une alternative élégante et moins fréquentée à Rodeo Drive pour le shopping de luxe et le design.",
    littleTip: "De nombreuses galeries d'art du quartier proposent des vernissages gratuits et ouverts au public en soirée.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "spago-beverly-hills",
    name: "Spago Beverly Hills",
    zone: "beverly-hills",
    categories: ["restaurants"],
    lat: 34.0700, lng: -118.4010,
    description: "Le restaurant emblématique de Wolfgang Puck, pionnier de la cuisine californienne fusion, référence pour sa pizza au saumon fumé devenue culte.",
    whyVisit: "Une institution de la gastronomie californienne, dans un cadre élégant prisé des célébrités depuis les années 1980.",
    littleTip: "La pizza au saumon fumé et crème fraîche, créée dès l'ouverture en 1982, reste le plat signature le plus demandé.",
    indicativeDuration: "1h30-2h",
    indicativePrice: "$$$$",
  },

  // ---------- Mid-Wilshire & Museum Row ----------
  {
    slug: "lacma",
    name: "LACMA (Los Angeles County Museum of Art)",
    zone: "mid-wilshire",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 34.0639, lng: -118.3592,
    description: "Le plus grand musée d'art de la côte ouest des États-Unis, avec des collections couvrant 6 000 ans d'histoire de l'art, du monde antique à l'art contemporain.",
    whyVisit: "Le musée d'art le plus complet de Los Angeles, incontournable pour tout passionné d'art.",
    littleTip: "L'entrée est gratuite pour les résidents de Los Angeles certains jours de la semaine — vérifiez le calendrier avant de venir.",
    indicativeDuration: "2h-2h30",
  },
  {
    slug: "urban-light-lacma",
    name: "Urban Light",
    zone: "mid-wilshire",
    categories: ["incontournables", "experiences-insolites"],
    lat: 34.0632, lng: -118.3593,
    description: "Une installation de 202 anciens lampadaires urbains restaurés, assemblés par l'artiste Chris Burden à l'entrée du LACMA, devenue l'un des symboles visuels de Los Angeles.",
    whyVisit: "L'une des œuvres d'art public les plus photographiées de Los Angeles, gratuite et accessible à toute heure.",
    littleTip: "L'installation est particulièrement spectaculaire la nuit, quand tous les lampadaires s'allument simultanément.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "la-brea-tar-pits",
    name: "La Brea Tar Pits & Museum",
    zone: "mid-wilshire",
    categories: ["incontournables", "activites-famille"],
    lat: 34.0631, lng: -118.3555,
    description: "D'authentiques mares de bitume naturel en plein cœur de la ville, qui ont piégé et conservé des milliers de fossiles d'animaux de l'ère glaciaire, dont des mammouths et tigres à dents de sabre.",
    whyVisit: "Un site paléontologique actif unique au monde, en plein centre urbain, avec des fouilles toujours en cours.",
    littleTip: "Les bulles de méthane remontant naturellement à la surface du bitume sont visibles gratuitement depuis l'extérieur du musée.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "petersen-automotive-museum",
    name: "Petersen Automotive Museum",
    zone: "mid-wilshire",
    categories: ["temples-patrimoine", "incontournables"],
    lat: 34.0597, lng: -118.3613,
    description: "L'un des plus grands musées automobiles au monde, dans un bâtiment à la façade d'acier ondulé rouge spectaculaire, avec des voitures de stars et de films hollywoodiens.",
    whyVisit: "Une collection automobile exceptionnelle, y compris des voitures ayant appartenu à des stars hollywoodiennes.",
    littleTip: "Le sous-sol du musée (Vault), accessible en supplément, conserve des pièces rarissimes et des voitures de collection privées.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "academy-museum-motion-pictures",
    name: "Academy Museum of Motion Pictures",
    zone: "mid-wilshire",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 34.0629, lng: -118.3615,
    description: "Le musée officiel des Oscars, ouvert en 2021, avec une sphère géodésique signée Renzo Piano et des objets emblématiques de l'histoire du cinéma, dont une réplique du requin des Dents de la mer.",
    whyVisit: "Le musée définitif sur l'histoire du cinéma américain, par l'Académie des Oscars elle-même.",
    littleTip: "La terrasse de la sphère Renzo Piano offre une vue panoramique à 360° sur Los Angeles, incluse dans le billet d'entrée.",
    indicativeDuration: "2h-2h30",
  },
  {
    slug: "the-grove-la",
    name: "The Grove",
    zone: "mid-wilshire",
    categories: ["shopping", "activites-famille"],
    lat: 34.0719, lng: -118.3576,
    description: "Un centre commercial à ciel ouvert au style rétro élégant, avec tramway historique et fontaine dansante, l'un des lieux de shopping les plus fréquentés de Los Angeles.",
    whyVisit: "Une expérience de shopping californien complète, avec animation et ambiance familiale.",
    littleTip: "La fontaine dansante, synchronisée sur de la musique, offre un spectacle gratuit toutes les demi-heures en soirée.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "original-farmers-market",
    name: "Original Farmers Market",
    zone: "mid-wilshire",
    categories: ["marches", "street-food"],
    lat: 34.0723, lng: -118.3614,
    description: "Un marché couvert historique ouvert en 1934, juste à côté du Grove, avec des dizaines de comptoirs de cuisine internationale et de produits frais.",
    whyVisit: "Une institution culinaire de Los Angeles, bien plus authentique et historique que le centre commercial voisin.",
    littleTip: "Bob's Coffee & Donuts, ouvert depuis 1947, reste l'une des adresses les plus appréciées du marché pour le petit-déjeuner.",
    indicativeDuration: "45 min-1h",
    indicativePrice: "$$",
  },
  {
    slug: "craft-contemporary",
    name: "Craft Contemporary",
    zone: "mid-wilshire",
    categories: ["temples-patrimoine"],
    lat: 34.0624, lng: -118.3610,
    description: "Un petit musée dédié à l'artisanat d'art et au design contemporain, sur Museum Row, avec des expositions temporaires originales et souvent interactives.",
    whyVisit: "Une alternative plus intimiste et originale aux grands musées voisins du Museum Row.",
    littleTip: "Les expositions changent fréquemment et sortent souvent des sentiers battus de l'art traditionnel.",
    indicativeDuration: "45 min",
  },
  {
    slug: "koreatown-la",
    name: "Koreatown",
    zone: "mid-wilshire",
    categories: ["street-food", "quartiers-balades"],
    lat: 34.0580, lng: -118.3000,
    description: "L'un des plus grands quartiers coréens hors d'Asie, avec une vie nocturne animée, des karaokés privés (noraebang) et une gastronomie coréenne réputée dans tout Los Angeles.",
    whyVisit: "La meilleure cuisine coréenne de Los Angeles, dans une ambiance nocturne vivante jusqu'à très tard.",
    littleTip: "Les restaurants de barbecue coréen (galbi, bulgogi) y sont ouverts tard dans la nuit, une tradition bien ancrée dans le quartier.",
    indicativeDuration: "1h30-2h",
    indicativePrice: "$$",
  },
  {
    slug: "pan-pacific-park",
    name: "Pan Pacific Park",
    zone: "mid-wilshire",
    categories: ["activites-famille", "quartiers-balades"],
    lat: 34.0750, lng: -118.3550,
    description: "Un parc de quartier avec grande aire de jeux et pelouses ombragées, construit sur le site de l'ancien Pan Pacific Auditorium, salle de concert mythique disparue dans un incendie.",
    whyVisit: "Un espace vert agréable pour une pause en famille entre deux visites de musées du Museum Row.",
    littleTip: "L'arche d'entrée du parc rend hommage au style Art déco de l'auditorium original, disparu en 1989.",
    indicativeDuration: "30-45 min",
  },

  // ---------- Malibu ----------
  {
    slug: "getty-villa",
    name: "Getty Villa",
    zone: "malibu",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 34.0453, lng: -118.5631,
    description: "Une reconstitution d'une villa romaine antique au bord de l'océan Pacifique, abritant la collection d'antiquités grecques, romaines et étrusques du musée Getty.",
    whyVisit: "Une expérience muséale unique, qui mêle architecture antique reconstituée et vue sur l'océan.",
    littleTip: "L'entrée au musée est gratuite, mais une réservation de créneau horaire en ligne est obligatoire, même pour un billet gratuit.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "malibu-pier",
    name: "Malibu Pier",
    zone: "malibu",
    categories: ["incontournables", "quartiers-balades"],
    lat: 34.0366, lng: -118.6775,
    description: "Une jetée historique de Malibu, récemment restaurée, avec restaurants de fruits de mer et vue sur les surfeurs de la plage voisine.",
    whyVisit: "Le symbole de Malibu, parfait pour une pause déjeuner avec vue sur l'océan.",
    littleTip: "La plage juste à côté de la jetée, Surfrider Beach, est l'un des meilleurs spots de surf pour débutants de la région.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "el-matador-state-beach",
    name: "El Matador State Beach",
    zone: "malibu",
    categories: ["incontournables", "points-de-vue"],
    lat: 34.0380, lng: -118.8800,
    description: "L'une des plages les plus spectaculaires de Californie, encaissée entre des falaises de grès et des rochers monumentaux sculptés par l'érosion.",
    whyVisit: "L'une des plus belles plages photogéniques de toute la côte californienne, moins fréquentée que les plages urbaines.",
    littleTip: "L'accès se fait par un escalier assez raide depuis le parking en haut de la falaise — prévoyez de bonnes chaussures.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "point-dume-malibu",
    name: "Point Dume",
    zone: "malibu",
    categories: ["points-de-vue", "activites-famille"],
    lat: 34.0010, lng: -118.8060,
    description: "Un promontoire rocheux de Malibu offrant l'une des meilleures vues sur toute la côte, et un bon point d'observation des baleines grises en migration de décembre à avril.",
    whyVisit: "Un point de vue spectaculaire sur l'océan, avec une chance réelle d'apercevoir des baleines en saison.",
    littleTip: "De décembre à avril, les baleines grises migrent le long de la côte — les matinées calmes sont les meilleurs moments pour les repérer.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "zuma-beach",
    name: "Zuma Beach",
    zone: "malibu",
    categories: ["incontournables", "activites-famille"],
    lat: 34.0180, lng: -118.8220,
    description: "La plus grande plage publique du comté de Los Angeles, avec du sable blanc fin et des vagues réputées pour le surf, prisée des familles et des surfeurs.",
    whyVisit: "La plage familiale par excellence de Malibu, avec de bonnes infrastructures et beaucoup d'espace.",
    littleTip: "Le parking est payant mais abondant — arrivez tôt le week-end en été pour être sûr d'avoir une place.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "surfrider-beach-malibu",
    name: "Surfrider Beach",
    zone: "malibu",
    categories: ["incontournables", "activites-famille"],
    lat: 34.0362, lng: -118.6788,
    description: "L'une des plages de surf historiques les plus réputées de Californie, berceau du surf moderne sur la côte ouest dans les années 1940-1950.",
    whyVisit: "Un lieu historique pour le surf californien, encore très fréquenté par les surfeurs de tous niveaux aujourd'hui.",
    littleTip: "Plusieurs écoles de surf proposent des cours débutants directement sur cette plage réputée pour ses vagues régulières.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "pepperdine-viewpoint",
    name: "Pepperdine University (point de vue)",
    zone: "malibu",
    categories: ["points-de-vue"],
    lat: 34.0384, lng: -118.7117,
    description: "Le campus de l'université Pepperdine, perché sur les collines au-dessus de l'océan, offre l'une des plus belles vues gratuites sur toute la côte de Malibu.",
    whyVisit: "Un point de vue spectaculaire et gratuit, rarement fréquenté par les touristes classiques.",
    littleTip: "La croix lumineuse du campus, visible la nuit depuis la Pacific Coast Highway, est devenue un repère visuel de Malibu.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "topanga-canyon",
    name: "Topanga Canyon",
    zone: "malibu",
    categories: ["points-de-vue", "quartiers-balades"],
    lat: 34.0950, lng: -118.6050,
    description: "Un canyon montagneux entre Los Angeles et Malibu, longtemps repaire de musiciens et d'artistes dans les années 1960-1970, traversé par une route panoramique sinueuse.",
    whyVisit: "Une traversée spectaculaire entre montagne et océan, loin de l'agitation urbaine, avec une ambiance artistique bohème.",
    littleTip: "La route de Topanga Canyon est l'un des plus beaux trajets en voiture entre la vallée et la côte, surtout au coucher du soleil.",
    indicativeDuration: "45 min-1h (trajet)",
  },
  {
    slug: "leo-carrillo-state-beach",
    name: "Leo Carrillo State Beach",
    zone: "malibu",
    categories: ["activites-famille", "points-de-vue"],
    lat: 34.0470, lng: -118.9330,
    description: "Une plage à l'extrémité nord de Malibu, réputée pour ses grottes marines accessibles à marée basse et ses formations rocheuses spectaculaires.",
    whyVisit: "Une plage plus sauvage et moins fréquentée, parfaite pour l'exploration des grottes et des piscines naturelles.",
    littleTip: "Vérifiez les horaires de marée basse avant de venir — les grottes marines ne sont accessibles qu'à ce moment-là.",
    indicativeDuration: "1h30-2h",
  },

  // ---------- Pasadena (excursion) ----------
  {
    slug: "rose-bowl-stadium",
    name: "Rose Bowl Stadium",
    zone: "pasadena",
    categories: ["incontournables", "excursions"],
    lat: 34.1613, lng: -118.1676,
    description: "Un stade historique de 1922, classé monument historique national, domicile du célèbre match universitaire du Rose Bowl et d'un gigantesque marché aux puces mensuel.",
    whyVisit: "Un stade mythique du football américain universitaire, niché dans un cadre naturel exceptionnel.",
    littleTip: "Le marché aux puces du Rose Bowl, le deuxième dimanche de chaque mois, est l'un des plus grands et réputés de Californie.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "huntington-library",
    name: "Huntington Library, Art Museum & Botanical Gardens",
    zone: "pasadena",
    categories: ["incontournables", "temples-patrimoine", "excursions"],
    lat: 34.1281, lng: -118.1145,
    description: "Un domaine exceptionnel combinant bibliothèque rare (dont une Bible de Gutenberg), collection d'art britannique et français, et 120 hectares de jardins botaniques thématiques.",
    whyVisit: "L'une des plus belles sorties culturelles et botaniques de toute la région de Los Angeles.",
    littleTip: "Le jardin japonais et le jardin chinois (Liu Fang Yuan), parmi les plus beaux hors d'Asie, méritent à eux seuls la visite.",
    indicativeDuration: "3h-4h",
  },
  {
    slug: "old-pasadena",
    name: "Old Pasadena",
    zone: "pasadena",
    categories: ["quartiers-balades", "shopping", "excursions"],
    lat: 34.1458, lng: -118.1498,
    description: "Le centre historique de Pasadena, avec des façades commerciales du début du XXe siècle restaurées, bordées de boutiques, restaurants et bars animés.",
    whyVisit: "Un quartier historique préservé, agréable pour une balade shopping et dîner avant de rentrer vers Los Angeles.",
    littleTip: "Les ruelles arrière (alleys), autrefois utilisées pour les livraisons, abritent aujourd'hui des bars et restaurants cachés.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "norton-simon-museum",
    name: "Norton Simon Museum",
    zone: "pasadena",
    categories: ["incontournables", "temples-patrimoine", "excursions"],
    lat: 34.1469, lng: -118.1601,
    description: "Un musée d'art réputé pour sa collection d'impressionnistes et de maîtres anciens européens, considérée comme l'une des meilleures collections privées des États-Unis.",
    whyVisit: "Une collection de peinture européenne de très haut niveau, dans un cadre nettement moins fréquenté que les grands musées de Los Angeles.",
    littleTip: "Le jardin de sculptures extérieur, avec son étang de nénuphars inspiré de Monet, est une pause paisible entre les salles.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "colorado-street-bridge",
    name: "Colorado Street Bridge",
    zone: "pasadena",
    categories: ["temples-patrimoine", "points-de-vue", "excursions"],
    lat: 34.1453, lng: -118.1577,
    description: "Un pont en arc de béton de 1913, surnommé historiquement le \"pont du suicide\" en raison de son passé tragique, aujourd'hui sécurisé et offrant une vue sur l'Arroyo Seco.",
    whyVisit: "Un pont historique impressionnant, avec une vue dégagée sur la vallée verdoyante en contrebas.",
    littleTip: "Le pont est magnifiquement illuminé la nuit, un passage obligé pour les photographes de Pasadena.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "pasadena-city-hall",
    name: "Pasadena City Hall",
    zone: "pasadena",
    categories: ["temples-patrimoine", "excursions"],
    lat: 34.1469, lng: -118.1445,
    description: "Un hôtel de ville de style méditerranéen-Renaissance achevé en 1927, dont la cour intérieure et le dôme ont servi de décor à de nombreux films et séries télévisées.",
    whyVisit: "L'un des plus beaux hôtels de ville de Californie, avec une cour intérieure libre d'accès et très photogénique.",
    littleTip: "La cour intérieure, avec sa fontaine et ses orangers, est accessible gratuitement et reste étonnamment paisible.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "gamble-house",
    name: "Gamble House",
    zone: "pasadena",
    categories: ["incontournables", "temples-patrimoine", "excursions"],
    lat: 34.1489, lng: -118.1646,
    description: "Un chef-d'œuvre de l'architecture Craftsman américaine achevé en 1908, conçu par les frères Greene, considéré comme l'une des maisons les plus importantes de l'histoire architecturale américaine.",
    whyVisit: "L'exemple le plus abouti du mouvement Arts and Crafts américain, avec un intérieur en bois exceptionnellement préservé.",
    littleTip: "Les vitraux en verre d'art de la porte d'entrée, représentant un chêne stylisé, comptent parmi les plus célèbres de l'architecture américaine.",
    indicativeDuration: "1h-1h15 (visite guidée)",
  },
  {
    slug: "eaton-canyon",
    name: "Eaton Canyon (sentier de la cascade)",
    zone: "pasadena",
    categories: ["activites-famille", "excursions"],
    lat: 34.1735, lng: -118.1080,
    description: "Un sentier de randonnée populaire menant à une cascade naturelle de 15 mètres, accessible en famille à quelques minutes seulement du centre de Pasadena.",
    whyVisit: "Une randonnée facile et accessible en famille, avec une récompense rafraîchissante au bout du chemin.",
    littleTip: "Le sentier, environ 5 km aller-retour, reste praticable toute l'année mais le débit de la cascade varie fortement selon la saison.",
    indicativeDuration: "2h-2h30",
  },

  // ---------- Universal, Burbank & Studios ----------
  {
    slug: "universal-studios-hollywood",
    name: "Universal Studios Hollywood",
    zone: "universal-burbank",
    categories: ["incontournables", "activites-famille"],
    lat: 34.1381, lng: -118.3534,
    description: "Le parc à thème et studio de cinéma en activité le plus célèbre au monde, avec des attractions basées sur Harry Potter, Jurassic Park et la visite des plateaux de tournage réels.",
    whyVisit: "Une combinaison unique de parc d'attractions et de vrais studios de cinéma hollywoodiens en activité.",
    littleTip: "Le Studio Tour en tram, inclus dans le billet, permet de voir des décors de films réels, dont la rue de Retour vers le futur.",
    indicativeDuration: "6h-8h (journée complète)",
    indicativePrice: "$$$$",
  },
  {
    slug: "universal-citywalk",
    name: "Universal CityWalk",
    zone: "universal-burbank",
    categories: ["shopping", "restaurants"],
    lat: 34.1367, lng: -118.3534,
    description: "Une promenade commerçante et de divertissement en accès libre à l'entrée des studios Universal, avec restaurants, cinémas et animations gratuites.",
    whyVisit: "Une bonne option pour dîner ou se divertir en soirée sans acheter de billet pour le parc d'attractions lui-même.",
    littleTip: "L'accès au CityWalk est entièrement gratuit, contrairement au parc Universal Studios lui-même.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "warner-bros-studio-tour",
    name: "Warner Bros. Studio Tour Hollywood",
    zone: "universal-burbank",
    categories: ["incontournables", "experiences-insolites"],
    lat: 34.1522, lng: -118.3390,
    description: "Une visite guidée des plateaux de tournage réels du studio Warner Bros, avec les décors originaux de Friends, Harry Potter et de nombreuses productions actuelles.",
    whyVisit: "Une immersion authentique dans un vrai studio de cinéma en activité, plus intimiste qu'Universal Studios.",
    littleTip: "La visite inclut souvent le passage sur des plateaux en tournage actif, selon le calendrier de production du moment.",
    indicativeDuration: "3h-3h30",
    indicativePrice: "$$$",
  },
  {
    slug: "hollywood-bowl",
    name: "Hollywood Bowl",
    zone: "universal-burbank",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 34.1122, lng: -118.3391,
    description: "Un amphithéâtre naturel en plein air niché dans les collines d'Hollywood, qui accueille l'Orchestre Philharmonique de Los Angeles et de grands concerts depuis 1922.",
    whyVisit: "L'une des plus belles salles de concert en plein air au monde, avec des pique-niques traditionnels avant le spectacle.",
    littleTip: "Apportez votre propre pique-nique et une couverture — c'est la tradition locale pour profiter pleinement d'une soirée au Bowl.",
    indicativeDuration: "2h30-3h (concert)",
  },
  {
    slug: "forest-lawn-glendale",
    name: "Forest Lawn Memorial Park (Glendale)",
    zone: "universal-burbank",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 34.1467, lng: -118.2567,
    description: "Un cimetière monumental surnommé \"le cimetière des stars\", où reposent Michael Jackson, Clark Gable et Walt Disney, avec des reproductions de chefs-d'œuvre européens de sculpture.",
    whyVisit: "Un lieu de mémoire hollywoodien impressionnant, mêlant art, histoire du cinéma et architecture paysagère.",
    littleTip: "La reproduction grandeur nature du David de Michel-Ange, dans la Court of David, est l'une des pièces les plus admirées du site.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "autry-museum",
    name: "Autry Museum of the American West",
    zone: "universal-burbank",
    categories: ["temples-patrimoine"],
    lat: 34.1486, lng: -118.2944,
    description: "Un musée dédié à l'histoire et à la culture de l'Ouest américain, avec des collections sur les cultures amérindiennes et le mythe du cow-boy, à l'entrée de Griffith Park.",
    whyVisit: "Une perspective riche et nuancée sur l'histoire de l'Ouest américain, loin des clichés hollywoodiens.",
    littleTip: "La collection d'art amérindien, l'une des plus importantes du pays, mérite une visite approfondie à elle seule.",
    indicativeDuration: "1h30",
  },
  {
    slug: "descanso-gardens",
    name: "Descanso Gardens",
    zone: "universal-burbank",
    categories: ["activites-famille", "quartiers-balades"],
    lat: 34.2144, lng: -118.2246,
    description: "Un jardin botanique de 65 hectares niché dans les collines de La Cañada Flintridge, réputé pour sa forêt de camélias, l'une des plus grandes collections au monde.",
    whyVisit: "Une pause verte et paisible loin de l'agitation urbaine, avec une forêt de camélias spectaculaire en hiver.",
    littleTip: "La floraison des camélias, de janvier à mars, attire chaque année des photographes de toute la région.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "magnolia-park-burbank",
    name: "Magnolia Park (Burbank)",
    zone: "universal-burbank",
    categories: ["shopping", "cafes-brunchs"],
    lat: 34.1550, lng: -118.3200,
    description: "Un quartier commerçant vintage et rétro de Burbank, avec des boutiques de disques, de bandes dessinées et de mode d'occasion dans une ambiance décontractée.",
    whyVisit: "Une alternative locale et abordable au shopping de Melrose Avenue, dans l'ambiance décontractée de Burbank.",
    littleTip: "Les boutiques de disques vinyles du quartier sont réputées parmi les meilleures de tout Los Angeles pour les collectionneurs.",
    indicativeDuration: "45 min-1h",
  },

  // ---------- Aéroport ----------
  {
    slug: "lax-airport",
    name: "Los Angeles International Airport (LAX)",
    zone: "aeroport",
    categories: [],
    lat: 33.9416, lng: -118.4085,
    description: "Le principal aéroport international de Los Angeles, à l'ouest de la ville près de la côte, l'un des plus fréquentés au monde.",
    whyVisit: "Repère pratique pour organiser son arrivée ou son départ de Los Angeles.",
    littleTip: "Los Angeles n'ayant pas de métro direct vers LAX, prévoyez une voiture de location, un VTC ou la navette gratuite vers la station de métro LAX/Metro Transit Center.",
  },
];

const ZONE_DEFS = [
  {
    slug: "hollywood",
    name: "Hollywood & Los Feliz",
    mapColor: "#a8422c",
    vibeText: "Le cœur mythique de l'industrie du cinéma, entre Walk of Fame, cinémas historiques et les collines de Griffith Park dominées par l'observatoire.",
    prosText: "La plus forte concentration de patrimoine hollywoodien, excellent point de vue panoramique sur la ville.",
    consText: "Hollywood Boulevard lui-même reste assez touristique et parfois agité le soir.",
    transportText: "Metro Red Line, stations Hollywood/Highland et Hollywood/Vine.",
    nearbyText: "Downtown LA se rejoint en 20-25 minutes en métro vers le sud-est.",
    profileFitText: "Incontournable pour tout premier séjour à Los Angeles.",
    hotelAdviceText: "Hôtels nombreux et centraux, prix variables selon la proximité directe du Walk of Fame.",
  },
  {
    slug: "downtown-la",
    name: "Downtown LA",
    mapColor: "#c9972e",
    vibeText: "Le Los Angeles historique et contemporain à la fois, entre architecture Art déco, salles de concert futuristes et quartier des arts en pleine effervescence.",
    prosText: "Architecture variée et impressionnante, excellente scène artistique, bonne desserte en métro.",
    consText: "Certains quartiers restent à éviter la nuit — privilégiez les zones animées et bien fréquentées.",
    transportText: "Metro Red/Purple/Gold Lines, nombreuses stations dans tout Downtown.",
    nearbyText: "Hollywood se rejoint en 20-25 minutes en métro vers le nord-ouest.",
    profileFitText: "Pour l'architecture contemporaine, l'art et une ambiance urbaine authentique.",
    hotelAdviceText: "Quartier en plein essor avec de bons hôtels, excellent pour qui veut explorer sans voiture.",
  },
  {
    slug: "santa-monica-venice",
    name: "Santa Monica & Venice",
    mapColor: "#2e86ab",
    vibeText: "Le Los Angeles balnéaire par excellence, entre la jetée emblématique de Santa Monica et l'ambiance bohème unique de Venice Beach.",
    prosText: "Plages excellentes, ambiance californienne décontractée, bon réseau de pistes cyclables entre les deux quartiers.",
    consText: "Circulation dense en voiture, surtout le week-end et en été.",
    transportText: "Metro Expo Line jusqu'à Santa Monica ; bus ou vélo pour rejoindre Venice.",
    nearbyText: "Beverly Hills se rejoint en 20-25 minutes en voiture vers l'est.",
    profileFitText: "Incontournable pour l'ambiance plage californienne et une sortie vélo le long de la côte.",
    hotelAdviceText: "Excellent choix pour un séjour balnéaire, avec de nombreux hôtels à distance de marche de la plage.",
  },
  {
    slug: "beverly-hills",
    name: "Beverly Hills & West Hollywood",
    mapColor: "#d6479a",
    vibeText: "Le Los Angeles le plus glamour et élégant, entre shopping de luxe sur Rodeo Drive et scène musicale légendaire du Sunset Strip.",
    prosText: "Shopping de très haut luxe, patrimoine hollywoodien classique, excellente vie nocturne sur le Strip.",
    consText: "L'un des quartiers les plus chers de Los Angeles, peu d'options économiques sur place.",
    transportText: "Pas de métro direct — voiture, bus ou VTC recommandés pour se déplacer dans le quartier.",
    nearbyText: "Hollywood se rejoint en 15-20 minutes en voiture vers l'est.",
    profileFitText: "Pour le shopping de luxe et le glamour classique hollywoodien.",
    hotelAdviceText: "Quartier très élégant et central pour explorer l'ouest de Los Angeles, prix en conséquence.",
  },
  {
    slug: "mid-wilshire",
    name: "Mid-Wilshire & Museum Row",
    mapColor: "#8f2d2d",
    vibeText: "Le quartier des musées de Los Angeles, entre le plus grand musée d'art de la côte ouest et d'authentiques fossiles de l'ère glaciaire en plein centre-ville.",
    prosText: "Concentration exceptionnelle de musées de qualité, bonne offre de shopping et de gastronomie coréenne.",
    consText: "Nécessite généralement une voiture ou un VTC pour bien profiter de la zone, assez étendue.",
    transportText: "Metro Purple Line (extension récente) dessert désormais directement le Museum Row.",
    nearbyText: "Beverly Hills se rejoint en 10-15 minutes en voiture vers l'ouest.",
    profileFitText: "Incontournable pour les passionnés de musées et d'art.",
    hotelAdviceText: "Quartier central et pratique, bon point de départ pour explorer tout le centre et l'ouest de Los Angeles.",
  },
  {
    slug: "malibu",
    name: "Malibu",
    mapColor: "#3f8c5a",
    vibeText: "La côte la plus spectaculaire de la région de Los Angeles, entre plages sauvages, falaises de grès et villa antique romaine au bord de l'océan.",
    prosText: "Paysages côtiers exceptionnels, plages moins fréquentées que Santa Monica, bonne observation des baleines en saison.",
    consText: "Nécessite impérativement une voiture, les distances entre les sites étant importantes le long de la côte.",
    transportText: "Voiture indispensable, via la Pacific Coast Highway (route 1) depuis Santa Monica.",
    nearbyText: "Santa Monica se rejoint en 20-30 minutes en voiture vers le sud-est le long de la côte.",
    profileFitText: "Pour les plus belles plages et vues côtières de la région, idéalement avec une voiture de location.",
    hotelAdviceText: "Quelques hébergements de charme en bord de mer, à des prix souvent élevés vu l'exclusivité du secteur.",
  },
  {
    slug: "pasadena",
    name: "Pasadena (excursion)",
    mapColor: "#2a7a8c",
    vibeText: "Une excursion élégante au nord-est de Los Angeles, autour d'un stade mythique, d'une bibliothèque-jardin exceptionnelle et de la plus belle architecture Craftsman du pays.",
    prosText: "Patrimoine architectural et culturel exceptionnel, ambiance de ville plus paisible que le centre de Los Angeles.",
    consText: "Nécessite environ 30 minutes de métro ou de voiture depuis le centre de Los Angeles.",
    transportText: "Metro Gold Line directement depuis Downtown LA jusqu'à Old Pasadena.",
    nearbyText: "Le Rose Bowl, le Huntington et Old Pasadena se rejoignent facilement en voiture ou taxi local.",
    profileFitText: "Pour les passionnés d'architecture, de jardins botaniques et d'art, sur une journée complète.",
    hotelAdviceText: "Quelques bons hôtels à Old Pasadena pour qui veut explorer la zone sur deux jours plutôt qu'une excursion rapide.",
  },
  {
    slug: "universal-burbank",
    name: "Universal City & Burbank",
    mapColor: "#a8422c",
    vibeText: "La capitale des studios de cinéma en activité, entre le plus célèbre parc à thème hollywoodien et les vrais plateaux de tournage de Warner Bros.",
    prosText: "Expérience de studio de cinéma authentique, excellente salle de concert en plein air au Hollywood Bowl.",
    consText: "Universal Studios peut être très fréquenté et onéreux en haute saison — réservez à l'avance.",
    transportText: "Metro Red Line, station Universal City/Studio City.",
    nearbyText: "Hollywood se rejoint en 15-20 minutes en métro vers le sud.",
    profileFitText: "Incontournable pour les passionnés de cinéma et une sortie en famille au parc à thème.",
    hotelAdviceText: "Plusieurs hôtels pratiques près d'Universal Studios, idéal pour une visite du parc sur deux jours.",
  },
  {
    slug: "aeroport",
    name: "Aéroport",
    mapColor: "#888888",
    vibeText: "L'aéroport international de Los Angeles, repéré sur la carte pour organiser facilement son arrivée ou son départ.",
    prosText: "Utile pour visualiser la distance et l'orientation par rapport aux différents quartiers avant de réserver un transfert.",
    consText: "N'est pas un lieu à visiter — purement un repère pratique.",
    transportText: "Navette gratuite vers la station de métro LAX/Metro Transit Center, VTC ou voiture de location.",
    nearbyText: "Santa Monica et Venice sont les quartiers les plus proches de l'aéroport.",
    profileFitText: "Repère pratique pour tous les profils de voyage.",
    hotelAdviceText: "Aucun hébergement recommandé à proximité directe de l'aéroport — mieux vaut loger près de la plage ou à Hollywood.",
  },
];

async function main() {
  console.log("Seeding Los Angeles destination…");

  const usa = await prisma.country.upsert({
    where: { slug: "etats-unis" },
    update: {},
    create: { slug: "etats-unis", name: "États-Unis" },
  });

  const losAngeles = await prisma.destination.upsert({
    where: { slug: "los-angeles" },
    update: { status: "PUBLISHED" },
    create: {
      countryId: usa.id,
      slug: "los-angeles",
      name: "Los Angeles",
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
    where: { id: losAngeles.id },
    data: {
      categories: {
        set: ENABLED_CATEGORIES.map((slug) => ({ id: categoryBySlug.get(slug)!.id })),
      },
    },
  });

  const zoneBySlug = new Map<string, { id: string }>();
  for (const z of ZONE_DEFS) {
    const zone = await prisma.zone.upsert({
      where: { destinationId_slug: { destinationId: losAngeles.id, slug: z.slug } },
      update: {
        name: z.name, mapColor: z.mapColor, vibeText: z.vibeText, prosText: z.prosText,
        consText: z.consText, transportText: z.transportText, nearbyText: z.nearbyText,
        profileFitText: z.profileFitText, hotelAdviceText: z.hotelAdviceText,
      },
      create: { destinationId: losAngeles.id, ...z },
    });
    zoneBySlug.set(z.slug, zone);
  }

  let manifest: PhotoManifestEntry[] = [];
  try {
    manifest = JSON.parse(
      await readFile(
        "/private/tmp/claude-501/-Users-constance/f6c42bbe-3c4a-4229-b982-d00b14542e1b/scratchpad/photos_los_angeles/manifest.json",
        "utf-8"
      )
    );
  } catch {
    console.log("No photo manifest found yet — seeding without photos.");
  }

  // Final accepted photos live in seed-assets/los-angeles-photos/<slug>.jpg
  // (resized, false positives already excluded) — same pattern as every
  // other destination this session. The Dockerfile bakes this folder
  // into storage/photos at build time.
  const PHOTOS_DIR = "seed-assets/los-angeles-photos";

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
        name: def.name, destinationId: losAngeles.id, zoneId: zone?.id, status: "PUBLISHED",
        lat: def.lat, lng: def.lng, description: def.description, whyVisit: def.whyVisit,
        littleTip: def.littleTip, indicativeDuration: def.indicativeDuration,
        indicativePrice: def.indicativePrice, isFictionalDemo: false,
      },
      create: {
        slug: def.slug, destinationId: losAngeles.id, zoneId: zone?.id, name: def.name,
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

  console.log(`Los Angeles seed complete: ${PLACES.length} places, ${photoCount} with real photos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
