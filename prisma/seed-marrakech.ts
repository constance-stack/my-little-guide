/**
 * Marrakech — first Morocco destination, built from the admin
 * "Nouvelle destination" request queue (85 places targeted, no
 * specific notes). Covers the Medina, the souks, the historic
 * palaces, the modern Gueliz district, Jardin Majorelle, and genuine
 * day-trip areas around the city — the Palmeraie, the Agafay desert
 * and the Atlas Mountains / Ourika Valley. Same pattern as every
 * other destination: real places, real coordinates, Wikimedia
 * Commons photos only when a genuine match exists, no zoos and no
 * animal-entertainment attractions (Fantasia-style equestrian shows
 * excluded on the same precautionary basis), restaurants priced
 * across every range.
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
  // ---------- Médina & Jemaa el-Fna ----------
  {
    slug: "jemaa-el-fna",
    name: "Jemaa el-Fna",
    zone: "medina",
    categories: ["incontournables", "quartiers-balades"],
    lat: 31.6258, lng: -7.9892,
    description: "La place centrale et vivante de Marrakech, classée chef-d'œuvre du patrimoine oral de l'humanité par l'Unesco, où charmeurs de serpents, conteurs et stands de jus d'orange se succèdent du matin au soir.",
    whyVisit: "Le cœur battant de Marrakech, avec une ambiance radicalement différente le jour et la nuit.",
    littleTip: "Revenez à la tombée de la nuit, quand des dizaines de stands de street food s'installent et transforment la place en immense restaurant à ciel ouvert.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "mosquee-koutoubia",
    name: "Mosquée Koutoubia",
    zone: "medina",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 31.6238, lng: -7.9934,
    description: "La plus grande mosquée de Marrakech, dont le minaret de 77 mètres du XIIe siècle a servi de modèle à la Giralda de Séville et à la Tour Hassan de Rabat.",
    whyVisit: "Le repère architectural le plus emblématique de Marrakech, visible depuis presque toute la ville.",
    littleTip: "L'intérieur est réservé aux musulmans, mais les jardins environnants et la façade se contemplent librement à toute heure.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "jardin-secret-marrakech",
    name: "Jardin Secret",
    zone: "medina",
    categories: ["incontournables", "quartiers-balades"],
    lat: 31.6283, lng: -7.9880,
    description: "Un palais du XIXe siècle restauré avec ses deux jardins historiques, l'un islamique géométrique, l'autre exotique, cachés derrière de hauts murs en plein cœur de la médina.",
    whyVisit: "Une oasis de calme et de verdure insoupçonnée au milieu de l'agitation de la médina.",
    littleTip: "La tour panoramique du jardin offre l'une des meilleures vues sur les toits de la médina et la Koutoubia au loin.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "musee-marrakech-palais-mnebhi",
    name: "Musée de Marrakech (Palais Mnebhi)",
    zone: "medina",
    categories: ["temples-patrimoine"],
    lat: 31.6303, lng: -7.9875,
    description: "Un palais du XIXe siècle transformé en musée d'art marocain, avec une immense verrière centrale et un lustre monumental au-dessus de l'ancienne salle d'eau.",
    whyVisit: "Un cadre architectural somptueux pour découvrir l'art marocain traditionnel et contemporain.",
    littleTip: "Le patio central, avec sa fontaine et sa verrière, vaut à lui seul le déplacement même sans s'attarder sur les collections.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "medersa-ben-youssef",
    name: "Médersa Ben Youssef",
    zone: "medina",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 31.6315, lng: -7.9868,
    description: "La plus grande école coranique du Maghreb, fondée au XIVe siècle, dont les cours intérieures couvertes de zellige et de stuc sculpté comptent parmi les plus belles de Marrakech.",
    whyVisit: "L'un des plus beaux exemples d'architecture islamique de Marrakech, avec un niveau de détail exceptionnel.",
    littleTip: "Les petites cellules d'étudiants à l'étage, austères, contrastent fortement avec la splendeur décorative des cours principales.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "maison-de-la-photographie",
    name: "Maison de la Photographie",
    zone: "medina",
    categories: ["temples-patrimoine"],
    lat: 31.6300, lng: -7.9865,
    description: "Un musée privé consacré à la photographie ancienne du Maroc, avec une collection de plus de 8 000 clichés datant de 1870 à 1950, et une terrasse-café avec vue.",
    whyVisit: "Un regard rare et précieux sur le Maroc d'avant la photographie couleur, dans un riad restauré.",
    littleTip: "La terrasse du dernier étage, avec son café, offre l'une des plus belles vues sur les toits de la médina.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "dar-el-bacha-musee-confluences",
    name: "Dar El Bacha (Musée des Confluences)",
    zone: "medina",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 31.6295, lng: -7.9908,
    description: "L'ancien palais du puissant pacha de Marrakech au début du XXe siècle, aujourd'hui musée dédié au dialogue entre les civilisations à travers l'art.",
    whyVisit: "L'un des plus beaux palais de la médina, à l'architecture et aux jardins exceptionnellement préservés.",
    littleTip: "Le café du palais, dans la cour principale, est l'un des cadres les plus élégants de la médina pour une pause thé.",
    indicativeDuration: "1h-1h15",
  },
  {
    slug: "almoravid-koubba",
    name: "Qoubba Almoravide",
    zone: "medina",
    categories: ["temples-patrimoine"],
    lat: 31.6307, lng: -7.9875,
    description: "Le plus ancien monument encore debout de Marrakech, un pavillon d'ablutions du XIIe siècle, seul vestige visible de la dynastie almoravide fondatrice de la ville.",
    whyVisit: "Le témoin architectural le plus ancien de toute la ville, discret mais historiquement fondamental.",
    littleTip: "Les motifs décoratifs sculptés de la coupole ont influencé l'ensemble de l'architecture islamique marocaine qui a suivi.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "hammam-traditionnel-medina",
    name: "Hammam traditionnel de la médina",
    zone: "medina",
    categories: ["experiences-insolites", "bien-etre-spas"],
    lat: 31.6260, lng: -7.9890,
    description: "Un bain de vapeur public traditionnel, institution sociale marocaine séculaire, où l'on se fait gommer au savon noir et au gant de kessa.",
    whyVisit: "Une expérience culturelle authentique et relaxante, bien au-delà du simple soin spa touristique.",
    littleTip: "Les hammams publics traditionnels, moins chers que les spas pour touristes, offrent une immersion bien plus authentique dans la vie locale.",
    indicativeDuration: "1h-1h30",
    indicativePrice: "$",
  },
  {
    slug: "cafe-de-france-jemaa-el-fna",
    name: "Café de France",
    zone: "medina",
    categories: ["cafes-brunchs", "points-de-vue"],
    lat: 31.6258, lng: -7.9888,
    description: "Un café historique sur la Jemaa el-Fna depuis les années 1920, dont la terrasse en étage offre l'une des meilleures vues sur l'animation de la place.",
    whyVisit: "Le meilleur point de vue surélevé et abordable sur l'agitation quotidienne de la place.",
    littleTip: "Montez directement à l'étage pour la terrasse — le rez-de-chaussée n'offre pas la même vue sur la place.",
    indicativeDuration: "30-45 min",
    indicativePrice: "$",
  },
  {
    slug: "riad-yima",
    name: "Riad Yima",
    zone: "medina",
    categories: ["experiences-insolites", "shopping"],
    lat: 31.6278, lng: -7.9875,
    description: "Une galerie-café fondée par l'artiste marocain Hassan Hajjaj, figure du pop art marocain, mêlant boutique de design, café et espace d'exposition coloré.",
    whyVisit: "Une pause artistique et contemporaine singulière au cœur de la médina traditionnelle.",
    littleTip: "Les photographies pop colorées de Hassan Hajjaj, exposées sur place, sont devenues une référence de l'art marocain contemporain.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "chez-chegrouni",
    name: "Chez Chegrouni",
    zone: "medina",
    categories: ["restaurants"],
    lat: 31.6260, lng: -7.9895,
    description: "Un restaurant populaire directement sur la Jemaa el-Fna, référence pour un tajine ou un couscous simple et copieux avec vue sur la place.",
    whyVisit: "Une adresse fiable et abordable pour manger marocain avec vue directe sur l'animation de la place.",
    littleTip: "La terrasse à l'étage, avec vue sur la place, est très demandée au coucher du soleil — venez un peu avant pour avoir une table.",
    indicativeDuration: "1h-1h30",
    indicativePrice: "$$",
  },
  {
    slug: "nomad-marrakech",
    name: "Nomad",
    zone: "medina",
    categories: ["restaurants", "bars-rooftops"],
    lat: 31.6283, lng: -7.9835,
    description: "Un restaurant sur les toits du souk, référence de la cuisine marocaine moderne et créative, avec une terrasse offrant une vue panoramique sur la médina.",
    whyVisit: "La meilleure cuisine marocaine contemporaine de la médina, avec l'une des plus belles vues en terrasse.",
    littleTip: "Réservez une table en terrasse à l'avance, surtout pour le coucher du soleil, très demandé.",
    indicativeDuration: "1h30",
    indicativePrice: "$$$",
  },
  {
    slug: "dar-cherifa",
    name: "Dar Cherifa",
    zone: "medina",
    categories: ["cafes-brunchs", "temples-patrimoine"],
    lat: 31.6295, lng: -7.9885,
    description: "L'un des plus anciens riads de la médina, datant du XVIe siècle, aujourd'hui café littéraire et espace d'exposition d'art contemporain marocain.",
    whyVisit: "Un cadre architectural ancien exceptionnel, pour une pause thé loin de l'agitation des souks voisins.",
    littleTip: "Des lectures et rencontres littéraires y sont régulièrement organisées, ouvertes au public.",
    indicativeDuration: "30-45 min",
    indicativePrice: "$$",
  },
  {
    slug: "mouassine-fontaine-mosquee",
    name: "Fontaine et Mosquée Mouassine",
    zone: "medina",
    categories: ["temples-patrimoine", "quartiers-balades"],
    lat: 31.6290, lng: -7.9880,
    description: "Une fontaine publique du XVIe siècle encore en service, l'une des rares survivantes du système d'approvisionnement en eau de la médina historique.",
    whyVisit: "Un vestige fonctionnel de l'ingénierie hydraulique traditionnelle marocaine, toujours utilisé par les habitants.",
    littleTip: "Le quartier de Mouassine autour de la fontaine compte parmi les plus authentiques et les moins touristiques de la médina.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "bab-agnaou",
    name: "Bab Agnaou",
    zone: "medina",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 31.6175, lng: -7.9855,
    description: "L'une des plus anciennes et des plus ornées portes de la médina, construite au XIIe siècle, dont les sculptures géométriques encadrent toujours l'entrée de la Kasbah.",
    whyVisit: "L'une des plus belles portes monumentales de toute l'architecture almohade au Maroc.",
    littleTip: "Son nom signifie \"porte des Gnaouas\", en référence à la communauté d'Afrique subsaharienne installée à proximité.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "bab-berrima",
    name: "Bab Berrima",
    zone: "medina",
    categories: ["temples-patrimoine"],
    lat: 31.6200, lng: -7.9815,
    description: "Une porte fortifiée historique marquant l'entrée du quartier du Mellah, l'ancien quartier juif de Marrakech.",
    whyVisit: "Un point de passage historique entre la Kasbah royale et l'ancien quartier juif de la ville.",
    littleTip: "La porte marque encore clairement la limite entre les différents quartiers historiques de la médina ancienne.",
    indicativeDuration: "10-15 min",
  },
  {
    slug: "hammam-de-la-rose",
    name: "Hammam de la Rose",
    zone: "medina",
    categories: ["bien-etre-spas", "experiences-insolites"],
    lat: 31.6270, lng: -7.9870,
    description: "Un spa marocain contemporain qui réinterprète le hammam traditionnel dans un cadre élégant, avec gommage au savon noir et massage à l'huile d'argan.",
    whyVisit: "Une version plus confortable du hammam traditionnel, pour qui préfère un cadre spa occidental.",
    littleTip: "Réservez à l'avance, surtout en fin de journée, créneau le plus demandé après une journée de visite dans la médina.",
    indicativeDuration: "1h30-2h",
    indicativePrice: "$$$",
  },

  // ---------- Souks ----------
  {
    slug: "souk-semmarine",
    name: "Souk Semmarine",
    zone: "souks",
    categories: ["incontournables", "marches"],
    lat: 31.6290, lng: -7.9870,
    description: "L'artère principale et la plus animée des souks de Marrakech, couverte de claies de roseaux tressés qui filtrent la lumière, bordée de centaines d'échoppes.",
    whyVisit: "L'entrée classique dans le dédale des souks, pour une première immersion dans l'artisanat marocain.",
    littleTip: "Le marchandage est de rigueur partout dans les souks — ne jamais accepter le premier prix annoncé.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "souk-teinturiers",
    name: "Souk des Teinturiers",
    zone: "souks",
    categories: ["incontournables", "experiences-insolites"],
    lat: 31.6295, lng: -7.9840,
    description: "Le quartier des teinturiers de laine, où des écheveaux colorés sèchent suspendus entre les ruelles étroites, selon des techniques artisanales séculaires.",
    whyVisit: "L'un des coins les plus photogéniques et authentiques des souks, loin des boutiques les plus touristiques.",
    littleTip: "Les meilleures photos se prennent en fin de matinée, quand la lumière traverse les écheveaux de laine colorée suspendus.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "souk-cherifia",
    name: "Souk Cherifia",
    zone: "souks",
    categories: ["shopping", "bars-rooftops"],
    lat: 31.6293, lng: -7.9838,
    description: "Un petit souk vertical rénové regroupant des boutiques de créateurs marocains contemporains, avec un café-terrasse sur le toit.",
    whyVisit: "Une alternative plus curée et moderne pour le shopping artisanal, avec une vue sur les souks depuis la terrasse.",
    littleTip: "Le café sur le toit offre une pause agréable et une vue rare sur le dédale des souks environnants.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "place-rahba-kedima",
    name: "Place Rahba Kedima",
    zone: "souks",
    categories: ["incontournables", "marches"],
    lat: 31.6283, lng: -7.9865,
    description: "La place aux épices et herbes médicinales des souks, bordée d'échoppes vendant safran, argan, henné et remèdes traditionnels berbères.",
    whyVisit: "L'une des places les plus photogéniques et odorantes des souks, pour acheter épices et cosmétiques naturels.",
    littleTip: "Comparez les prix du safran entre plusieurs échoppes — la qualité et le prix varient énormément d'un vendeur à l'autre.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "souk-des-babouches",
    name: "Souk des Babouches",
    zone: "souks",
    categories: ["shopping", "marches"],
    lat: 31.6292, lng: -7.9862,
    description: "Le quartier spécialisé dans les babouches en cuir, chaussons traditionnels marocains, disponibles dans toutes les couleurs et tous les styles.",
    whyVisit: "La meilleure sélection de babouches artisanales de la ville, directement auprès des artisans fabricants.",
    littleTip: "Les babouches cousues main, reconnaissables à leurs coutures irrégulières, sont généralement de meilleure qualité que les modèles collés en série.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "ensemble-artisanal-marrakech",
    name: "Ensemble Artisanal",
    zone: "souks",
    categories: ["shopping", "experiences-insolites"],
    lat: 31.6180, lng: -7.9850,
    description: "Un centre artisanal géré par l'État, avec des artisans travaillant sur place et des prix fixes affichés, sans marchandage nécessaire.",
    whyVisit: "Un bon repère de prix avant de négocier dans les souks, et l'occasion de voir les artisans travailler en direct.",
    littleTip: "Même si vous comptez acheter dans les souks, une visite ici en premier donne une bonne idée des prix justes à négocier ensuite.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "souk-ableuh",
    name: "Souk Ableuh",
    zone: "souks",
    categories: ["marches", "street-food"],
    lat: 31.6288, lng: -7.9868,
    description: "Le souk des olives et condiments, avec des dizaines de variétés d'olives marocaines, citrons confits et épices présentées en pyramides colorées.",
    whyVisit: "Un régal visuel et olfactif, pour acheter des olives et citrons confits authentiques à rapporter.",
    littleTip: "Goûtez avant d'acheter — la plupart des vendeurs proposent volontiers des échantillons de leurs olives.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "fondouk-ouarzazi",
    name: "Fondouk Ouarzazi",
    zone: "souks",
    categories: ["temples-patrimoine", "shopping"],
    lat: 31.6292, lng: -7.9850,
    description: "Un ancien caravansérail restauré, cour intérieure à étages qui accueillait autrefois marchands et chameaux de passage, aujourd'hui atelier d'artisans.",
    whyVisit: "Un témoignage architectural rare du commerce caravanier d'autrefois, encore en activité artisanale aujourd'hui.",
    littleTip: "Plusieurs fondouks restaurés de la médina valent le détour pour leur architecture, même sans intention d'achat.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "cafe-clock-marrakech",
    name: "Café Clock",
    zone: "souks",
    categories: ["cafes-brunchs", "experiences-insolites"],
    lat: 31.6300, lng: -7.9780,
    description: "Un café culturel près de Bab Debbagh, connu pour son célèbre \"camel burger\" et sa programmation d'événements culturels (musique, conteurs, calligraphie).",
    whyVisit: "Un lieu culturel vivant qui mêle gastronomie fusion et initiatives artisanales locales.",
    littleTip: "Les soirées de conteurs traditionnels (hikayat), organisées régulièrement, perpétuent un art oral menacé de disparition.",
    indicativeDuration: "1h-1h30",
    indicativePrice: "$$",
  },
  {
    slug: "terrasse-des-epices",
    name: "Terrasse des Épices",
    zone: "souks",
    categories: ["restaurants", "bars-rooftops"],
    lat: 31.6295, lng: -7.9838,
    description: "Un restaurant sur plusieurs terrasses au cœur du souk Cherifia, mêlant cuisine marocaine et internationale dans un cadre design.",
    whyVisit: "Une pause déjeuner élégante en plein cœur des souks, avec plusieurs niveaux de terrasses ombragées.",
    littleTip: "Les terrasses supérieures, plus ombragées, sont préférables pour un déjeuner en pleine chaleur de journée.",
    indicativeDuration: "1h-1h30",
    indicativePrice: "$$",
  },
  {
    slug: "souk-siyyaghin",
    name: "Souk Siyyaghin (bijoutiers)",
    zone: "souks",
    categories: ["shopping", "marches"],
    lat: 31.6288, lng: -7.9858,
    description: "Le souk historique des bijoutiers et orfèvres de Marrakech, où se perpétuent des techniques de bijouterie berbère traditionnelle en argent.",
    whyVisit: "La meilleure adresse pour les bijoux berbères traditionnels en argent, directement auprès des artisans.",
    littleTip: "Les bijoux berbères anciens, parfois vendus par les familles elles-mêmes, ont souvent plus de valeur et d'authenticité que les reproductions neuves.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "souk-cherratine",
    name: "Souk Chouari (menuisiers)",
    zone: "souks",
    categories: ["marches", "experiences-insolites"],
    lat: 31.6305, lng: -7.9855,
    description: "Le souk des menuisiers et ébénistes, où se travaille encore le bois de thuya et de cèdre selon des techniques artisanales ancestrales.",
    whyVisit: "Voir travailler en direct des artisans du bois, un savoir-faire marocain traditionnel menacé par l'industrialisation.",
    littleTip: "L'odeur caractéristique du bois de thuya fraîchement travaillé guide souvent les visiteurs vers ce souk avant même de le voir.",
    indicativeDuration: "20-30 min",
  },

  // ---------- Palais & Jardins Historiques ----------
  {
    slug: "palais-bahia",
    name: "Palais Bahia",
    zone: "palais-jardins",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 31.6215, lng: -7.9830,
    description: "Un palais somptueux de la fin du XIXe siècle construit pour un grand vizir, avec plus de 150 pièces organisées autour de cours et jardins andalous.",
    whyVisit: "L'un des plus beaux exemples d'architecture palatiale marocaine, avec un niveau de décoration exceptionnel.",
    littleTip: "Le nom \"Bahia\" signifie \"la brillante\", en référence à l'épouse préférée du vizir à qui une grande partie du palais était dédiée.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "palais-el-badi",
    name: "Palais El Badi",
    zone: "palais-jardins",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 31.6178, lng: -7.9838,
    description: "Les ruines monumentales d'un palais du XVIe siècle, autrefois l'un des plus somptueux du monde islamique, aujourd'hui vastes cours en ruine peuplées de cigognes nichant sur les remparts.",
    whyVisit: "Un site spectaculaire de ruines monumentales, avec des cigognes sauvages nichant sur les murs en toute liberté.",
    littleTip: "Montez sur les remparts pour une vue d'ensemble sur les cours en ruine et observer de près les nids de cigognes.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "tombeaux-saadiens",
    name: "Tombeaux Saadiens",
    zone: "palais-jardins",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 31.6193, lng: -7.9870,
    description: "La nécropole royale de la dynastie saadienne du XVIe siècle, redécouverte seulement en 1917, avec la célèbre salle des Douze Colonnes en marbre de Carrare.",
    whyVisit: "L'un des monuments les plus somptueux et émouvants de Marrakech, longtemps oublié avant sa redécouverte.",
    littleTip: "Arrivez tôt à l'ouverture — l'espace est restreint et l'affluence rend la visite bien plus agréable en début de matinée.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "mellah-marrakech",
    name: "Mellah (ancien quartier juif)",
    zone: "palais-jardins",
    categories: ["quartiers-balades", "temples-patrimoine"],
    lat: 31.6195, lng: -7.9820,
    description: "L'ancien quartier juif de Marrakech, fondé au XVIe siècle, qui conserve encore son marché aux épices et ses synagogues historiques.",
    whyVisit: "Un pan méconnu de l'histoire multiculturelle de Marrakech, avec une ambiance de marché distincte du reste de la médina.",
    littleTip: "Le marché aux épices du Mellah reste nettement moins touristique et plus authentique que celui de Rahba Kedima.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "synagogue-lazama",
    name: "Synagogue Lazama",
    zone: "palais-jardins",
    categories: ["temples-patrimoine"],
    lat: 31.6198, lng: -7.9818,
    description: "La synagogue historique la plus importante du Mellah, fondée au XVIe siècle par des réfugiés juifs d'Espagne, toujours active aujourd'hui.",
    whyVisit: "Un témoignage vivant de la longue présence juive à Marrakech, toujours en activité après cinq siècles.",
    littleTip: "La petite communauté juive encore présente à Marrakech entretient la synagogue, ouverte aux visiteurs respectueux.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "dar-si-said-musee",
    name: "Dar Si Said (Musée des Arts et Traditions)",
    zone: "palais-jardins",
    categories: ["temples-patrimoine"],
    lat: 31.6245, lng: -7.9843,
    description: "Un palais du XIXe siècle transformé en musée des arts et traditions marocaines, avec une collection remarquable de tapis, bijoux et boiseries berbères.",
    whyVisit: "Une collection d'artisanat marocain traditionnel de grande qualité, dans un cadre palatial élégant.",
    littleTip: "La salle du plafond peint, au premier étage, compte parmi les plus beaux exemples de menuiserie décorative marocaine.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "place-ferblantiers",
    name: "Place des Ferblantiers",
    zone: "palais-jardins",
    categories: ["marches", "quartiers-balades"],
    lat: 31.6197, lng: -7.9820,
    description: "Une place animée où les ferblantiers fabriquent encore à la main des lanternes marocaines traditionnelles en métal ajouré.",
    whyVisit: "Voir fabriquer en direct les lanternes marocaines, artisanat emblématique vendu dans toute la médina.",
    littleTip: "Acheter directement aux ferblantiers de la place revient généralement moins cher que dans les boutiques touristiques des souks.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "kasbah-mosque",
    name: "Mosquée de la Kasbah",
    zone: "palais-jardins",
    categories: ["temples-patrimoine"],
    lat: 31.6182, lng: -7.9850,
    description: "Une mosquée almohade du XIIe siècle contemporaine de la Koutoubia, au cœur du quartier royal de la Kasbah, avec un minaret richement décoré.",
    whyVisit: "Un autre exemple remarquable d'architecture almohade, dans le quartier historique du pouvoir royal.",
    littleTip: "Le minaret, bien que plus petit que celui de la Koutoubia, présente des motifs décoratifs tout aussi raffinés.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "tanneries-marrakech",
    name: "Tanneries de Marrakech",
    zone: "palais-jardins",
    categories: ["experiences-insolites", "quartiers-balades"],
    lat: 31.6280, lng: -7.9760,
    description: "Un quartier artisanal où le cuir est encore traité et teint selon des méthodes traditionnelles séculaires, dans de grandes cuves à ciel ouvert.",
    whyVisit: "Une expérience sensorielle forte et authentique, témoin d'un artisanat traditionnel en voie de disparition.",
    littleTip: "On vous proposera souvent une branche de menthe à l'entrée pour atténuer l'odeur forte des cuves de tannage.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "musee-tiskiwin",
    name: "Musée Tiskiwin",
    zone: "palais-jardins",
    categories: ["temples-patrimoine"],
    lat: 31.6230, lng: -7.9850,
    description: "Un petit musée privé consacré aux cultures berbères du Maroc jusqu'au Mali, retraçant les anciennes routes caravanières transsahariennes à travers bijoux, tapis et costumes.",
    whyVisit: "Une collection intimiste et passionnante sur les liens culturels entre le Maroc et l'Afrique subsaharienne.",
    littleTip: "Le parcours du musée suit littéralement le tracé d'une route caravanière historique, de Marrakech à Tombouctou.",
    indicativeDuration: "45 min",
  },
  {
    slug: "dar-yacout",
    name: "Dar Yacout",
    zone: "palais-jardins",
    categories: ["restaurants", "temples-patrimoine"],
    lat: 31.6330, lng: -7.9870,
    description: "Un riad somptueux transformé en restaurant gastronomique, dont la terrasse sur les toits offre l'une des plus belles vues nocturnes sur la médina illuminée.",
    whyVisit: "Un dîner marocain traditionnel dans un cadre de palais somptueux, avec vue sur toute la médina.",
    littleTip: "Réservez une table en terrasse à l'avance pour profiter de la vue nocturne sur les toits illuminés de la médina.",
    indicativeDuration: "2h-2h30",
    indicativePrice: "$$$$",
  },

  // ---------- Gueliz & Ville Nouvelle ----------
  {
    slug: "avenue-mohammed-v-gueliz",
    name: "Avenue Mohammed V (Gueliz)",
    zone: "gueliz",
    categories: ["shopping", "quartiers-balades"],
    lat: 31.6350, lng: -8.0080,
    description: "L'artère principale du quartier moderne de Gueliz, bordée de boutiques internationales, cafés et restaurants, visage contemporain de Marrakech.",
    whyVisit: "Un contraste total avec la médina historique, pour voir le Marrakech moderne et cosmopolite.",
    littleTip: "C'est le meilleur quartier pour trouver des boutiques de mode marocaine contemporaine, loin de l'artisanat traditionnel des souks.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "marche-central-gueliz",
    name: "Marché Central de Gueliz",
    zone: "gueliz",
    categories: ["marches", "street-food"],
    lat: 31.6355, lng: -8.0075,
    description: "Un marché couvert de l'époque coloniale française, réputé pour ses étals de poisson frais et de produits plus difficiles à trouver dans la médina.",
    whyVisit: "Une alternative plus occidentale et moderne aux souks traditionnels, fréquentée par les habitants du quartier.",
    littleTip: "Le marché est particulièrement bon pour le poisson frais, rare ailleurs à Marrakech, ville sans accès direct à la mer.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "cathedrale-saints-martyrs",
    name: "Cathédrale des Saints-Martyrs",
    zone: "gueliz",
    categories: ["temples-patrimoine"],
    lat: 31.6330, lng: -8.0070,
    description: "Une église catholique construite durant le protectorat français dans les années 1920, témoin de l'architecture coloniale de Gueliz.",
    whyVisit: "Un témoignage architectural de la période du protectorat français, rare à Marrakech.",
    littleTip: "L'église reste active pour la petite communauté catholique de la ville, notamment des expatriés.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "comptoir-darna",
    name: "Comptoir Darna",
    zone: "gueliz",
    categories: ["restaurants", "bars-rooftops"],
    lat: 31.6295, lng: -8.0115,
    description: "Un restaurant-bar emblématique de Marrakech depuis les années 1990, mêlant cuisine marocaine et internationale avec spectacles de danse orientale en soirée.",
    whyVisit: "Une soirée festive typique du Marrakech moderne, entre gastronomie et spectacle.",
    littleTip: "Les spectacles de danse du ventre, en soirée, font partie intégrante de l'ambiance de l'établissement depuis des décennies.",
    indicativeDuration: "2h-2h30",
    indicativePrice: "$$$",
  },
  {
    slug: "theatre-royal-marrakech",
    name: "Théâtre Royal de Marrakech",
    zone: "gueliz",
    categories: ["temples-patrimoine"],
    lat: 31.6260, lng: -8.0000,
    description: "Un théâtre monumental construit en 2001, mêlant architecture contemporaine et éléments décoratifs marocains traditionnels, pour les grands spectacles culturels de la ville.",
    whyVisit: "Une architecture contemporaine marocaine impressionnante, pour un spectacle ou simplement l'admirer de l'extérieur.",
    littleTip: "Le dôme central, visible de loin, est devenu l'un des nouveaux symboles architecturaux du Marrakech moderne.",
    indicativeDuration: "20-30 min (extérieur)",
  },
  {
    slug: "place-16-novembre",
    name: "Place du 16 Novembre",
    zone: "gueliz",
    categories: ["quartiers-balades"],
    lat: 31.6350, lng: -8.0085,
    description: "Une place centrale de Gueliz, cœur administratif et commercial du quartier moderne, entourée de la poste principale et de grandes enseignes.",
    whyVisit: "Un bon point de repère pour s'orienter dans le quartier moderne de Gueliz.",
    littleTip: "C'est autour de cette place que se concentre la majorité des banques et bureaux de change de Gueliz.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "galerie-127",
    name: "Galerie 127",
    zone: "gueliz",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 31.6345, lng: -8.0075,
    description: "La première galerie dédiée exclusivement à la photographie au Maroc et en Afrique du Nord, qui expose des artistes marocains et internationaux.",
    whyVisit: "Une scène artistique contemporaine pointue, rare au Maroc, pour les passionnés de photographie.",
    littleTip: "Les expositions changent régulièrement et mettent souvent en lumière de jeunes photographes marocains émergents.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "rue-de-la-liberte-gueliz",
    name: "Rue de la Liberté",
    zone: "gueliz",
    categories: ["shopping", "quartiers-balades"],
    lat: 31.6340, lng: -8.0060,
    description: "Une rue élégante de Gueliz bordée de boutiques de créateurs marocains et de concept-stores de design contemporain.",
    whyVisit: "Le meilleur axe pour le design marocain contemporain, loin de l'artisanat traditionnel des souks.",
    littleTip: "Plusieurs boutiques de la rue proposent des pièces de créateurs marocains qui exportent aussi à l'international.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "macma-musee-art-culture",
    name: "MACMA (Musée d'Art et de Culture de Marrakech)",
    zone: "gueliz",
    categories: ["temples-patrimoine"],
    lat: 31.6338, lng: -8.0082,
    description: "Un musée privé consacré à l'art marocain du XXe siècle, avec des cartes anciennes et affiches touristiques retraçant l'image de Marrakech à travers l'histoire.",
    whyVisit: "Une perspective originale sur l'histoire visuelle et touristique de Marrakech depuis plus d'un siècle.",
    littleTip: "La collection de cartes et affiches touristiques anciennes offre un regard amusant sur l'évolution de l'image de la ville.",
    indicativeDuration: "45 min",
  },
  {
    slug: "david-bloch-gallery",
    name: "David Bloch Gallery",
    zone: "gueliz",
    categories: ["temples-patrimoine"],
    lat: 31.6340, lng: -8.0068,
    description: "Une galerie d'art contemporain reconnue de Gueliz, qui expose des artistes marocains et internationaux issus du street art et de l'art urbain.",
    whyVisit: "Une scène d'art urbain et contemporain dynamique, reflet du Marrakech créatif actuel.",
    littleTip: "La galerie organise régulièrement des vernissages ouverts au public, annoncés sur ses réseaux sociaux.",
    indicativeDuration: "30-45 min",
  },

  // ---------- Jardin Majorelle & Hivernage ----------
  {
    slug: "jardin-majorelle",
    name: "Jardin Majorelle",
    zone: "majorelle",
    categories: ["incontournables", "quartiers-balades"],
    lat: 31.6418, lng: -8.0030,
    description: "Un jardin botanique créé par le peintre Jacques Majorelle dans les années 1930, sauvé de l'abandon par Yves Saint Laurent, célèbre pour son bleu outremer intense (\"bleu Majorelle\").",
    whyVisit: "L'un des jardins les plus photographiés au monde, avec une collection de cactus et plantes exotiques exceptionnelle.",
    littleTip: "Réservez le billet en ligne à l'avance — les files d'attente sur place peuvent dépasser une heure en haute saison.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "musee-yves-saint-laurent-marrakech",
    name: "Musée Yves Saint Laurent Marrakech",
    zone: "majorelle",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 31.6423, lng: -8.0032,
    description: "Un musée contemporain dédié à l'œuvre du couturier, construit juste à côté du Jardin Majorelle qu'il contribua à sauver, avec plus de 5 000 pièces de sa collection.",
    whyVisit: "Une rétrospective complète de l'œuvre de Saint Laurent, dans un bâtiment architecturalement inspiré des tissages marocains.",
    littleTip: "Le billet combiné avec le Jardin Majorelle voisin permet de visiter les deux sites dans la même sortie.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "la-mamounia",
    name: "La Mamounia (hôtel & jardins)",
    zone: "majorelle",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 31.6210, lng: -7.9980,
    description: "L'hôtel le plus légendaire de Marrakech, ouvert en 1923 dans d'anciens jardins royaux du XVIIIe siècle, où séjournèrent Winston Churchill et de nombreuses célébrités.",
    whyVisit: "Un symbole absolu du luxe marocain, pour un thé dans les jardins même sans y séjourner.",
    littleTip: "Le salon de thé des jardins reste accessible aux non-résidents, pour découvrir le lieu sans le prix d'une nuitée.",
    indicativeDuration: "1h-1h30",
    indicativePrice: "$$$$",
  },
  {
    slug: "hivernage-quartier",
    name: "Hivernage",
    zone: "majorelle",
    categories: ["quartiers-balades", "bars-rooftops"],
    lat: 31.6230, lng: -8.0080,
    description: "Un quartier résidentiel verdoyant et élégant, concentrant de nombreux hôtels de luxe, restaurants et clubs huppés de Marrakech.",
    whyVisit: "Le quartier le plus chic de Marrakech pour une soirée élégante, entre restaurants gastronomiques et rooftops.",
    littleTip: "Beaucoup d'hôtels de luxe du quartier ouvrent leurs rooftops et piscines aux non-résidents moyennant un droit d'entrée.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "montresso-art-foundation",
    name: "Montresso Art Foundation",
    zone: "majorelle",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 31.6460, lng: -8.0150,
    description: "Un centre d'art contemporain privé en résidence d'artistes, avec un grand jardin de sculptures et des expositions d'art urbain international.",
    whyVisit: "Une scène d'art contemporain internationale surprenante en périphérie de Marrakech.",
    littleTip: "Les artistes en résidence créent souvent des œuvres monumentales visibles uniquement pendant leur séjour sur place.",
    indicativeDuration: "45 min-1h",
  },

  // ---------- Palmeraie ----------
  {
    slug: "la-palmeraie-marrakech",
    name: "La Palmeraie",
    zone: "palmeraie",
    categories: ["quartiers-balades", "points-de-vue"],
    lat: 31.6650, lng: -7.9700,
    description: "Une oasis de plus de 100 000 palmiers dattiers s'étendant au nord-est de Marrakech, plantée selon la légende à partir des noyaux de dattes jetés par les soldats d'Almoravide.",
    whyVisit: "Un contraste vert et paisible avec l'agitation de la médina, pour une balade ou un tour en calèche.",
    littleTip: "Louer un vélo ou un quad pour explorer la palmeraie reste plus agréable qu'une voiture, les pistes étant parfois étroites et sablonneuses.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "oasiria-water-park",
    name: "Oasiria",
    zone: "palmeraie",
    categories: ["activites-famille"],
    lat: 31.5740, lng: -8.0340,
    description: "Le plus grand parc aquatique de Marrakech, avec toboggans et piscines dans un cadre paysager, idéal pour échapper à la chaleur en famille.",
    whyVisit: "La meilleure option pour se rafraîchir en famille lors d'une chaude journée marrakchie.",
    littleTip: "Le parc propose une navette gratuite depuis plusieurs points de la ville — vérifiez les horaires avant de prévoir votre propre transport.",
    indicativeDuration: "3h-4h",
    indicativePrice: "$$",
  },
  {
    slug: "jardin-anima",
    name: "Jardin Anima",
    zone: "palmeraie",
    categories: ["quartiers-balades", "experiences-insolites"],
    lat: 31.7300, lng: -7.8000,
    description: "Un jardin botanique et artistique créé par l'artiste autrichien André Heller, mêlant plantes rares, sculptures contemporaines et bassins, en lisière de la palmeraie.",
    whyVisit: "Un jardin artistique singulier, moins connu que Majorelle mais tout aussi créatif, sur la route de l'Atlas.",
    littleTip: "Le jardin se combine facilement avec une excursion vers la vallée de l'Ourika, sur le même axe routier.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "dar-tounsi",
    name: "Dar Tounsi",
    zone: "palmeraie",
    categories: ["restaurants"],
    lat: 31.6600, lng: -7.9650,
    description: "Un restaurant élégant installé dans un riad traditionnel au cœur de la Palmeraie, réputé pour sa cuisine tuniso-marocaine raffinée.",
    whyVisit: "Un déjeuner ou dîner élégant dans un cadre paisible, loin de l'agitation de la médina.",
    littleTip: "La terrasse extérieure, entourée de palmiers, est particulièrement agréable pour un dîner en soirée fraîche.",
    indicativeDuration: "1h30-2h",
    indicativePrice: "$$$",
  },

  // ---------- Désert d'Agafay & Atlas (excursion) ----------
  {
    slug: "desert-agafay",
    name: "Désert d'Agafay",
    zone: "agafay-atlas",
    categories: ["incontournables", "experiences-insolites", "excursions"],
    lat: 31.4800, lng: -8.2300,
    description: "Un paysage de dunes rocheuses et de steppe aride à moins d'une heure de Marrakech, offrant une expérience désertique accessible sans le long trajet vers le Sahara.",
    whyVisit: "La façon la plus rapide de vivre une ambiance désertique depuis Marrakech, avec vue sur l'Atlas enneigé en hiver.",
    littleTip: "Un dîner sous les étoiles dans un camp de luxe, avec feu de camp et musique gnaoua, est l'expérience la plus prisée du site.",
    indicativeDuration: "demi-journée à soirée complète",
  },
  {
    slug: "vallee-ourika",
    name: "Vallée de l'Ourika",
    zone: "agafay-atlas",
    categories: ["incontournables", "excursions"],
    lat: 31.3200, lng: -7.8500,
    description: "Une vallée verdoyante au pied du Haut Atlas, parsemée de villages berbères, à environ une heure de route de Marrakech.",
    whyVisit: "L'excursion nature la plus accessible depuis Marrakech, avec un vrai dépaysement montagnard.",
    littleTip: "Les marchands ambulants le long de la route proposent souvent de bons prix sur les produits locaux (huile d'argan, miel) avant même d'arriver sur place.",
    indicativeDuration: "demi-journée à journée complète",
  },
  {
    slug: "cascades-setti-fatma",
    name: "Cascades de Setti Fatma",
    zone: "agafay-atlas",
    categories: ["incontournables", "activites-famille", "excursions"],
    lat: 31.2450, lng: -7.6950,
    description: "Une série de sept cascades dans la vallée de l'Ourika, accessibles par une randonnée à travers la forêt, avec baignade possible dans les bassins naturels.",
    whyVisit: "Une randonnée rafraîchissante et accessible, avec un vrai dépaysement montagnard depuis la chaleur de Marrakech.",
    littleTip: "Seule la première cascade est facilement accessible — atteindre les suivantes demande une marche plus sportive sur terrain glissant.",
    indicativeDuration: "2h-3h",
  },
  {
    slug: "village-berbere-asni",
    name: "Village berbère d'Asni",
    zone: "agafay-atlas",
    categories: ["quartiers-balades", "excursions"],
    lat: 31.1850, lng: -7.9150,
    description: "Un village berbère traditionnel au pied du Haut Atlas, porte d'entrée vers le massif du Toubkal, avec un marché hebdomadaire animé le samedi.",
    whyVisit: "Un aperçu authentique de la vie berbère montagnarde, loin des circuits touristiques organisés.",
    littleTip: "Le souk hebdomadaire du samedi est le meilleur moment pour voir le village dans toute son animation.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "imlil",
    name: "Imlil",
    zone: "agafay-atlas",
    categories: ["incontournables", "excursions"],
    lat: 31.1380, lng: -7.9170,
    description: "Un village de montagne à 1 740 mètres d'altitude, point de départ classique pour l'ascension du Jbel Toubkal, plus haut sommet d'Afrique du Nord.",
    whyVisit: "Le meilleur point de départ pour une randonnée en montagne depuis Marrakech, même sans gravir le Toubkal entier.",
    littleTip: "Même sans faire l'ascension complète du Toubkal (plusieurs jours), une simple marche autour d'Imlil offre déjà de superbes panoramas.",
    indicativeDuration: "demi-journée à plusieurs jours",
  },
  {
    slug: "tahanaout",
    name: "Tahanaout",
    zone: "agafay-atlas",
    categories: ["marches", "excursions"],
    lat: 31.3500, lng: -8.0200,
    description: "Une petite ville de marché sur la route de l'Atlas, réputée pour son grand souk hebdomadaire du mardi, l'un des plus authentiques de la région.",
    whyVisit: "Un marché régional authentique, fréquenté surtout par les habitants des villages environnants plutôt que par les touristes.",
    littleTip: "Le souk du mardi matin est le meilleur moment pour vivre l'ambiance commerçante typique de cette ville de passage.",
    indicativeDuration: "45 min-1h",
  },

  // ---------- Aéroport ----------
  {
    slug: "aeroport-marrakech-menara",
    name: "Aéroport Marrakech-Ménara",
    zone: "aeroport",
    categories: [],
    lat: 31.6069, lng: -8.0363,
    description: "L'aéroport international de Marrakech, à environ 6 km au sud-ouest du centre-ville, l'un des plus fréquentés du Maroc.",
    whyVisit: "Repère pratique pour organiser son arrivée ou son départ de Marrakech.",
    littleTip: "L'aéroport est si proche du centre qu'un petit taxi suffit généralement, en 15-20 minutes — négociez le prix avant de monter, le compteur n'étant pas toujours utilisé.",
  },
];

const ZONE_DEFS = [
  {
    slug: "medina",
    name: "Médina & Jemaa el-Fna",
    mapColor: "#a8422c",
    vibeText: "Le cœur historique et vivant de Marrakech, entre la place la plus animée d'Afrique du Nord, la Koutoubia et des palais secrets cachés derrière des murs anonymes.",
    prosText: "La plus forte concentration de patrimoine et d'animation, cœur battant de la vie marrakchie.",
    consText: "Très dense et parfois bruyant, surtout autour de la Jemaa el-Fna en soirée.",
    transportText: "Quartier essentiellement piéton ; calèches et petits taxis disponibles aux abords de la médina.",
    nearbyText: "Les souks se rejoignent directement à pied depuis la Jemaa el-Fna.",
    profileFitText: "Incontournable pour tout premier séjour à Marrakech.",
    hotelAdviceText: "De nombreux riads traditionnels offrent une immersion authentique, à quelques pas de l'animation de la place.",
  },
  {
    slug: "souks",
    name: "Souks",
    mapColor: "#c9972e",
    vibeText: "Le dédale commerçant le plus dense de Marrakech, entre teinturiers, bijoutiers, menuisiers et épiciers perpétuant des savoir-faire séculaires.",
    prosText: "Artisanat authentique exceptionnel, ambiance sensorielle unique, prix négociables.",
    consText: "Facile de s'y perdre — gardez un plan ou une localisation active sur votre téléphone.",
    transportText: "Quartier entièrement piéton, accessible à pied depuis la Jemaa el-Fna.",
    nearbyText: "Le quartier des palais se rejoint à pied en 10-15 minutes vers le sud.",
    profileFitText: "Pour l'artisanat marocain authentique et l'art du marchandage.",
    hotelAdviceText: "Quelques riads nichés directement dans les souks offrent une immersion totale dans l'ambiance commerçante.",
  },
  {
    slug: "palais-jardins",
    name: "Palais & Jardins Historiques",
    mapColor: "#2e86ab",
    vibeText: "Le quartier royal de Marrakech, entre palais somptueux, nécropole royale redécouverte et ancien quartier juif historique.",
    prosText: "Patrimoine palatial exceptionnel, ambiance plus paisible que les souks voisins.",
    consText: "Les sites sont assez dispersés, nécessitant un peu de marche ou un petit taxi entre chacun.",
    transportText: "Petits taxis ou calèches recommandés pour relier les différents palais entre eux.",
    nearbyText: "La médina et les souks se rejoignent à pied en 10-15 minutes vers le nord.",
    profileFitText: "Pour le patrimoine royal et une immersion dans l'histoire multiculturelle de Marrakech.",
    hotelAdviceText: "Quartier paisible avec quelques riads de charme, à distance de marche raisonnable de la Jemaa el-Fna.",
  },
  {
    slug: "gueliz",
    name: "Gueliz & Ville Nouvelle",
    mapColor: "#d6479a",
    vibeText: "Le Marrakech moderne et cosmopolite hérité du protectorat français, entre boutiques de design, galeries d'art contemporain et vie nocturne élégante.",
    prosText: "Shopping contemporain de qualité, excellente scène de restaurants et bars, architecture coloniale intéressante.",
    consText: "Moins de patrimoine historique que la médina — davantage une immersion dans le Marrakech du quotidien.",
    transportText: "Petits taxis facilement disponibles entre Gueliz et la médina, trajet d'environ 15-20 minutes.",
    nearbyText: "Le Jardin Majorelle se rejoint à pied en 15-20 minutes vers le nord.",
    profileFitText: "Pour le shopping contemporain et une vie nocturne élégante loin de la médina.",
    hotelAdviceText: "Quartier moderne avec de bons hôtels d'affaires, pratique pour qui veut un confort plus occidental.",
  },
  {
    slug: "majorelle",
    name: "Jardin Majorelle & Hivernage",
    mapColor: "#8f2d2d",
    vibeText: "Le Marrakech élégant et artistique, entre le jardin le plus photographié de la ville et les hôtels de luxe légendaires du quartier Hivernage.",
    prosText: "Patrimoine artistique exceptionnel, quartiers verdoyants et paisibles, hôtellerie de luxe.",
    consText: "Le Jardin Majorelle est très fréquenté — réservez impérativement en ligne à l'avance.",
    transportText: "Petits taxis depuis la médina, trajet d'environ 15 minutes selon la circulation.",
    nearbyText: "Gueliz se rejoint à pied en 15-20 minutes vers le sud.",
    profileFitText: "Pour l'héritage artistique de Jacques Majorelle et Yves Saint Laurent, et une ambiance de luxe élégante.",
    hotelAdviceText: "Quartier élégant avec certains des meilleurs hôtels de la ville, dans un cadre verdoyant et paisible.",
  },
  {
    slug: "palmeraie",
    name: "Palmeraie",
    mapColor: "#3f8c5a",
    vibeText: "L'oasis verte aux portes de Marrakech, plantée de plus de 100 000 palmiers, entre balades tranquilles et parc aquatique familial.",
    prosText: "Cadre vert et paisible, bonne option de détente pour les familles.",
    consText: "Nécessite une voiture ou un taxi, les distances entre les sites étant importantes dans l'oasis.",
    transportText: "Voiture ou taxi recommandé ; vélo et quad disponibles à la location sur place.",
    nearbyText: "Le Jardin Majorelle se rejoint en 15-20 minutes en voiture vers le sud-ouest.",
    profileFitText: "Pour une pause détente en famille, loin de l'agitation de la médina.",
    hotelAdviceText: "Plusieurs resorts de luxe avec golf et spa sont installés dans la Palmeraie, pour un séjour plus tranquille.",
  },
  {
    slug: "agafay-atlas",
    name: "Désert d'Agafay & Atlas (excursion)",
    mapColor: "#2a7a8c",
    vibeText: "Deux excursions classiques aux portes de Marrakech : les dunes rocheuses du désert d'Agafay, et les villages berbères verdoyants du Haut Atlas.",
    prosText: "Paysages spectaculaires et contrastés, excursions accessibles en une demi-journée ou une journée complète.",
    consText: "Nécessite une voiture ou une excursion organisée, les sites étant éloignés de Marrakech.",
    transportText: "Voiture de location ou excursion organisée avec chauffeur, départ généralement du centre de Marrakech.",
    nearbyText: "La vallée de l'Ourika et le désert d'Agafay se visitent séparément, chacun sur une demi-journée à une journée.",
    profileFitText: "Pour les amateurs de paysages désertiques et montagnards, en complément de la visite de la ville.",
    hotelAdviceText: "Des camps de luxe dans le désert d'Agafay et des gîtes de montagne à Imlil permettent de prolonger l'excursion sur une nuit.",
  },
  {
    slug: "aeroport",
    name: "Aéroport",
    mapColor: "#888888",
    vibeText: "L'aéroport international de Marrakech, repéré sur la carte pour organiser facilement son arrivée ou son départ.",
    prosText: "Utile pour visualiser la distance et l'orientation par rapport au centre-ville avant de réserver un transfert.",
    consText: "N'est pas un lieu à visiter — purement un repère pratique.",
    transportText: "Petit taxi (négocier le prix à l'avance) ou navette d'hôtel directement jusqu'au centre.",
    nearbyText: "Gueliz et la Médina sont les deux points d'arrivée les plus pratiques depuis l'aéroport.",
    profileFitText: "Repère pratique pour tous les profils de voyage.",
    hotelAdviceText: "Aucun hébergement recommandé à proximité directe de l'aéroport — mieux vaut loger en médina ou à Gueliz.",
  },
];

async function main() {
  console.log("Seeding Marrakech destination…");

  const maroc = await prisma.country.upsert({
    where: { slug: "maroc" },
    update: {},
    create: { slug: "maroc", name: "Maroc" },
  });

  const marrakech = await prisma.destination.upsert({
    where: { slug: "marrakech" },
    update: { status: "PUBLISHED" },
    create: {
      countryId: maroc.id,
      slug: "marrakech",
      name: "Marrakech",
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
    "marches", "shopping", "excursions", "bien-etre-spas", "points-de-vue",
  ];
  await prisma.destination.update({
    where: { id: marrakech.id },
    data: {
      categories: {
        set: ENABLED_CATEGORIES.map((slug) => ({ id: categoryBySlug.get(slug)!.id })),
      },
    },
  });

  const zoneBySlug = new Map<string, { id: string }>();
  for (const z of ZONE_DEFS) {
    const zone = await prisma.zone.upsert({
      where: { destinationId_slug: { destinationId: marrakech.id, slug: z.slug } },
      update: {
        name: z.name, mapColor: z.mapColor, vibeText: z.vibeText, prosText: z.prosText,
        consText: z.consText, transportText: z.transportText, nearbyText: z.nearbyText,
        profileFitText: z.profileFitText, hotelAdviceText: z.hotelAdviceText,
      },
      create: { destinationId: marrakech.id, ...z },
    });
    zoneBySlug.set(z.slug, zone);
  }

  let manifest: PhotoManifestEntry[] = [];
  try {
    manifest = JSON.parse(
      await readFile(
        "/private/tmp/claude-501/-Users-constance/f6c42bbe-3c4a-4229-b982-d00b14542e1b/scratchpad/photos_marrakech/manifest.json",
        "utf-8"
      )
    );
  } catch {
    console.log("No photo manifest found yet — seeding without photos.");
  }

  // Final accepted photos live in seed-assets/marrakech-photos/<slug>.jpg
  // (resized, false positives already excluded) — same pattern as every
  // other destination this session. The Dockerfile bakes this folder
  // into storage/photos at build time.
  const PHOTOS_DIR = "seed-assets/marrakech-photos";

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
        name: def.name, destinationId: marrakech.id, zoneId: zone?.id, status: "PUBLISHED",
        lat: def.lat, lng: def.lng, description: def.description, whyVisit: def.whyVisit,
        littleTip: def.littleTip, indicativeDuration: def.indicativeDuration,
        indicativePrice: def.indicativePrice, isFictionalDemo: false,
      },
      create: {
        slug: def.slug, destinationId: marrakech.id, zoneId: zone?.id, name: def.name,
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

  console.log(`Marrakech seed complete: ${PLACES.length} places, ${photoCount} with real photos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
