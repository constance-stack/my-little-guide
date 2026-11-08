import { pickRepresentativeCategory } from "@/components/map/category-icons";

/**
 * Editorial display order for categories — mirrors GLOBAL_CATEGORIES in
 * prisma/seed.ts (sites/culture, then food & drink, then shopping/
 * excursions/wellness/views). Used to sort places within a PDF zone
 * chapter so visits, restaurants, bars etc. each cluster together instead
 * of appearing in whatever order they were added to the database.
 */
const CATEGORY_DISPLAY_ORDER = [
  "incontournables",
  "temples-patrimoine",
  "quartiers-balades",
  "experiences-insolites",
  "activites-famille",
  "restaurants",
  "street-food",
  "cafes-brunchs",
  "bars-rooftops",
  "marches",
  "shopping",
  "excursions",
  "bien-etre-spas",
  "points-de-vue",
];

/**
 * Sorts places by their representative category (the same "most specific,
 * not just first" pick used for map pin icons — see
 * pickRepresentativeCategory in components/map/category-icons.ts), stable
 * on ties so places sharing a category keep their original relative order.
 * A place whose representative category isn't in CATEGORY_DISPLAY_ORDER
 * (a destination-specific extra category) sorts after every known one.
 */
export function sortPlacesByCategory<T extends { categories: { category: { slug: string } }[] }>(
  places: T[]
): T[] {
  return [...places].sort((a, b) => {
    const catA = pickRepresentativeCategory(a.categories.map((c) => c.category));
    const catB = pickRepresentativeCategory(b.categories.map((c) => c.category));
    const idxA = catA ? CATEGORY_DISPLAY_ORDER.indexOf(catA.slug) : -1;
    const idxB = catB ? CATEGORY_DISPLAY_ORDER.indexOf(catB.slug) : -1;
    return (idxA === -1 ? Infinity : idxA) - (idxB === -1 ? Infinity : idxB);
  });
}
