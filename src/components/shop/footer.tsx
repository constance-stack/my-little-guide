import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line bg-sand">
      <div className="mx-auto max-w-5xl px-4 py-8 text-xs text-foreground/60">
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/cgv" className="underline hover:text-sage-dark">
            CGV
          </Link>
          <Link href="/confidentialite" className="underline hover:text-sage-dark">
            Confidentialité
          </Link>
          <Link href="/mentions-legales" className="underline hover:text-sage-dark">
            Mentions légales
          </Link>
        </nav>
        <p className="mt-4">© {new Date().getFullYear()} My Little Guide — Constance Caron-Dufour.</p>
      </div>
    </footer>
  );
}
