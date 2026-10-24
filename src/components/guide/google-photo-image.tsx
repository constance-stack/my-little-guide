"use client";

import { useState } from "react";

/**
 * Hides itself (and its attribution link) rather than showing a broken
 * image icon — the live Google photo fetch can occasionally come back
 * empty (API key not configured, quota hit, photo removed on Google's
 * side since we resolved the place_id).
 */
export function GooglePhotoImage({
  slug,
  googlePlaceId,
  alt,
}: {
  slug: string;
  googlePlaceId: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <div className="mb-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/google-photo/${slug}`}
        alt={alt}
        className="h-48 w-full rounded object-cover"
        onError={() => setFailed(true)}
      />
      <a
        href={`https://www.google.com/maps/place/?q=place_id:${googlePlaceId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 block text-right text-xs text-foreground/40 underline hover:text-sage-dark"
      >
        Photo via Google Maps
      </a>
    </div>
  );
}
