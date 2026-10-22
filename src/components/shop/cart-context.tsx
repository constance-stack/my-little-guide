"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "mlg-cart-destination-ids";

type CartContextValue = {
  destinationIds: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [destinationIds, setDestinationIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setDestinationIds(JSON.parse(raw));
    } catch {
      // ignore — cart just starts empty
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(destinationIds));
    } catch {
      // ignore — per-viewer convenience only
    }
  }, [destinationIds, hydrated]);

  function toggle(id: string) {
    setDestinationIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function has(id: string) {
    return destinationIds.includes(id);
  }

  function clear() {
    setDestinationIds([]);
  }

  return (
    <CartContext.Provider value={{ destinationIds, toggle, has, clear }}>{children}</CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
