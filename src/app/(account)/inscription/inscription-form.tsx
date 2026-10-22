"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function InscriptionForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Une erreur est survenue.");
      setPending(false);
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    if (result?.error) {
      setError("Compte créé, mais la connexion automatique a échoué. Essayez de vous connecter.");
    } else {
      window.location.href = "/compte";
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-4">
      <div>
        <label className="block text-sm text-foreground/70 mb-1" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm outline-none focus:border-sage-dark"
        />
      </div>
      <div>
        <label className="block text-sm text-foreground/70 mb-1" htmlFor="password">
          Mot de passe (8 caractères minimum)
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm outline-none focus:border-sage-dark"
        />
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-sage-dark px-4 py-2 text-sm text-ivory hover:opacity-90 disabled:opacity-50"
      >
        Créer mon compte
      </button>
      <p className="text-center text-sm text-foreground/60">
        Déjà un compte ?{" "}
        <a href="/connexion" className="text-sage-dark underline">
          Se connecter
        </a>
      </p>
    </form>
  );
}
