"use client";

import { useCart } from "./cart-context";

export function CartIcon() {
  const { destinationIds } = useCart();
  const count = destinationIds.length;

  return (
    <span className="relative inline-flex">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
        <path d="M3 4h2l2.4 11.4a1 1 0 001 .8h8.4a1 1 0 001-.78L20 8H6" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-sage-dark text-[10px] text-ivory">
          {count}
        </span>
      )}
    </span>
  );
}
