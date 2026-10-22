"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PlaceDetail = {
  id: string;
  slug: string;
  name: string;
  destination: { slug: string; name: string };
  zone: { slug: string; name: string } | null;
  description: string;
  whyVisit: string;
  littleTip: string | null;
  indicativePrice: string | null;
  indicativeDuration: string | null;
  officialHours: string | null;
  officialUrl: string | null;
  lat: number;
  lng: number;
  categories: { slug: string; name: string; icon: string; color: string }[];
  photos: { src: string; alt: string }[];
  isFavorite: boolean;
};

export function PlaceSheet({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [favPending, setFavPending] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/places/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setPlace)
      .finally(() => setLoading(false));
  }, [slug]);

  async function toggleFavorite() {
    if (!place) return;
    setFavPending(true);
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId: place.id }),
    });
    setFavPending(false);
    if (res.ok) {
      const data = await res.json();
      setPlace({ ...place, isFavorite: data.isFavorite });
    }
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 max-h-[60%] overflow-y-auto rounded-t-lg border-t border-line bg-ivory p-5 shadow-lg sm:bottom-4 sm:left-4 sm:right-auto sm:w-96 sm:rounded-lg sm:border">
      <button type="button" onClick={onClose} className="absolute right-3 top-3 text-foreground/40 hover:text-foreground">
        ✕
      </button>

      {loading && <p className="text-sm text-foreground/50">Chargement…</p>}

      {!loading && !place && <p className="text-sm text-foreground/50">Lieu introuvable.</p>}

      {place && (
        <div>
          {place.photos[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={place.photos[0].src} alt={place.photos[0].alt} className="mb-3 h-32 w-full rounded object-cover" />
          )}
          <p className="text-xs uppercase tracking-wide text-sage-dark">{place.zone?.name ?? place.destination.name}</p>
          <h3 className="mb-2 font-serif text-lg text-foreground">{place.name}</h3>

          <div className="mb-3 flex flex-wrap gap-1">
            {place.categories.map((c) => (
              <span key={c.slug} className="rounded-full px-2 py-0.5 text-[10px] text-ivory" style={{ backgroundColor: c.color }}>
                {c.name}
              </span>
            ))}
          </div>

          <p className="mb-3 line-clamp-3 text-sm text-foreground/70">{place.description}</p>

          {place.littleTip && (
            <p className="mb-3 rounded border border-sage bg-sand p-2 text-xs text-foreground/70">
              <strong>Little Tip —</strong> {place.littleTip}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleFavorite}
              disabled={favPending}
              className={`rounded px-3 py-1.5 text-xs ${
                place.isFavorite ? "bg-sage-dark text-ivory" : "border border-line text-foreground/70"
              }`}
            >
              {place.isFavorite ? "★ Favori" : "☆ Favori"}
            </button>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
              target="_blank"
              rel="noreferrer"
              className="rounded border border-line px-3 py-1.5 text-xs text-foreground/70 hover:border-sage-dark"
            >
              Itinéraire
            </a>
            <Link href={`/lieu/${place.slug}`} className="rounded border border-line px-3 py-1.5 text-xs text-foreground/70 hover:border-sage-dark">
              Lire dans mon guide
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
