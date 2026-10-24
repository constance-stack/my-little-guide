"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/shop/cart-context";

type CartLine = { key: string; label: string; amountCents: number; destinationId: string | null };

export function PanierContent() {
  const { destinationIds, toggle } = useCart();
  const [lines, setLines] = useState<CartLine[] | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (destinationIds.length === 0) {
      setLines([]);
      return;
    }
    fetch("/api/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destinationIds }),
    })
      .then((r) => r.json())
      .then((data: { lines: CartLine[] }) => {
        setLines(data.lines);
        // A stored destinationId can stop resolving to a line (already
        // owned since it was added, unpublished, price removed…) — drop
        // it from the cart instead of leaving a stale count on the cart
        // icon forever while this page shows "vide".
        const resolvedIds = new Set(data.lines.map((l) => l.destinationId).filter((id): id is string => id !== null));
        for (const id of destinationIds) {
          if (!resolvedIds.has(id)) toggle(id);
        }
      })
      .catch(() => setLines([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationIds]);

  async function handleCheckout() {
    setError(null);
    setCheckingOut(true);
    const res = await fetch("/api/checkout/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destinationIds }),
    });
    const data = await res.json();
    setCheckingOut(false);
    if (!res.ok) {
      setError(data.error ?? "Impossible de lancer le paiement.");
      return;
    }
    window.location.href = data.url;
  }

  if (lines === null) {
    return <p className="text-sm text-foreground/60">Chargement…</p>;
  }

  if (lines.length === 0) {
    return <p className="text-sm text-foreground/60">Votre panier est vide.</p>;
  }

  const total = lines.reduce((sum, l) => sum + l.amountCents, 0);

  return (
    <div>
      <ul className="mb-6 divide-y divide-line rounded border border-line bg-ivory">
        {lines.map((line) => (
          <li key={line.key} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{line.label}</span>
            <div className="flex items-center gap-3">
              <span>{(line.amountCents / 100).toFixed(2)} €</span>
              {line.destinationId && (
                <button
                  type="button"
                  onClick={() => toggle(line.destinationId!)}
                  className="text-xs text-foreground/50 underline"
                >
                  retirer
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="mb-6 flex justify-between text-sm font-medium">
        <span>Total</span>
        <span>{(total / 100).toFixed(2)} €</span>
      </div>

      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

      <label className="mb-4 flex items-start gap-2 text-xs text-foreground/70">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          J&apos;ai lu et j&apos;accepte les{" "}
          <a href="/cgv" target="_blank" rel="noopener noreferrer" className="underline hover:text-sage-dark">
            conditions générales de vente
          </a>
          . Je demande l&apos;accès immédiat à mon guide dès le paiement et je reconnais renoncer, de ce fait, à mon
          droit de rétractation de 14 jours applicable aux contenus numériques (article L221-28 du Code de la
          consommation).
        </span>
      </label>

      <button
        type="button"
        onClick={handleCheckout}
        disabled={checkingOut || !consent}
        className="w-full rounded bg-sage-dark px-4 py-3 text-sm text-ivory hover:opacity-90 disabled:opacity-50"
      >
        {checkingOut ? "Redirection…" : "Payer"}
      </button>
    </div>
  );
}
