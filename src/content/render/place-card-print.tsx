import type { GuidePlace } from "@/content/queries";
import { get } from "@/lib/storage";
import { getLiveGooglePlacePhoto } from "@/lib/google-places";

const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Both photo sources (/api/storage/photos/... and /api/google-photo/[slug])
 * require a real signed-in session — Playwright's PDF renderer only ever
 * carries a short-lived print token (see lib/pdf-token.ts), never a
 * session cookie, so an <img src="/api/..."> there always 401'd and
 * rendered as a broken image. Reading the bytes directly on the server
 * and inlining them as a data: URI sidesteps that HTTP/auth hop entirely
 * instead of threading a second auth mechanism through the storage route.
 */
async function resolvePrintPhotoSrc(place: GuidePlace): Promise<string | null> {
  const photo = place.photos[0];
  if (photo) {
    const key = photo.photo.storageKey.replace(/^\/api\/storage\//, "");
    try {
      const bytes = await get(key);
      const ext = key.split(".").pop()?.toLowerCase() ?? "";
      const mime = EXTENSION_MIME[ext] ?? "image/jpeg";
      return `data:${mime};base64,${bytes.toString("base64")}`;
    } catch {
      return null;
    }
  }

  if (place.googlePlaceId) {
    const googlePhoto = await getLiveGooglePlacePhoto(place.googlePlaceId);
    if (googlePhoto) {
      return `data:${googlePhoto.contentType};base64,${googlePhoto.bytes.toString("base64")}`;
    }
  }

  return null;
}

/**
 * A compact, print-only place card — deliberately NOT the same markup as
 * PlaceDetail (used by the web guide's own place page and the map
 * popup), which is built for one place filling a whole screen. A PDF
 * chapter shows dozens of places back to back: the same full-width
 * stacked layout there was the direct cause of "too many pages, doesn't
 * use the width, everything stacked, monotonous" — a single photo-on-top
 * block per place, one after another down a narrow text column.
 *
 * This renders text and photo side by side (uses the full page width
 * instead of one narrow column) and condenses "Pourquoi visiter" /
 * duration / price into the same flow instead of their own full-width
 * blocks, roughly halving each place's height. accentColor (the zone's
 * mapColor) gives each entry a thin left accent so a chapter doesn't
 * read as one flat wall of text.
 *
 * Text always comes first (left) and the photo — when there is one —
 * sits on the right: about a third of places have no photo yet, and
 * putting the photo on the left would shift the text's starting
 * position left or right depending on whether a given place happens to
 * have one, which read as inconsistent page to page.
 */
export async function PlaceCardPrint({ place, accentColor }: { place: GuidePlace; accentColor?: string }) {
  const photoSrc = await resolvePrintPhotoSrc(place);

  return (
    <article
      className="flex gap-4 border-l-2 pl-4"
      style={{ borderColor: accentColor ?? "transparent" }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-sage-dark">
          {place.destination.name}
          {place.zone ? ` · ${place.zone.name}` : ""}
        </p>
        <h3 className="font-serif text-lg leading-tight text-foreground">{place.name}</h3>

        <div className="mt-0.5 flex flex-wrap gap-1">
          {place.categories.map((c) => (
            <span
              key={c.categoryId}
              className="rounded-full px-2 py-0.5 text-[9px] text-ivory"
              style={{ backgroundColor: c.category.color }}
            >
              {c.category.name}
            </span>
          ))}
          {(place.indicativePrice || place.indicativeDuration) && (
            <span className="text-[10px] text-foreground/50">
              {[place.indicativePrice, place.indicativeDuration].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>

        <p className="mt-1 whitespace-pre-line text-[11px] leading-snug text-foreground/80">
          {place.description}
        </p>

        {place.whyVisit && (
          <p className="mt-1 text-[11px] leading-snug text-foreground/80">
            <span className="font-medium text-sage-dark">Pourquoi visiter — </span>
            {place.whyVisit}
          </p>
        )}

        {place.littleTip && (
          <p className="mt-1 rounded border border-sage bg-sand px-2 py-1 text-[11px] leading-snug text-foreground/80">
            <span className="font-medium uppercase tracking-wide text-sage-dark">Tip — </span>
            {place.littleTip}
          </p>
        )}
      </div>

      {photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoSrc}
          alt={place.photos[0]?.photo.altText ?? place.name}
          className="h-[104px] w-[104px] shrink-0 rounded object-cover"
        />
      ) : null}
    </article>
  );
}
