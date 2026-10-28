/**
 * Split — second Croatia destination, built from the admin "Nouvelle
 * destination" request queue (destinationRequest id for "split et
 * alentour — croatie"): "pareil que pour le sud" — same scope and
 * treatment as the Dubrovnik destination (seed-dubrovnik.ts): Split
 * itself plus the real day-trip islands and towns of central Dalmatia
 * around it (Trogir, Salona, Hvar, Brač, Vis, Krka). Same pattern as
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
const GOOD_KEYS = new Set<string>([
  "blaca-hermitage",
  "cathedral-st-domnius",
  "hvar-lavender-fields",
  "hvar-town",
  "jelsa-hvar",
  "kamerlengo-fortress",
  "komiza",
  "marjan-hill",
  "mestrovic-gallery",
  "pakleni-islands",
  "poljud-stadium",
  "roski-slap",
  "skradinski-buk",
  "stari-grad-plain",
  "statue-gregory-of-nin",
  "temple-of-jupiter-split",
  "trogir-riva",
  "vis-town",
  "zlatni-rat",
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
  indicativePrice?: string;
  altText?: string;
};

const PLACES: PlaceDef[] = [
  // ---------- Vieille ville de Split (Palais de Dioclétien) ----------
  {
    slug: "diocletians-palace",
    name: "Palais de Dioclétien",
    zone: "split-old-town",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 43.5081, lng: 16.4402,
    description: "Un palais-forteresse romain du IVe siècle construit pour la retraite de l'empereur Dioclétien, si vaste qu'il est devenu le cœur habité de Split, mêlant ruines antiques, commerces et logements.",
    whyVisit: "L'un des monuments romains les mieux préservés au monde, encore habité et vivant 1 700 ans après sa construction.",
    littleTip: "Contrairement à la plupart des sites antiques, le palais n'est pas un musée figé — des gens y vivent et y travaillent réellement.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "peristyle-split",
    name: "Péristyle",
    zone: "split-old-town",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 43.5083, lng: 16.4402,
    description: "La place centrale à ciel ouvert du palais de Dioclétien, bordée de colonnes de granit égyptien, qui servait de cour cérémonielle à l'empereur.",
    whyVisit: "Le cœur monumental du palais, où se mêlent colonnes antiques, concerts de rue et terrasses de café.",
    littleTip: "Des chanteurs de klapa (polyphonie traditionnelle dalmate) s'y produisent parfois spontanément en soirée.",
    indicativeDuration: "30 min",
  },
  {
    slug: "cathedral-st-domnius",
    name: "Cathédrale Saint-Domnius",
    zone: "split-old-town",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 43.5084, lng: 16.4404,
    description: "L'ancien mausolée de l'empereur Dioclétien, transformé en cathédrale au VIIe siècle — ce qui en fait, paradoxalement, le plus ancien édifice catholique du monde encore utilisé dans sa structure d'origine.",
    whyVisit: "Un mausolée païen devenu cathédrale, avec un campanile roman que l'on peut gravir pour une vue sur toute la vieille ville.",
    littleTip: "La montée au campanile se fait par un escalier métallique assez raide et ouvert — déconseillé en cas de vertige.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "temple-of-jupiter-split",
    name: "Temple de Jupiter",
    zone: "split-old-town",
    categories: ["temples-patrimoine"],
    lat: 43.5078, lng: 16.4397,
    description: "Un petit temple romain du Ier siècle, remarquablement conservé, transformé en baptistère au Moyen Âge, avec un plafond à caissons antique toujours en place.",
    whyVisit: "L'un des temples romains les mieux préservés d'Europe, à quelques pas seulement du Péristyle.",
    littleTip: "Le sphinx égyptien noir devant l'entrée faisait partie du butin ramené d'Égypte par Dioclétien lui-même.",
    indicativeDuration: "20 min",
  },
  {
    slug: "golden-gate-split",
    name: "Porte d'Or",
    zone: "split-old-town",
    categories: ["temples-patrimoine"],
    lat: 43.5094, lng: 16.4402,
    description: "La porte monumentale nord du palais, la plus ornée des quatre, par laquelle l'empereur Dioclétien faisait autrefois son entrée officielle.",
    whyVisit: "La plus impressionnante des quatre portes antiques du palais, juste à côté de la statue de Grégoire de Nin.",
    littleTip: "C'est devant cette porte que se trouve la statue géante de Grégoire de Nin, dont on frotte traditionnellement le gros orteil porte-bonheur.",
    indicativeDuration: "15 min",
  },
  {
    slug: "statue-gregory-of-nin",
    name: "Statue de Grégoire de Nin",
    zone: "split-old-town",
    categories: ["incontournables", "experiences-insolites"],
    lat: 43.5096, lng: 16.4390,
    description: "Une statue monumentale en bronze de l'évêque médiéval Grégoire de Nin, œuvre du sculpteur Ivan Meštrović, dont le gros orteil poli brille après avoir été frotté par des millions de visiteurs.",
    whyVisit: "Un rituel porte-bonheur local devenu incontournable : frotter le gros orteil de la statue pour que vos vœux se réalisent.",
    littleTip: "Le gros orteil, nettement plus doré et poli que le reste de la statue, trahit immédiatement où frotter.",
    indicativeDuration: "10 min",
  },
  {
    slug: "silver-gate-split",
    name: "Porte d'Argent",
    zone: "split-old-town",
    categories: ["temples-patrimoine", "marches"],
    lat: 43.5081, lng: 16.4420,
    description: "La porte est du palais, qui donne directement accès au marché Pazar, le marché aux fruits et légumes le plus animé de Split.",
    whyVisit: "Une porte antique qui mène directement à l'un des marchés les plus authentiques de la ville.",
    littleTip: "Le marché Pazar, juste derrière la porte, est le meilleur endroit pour acheter des fruits locaux à prix justes.",
    indicativeDuration: "15 min",
  },
  {
    slug: "bronze-gate-split",
    name: "Porte de Bronze",
    zone: "split-old-town",
    categories: ["temples-patrimoine", "points-de-vue"],
    lat: 43.5069, lng: 16.4403,
    description: "La porte sud du palais, qui s'ouvrait autrefois directement sur la mer et servait d'accès privé pour l'empereur depuis son bateau.",
    whyVisit: "La porte la plus proche de la Riva, par laquelle on accède aux impressionnantes substructures souterraines du palais.",
    littleTip: "À l'époque romaine, la mer arrivait quasiment jusqu'à cette porte — le rivage s'est depuis éloigné de plusieurs dizaines de mètres.",
    indicativeDuration: "15 min",
  },
  {
    slug: "iron-gate-split",
    name: "Porte de Fer",
    zone: "split-old-town",
    categories: ["temples-patrimoine", "quartiers-balades"],
    lat: 43.5081, lng: 16.4385,
    description: "La porte ouest du palais, la seule des quatre portes antiques restée en usage continu depuis l'époque romaine, menant directement à la place du Peuple médiévale.",
    whyVisit: "Le lien direct entre le palais romain et la ville médiévale qui s'est développée juste à l'extérieur de ses murs.",
    littleTip: "Une petite chapelle romane du XIe siècle, Notre-Dame-du-Clocher, est nichée directement dans l'épaisseur de la porte.",
    indicativeDuration: "15 min",
  },
  {
    slug: "split-synagogue",
    name: "Synagogue de Split",
    zone: "split-old-town",
    categories: ["temples-patrimoine"],
    lat: 43.5085, lng: 16.4399,
    description: "L'une des trois plus anciennes synagogues d'Europe encore en activité, installée depuis le XVIe siècle dans deux maisons médiévales à l'intérieur même du palais de Dioclétien.",
    whyVisit: "Un témoignage rare de la présence juive séculaire à Split, dans un cadre architectural unique mêlé au palais romain.",
    littleTip: "La communauté juive de Split s'est installée directement dans la structure du palais romain dès le Moyen Âge, un cas unique en Europe.",
    indicativeDuration: "30 min",
  },
  {
    slug: "prokurative-split",
    name: "Prokurative (place de la République)",
    zone: "split-old-town",
    categories: ["incontournables", "quartiers-balades"],
    lat: 43.5063, lng: 16.4374,
    description: "Une place néo-Renaissance du XIXe siècle inspirée de la place Saint-Marc à Venise, bordée d'arcades et devenue le principal lieu de rassemblement de Split.",
    whyVisit: "La place la plus photogénique de Split en dehors du palais lui-même, animée de concerts et marchés de Noël en saison.",
    littleTip: "Les arcades abritent plusieurs cafés historiques, parfaits pour observer la vie locale loin du palais.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "diocletians-substructures",
    name: "Substructures du palais (caves)",
    zone: "split-old-town",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 43.5076, lng: 16.4401,
    description: "Les vastes salles souterraines qui soutenaient autrefois les appartements impériaux, remarquablement conservées car utilisées comme dépotoir pendant des siècles avant d'être fouillées.",
    whyVisit: "L'une des meilleures façons de visualiser l'ampleur réelle du palais romain, et un décor de tournage pour Game of Thrones.",
    littleTip: "Ces salles ont servi de décor aux donjons de Meereen dans Game of Thrones, où étaient enfermés les dragons de Daenerys.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "riva-split",
    name: "Riva",
    zone: "split-old-town",
    categories: ["incontournables", "quartiers-balades"],
    lat: 43.5074, lng: 16.4390,
    description: "La promenade palmée en bord de mer de Split, bordée de cafés, qui longe la façade sud du palais de Dioclétien face au port.",
    whyVisit: "Le meilleur endroit pour observer la vie locale, un café à la main, face aux ferries qui partent vers les îles.",
    littleTip: "Le soir, la Riva s'anime particulièrement avec les habitants qui viennent s'y promener (le rituel local du « korzo »).",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "split-city-museum",
    name: "Musée de la ville de Split",
    zone: "split-old-town",
    categories: ["temples-patrimoine"],
    lat: 43.5088, lng: 16.4411,
    description: "Un musée installé dans un palais gothique-renaissance, qui retrace l'histoire de Split depuis l'époque romaine jusqu'au XXe siècle.",
    whyVisit: "Un bon complément historique pour comprendre comment la ville s'est développée à l'intérieur et autour du palais romain.",
    littleTip: "Le bâtiment lui-même, l'ancien palais Papalić, vaut le détour autant que les collections qu'il abrite.",
    indicativeDuration: "1h",
  },
  {
    slug: "ethnographic-museum-split",
    name: "Musée ethnographique de Split",
    zone: "split-old-town",
    categories: ["temples-patrimoine"],
    lat: 43.5083, lng: 16.4408,
    description: "Un musée consacré aux costumes traditionnels, à l'artisanat et aux coutumes populaires de Dalmatie, installé dans l'ancien hôtel de ville du palais.",
    whyVisit: "Un aperçu de la culture traditionnelle dalmate, loin de l'héritage strictement romain du reste du palais.",
    littleTip: "La terrasse sur le toit du musée offre une vue intéressante sur le Péristyle, rarement fréquentée par les visiteurs.",
    indicativeDuration: "45 min",
  },
  {
    slug: "fruit-square-split",
    name: "Voćni trg (Place aux Fruits)",
    zone: "split-old-town",
    categories: ["quartiers-balades"],
    lat: 43.5087, lng: 16.4415,
    description: "Une petite place animée à l'extérieur du palais, dominée par une tour vénitienne du XVe siècle, bordée de cafés et bars populaires le soir.",
    whyVisit: "Une place plus décontractée et locale que le Péristyle, idéale pour un verre en soirée.",
    littleTip: "La tour vénitienne qui domine la place date de l'époque où Split appartenait à la République de Venise.",
    indicativeDuration: "30 min",
  },
  {
    slug: "peoples-square-split",
    name: "Narodni trg (Place du Peuple)",
    zone: "split-old-town",
    categories: ["quartiers-balades", "temples-patrimoine"],
    lat: 43.5077, lng: 16.4393,
    description: "La place centrale médiévale de Split, en dehors des murs du palais, bordée de l'ancien hôtel de ville gothique du XVe siècle.",
    whyVisit: "Le centre de la ville médiévale qui s'est développée autour du palais romain, avec une ambiance plus locale.",
    littleTip: "C'est ici, et non au Péristyle, que se concentre la vie quotidienne des habitants de Split.",
    indicativeDuration: "20 à 30 min",
  },
  {
    slug: "split-fish-market",
    name: "Marché aux poissons de Split",
    zone: "split-old-town",
    categories: ["marches", "street-food"],
    lat: 43.5090, lng: 16.4382,
    description: "Un marché couvert où se vend chaque matin le poisson frais pêché dans l'Adriatique, réputé pour son absence totale d'odeur grâce à un microclimat local unique.",
    whyVisit: "Une tradition locale vivante et une curiosité scientifique : ce marché ne sent quasiment jamais le poisson, même en été.",
    littleTip: "Les locaux expliquent ce phénomène par les émanations naturelles de soufre d'une source thermale voisine, qui repousseraient les mouches.",
    indicativeDuration: "30 min (tôt le matin)",
  },
  {
    slug: "pazar-market-split",
    name: "Pazar (marché vert)",
    zone: "split-old-town",
    categories: ["marches", "street-food"],
    lat: 43.5090, lng: 16.4420,
    description: "Le marché aux fruits et légumes en plein air de Split, juste derrière la Porte d'Argent, animé chaque matin par les producteurs locaux.",
    whyVisit: "Le meilleur endroit pour acheter des fruits de saison et sentir le rythme de vie quotidien des habitants de Split.",
    littleTip: "Les meilleurs produits et les prix les plus justes se trouvent tôt le matin, avant l'arrivée des groupes de touristes.",
    indicativeDuration: "30 à 45 min",
  },

  // ---------- Split hors les murs ----------
  {
    slug: "marjan-hill",
    name: "Colline de Marjan",
    zone: "split-beyond-walls",
    categories: ["incontournables", "quartiers-balades"],
    lat: 43.5106, lng: 16.4215,
    description: "Une colline boisée de pins surplombant toute la péninsule de Split, sillonnée de sentiers de randonnée et parsemée de petites chapelles médiévales.",
    whyVisit: "Le « poumon vert » de Split, surnommé localement le « paradis des habitants », avec une vue imprenable sur la ville et les îles.",
    littleTip: "Le point de vue de Telegrin, au sommet, offre l'une des meilleures vues de toute la Dalmatie sur un coucher de soleil.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "bacvice-beach",
    name: "Plage de Bačvice",
    zone: "split-beyond-walls",
    categories: ["incontournables", "quartiers-balades"],
    lat: 43.5048, lng: 16.4475,
    description: "La plage de sable urbaine la plus populaire de Split, berceau du picigin, un jeu de balle traditionnel local joué dans l'eau peu profonde.",
    whyVisit: "La plage la plus animée et la plus accessible à pied depuis la vieille ville, avec une vraie ambiance locale.",
    littleTip: "Observez ou essayez le picigin : garder une petite balle en l'air en plongeant dans l'eau peu profonde, un sport né ici au début du XXe siècle.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "mestrovic-gallery",
    name: "Galerie Meštrović",
    zone: "split-beyond-walls",
    categories: ["temples-patrimoine"],
    lat: 43.5096, lng: 16.4157,
    description: "La résidence et atelier que le sculpteur Ivan Meštrović, le plus grand artiste croate du XXe siècle, s'est fait construire pour exposer ses œuvres.",
    whyVisit: "La plus importante collection au monde d'œuvres de Meštrović, dans un cadre de villa et jardins méditerranéens.",
    littleTip: "Le billet combiné avec le Kaštelet voisin, qui abrite son cycle de bas-reliefs religieux, est économique.",
    indicativeDuration: "1h30",
  },
  {
    slug: "kastelet-mestrovic",
    name: "Kaštelet",
    zone: "split-beyond-walls",
    categories: ["temples-patrimoine"],
    lat: 43.5090, lng: 16.4150,
    description: "Une petite chapelle fortifiée du XVIe siècle acquise et restaurée par Ivan Meštrović, qui y a installé un cycle monumental de bas-reliefs en bois sur la vie du Christ.",
    whyVisit: "L'une des œuvres les plus personnelles et spirituelles de Meštrović, dans un cadre intime.",
    littleTip: "Les bas-reliefs en noyer, sculptés sur près de trois décennies, comptent parmi les chefs-d'œuvre méconnus de l'artiste.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "poljud-stadium",
    name: "Stade Poljud",
    zone: "split-beyond-walls",
    categories: ["experiences-insolites"],
    lat: 43.5208, lng: 16.4364,
    description: "Le stade du Hajduk Split, l'un des clubs de football les plus populaires et passionnément soutenus de Croatie, à l'architecture en forme de coquillage.",
    whyVisit: "Assister à un match du Hajduk Split, c'est vivre l'une des ferveurs sportives les plus intenses d'Europe.",
    littleTip: "Le chant des supporters du Hajduk, repris en chœur par tout le stade, est réputé comme l'un des plus impressionnants du football européen.",
    indicativeDuration: "2h (match)",
  },
  {
    slug: "split-archaeological-museum",
    name: "Musée archéologique de Split",
    zone: "split-beyond-walls",
    categories: ["temples-patrimoine"],
    lat: 43.5116, lng: 16.4453,
    description: "Le plus ancien musée de Croatie, fondé en 1820, avec la plus importante collection d'antiquités romaines du pays provenant notamment de Salona voisine.",
    whyVisit: "Le meilleur complément pour comprendre l'histoire romaine de Split et de la proche cité antique de Salona.",
    littleTip: "Le jardin lapidaire extérieur, gratuit d'accès, expose déjà de nombreuses stèles et sarcophages romains.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "sustipan-park",
    name: "Parc Sustipan",
    zone: "split-beyond-walls",
    categories: ["quartiers-balades", "points-de-vue"],
    lat: 43.5063, lng: 16.4318,
    description: "Un petit parc sur un promontoire à l'entrée du port de Split, ancien cimetière de la ville devenu un jardin paisible planté de pins et d'agaves.",
    whyVisit: "Un point de vue gratuit et méconnu sur le port et la ville, loin de la foule de la Riva.",
    littleTip: "Le coucher de soleil depuis la pointe du parc, face à l'ouest sur la mer, est l'un des plus beaux de Split.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "znjan-beach",
    name: "Plage de Žnjan",
    zone: "split-beyond-walls",
    categories: ["quartiers-balades"],
    lat: 43.5111, lng: 16.4654,
    description: "Une longue plage de béton et de galets à l'est de Split, bordée de bars de plage et de terrains de beach-volley, prisée des habitants plus que des touristes.",
    whyVisit: "Une plage plus spacieuse et plus locale que Bačvice, avec une bonne ambiance de bars de plage en soirée.",
    littleTip: "Les bars de plage y organisent souvent des soirées DJ en été, une bonne alternative aux clubs du centre.",
    indicativeDuration: "2h à 3h",
  },

  // ---------- Trogir ----------
  {
    slug: "trogir-old-town",
    name: "Vieille ville de Trogir",
    zone: "trogir",
    categories: ["incontournables", "quartiers-balades"],
    lat: 43.5147, lng: 16.2517,
    description: "Une ville médiévale entière bâtie sur une petite île reliée au continent par un pont, classée à l'UNESCO pour la densité exceptionnelle de son patrimoine roman et gothique.",
    whyVisit: "L'un des ensembles urbains médiévaux les mieux préservés d'Europe centrale, à seulement 30 minutes de Split.",
    littleTip: "Trogir se visite idéalement en fin de journée, en excursion depuis Split, pour profiter de la lumière dorée sur la pierre.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "trogir-cathedral",
    name: "Cathédrale Saint-Laurent de Trogir",
    zone: "trogir",
    categories: ["temples-patrimoine"],
    lat: 43.5150, lng: 16.2514,
    description: "Une cathédrale romane-gothique du XIIIe siècle, réputée pour son portail principal richement sculpté par le maître Radovan, chef-d'œuvre de la sculpture médiévale croate.",
    whyVisit: "Le portail de Radovan est considéré comme l'une des plus belles œuvres de sculpture romane des Balkans.",
    littleTip: "Le clocher se grimpe pour une vue sur les toits de la vieille ville, par un escalier étroit et raide.",
    indicativeDuration: "45 min",
  },
  {
    slug: "kamerlengo-fortress",
    name: "Forteresse de Kamerlengo",
    zone: "trogir",
    categories: ["temples-patrimoine", "points-de-vue"],
    lat: 43.5133, lng: 16.2481,
    description: "Une forteresse vénitienne du XVe siècle à la pointe ouest de l'île de Trogir, qui accueille aujourd'hui des concerts et projections en plein air l'été.",
    whyVisit: "Le meilleur point de vue sur Trogir et la mer environnante, dans une forteresse encore très bien conservée.",
    littleTip: "Vérifiez la programmation estivale — la forteresse se transforme régulièrement en cinéma ou salle de concert à ciel ouvert.",
    indicativeDuration: "45 min",
  },
  {
    slug: "trogir-riva",
    name: "Riva de Trogir",
    zone: "trogir",
    categories: ["quartiers-balades", "restaurants"],
    lat: 43.5146, lng: 16.2528,
    description: "La promenade en bord de mer de Trogir, bordée de restaurants de poisson et de yachts amarrés, face au canal séparant la vieille ville du continent.",
    whyVisit: "Un cadre maritime charmant pour un déjeuner de poisson après la visite de la vieille ville.",
    littleTip: "La terrasse en fin d'après-midi, avec le soleil sur la pierre dorée des façades, est particulièrement agréable.",
    indicativeDuration: "1h",
  },

  // ---------- Salone ----------
  {
    slug: "salona-archaeological-park",
    name: "Parc archéologique de Salone",
    zone: "salona",
    categories: ["temples-patrimoine", "incontournables"],
    lat: 43.5389, lng: 16.4867,
    description: "Les ruines de l'ancienne capitale de la province romaine de Dalmatie, qui comptait 60 000 habitants avant d'être abandonnée au VIIe siècle — ses survivants ont fondé Split dans le palais voisin de Dioclétien.",
    whyVisit: "Le plus grand site archéologique romain de Croatie, et le véritable point de départ de l'histoire de Split.",
    littleTip: "L'amphithéâtre et les thermes, bien que partiellement ruinés, donnent une idée précise de l'ampleur de l'ancienne capitale provinciale.",
    indicativeDuration: "1h30 à 2h",
  },

  // ---------- Hvar ----------
  {
    slug: "hvar-town",
    name: "Ville de Hvar",
    zone: "hvar",
    categories: ["incontournables", "quartiers-balades"],
    lat: 43.1729, lng: 16.4414,
    description: "La ville la plus glamour des îles croates, entre place principale médiévale, yachts de luxe au port et ruelles de pierre grimpant vers la forteresse.",
    whyVisit: "L'une des destinations les plus prisées d'Adriatique, avec un patrimoine authentique malgré son image festive.",
    littleTip: "Hvar est réputée pour avoir plus de 2 700 heures de soleil par an, parmi les plus ensoleillées d'Europe.",
    indicativeDuration: "demi-journée à journée complète",
  },
  {
    slug: "fortica-hvar",
    name: "Forteresse espagnole (Fortica)",
    zone: "hvar",
    categories: ["incontournables", "points-de-vue"],
    lat: 43.1731, lng: 16.4423,
    description: "Une forteresse du XVIe siècle dominant la ville de Hvar, offrant une vue spectaculaire sur le port, la vieille ville et les îles Pakleni au large.",
    whyVisit: "Le meilleur point de vue de l'île de Hvar, particulièrement au coucher du soleil.",
    littleTip: "La montée depuis la vieille ville prend environ 20-25 minutes à pied, sans ombre sur une bonne partie du trajet.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "st-stephens-square-hvar",
    name: "Place Saint-Étienne",
    zone: "hvar",
    categories: ["incontournables", "quartiers-balades"],
    lat: 43.1726, lng: 16.4417,
    description: "L'une des plus grandes places médiévales de Dalmatie, bordée par la cathédrale Saint-Étienne et l'ancien arsenal vénitien abritant le plus vieux théâtre public d'Europe.",
    whyVisit: "Le cœur social et architectural de Hvar, avec un théâtre historique encore en activité depuis 1612.",
    littleTip: "Le théâtre de l'Arsenal, à l'étage, est l'un des plus anciens théâtres publics d'Europe encore utilisés.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "franciscan-monastery-hvar",
    name: "Monastère franciscain de Hvar",
    zone: "hvar",
    categories: ["temples-patrimoine"],
    lat: 43.1716, lng: 16.4408,
    description: "Un monastère du XVe siècle en bord de mer, avec un cloître planté d'un cyprès centenaire et une collection de peintures vénitiennes, dont une Cène attribuée à l'école de Palma le Jeune.",
    whyVisit: "Une pause paisible en bord de mer, loin de l'agitation du port de Hvar.",
    littleTip: "Le jardin du cloître, avec son cyprès plusieurs fois centenaire, est l'un des recoins les plus photogéniques de la ville.",
    indicativeDuration: "45 min",
  },
  {
    slug: "pakleni-islands",
    name: "Îles Pakleni",
    zone: "hvar",
    categories: ["incontournables", "quartiers-balades"],
    lat: 43.1667, lng: 16.4167,
    description: "Un petit archipel inhabité au large de Hvar, aux eaux translucides et aux criques isolées, facilement accessible en taxi-boat depuis le port.",
    whyVisit: "La meilleure option de baignade loin de la foule du port de Hvar, à seulement 10-15 minutes en bateau.",
    littleTip: "Les taxis-boats partent fréquemment du port de Hvar en été — pas besoin de réserver à l'avance en général.",
    indicativeDuration: "demi-journée",
  },
  {
    slug: "hvar-lavender-fields",
    name: "Champs de lavande de Hvar",
    zone: "hvar",
    categories: ["quartiers-balades", "experiences-insolites"],
    lat: 43.1850, lng: 16.5450,
    description: "Les champs de lavande de l'intérieur de l'île, autour du village de Velo Grablje, qui ont valu à Hvar le surnom d'« île de la lavande » dès le début du XXe siècle.",
    whyVisit: "Un paysage parfumé et photogénique, en pleine floraison de juin à juillet.",
    littleTip: "La floraison ne dure que quelques semaines en juin-juillet — hors de cette période, les champs sont beaucoup moins spectaculaires.",
    indicativeDuration: "2h (en voiture/scooter)",
  },
  {
    slug: "stari-grad-hvar",
    name: "Stari Grad",
    zone: "hvar",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 43.1836, lng: 16.5950,
    description: "La plus ancienne ville de Croatie, fondée par des colons grecs en 384 avant J.-C. sous le nom de Pharos, nettement plus paisible et authentique que la ville de Hvar.",
    whyVisit: "Une alternative plus tranquille et plus ancienne à la ville de Hvar, avec une véritable histoire grecque antique.",
    littleTip: "La ville ferme pratiquement au port principal de l'île, souvent le premier arrêt des ferries venant du continent.",
    indicativeDuration: "2h",
  },
  {
    slug: "stari-grad-plain",
    name: "Plaine de Stari Grad",
    zone: "hvar",
    categories: ["temples-patrimoine", "quartiers-balades"],
    lat: 43.1900, lng: 16.6100,
    description: "Un paysage agricole classé à l'UNESCO, découpé en parcelles géométriques par les colons grecs il y a plus de 2 400 ans et toujours cultivé selon le même tracé aujourd'hui.",
    whyVisit: "L'un des très rares paysages agricoles antiques encore en exploitation active au monde.",
    littleTip: "Les murets de pierre sèche délimitant les parcelles sont d'origine grecque — un exploit de continuité agricole unique en Méditerranée.",
    indicativeDuration: "1h30 (à vélo)",
  },
  {
    slug: "jelsa-hvar",
    name: "Jelsa",
    zone: "hvar",
    categories: ["quartiers-balades", "restaurants"],
    lat: 43.1619, lng: 16.6981,
    description: "Un petit port de pêcheurs sur la côte nord de Hvar, avec une baie abritée en forme de fer à cheval et une ambiance nettement plus familiale que la ville de Hvar.",
    whyVisit: "Une étape plus tranquille et plus abordable que la ville de Hvar, avec un vrai charme de village portuaire.",
    littleTip: "Le vignoble voisin de Svirče produit certains des meilleurs vins rouges Plavac Mali de l'île.",
    indicativeDuration: "2h",
  },

  // ---------- Brač ----------
  {
    slug: "zlatni-rat",
    name: "Zlatni Rat",
    zone: "brac",
    categories: ["incontournables", "quartiers-balades"],
    lat: 43.2564, lng: 16.6372,
    description: "Une plage de galets blancs en forme de corne qui change de forme selon les vents et les courants, considérée comme l'une des plus belles plages d'Europe.",
    whyVisit: "L'image la plus emblématique des îles croates, une plage dont la pointe bouge littéralement avec la mer.",
    littleTip: "La pointe de la plage change réellement d'orientation selon les courants — sa forme exacte n'est jamais identique d'une visite à l'autre.",
    indicativeDuration: "demi-journée",
  },
  {
    slug: "bol-brac",
    name: "Bol",
    zone: "brac",
    categories: ["incontournables", "quartiers-balades"],
    lat: 43.2597, lng: 16.6500,
    description: "Le village historique de pêcheurs voisin de Zlatni Rat, avec un front de mer animé de restaurants et un petit monastère dominicain du XVe siècle.",
    whyVisit: "Le meilleur point de chute pour explorer Zlatni Rat, avec son propre charme de village dalmate traditionnel.",
    littleTip: "Le monastère dominicain, à la pointe est du village, abrite un tableau attribué à l'école du Tintoret.",
    indicativeDuration: "2h",
  },
  {
    slug: "vidova-gora",
    name: "Vidova Gora",
    zone: "brac",
    categories: ["incontournables", "points-de-vue"],
    lat: 43.3017, lng: 16.6283,
    description: "Le point culminant de toutes les îles adriatiques (778 mètres), offrant une vue vertigineuse sur Zlatni Rat, l'île de Hvar et la côte dalmate.",
    whyVisit: "Le plus haut sommet insulaire d'Adriatique, avec la meilleure vue en plongée sur Zlatni Rat depuis le ciel.",
    littleTip: "Un sentier de randonnée relie directement le sommet à Bol, pour qui veut descendre à pied plutôt qu'en voiture.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "skrip-village",
    name: "Škrip",
    zone: "brac",
    categories: ["temples-patrimoine", "quartiers-balades"],
    lat: 43.3386, lng: 16.5650,
    description: "Le plus ancien village de l'île de Brač, bâti sur les fondations d'un castrum illyrien puis romain, avec un petit musée d'histoire de l'île dans une tour fortifiée.",
    whyVisit: "Le village le plus authentique de Brač, qui a échappé au développement touristique du littoral.",
    littleTip: "Le musée de l'île, installé dans la tour Radojković, retrace 2 000 ans d'histoire de Brač en un seul arrêt.",
    indicativeDuration: "1h",
  },
  {
    slug: "pucisca-stone-quarry",
    name: "Carrières de pierre de Pučišća",
    zone: "brac",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 43.3567, lng: 16.7306,
    description: "Les carrières de pierre blanche de Brač, exploitées depuis l'Antiquité romaine, dont la pierre a servi à construire le palais de Dioclétien à Split et une partie de la Maison Blanche à Washington.",
    whyVisit: "La pierre la plus prestigieuse de Croatie, extraite ici depuis 2 000 ans et exportée jusqu'aux États-Unis.",
    littleTip: "Une école de taille de pierre est toujours en activité à Pučišća, perpétuant un savoir-faire séculaire.",
    indicativeDuration: "1h",
  },
  {
    slug: "blaca-hermitage",
    name: "Ermitage de Blaca",
    zone: "brac",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 43.2847, lng: 16.6294,
    description: "Un monastère glagolitique isolé niché dans une gorge désertique au cœur de l'île de Brač, fondé au XVIe siècle par des moines fuyant l'arrivée des Ottomans, accessible uniquement à pied.",
    whyVisit: "L'un des sites les plus insolites et isolés de Dalmatie, avec un observatoire astronomique improvisé par ses derniers moines.",
    littleTip: "La randonnée pour y accéder, environ 1h30 depuis le hameau le plus proche, fait partie intégrante de l'expérience.",
    indicativeDuration: "3h à 4h (avec la randonnée)",
  },

  // ---------- Vis ----------
  {
    slug: "vis-town",
    name: "Ville de Vis",
    zone: "vis",
    categories: ["incontournables", "quartiers-balades"],
    lat: 43.0619, lng: 16.1825,
    description: "La plus ancienne colonie grecque de l'Adriatique croate (fondée au IVe siècle avant J.-C.), restée fermée au tourisme de masse jusque dans les années 1990 car base militaire yougoslave.",
    whyVisit: "L'île la moins développée et la plus authentique de Croatie centrale, longtemps préservée par son passé militaire.",
    littleTip: "L'île n'a été ouverte aux visiteurs étrangers qu'en 1989 — un retard qui explique son charme resté intact.",
    indicativeDuration: "demi-journée",
  },
  {
    slug: "komiza",
    name: "Komiža",
    zone: "vis",
    categories: ["quartiers-balades", "restaurants"],
    lat: 43.0444, lng: 16.0914,
    description: "Un village de pêcheurs authentique de l'autre côté de l'île de Vis, point de départ habituel des excursions vers la Grotte Bleue de Biševo.",
    whyVisit: "L'un des villages de pêcheurs les plus authentiques de toute la côte croate, avec une vraie activité de pêche encore vivante.",
    littleTip: "Les bateaux pour la Grotte Bleue partent tôt le matin — la lumière dans la grotte est la plus belle entre 11h et 13h.",
    indicativeDuration: "2h",
  },
  {
    slug: "blue-cave-bisevo",
    name: "Grotte Bleue (Biševo)",
    zone: "vis",
    categories: ["incontournables", "experiences-insolites"],
    lat: 42.9975, lng: 15.9728,
    description: "Une grotte marine sur l'îlot de Biševo où la lumière du soleil, réfractée à travers l'eau, baigne l'intérieur d'une lueur bleu électrique surnaturelle.",
    whyVisit: "L'un des phénomènes naturels les plus spectaculaires d'Adriatique, comparable à la Grotte d'Azur de Capri.",
    littleTip: "L'effet de lumière n'est optimal qu'entre environ 11h et 13h, par temps ensoleillé et mer calme — réservez une excursion du matin.",
    indicativeDuration: "demi-journée (excursion complète)",
  },
  {
    slug: "stiniva-cove",
    name: "Crique de Stiniva",
    zone: "vis",
    categories: ["incontournables", "quartiers-balades"],
    lat: 43.0133, lng: 16.1619,
    description: "Une crique de galets quasiment fermée par deux parois rocheuses, accessible uniquement à pied ou en bateau, élue plus belle plage d'Europe par plusieurs classements internationaux.",
    whyVisit: "L'une des plages les plus spectaculaires et les plus photographiées de toute la Croatie.",
    littleTip: "L'accès à pied depuis le parking le plus proche est assez raide — prévoyez de bonnes chaussures, pas de tongs.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "tito-cave-vis",
    name: "Grotte de Tito",
    zone: "vis",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 43.0394, lng: 16.1528,
    description: "Le quartier général secret du maréchal Tito durant la Seconde Guerre mondiale, une grotte naturelle aménagée sur l'île de Vis où il a dirigé la résistance partisane en 1944.",
    whyVisit: "Un site historique méconnu et chargé d'histoire, sur l'île la plus liée au passé militaire yougoslave de Croatie.",
    littleTip: "L'accès se fait par un sentier de randonnée depuis le village de Podšpilje — prévoyez environ 30 minutes de marche.",
    indicativeDuration: "1h30 (avec la marche)",
  },

  // ---------- Krka ----------
  {
    slug: "skradinski-buk",
    name: "Skradinski Buk",
    zone: "krka",
    categories: ["incontournables", "quartiers-balades"],
    lat: 43.8158, lng: 15.9625,
    description: "La plus spectaculaire et la plus accessible des cascades du parc national de Krka, une succession de chutes d'eau turquoise en cascade sur la rivière Krka.",
    whyVisit: "L'une des plus belles cascades naturelles de Croatie, accessible par des passerelles en bois aménagées.",
    littleTip: "La baignade dans le bassin au pied des chutes n'est plus autorisée depuis quelques années — se renseigner sur les zones encore ouvertes.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "visovac-island",
    name: "Île de Visovac",
    zone: "krka",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 43.8347, lng: 15.9522,
    description: "Un îlot au milieu de la rivière Krka occupé par un monastère franciscain du XVe siècle, accessible uniquement en bateau depuis le parc national.",
    whyVisit: "Un cadre monastique isolé et photogénique, posé au milieu d'un élargissement de la rivière Krka.",
    littleTip: "La bibliothèque du monastère conserve des manuscrits et incunables précieux, dont certains visibles sur demande.",
    indicativeDuration: "1h (avec la traversée)",
  },
  {
    slug: "krka-national-park-entrance",
    name: "Skradin (entrée du parc national de Krka)",
    zone: "krka",
    categories: ["quartiers-balades", "restaurants"],
    lat: 43.8183, lng: 15.9239,
    description: "Une petite ville fluviale à l'entrée du parc national de Krka, point de départ habituel des bateaux-navettes vers Skradinski Buk.",
    whyVisit: "Un charmant village dalmate à explorer avant ou après la visite du parc national.",
    littleTip: "Garez-vous à Skradin plutôt qu'à l'entrée principale du parc — le trajet en bateau jusqu'aux chutes est inclus dans le billet.",
    indicativeDuration: "1h",
  },
  {
    slug: "roski-slap",
    name: "Roški Slap",
    zone: "krka",
    categories: ["quartiers-balades", "points-de-vue"],
    lat: 43.8847, lng: 16.0058,
    description: "Une cascade en gradins moins fréquentée que Skradinski Buk, dans la partie nord du parc national de Krka, entourée d'anciens moulins à eau restaurés.",
    whyVisit: "Une alternative plus paisible à Skradinski Buk, avec un patrimoine de moulins traditionnels bien conservé.",
    littleTip: "Les moulins restaurés autour de la cascade illustrent comment les habitants exploitaient la force de l'eau avant l'électricité.",
    indicativeDuration: "1h à 1h30",
  },
];

const ZONE_DEFS = [
  {
    slug: "split-old-town",
    name: "Vieille ville (Palais de Dioclétien)",
    mapColor: "#a8422c",
    vibeText: "Un palais romain du IVe siècle devenu le centre habité de Split, où ruines antiques, commerces et vie quotidienne se mêlent sans frontière claire.",
    prosText: "Un patrimoine antique exceptionnel et encore vivant, entièrement piéton et compact.",
    consText: "Très fréquenté en journée en haute saison, surtout aux heures de débarquement des ferries et croisières.",
    transportText: "Entièrement piéton — la gare ferroviaire, la gare routière et le port des ferries sont tous à quelques minutes à pied.",
    nearbyText: "Marjan Hill et la plage de Bačvice sont accessibles à pied en 15-20 minutes.",
    profileFitText: "Incontournable pour tout séjour à Split, quel que soit le profil de voyage.",
    hotelAdviceText: "Loger dans le palais lui-même, dans un appartement ancien, est une expérience à part entière — réservez tôt en haute saison.",
  },
  {
    slug: "split-beyond-walls",
    name: "Split hors les murs",
    mapColor: "#2e86ab",
    vibeText: "Le Split du quotidien, entre la colline boisée de Marjan, la plage populaire de Bačvice et les collections d'Ivan Meštrović, loin de la densité touristique du palais.",
    prosText: "Nature accessible à pied, vraie vie locale, hébergements plus abordables qu'en vieille ville.",
    consText: "Moins de patrimoine architectural concentré que dans le palais lui-même.",
    transportText: "Tout reste accessible à pied ou en quelques minutes de bus depuis le centre.",
    nearbyText: "La vieille ville reste à 15-20 minutes à pied de la plupart de ces sites.",
    profileFitText: "Pour prendre l'air, se baigner localement ou approfondir l'héritage artistique de Meštrović.",
    hotelAdviceText: "Les quartiers autour de Bačvice offrent un bon compromis plage/accès à pied à la vieille ville.",
  },
  {
    slug: "trogir",
    name: "Trogir",
    mapColor: "#c9972e",
    vibeText: "Une ville médiévale entière posée sur un îlot, classée à l'UNESCO pour la densité de son patrimoine roman et gothique, à 30 minutes de Split.",
    prosText: "Un ensemble urbain médiéval exceptionnel, compact et facile à visiter en une excursion courte.",
    consText: "Très fréquenté en milieu de journée par les excursions organisées depuis Split.",
    transportText: "Bus réguliers depuis Split (environ 40 minutes) ou voiture (30 minutes), aussi accessible en excursion en bateau.",
    nearbyText: "L'aéroport de Split-Trogir se trouve à seulement 5 minutes de la vieille ville, pratique en fin de séjour.",
    profileFitText: "Pour une excursion d'une demi-journée depuis Split, idéalement en fin d'après-midi.",
    hotelAdviceText: "Quelques hébergements existent dans la vieille ville même, pour une étape plus tranquille qu'à Split.",
  },
  {
    slug: "salona",
    name: "Salone",
    mapColor: "#6fae7c",
    vibeText: "Les ruines de l'ancienne capitale romaine de Dalmatie, abandonnée au VIIe siècle, dont les habitants ont fondé Split dans le palais de Dioclétien voisin.",
    prosText: "Le site archéologique romain le plus important de Croatie, rarement bondé.",
    consText: "Un seul site, à prévoir en complément d'une autre visite plutôt que comme excursion à part entière.",
    transportText: "À environ 15 minutes en voiture ou bus depuis le centre de Split (ville de Solin).",
    nearbyText: "Se combine facilement avec une visite de Split même, en une demi-journée.",
    profileFitText: "Pour les passionnés d'archéologie romaine, en complément du palais de Dioclétien.",
    hotelAdviceText: "Aucun hébergement sur place — à visiter en demi-journée depuis Split.",
  },
  {
    slug: "hvar",
    name: "Hvar",
    mapColor: "#d6479a",
    vibeText: "L'île la plus glamour de Croatie, entre port de yachts, champs de lavande et la plus ancienne ville du pays à Stari Grad.",
    prosText: "L'une des îles les plus ensoleillées d'Europe, avec un patrimoine riche et une vie nocturne animée.",
    consText: "Prix élevés en haute saison, très fréquentée en juillet-août.",
    transportText: "Catamaran rapide depuis Split (environ 1h) ou ferry avec voiture (environ 2h).",
    nearbyText: "Les îles Pakleni se rejoignent en 10-15 minutes de taxi-boat depuis le port de Hvar.",
    profileFitText: "Pour un séjour balnéaire chic avec patrimoine et vie nocturne, sur une ou plusieurs nuits.",
    hotelAdviceText: "Stari Grad offre une alternative plus calme et moins chère à la ville de Hvar elle-même.",
  },
  {
    slug: "brac",
    name: "Brač",
    mapColor: "#8f2d2d",
    vibeText: "La plus grande île de Dalmatie centrale, célèbre pour la plage changeante de Zlatni Rat et ses carrières de pierre blanche exportée jusqu'à la Maison Blanche.",
    prosText: "La plage la plus emblématique de Croatie, et un point culminant insulaire offrant une vue exceptionnelle.",
    consText: "Bol et Zlatni Rat sont très fréquentés en haute saison, mieux vaut arriver tôt.",
    transportText: "Ferry depuis Split vers Supetar (environ 50 minutes) ou catamaran direct vers Bol en haute saison.",
    nearbyText: "Vidova Gora, point culminant de l'île, surplombe directement Zlatni Rat et Bol.",
    profileFitText: "Pour la plage la plus photogénique de Croatie, idéalement en excursion à la journée ou une nuit sur place.",
    hotelAdviceText: "Bol concentre l'essentiel des hébergements, à proximité immédiate de Zlatni Rat.",
  },
  {
    slug: "vis",
    name: "Vis",
    mapColor: "#2a7a8c",
    vibeText: "L'île la moins développée de Croatie centrale, fermée au tourisme jusqu'en 1989 pour cause de base militaire, aujourd'hui réputée pour la Grotte Bleue et la crique de Stiniva.",
    prosText: "L'authenticité la plus préservée de toutes les îles de la région, loin du tourisme de masse.",
    consText: "Trajet en bateau plus long depuis Split (environ 2h30 en ferry), moins d'infrastructures touristiques.",
    transportText: "Ferry (environ 2h15-2h30) ou catamaran rapide (environ 1h15) depuis Split.",
    nearbyText: "La Grotte Bleue de Biševo se visite en excursion depuis Komiža, sur l'autre rive de l'île.",
    profileFitText: "Pour les voyageurs en quête d'authenticité et prêts à un trajet plus long, idéalement sur une nuit ou plus.",
    hotelAdviceText: "La ville de Vis et Komiža offrent chacune un bon point de chute, selon que l'on privilégie l'histoire ou la pêche traditionnelle.",
  },
  {
    slug: "krka",
    name: "Parc national de Krka",
    mapColor: "#3f8c5a",
    vibeText: "Un parc national construit autour d'une rivière en cascades turquoise, moins fréquenté que Plitvice mais tout aussi spectaculaire, à moins d'une heure de Split.",
    prosText: "Des cascades spectaculaires accessibles par des passerelles aménagées, sans randonnée difficile.",
    consText: "Très fréquenté en milieu de journée l'été — mieux vaut arriver à l'ouverture.",
    transportText: "Environ 1h de route depuis Split, ou excursions organisées à la journée depuis le centre-ville.",
    nearbyText: "Skradin, à l'entrée du parc, est une bonne étape pour déjeuner avant ou après la visite.",
    profileFitText: "Pour une excursion nature à la journée depuis Split, accessible même sans voiture via une excursion organisée.",
    hotelAdviceText: "Peu d'hébergements près du parc — la grande majorité des visiteurs viennent à la journée depuis Split.",
  },
];

async function main() {
  console.log("Seeding Split destination…");

  const croatie = await prisma.country.upsert({
    where: { slug: "croatie" },
    update: {},
    create: { slug: "croatie", name: "Croatie" },
  });

  const split = await prisma.destination.upsert({
    where: { slug: "split" },
    update: { status: "PUBLISHED" },
    create: {
      countryId: croatie.id,
      slug: "split",
      name: "Split",
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
    where: { id: split.id },
    data: {
      categories: {
        set: ENABLED_CATEGORIES.map((slug) => ({ id: categoryBySlug.get(slug)!.id })),
      },
    },
  });

  const zoneBySlug = new Map<string, { id: string }>();
  for (const z of ZONE_DEFS) {
    const zone = await prisma.zone.upsert({
      where: { destinationId_slug: { destinationId: split.id, slug: z.slug } },
      update: {
        name: z.name, mapColor: z.mapColor, vibeText: z.vibeText, prosText: z.prosText,
        consText: z.consText, transportText: z.transportText, nearbyText: z.nearbyText,
        profileFitText: z.profileFitText, hotelAdviceText: z.hotelAdviceText,
      },
      create: { destinationId: split.id, ...z },
    });
    zoneBySlug.set(z.slug, zone);
  }

  let manifest: PhotoManifestEntry[] = [];
  try {
    manifest = JSON.parse(
      await readFile(
        "/private/tmp/claude-501/-Users-constance/8b5fbae2-2d1e-4365-aae7-917e8137a620/scratchpad/photos_split/manifest.json",
        "utf-8"
      )
    );
  } catch {
    console.log("No photo manifest found yet — seeding without photos.");
  }

  // Final accepted photos live in seed-assets/split-photos/<slug>.jpg
  // (resized, false positives already excluded) — same pattern as every
  // other destination this session. The Dockerfile bakes this folder
  // into storage/photos at build time.
  const PHOTOS_DIR = "seed-assets/split-photos";

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
        name: def.name, destinationId: split.id, zoneId: zone?.id, status: "PUBLISHED",
        lat: def.lat, lng: def.lng, description: def.description, whyVisit: def.whyVisit,
        littleTip: def.littleTip, indicativeDuration: def.indicativeDuration,
        indicativePrice: def.indicativePrice, isFictionalDemo: false,
      },
      create: {
        slug: def.slug, destinationId: split.id, zoneId: zone?.id, name: def.name,
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

  console.log(`Split seed complete: ${PLACES.length} places, ${photoCount} with real photos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
