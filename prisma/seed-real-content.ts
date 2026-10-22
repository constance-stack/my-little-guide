/**
 * Real editorial content for the Bangkok pilot — replaces the fictional
 * placeholder data from prisma/seed.ts. Place names, locations, and
 * descriptions are genuine, well-documented Bangkok landmarks; nothing
 * here is invented. Run after prisma/seed.ts (shares its Price/Category
 * rows) or standalone against an already-seeded database.
 *
 * Practical details that can change over time (exact hours, visa rules,
 * entrance fees) are deliberately kept general or omitted rather than
 * stated as precise facts that could go stale or be wrong — the admin
 * can tighten these once verified against an official source.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? undefined : { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding real Thailand kit + Bangkok content…");

  const thailand = await prisma.country.findUniqueOrThrow({ where: { slug: "thailande" } });
  const bangkok = await prisma.destination.findUniqueOrThrow({ where: { slug: "bangkok" } });

  // --- Kit essentiel Thaïlande ---
  const kitSections = [
    {
      slug: "visa-entree",
      title: "Visa et entrée sur le territoire",
      content: [
        "Les ressortissants de nombreux pays (dont la France, la Belgique, la Suisse et le Canada) peuvent entrer en Thaïlande sans visa pour un séjour touristique de courte durée.",
        "Passeport valide au moins 6 mois, preuve de billet retour et parfois preuve de fonds peuvent être demandés à l'arrivée.",
        "La durée exacte autorisée et les conditions évoluent régulièrement : vérifiez-les sur le site de l'ambassade de Thaïlande avant de partir, idéalement quelques semaines avant le départ.",
        "Depuis 2024, l'enregistrement électronique Thailand Digital Arrival Card (TDAC) est demandé avant l'arrivée pour la plupart des voyageurs.",
      ].join("\n"),
    },
    {
      slug: "monnaie",
      title: "Monnaie et paiements",
      content: [
        "La monnaie locale est le baht thaïlandais (THB).",
        "Les distributeurs sont nombreux à Bangkok mais appliquent presque tous des frais fixes par retrait (environ 200 THB) — mieux vaut retirer des sommes plus importantes, moins souvent.",
        "Les cartes bancaires internationales sont largement acceptées dans les hôtels, centres commerciaux et restaurants de catégorie moyenne à élevée.",
        "Le cash reste indispensable pour les marchés, le street food, les tuk-tuks et les petites échoppes.",
        "Le pourboire n'est pas obligatoire mais est de plus en plus apprécié dans la restauration et pour les guides.",
      ].join("\n"),
    },
    {
      slug: "transports",
      title: "Se déplacer",
      content: [
        "Le BTS Skytrain (aérien) et le MRT (métro souterrain) couvrent une grande partie des quartiers touristiques et évitent les embouteillages fréquents de la capitale.",
        "Une carte rechargeable (Rabbit Card) facilite les trajets sur le BTS.",
        "L'application Grab (voitures et motos-taxis) est la solution la plus simple et la plus fiable pour les zones non couvertes par le rail.",
        "Les taxis au compteur existent, mais certains chauffeurs refusent de l'activer avec les touristes : insistez (\"meter, please\") ou passez par Grab directement.",
        "Les bateaux-taxis du Chao Phraya Express Boat relient plusieurs sites majeurs, dont Wat Arun et Chinatown.",
      ].join("\n"),
    },
    {
      slug: "securite-sante",
      title: "Sécurité et santé",
      content: [
        "La Thaïlande est globalement une destination sûre pour les voyageurs, avec une criminalité violente rare envers les touristes.",
        "Méfiez-vous des arnaques touristiques classiques (gemmes, excursions \"trop belles pour être vraies\", tuk-tuks détournant vers des boutiques partenaires) et des sollicitations trop insistantes près des grands sites.",
        "L'eau du robinet n'est pas potable à Bangkok : préférez l'eau en bouteille, largement disponible.",
        "Aucune vaccination n'est obligatoire pour un séjour touristique standard, mais vérifiez les recommandations sanitaires à jour auprès d'un centre de vaccination international avant le départ.",
        "Une assurance voyage couvrant les frais médicaux est vivement conseillée.",
      ].join("\n"),
    },
  ];

  for (let i = 0; i < kitSections.length; i++) {
    const s = kitSections[i];
    await prisma.kitSection.upsert({
      where: { countryId_slug: { countryId: thailand.id, slug: s.slug } },
      update: { title: s.title, content: s.content, sortOrder: i, status: "PUBLISHED" },
      create: {
        countryId: thailand.id,
        slug: s.slug,
        title: s.title,
        content: s.content,
        sortOrder: i,
        status: "PUBLISHED",
      },
    });
    console.log("  kit section:", s.title);
  }

  // --- Real zone descriptions for Bangkok (replacing placeholder text) ---
  const zoneUpdates = [
    {
      slug: "riverside",
      vibeText:
        "Le long du fleuve Chao Phraya, entre temples historiques et hôtels de luxe avec vue sur l'eau. Une ambiance plus posée que le centre-ville, rythmée par le passage des bateaux-taxis.",
      prosText:
        "Vue sur le fleuve, proximité des grands temples (Wat Arun, Wat Pho), accès direct au Chao Phraya Express Boat, nombreux rooftops avec vue.",
      consText:
        "Moins bien desservi par le BTS/MRT — la plupart des trajets vers le centre nécessitent un bateau, un taxi ou une correspondance.",
      transportText:
        "Chao Phraya Express Boat pour rejoindre les temples et Chinatown ; navettes gratuites proposées par certains hôtels vers la station BTS Saphan Taksin.",
      nearbyText: "Wat Arun, Wat Pho, le quartier historique de Rattanakosin, Chinatown à proximité immédiate.",
      profileFitText:
        "Voyageurs qui veulent une ambiance plus calme et authentique, avec le fleuve comme fil conducteur de leur séjour.",
      hotelAdviceText:
        "Les hôtels avec leur propre ponton et navette fluviale compensent largement l'éloignement du métro — vérifiez que l'hôtel propose bien ce service avant de réserver.",
    },
    {
      slug: "chinatown-talat-noi",
      vibeText:
        "Le quartier chinois historique de Bangkok (Yaowarat), dense, bruyant et animé, réputé pour son street food et ses ruelles à l'ambiance rétro autour de Talat Noi.",
      prosText:
        "Street food parmi les meilleurs de la ville, atmosphère authentique, temples chinois colorés, photogénie des ruelles de Talat Noi.",
      consText: "Très dense et bruyant, trottoirs étroits et encombrés, peu adapté pour un hébergement calme.",
      transportText: "Station MRT Wat Mangkon ; bateau-taxi jusqu'au ponton de Ratchawong.",
      nearbyText: "Wat Mangkon Kamalawat (temple chinois), Talat Noi, le marché aux fleurs Pak Khlong Talat à proximité.",
      profileFitText: "Amateurs de street food et de quartiers vivants, voyageurs à l'aise avec l'effervescence urbaine.",
      hotelAdviceText:
        "Idéal pour quelques nuits en immersion plutôt que pour tout le séjour ; mieux vaut une petite valise, les ruelles ne sont pas toutes accessibles en voiture.",
    },
    {
      slug: "siam-chit-lom",
      vibeText:
        "Le cœur commercial et touristique de Bangkok : immenses centres commerciaux, enseignes internationales et excellente desserte en transports.",
      prosText:
        "Hub central du BTS Skytrain, shopping et restauration à tous les prix, hébergements abondants, facile pour un premier séjour.",
      consText: "Très touristique et bétonné, peu d'authenticité locale, circulation dense aux heures de pointe.",
      transportText: "Stations BTS Siam, Chit Lom et National Stadium — correspondance centrale du réseau Skytrain.",
      nearbyText: "Jim Thompson House, les grands centres commerciaux (Siam Paragon, CentralWorld), le sanctuaire d'Erawan.",
      profileFitText: "Voyageurs qui privilégient le confort et la praticité, ou un premier séjour à Bangkok.",
      hotelAdviceText:
        "Zone la plus simple pour rayonner vers le reste de la ville grâce au BTS — bon compromis si vous visitez plusieurs destinations thaïlandaises et ne restez que peu de nuits à Bangkok.",
    },
    {
      slug: "sukhumvit-asok-phrom-phong",
      vibeText:
        "Le quartier \"expat\" de Bangkok, avec une vie nocturne animée, une offre de restaurants internationaux dense et de nombreux rooftops.",
      prosText: "Vie nocturne et gastronomie variées, bonne desserte BTS, ambiance plus cosmopolite.",
      consText: "Certaines rues (notamment autour de Nana) ont une ambiance très orientée vie nocturne, pas au goût de tous.",
      transportText: "Stations BTS Asok, Phrom Phong, Thong Lo ; correspondance MRT à Sukhumvit.",
      nearbyText: "Terminal 21 (centre commercial à thème), Benjakitti Park, nombreux rooftops avec vue sur la ville.",
      profileFitText: "Voyageurs qui veulent une vie nocturne et une offre gastronomique variée en soirée.",
      hotelAdviceText:
        "Privilégiez un hôtel proche d'une station BTS directement (Asok, Phrom Phong ou Thong Lo) pour éviter les longs trajets en soï (ruelles) aux heures chaudes.",
    },
  ];

  for (const z of zoneUpdates) {
    await prisma.zone.update({
      where: { destinationId_slug: { destinationId: bangkok.id, slug: z.slug } },
      data: {
        vibeText: z.vibeText,
        prosText: z.prosText,
        consText: z.consText,
        transportText: z.transportText,
        nearbyText: z.nearbyText,
        profileFitText: z.profileFitText,
        hotelAdviceText: z.hotelAdviceText,
      },
    });
    console.log("  zone updated:", z.slug);
  }

  console.log("Real content seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
