/**
 * Kit essentiel Royaume-Uni — same pattern as the other country kits.
 * The UK left the EU (Brexit, effective 2020) and has never used the
 * euro, so the practical friction points for French travelers are
 * genuinely different from an EU destination like Croatia: a passport
 * is required again, the currency is the pound sterling, and driving
 * is on the left — none of which applies to the Thailand, USA or
 * Croatia kits already in this app.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const isRemote = !process.env.DATABASE_URL?.includes("localhost");
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const royaumeUni = await prisma.country.upsert({
    where: { slug: "royaume-uni" },
    update: {},
    create: { slug: "royaume-uni", name: "Royaume-Uni" },
  });

  const kitSections = [
    {
      slug: "visa-entree",
      title: "Visa et entrée sur le territoire",
      content: [
        "Depuis le Brexit (2021), un passeport en cours de validité est de nouveau obligatoire pour entrer au Royaume-Uni — la carte d'identité ne suffit plus pour les ressortissants de l'UE.",
        "Aucun visa n'est nécessaire pour un séjour touristique de moins de 6 mois pour les ressortissants français, belges ou suisses.",
        "Depuis octobre 2025, une autorisation électronique ETA (Electronic Travel Authorisation) est obligatoire avant le départ, à demander en ligne sur le site officiel gov.uk, valable 2 ans pour des séjours multiples.",
        "Méfiez-vous des sites non officiels qui facturent l'ETA bien plus cher que les quelques livres du tarif officiel — ne passez que par gov.uk.",
      ].join("\n"),
    },
    {
      slug: "monnaie-paiements",
      title: "Monnaie et paiements",
      content: [
        "La monnaie est la livre sterling (£), le Royaume-Uni n'a jamais adopté l'euro et n'a pas l'intention de le faire.",
        "Les cartes bancaires sont acceptées quasiment partout, y compris pour de très petits montants — le paiement sans contact est la norme, même dans le métro et les bus.",
        "Prévenez votre banque de votre voyage pour éviter un blocage de carte pour \"opération suspecte\", et vérifiez les frais de change appliqués à l'étranger par votre carte.",
        "Les espèces restent rarement nécessaires, sauf dans certains pubs de campagne ou petits marchés qui peuvent encore les préférer.",
      ].join("\n"),
    },
    {
      slug: "transports",
      title: "Se déplacer",
      content: [
        "Le métro londonien (the Tube), le plus ancien du monde, couvre l'essentiel du centre et de la périphérie, complété par bus, Overground et DLR.",
        "La carte Oyster ou le paiement sans contact directement avec votre carte bancaire (ou téléphone) sont la façon la plus simple de payer les transports, avec un plafond quotidien automatique selon les zones traversées.",
        "On conduit à gauche au Royaume-Uni — en traversant la rue à pied, pensez à regarder d'abord à droite, l'inverse du réflexe habituel.",
        "Les applications Uber et Bolt sont largement utilisées, en complément des taxis noirs emblématiques (black cabs), plus chers mais réputés pour leur connaissance parfaite de la ville.",
        "Londres s'étend sur une surface immense — comptez souvent 30 à 45 minutes de métro pour relier deux quartiers touristiques éloignés.",
      ].join("\n"),
    },
    {
      slug: "securite-sante",
      title: "Sécurité et santé",
      content: [
        "Londres et le Royaume-Uni sont globalement sûrs pour les touristes dans les zones centrales et touristiques, de jour comme de nuit.",
        "Comme partout, restez attentif à vos affaires dans le métro et les lieux très fréquentés (Oxford Street, Camden Market).",
        "Une assurance voyage couvrant les frais médicaux est recommandée — le NHS (système de santé public) ne couvre pas automatiquement les visiteurs étrangers pour tous les soins depuis le Brexit.",
        "En cas d'urgence, composez le 999 (ou le 112, numéro d'urgence européen également valable au Royaume-Uni), gratuit depuis n'importe quel téléphone.",
        "L'eau du robinet est potable partout au Royaume-Uni.",
      ].join("\n"),
    },
    {
      slug: "usages-pourboires",
      title: "Usages et pourboires",
      content: [
        "Le pourboire est moins systématique qu'aux États-Unis : au restaurant avec service à table, 10 à 12,5 % est l'usage, souvent déjà inclus en \"service charge\" sur l'addition — vérifiez avant d'ajouter un pourboire en double.",
        "Dans les pubs, on ne laisse généralement pas de pourboire au comptoir, sauf pour un service à table dans la partie restaurant.",
        "La culture du pub est centrale en Grande-Bretagne : on commande et on paie directement au comptoir, sans attendre d'être servi à table.",
        "\"Queuing\" (faire la queue) est quasiment une institution nationale — resquiller dans une file d'attente est considéré comme particulièrement malpoli.",
      ].join("\n"),
    },
  ];

  for (let i = 0; i < kitSections.length; i++) {
    const s = kitSections[i];
    await prisma.kitSection.upsert({
      where: { countryId_slug: { countryId: royaumeUni.id, slug: s.slug } },
      update: { title: s.title, content: s.content, sortOrder: i, status: "PUBLISHED" },
      create: {
        countryId: royaumeUni.id,
        slug: s.slug,
        title: s.title,
        content: s.content,
        sortOrder: i,
        status: "PUBLISHED",
      },
    });
    console.log("  kit section:", s.title);
  }

  console.log("Royaume-Uni kit essentiel seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
