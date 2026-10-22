import { ConnexionForm } from "./connexion-form";

export default function ConnexionPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <h1 className="mb-10 text-center font-serif text-2xl text-sage-dark">Se connecter</h1>
      <ConnexionForm />
    </main>
  );
}
