import { PanierContent } from "./panier-content";

export default function PanierPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-6 font-serif text-2xl text-sage-dark">Mon panier</h1>
      <PanierContent />
    </main>
  );
}
