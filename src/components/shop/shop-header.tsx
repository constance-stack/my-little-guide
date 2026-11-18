import Link from "next/link";
import { auth } from "@/lib/auth";
import { CartIcon } from "./cart-icon";

export async function ShopHeader() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-ivory/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-serif text-lg text-sage-dark">
          <PinIcon />
          My Little Guide
        </Link>
        <nav className="flex items-center gap-5">
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-full bg-sage-dark px-3 py-1 text-xs text-ivory hover:opacity-90"
            >
              Espace admin
            </Link>
          )}
          <Link href="/" aria-label="Accueil" className="text-foreground/70 hover:text-sage-dark">
            <HomeIcon />
          </Link>
          <Link href="/compte" aria-label="Mon compte" className="text-foreground/70 hover:text-sage-dark">
            <UserIcon />
          </Link>
          <Link href="/panier" aria-label="Panier" className="relative text-foreground/70 hover:text-sage-dark">
            <CartIcon />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function PinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 21s7-7.58 7-12.5A7 7 0 1 0 5 8.5C5 13.42 12 21 12 21z" />
      <circle cx="12" cy="8.5" r="2.5" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v9a1 1 0 001 1h3v-6h4v6h3a1 1 0 001-1v-9" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-4 5-5.5 7-5.5s5.5 1.5 7 5.5" />
    </svg>
  );
}
