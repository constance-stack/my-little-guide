"use client";

import { useState } from "react";

export function FavoriteButton({ placeId, initialIsFavorite }: { placeId: string; initialIsFavorite: boolean }) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId }),
    });
    setPending(false);
    if (res.ok) {
      const data = await res.json();
      setIsFavorite(data.isFavorite);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`rounded px-4 py-2 text-sm ${
        isFavorite ? "bg-sage-dark text-ivory" : "border border-line text-foreground/70 hover:border-sage-dark"
      }`}
    >
      {isFavorite ? "★ Dans mes favoris" : "☆ Ajouter aux favoris"}
    </button>
  );
}
