"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) {
      await signOut({ callbackUrl: "/" });
    } else {
      setPending(false);
    }
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-sm text-red-700/70 underline">
        Supprimer mon compte
      </button>
    );
  }

  return (
    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm">
      <p className="mb-2 text-red-800">
        Votre compte sera désactivé immédiatement et vous serez déconnecté. Confirmez-vous ?
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={handleDelete} disabled={pending} className="text-red-700 underline">
          {pending ? "Suppression…" : "Oui, supprimer mon compte"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-foreground/60 underline">
          Annuler
        </button>
      </div>
    </div>
  );
}
