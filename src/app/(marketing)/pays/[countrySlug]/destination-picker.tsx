"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/shop/cart-context";

type Destination = { id: string; slug: string; name: string; size: string };
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
      <ul className="divide-y divide-line rounded border border-line bg-ivory">
        {destinations.map((dest) => {
          const info = byId.get(dest.id);
          const owned = info?.owned ?? false;
          const inCart = has(dest.id);
          return (
            <li key={dest.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{dest.name}</p>
                {info && <p className="text-xs text-foreground/50">{(info.amountCents / 100).toFixed(2)} €</p>}
              </div>
              {owned ? (
                <span className="text-xs text-sage-dark">Déjà acheté</span>
              ) : (
                <button
                  type="button"
                  onClick={() => toggle(dest.id)}
                  className={`rounded px-3 py-1.5 text-xs ${
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
