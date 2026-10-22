/**
 * Seed data for the Bangkok pilot. Every place/zone description here is
 * placeholder copy for development — real editorial content is entered
 * later by the site owner through the admin UI. Places are explicitly
 * marked fictional (isFictionalDemo) and literally named "Exemple fictif —"
 * so the placeholder status is visible in the UI itself, not just a flag.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const GLOBAL_CATEGORIES = [
  { slug: "incontournables", name: "Incontournables", icon: "star", color: "#c9a227" },
  { slug: "temples-patrimoine", name: "Temples et patrimoine", icon: "temple", color: "#8a6d3b" },
  { slug: "culture-musees", name: "Culture et musées", icon: "museum", color: "#6b5b95" },
  { slug: "quartiers-balades", name: "Quartiers et balades", icon: "walk", color: "#4a7c59" },
  { slug: "experiences-insolites", name: "Expériences insolites", icon: "sparkle", color: "#b5538a" },
  { slug: "activites-famille", name: "Activités en famille", icon: "family", color: "#3f8ea8" },
  { slug: "restaurants", name: "Restaurants", icon: "fork", color: "#c1440e" },
  { slug: "street-food", name: "Street food", icon: "noodles", color: "#d9822b" },
  { slug: "cafes-brunchs", name: "Cafés et brunchs", icon: "coffee", color: "#8d6748" },
  { slug: "bars-rooftops", name: "Bars et rooftops", icon: "cocktail", color: "#5a3e85" },
  { slug: "marches", name: "Marchés", icon: "basket", color: "#a46a2a" },
  { slug: "shopping", name: "Shopping", icon: "bag", color: "#9c6b9e" },
  { slug: "plages", name: "Plages", icon: "beach", color: "#2f9bb0" },
  { slug: "nature-randonnees", name: "Nature et randonnées", icon: "trail", color: "#3f7a44" },
  { slug: "excursions", name: "Excursions", icon: "compass", color: "#4068a0" },
  { slug: "bien-etre-spas", name: "Bien-être et spas", icon: "lotus", color: "#7fa06b" },
  { slug: "hotels-hebergements", name: "Hôtels et hébergements", icon: "bed", color: "#6d5a44" },
  { slug: "points-de-vue", name: "Points de vue", icon: "view", color: "#3a6b7a" },
  { slug: "vie-nocturne", name: "Vie nocturne", icon: "moon", color: "#4a3f6b" },
  { slug: "conseils-transports", name: "Conseils et transports", icon: "transport", color: "#555555" },
];

// Bangkok enables a realistic, non-exhaustive subset — not every category
// fits every destination (e.g. no "plages" for a landlocked city).
const BANGKOK_ENABLED_CATEGORIES = [
  "incontournables",
  "temples-patrimoine",
  "quartiers-balades",
  "restaurants",
  "street-food",
  "bars-rooftops",
  "marches",
  "conseils-transports",
];

async function main() {
  console.log("Seeding Bangkok pilot data…");

  // --- Prices ---
  await prisma.price.upsert({
    where: { key: "kit-thailande" },
    update: {},
    create: { key: "kit-thailande", label: "Kit essentiel Thaïlande", amountCents: 390 },
  });
  await prisma.price.upsert({
    where: { key: "destination-small" },
    update: {},
    create: { key: "destination-small", label: "Petite destination", amountCents: 190 },
  });
  await prisma.price.upsert({
    where: { key: "destination-large" },
    update: {},
    create: { key: "destination-large", label: "Grande destination", amountCents: 290 },
  });

  // --- Country + Destination ---
  const thailand = await prisma.country.upsert({
    where: { slug: "thailande" },
    update: {},
    create: { slug: "thailande", name: "Thaïlande" },
  });

  const bangkok = await prisma.destination.upsert({
    where: { slug: "bangkok" },
    update: {},
    create: {
      countryId: thailand.id,
      slug: "bangkok",
      name: "Bangkok",
      kind: "CITY",
      size: "LARGE",
      status: "PUBLISHED",
    },
  });

  // --- Categories (global taxonomy) ---
  const categoryBySlug = new Map<string, { id: string }>();
  for (const cat of GLOBAL_CATEGORIES) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categoryBySlug.set(cat.slug, created);
  }

  // Enable the chosen subset for Bangkok (many-to-many "extra categories"
  // relation doubles as "enabled for this destination" for now).
  await prisma.destination.update({
    where: { id: bangkok.id },
    data: {
      categories: {
        connect: BANGKOK_ENABLED_CATEGORIES.map((slug) => ({ id: categoryBySlug.get(slug)!.id })),
      },
    },
  });

  // --- Zones (real neighborhood names, placeholder descriptive text) ---
  const zoneDefs = [
    {
      slug: "siam-chit-lom",
      name: "Siam / Chit Lom",
      mapColor: "#c9a227",
    },
    {
      slug: "sukhumvit-asok-phrom-phong",
      name: "Sukhumvit / Asok / Phrom Phong",
      mapColor: "#4a7c59",
    },
    {
      slug: "riverside",
      name: "Riverside",
      mapColor: "#3f8ea8",
    },
    {
      slug: "chinatown-talat-noi",
      name: "Chinatown / Talat Noi",
      mapColor: "#c1440e",
    },
  ];

  const zoneBySlug = new Map<string, { id: string }>();
  for (const z of zoneDefs) {
    const zone = await prisma.zone.upsert({
      where: { destinationId_slug: { destinationId: bangkok.id, slug: z.slug } },
      update: {},
      create: {
        destinationId: bangkok.id,
        slug: z.slug,
        name: z.name,
        mapColor: z.mapColor,
        vibeText: "[Texte provisoire] Ambiance à rédiger pour cette zone.",
        prosText: "[Texte provisoire] Avantages à rédiger.",
        consText: "[Texte provisoire] Inconvénients à rédiger.",
        transportText: "[Texte provisoire] Transports à rédiger.",
        nearbyText: "[Texte provisoire] Visites accessibles à rédiger.",
        profileFitText: "[Texte provisoire] Profil de voyageur à rédiger.",
        hotelAdviceText: "[Texte provisoire] Conseils d'hébergement à rédiger.",
      },
    });
    zoneBySlug.set(z.slug, zone);
  }

  // --- Placeholder photos (locally generated, self-authored — provenance
  // is truthful, not a claim about any real photographer's work) ---
  const photoDefs = [
    { key: "placeholder-temple", file: "/seed/placeholder-temple.svg", alt: "Illustration de remplacement — temple fictif" },
    { key: "placeholder-cafe", file: "/seed/placeholder-cafe.svg", alt: "Illustration de remplacement — café fictif" },
    { key: "placeholder-market", file: "/seed/placeholder-market.svg", alt: "Illustration de remplacement — marché fictif" },
  ];
  const photos: { id: string }[] = [];
  for (const p of photoDefs) {
    const existing = await prisma.photo.findFirst({ where: { storageKey: p.file } });
    const photo =
      existing ??
      (await prisma.photo.create({
        data: {
          storageKey: p.file,
          photographer: "Généré localement (placeholder de développement)",
          sourceName: "Asset interne au projet",
          sourceUrl: p.file,
          licenseType: "Placeholder auto-généré — pas une photo réelle, aucune attribution requise",
          verifiedAt: new Date(),
          commercialOk: true,
          attributionText: null,
          altText: p.alt,
        },
      }));
    photos.push(photo);
  }

  // --- Fictional demo places ---
  const placeDefs = [
    {
      slug: "exemple-fictif-temple-de-la-lune-doree",
      name: "Exemple fictif — Temple de la Lune Dorée",
      zone: "riverside",
      categories: ["incontournables", "temples-patrimoine"],
      lat: 13.7437,
      lng: 100.4888,
      photo: "placeholder-temple",
    },
    {
      slug: "exemple-fictif-cafe-du-fleuve-rouge",
      name: "Exemple fictif — Café du Fleuve Rouge",
      zone: "riverside",
      categories: ["restaurants"],
      lat: 13.7469,
      lng: 100.4931,
      photo: "placeholder-cafe",
    },
    {
      slug: "exemple-fictif-marche-des-trois-lanternes",
      name: "Exemple fictif — Marché des Trois Lanternes",
      zone: "chinatown-talat-noi",
      categories: ["marches", "street-food"],
      lat: 13.7398,
      lng: 100.5083,
      photo: "placeholder-market",
    },
    {
      slug: "exemple-fictif-rooftop-du-dragon-vert",
      name: "Exemple fictif — Rooftop du Dragon Vert",
      zone: "sukhumvit-asok-phrom-phong",
      categories: ["bars-rooftops"],
      lat: 13.7308,
      lng: 100.5696,
      photo: "placeholder-cafe",
    },
    {
      slug: "exemple-fictif-ruelle-des-artisans",
      name: "Exemple fictif — Ruelle des Artisans",
      zone: "siam-chit-lom",
      categories: ["quartiers-balades", "shopping"],
      lat: 13.7466,
      lng: 100.5347,
      photo: "placeholder-market",
    },
    {
      slug: "exemple-fictif-echoppe-de-nouilles-du-pont",
      name: "Exemple fictif — Échoppe de nouilles du pont",
      zone: "chinatown-talat-noi",
      categories: ["street-food", "restaurants"],
      lat: 13.7412,
      lng: 100.5071,
      photo: "placeholder-cafe",
    },
    {
      slug: "exemple-fictif-sanctuaire-du-lotus-blanc",
      name: "Exemple fictif — Sanctuaire du Lotus Blanc",
      zone: "siam-chit-lom",
      categories: ["temples-patrimoine", "incontournables"],
      lat: 13.7525,
      lng: 100.5398,
      photo: "placeholder-temple",
    },
  ];

  const photoByKey = new Map(photoDefs.map((p, i) => [p.key, photos[i]]));

  for (const def of placeDefs) {
    const place = await prisma.place.upsert({
      where: { slug: def.slug },
      update: {},
      create: {
        slug: def.slug,
        destinationId: bangkok.id,
        zoneId: zoneBySlug.get(def.zone)!.id,
        name: def.name,
        status: "PUBLISHED",
        lat: def.lat,
        lng: def.lng,
        description: "[Texte provisoire] Description à rédiger — lieu fictif utilisé uniquement pour les tests de recherche, filtres et carte.",
        whyVisit: "[Texte provisoire] Raisons de visiter à rédiger.",
        littleTip: "[Texte provisoire] Little Tip à rédiger.",
        isFictionalDemo: true,
        categories: {
          create: def.categories.map((slug) => ({ categoryId: categoryBySlug.get(slug)!.id })),
        },
        photos: {
          create: [{ photoId: photoByKey.get(def.photo)!.id, sortOrder: 0 }],
        },
      },
    });
    console.log("  place:", place.name);
  }

  // --- Dev user with a known password ---
  const passwordHash = await bcrypt.hash("devpassword123", 10);
  await prisma.user.upsert({
    where: { email: "dev@my-little-guide.test" },
    update: {},
    create: {
      email: "dev@my-little-guide.test",
      passwordHash,
      role: "ADMIN",
      name: "Dev Admin",
    },
  });

  console.log("Seed complete. Dev login: dev@my-little-guide.test / devpassword123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
