import Link from "next/link";

export const metadata = {
  title: "Installer l'application — My Little Guide",
};

export default function CommentInstaller() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="text-sm text-sage-dark hover:underline">
        ← Retour à l&apos;accueil
      </Link>

      <h1 className="mt-6 font-serif text-3xl text-sage-dark">
        Installer My Little Guide sur votre téléphone
      </h1>
      <p className="mt-2 text-foreground/70">
        Une fois installée, l&apos;application s&apos;ouvre en plein écran depuis votre
        écran d&apos;accueil, comme une vraie app.
      </p>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-serif text-xl text-sage-dark">
          <SafariIcon /> Sur iPhone / iPad (Safari)
        </h2>
        <ol className="mt-4 space-y-5">
          <Step n={1}>
            Ouvrez <span className="font-medium">my-little-guide.onrender.com</span> dans
            Safari (ça doit être Safari, pas Chrome ou une autre app).
          </Step>
          <Step n={2}>
            Appuyez sur le bouton <span className="font-medium">Partager</span>{" "}
            <ShareIcon className="inline-block align-middle" /> en bas de l&apos;écran
            (ou en haut, selon votre iPhone).
          </Step>
          <Step n={3}>
            Faites défiler la liste des options et appuyez sur{" "}
            <span className="font-medium">« Sur l&apos;écran d&apos;accueil »</span>.
          </Step>
          <Step n={4}>
            Appuyez sur <span className="font-medium">« Ajouter »</span> en haut à droite.
            C&apos;est fait !
          </Step>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-serif text-xl text-sage-dark">
          <AndroidIcon /> Sur Android (Chrome)
        </h2>
        <p className="mt-3 text-foreground/80">
          Le bouton <span className="font-medium">« Installer »</span> qui apparaît en
          bas de l&apos;écran fait tout en un geste. S&apos;il n&apos;apparaît pas,
          ouvrez le menu <span className="font-medium">⋮</span> en haut à droite de
          Chrome, puis <span className="font-medium">« Ajouter à l&apos;écran d&apos;accueil »</span>.
        </p>
      </section>
    </main>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage-dark text-sm text-ivory">
        {n}
      </span>
      <p className="text-foreground/80">{children}</p>
    </li>
  );
}

function SafariIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-4 2-2 4 4-2 2-4z" />
    </svg>
  );
}

function AndroidIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" />
    </svg>
  );
}
