/**
 * Californie — fourth USA destination, built from the admin "Nouvelle
 * destination" request queue: "road trip en California avec les
 * grands parcs comme les séquoias etc mais pas les deux grandes
 * villes pour lesquelles il y a déjà un guide" — San Francisco and
 * Los Angeles are deliberately excluded (covered by their own
 * guides), this is a road-trip-style multi-region guide covering the
 * national parks, the coast and wine country between them. No target
 * place count was given. Same pattern as every other destination:
 * real places, real coordinates, Wikimedia Commons photos only when a
 * genuine match exists, no zoos (Monterey Bay Aquarium is included —
 * a research aquarium with no captive marine mammals, consistent with
 * the standing rule excluding only zoos and marine-mammal-captivity
 * parks), restaurants priced across every range. No airport zone:
 * unlike a single city, this road trip has no one gateway — SF and
 * LA airports are already covered in their own destination guides.
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
  // ---------- Yosemite National Park ----------
  {
    slug: "yosemite-valley",
    name: "Yosemite Valley",
    zone: "yosemite",
    categories: ["incontournables", "points-de-vue"],
    lat: 37.7456, lng: -119.5936,
    description: "Le cœur du parc national de Yosemite, une vallée glaciaire encaissée entre des falaises de granit vertigineuses, parsemée de cascades parmi les plus hautes d'Amérique du Nord.",
    whyVisit: "L'une des vallées les plus spectaculaires du monde, berceau du mouvement de conservation des parcs nationaux américains.",
    littleTip: "Garez-vous et utilisez la navette gratuite du parc pour circuler dans la vallée — la circulation en voiture y est souvent dense en été.",
    indicativeDuration: "1 journée et plus",
  },
  {
    slug: "el-capitan",
    name: "El Capitan",
    zone: "yosemite",
    categories: ["incontournables", "points-de-vue"],
    lat: 37.7346, lng: -119.6384,
    description: "Un monolithe de granit de 900 mètres de haut, l'une des plus grandes parois d'escalade verticale au monde, rendue célèbre par les ascensions en solo intégral du grimpeur Alex Honnold.",
    whyVisit: "L'un des monuments naturels les plus impressionnants des États-Unis, et un lieu de pèlerinage pour les grimpeurs du monde entier.",
    littleTip: "En soirée, de petites lumières sont parfois visibles sur la paroi — ce sont les lampes frontales des grimpeurs bivouaquant en pleine ascension.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "half-dome",
    name: "Half Dome",
    zone: "yosemite",
    categories: ["incontournables", "points-de-vue"],
    lat: 37.7459, lng: -119.5332,
    description: "Un dôme de granit emblématique à la silhouette coupée net, visible depuis presque tous les points de vue de la vallée, sommet d'une randonnée exigeante de 23 km aller-retour.",
    whyVisit: "Le symbole le plus reconnaissable de Yosemite, que l'on grimpe ou que l'on admire simplement depuis la vallée.",
    littleTip: "L'ascension du sommet nécessite un permis tiré au sort des mois à l'avance — la plupart des visiteurs l'admirent depuis Glacier Point ou la vallée.",
    indicativeDuration: "1 journée complète (ascension) ou 30 min (vue)",
  },
  {
    slug: "yosemite-falls",
    name: "Yosemite Falls",
    zone: "yosemite",
    categories: ["incontournables", "points-de-vue"],
    lat: 37.7569, lng: -119.5968,
    description: "La plus haute chute d'eau d'Amérique du Nord, culminant à 739 mètres en trois sections successives, spectaculaire au printemps lors de la fonte des neiges.",
    whyVisit: "La cascade la plus emblématique du parc, facilement accessible par un court sentier depuis la vallée.",
    littleTip: "Le débit varie énormément selon la saison — le pic se situe en mai-juin, la cascade pouvant même s'assécher en fin d'été.",
    indicativeDuration: "1h-1h30 (sentier de base)",
  },
  {
    slug: "glacier-point",
    name: "Glacier Point",
    zone: "yosemite",
    categories: ["incontournables", "points-de-vue"],
    lat: 37.7275, lng: -119.5728,
    description: "Un belvédère accessible en voiture offrant la vue la plus complète sur Half Dome, la vallée de Yosemite et les cascades, depuis près de 1 000 mètres de hauteur.",
    whyVisit: "Le meilleur point de vue panoramique accessible sans randonnée, idéal au coucher du soleil.",
    littleTip: "La route vers Glacier Point ferme généralement de novembre à mai en raison de la neige — vérifiez son ouverture avant de planifier.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "mariposa-grove",
    name: "Mariposa Grove",
    zone: "yosemite",
    categories: ["incontournables", "activites-famille"],
    lat: 37.5159, lng: -119.6061,
    description: "La plus grande forêt de séquoias géants du parc de Yosemite, avec plus de 500 arbres matures dont certains âgés de plus de 1 800 ans.",
    whyVisit: "Marcher parmi les plus grands êtres vivants de la planète, dans un cadre forestier paisible.",
    littleTip: "Une navette gratuite dessert la forêt depuis le sud de la vallée en haute saison, l'accès en voiture étant limité.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "tunnel-view",
    name: "Tunnel View",
    zone: "yosemite",
    categories: ["incontournables", "points-de-vue"],
    lat: 37.7159, lng: -119.6486,
    description: "Le point de vue le plus photographié de Yosemite, qui cadre en une seule image El Capitan, Half Dome et la cascade Bridalveil au fond de la vallée.",
    whyVisit: "La vue d'ensemble la plus iconique sur Yosemite, accessible directement depuis un parking en bord de route.",
    littleTip: "Ce même point de vue inspira le photographe Ansel Adams pour certaines de ses images les plus célèbres du parc.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "tuolumne-meadows",
    name: "Tuolumne Meadows",
    zone: "yosemite",
    categories: ["points-de-vue", "activites-famille"],
    lat: 37.8742, lng: -119.3505,
    description: "Une vaste prairie alpine à plus de 2 600 mètres d'altitude, traversée par la rivière Tuolumne, nettement moins fréquentée que la vallée principale.",
    whyVisit: "Un visage plus sauvage et paisible de Yosemite, loin de la foule de la vallée principale.",
    littleTip: "La route Tioga qui y mène ferme généralement de novembre à fin mai — vérifiez son ouverture si vous visitez hors été.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "mist-trail-vernal-nevada",
    name: "Mist Trail (chutes Vernal et Nevada)",
    zone: "yosemite",
    categories: ["incontournables", "activites-famille"],
    lat: 37.7324, lng: -119.5579,
    description: "L'une des randonnées les plus populaires du parc, qui longe deux cascades spectaculaires, avec un nuage de fines gouttelettes rafraîchissant les marcheurs au printemps.",
    whyVisit: "La randonnée la plus emblématique de Yosemite, à la portée de la plupart des niveaux pour sa première section.",
    littleTip: "Prévoyez une protection imperméable au printemps — le \"Mist Trail\" (sentier de la brume) porte bien son nom lors de la fonte des neiges.",
    indicativeDuration: "3h-4h (aller-retour complet)",
  },

  // ---------- Sequoia & Kings Canyon National Parks ----------
  {
    slug: "general-sherman-tree",
    name: "General Sherman Tree",
    zone: "sequoia-kings-canyon",
    categories: ["incontournables", "points-de-vue"],
    lat: 36.5786, lng: -118.7752,
    description: "L'arbre le plus massif du monde en volume, un séquoia géant de plus de 2 200 ans et 83 mètres de haut, dans le parc national de Sequoia.",
    whyVisit: "Se tenir face au plus grand être vivant connu sur Terre, une expérience d'échelle vertigineuse.",
    littleTip: "Un court sentier pavé mène directement à l'arbre depuis le parking — accessible même avec une mobilité réduite.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "giant-forest",
    name: "Giant Forest",
    zone: "sequoia-kings-canyon",
    categories: ["incontournables", "activites-famille"],
    lat: 36.5612, lng: -118.7704,
    description: "L'une des plus grandes concentrations de séquoias géants au monde, avec plusieurs sentiers de randonnée serpentant entre des arbres millénaires.",
    whyVisit: "Une immersion complète dans la forêt de séquoias, au-delà du simple arrêt photo au General Sherman.",
    littleTip: "Le Congress Trail, une boucle de 3,5 km partant du General Sherman, traverse les plus beaux groupes d'arbres de la forêt.",
    indicativeDuration: "2h-3h",
  },
  {
    slug: "moro-rock",
    name: "Moro Rock",
    zone: "sequoia-kings-canyon",
    categories: ["incontournables", "points-de-vue"],
    lat: 36.5443, lng: -118.7646,
    description: "Un dôme de granit culminant à 2 050 mètres, accessible par un escalier vertigineux de 400 marches taillé directement dans la roche, offrant une vue à 360° sur la Sierra Nevada.",
    whyVisit: "L'un des panoramas les plus spectaculaires de toute la Sierra Nevada, pour un effort physique modéré.",
    littleTip: "L'escalier est étroit avec peu de rambardes par endroits — déconseillé en cas de vertige prononcé ou d'orage.",
    indicativeDuration: "1h-1h15",
  },
  {
    slug: "crystal-cave-sequoia",
    name: "Crystal Cave",
    zone: "sequoia-kings-canyon",
    categories: ["incontournables", "experiences-insolites"],
    lat: 36.5778, lng: -118.8248,
    description: "Une grotte de marbre scintillante découverte en 1918, avec des formations de calcite rares, visitée uniquement en groupe guidé.",
    whyVisit: "Une expérience souterraine fraîche et insolite, contraste parfait avec les grands espaces du parc en surface.",
    littleTip: "Les billets s'achètent uniquement à l'avance au centre des visiteurs du parc, jamais directement à l'entrée de la grotte.",
    indicativeDuration: "1h-1h30",
    indicativePrice: "$$",
  },
  {
    slug: "kings-canyon-scenic-byway",
    name: "Kings Canyon Scenic Byway",
    zone: "sequoia-kings-canyon",
    categories: ["incontournables", "points-de-vue"],
    lat: 36.8000, lng: -118.9500,
    description: "Une route panoramique spectaculaire qui descend dans l'un des canyons les plus profonds des États-Unis, plus profond par endroits que le Grand Canyon.",
    whyVisit: "L'une des plus belles routes panoramiques de Californie, à travers un canyon granitique vertigineux.",
    littleTip: "La route est généralement fermée en hiver — elle n'est praticable que d'environ avril à novembre selon l'enneigement.",
    indicativeDuration: "2h-3h (trajet)",
  },
  {
    slug: "grant-grove-general-grant-tree",
    name: "Grant Grove (General Grant Tree)",
    zone: "sequoia-kings-canyon",
    categories: ["incontournables", "activites-famille"],
    lat: 36.7466, lng: -118.9733,
    description: "Une forêt de séquoias géants abritant le General Grant Tree, officiellement désigné \"arbre de Noël de la nation\" par décret présidentiel en 1926.",
    whyVisit: "Le deuxième plus grand arbre du monde, dans un cadre forestier nettement moins fréquenté que Giant Forest.",
    littleTip: "Une cérémonie commémorative a lieu chaque année en décembre autour de cet \"arbre de Noël de la nation\" officiellement désigné.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "zumwalt-meadow",
    name: "Zumwalt Meadow",
    zone: "sequoia-kings-canyon",
    categories: ["points-de-vue", "activites-famille"],
    lat: 36.7890, lng: -118.5890,
    description: "Une prairie verdoyante au fond de Kings Canyon, entourée de falaises granitiques, accessible par une courte boucle de randonnée facile.",
    whyVisit: "Une des plus belles balades faciles du parc, avec vue directe sur les parois du canyon.",
    littleTip: "La prairie est particulièrement photogénique en fin d'après-midi, quand la lumière éclaire les falaises environnantes.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "hospital-rock",
    name: "Hospital Rock",
    zone: "sequoia-kings-canyon",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 36.5347, lng: -118.7956,
    description: "Un site archéologique amérindien avec des pictogrammes et des mortiers de pierre creusés par les Monache, premiers habitants de cette vallée avant l'arrivée des colons.",
    whyVisit: "Un témoignage rare sur les peuples amérindiens qui habitaient cette région bien avant la création du parc national.",
    littleTip: "Le site tire son nom d'un épisode du XIXe siècle où un colon blessé y fut soigné par les habitants Monache locaux.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "sequoia-national-park-foothills",
    name: "Foothills Visitor Center & Marble Falls Trail",
    zone: "sequoia-kings-canyon",
    categories: ["activites-famille", "points-de-vue"],
    lat: 36.4864, lng: -118.8275,
    description: "La porte d'entrée sud du parc de Sequoia, à plus basse altitude, avec un sentier moins fréquenté menant à une cascade cachée.",
    whyVisit: "Une bonne option pour qui arrive en fin de journée ou préfère un sentier plus tranquille et moins connu.",
    littleTip: "Cette zone, à altitude plus basse, est accessible et agréable même en hiver, quand les hauteurs du parc sont enneigées.",
    indicativeDuration: "2h-3h",
  },

  // ---------- Big Sur & Highway 1 Coast ----------
  {
    slug: "bixby-creek-bridge",
    name: "Bixby Creek Bridge",
    zone: "big-sur",
    categories: ["incontournables", "points-de-vue"],
    lat: 36.3714, lng: -121.9016,
    description: "Un pont en arc de béton de 1932, l'un des plus hauts ponts à portique simple au monde, devenu l'image la plus photographiée de toute la Highway 1.",
    whyVisit: "Le pont le plus emblématique de la côte californienne, surtout spectaculaire au lever du jour.",
    littleTip: "Un petit point de vue juste au nord du pont, sur le côté de la route, offre le meilleur angle photo classique.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "mcway-falls",
    name: "McWay Falls",
    zone: "big-sur",
    categories: ["incontournables", "points-de-vue"],
    lat: 36.1592, lng: -121.6703,
    description: "Une cascade rare de 24 mètres qui se jette directement dans l'océan Pacifique sur une plage privée inaccessible, dans le parc Julia Pfeiffer Burns.",
    whyVisit: "L'une des cascades les plus singulières des États-Unis, visible uniquement depuis un point de vue en surplomb.",
    littleTip: "Un très court sentier depuis le parking mène directement au point de vue — accessible même avec peu de temps disponible.",
    indicativeDuration: "20-30 min",
  },
  {
    slug: "point-lobos-reserve",
    name: "Point Lobos State Natural Reserve",
    zone: "big-sur",
    categories: ["incontournables", "activites-famille"],
    lat: 36.5155, lng: -121.9380,
    description: "Une réserve naturelle côtière surnommée \"le joyau de la couronne\" du système de parcs californiens, avec des sentiers offrant régulièrement des vues sur loutres de mer et otaries sauvages.",
    whyVisit: "L'une des plus belles réserves côtières de Californie, avec une faune marine sauvage visible depuis les sentiers.",
    littleTip: "Le parking se remplit vite le week-end — arrivez tôt le matin ou prévoyez de patienter pour une place.",
    indicativeDuration: "2h-3h",
  },
  {
    slug: "pfeiffer-beach",
    name: "Pfeiffer Beach",
    zone: "big-sur",
    categories: ["incontournables", "points-de-vue"],
    lat: 36.2447, lng: -121.8131,
    description: "Une plage spectaculaire au sable parfois teinté de violet par des dépôts de manganèse, avec un rocher percé créant des effets de lumière saisissants au coucher du soleil.",
    whyVisit: "L'une des plages les plus photogéniques de Californie, surtout au coucher du soleil quand la lumière traverse l'arche rocheuse.",
    littleTip: "L'accès se fait par une route non signalée depuis la Highway 1 — repérez Sycamore Canyon Road, seul accès autorisé.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "hearst-castle",
    name: "Hearst Castle",
    zone: "big-sur",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 35.6852, lng: -121.1685,
    description: "Le domaine démesuré du magnat de la presse William Randolph Hearst, construit dans les années 1920 avec des trésors architecturaux rapportés d'Europe entière, dont une piscine romaine spectaculaire.",
    whyVisit: "L'un des domaines les plus extravagants des États-Unis, qui inspira en partie le film Citizen Kane.",
    littleTip: "Plusieurs circuits de visite différents existent — réservez le \"Grand Rooms Tour\" pour une première visite si vous ne devez en choisir qu'un.",
    indicativeDuration: "2h-2h30",
  },
  {
    slug: "carmel-by-the-sea",
    name: "Carmel-by-the-Sea",
    zone: "big-sur",
    categories: ["incontournables", "quartiers-balades"],
    lat: 36.5552, lng: -121.9233,
    description: "Un charmant village côtier sans adresses postales ni lampadaires, connu pour ses galeries d'art, ses maisons de conte de fées et une plage de sable blanc.",
    whyVisit: "Un village pittoresque et artistique, ancien repaire d'écrivains et d'artistes américains du début du XXe siècle.",
    littleTip: "Clint Eastwood fut maire de la ville dans les années 1980 — un fait que les habitants aiment encore rappeler avec fierté.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "17-mile-drive",
    name: "17-Mile Drive (Pebble Beach)",
    zone: "big-sur",
    categories: ["incontournables", "points-de-vue"],
    lat: 36.5725, lng: -121.9486,
    description: "Une route privée panoramique à péage traversant la péninsule de Monterey, avec le célèbre Lone Cypress, cyprès solitaire perché sur un rocher depuis plus de 250 ans.",
    whyVisit: "L'une des plus belles routes côtières d'Amérique, bordée de terrains de golf mondialement connus.",
    littleTip: "Le péage s'applique par véhicule et peut être remboursé en dépensant un montant équivalent dans les restaurants ou boutiques le long de la route.",
    indicativeDuration: "1h-1h30",
    indicativePrice: "$$",
  },
  {
    slug: "monterey-bay-aquarium",
    name: "Monterey Bay Aquarium",
    zone: "big-sur",
    categories: ["incontournables", "activites-famille"],
    lat: 36.6182, lng: -121.9018,
    description: "L'un des plus grands aquariums au monde, construit sur le site d'une ancienne conserverie de sardines, pionnier mondial de la conservation marine avec une forêt de kelp géante vivante.",
    whyVisit: "Un aquarium de référence mondiale axé sur la recherche et la conservation marine, avec une forêt de kelp spectaculaire.",
    littleTip: "Le bassin de la forêt de kelp, l'un des premiers du genre au monde, est nourri en eau de mer directement pompée depuis la baie.",
    indicativeDuration: "2h-3h",
  },
  {
    slug: "cannery-row-monterey",
    name: "Cannery Row",
    zone: "big-sur",
    categories: ["quartiers-balades", "temples-patrimoine"],
    lat: 36.6163, lng: -121.8970,
    description: "L'ancienne rue des conserveries de sardines de Monterey, immortalisée par le roman de John Steinbeck du même nom, aujourd'hui reconvertie en rue commerçante en bord de mer.",
    whyVisit: "Un quartier historique chargé de littérature américaine, juste à côté de l'aquarium de Monterey.",
    littleTip: "Plusieurs plaques le long de la rue retracent les lieux réels ayant inspiré les personnages du roman de Steinbeck.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "nepenthe-big-sur",
    name: "Nepenthe",
    zone: "big-sur",
    categories: ["restaurants", "points-de-vue"],
    lat: 36.2235, lng: -121.7322,
    description: "Un restaurant perché sur une falaise de Big Sur depuis 1949, avec une terrasse offrant l'une des plus belles vues sur l'océan Pacifique de toute la côte.",
    whyVisit: "Le meilleur cadre pour un déjeuner avec vue, sur l'un des tronçons les plus spectaculaires de la Highway 1.",
    littleTip: "Le site appartenait autrefois à Rita Hayworth et Orson Welles, avant de devenir le restaurant mythique qu'il est aujourd'hui.",
    indicativeDuration: "1h-1h30",
    indicativePrice: "$$$",
  },

  // ---------- Napa & Sonoma Wine Country ----------
  {
    slug: "napa-valley-scenic-drive",
    name: "Napa Valley (Silverado Trail)",
    zone: "napa-sonoma",
    categories: ["incontournables", "points-de-vue"],
    lat: 38.4500, lng: -122.3700,
    description: "La vallée viticole la plus prestigieuse des États-Unis, avec plus de 400 établissements vinicoles disséminés entre collines verdoyantes et vignobles à perte de vue.",
    whyVisit: "La référence américaine de la dégustation de vin, dans un paysage aussi beau que ses crus sont réputés.",
    littleTip: "Le Silverado Trail, parallèle à la Route 29 plus touristique, offre une conduite nettement plus paisible entre les domaines.",
    indicativeDuration: "1 journée et plus",
  },
  {
    slug: "castello-di-amorosa",
    name: "Castello di Amorosa",
    zone: "napa-sonoma",
    categories: ["incontournables", "experiences-insolites"],
    lat: 38.5376, lng: -122.5270,
    description: "Une réplique authentique d'un château médiéval toscan du XIIIe siècle, construite pierre par pierre sur 14 ans, avec donjon, douves et caves souterraines voûtées.",
    whyVisit: "Un domaine viticole totalement insolite, qui transporte littéralement en Italie médiévale au cœur de la Californie.",
    littleTip: "Les caves souterraines, creusées sur plusieurs niveaux, conservent une température naturelle idéale pour le vieillissement du vin sans climatisation.",
    indicativeDuration: "1h30-2h",
    indicativePrice: "$$",
  },
  {
    slug: "domaine-chandon",
    name: "Domaine Chandon",
    zone: "napa-sonoma",
    categories: ["incontournables"],
    lat: 38.4030, lng: -122.3650,
    description: "La première maison de vins mousseux de méthode traditionnelle française établie dans la Napa Valley, filiale californienne de Moët & Chandon depuis 1973.",
    whyVisit: "Un pont entre tradition champenoise française et terroir californien, pour les amateurs de vins effervescents.",
    littleTip: "Les jardins du domaine, avec leurs sculptures contemporaines, sont agréables pour un pique-nique entre deux dégustations.",
    indicativeDuration: "1h-1h30",
    indicativePrice: "$$",
  },
  {
    slug: "oxbow-public-market",
    name: "Oxbow Public Market",
    zone: "napa-sonoma",
    categories: ["marches", "street-food"],
    lat: 38.3010, lng: -122.2860,
    description: "Un marché couvert gastronomique au cœur de la ville de Napa, avec des comptoirs de producteurs locaux, fromagers et artisans de la région.",
    whyVisit: "Un excellent arrêt déjeuner avant ou après une journée de dégustation, avec une sélection de produits locaux de qualité.",
    littleTip: "Le marché borde directement la rivière Napa, avec une agréable promenade pour digérer après le repas.",
    indicativeDuration: "45 min-1h",
    indicativePrice: "$$",
  },
  {
    slug: "sterling-vineyards",
    name: "Sterling Vineyards",
    zone: "napa-sonoma",
    categories: ["incontournables", "points-de-vue"],
    lat: 38.5370, lng: -122.5480,
    description: "Un domaine viticole perché sur une colline, accessible uniquement par un tramway aérien privé, avec une vue panoramique sur toute la vallée de Napa pendant la dégustation.",
    whyVisit: "La seule dégustation de vin de la vallée accessible en téléphérique, avec une vue imprenable incluse.",
    littleTip: "Le tramway aérien jusqu'au domaine est inclus dans le billet de dégustation — une expérience en soi avant même d'arriver au chai.",
    indicativeDuration: "1h30-2h",
    indicativePrice: "$$$",
  },
  {
    slug: "sonoma-plaza",
    name: "Sonoma Plaza",
    zone: "napa-sonoma",
    categories: ["incontournables", "quartiers-balades"],
    lat: 38.2919, lng: -122.4581,
    description: "La plus grande place historique de Californie, centre de la ville de Sonoma où fut proclamée en 1846 l'éphémère République de Californie, bordée de boutiques et caves à vin.",
    whyVisit: "Une alternative plus authentique et moins touristique à Napa, avec une histoire californienne fondatrice.",
    littleTip: "Plusieurs bars à vin autour de la place permettent de déguster des crus de Sonoma sans avoir à se déplacer entre domaines.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "calistoga",
    name: "Calistoga",
    zone: "napa-sonoma",
    categories: ["incontournables", "bien-etre-spas"],
    lat: 38.5788, lng: -122.5797,
    description: "Une petite ville thermale au nord de la Napa Valley, réputée pour ses sources chaudes naturelles et ses bains de boue volcanique traditionnels.",
    whyVisit: "La meilleure étape détente du voyage, pour un bain de boue ou une source chaude après plusieurs jours de route.",
    littleTip: "Les bains de boue volcanique, spécialité locale depuis le XIXe siècle, se réservent à l'avance dans plusieurs spas de la ville.",
    indicativeDuration: "2h-3h",
    indicativePrice: "$$$",
  },
  {
    slug: "old-faithful-geyser-california",
    name: "Old Faithful Geyser of California",
    zone: "napa-sonoma",
    categories: ["experiences-insolites", "activites-famille"],
    lat: 38.6020, lng: -122.5425,
    description: "L'un des trois geysers au monde à entrer en éruption de façon suffisamment régulière pour mériter le nom \"Old Faithful\", jaillissant toutes les 30 minutes environ.",
    whyVisit: "Une curiosité géologique rare, accessible sans avoir à se rendre jusqu'au Yellowstone.",
    littleTip: "L'éruption dure environ trois minutes — prévoyez d'arriver un peu avant l'horaire estimé affiché à l'entrée.",
    indicativeDuration: "45 min-1h",
    indicativePrice: "$",
  },
  {
    slug: "robert-mondavi-winery",
    name: "Robert Mondavi Winery",
    zone: "napa-sonoma",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 38.4210, lng: -122.4150,
    description: "Le domaine fondateur qui propulsa les vins californiens sur la scène mondiale dans les années 1970, avec une architecture de mission espagnole emblématique de la vallée.",
    whyVisit: "Un domaine historique incontournable pour comprendre l'essor international des vins de la Napa Valley.",
    littleTip: "Le domaine propose régulièrement des concerts en plein air en été, dans un cadre viticole exceptionnel.",
    indicativeDuration: "1h-1h30",
    indicativePrice: "$$",
  },

  // ---------- Lake Tahoe ----------
  {
    slug: "emerald-bay-state-park",
    name: "Emerald Bay State Park",
    zone: "lake-tahoe",
    categories: ["incontournables", "points-de-vue"],
    lat: 38.9550, lng: -120.1032,
    description: "Une baie aux eaux turquoise spectaculaires sur la rive ouest du lac Tahoe, considérée comme l'un des points de vue les plus photographiés de toute la Sierra Nevada.",
    whyVisit: "La vue la plus emblématique du lac Tahoe, avec une petite île boisée unique en son centre.",
    littleTip: "Le sentier qui descend vers Vikingsholm, au fond de la baie, offre la meilleure perspective rapprochée sur l'eau turquoise.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "south-lake-tahoe",
    name: "South Lake Tahoe",
    zone: "lake-tahoe",
    categories: ["incontournables", "activites-famille"],
    lat: 38.9399, lng: -119.9772,
    description: "La ville principale du côté californien du lac Tahoe, avec de larges plages de sable et une eau d'une pureté remarquable en été.",
    whyVisit: "La meilleure base pour explorer le lac, avec plages, restaurants et activités nautiques à proximité directe.",
    littleTip: "L'eau du lac Tahoe reste fraîche même en plein été, en raison de sa grande profondeur — prévoyez une combinaison pour une longue baignade.",
    indicativeDuration: "2h et plus",
  },
  {
    slug: "heavenly-mountain-resort",
    name: "Heavenly Mountain Resort (gondole)",
    zone: "lake-tahoe",
    categories: ["incontournables", "points-de-vue"],
    lat: 38.9353, lng: -119.9400,
    description: "Une station de ski qui opère sa gondole toute l'année, offrant en été une vue panoramique à 360° sur le lac Tahoe depuis plus de 2 900 mètres d'altitude.",
    whyVisit: "La meilleure vue aérienne sur l'ensemble du lac Tahoe, accessible sans randonnée grâce à la gondole.",
    littleTip: "La terrasse d'observation au sommet offre une vue qui s'étend jusqu'au désert du Nevada d'un côté et la Sierra Nevada de l'autre.",
    indicativeDuration: "1h30-2h",
    indicativePrice: "$$",
  },
  {
    slug: "sand-harbor-nevada",
    name: "Sand Harbor",
    zone: "lake-tahoe",
    categories: ["incontournables", "activites-famille"],
    lat: 39.1954, lng: -119.9304,
    description: "L'une des plages les plus photogéniques du lac Tahoe côté Nevada, avec de grands rochers de granit émergeant d'une eau turquoise cristalline.",
    whyVisit: "La plage la plus spectaculaire du lac, avec une eau d'une clarté exceptionnelle propice au snorkeling.",
    littleTip: "Le parking est limité et ferme dès qu'il est plein, parfois dès 9h en été — arrivez tôt ou utilisez la navette locale.",
    indicativeDuration: "2h-3h",
  },
  {
    slug: "vikingsholm-castle",
    name: "Vikingsholm Castle",
    zone: "lake-tahoe",
    categories: ["temples-patrimoine", "incontournables"],
    lat: 38.9530, lng: -120.1060,
    description: "Un manoir de style scandinave construit en 1929 au fond de la baie d'Emerald Bay, considéré comme l'un des meilleurs exemples d'architecture viking aux États-Unis.",
    whyVisit: "Une curiosité architecturale surprenante, accessible par une marche agréable depuis le point de vue d'Emerald Bay.",
    littleTip: "La randonnée pour y accéder descend environ 150 mètres — gardez de l'énergie pour la remontée, plus exigeante que l'aller.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "tahoe-city",
    name: "Tahoe City",
    zone: "lake-tahoe",
    categories: ["quartiers-balades", "activites-famille"],
    lat: 39.1657, lng: -120.1400,
    description: "Une petite ville animée sur la rive nord-ouest du lac, point de départ de la rivière Truckee où l'on peut descendre en radeau pendant l'été.",
    whyVisit: "Une bonne base pour explorer le côté nord du lac, avec de bonnes options de restaurants et d'activités nautiques.",
    littleTip: "La descente en radeau sur la rivière Truckee, depuis le centre-ville, est une activité estivale très prisée des familles.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "dl-bliss-state-park",
    name: "D.L. Bliss State Park",
    zone: "lake-tahoe",
    categories: ["activites-famille", "points-de-vue"],
    lat: 38.9900, lng: -120.1050,
    description: "Un parc d'État voisin d'Emerald Bay, avec la plage de Lester Beach et le sentier côtier Rubicon Trail offrant des vues continues sur le lac.",
    whyVisit: "Une alternative moins fréquentée à Emerald Bay, avec une plage agréable pour la baignade.",
    littleTip: "Le Rubicon Trail, qui longe la côte, est l'une des plus belles randonnées faciles de tout le lac Tahoe.",
    indicativeDuration: "2h-3h",
  },
  {
    slug: "donner-memorial-state-park",
    name: "Donner Memorial State Park",
    zone: "lake-tahoe",
    categories: ["temples-patrimoine", "activites-famille"],
    lat: 39.3238, lng: -120.2358,
    description: "Un parc dédié à la mémoire tragique du groupe de pionniers Donner, bloqué par la neige en 1846-1847, avec un musée racontant leur terrible hiver.",
    whyVisit: "Un épisode marquant de l'histoire de la conquête de l'Ouest américain, raconté avec soin et nuance.",
    littleTip: "Le lac Donner voisin, aujourd'hui lieu de loisirs paisible, porte le nom de ce même groupe de pionniers qui y passa un hiver tragique.",
    indicativeDuration: "1h-1h30",
  },

  // ---------- Death Valley National Park ----------
  {
    slug: "badwater-basin",
    name: "Badwater Basin",
    zone: "death-valley",
    categories: ["incontournables", "points-de-vue"],
    lat: 36.2500, lng: -116.8258,
    description: "Le point le plus bas d'Amérique du Nord, à 86 mètres sous le niveau de la mer, une étendue de sel craquelé à perte de vue au cœur de la Vallée de la Mort.",
    whyVisit: "Marcher littéralement sur le point le plus bas du continent, dans un paysage lunaire saisissant.",
    littleTip: "Évitez la marche en milieu de journée en été — les températures y comptent parmi les plus extrêmes de la planète.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "zabriskie-point",
    name: "Zabriskie Point",
    zone: "death-valley",
    categories: ["incontournables", "points-de-vue"],
    lat: 36.4269, lng: -116.8128,
    description: "Un point de vue emblématique sur des badlands aux couleurs dorées et ondulantes, érodées sur plusieurs millions d'années, particulièrement spectaculaire au lever du soleil.",
    whyVisit: "L'un des paysages les plus photographiés de toute la Vallée de la Mort, accessible directement depuis un parking.",
    littleTip: "Le lever de soleil, quand la lumière rasante sculpte les reliefs dorés, est le moment le plus spectaculaire pour visiter ce point de vue.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "mesquite-flat-dunes",
    name: "Mesquite Flat Sand Dunes",
    zone: "death-valley",
    categories: ["incontournables", "points-de-vue"],
    lat: 36.6936, lng: -117.1092,
    description: "Un champ de dunes de sable doré culminant à environ 30 mètres, les plus accessibles et les plus photographiées de tout le parc.",
    whyVisit: "L'image classique du désert californien, accessible à pied sans difficulté technique.",
    littleTip: "Les dunes sont les plus photogéniques au lever et au coucher du soleil, quand les ombres sculptent leur relief.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "artists-palette",
    name: "Artist's Palette",
    zone: "death-valley",
    categories: ["incontournables", "points-de-vue"],
    lat: 36.3581, lng: -116.8419,
    description: "Une colline aux couleurs minérales inhabituelles (rose, vert, violet, jaune), causées par l'oxydation de différents métaux présents dans la roche volcanique.",
    whyVisit: "L'un des paysages les plus colorés et surprenants de tout le parc, résultat d'une chimie géologique rare.",
    littleTip: "La lumière de fin d'après-midi fait ressortir les couleurs de façon bien plus spectaculaire qu'en milieu de journée.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "dantes-view",
    name: "Dante's View",
    zone: "death-valley",
    categories: ["incontournables", "points-de-vue"],
    lat: 36.2267, lng: -116.7256,
    description: "Un belvédère à plus de 1 600 mètres d'altitude, offrant une vue plongeante sur l'ensemble de Badwater Basin, 1 700 mètres plus bas.",
    whyVisit: "Le meilleur point de vue d'ensemble sur toute la Vallée de la Mort, avec une différence d'altitude vertigineuse.",
    littleTip: "La température peut chuter de plus de 10°C par rapport à la vallée en contrebas — prévoyez une petite laine même en été.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "furnace-creek",
    name: "Furnace Creek",
    zone: "death-valley",
    categories: ["incontournables", "activites-famille"],
    lat: 36.4622, lng: -116.8706,
    description: "Le centre névralgique du parc national, avec le centre des visiteurs, une oasis de palmiers et les relevés historiques des températures les plus élevées jamais enregistrées sur Terre.",
    whyVisit: "Le point de passage obligé pour s'informer sur le parc et faire le plein avant de poursuivre l'exploration.",
    littleTip: "Une température de 56,7°C y fut enregistrée en 1913, toujours considérée comme l'une des plus hautes jamais mesurées sur Terre.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "racetrack-playa",
    name: "Racetrack Playa",
    zone: "death-valley",
    categories: ["experiences-insolites", "points-de-vue"],
    lat: 36.6775, lng: -117.5633,
    description: "Un lac asséché mystérieux où de grosses pierres se déplacent seules sur plusieurs mètres, laissant des traces visibles, un phénomène scientifiquement expliqué seulement en 2014.",
    whyVisit: "L'un des phénomènes naturels les plus énigmatiques des États-Unis, longtemps resté totalement inexpliqué.",
    littleTip: "L'accès nécessite une piste non goudronnée de 43 km, praticable uniquement en véhicule à haute garde au sol.",
    indicativeDuration: "demi-journée (avec le trajet)",
  },
  {
    slug: "darwin-falls",
    name: "Darwin Falls",
    zone: "death-valley",
    categories: ["experiences-insolites", "activites-famille"],
    lat: 36.2700, lng: -117.3900,
    description: "Une cascade surprenante et une oasis verdoyante cachée au milieu du désert aride, alimentée par une source permanente toute l'année.",
    whyVisit: "Un contraste saisissant et rafraîchissant avec l'aridité générale du parc, véritable oasis cachée.",
    littleTip: "La randonnée pour y accéder, environ 3 km aller-retour, traverse un canyon étroit avant de déboucher sur la cascade.",
    indicativeDuration: "1h30-2h",
  },

  // ---------- Santa Barbara & Central Coast ----------
  {
    slug: "santa-barbara-mission",
    name: "Santa Barbara Mission",
    zone: "santa-barbara",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 34.4393, lng: -119.7138,
    description: "Surnommée \"la reine des missions\", la plus belle et la mieux préservée des 21 missions espagnoles de Californie, fondée en 1786.",
    whyVisit: "Le plus bel exemple d'architecture coloniale espagnole de Californie, avec des jardins et un cimetière historique.",
    littleTip: "Le petit musée attenant retrace l'histoire complète du système des missions espagnoles en Californie.",
    indicativeDuration: "1h-1h30",
  },
  {
    slug: "stearns-wharf",
    name: "Stearns Wharf",
    zone: "santa-barbara",
    categories: ["incontournables", "activites-famille"],
    lat: 34.4106, lng: -119.6855,
    description: "La plus ancienne jetée en activité de Californie, construite en 1872, avec restaurants de fruits de mer et vue sur les montagnes de Santa Ynez depuis l'océan.",
    whyVisit: "Un symbole historique de Santa Barbara, parfait pour un déjeuner de fruits de mer avec vue sur la baie.",
    littleTip: "La jetée est l'un des rares endroits de la côte californienne où montagnes et océan sont visibles dans la même perspective.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "santa-barbara-courthouse",
    name: "Santa Barbara County Courthouse",
    zone: "santa-barbara",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 34.4238, lng: -119.7016,
    description: "Un palais de justice de style hispano-mauresque de 1929, considéré comme l'un des plus beaux bâtiments publics des États-Unis, avec une tour offrant une vue panoramique gratuite.",
    whyVisit: "Un chef-d'œuvre architectural gratuit, avec l'une des meilleures vues gratuites sur toute la ville depuis sa tour.",
    littleTip: "La tour du palais de justice, accessible gratuitement par ascenseur, offre l'une des meilleures vues de toute la ville.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "state-street-santa-barbara",
    name: "State Street",
    zone: "santa-barbara",
    categories: ["shopping", "restaurants"],
    lat: 34.4190, lng: -119.6982,
    description: "L'artère commerçante principale de Santa Barbara, bordée d'architecture hispano-mauresque uniforme, de boutiques et de restaurants animés.",
    whyVisit: "Le meilleur axe pour le shopping et la restauration dans le centre de Santa Barbara.",
    littleTip: "De nombreux restaurants de la rue proposent des terrasses chauffées, agréables même en soirée fraîche.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "solvang",
    name: "Solvang",
    zone: "santa-barbara",
    categories: ["incontournables", "experiences-insolites"],
    lat: 34.5958, lng: -120.1376,
    description: "Un village fondé par des immigrants danois en 1911, qui a conservé une architecture scandinave authentique, moulins à vent compris, en plein cœur de la Californie.",
    whyVisit: "Un dépaysement architectural total et inattendu, à moins d'une heure de Santa Barbara.",
    littleTip: "Les pâtisseries danoises traditionnelles (æbleskiver) se trouvent dans plusieurs boulangeries du village, une spécialité à ne pas manquer.",
    indicativeDuration: "1h30-2h",
  },
  {
    slug: "santa-ynez-valley-wineries",
    name: "Santa Ynez Valley (vignobles)",
    zone: "santa-barbara",
    categories: ["incontournables", "points-de-vue"],
    lat: 34.6150, lng: -120.0820,
    description: "Une vallée viticole réputée pour ses pinots noirs, rendue mondialement célèbre par le film Sideways, avec des domaines nettement moins fréquentés que Napa.",
    whyVisit: "Une alternative plus tranquille et moins chère à la Napa Valley, pour une dégustation de vin décontractée.",
    littleTip: "Plusieurs domaines ayant servi de décor au film Sideways restent des étapes incontournables pour les fans du film.",
    indicativeDuration: "2h-3h",
    indicativePrice: "$$",
  },
  {
    slug: "channel-islands-national-park",
    name: "Channel Islands National Park",
    zone: "santa-barbara",
    categories: ["incontournables", "excursions"],
    lat: 34.2378, lng: -119.2942,
    description: "Un archipel sauvage au large de Ventura, surnommé \"les Galápagos d'Amérique du Nord\" pour son taux élevé d'espèces endémiques, accessible uniquement en bateau.",
    whyVisit: "L'un des parcs nationaux les moins fréquentés et les plus sauvages des États-Unis, à quelques kilomètres seulement de la côte.",
    littleTip: "Réservez le ferry depuis Ventura Harbor à l'avance — les traversées sont limitées et dépendent des conditions météo.",
    indicativeDuration: "1 journée complète",
    indicativePrice: "$$$",
  },

  // ---------- Joshua Tree National Park ----------
  {
    slug: "joshua-tree-national-park",
    name: "Joshua Tree National Park",
    zone: "joshua-tree",
    categories: ["incontournables", "points-de-vue"],
    lat: 33.8734, lng: -115.9010,
    description: "Un parc national désertique où se rencontrent deux écosystèmes distincts, peuplé des yuccas tordus qui donnent son nom au parc, sacrés pour les pionniers mormons qui les découvrirent.",
    whyVisit: "Un paysage désertique surréaliste unique au monde, entre formations rocheuses géantes et arbres de Josué emblématiques.",
    littleTip: "Le parc est particulièrement prisé pour l'observation des étoiles, loin de toute pollution lumineuse urbaine.",
    indicativeDuration: "1 journée",
  },
  {
    slug: "keys-view",
    name: "Keys View",
    zone: "joshua-tree",
    categories: ["incontournables", "points-de-vue"],
    lat: 33.9633, lng: -116.1875,
    description: "Un point de vue panoramique à 1 580 mètres d'altitude, offrant une vue sur la faille de San Andreas, la vallée de Coachella et, par temps clair, le Mexique au loin.",
    whyVisit: "Le meilleur panorama du parc, avec une vue qui s'étend jusqu'à la frontière mexicaine par temps dégagé.",
    littleTip: "Visitez tôt le matin — la pollution atmosphérique de la vallée de Coachella réduit souvent la visibilité en fin de journée.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "hidden-valley-joshua-tree",
    name: "Hidden Valley",
    zone: "joshua-tree",
    categories: ["incontournables", "activites-famille"],
    lat: 34.0089, lng: -116.1667,
    description: "Une vallée cachée entourée de formations rocheuses, autrefois utilisée selon la légende par des voleurs de bétail pour y cacher leurs prises.",
    whyVisit: "Une courte et facile boucle de randonnée qui résume parfaitement le paysage iconique du parc.",
    littleTip: "C'est aussi l'un des meilleurs spots d'escalade de blocs du parc — les grimpeurs s'y retrouvent nombreux le week-end.",
    indicativeDuration: "45 min-1h",
  },
  {
    slug: "skull-rock",
    name: "Skull Rock",
    zone: "joshua-tree",
    categories: ["incontournables", "experiences-insolites"],
    lat: 34.0011, lng: -116.1217,
    description: "Une formation rocheuse dont l'érosion a sculpté naturellement deux cavités évoquant les orbites d'un crâne géant, directement visible depuis la route principale.",
    whyVisit: "L'une des formations rocheuses les plus amusantes et reconnaissables du parc, accessible sans effort.",
    littleTip: "Le rocher se trouve juste à côté d'un parking sur la route principale — un arrêt rapide suffit pour la photo.",
    indicativeDuration: "15-20 min",
  },
  {
    slug: "cholla-cactus-garden",
    name: "Cholla Cactus Garden",
    zone: "joshua-tree",
    categories: ["incontournables", "points-de-vue"],
    lat: 33.9169, lng: -115.9308,
    description: "Une dense concentration naturelle de cactus cholla, surnommés \"teddy bear cholla\" pour leur aspect doux et pelucheux trompeur, en réalité couverts d'épines redoutables.",
    whyVisit: "Un paysage de cactus dense et unique, particulièrement photogénique au lever et au coucher du soleil.",
    littleTip: "Ne touchez jamais ces cactus malgré leur apparence douce — leurs épines se détachent au moindre contact et sont très difficiles à retirer.",
    indicativeDuration: "30-45 min",
  },
  {
    slug: "pioneertown",
    name: "Pioneertown",
    zone: "joshua-tree",
    categories: ["incontournables", "experiences-insolites"],
    lat: 34.1364, lng: -116.4639,
    description: "Un authentique décor de western construit en 1946 pour le tournage de films de cow-boys, devenu un vrai village habité avec son célèbre saloon encore en activité.",
    whyVisit: "Un décor de western grandeur nature, avec le Pappy & Harriet's, salle de concert et saloon culte du désert californien.",
    littleTip: "Pappy & Harriet's accueille régulièrement des concerts surprises d'artistes de renom, en plus de sa programmation régulière.",
    indicativeDuration: "1h30-2h",
    indicativePrice: "$$",
  },
];

const ZONE_DEFS = [
  {
    slug: "yosemite",
    name: "Yosemite National Park",
    mapColor: "#a8422c",
    vibeText: "Le parc national le plus emblématique de Californie, entre falaises de granit vertigineuses, cascades parmi les plus hautes d'Amérique du Nord et forêts de séquoias géants.",
    prosText: "Paysages parmi les plus spectaculaires au monde, grande variété de randonnées pour tous niveaux.",
    consText: "Très fréquenté en été dans la vallée principale — réservez l'entrée au parc à l'avance en haute saison.",
    transportText: "Navettes gratuites dans la vallée ; route Tioga et Glacier Point Road fermées en hiver.",
    nearbyText: "Sequoia et Kings Canyon se rejoignent en environ 2h30-3h de route vers le sud.",
    profileFitText: "Incontournable pour tout road trip en Californie, quel que soit le profil de voyage.",
    hotelAdviceText: "Réservez très à l'avance pour loger dans le parc même — les hébergements à l'intérieur de Yosemite se remplissent des mois en avance en été.",
  },
  {
    slug: "sequoia-kings-canyon",
    name: "Sequoia & Kings Canyon",
    mapColor: "#c9972e",
    vibeText: "Deux parcs nationaux jumeaux abritant les plus grands arbres vivants de la planète, entre forêts de séquoias géants et canyon granitique vertigineux.",
    prosText: "Les plus grands arbres du monde, nettement moins fréquenté que Yosemite.",
    consText: "Routes de montagne sinueuses, certaines fermées en hiver selon l'enneigement.",
    transportText: "Voiture indispensable ; prévoir du temps pour les routes de montagne sinueuses entre les zones du parc.",
    nearbyText: "Yosemite se rejoint en environ 2h30-3h de route vers le nord.",
    profileFitText: "Pour les passionnés de nature et de grands espaces, loin de la foule de Yosemite.",
    hotelAdviceText: "Quelques hébergements simples dans le parc ou dans les villages voisins de Three Rivers et Grant Grove.",
  },
  {
    slug: "big-sur",
    name: "Big Sur & Highway 1",
    mapColor: "#2e86ab",
    vibeText: "L'un des plus beaux tronçons côtiers du monde, entre ponts vertigineux, cascades plongeant dans l'océan et villages artistiques comme Carmel-by-the-Sea.",
    prosText: "Paysages côtiers exceptionnels, excellente gastronomie, villages pittoresques à chaque étape.",
    consText: "La Highway 1 peut être fermée temporairement après des glissements de terrain — vérifiez son état avant de partir.",
    transportText: "Voiture indispensable sur la Highway 1, route sinueuse à conduire de préférence de jour.",
    nearbyText: "Napa et Sonoma se rejoignent en environ 3h30-4h de route vers le nord.",
    profileFitText: "Incontournable pour tout road trip californien, parmi les plus belles routes côtières du monde.",
    hotelAdviceText: "Réservez tôt pour Big Sur même, les hébergements y étant limités et très demandés ; Carmel offre plus d'options.",
  },
  {
    slug: "napa-sonoma",
    name: "Napa & Sonoma",
    mapColor: "#d6479a",
    vibeText: "Les deux vallées viticoles les plus prestigieuses des États-Unis, entre dégustations de grands crus, châteaux insolites et sources thermales naturelles.",
    prosText: "La référence américaine du vin, excellente gastronomie, paysages viticoles photogéniques.",
    consText: "Très fréquenté le week-end, prix élevés dans les domaines les plus prestigieux.",
    transportText: "Voiture indispensable ; prévoyez un conducteur désigné ou des excursions organisées avec dégustation.",
    nearbyText: "Lake Tahoe se rejoint en environ 3h-3h30 de route vers l'est.",
    profileFitText: "Pour les amateurs de vin et de gastronomie, sur une à plusieurs journées.",
    hotelAdviceText: "De nombreux hôtels de charme et resorts spa, à réserver bien à l'avance en haute saison estivale.",
  },
  {
    slug: "lake-tahoe",
    name: "Lake Tahoe",
    mapColor: "#8f2d2d",
    vibeText: "Le plus grand lac alpin d'Amérique du Nord, aux eaux turquoise cristallines, entouré de sommets de la Sierra Nevada, entre baignade estivale et ski l'hiver.",
    prosText: "Eau exceptionnellement claire, paysages alpins spectaculaires, activités été comme hiver.",
    consText: "Très fréquenté l'été sur les plages les plus connues — arrivez tôt pour les meilleurs spots.",
    transportText: "Voiture indispensable pour faire le tour du lac ; parking limité aux plages les plus populaires en été.",
    nearbyText: "Napa et Sonoma se rejoignent en environ 3h-3h30 de route vers l'ouest.",
    profileFitText: "Pour les amateurs de nature alpine et de baignade en eau claire, été comme hiver.",
    hotelAdviceText: "South Lake Tahoe concentre l'essentiel des hébergements, à réserver à l'avance en haute saison.",
  },
  {
    slug: "death-valley",
    name: "Death Valley National Park",
    mapColor: "#2a7a8c",
    vibeText: "Le parc national le plus extrême des États-Unis, entre point le plus bas d'Amérique du Nord, dunes dorées et phénomènes géologiques encore mystérieux.",
    prosText: "Paysages désertiques uniques au monde, très peu fréquenté en dehors de quelques points de vue.",
    consText: "Chaleur extrême en été (souvent plus de 45°C) — prévoyez beaucoup d'eau et évitez les randonnées en milieu de journée.",
    transportText: "Voiture indispensable, avec plein d'essence fait avant d'entrer dans le parc — les stations-service y sont rares et chères.",
    nearbyText: "Las Vegas, hors de ce guide, se trouve à environ 2h de route à l'est pour qui prolonge le voyage.",
    profileFitText: "Pour les amateurs de paysages désertiques extrêmes, idéalement en dehors de l'été.",
    hotelAdviceText: "Peu d'hébergements dans le parc même — Furnace Creek concentre l'essentiel des options, à réserver à l'avance.",
  },
  {
    slug: "santa-barbara",
    name: "Santa Barbara & Central Coast",
    mapColor: "#3f8c5a",
    vibeText: "La côte centrale californienne, entre mission espagnole emblématique, village danois insolite et îles sauvages au large, surnommée \"la Riviera américaine\".",
    prosText: "Architecture hispano-mauresque élégante, excellente gastronomie, climat agréable toute l'année.",
    consText: "Nécessite du temps supplémentaire si vous ajoutez l'excursion aux Channel Islands.",
    transportText: "Voiture indispensable sur la Highway 101 et pour rejoindre Solvang et la Santa Ynez Valley.",
    nearbyText: "Los Angeles, déjà couvert par son propre guide, se trouve à environ 2h de route au sud.",
    profileFitText: "Pour une étape élégante et ensoleillée entre Big Sur et le désert, avec une gastronomie de qualité.",
    hotelAdviceText: "De nombreux hôtels de charme dans le centre historique, à réserver à l'avance en haute saison estivale.",
  },
  {
    slug: "joshua-tree",
    name: "Joshua Tree National Park",
    mapColor: "#a8422c",
    vibeText: "Un paysage désertique surréaliste où se rencontrent deux écosystèmes, peuplé d'arbres de Josué tordus et de formations rocheuses géantes, paradis de l'observation des étoiles.",
    prosText: "Paysage unique au monde, excellent pour l'escalade et l'observation des étoiles, accès facile depuis Los Angeles.",
    consText: "Chaleur extrême en été — préférez le printemps ou l'automne pour une visite plus confortable.",
    transportText: "Voiture indispensable ; peu d'ombre sur les sentiers, prévoyez de l'eau en quantité.",
    nearbyText: "Palm Springs, hors de ce guide, se trouve à environ 45 minutes de route au sud-ouest.",
    profileFitText: "Pour les amateurs de paysages désertiques, d'escalade et d'astronomie, en fin de road trip avant Los Angeles.",
    hotelAdviceText: "Pioneertown et Joshua Tree Village offrent des hébergements de charme, souvent réservés par ceux qui veulent observer les étoiles la nuit.",
  },
];

async function main() {
  console.log("Seeding Californie destination…");

  const usa = await prisma.country.upsert({
    where: { slug: "etats-unis" },
    update: {},
    create: { slug: "etats-unis", name: "États-Unis" },
  });

  const californie = await prisma.destination.upsert({
    where: { slug: "californie" },
    update: { status: "PUBLISHED" },
    create: {
      countryId: usa.id,
      slug: "californie",
      name: "Californie",
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
    where: { id: californie.id },
    data: {
      categories: {
        set: ENABLED_CATEGORIES.map((slug) => ({ id: categoryBySlug.get(slug)!.id })),
      },
    },
  });

  const zoneBySlug = new Map<string, { id: string }>();
  for (const z of ZONE_DEFS) {
    const zone = await prisma.zone.upsert({
      where: { destinationId_slug: { destinationId: californie.id, slug: z.slug } },
      update: {
        name: z.name, mapColor: z.mapColor, vibeText: z.vibeText, prosText: z.prosText,
        consText: z.consText, transportText: z.transportText, nearbyText: z.nearbyText,
        profileFitText: z.profileFitText, hotelAdviceText: z.hotelAdviceText,
      },
      create: { destinationId: californie.id, ...z },
    });
    zoneBySlug.set(z.slug, zone);
  }

  let manifest: PhotoManifestEntry[] = [];
  try {
    manifest = JSON.parse(
      await readFile(
        "/private/tmp/claude-501/-Users-constance/f6c42bbe-3c4a-4229-b982-d00b14542e1b/scratchpad/photos_californie/manifest.json",
        "utf-8"
      )
    );
  } catch {
    console.log("No photo manifest found yet — seeding without photos.");
  }

  // Final accepted photos live in seed-assets/californie-photos/<slug>.jpg
  // (resized, false positives already excluded) — same pattern as every
  // other destination this session. The Dockerfile bakes this folder
  // into storage/photos at build time.
  const PHOTOS_DIR = "seed-assets/californie-photos";

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
        name: def.name, destinationId: californie.id, zoneId: zone?.id, status: "PUBLISHED",
        lat: def.lat, lng: def.lng, description: def.description, whyVisit: def.whyVisit,
        littleTip: def.littleTip, indicativeDuration: def.indicativeDuration,
        indicativePrice: def.indicativePrice, isFictionalDemo: false,
      },
      create: {
        slug: def.slug, destinationId: californie.id, zoneId: zone?.id, name: def.name,
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

  console.log(`Californie seed complete: ${PLACES.length} places, ${photoCount} with real photos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
