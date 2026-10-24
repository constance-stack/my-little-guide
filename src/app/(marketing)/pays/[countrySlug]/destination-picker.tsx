"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/shop/cart-context";

type Destination = { id: string; slug: string; name: string; size: string; placeCount: number };
type CatalogDestination = Destination & { amountCents: number; owned: boolean };

export function DestinationPicker({ destinations }: { destinations: Destination[] }) {
  const { has, toggle } = useCart();
  const [catalog, setCatalog] = useState<CatalogDestination[] | null>(null);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((data) => setCatalog(data.destinations))
      .catch(() => setCatalog([]));
  }, []);

  const byId = new Map((catalog ?? []).map((d) => [d.id, d]));

  return (
    <div>
      <ul className="space-y-2">
        {destinations.map((dest) => {
          const info = byId.get(dest.id);
          const owned = info?.owned ?? false;
          const inCart = has(dest.id);
          return (
            <li
              key={dest.id}
              className="flex items-center justify-between rounded-xl bg-ivory px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div>
                <p className="text-sm font-medium">{dest.name}</p>
                <p className="text-xs text-foreground/50">
                  {dest.placeCount} lieu{dest.placeCount > 1 ? "x" : ""}
                  {info ? ` · ${(info.amountCents / 100).toFixed(2)} €` : ""}
                </p>
              </div>
              {owned ? (
                <span className="text-xs text-sage-dark">Déjà acheté</span>
              ) : (
                <button
                  type="button"
                  onClick={() => toggle(dest.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    inCart ? "bg-sage-dark text-ivory" : "border border-line text-foreground/70 hover:border-sage-dark"
                  }`}
                >
                  {inCart ? "Ajouté ✓" : "Ajouter"}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-6 text-right">
        <Link href="/panier" className="text-sm text-sage-dark underline">
          Voir mon panier →
        </Link>
      </div>
    </div>
  );
}
