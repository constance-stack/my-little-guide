/**
 * Fourteenth and final content wave: Hôtels et hébergements (15) and the
 * remaining Vie nocturne entries (4; Asiatique and Rajadamnern Stadium
 * already seeded). Same approach as wave 13: no per-place web
 * verification and no photo search — all 15 hotels are large,
 * well-known international or flagship properties.
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
  // --- Hôtels (sélection, moyen-haut de gamme et luxe) ---
  {
    slug: "mandarin-oriental-bangkok",
    name: "Mandarin Oriental Bangkok",
    zone: "riverside",
    categories: ["hotels-hebergements"],
    lat: 13.7237,
    lng: 100.5144,
    description:
      "L'un des hôtels historiques les plus prestigieux d'Asie, ouvert sur les rives du Chao Phraya depuis 1876 et régulièrement classé parmi les meilleurs hôtels au monde. Son aile d'origine, l'Author's Wing, conserve le charme colonial qui a accueilli des écrivains comme Somerset Maugham.",
    whyVisit: "Une référence absolue de l'hôtellerie de luxe à Bangkok, portée par plus d'un siècle d'histoire au bord du fleuve.",
    littleTip: "Même sans y séjourner, le Bamboo Bar et l'afternoon tea de l'hôtel permettent de découvrir une partie de son atmosphère.",
  },
  {
    slug: "the-peninsula-bangkok",
    name: "The Peninsula Bangkok",
    zone: "riverside",
    categories: ["hotels-hebergements"],
    lat: 13.7206,
    lng: 100.5115,
    description:
      "Installé sur la rive de Thonburi face au quartier historique, le Peninsula Bangkok offre l'une des vues les plus dégagées sur le fleuve et la skyline, avec une navette bateau privée reliant directement l'hôtel au centre-ville. Un service et des infrastructures de niveau international, dans un cadre plus spacieux que les hôtels du centre.",
    whyVisit: "Une vue frontale sur le fleuve et la skyline de Bangkok, avec le confort d'une navette bateau privée.",
    littleTip: "La navette bateau gratuite vers Saphan Taksin permet de rejoindre le BTS directement sans passer par la route, souvent plus rapide aux heures de pointe.",
  },
  {
    slug: "capella-bangkok",
    name: "Capella Bangkok",
    zone: "riverside",
    categories: ["hotels-hebergements"],
    lat: 13.7211,
    lng: 100.5155,
    description:
      "Un hôtel de luxe plus récent sur la rive du Chao Phraya, au design contemporain épuré, avec des villas et suites offrant chacune une vue directe sur le fleuve. Reconnu internationalement depuis son ouverture pour son niveau de service et son architecture.",
    whyVisit: "Une adresse de luxe contemporain au bord du fleuve, parmi les hôtels les plus récompensés de la ville ces dernières années.",
    littleTip: "Les villas avec piscine privée donnant sur le fleuve constituent la catégorie de chambre la plus demandée — à réserver largement à l'avance.",
  },
  {
    slug: "four-seasons-chao-phraya",
    name: "Four Seasons Hotel Bangkok at Chao Phraya River",
    zone: "riverside",
    categories: ["hotels-hebergements"],
    lat: 13.7217,
    lng: 100.5137,
    description:
      "L'implantation bangkokienne de la chaîne Four Seasons, installée directement au bord du Chao Phraya avec de vastes jardins tropicaux rares pour un hôtel aussi central. L'ensemble mêle plusieurs restaurants réputés et un accès direct au fleuve.",
    whyVisit: "De vastes jardins au bord du fleuve, un cadre inhabituellement spacieux pour un hôtel du centre de Bangkok.",
    littleTip: "Les jardins et la piscine en bord de fleuve valent le détour même pour un brunch ou un repas sans y séjourner.",
  },
  {
    slug: "the-siam-hotel",
    name: "The Siam",
    zone: "riverside",
    categories: ["hotels-hebergements"],
    lat: 13.7735,
    lng: 100.5089,
    description:
      "Un hôtel-boutique de luxe au style Art déco thaïlandais, situé un peu au nord du centre sur la rive du fleuve, dans un cadre intimiste avec un nombre de chambres volontairement limité. La décoration, mêlant antiquités et pièces d'art contemporain thaïlandais, en fait une adresse unique plutôt qu'un hôtel de chaîne.",
    whyVisit: "Une expérience hôtelière intimiste et esthétique, loin du format standardisé des grands hôtels internationaux.",
    littleTip: "Plus excentré que les hôtels du centre historique — prévoyez un trajet en bateau-taxi privé ou en voiture vers les grands sites touristiques.",
  },
  {
    slug: "avani-riverside-bangkok",
    name: "Avani+ Riverside Bangkok Hotel",
    zone: "riverside",
    categories: ["hotels-hebergements"],
    lat: 13.7196,
    lng: 100.5151,
    description:
      "Un hôtel haute tour sur la rive de Thonburi, offrant un bon rapport qualité-prix pour une vue sur le fleuve, avec le rooftop SEEN Restaurant & Bar en point d'orgue. Une option plus accessible que les hôtels de luxe voisins tout en gardant un emplacement similaire au bord de l'eau.",
    whyVisit: "Une vue sur le fleuve à un tarif plus accessible que les hôtels de luxe voisins, avec un rooftop apprécié.",
    littleTip: "Réservez une chambre côté fleuve plutôt que côté ville — la différence de vue est significative pour un supplément souvent modeste.",
  },
  {
    slug: "siam-kempinski-hotel",
    name: "Siam Kempinski Hotel Bangkok",
    zone: "siam-chit-lom",
    categories: ["hotels-hebergements"],
    lat: 13.745,
    lng: 100.5325,
    description:
      "Un hôtel de luxe directement adossé au centre commercial Siam Paragon, organisé autour de vastes jardins tropicaux rares dans ce quartier très urbanisé. L'emplacement central en fait l'une des adresses les plus pratiques pour explorer le quartier de Siam à pied.",
    whyVisit: "Un jardin tropical surprenant en plein cœur du quartier commerçant le plus dense de Bangkok.",
    littleTip: "L'accès direct à Siam Paragon et au BTS Siam permet de rayonner facilement dans toute la ville sans dépendre des taxis.",
  },
  {
    slug: "anantara-siam-bangkok",
    name: "Anantara Siam Bangkok Hotel",
    zone: "siam-chit-lom",
    categories: ["hotels-hebergements"],
    lat: 13.7438,
    lng: 100.5428,
    description:
      "Un hôtel de luxe établi de longue date près de Ratchadamri, connu pour son service personnalisé et son atmosphère plus feutrée que les grandes tours hôtelières environnantes. Une adresse appréciée pour sa proximité avec le parc Lumphini et les grands centres commerciaux.",
    whyVisit: "Un service haut de gamme dans un cadre plus intimiste, à proximité directe de Lumphini Park et des grands centres commerciaux.",
    littleTip: "La proximité du parc Lumphini en fait une bonne base pour une marche ou un jogging matinal avant la chaleur de la journée.",
  },
  {
    slug: "grande-centre-point-ratchadamri",
    name: "Grande Centre Point Ratchadamri",
    zone: "siam-chit-lom",
    categories: ["hotels-hebergements"],
    lat: 13.7435,
    lng: 100.5405,
    description:
      "Un hôtel-résidence avec chambres de type studio équipées de kitchenette, dans le quartier central de Ratchadamri, pensé pour les séjours plus longs sans sacrifier l'emplacement central. Une alternative pratique aux hôtels classiques pour les familles ou les séjours prolongés.",
    whyVisit: "Des chambres plus spacieuses avec kitchenette, pratiques pour les familles ou les séjours de plusieurs semaines.",
    littleTip: "La kitchenette permet de réduire le budget repas en préparant certains repas sur place, un vrai atout pour un séjour prolongé.",
  },
  {
    slug: "carlton-hotel-sukhumvit",
    name: "Carlton Hotel Bangkok Sukhumvit",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["hotels-hebergements"],
    lat: 13.7368,
    lng: 100.5612,
    description:
      "Un hôtel de catégorie supérieure sur Sukhumvit, offrant un bon rapport qualité-prix avec une piscine sur le toit et un emplacement pratique proche du BTS Asok. Une option fiable pour explorer le quartier animé de Sukhumvit sans les tarifs des hôtels de luxe.",
    whyVisit: "Un bon rapport qualité-prix sur Sukhumvit, avec une piscine sur le toit et un accès facile aux transports.",
    littleTip: "L'emplacement près d'Asok permet de rejoindre aussi bien le BTS que le MRT, un vrai avantage pour se déplacer dans toute la ville.",
  },
  {
    slug: "grande-centre-point-terminal21",
    name: "Grande Centre Point Terminal 21",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["hotels-hebergements"],
    lat: 13.7375,
    lng: 100.5605,
    description:
      "Un hôtel-résidence directement relié au centre commercial à thème Terminal 21 et à la station BTS/MRT Asok, l'un des carrefours de transport les plus pratiques de la ville. Chambres de type studio avec kitchenette, dans un emplacement parmi les plus centraux de Sukhumvit.",
    whyVisit: "Un emplacement extrêmement pratique, directement connecté à un grand centre commercial et à deux lignes de transport.",
    littleTip: "L'accès direct à Terminal 21 permet de faire ses courses ou de manger sans sortir à l'extérieur, pratique les jours de pluie.",
  },
  {
    slug: "marriott-marquis-queens-park",
    name: "Bangkok Marriott Marquis Queen's Park",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["hotels-hebergements"],
    lat: 13.7339,
    lng: 100.5693,
    description:
      "Un grand hôtel international sur Sukhumvit Soi 22, avec de vastes infrastructures (plusieurs piscines, spa, nombreux restaurants) typiques des grandes chaînes hôtelières internationales. Un bon choix pour les familles ou les voyageurs cherchant des équipements complets sur place.",
    whyVisit: "Des infrastructures complètes (piscines, spa, restaurants multiples) pour un séjour qui ne nécessite pas de sortir beaucoup de l'hôtel.",
    littleTip: "Les multiples piscines et le vaste parc aquatique pour enfants en font une bonne option pour les familles en particulier.",
  },
  {
    slug: "banyan-tree-bangkok",
    name: "Banyan Tree Bangkok",
    zone: "silom-sathorn",
    categories: ["hotels-hebergements"],
    lat: 13.7222,
    lng: 100.5288,
    description:
      "Un hôtel de luxe en tour dans le quartier de Sathorn, connu autant pour ses suites que pour abriter les rooftops Vertigo et Moon Bar à son sommet. Un emplacement central pour explorer le quartier d'affaires et la vie nocturne environnante.",
    whyVisit: "Un hôtel de luxe qui inclut l'accès à deux des rooftops les plus réputés de la ville, directement sur place.",
    littleTip: "Les clients de l'hôtel bénéficient généralement d'un accès facilité aux rooftops Vertigo et Moon Bar, souvent complets pour les non-résidents.",
  },
  {
    slug: "so-sofitel-bangkok",
    name: "SO/ Bangkok",
    zone: "silom-sathorn",
    categories: ["hotels-hebergements"],
    lat: 13.7231,
    lng: 100.5423,
    description:
      "Un hôtel design en bordure de Lumphini Park, dont chaque étage de chambres a été pensé par un designer différent autour des cinq éléments de la cosmologie thaïlandaise. Une approche résolument créative et ludique de l'hôtellerie de luxe, assez différente des grandes chaînes classiques.",
    whyVisit: "Un concept design original et une vue sur Lumphini Park, pour une expérience hôtelière plus créative que la moyenne.",
    littleTip: "Chaque étage ayant un design différent, renseignez-vous sur le thème de l'étage avant de réserver si l'esthétique compte pour vous.",
  },
  {
    slug: "riva-arun-bangkok",
    name: "Riva Arun Bangkok",
    zone: "riverside",
    categories: ["hotels-hebergements"],
    lat: 13.7444,
    lng: 100.4911,
    description:
      "Un hôtel-boutique au bord du fleuve, juste en face de Wat Arun, avec son propre rooftop (Above Riva) offrant une vue directe sur le temple. Un format plus intimiste que les grands hôtels internationaux, au cœur du vieux Bangkok.",
    whyVisit: "Un emplacement exceptionnel directement face à Wat Arun, dans un format d'hôtel-boutique à taille humaine.",
    littleTip: "Les chambres avec vue directe sur Wat Arun sont les plus demandées — précisez cette préférence à la réservation.",
  },
  // --- Vie nocturne (restant) ---
  {
    slug: "khao-san-road",
    name: "Khao San Road",
    zone: "rattanakosin-banglamphu",
    categories: ["bars-rooftops"],
    lat: 13.759,
    lng: 100.4977,
    description:
      "La rue la plus connue au monde pour le tourisme routard, bordée de bars, de stands de rue et de vendeurs en tout genre, dans une ambiance festive et bon marché qui ne faiblit jamais vraiment. Longtemps symbole du voyage en Asie du Sud-Est à petit budget, elle reste une expérience à part, assumée dans son excès.",
    whyVisit: "Une expérience de vie nocturne unique en son genre, volontairement excessive et festive, à vivre au moins une fois.",
    littleTip: "Gardez vos affaires de valeur à l'hôtel — l'ambiance est bon enfant mais très dense, propice aux pertes ou vols à la tire.",
    indicativeDuration: "2h à 3h, en soirée",
  },
  {
    slug: "soi-rambuttri",
    name: "Soi Rambuttri",
    zone: "rattanakosin-banglamphu",
    categories: ["bars-rooftops"],
    lat: 13.7598,
    lng: 100.4965,
    description:
      "Une ruelle parallèle à Khao San Road, avec une ambiance nettement plus détendue : bars en terrasse, restaurants et petites échoppes, sans l'intensité sonore et la foule de sa voisine plus célèbre. Une bonne alternative pour une soirée plus calme tout en restant dans le même quartier.",
    whyVisit: "Une version plus posée de Khao San Road, pour profiter de l'ambiance du quartier sans la cohue.",
    littleTip: "À deux pas de Khao San Road, c'est une option simple pour alterner entre ambiance festive et soirée plus tranquille dans la même sortie.",
    indicativeDuration: "1h30 à 2h, en soirée",
  },
  {
    slug: "thong-lo-nightlife",
    name: "Thong Lo",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["bars-rooftops"],
    lat: 13.7306,
    lng: 100.5804,
    description:
      "Le quartier de sortie privilégié des jeunes professionnels bangkokiens, avec une forte concentration de bars, restaurants et clubs sur Sukhumvit Soi 55 et les sois environnants. L'ambiance, plus locale et moins touristique que Khao San Road, reflète la vie nocturne telle que la vivent les habitants de Bangkok.",
    whyVisit: "Le quartier de sortie le plus prisé par les Bangkokiens eux-mêmes, pour une soirée plus locale et moins touristique.",
    littleTip: "Les adresses les plus réputées changent régulièrement — demandez les tendances du moment plutôt que de vous fier à une liste figée.",
    indicativeDuration: "2h à 4h, en soirée",
  },
  {
    slug: "rca-royal-city-avenue",
    name: "RCA / Royal City Avenue",
    zone: "sukhumvit-asok-phrom-phong",
    categories: ["bars-rooftops"],
    lat: 13.7667,
    lng: 100.5692,
    description:
      "Une avenue entièrement dédiée aux clubs et grandes salles de soirée, longtemps considérée comme l'épicentre de la vie nocturne électronique et dansante de Bangkok. L'ambiance y est nettement plus axée clubbing que les bars de Thong Lo ou Sukhumvit.",
    whyVisit: "La destination de référence pour le clubbing et les grandes salles de soirée à Bangkok.",
    littleTip: "Les clubs de RCA ouvrent généralement tard et l'ambiance monte surtout après minuit — inutile d'arriver trop tôt en soirée.",
    indicativeDuration: "3h à 5h, en soirée tardive",
  },
];

async function main() {
  console.log("Seeding Bangkok content wave 14 (hôtels, vie nocturne)…");

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

  console.log("Wave 14 (final) seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
