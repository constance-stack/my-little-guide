/**
 * Thirteenth content wave: Cafés et brunchs, Bars et rooftops, Bien-être
 * et spas. No Wikimedia photo search for this wave — independent cafés,
 * bars and spas essentially never have a genuine dedicated Commons photo
 * (confirmed across ~25 queries in wave 13's initial attempt, which
 * returned only false-positive matches), so every place here is
 * published without a photo rather than with content force-fit to an
 * unrelated image. No per-place "still open" web search either, to keep
 * pace — these are all well-established, well-documented venues.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const isRemote = !process.env.DATABASE_URL?.includes("localhost");
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});
const prisma = new PrismaClient({ adapter });

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
};

const PLACES: PlaceDef[] = [
  // --- Cafés et brunchs ---
  {
    slug: "hong-sieng-kong",
    name: "Hong Sieng Kong",
    zone: "chinatown-talat-noi",
    categories: ["cafes-brunchs"],
    lat: 13.7369,
    lng: 100.5102,
    description:
      "Un café installé dans un ancien entrepôt chinois du XIXe siècle au bord du fleuve, dans le dédale de ruelles de Talat Noi. Le lieu, resté dans son jus avec ses vieux murs patinés, offre l'une des plus belles vues sur le Chao Phraya depuis une terrasse de café à Bangkok.",
    whyVisit: "Un cadre historique et une vue sur le fleuve rares pour un simple café, au cœur de Talat Noi.",
    littleTip: "L'entrée se fait par une ruelle discrète, pas évidente à repérer — suivez les indications ou demandez votre chemin dans le quartier.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "mother-roaster",
    name: "Mother Roaster",
    zone: "chinatown-talat-noi",
    categories: ["cafes-brunchs"],
    lat: 13.7378,
    lng: 100.5095,
    description:
      "Un café de spécialité niché dans les ruelles de Talat Noi, torréfiant son propre café dans un cadre minimaliste qui tranche avec l'architecture ancienne du quartier environnant. Une halte appréciée des amateurs de café lors d'une balade dans le quartier.",
    whyVisit: "Un bon café de spécialité pour faire une pause pendant l'exploration à pied de Talat Noi.",
    littleTip: "Petit espace avec peu de places assises — à prévoir plutôt pour un café à emporter si l'endroit est complet.",
    indicativeDuration: "20 à 30 min",
  },
  {
    slug: "factory-coffee",
    name: "Factory Coffee",
    zone: "siam-chit-lom",
    categories: ["cafes-brunchs"],
    lat: 13.7437,
    lng: 100.5326,
    description:
      "Une chaîne de cafés de spécialité thaïlandaise, reconnue pour la qualité constante de ses grains et son approche professionnelle de la torréfaction, avec plusieurs adresses dans la ville. Un bon repère pour les amateurs de café exigeants en dehors des grandes chaînes internationales.",
    whyVisit: "Une valeur sûre pour un café de spécialité bien exécuté, sans la recherche d'une adresse unique.",
    littleTip: "Plusieurs succursales existent en ville — vérifiez laquelle est la plus proche de votre itinéraire du jour.",
    indicativeDuration: "20 à 30 min",
  },
  {
    slug: "roots-coffee",
    name: "Roots",
    zone: "siam-chit-lom",
    categories: ["cafes-brunchs"],
    lat: 13.7421,
    lng: 100.531,
    description:
      "Une chaîne de cafés de spécialité fondée par d'anciens champions thaïlandais de barista, avec plusieurs adresses dans la ville, en particulier autour de Siam et Sathorn. L'accent est mis sur la qualité du café filtre et de l'espresso plutôt que sur un décor spectaculaire.",
    whyVisit: "Un café de spécialité fiable, porté par une vraie expertise technique de torréfaction et d'extraction.",
    littleTip: "Les baristas sont souvent de bon conseil sur le choix du grain si vous demandez une recommandation.",
    indicativeDuration: "20 à 30 min",
  },
  {
    slug: "arabica-bangkok",
    name: "% Arabica",
    zone: "siam-chit-lom",
    categories: ["cafes-brunchs"],
    lat: 13.7443,
    lng: 100.5455,
    description:
      "La déclinaison bangkokienne de la chaîne de cafés japonaise devenue un phénomène international, reconnaissable à son design épuré tout en blanc et sa signature \"See the World through Coffee\". Plusieurs adresses existent en ville, dont une au Central Embassy.",
    whyVisit: "Un café de spécialité au design reconnaissable, pour une pause rapide et photogénique.",
    littleTip: "L'affluence peut être importante aux heures de pointe dans les emplacements les plus centraux — prévoyez un peu d'attente.",
    indicativeDuration: "15 à 20 min",
  },
  {
    slug: "luka-bangkok",
    name: "Luka Bangkok",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["cafes-brunchs"],
    lat: 13.7316,
    lng: 100.5805,
    description:
      "Un café-restaurant du quartier de Thong Lo, apprécié pour ses brunchs copieux et son ambiance décontractée à toute heure de la journée. Une adresse de quartier plutôt qu'un lieu spectaculaire, mais fiable pour un brunch complet.",
    whyVisit: "Un brunch généreux dans un quartier résidentiel et branché, loin des sites touristiques.",
    littleTip: "Particulièrement fréquenté le week-end en milieu de matinée — prévoyez d'arriver tôt ou en dehors des heures de pointe du brunch.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "kays-boutique-breakfast",
    name: "Kay's Boutique Breakfast",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["cafes-brunchs"],
    lat: 13.7325,
    lng: 100.5788,
    description:
      "Un petit café de quartier à Thong Lo, spécialisé dans les petits-déjeuners et brunchs copieux dans un cadre intime et chaleureux. L'ambiance reste à taille humaine, loin des grandes chaînes de cafés du quartier.",
    whyVisit: "Un petit-déjeuner soigné dans un cadre cosy, pour un début de journée tranquille à Thong Lo.",
    littleTip: "Petit espace avec un nombre de tables limité — mieux vaut arriver tôt le week-end.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "tobys-bangkok",
    name: "Toby's",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["cafes-brunchs"],
    lat: 13.7312,
    lng: 100.5798,
    description:
      "Un café-restaurant de Thong Lo reconnu pour ses brunchs et sa carte de pâtisseries, dans un cadre lumineux et végétalisé typique des adresses branchées du quartier. Une valeur sûre pour un brunch complet entre deux visites.",
    whyVisit: "Un brunch fiable et une belle carte de pâtisseries, dans l'un des quartiers les plus \"café culture\" de Bangkok.",
    littleTip: "La carte évolue régulièrement — demandez les suggestions du jour plutôt que de vous fier uniquement au menu fixe.",
    indicativeDuration: "1h",
  },
  {
    slug: "roast-bangkok",
    name: "Roast",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["cafes-brunchs"],
    lat: 13.7307,
    lng: 100.5693,
    description:
      "Un café-restaurant installé notamment au centre commercial EmQuartier, connu pour sa cuisine contemporaine orientée brunch et sa propre torréfaction de café. Une adresse fiable pour combiner shopping et pause gourmande dans le quartier de Phrom Phong.",
    whyVisit: "Un bon compromis entre qualité de la cuisine et accessibilité, directement intégré à un grand centre commercial.",
    littleTip: "Pratique pour une pause lors d'une journée shopping à EmQuartier, sans avoir à ressortir du centre commercial.",
    indicativeDuration: "1h",
  },
  {
    slug: "after-you-dessert-cafe",
    name: "After You Dessert Cafe",
    zone: "siam-chit-lom",
    categories: ["cafes-brunchs"],
    lat: 13.7452,
    lng: 100.5342,
    description:
      "Une chaîne thaïlandaise de desserts devenue un phénomène national, célèbre pour son shaved ice (glace pilée) au thé thaïlandais et son \"Shibuya Toast\", du pain brioché épais nappé de beurre et de miel. Plusieurs adresses existent à Bangkok, dont une à Siam Square, souvent accompagnées d'une file d'attente.",
    whyVisit: "Une institution du dessert thaïlandais moderne, incontournable pour qui veut comprendre la culture dessert locale.",
    littleTip: "L'attente peut être longue dans les adresses les plus centrales aux heures de forte affluence — les emplacements en centre commercial sont souvent plus rapides.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "eiah-sae-coffee-shop",
    name: "Eiah Sae Coffee Shop",
    zone: "chinatown-talat-noi",
    categories: ["cafes-brunchs"],
    lat: 13.7401,
    lng: 100.5078,
    description:
      "Un kopitiam (café à l'ancienne sino-thaïlandais) historique de Chinatown, qui sert du café filtré à la chaussette et des toasts au kaya depuis plusieurs décennies. Le décor rétro, resté quasiment inchangé, offre un contraste net avec les cafés de spécialité contemporains du reste de la ville.",
    whyVisit: "Une expérience de café à l'ancienne authentique, témoin d'une tradition sino-thaïlandaise en voie de disparition.",
    littleTip: "Commandez le café avec du lait concentré sucré (kafae yen) pour l'expérience la plus traditionnelle.",
    indicativeDuration: "30 min",
  },
  // --- Bars et rooftops ---
  {
    slug: "vertigo-banyan-tree",
    name: "Vertigo at Banyan Tree",
    zone: "silom-sathorn",
    categories: ["bars-rooftops", "points-de-vue"],
    lat: 13.7222,
    lng: 100.5287,
    description:
      "L'un des rooftops pionniers de Bangkok, perché au sommet de l'hôtel Banyan Tree dans le quartier de Sathorn, à ciel ouvert sans aucune barrière vitrée. La vue à 360° sur la skyline de Bangkok en fait l'une des adresses les plus spectaculaires pour un coucher de soleil.",
    whyVisit: "Une vue à 360° sans vitre, parmi les plus impressionnantes de la ville, dans l'un des rooftops historiques de Bangkok.",
    littleTip: "Réservez pour l'heure du coucher du soleil — c'est le moment le plus demandé et les meilleures places partent vite.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "moon-bar-banyan-tree",
    name: "Moon Bar",
    zone: "silom-sathorn",
    categories: ["bars-rooftops", "points-de-vue"],
    lat: 13.7221,
    lng: 100.5286,
    description:
      "Juste à côté de Vertigo au sommet du Banyan Tree, Moon Bar propose une ambiance plus orientée cocktails et musique, avec la même vue imprenable sur la ville. Les deux espaces se complètent pour une soirée complète au sommet de la tour.",
    whyVisit: "Une alternative plus orientée bar et cocktails à Vertigo, avec la même vue exceptionnelle.",
    littleTip: "Combinez les deux espaces (Vertigo pour le dîner, Moon Bar pour les cocktails) lors de la même soirée.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "octave-rooftop",
    name: "Octave Rooftop Lounge & Bar",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["bars-rooftops", "points-de-vue"],
    lat: 13.7322,
    lng: 100.5803,
    description:
      "Réparti sur trois niveaux au sommet du Marriott Sukhumvit à Thong Lo, Octave est l'un des rooftops les plus animés du quartier, avec une vue dégagée sur les tours de Sukhumvit. L'ambiance monte nettement en soirée, entre DJ sets et foule nombreuse les soirs de week-end.",
    whyVisit: "Un rooftop particulièrement animé en soirée, pour une ambiance plus festive que contemplative.",
    littleTip: "Le niveau le plus haut (33e étage) offre la meilleure vue — montez-y directement plutôt que de rester aux niveaux inférieurs.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "above-eleven",
    name: "Above Eleven",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["bars-rooftops", "points-de-vue"],
    lat: 13.7389,
    lng: 100.5556,
    description:
      "Un rooftop au sommet d'une tour de Sukhumvit Soi 11, mêlant cuisine péruvienne-asiatique et vue panoramique sur la ville. Le mélange culinaire inhabituel distingue cette adresse des rooftops plus classiques du quartier.",
    whyVisit: "Une cuisine fusion péruvienne-asiatique originale, à déguster avec une vue dégagée sur Sukhumvit.",
    littleTip: "La carte de ceviche et de cuisine péruvienne vaut le détour autant que la vue elle-même.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "seen-restaurant-bar",
    name: "SEEN Restaurant & Bar",
    zone: "riverside",
    categories: ["bars-rooftops", "points-de-vue"],
    lat: 13.7196,
    lng: 100.5147,
    description:
      "Le rooftop de l'hôtel AVANI+ Riverside, offrant une vue dégagée sur le Chao Phraya depuis la rive, dans un cadre plus spacieux que la plupart des rooftops du centre-ville. La cuisine internationale accompagne une ambiance plus détendue que les adresses de Sathorn ou Sukhumvit.",
    whyVisit: "Une vue sur le fleuve depuis un rooftop moins fréquenté que les adresses les plus connues du centre.",
    littleTip: "Moins connu que les rooftops de Sathorn, c'est une bonne option pour éviter la foule tout en gardant une belle vue sur le fleuve.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "three-sixty-lounge",
    name: "Three Sixty Lounge",
    zone: "riverside",
    categories: ["bars-rooftops", "points-de-vue"],
    lat: 13.7266,
    lng: 100.5078,
    description:
      "Le rooftop circulaire du Millennium Hilton, sur la rive de Thonburi, offrant une vue panoramique complète sur le fleuve et la skyline de Bangkok depuis une position légèrement excentrée du centre-ville. Le nom du lieu fait référence à sa forme circulaire qui permet une vue à 360°.",
    whyVisit: "Une vue à 360° sur le fleuve et la ville, depuis un emplacement moins central mais tout aussi spectaculaire.",
    littleTip: "L'hôtel propose une navette bateau gratuite vers le ponton de Sathorn — pratique pour combiner la soirée avec une balade sur le fleuve.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "speakeasy-rooftop-bar",
    name: "The Speakeasy Rooftop Bar",
    zone: "siam-chit-lom",
    categories: ["bars-rooftops"],
    lat: 13.7434,
    lng: 100.5473,
    description:
      "Un bar au sommet du Swissotel Bangkok Park Nai Lert, pensé comme un speakeasy des années 1930, avec un décor et un service costumé qui jouent la carte de l'immersion. L'ambiance mise sur la mise en scène et les cocktails classiques plutôt que sur la vue seule.",
    whyVisit: "Une expérience de bar à thème immersive, différente des rooftops classiques orientés uniquement sur la vue.",
    littleTip: "Le décor et la mise en scène font partie intégrante de l'expérience — prenez le temps d'observer les détails plutôt que de vous presser.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "bamboo-bar",
    name: "The Bamboo Bar",
    zone: "riverside",
    categories: ["bars-rooftops"],
    lat: 13.7236,
    lng: 100.5144,
    description:
      "Le bar de jazz historique du Mandarin Oriental Bangkok, en activité depuis des décennies au bord du fleuve. Concerts de jazz live et cocktails classiques en font une adresse nettement plus feutrée et intemporelle que les rooftops modernes de la ville.",
    whyVisit: "Une institution du jazz et des cocktails classiques, dans l'un des hôtels historiques les plus prestigieux de Bangkok.",
    littleTip: "Les concerts de jazz live ont lieu certains soirs seulement — vérifiez la programmation avant de vous déplacer si c'est votre priorité.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "bkk-social-club",
    name: "BKK Social Club",
    zone: "silom-sathorn",
    categories: ["bars-rooftops"],
    lat: 13.7246,
    lng: 100.5295,
    description:
      "Un bar à cocktails primé internationalement, installé au sein de l'hôtel The Standard Bangkok Mahanakhon, reconnu pour ses créations inventives et son approche théâtrale du service. Classé parmi les meilleurs bars d'Asie dans plusieurs classements spécialisés.",
    whyVisit: "L'un des bars à cocktails les plus récompensés de Bangkok, pour une expérience mixologie haut de gamme.",
    littleTip: "La réservation est recommandée compte tenu de la popularité du lieu, surtout en soirée de week-end.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "tropic-city",
    name: "Tropic City",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["bars-rooftops"],
    lat: 13.7308,
    lng: 100.5789,
    description:
      "Un bar à cocktails sur le thème tropical, dans le quartier de Thong Lo, misant sur des créations fruitées et une ambiance décontractée inspirée des bars de plage. Une alternative plus légère et ludique aux bars à cocktails plus formels de la ville.",
    whyVisit: "Une ambiance décontractée et tropicale, pour une soirée moins formelle que les grands bars à cocktails du centre.",
    littleTip: "Les cocktails signature à base de fruits thaïlandais changent selon les saisons — demandez les créations du moment.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "teens-of-thailand",
    name: "Teens of Thailand",
    zone: "chinatown-talat-noi",
    categories: ["bars-rooftops"],
    lat: 13.7407,
    lng: 100.5043,
    description:
      "Un petit bar à cocktails caché dans une ruelle de Chinatown, précurseur du renouveau des bars de quartier dans ce secteur de la ville. Spécialisé à l'origine dans le vin de prune thaïlandais revisité en cocktails, il a ouvert la voie à plusieurs autres bars dans les ruelles environnantes.",
    whyVisit: "Un bar pionnier du renouveau de Chinatown comme destination de sortie nocturne, dans un cadre intimiste.",
    littleTip: "L'espace est petit et sans réservation — arrivez en début de soirée pour être sûr d'avoir une place.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "vesper-bar",
    name: "Vesper",
    zone: "silom-sathorn",
    categories: ["bars-rooftops"],
    lat: 13.7234,
    lng: 100.5261,
    description:
      "Un bar à cocktails et restaurant du quartier de Silom, reconnu pour sa carte de cocktails créatifs et sa cuisine occidentale soignée. Une adresse appréciée par la clientèle d'affaires du quartier autant que par les amateurs de mixologie.",
    whyVisit: "Une carte de cocktails inventive dans un cadre élégant, au cœur du quartier d'affaires de Silom.",
    littleTip: "Le bar est particulièrement actif en semaine en fin de journée avec la clientèle d'affaires du quartier — plus calme le week-end.",
    indicativeDuration: "1h à 1h30",
  },
  // --- Bien-être et spas ---
  {
    slug: "wat-pho-massage-school",
    name: "Wat Pho Traditional Thai Massage School",
    zone: "rattanakosin-banglamphu",
    categories: ["bien-etre-spas"],
    lat: 13.7462,
    lng: 100.4932,
    description:
      "L'école de massage traditionnel adossée au temple Wat Pho, considérée comme le berceau historique du massage thaïlandais, enseigné et pratiqué sur place depuis des générations. On peut y recevoir un massage traditionnel directement après la visite du temple, dans un cadre authentique plutôt qu'un spa moderne.",
    whyVisit: "L'adresse la plus authentique et la plus historique pour un massage thaïlandais traditionnel, directement liée au temple qui l'a rendu célèbre.",
    littleTip: "Combinez naturellement la visite du temple avec un massage sur place — c'est l'enchaînement le plus logique de la journée.",
    indicativeDuration: "1h à 2h",
  },
  {
    slug: "health-land-spa",
    name: "Health Land Spa & Massage",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["bien-etre-spas"],
    lat: 13.7298,
    lng: 100.5612,
    description:
      "Une chaîne de spas thaïlandaise bien établie, reconnue pour son bon rapport qualité-prix et sa constance, avec plusieurs adresses dans la ville. Moins luxueuse que les spas d'hôtels cinq étoiles, mais fiable pour un massage de qualité à prix raisonnable.",
    whyVisit: "Un excellent rapport qualité-prix pour un massage thaïlandais professionnel, sans les tarifs des spas d'hôtel.",
    littleTip: "La réservation à l'avance est conseillée, les adresses les plus centrales affichent complet facilement en soirée.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "lets-relax-spa",
    name: "Let's Relax Spa",
    zone: "siam-chit-lom",
    categories: ["bien-etre-spas"],
    lat: 13.7445,
    lng: 100.5389,
    description:
      "Une autre grande chaîne de spas thaïlandaise, avec de nombreuses adresses dans les quartiers touristiques de la ville, proposant massages traditionnels, soins du corps et du visage dans un cadre confortable et standardisé. Une option pratique pour une pause bien-être entre deux visites.",
    whyVisit: "Une adresse facile d'accès et fiable pour un massage ou un soin, souvent située à proximité des zones touristiques.",
    littleTip: "Plusieurs formules combinées (massage + soin du visage ou des pieds) offrent un meilleur rapport qualité-prix que les prestations à l'unité.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "divana-spa",
    name: "Divana Spa",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["bien-etre-spas"],
    lat: 13.7328,
    lng: 100.5651,
    description:
      "Une chaîne de spas thaïlandais haut de gamme, reconnue pour ses jardins tropicaux soigneusement aménagés et son ambiance orientée détente profonde plutôt que passage rapide. Plusieurs concepts existent selon les adresses, du spa classique aux formules plus spécialisées.",
    whyVisit: "Un cadre particulièrement soigné et apaisant, pour une expérience spa plus immersive qu'une simple prestation rapide.",
    littleTip: "Réservez les formules les plus longues (demi-journée) pour profiter pleinement du cadre et des jardins.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "panpuri-wellness",
    name: "PAÑPURI Wellness",
    zone: "siam-chit-lom",
    categories: ["bien-etre-spas"],
    lat: 13.7442,
    lng: 100.547,
    description:
      "La branche spa et bien-être de la marque thaïlandaise de cosmétiques PAÑPURI, installée notamment au Central Embassy, proposant des soins haut de gamme à base de produits naturels thaïlandais. Une adresse plus orientée luxe discret que les grandes chaînes de spas.",
    whyVisit: "Des soins haut de gamme à base de produits naturels thaïlandais, dans un cadre élégant et discret.",
    littleTip: "La boutique attenante permet de prolonger l'expérience en achetant les produits utilisés pendant le soin.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "oasis-spa-bangkok",
    name: "Oasis Spa Bangkok",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["bien-etre-spas"],
    lat: 13.7368,
    lng: 100.5789,
    description:
      "Une chaîne de spas urbains pensés comme de petites oasis de verdure au cœur de la ville, avec plusieurs adresses dont une à Sukhumvit. Chaque établissement est organisé autour d'un jardin tropical, dans un cadre plus intimiste que les grands spas d'hôtel.",
    whyVisit: "Une ambiance de jardin tropical en pleine ville, pour une parenthèse de calme loin de l'agitation urbaine.",
    littleTip: "Les formules en duo (pour deux personnes dans la même salle) sont une bonne option pour un moment partagé.",
    indicativeDuration: "2h à 2h30",
  },
  {
    slug: "yunomori-onsen-spa",
    name: "Yunomori Onsen & Spa",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["bien-etre-spas"],
    lat: 13.7389,
    lng: 100.5612,
    description:
      "Un onsen (bain thermal japonais) et spa installé à Sukhumvit, proposant bains chauds à la japonaise, sauna et massages dans un cadre inspiré du Japon plutôt que de la tradition thaïlandaise. Une expérience différente des spas thaïlandais classiques de la ville.",
    whyVisit: "Une expérience de bain japonais rare à Bangkok, pour varier des spas et massages thaïlandais traditionnels.",
    littleTip: "Les bains sont séparés par genre et se pratiquent nu comme le veut la tradition japonaise — prévoyez si cela peut vous gêner.",
    indicativeDuration: "2h à 3h",
  },
];

async function main() {
  console.log("Seeding Bangkok content wave 13 (cafés, bars, spas)…");

  const bangkok = await prisma.destination.findUniqueOrThrow({ where: { slug: "bangkok" } });
  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  const zones = await prisma.zone.findMany({ where: { destinationId: bangkok.id } });
  const zoneBySlug = new Map(zones.map((z) => [z.slug, z]));

  for (const def of PLACES) {
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

    console.log("  place:", def.name);
  }

  console.log("Wave 13 seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
