import type { GuidePlace } from "@/content/queries";

/**
 * Renders one place's full content. Used by the web guide place page and
 * intended to be reused as-is by the PDF print route later, so the two
 * never diverge — same component, same data, same markup (print styles
 * aside).
 */
export function PlaceDetail({ place }: { place: GuidePlace }) {
  return (
    <article>
      <p className="mb-1 text-xs uppercase tracking-wide text-sage-dark">
        {place.destination.name}
        {place.zone ? ` · ${place.zone.name}` : ""}
      </p>
      <h1 className="mb-4 font-serif text-3xl text-foreground">{place.name}</h1>

      {place.photos.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {place.photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.photoId}
              src={p.photo.storageKey}
              alt={p.photo.altText}
              className="h-32 w-full rounded object-cover"
            />
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {place.categories.map((c) => (
          <span
            key={c.categoryId}
            className="rounded-full px-3 py-1 text-xs text-ivory"
            style={{ backgroundColor: c.category.color }}
          >
            {c.category.name}
          </span>
        ))}
      </div>

      <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-foreground/80">{place.description}</p>

      {place.whyVisit && (
        <div className="mb-4">
          <h2 className="mb-1 font-serif text-lg text-sage-dark">Pourquoi visiter</h2>
          <p className="text-sm text-foreground/80">{place.whyVisit}</p>
        </div>
      )}

      {place.littleTip && (
        <div className="mb-4 rounded border border-sage bg-sand p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-sage-dark">Little Tip</p>
          <p className="text-sm text-foreground/80">{place.littleTip}</p>
        </div>
      )}

      <dl className="mb-6 grid grid-cols-2 gap-3 text-sm">
        {place.indicativePrice && (
          <div>
            <dt className="text-xs text-foreground/50">Prix indicatif</dt>
            <dd>{place.indicativePrice}</dd>
          </div>
        )}
        {place.indicativeDuration && (
          <div>
            <dt className="text-xs text-foreground/50">Durée conseillée</dt>
            <dd>{place.indicativeDuration}</dd>
          </div>
        )}
        {place.officialHours && (
          <div>
            <dt className="text-xs text-foreground/50">Horaires</dt>
            <dd>{place.officialHours}</dd>
          </div>
        )}
        {place.officialUrl && (
          <div>
            <dt className="text-xs text-foreground/50">Lien officiel</dt>
            <dd>
              <a href={place.officialUrl} className="text-sage-dark underline">
                {place.officialUrl}
              </a>
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}
