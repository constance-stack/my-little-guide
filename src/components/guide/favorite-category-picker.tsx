"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FavoriteCategoryPicker({
  placeId,
  categoryId,
  categories,
}: {
  placeId: string;
  categoryId: string | null;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleChange(value: string) {
    setPending(true);
    const res = await fetch("/api/favorites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId, categoryId: value === "" ? null : value }),
    });
    setPending(false);
    if (res.ok) router.refresh();
  }

  return (
    <select
      value={categoryId ?? ""}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded border border-line bg-ivory px-2 py-1 text-xs text-foreground/70 disabled:opacity-50"
    >
      <option value="">Sans catégorie</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
