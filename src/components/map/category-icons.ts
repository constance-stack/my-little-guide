/**
 * Maps a Category.icon keyword (set in prisma/seed.ts's GLOBAL_CATEGORIES)
 * to a single emoji glyph MapLibre can render directly in a symbol
 * layer's text-field — no sprite sheet or addImage() needed.
 */
const ICON_EMOJI: Record<string, string> = {
  star: "⭐",
  temple: "🛕",
  museum: "🏛️",
  walk: "🚶",
  sparkle: "✨",
  family: "👪",
  fork: "🍴",
  noodles: "🍜",
  coffee: "☕",
  cocktail: "🍸",
  basket: "🧺",
  bag: "🛍️",
  beach: "🏖️",
  trail: "🥾",
  compass: "🧭",
  lotus: "🪷",
  bed: "🛏️",
  view: "🔭",
  moon: "🌙",
  transport: "🚉",
};

export function categoryIconEmoji(icon: string): string {
  return ICON_EMOJI[icon] ?? "📍";
}
