import { InscriptionForm } from "./inscription-form";

export default function InscriptionPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <h1 className="mb-10 text-center font-serif text-2xl text-sage-dark">Créer un compte</h1>
      <InscriptionForm />
    </main>
  );
}
