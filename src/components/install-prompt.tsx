"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "mlg-install-prompt-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {}
    if (dismissed) return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    if (isIos && isSafari) setShowIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setDeferredEvent(null);
    setShowIosHint(false);
  };

  const install = async () => {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    await deferredEvent.userChoice;
    dismiss();
  };

  if (!deferredEvent && !showIosHint) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ivory/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        {deferredEvent ? (
          <>
            <p className="text-sm text-foreground/80">
              Installez My Little Guide sur votre téléphone pour y accéder en un geste.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={install}
                className="rounded-full bg-sage-dark px-4 py-1.5 text-xs text-ivory hover:opacity-90"
              >
                Installer
              </button>
              <button
                onClick={dismiss}
                aria-label="Fermer"
                className="text-foreground/50 hover:text-foreground"
              >
                ✕
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-foreground/80">
              Ajoutez My Little Guide à l&apos;écran d&apos;accueil : appuyez sur{" "}
              <span className="font-medium">Partager</span>, puis{" "}
              <span className="font-medium">« Sur l&apos;écran d&apos;accueil »</span>.
            </p>
            <button
              onClick={dismiss}
              aria-label="Fermer"
              className="shrink-0 text-foreground/50 hover:text-foreground"
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}
