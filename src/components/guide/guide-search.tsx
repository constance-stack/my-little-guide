"use client";

import { useState } from "react";
import Link from "next/link";

type SearchablePlace = { slug: string; name: string; zoneName: string | null; categoryNames: string[] };

export function GuideSearch({ places }: { places: SearchablePlace[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? places.filter((p) => {
        const haystack = `${p.name} ${p.zoneName ?? ""} ${p.categoryNames.join(" ")}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      })
    : [];

  return (
    <div className="mb-10">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher dans ce guide…"
        className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm outline-none focus:border-sage-dark"
      />
      {query.trim() && (
        <ul className="mt-3 divide-y divide-line rounded border border-line bg-ivory">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-foreground/50">Aucun résultat.</li>
          ) : (
            filtered.map((p) => (
              <li key={p.slug}>
                <Link href={`/lieu/${p.slug}`} className="block px-4 py-3 text-sm hover:text-sage-dark">
                  {p.name} <span className="text-xs text-foreground/50">— {p.zoneName}</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
