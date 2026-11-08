/**
 * Zurich — built from the admin "Nouvelle destination" request queue
 * ("Zurich, Suisse", ~80 lieux). Suisse étant un pays entièrement
 * nouveau pour l'app, le kit pays est créé séparément dans
 * seed-suisse-kit.ts (upsert idempotent, partagé avec la destination
 * Genève construite en parallèle par une autre session). Même pattern
 * que les autres destinations : lieux réels, coordonnées vérifiées,
 * pas de zoo (Zoo Zürich explicitement exclu), pas de photos pour
 * cette passe de seed.
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

// Pas de photos sourcées pour cette passe de seed.
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
  // ---------- Vieille ville (Altstadt) ----------
  {
    slug: "grossmunster",
    name: "Grossmünster",
    zone: "altstadt",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 47.3701, lng: 8.5444,
    description: "L'église romane aux deux tours jumelles qui domine la rive droite de la Limmat, fondée selon la légende par Charlemagne et point de départ de la Réforme zurichoise menée par Zwingli au XVIe siècle.",
    whyVisit: "Le monument le plus emblématique de la skyline de Zurich, avec des vitraux d'Augusto Giacometti et une crypte romane rare.",
    littleTip: "La montée dans l'une des tours (Karlsturm) offre la meilleure vue d'ensemble sur la vieille ville et la Limmat.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "fraumunster",
    name: "Fraumünster",
    zone: "altstadt",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 47.3692, lng: 8.5410,
    description: "Une ancienne abbaye de moniales fondée au IXe siècle, devenue église protestante, célèbre pour ses cinq vitraux réalisés par Marc Chagall dans les années 1970.",
    whyVisit: "Les vitraux de Chagall, baignés de bleu et de rouge profonds, comptent parmi les œuvres d'art les plus émouvantes de Zurich.",
    littleTip: "La lumière est la plus belle en fin de matinée, quand le soleil traverse directement les vitraux du chœur.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "st-peterskirche",
    name: "Église Saint-Pierre",
    zone: "altstadt",
    categories: ["temples-patrimoine"],
    lat: 47.3706, lng: 8.5406,
    description: "La plus ancienne paroisse de Zurich, dont le clocher porte la plus grande horloge d'Europe (8,7 mètres de diamètre), visible depuis presque toute la vieille ville.",
    whyVisit: "Un repère visuel incontournable de la vieille ville, juste à côté du Lindenhof.",
    littleTip: "Le veilleur de nuit guettait autrefois les incendies depuis cette tour — une fonction maintenue jusqu'en 1911.",
    indicativeDuration: "20 min",
  },
  {
    slug: "lindenhof",
    name: "Lindenhof",
    zone: "altstadt",
    categories: ["incontournables", "points-de-vue"],
    lat: 47.3717, lng: 8.5401,
    description: "Une place ombragée de tilleuls sur une butte qui domine la Limmat, bâtie sur le site d'un ancien castrum romain puis d'un palais carolingien.",
    whyVisit: "La meilleure vue gratuite sur la vieille ville et les tours du Grossmünster, surtout au coucher du soleil.",
    littleTip: "Des joueurs d'échecs géants s'installent régulièrement sur les grands échiquiers en plein air de la place.",
    indicativeDuration: "20 à 30 min",
  },
  {
    slug: "rathaus-zurich",
    name: "Hôtel de ville de Zurich",
    zone: "altstadt",
    categories: ["temples-patrimoine"],
    lat: 47.3719, lng: 8.5434,
    description: "Un hôtel de ville baroque du XVIIe siècle construit directement au-dessus de la Limmat, encore aujourd'hui le siège du parlement cantonal et du conseil municipal.",
    whyVisit: "Un des rares bâtiments administratifs encore en activité construit littéralement sur une rivière.",
    littleTip: "Depuis le quai juste en face, on voit bien les piliers du bâtiment plonger directement dans l'eau.",
    indicativeDuration: "15 min (extérieur)",
  },
  {
    slug: "wasserkirche",
    name: "Wasserkirche",
    zone: "altstadt",
    categories: ["temples-patrimoine"],
    lat: 47.3705, lng: 8.5445,
    description: "Une église gothique tardive accolée au Grossmünster, bâtie sur l'îlot où, selon la légende, les saints Félix et Régula auraient été martyrisés.",
    whyVisit: "Un petit bijou gothique souvent ignoré des visiteurs pressés, juste derrière le Grossmünster.",
    littleTip: "La statue de Zwingli, à l'extérieur, le représente une épée à la main — une image qui a longtemps fait débat.",
    indicativeDuration: "15 à 20 min",
  },
  {
    slug: "munsterbrucke",
    name: "Pont du Münster",
    zone: "altstadt",
    categories: ["points-de-vue"],
    lat: 47.3697, lng: 8.5427,
    description: "Le pont piéton qui relie le Fraumünster au Grossmünster, offrant l'un des panoramas les plus photographiés de Zurich sur la Limmat et les deux rives.",
    whyVisit: "Le meilleur point de vue pour photographier les deux grandes églises de Zurich dans un même cadre.",
    littleTip: "Au crépuscule, les lumières des deux rives se reflètent dans la Limmat — un moment idéal pour une photo.",
    indicativeDuration: "10 min",
  },
  {
    slug: "zunfthaus-zur-meisen",
    name: "Zunfthaus zur Meisen",
    zone: "altstadt",
    categories: ["temples-patrimoine"],
    lat: 47.3698, lng: 8.5420,
    description: "Une ancienne maison de guilde baroque du XVIIIe siècle en bord de Limmat, qui abrite aujourd'hui la collection de céramique et de porcelaine du Musée national suisse.",
    whyVisit: "Une collection de porcelaine suisse du XVIIIe siècle dans un cadre baroque exceptionnellement bien conservé.",
    littleTip: "La façade donnant sur le Münsterhof est l'une des plus élégantes de toute la vieille ville.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "augustinergasse",
    name: "Augustinergasse",
    zone: "altstadt",
    categories: ["quartiers-balades"],
    lat: 47.3714, lng: 8.5399,
    description: "Une ruelle pavée bordée de maisons à encorbellements et d'oriels colorés, considérée comme l'une des plus photogéniques de la vieille ville de Zurich.",
    whyVisit: "La carte postale vivante de la vieille ville zurichoise, avec ses façades peintes et ses bow-windows en bois sculpté.",
    littleTip: "Les drapeaux et bannières suspendus entre les façades changent selon les saisons et les fêtes locales.",
    indicativeDuration: "15 min",
  },
  {
    slug: "weinplatz",
    name: "Weinplatz",
    zone: "altstadt",
    categories: ["quartiers-balades"],
    lat: 47.3708, lng: 8.5429,
    description: "Une petite place en bord de Limmat qui doit son nom au commerce de vin qui s'y pratiquait au Moyen Âge, aujourd'hui bordée de cafés avec vue sur la rivière.",
    whyVisit: "Une terrasse avec vue directe sur l'eau, à deux pas du pont du Münster.",
    littleTip: "C'est l'un des meilleurs points pour observer les baigneurs qui descendent la Limmat à la nage en été.",
    indicativeDuration: "20 min",
  },
  {
    slug: "munsterhof",
    name: "Münsterhof",
    zone: "altstadt",
    categories: ["quartiers-balades"],
    lat: 47.3696, lng: 8.5415,
    description: "La grande place pavée devant le Fraumünster, entourée de maisons de guildes historiques et transformée en patinoire ou marché selon les saisons.",
    whyVisit: "Une des plus belles places de la vieille ville, encadrée par des façades baroques et le Fraumünster.",
    littleTip: "En décembre, un marché de Noël s'y installe, plus intime que celui de la gare centrale.",
    indicativeDuration: "15 à 20 min",
  },
  {
    slug: "schipfe",
    name: "Schipfe",
    zone: "altstadt",
    categories: ["quartiers-balades", "experiences-insolites"],
    lat: 47.3722, lng: 8.5389,
    description: "Le plus ancien quartier artisanal de Zurich, en contrebas du Lindenhof au bord de la Limmat, où subsistent encore quelques ateliers de métiers traditionnels.",
    whyVisit: "Un coin tranquille et authentique de la vieille ville, loin de la foule de la Bahnhofstrasse.",
    littleTip: "Quelques artisans (relieurs, orfèvres) y travaillent encore vitrine ouverte sur la rue, comme au Moyen Âge.",
    indicativeDuration: "20 à 30 min",
  },
  {
    slug: "landesmuseum",
    name: "Musée national suisse (Landesmuseum)",
    zone: "altstadt",
    categories: ["temples-patrimoine"],
    lat: 47.3784, lng: 8.5391,
    description: "Un château néo-gothique construit en 1898 juste derrière la gare centrale, qui retrace l'histoire de la Suisse depuis la préhistoire jusqu'au XXe siècle à travers une collection foisonnante.",
    whyVisit: "Le meilleur endroit pour comprendre l'histoire et l'identité suisses avant d'explorer le reste du pays.",
    littleTip: "L'entrée est gratuite le premier samedi du mois — un bon plan pour visiter sans contrainte de budget.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "platzspitz-park",
    name: "Parc Platzspitz",
    zone: "altstadt",
    categories: ["quartiers-balades"],
    lat: 47.3822, lng: 8.5386,
    description: "Un parc triangulaire au confluent de la Limmat et de la Sihl, juste derrière le Landesmuseum, aujourd'hui paisible après avoir connu une période difficile dans les années 1990.",
    whyVisit: "Un espace vert bien situé pour une pause pique-nique entre la gare et la vieille ville.",
    littleTip: "La pointe du parc, exactement au confluent des deux rivières, offre un angle de vue inhabituel sur l'eau.",
    indicativeDuration: "30 min",
  },
  {
    slug: "zeughauskeller",
    name: "Zeughauskeller",
    zone: "altstadt",
    categories: ["restaurants"],
    lat: 47.3715, lng: 8.5392,
    description: "Un ancien arsenal médiéval transformé en immense brasserie-restaurant, réputé pour ses plâtées de viande, ses saucisses et ses bières suisses servies sous des voûtes en pierre.",
    whyVisit: "L'adresse la plus emblématique pour goûter une cuisine suisse copieuse dans un décor historique spectaculaire.",
    littleTip: "La carte propose une quarantaine de saucisses différentes — un bon point de repère pour découvrir la charcuterie suisse.",
    indicativeDuration: "1h à 1h30",
    indicativePrice: "CHF 25-40 le plat",
  },
  {
    slug: "hiltl",
    name: "Hiltl",
    zone: "altstadt",
    categories: ["restaurants"],
    lat: 47.3732, lng: 8.5370,
    description: "Le plus ancien restaurant végétarien du monde encore en activité, fondé en 1898, avec un immense buffet au poids mêlant influences indiennes, suisses et méditerranéennes.",
    whyVisit: "Une institution reconnue par le Guinness des records, idéale pour un repas végétarien copieux et varié.",
    littleTip: "Le buffet se paie au poids — composez une petite assiette pour tester avant de vous resservir.",
    indicativeDuration: "1h",
    indicativePrice: "CHF 20-35 au buffet",
  },
  {
    slug: "widder-bar",
    name: "Widder Bar",
    zone: "altstadt",
    categories: ["bars-rooftops"],
    lat: 47.3725, lng: 8.5398,
    description: "Le bar feutré de l'hôtel Widder, installé dans un ensemble de maisons médiévales rénovées sur Rennweg, réputé pour son impressionnante collection de whiskies et son ambiance jazz.",
    whyVisit: "Un cadre historique raffiné pour un verre, loin de l'agitation de la Bahnhofstrasse toute proche.",
    littleTip: "Des concerts de jazz live y sont organisés certains soirs — mieux vaut vérifier le programme avant de venir.",
    indicativeDuration: "1h à 2h",
    indicativePrice: "CHF 20-30 le cocktail",
  },
  {
    slug: "zunfthaus-zur-waag",
    name: "Zunfthaus zur Waag",
    zone: "altstadt",
    categories: ["restaurants"],
    lat: 47.3695, lng: 8.5413,
    description: "Une ancienne maison de guilde des tisserands et tanneurs du XVIIe siècle, sur le Münsterhof, transformée en restaurant de cuisine suisse traditionnelle raffinée.",
    whyVisit: "Un cadre de guilde historique authentique pour goûter des classiques suisses comme le filet de perche ou le rösti.",
    littleTip: "La terrasse d'été sur le Münsterhof offre une des plus belles vues à table de la vieille ville.",
    indicativeDuration: "1h à 1h30",
    indicativePrice: "CHF 35-55 le plat",
  },

  // ---------- Niederdorf ----------
  {
    slug: "niederdorfstrasse",
    name: "Niederdorfstrasse",
    zone: "niederdorf",
    categories: ["quartiers-balades", "bars-rooftops"],
    lat: 47.3735, lng: 8.5445,
    description: "La rue piétonne principale du Niederdorf, bordée sur toute sa longueur de bars, petits restaurants et boutiques, qui concentre l'essentiel de la vie nocturne de la vieille ville.",
    whyVisit: "Le meilleur endroit à Zurich pour une soirée animée, avec un vrai choix de bars et de cuisines du monde.",
    littleTip: "L'ambiance change du tout au tout entre le jour, calme et touristique, et la nuit, nettement plus festive.",
    indicativeDuration: "1h à 2h (en soirée)",
  },
  {
    slug: "spiegelgasse",
    name: "Spiegelgasse",
    zone: "niederdorf",
    categories: ["experiences-insolites", "temples-patrimoine"],
    lat: 47.3719, lng: 8.5437,
    description: "Une ruelle étroite du Niederdorf où Lénine a vécu en exil en 1916-1917, à quelques mètres seulement du Cabaret Voltaire où naissait au même moment le mouvement Dada.",
    whyVisit: "Une concentration improbable d'histoire du XXe siècle sur quelques mètres de pavés.",
    littleTip: "Une plaque discrète au numéro 14 marque l'ancien appartement de Lénine, facile à manquer si l'on ne la cherche pas.",
    indicativeDuration: "10 à 15 min",
  },
  {
    slug: "cabaret-voltaire",
    name: "Cabaret Voltaire",
    zone: "niederdorf",
    categories: ["experiences-insolites", "temples-patrimoine"],
    lat: 47.3717, lng: 8.5439,
    description: "Le local où le mouvement artistique Dada est né en 1916, fondé par Hugo Ball et Emmy Hennings, aujourd'hui musée, café et espace d'exposition sur l'avant-garde du XXe siècle.",
    whyVisit: "Le berceau d'un des mouvements artistiques les plus influents du siècle dernier, dans son lieu d'origine exact.",
    littleTip: "Le café du rez-de-chaussée, ouvert à tous, permet de voir l'espace sans payer l'entrée du musée à l'étage.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "predigerkirche",
    name: "Predigerkirche",
    zone: "niederdorf",
    categories: ["temples-patrimoine"],
    lat: 47.3747, lng: 8.5433,
    description: "Une église gothique dont le haut clocher baroque, ajouté au XVIIIe siècle, dépasse légèrement en hauteur les tours du Grossmünster voisin.",
    whyVisit: "Un clocher souvent sous-estimé, avec un intérieur gothique dépouillé caractéristique de la Réforme zurichoise.",
    littleTip: "L'ancien couvent attenant abrite aujourd'hui une partie de la bibliothèque centrale de Zurich.",
    indicativeDuration: "15 à 20 min",
  },
  {
    slug: "central-platz",
    name: "Central",
    zone: "niederdorf",
    categories: ["quartiers-balades"],
    lat: 47.3775, lng: 8.5420,
    description: "Le grand carrefour de trams au pied du pont qui mène à la gare centrale, point de jonction entre le Niederdorf, l'université et l'ETH Zurich en contrebas de la colline.",
    whyVisit: "Un nœud de circulation animé, pratique comme repère pour rejoindre à pied la vieille ville ou l'ETH.",
    littleTip: "Des escaliers et ascenseurs publics permettent de monter directement de Central vers le campus de l'ETH, en hauteur.",
    indicativeDuration: "10 min",
  },
  {
    slug: "kunsthaus-zurich",
    name: "Kunsthaus Zürich",
    zone: "niederdorf",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 47.3705, lng: 8.5478,
    description: "Le principal musée d'art de Zurich, qui réunit l'une des plus riches collections d'art moderne et contemporain de Suisse, d'Edvard Munch à Alberto Giacometti, agrandi en 2021 par une extension signée David Chipperfield.",
    whyVisit: "Une des collections d'art les plus importantes de Suisse, dans un bâtiment historique prolongé par une extension contemporaine remarquable.",
    littleTip: "L'extension Chipperfield abrite aussi la collection Bührle, controversée pour sa provenance — un bon sujet pour les visites guidées.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "hechtplatz",
    name: "Hechtplatz",
    zone: "niederdorf",
    categories: ["quartiers-balades"],
    lat: 47.3718, lng: 8.5450,
    description: "Une petite place tranquille au cœur du Niederdorf, avec une fontaine et un théâtre municipal, en retrait de l'agitation de Niederdorfstrasse.",
    whyVisit: "Une pause calme à deux pas de l'animation du Niederdorf.",
    littleTip: "Les terrasses de café ici sont souvent moins bondées que celles de la rue principale, à quelques mètres seulement.",
    indicativeDuration: "15 min",
  },
  {
    slug: "urania-sternwarte",
    name: "Observatoire Urania",
    zone: "niederdorf",
    categories: ["experiences-insolites", "points-de-vue"],
    lat: 47.3734, lng: 8.5430,
    description: "Un petit observatoire public installé au sommet d'une tour Art nouveau depuis 1907, qui permet d'observer les étoiles en plein centre-ville à travers un télescope historique.",
    whyVisit: "Une activité insolite et accessible à tous pour observer le ciel sans sortir de la ville.",
    littleTip: "Les soirées d'observation ouvertes au public ont lieu seulement certains soirs — vérifiez le calendrier avant de venir.",
    indicativeDuration: "1h (soirée d'observation)",
    indicativePrice: "environ CHF 10",
  },
  {
    slug: "neumarkt",
    name: "Neumarkt",
    zone: "niederdorf",
    categories: ["quartiers-balades"],
    lat: 47.3732, lng: 8.5460,
    description: "Une ruelle calme et verdoyante du Niederdorf, bordée de maisons bourgeoises du XVIIIe siècle et d'un petit théâtre indépendant, nettement moins fréquentée que Niederdorfstrasse.",
    whyVisit: "Un visage plus résidentiel et paisible du Niederdorf, à deux pas de l'agitation touristique.",
    littleTip: "Quelques vignes grimpent encore sur certaines façades, souvenir d'un vignoble urbain disparu.",
    indicativeDuration: "15 à 20 min",
  },
  {
    slug: "oepfelchammer",
    name: "Oepfelchammer",
    zone: "niederdorf",
    categories: ["restaurants", "experiences-insolites"],
    lat: 47.3728, lng: 8.5452,
    description: "Une taverne du XVIIe siècle dans le Niederdorf, fréquentée jadis par l'écrivain Gottfried Keller, où la tradition veut que l'on grave son nom au plafond après avoir vidé un verre de vin en position acrobatique.",
    whyVisit: "L'une des plus anciennes et des plus pittoresques tavernes de Zurich, pleine d'histoire littéraire locale.",
    littleTip: "Le rituel du verre de vin bu allongé sur une poutre, pour graver son nom au plafond, se pratique encore — mais prudence recommandée.",
    indicativeDuration: "1h à 1h30",
    indicativePrice: "CHF 30-45 le plat",
  },

  // ---------- Bahnhofstrasse et bord du lac ----------
  {
    slug: "hauptbahnhof",
    name: "Gare centrale de Zurich",
    zone: "bahnhofstrasse-lakefront",
    categories: ["incontournables", "temples-patrimoine"],
    lat: 47.3779, lng: 8.5403,
    description: "La plus grande gare de Suisse, un hall monumental du XIXe siècle qui sert aussi de point de départ à la Bahnhofstrasse, avec une étonnante sculpture suspendue d'un ange bleu signée Niki de Saint Phalle.",
    whyVisit: "Un hub ferroviaire impressionnant d'efficacité suisse, et une porte d'entrée naturelle vers la Bahnhofstrasse.",
    littleTip: "L'ange bleu suspendu de Niki de Saint Phalle, dans le hall principal, surprend toujours les visiteurs qui ne la remarquent pas en entrant.",
    indicativeDuration: "20 à 30 min",
  },
  {
    slug: "bahnhofstrasse",
    name: "Bahnhofstrasse",
    zone: "bahnhofstrasse-lakefront",
    categories: ["incontournables", "shopping"],
    lat: 47.3720, lng: 8.5395,
    description: "L'avenue la plus chère de Suisse, qui relie la gare centrale au lac de Zurich sur 1,4 km, bordée de boutiques de luxe et de sièges bancaires discrets, sans la moindre enseigne tape-à-l'œil.",
    whyVisit: "Une des artères commerçantes les plus prestigieuses d'Europe, entièrement piétonne et arborée de platanes.",
    littleTip: "Les coffres-forts des grandes banques suisses se trouveraient, dit-on, directement sous la chaussée, le long du tracé du tram.",
    indicativeDuration: "45 min à 1h (en marchant)",
  },
  {
    slug: "paradeplatz",
    name: "Paradeplatz",
    zone: "bahnhofstrasse-lakefront",
    categories: ["quartiers-balades"],
    lat: 47.3692, lng: 8.5390,
    description: "La place centrale de la Bahnhofstrasse, encadrée par les sièges historiques d'UBS et Credit Suisse, qui symbolise à elle seule la puissance financière suisse.",
    whyVisit: "Le cœur symbolique de la place financière suisse, et un carrefour de trams pratique pour s'orienter.",
    littleTip: "Malgré son nom grandiose, la place elle-même est assez sobre — l'intérêt est surtout symbolique et historique.",
    indicativeDuration: "10 min",
  },
  {
    slug: "confiserie-spruengli",
    name: "Confiserie Sprüngli",
    zone: "bahnhofstrasse-lakefront",
    categories: ["cafes-brunchs", "shopping"],
    lat: 47.3694, lng: 8.5389,
    description: "La confiserie-institution de Zurich depuis 1836, sur Paradeplatz, célèbre pour ses Luxemburgerli (mini macarons suisses) et son chocolat, avec un salon de thé à l'étage.",
    whyVisit: "L'adresse historique pour goûter les Luxemburgerli, bien plus légers que les macarons français.",
    littleTip: "Évitez l'heure du déjeuner, où la file au comptoir peut s'allonger — privilégiez plutôt la fin de matinée.",
    indicativeDuration: "30 à 45 min",
    indicativePrice: "CHF 2-3 le Luxemburgerli",
  },
  {
    slug: "beyer-uhrenmuseum",
    name: "Musée de l'horlogerie Beyer",
    zone: "bahnhofstrasse-lakefront",
    categories: ["temples-patrimoine", "shopping"],
    lat: 47.3697, lng: 8.5394,
    description: "Un petit musée gratuit installé en sous-sol de la boutique horlogère Beyer, fondée en 1760, qui retrace l'histoire de la mesure du temps depuis l'Égypte ancienne jusqu'aux montres suisses contemporaines.",
    whyVisit: "Une curiosité méconnue et gratuite sur la Bahnhofstrasse, pour qui s'intéresse à l'horlogerie suisse.",
    littleTip: "L'entrée du musée, discrète, se trouve au sous-sol de la boutique — demandez simplement au personnel.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "burkliplatz",
    name: "Bürkliplatz",
    zone: "bahnhofstrasse-lakefront",
    categories: ["quartiers-balades", "marches"],
    lat: 47.3664, lng: 8.5411,
    description: "La place au bout de la Bahnhofstrasse, à la pointe où le lac de Zurich commence, point de départ des bateaux de la compagnie de navigation et site d'un marché aux puces le samedi en saison.",
    whyVisit: "La transition naturelle entre la ville et le lac, et le point de départ de toutes les croisières sur le lac de Zurich.",
    littleTip: "Le marché aux puces du samedi matin (de mai à octobre) est un bon moment pour chiner des objets suisses anciens.",
    indicativeDuration: "20 à 30 min",
  },
  {
    slug: "quaibrucke",
    name: "Quaibrücke",
    zone: "bahnhofstrasse-lakefront",
    categories: ["points-de-vue"],
    lat: 47.3671, lng: 8.5425,
    description: "Le pont qui marque la frontière exacte entre la Limmat et le lac de Zurich, offrant par temps clair une vue dégagée jusqu'aux sommets alpins au sud.",
    whyVisit: "L'un des rares points de Zurich où lac, rivière et Alpes se laissent voir dans un même panorama.",
    littleTip: "Par temps clair après un passage de foehn, les Alpes glaronnaises se découpent nettement à l'horizon depuis ce pont.",
    indicativeDuration: "10 à 15 min",
  },
  {
    slug: "sechselautenplatz",
    name: "Sechseläutenplatz",
    zone: "bahnhofstrasse-lakefront",
    categories: ["quartiers-balades"],
    lat: 47.3656, lng: 8.5477,
    description: "La plus grande place pavée d'Europe sans voitures, aménagée devant l'Opéra, qui accueille chaque printemps le feu du Böögg lors de la fête traditionnelle du Sechseläuten.",
    whyVisit: "Un vaste espace ouvert en bord de lac, animé par des événements et marchés toute l'année.",
    littleTip: "Lors du Sechseläuten (troisième lundi d'avril), un bonhomme de neige en coton bourré d'explosifs y est brûlé pour prédire l'été.",
    indicativeDuration: "15 à 20 min",
  },
  {
    slug: "opernhaus-zurich",
    name: "Opéra de Zurich",
    zone: "bahnhofstrasse-lakefront",
    categories: ["temples-patrimoine"],
    lat: 47.3656, lng: 8.5479,
    description: "Un opéra néo-baroque du XIXe siècle en bord de lac, dont la troupe et l'orchestre comptent parmi les plus réputés d'Europe germanique.",
    whyVisit: "Une salle de spectacle élégante pour qui veut assister à un opéra ou un ballet lors de son séjour.",
    littleTip: "Des places debout, très abordables, sont vendues le soir même directement à la billetterie.",
    indicativeDuration: "2h à 3h (représentation)",
    indicativePrice: "dès CHF 15 en places debout",
  },
  {
    slug: "cafe-odeon",
    name: "Café Odeon",
    zone: "bahnhofstrasse-lakefront",
    categories: ["cafes-brunchs", "experiences-insolites"],
    lat: 47.3661, lng: 8.5456,
    description: "Un café littéraire Belle Époque près de Bellevue, fréquenté dans les années 1910-1920 par Lénine, James Joyce, Mussolini et Einstein, resté largement inchangé depuis.",
    whyVisit: "Un décor Art nouveau authentique chargé d'histoire intellectuelle européenne du début du XXe siècle.",
    littleTip: "Le café reste ouvert tard et sert aussi de bar nocturne, dans la continuité de son passé bohème.",
    indicativeDuration: "45 min à 1h",
    indicativePrice: "CHF 6-8 le café",
  },
  {
    slug: "bellevue-platz",
    name: "Bellevue",
    zone: "bahnhofstrasse-lakefront",
    categories: ["quartiers-balades"],
    lat: 47.3660, lng: 8.5451,
    description: "Le grand carrefour de trams entre la vieille ville, l'Opéra et le lac, considéré comme le véritable centre géographique et social de Zurich.",
    whyVisit: "Un point de repère incontournable pour s'orienter et changer de tram vers n'importe quel quartier.",
    littleTip: "C'est aussi le point de départ le plus pratique pour rejoindre le quartier de Seefeld à pied en longeant le lac.",
    indicativeDuration: "10 min",
  },
  {
    slug: "fifa-museum",
    name: "Musée FIFA du football mondial",
    zone: "bahnhofstrasse-lakefront",
    categories: ["experiences-insolites", "activites-famille"],
    lat: 47.3635, lng: 8.5317,
    description: "Le musée officiel de la FIFA, dont le siège mondial se trouve à Zurich, qui retrace l'histoire des Coupes du monde à travers plus de 1 000 objets, dont d'authentiques trophées et maillots.",
    whyVisit: "Une étape incontournable pour tout passionné de football, avec le vrai trophée de la Coupe du monde exposé par rotation.",
    littleTip: "Le billet combiné avec l'entrée seule (sans activités interactives) est nettement moins cher — à choisir si vous êtes pressé.",
    indicativeDuration: "1h30 à 2h",
    indicativePrice: "CHF 24 adulte",
  },
  {
    slug: "museum-rietberg",
    name: "Musée Rietberg",
    zone: "bahnhofstrasse-lakefront",
    categories: ["temples-patrimoine"],
    lat: 47.3589, lng: 8.5304,
    description: "Le musée d'art extra-européen de Zurich, installé dans une villa du XIXe siècle au cœur du parc Rieter, avec une entrée contemporaine en verre et une riche collection d'art asiatique, africain et précolombien.",
    whyVisit: "Une collection d'art non-occidental remarquable, dans un cadre de parc paisible loin de l'agitation du centre.",
    littleTip: "Le parc Rieter autour du musée vaut une promenade à lui seul, avec de vieux arbres et une vue sur le lac.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "mythenquai-strandbad",
    name: "Strandbad Mythenquai",
    zone: "bahnhofstrasse-lakefront",
    categories: ["quartiers-balades", "activites-famille"],
    lat: 47.3500, lng: 8.5330,
    description: "Un bain public historique en bord de lac sur la rive ouest, avec plongeoirs en bois, pelouses et vue dégagée sur les Alpes par temps clair, très fréquenté par les Zurichois en été.",
    whyVisit: "Le meilleur endroit pour se baigner dans le lac de Zurich comme un habitant, avec vue sur les Alpes.",
    littleTip: "L'eau du lac de Zurich est officiellement contrôlée et baignable tout l'été, propreté rare pour un lac urbain.",
    indicativeDuration: "2h à 3h",
    indicativePrice: "environ CHF 8",
  },
  {
    slug: "arboretum-zurich",
    name: "Arboretum de Zurich",
    zone: "bahnhofstrasse-lakefront",
    categories: ["quartiers-balades"],
    lat: 47.3555, lng: 8.5310,
    description: "Un parc arboré en bord de lac planté de plus de 500 espèces d'arbres du monde entier, aménagé au début du XXe siècle sur une ancienne presqu'île artificielle.",
    whyVisit: "Une promenade verte et peu fréquentée en bord de lac, idéale pour échapper à la foule du centre.",
    littleTip: "Le sentier côtier continue directement vers le Strandbad Mythenquai, pour prolonger la balade jusqu'à la baignade.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "jelmoli",
    name: "Jelmoli",
    zone: "bahnhofstrasse-lakefront",
    categories: ["shopping"],
    lat: 47.3736, lng: 8.5386,
    description: "Le plus grand magasin de Suisse, fondé en 1833, installé dans un bâtiment Art nouveau classé juste à côté de la Bahnhofstrasse, avec un vaste choix de marques suisses et internationales.",
    whyVisit: "Un grand magasin historique pratique pour du shopping sous un même toit, de la mode à l'épicerie fine suisse.",
    littleTip: "Le rayon épicerie fine au sous-sol est un bon endroit pour acheter du chocolat ou du fromage suisse à emporter.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "bauschanzli",
    name: "Bauschänzli",
    zone: "bahnhofstrasse-lakefront",
    categories: ["bars-rooftops", "quartiers-balades"],
    lat: 47.3680, lng: 8.5421,
    description: "Un ancien bastion fortifié du XVIIe siècle transformé en îlot-jardin avec un bar en plein air, posé directement sur la Limmat juste avant qu'elle ne rejoigne le lac.",
    whyVisit: "Un des rares bars en plein air posés littéralement sur l'eau, idéal pour un verre en fin d'après-midi d'été.",
    littleTip: "Le bar ferme en hiver — une adresse à réserver pour la belle saison, entre avril et septembre.",
    indicativeDuration: "1h",
    indicativePrice: "CHF 8-14 la bière",
  },
  {
    slug: "haus-konstruktiv",
    name: "Museum Haus Konstruktiv",
    zone: "bahnhofstrasse-lakefront",
    categories: ["temples-patrimoine"],
    lat: 47.3697, lng: 8.5325,
    description: "Un musée consacré à l'art constructif, concret et conceptuel, installé dans une ancienne centrale électrique au bord de la Sihl, qui prolonge l'héritage de l'art concret zurichois de Max Bill.",
    whyVisit: "Une collection pointue d'art géométrique et minimaliste, dans une ancienne architecture industrielle réhabilitée.",
    littleTip: "Le café du musée, au bord de la Sihl, est un bon point de pause tranquille entre deux visites du centre.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "kronenhalle",
    name: "Kronenhalle",
    zone: "bahnhofstrasse-lakefront",
    categories: ["restaurants", "bars-rooftops"],
    lat: 47.3665, lng: 8.5459,
    description: "Un restaurant-institution près de Bellevue, fréquenté depuis les années 1920 par James Joyce, Alberto Giacometti ou Richard Burton, dont les murs portent d'authentiques œuvres de Picasso, Miró et Chagall.",
    whyVisit: "Une cuisine suisse classique servie sous d'authentiques toiles de maîtres modernes, un cas unique à Zurich.",
    littleTip: "Le bar attenant, plus informel que la salle de restaurant, permet de profiter du lieu sans réserver de table.",
    indicativeDuration: "1h30 à 2h",
    indicativePrice: "CHF 45-70 le plat",
  },

  // ---------- Zürich West ----------
  {
    slug: "prime-tower",
    name: "Prime Tower",
    zone: "zurich-west",
    categories: ["points-de-vue", "bars-rooftops"],
    lat: 47.3860, lng: 8.5172,
    description: "La plus haute tour de Suisse (126 mètres), emblème de la transformation de l'ancien quartier industriel en pôle d'affaires, avec un bar-restaurant panoramique au 35e étage.",
    whyVisit: "La meilleure vue en hauteur sur Zurich et les Alpes par temps clair, depuis le bar Clouds au sommet.",
    littleTip: "Pas besoin de réserver une table pour monter : s'installer au bar du Clouds suffit à profiter de la vue.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "freitag-tower",
    name: "Freitag Tower",
    zone: "zurich-west",
    categories: ["shopping", "experiences-insolites"],
    lat: 47.3886, lng: 8.5177,
    description: "Le magasin phare de la marque suisse Freitag, empilement de dix-sept conteneurs maritimes recyclés formant une tour de 26 mètres, où sont vendus les célèbres sacs en bâches de camion recyclées.",
    whyVisit: "Une architecture aussi insolite que le concept du magasin : des sacs uniques taillés dans de vraies bâches usagées.",
    littleTip: "Une plateforme d'observation gratuite tout en haut de la tour offre une vue surprenante sur les voies ferrées et Zürich West.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "im-viadukt",
    name: "Im Viadukt",
    zone: "zurich-west",
    categories: ["shopping", "marches", "street-food"],
    lat: 47.3845, lng: 8.5180,
    description: "Un viaduc ferroviaire du XIXe siècle dont les arches ont été transformées en une galerie marchande continue, mêlant boutiques de créateurs, cavistes et une halle de marché couverte.",
    whyVisit: "Une reconversion réussie d'architecture industrielle en lieu de vie, shopping et restauration dans un même espace.",
    littleTip: "La halle de marché (Markthalle) regroupe plusieurs stands de street food de qualité, pratique pour un déjeuner varié.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "frau-gerolds-garten",
    name: "Frau Gerolds Garten",
    zone: "zurich-west",
    categories: ["bars-rooftops", "street-food"],
    lat: 47.3862, lng: 8.5178,
    description: "Un bar-jardin éphémère installé dans des conteneurs maritimes empilés, avec des cabanes-stands de street food et des chaises longues, en plein cœur du quartier industriel de Zürich West.",
    whyVisit: "L'ambiance la plus décontractée et estivale de Zürich West, parfaite pour un verre en soirée.",
    littleTip: "L'endroit est surtout ouvert d'avril à octobre — vérifiez les horaires saisonniers avant de vous y rendre en hiver.",
    indicativeDuration: "1h à 2h",
    indicativePrice: "CHF 7-12 la bière",
  },
  {
    slug: "schiffbau",
    name: "Schiffbau",
    zone: "zurich-west",
    categories: ["experiences-insolites", "bars-rooftops"],
    lat: 47.3885, lng: 8.5183,
    description: "Un ancien chantier de construction navale et de machines industrielles, reconverti en un vaste complexe culturel réunissant le Schauspielhaus (théâtre), une salle de jazz et des restaurants sous une immense halle métallique.",
    whyVisit: "Un cas d'école de reconversion industrielle réussie, où théâtre, jazz et gastronomie coexistent sous un même toit.",
    littleTip: "Le club de jazz à l'intérieur programme régulièrement des concerts, souvent moins chers que dans le centre-ville.",
    indicativeDuration: "1h à 2h",
  },
  {
    slug: "loewenbraukunst",
    name: "Löwenbräukunst",
    zone: "zurich-west",
    categories: ["temples-patrimoine"],
    lat: 47.3920, lng: 8.5222,
    description: "Une ancienne brasserie du XIXe siècle reconvertie en pôle d'art contemporain, qui réunit sous un même toit la Kunsthalle Zürich, le Migros Museum für Gegenwartskunst et plusieurs galeries privées.",
    whyVisit: "La meilleure concentration d'art contemporain expérimental de Zurich, en dehors du Kunsthaus classique.",
    littleTip: "Plusieurs galeries de l'immeuble sont gratuites — une façon économique de voir beaucoup d'art en une seule visite.",
    indicativeDuration: "1h à 1h30",
  },
  {
    slug: "puls5",
    name: "Puls 5",
    zone: "zurich-west",
    categories: ["experiences-insolites"],
    lat: 47.3903, lng: 8.5260,
    description: "Une ancienne fonderie industrielle du XIXe siècle à la halle métallique impressionnante, aujourd'hui transformée en espace d'événements, restaurants et petit casino.",
    whyVisit: "Une architecture industrielle spectaculaire, en particulier la grande halle vitrée visible même sans entrer dans un événement.",
    littleTip: "Jetez un œil à l'intérieur même sans événement prévu : la structure métallique d'origine reste visible depuis le hall public.",
    indicativeDuration: "30 min",
  },
  {
    slug: "toni-areal",
    name: "Toni-Areal",
    zone: "zurich-west",
    categories: ["points-de-vue", "cafes-brunchs"],
    lat: 47.3875, lng: 8.5100,
    description: "L'ancienne plus grande laiterie d'Europe, reconvertie en campus de la Haute école des arts de Zurich (ZHdK), avec un café-restaurant sur le toit offrant une vue dégagée sur la ville.",
    whyVisit: "Une vue panoramique gratuite depuis le toit, moins connue que celle de la Prime Tower.",
    littleTip: "Le café du rooftop (Gleis) est ouvert au public, pas seulement aux étudiants — accès libre à la terrasse.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "josefwiese",
    name: "Josefwiese",
    zone: "zurich-west",
    categories: ["quartiers-balades", "activites-famille"],
    lat: 47.3845, lng: 8.5195,
    description: "La principale pelouse publique du quartier des Fünf (Kreis 5), très fréquentée par les familles et les joueurs de pétanque ou de football improvisés en soirée.",
    whyVisit: "Un espace vert vivant et local, loin des parcs plus touristiques du bord du lac.",
    littleTip: "Les terrains de pétanque gratuits sont souvent occupés en soirée par des habitants du quartier, bon public à observer.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "kalkbreite",
    name: "Kalkbreite",
    zone: "zurich-west",
    categories: ["experiences-insolites", "restaurants"],
    lat: 47.3765, lng: 8.5222,
    description: "Une coopérative d'habitation primée construite directement au-dessus d'un dépôt de trams, avec un restaurant et un café ouverts au public autour d'une cour intérieure végétalisée.",
    whyVisit: "Un exemple remarquable d'architecture coopérative urbaine suisse, avec un restaurant accueillant pour le public.",
    littleTip: "La cour intérieure, accessible librement, offre une vue sur l'ingénieuse structure qui enjambe les voies de tram.",
    indicativeDuration: "45 min (avec un repas)",
    indicativePrice: "CHF 20-30 le plat",
  },
  {
    slug: "flussbad-oberer-letten",
    name: "Flussbad Oberer Letten",
    zone: "zurich-west",
    categories: ["quartiers-balades", "activites-famille"],
    lat: 47.3870, lng: 8.5350,
    description: "Une baignade publique aménagée directement dans la Limmat, où les Zurichois se laissent porter par le courant de la rivière en été, entre pelouses et kiosques à boissons.",
    whyVisit: "Une baignade en rivière urbaine rafraîchissante, typique du mode de vie estival zurichois.",
    littleTip: "Le courant est plus fort qu'il ne paraît — mieux vaut entrer en amont et se laisser porter jusqu'à l'échelle de sortie.",
    indicativeDuration: "1h à 2h",
  },
  {
    slug: "razzia",
    name: "Razzia",
    zone: "zurich-west",
    categories: ["restaurants", "bars-rooftops"],
    lat: 47.3862, lng: 8.5205,
    description: "Une ancienne salle de cinéma des années 1950 transformée en grande brasserie animée, avec une mezzanine façon cabaret et une cuisine internationale servie jusque tard le soir.",
    whyVisit: "Une atmosphère de grande brasserie européenne, avec un décor théâtral hérité de son passé de cinéma.",
    littleTip: "Le bar reste ouvert bien après la cuisine, pour qui veut prolonger la soirée sans changer d'adresse.",
    indicativeDuration: "1h30 à 2h",
    indicativePrice: "CHF 30-45 le plat",
  },
  {
    slug: "caduffs-wine-loft",
    name: "Caduff's Wine Loft",
    zone: "zurich-west",
    categories: ["bars-rooftops", "restaurants"],
    lat: 47.3798, lng: 8.5230,
    description: "Un bar à vins et restaurant dans un ancien loft industriel du quartier des Fünf, réputé pour sa carte de vins suisses et sa cuisine de saison soignée.",
    whyVisit: "Une des meilleures adresses pour découvrir les vins suisses, encore trop peu exportés hors des frontières du pays.",
    littleTip: "Demandez conseil au personnel pour un vin suisse méconnu — la carte dépasse largement les crus genevois ou valaisans habituels.",
    indicativeDuration: "1h30 à 2h",
    indicativePrice: "CHF 40-60 le plat",
  },

  // ---------- Seefeld ----------
  {
    slug: "zurichhorn-park",
    name: "Parc de Zürichhorn",
    zone: "seefeld",
    categories: ["quartiers-balades", "activites-famille"],
    lat: 47.3534, lng: 8.5536,
    description: "Un grand parc en pointe sur la rive gauche du lac, avec de vastes pelouses, une sculpture monumentale de Jean Tinguely et un accès direct à la baignade.",
    whyVisit: "Le plus grand espace vert en bord de lac du côté Seefeld, parfait pour un pique-nique ou une sieste au soleil.",
    littleTip: "La sculpture cinétique « Heureka » de Jean Tinguely, au bord de l'eau, mérite qu'on s'y attarde quelques minutes.",
    indicativeDuration: "45 min à 1h",
  },
  {
    slug: "chinagarten",
    name: "Chinagarten",
    zone: "seefeld",
    categories: ["experiences-insolites", "quartiers-balades"],
    lat: 47.3544, lng: 8.5519,
    description: "Un jardin chinois traditionnel offert à Zurich par la ville de Kunming en 1994, avec pavillons, bassins et rochers soigneusement composés selon les principes du jardin classique chinois.",
    whyVisit: "Une parenthèse dépaysante inattendue en plein parc du Zürichhorn, symbole du jumelage entre Zurich et Kunming.",
    littleTip: "Le jardin est particulièrement photogénique tôt le matin, quand la lumière rase les pavillons sans la foule de l'après-midi.",
    indicativeDuration: "30 à 45 min",
    indicativePrice: "environ CHF 5",
  },
  {
    slug: "centre-le-corbusier",
    name: "Centre Le Corbusier (Pavillon Heidi Weber)",
    zone: "seefeld",
    categories: ["temples-patrimoine", "experiences-insolites"],
    lat: 47.3517, lng: 8.5540,
    description: "Le seul bâtiment construit par Le Corbusier en Suisse, un pavillon d'exposition en acier et verre coloré conçu juste avant sa mort en 1965, posé en bord de lac près du Zürichhorn.",
    whyVisit: "Une pièce architecturale rare et testamentaire de l'un des plus grands architectes du XXe siècle.",
    littleTip: "Le pavillon n'est ouvert au public qu'à horaires restreints — mieux vaut vérifier les jours d'ouverture avant de venir spécialement.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "seefeld-quai",
    name: "Quai de Seefeld",
    zone: "seefeld",
    categories: ["quartiers-balades"],
    lat: 47.3580, lng: 8.5520,
    description: "La promenade au bord du lac qui longe le quartier résidentiel chic de Seefeld, bordée de villas du XIXe siècle et de petits pontons privés.",
    whyVisit: "Une promenade résidentielle élégante, loin de la foule, avec une vue dégagée sur le lac et la rive opposée.",
    littleTip: "C'est l'un des meilleurs quartiers pour observer les cygnes et canards du lac de très près, en toute tranquillité.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "johann-jacobs-museum",
    name: "Johann Jacobs Museum",
    zone: "seefeld",
    categories: ["temples-patrimoine"],
    lat: 47.3550, lng: 8.5480,
    description: "Un petit musée installé dans une villa du quartier de Seefeld, consacré à l'histoire culturelle du café à travers le monde, fondé par la famille derrière le groupe Jacobs.",
    whyVisit: "Un musée de niche original pour qui s'intéresse à l'histoire et aux routes commerciales du café.",
    littleTip: "Les expositions changent régulièrement de thématique — mieux vaut vérifier le programme en cours avant de visiter.",
    indicativeDuration: "45 min",
  },
  {
    slug: "tiefenbrunnen-strandbad",
    name: "Strandbad Tiefenbrunnen",
    zone: "seefeld",
    categories: ["quartiers-balades", "activites-famille"],
    lat: 47.3487, lng: 8.5563,
    description: "Un bain public en bord de lac à l'extrémité du quartier de Seefeld, plus familial et moins fréquenté que les grands bains du centre-ville.",
    whyVisit: "Une baignade dans le lac nettement plus tranquille que les bains proches du centre, avec un vrai esprit de quartier.",
    littleTip: "Le bateau du lac s'arrête directement devant le bain — une façon agréable d'y accéder depuis le Bürkliplatz.",
    indicativeDuration: "1h30 à 2h",
    indicativePrice: "environ CHF 8",
  },
  {
    slug: "stadtgaertnerei",
    name: "Jardins municipaux de Zurich (serres tropicales)",
    zone: "seefeld",
    categories: ["quartiers-balades", "experiences-insolites"],
    lat: 47.3605, lng: 8.5500,
    description: "Les serres municipales de Zurich, ouvertes gratuitement au public, qui abritent une collection surprenante de plantes tropicales et de cactées en plein cœur d'un quartier résidentiel.",
    whyVisit: "Une curiosité gratuite et méconnue, parfaite pour une pause chaleur en hiver ou un moment calme en famille.",
    littleTip: "L'entrée est entièrement gratuite et peu connue des touristes — l'une des meilleures adresses discrètes de la ville.",
    indicativeDuration: "30 à 45 min",
  },

  // ---------- Excursions autour de Zurich ----------
  {
    slug: "uetliberg",
    name: "Üetliberg",
    zone: "excursions",
    categories: ["excursions", "points-de-vue"],
    lat: 47.3494, lng: 8.4914,
    description: "Le sommet boisé qui domine Zurich au sud-ouest (870 m), surnommé la « montagne des Zurichois », accessible en train depuis la gare centrale en une vingtaine de minutes.",
    whyVisit: "Le meilleur panorama sur Zurich, le lac et les Alpes par temps clair, accessible sans voiture.",
    littleTip: "La tour d'observation métallique au sommet ajoute encore quelques mètres de hauteur à la vue déjà dégagée.",
    indicativeDuration: "demi-journée",
  },
  {
    slug: "felsenegg",
    name: "Felsenegg",
    zone: "excursions",
    categories: ["excursions", "points-de-vue"],
    lat: 47.3228, lng: 8.4897,
    description: "Un belvédère accessible par téléphérique depuis Adliswil, relié à l'Üetliberg par une crête de randonnée (le « sentier des planètes ») qui matérialise le système solaire à l'échelle 1 pour 1 milliard.",
    whyVisit: "Une randonnée courte et ludique, à combiner avec l'Üetliberg pour une demi-journée complète dans les hauteurs de Zurich.",
    littleTip: "Le sentier des planètes permet de parcourir le système solaire miniature en une petite heure de marche entre les deux sommets.",
    indicativeDuration: "2h à 3h (avec la randonnée)",
  },
  {
    slug: "albisguetli",
    name: "Albisgüetli",
    zone: "excursions",
    categories: ["excursions", "experiences-insolites"],
    lat: 47.3550, lng: 8.5010,
    description: "Un vaste domaine de restauration et de stands de tir en lisière de forêt, au pied de l'Üetliberg, qui accueille chaque année le plus grand concours de tir populaire de Suisse, le Knabenschiessen.",
    whyVisit: "Une tradition locale authentique et une vue dégagée sur la ville depuis la lisière de la forêt zurichoise.",
    littleTip: "Le Knabenschiessen, mi-septembre, transforme le site en immense fête populaire avec fête foraine et tir sportif.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "rapperswil",
    name: "Rapperswil",
    zone: "excursions",
    categories: ["excursions", "temples-patrimoine"],
    lat: 47.2273, lng: 8.8155,
    description: "Une petite ville médiévale sur une presqu'île à l'extrémité est du lac de Zurich, dominée par un château du XIIIe siècle et reliée au bateau ou au train depuis Zurich en moins d'une heure.",
    whyVisit: "Une escapade lacustre pittoresque, idéale en combinant le trajet aller en bateau et le retour en train.",
    littleTip: "La croisière en bateau depuis le Bürkliplatz jusqu'à Rapperswil (environ 2h) est en elle-même l'une des plus belles excursions de la région.",
    indicativeDuration: "demi-journée à journée complète",
  },
  {
    slug: "seedamm-holzbrucke",
    name: "Pont de bois du Seedamm",
    zone: "excursions",
    categories: ["excursions", "experiences-insolites"],
    lat: 47.2270, lng: 8.7870,
    description: "Le plus long pont en bois de Suisse (environ 840 mètres), qui enjambe l'étranglement du lac de Zurich entre Rapperswil et le village de Hurden, reconstruit sur le tracé d'un passage utilisé depuis l'âge du bronze.",
    whyVisit: "Une traversée piétonne insolite au ras de l'eau, doublée d'un site archéologique parmi les plus anciens de Suisse.",
    littleTip: "Le pont se traverse uniquement à pied ou à vélo — comptez environ 15 minutes pour la traversée complète.",
    indicativeDuration: "30 à 45 min",
  },
  {
    slug: "kusnacht",
    name: "Küsnacht",
    zone: "excursions",
    categories: ["excursions", "quartiers-balades"],
    lat: 47.3217, lng: 8.5786,
    description: "Un village lacustre cossu sur la rive droite du lac de Zurich, à une vingtaine de minutes du centre en train ou en bateau, où l'écrivain James Joyce et le psychanalyste Carl Gustav Jung ont vécu.",
    whyVisit: "Une rive du lac nettement plus résidentielle et verdoyante, facile à combiner avec une croisière sur le lac.",
    littleTip: "La maison où vécut Carl Gustav Jung, avec son inscription latine gravée au-dessus de la porte, se trouve toujours au bord du lac.",
    indicativeDuration: "2h à 3h",
  },
  {
    slug: "rheinfall",
    name: "Chutes du Rhin (Rheinfall)",
    zone: "excursions",
    categories: ["excursions", "incontournables"],
    lat: 47.6775, lng: 8.6153,
    description: "La plus puissante cascade d'Europe, où le Rhin se précipite sur 23 mètres de hauteur et 150 mètres de largeur, à environ 45 minutes de train de Zurich près de Schaffhouse.",
    whyVisit: "Un spectacle naturel impressionnant, accessible en excursion à la journée depuis Zurich sans voiture.",
    littleTip: "Un petit bateau permet de s'approcher jusqu'au rocher central planté en plein milieu des chutes, sensations garanties.",
    indicativeDuration: "journée complète (avec le trajet)",
  },
  {
    slug: "winterthur",
    name: "Winterthur",
    zone: "excursions",
    categories: ["excursions", "temples-patrimoine"],
    lat: 47.5001, lng: 8.7240,
    description: "La sixième ville de Suisse, à environ 25 minutes de train de Zurich, réputée pour sa remarquable concentration de musées d'art financés par d'anciennes fortunes industrielles locales.",
    whyVisit: "Une densité de musées d'art rare pour une ville de cette taille, dans une vieille ville agréable et moins touristique que Zurich.",
    littleTip: "Le musée Oskar Reinhart am Stadtgarten et la Fondation Oskar Reinhart réunissent une collection impressionniste de niveau international.",
    indicativeDuration: "demi-journée à journée complète",
  },
  {
    slug: "kyburg-castle",
    name: "Château de Kyburg",
    zone: "excursions",
    categories: ["excursions", "temples-patrimoine"],
    lat: 47.4545, lng: 8.7625,
    description: "L'un des plus grands châteaux médiévaux de Suisse, siège de la puissante famille des Habsbourg-Kyburg au XIIIe siècle, près de Winterthur, avec donjon, chapelle et salles d'armes visitables.",
    whyVisit: "Un château médiéval remarquablement complet, à combiner facilement avec une visite de Winterthur.",
    littleTip: "La gare de Kyburg, à quelques minutes de marche du château, permet d'y venir directement en train depuis Winterthur ou Zurich.",
    indicativeDuration: "1h30 à 2h",
  },
  {
    slug: "lindt-home-of-chocolate",
    name: "Lindt Home of Chocolate",
    zone: "excursions",
    categories: ["excursions", "experiences-insolites"],
    lat: 47.3185, lng: 8.5509,
    description: "Le musée-vitrine du chocolatier suisse Lindt à Kilchberg, au bord du lac à une quinzaine de minutes de Zurich, avec la plus grande fontaine de chocolat du monde et un parcours sur l'histoire du cacao.",
    whyVisit: "Une immersion gourmande et ludique dans l'histoire du chocolat suisse, accessible en transports publics depuis Zurich.",
    littleTip: "Réservez votre billet en ligne à l'avance : les créneaux horaires se remplissent vite, surtout le week-end.",
    indicativeDuration: "1h30 à 2h",
    indicativePrice: "CHF 18 adulte",
  },
  {
    slug: "technorama",
    name: "Technorama",
    zone: "excursions",
    categories: ["excursions", "activites-famille"],
    lat: 47.4847, lng: 8.7220,
    description: "Le plus grand centre de sciences interactif de Suisse, à Winterthur, où plus de 500 expériences pratiques permettent de manipuler soi-même des phénomènes physiques et scientifiques.",
    whyVisit: "Une excursion scientifique ludique particulièrement adaptée aux familles avec enfants.",
    littleTip: "Prévoyez une demi-journée entière : le centre est bien plus vaste qu'il ne paraît depuis l'entrée.",
    indicativeDuration: "demi-journée",
    indicativePrice: "CHF 32 adulte",
  },

  // ---------- Aéroport ----------
  {
    slug: "aeroport-zurich",
    name: "Aéroport de Zurich (Kloten)",
    zone: "aeroport",
    categories: [],
    lat: 47.4502, lng: 8.5616,
    description: "L'aéroport international de Zurich, à environ 10 km au nord du centre-ville, l'un des mieux connectés d'Europe en train direct.",
    whyVisit: "Repère pratique pour organiser son arrivée ou son départ de Zurich.",
    littleTip: "Le train direct relie l'aéroport à la gare centrale en 10 à 13 minutes seulement, sans correspondance.",
  },
];

const ZONE_DEFS = [
  {
    slug: "altstadt",
    name: "Vieille ville (Altstadt)",
    mapColor: "#a8422c",
    vibeText: "Le cœur historique de Zurich, entre les deux tours jumelles du Grossmünster et les flèches plus discrètes du Fraumünster, où ruelles pavées, églises romanes et maisons de guildes se serrent le long de la Limmat.",
    prosText: "Une concentration exceptionnelle de patrimoine médiéval et roman, entièrement piétonne et compacte.",
    consText: "Très fréquentée en journée en haute saison, en particulier autour du Lindenhof et de la Bahnhofstrasse.",
    transportText: "Entièrement piéton depuis la gare centrale, à 10-15 minutes à pied de la plupart des sites.",
    nearbyText: "Niederdorf et la Bahnhofstrasse sont à quelques minutes à pied de part et d'autre de la Limmat.",
    profileFitText: "Incontournable pour tout séjour à Zurich, quel que soit le profil de voyage.",
    hotelAdviceText: "Loger dans la vieille ville permet de tout faire à pied, mais à un prix nettement plus élevé qu'ailleurs en ville.",
  },
  {
    slug: "niederdorf",
    name: "Niederdorf",
    mapColor: "#2e86ab",
    vibeText: "Le réseau serré de ruelles médiévales sur la rive droite de la Limmat, où bars, petits restaurants et boutiques se succèdent sous des façades colorées — le quartier qui a vu naître le mouvement Dada.",
    prosText: "L'un des rares quartiers de Zurich vraiment animé en soirée, avec une vraie densité de bars et petits restaurants.",
    consText: "Peut devenir bruyant et bondé le week-end en soirée, surtout autour de Niederdorfstrasse.",
    transportText: "Entièrement piéton, à cheval entre la gare centrale et le pont du Münster.",
    nearbyText: "Le Grossmünster et la vieille ville rive gauche sont à 5 minutes à pied via le pont du Münster.",
    profileFitText: "Pour la vie nocturne et une ambiance plus informelle que la vieille ville rive gauche.",
    hotelAdviceText: "Quartier vivant pour loger si l'on ne craint pas l'animation en soirée, avec de bons rapports qualité-prix.",
  },
  {
    slug: "bahnhofstrasse-lakefront",
    name: "Bahnhofstrasse et bord du lac",
    mapColor: "#c9972e",
    vibeText: "L'artère la plus chère de Suisse, qui descend tout droit de la gare centrale jusqu'au lac de Zurich, où banques discrètes, grands magasins et confiseries historiques côtoient des quais ombragés de platanes.",
    prosText: "Shopping de luxe, grandes institutions culturelles et promenades au bord du lac, tout sur un seul axe.",
    consText: "Les prix dans les boutiques et cafés de la Bahnhofstrasse elle-même sont parmi les plus élevés de Suisse.",
    transportText: "Trams fréquents sur toute la longueur de la rue, entièrement piétonne dans sa partie centrale.",
    nearbyText: "Le Bürkliplatz, au bout de la rue, est le point de départ des bateaux sur le lac de Zurich.",
    profileFitText: "Pour le shopping, les grandes institutions culturelles et une promenade au bord du lac.",
    hotelAdviceText: "Les hôtels ici sont parmi les plus prestigieux et chers de la ville, mais très centraux.",
  },
  {
    slug: "zurich-west",
    name: "Zürich West",
    mapColor: "#8f2d2d",
    vibeText: "L'ancien quartier industriel de Zurich, entre anciennes usines transformées en lofts, bars et galeries, dominé par la silhouette verte de la Prime Tower — le Zurich le plus créatif et le moins guindé.",
    prosText: "L'énergie la plus créative et la plus jeune de Zurich, avec une vraie scène de bars et de street food.",
    consText: "Plus excentré que le centre historique, et moins pittoresque au premier regard malgré son charme industriel.",
    transportText: "Tram ou S-Bahn jusqu'à Hardbrücke, à 10-15 minutes du centre-ville.",
    nearbyText: "Le fleuve Limmat et la baignade du Flussbad Oberer Letten sont à quelques minutes à pied.",
    profileFitText: "Pour une soirée alternative, de la street food et une architecture industrielle réhabilitée.",
    hotelAdviceText: "Quartier en plein essor avec des adresses plus abordables qu'en vieille ville, pour qui ne craint pas l'ambiance industrielle.",
  },
  {
    slug: "seefeld",
    name: "Seefeld",
    mapColor: "#3f8c5a",
    vibeText: "Le quartier résidentiel chic de la rive gauche du lac, entre villas cossues, parcs ombragés et le jardin chinois posé sur la pointe du Zürichhorn.",
    prosText: "Les meilleurs parcs en bord de lac de la ville, loin de la foule du centre, parfaits pour une pause ou une baignade.",
    consText: "Peu de sites à proprement visiter, plutôt une destination de promenade et de détente qu'une liste de monuments.",
    transportText: "Tram depuis Bellevue ou à pied le long du quai depuis le centre-ville (20-30 minutes).",
    nearbyText: "Le Bellevue et l'Opéra de Zurich sont à l'extrémité nord-ouest du quartier, à pied depuis la Bahnhofstrasse.",
    profileFitText: "Pour une pause nature et baignade en bord de lac, à l'écart du rythme du centre.",
    hotelAdviceText: "Quartier résidentiel calme, bonne option pour qui préfère éviter l'agitation du centre tout en restant bien connecté.",
  },
  {
    slug: "excursions",
    name: "Excursions autour de Zurich",
    mapColor: "#2a7a8c",
    vibeText: "Les meilleures échappées à la journée depuis Zurich : un sommet boisé surplombant la ville, une petite cité médiévale sur une presqu'île lacustre, et la plus puissante cascade d'Europe.",
    prosText: "Des paysages et des patrimoines très différents du centre-ville, tous accessibles en moins d'une heure de transports publics suisses, ponctuels et confortables.",
    consText: "Nécessite une demi-journée à une journée complète par excursion, et parfois un changement de train.",
    transportText: "Train, bateau ou téléphérique selon la destination — toutes accessibles avec un billet de transports publics zurichois ou un billet CFF.",
    nearbyText: "La plupart de ces excursions partent directement de la gare centrale de Zurich ou du Bürkliplatz.",
    profileFitText: "Pour qui reste plus de 2-3 jours à Zurich et veut voir au-delà de la ville elle-même.",
    hotelAdviceText: "Aucun hébergement nécessaire ici — toutes ces excursions se font à la journée depuis Zurich.",
  },
  {
    slug: "aeroport",
    name: "Aéroport",
    mapColor: "#888888",
    vibeText: "L'aéroport international de Zurich, repéré sur la carte pour organiser facilement son arrivée ou son départ.",
    prosText: "Très bien connecté au centre-ville par train direct, l'un des aéroports les plus efficaces d'Europe.",
    consText: "N'est pas un lieu à visiter — purement un repère pratique.",
    transportText: "Train direct jusqu'à la gare centrale de Zurich en 10 à 13 minutes.",
    nearbyText: "Le centre-ville de Zurich est le point habité le plus proche, à moins de 15 minutes en train.",
    profileFitText: "Repère pratique pour tous les profils de voyage.",
    hotelAdviceText: "Aucun hébergement recommandé à proximité directe de l'aéroport — mieux vaut loger en ville, à 10-13 minutes en train.",
  },
];

async function main() {
  console.log("Seeding Zurich destination…");

  const suisse = await prisma.country.upsert({
    where: { slug: "suisse" },
    update: {},
    create: { slug: "suisse", name: "Suisse" },
  });

  const zurich = await prisma.destination.upsert({
    where: { slug: "zurich" },
    update: { status: "PUBLISHED" },
    create: {
      countryId: suisse.id,
      slug: "zurich",
      name: "Zurich",
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
    where: { id: zurich.id },
    data: {
      categories: {
        set: ENABLED_CATEGORIES.map((slug) => ({ id: categoryBySlug.get(slug)!.id })),
      },
    },
  });

  const zoneBySlug = new Map<string, { id: string }>();
  for (const z of ZONE_DEFS) {
    const zone = await prisma.zone.upsert({
      where: { destinationId_slug: { destinationId: zurich.id, slug: z.slug } },
      update: {
        name: z.name, mapColor: z.mapColor, vibeText: z.vibeText, prosText: z.prosText,
        consText: z.consText, transportText: z.transportText, nearbyText: z.nearbyText,
        profileFitText: z.profileFitText, hotelAdviceText: z.hotelAdviceText,
      },
      create: { destinationId: zurich.id, ...z },
    });
    zoneBySlug.set(z.slug, zone);
  }

  let manifest: PhotoManifestEntry[] = [];
  try {
    manifest = JSON.parse(
      await readFile(
        "/private/tmp/claude-501/-Users-constance/5aba17f0-44b0-4f75-b771-cf4a32bd9c63/scratchpad/photos_zurich/manifest.json",
        "utf-8"
      )
    );
  } catch {
    console.log("No photo manifest found yet — seeding without photos.");
  }

  const PHOTOS_DIR = "seed-assets/zurich-photos";

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
        name: def.name, destinationId: zurich.id, zoneId: zone?.id, status: "PUBLISHED",
        lat: def.lat, lng: def.lng, description: def.description, whyVisit: def.whyVisit,
        littleTip: def.littleTip, indicativeDuration: def.indicativeDuration,
        indicativePrice: def.indicativePrice, isFictionalDemo: false,
      },
      create: {
        slug: def.slug, destinationId: zurich.id, zoneId: zone?.id, name: def.name,
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

  console.log(`Zurich seed complete: ${PLACES.length} places, ${photoCount} with real photos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
