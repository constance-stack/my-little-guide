"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function ConnexionForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    if (result?.error) {
      setError("E-mail ou mot de passe incorrect.");
    } else {
      window.location.href = "/compte";
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    await signIn("nodemailer", { email, redirect: false });
    setPending(false);
    setMagicSent(true);
  }

  return (
    <div className="mx-auto max-w-sm space-y-8">
      <form onSubmit={handlePasswordSignIn} className="space-y-4">
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
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
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
          Se connecter
        </button>
      </form>

      <div className="relative text-center text-xs text-foreground/50">
        <span className="bg-background px-2">ou</span>
      </div>

      <form onSubmit={handleMagicLink} className="space-y-3">
        {magicSent ? (
          <p className="text-sm text-sage-dark">
            Un lien de connexion a été envoyé à {email}. Vérifiez votre boîte de réception.
          </p>
        ) : (
          <>
            <button
              type="submit"
              disabled={pending || !email}
              className="w-full rounded border border-sage-dark px-4 py-2 text-sm text-sage-dark hover:bg-sand disabled:opacity-50"
            >
              Recevoir un lien de connexion par e-mail
            </button>
          </>
        )}
      </form>

      <p className="text-center text-sm text-foreground/60">
        Pas encore de compte ?{" "}
        <a href="/inscription" className="text-sage-dark underline">
          Créer un compte
        </a>
      </p>
    </div>
  );
}
