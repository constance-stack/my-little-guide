import { prisma } from "@/lib/db";
import { updatePrice } from "./actions";

export default async function AdminPricingPage() {
  const prices = await prisma.price.findMany({ orderBy: { key: "asc" } });

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 font-serif text-2xl text-sage-dark">Tarifs</h1>
      <ul className="space-y-4">
        {prices.map((price) => (
          <li key={price.id} className="rounded border border-line bg-sand p-4">
            <form action={updatePrice} className="flex items-center gap-4">
              <input type="hidden" name="id" value={price.id} />
              <div className="flex-1">
                <p className="text-sm font-medium">{price.label}</p>
                <p className="text-xs text-foreground/50">{price.key}</p>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="amountEuros"
                  defaultValue={(price.amountCents / 100).toFixed(2)}
                  className="w-24 rounded border border-line bg-ivory px-2 py-1 text-sm text-right"
                />
                <span className="text-sm text-foreground/60">€</span>
              </div>
              <label className="flex items-center gap-1 text-xs text-foreground/60">
                <input type="checkbox" name="active" defaultChecked={price.active} />
                actif
              </label>
              <button type="submit" className="rounded bg-sage-dark px-3 py-1.5 text-xs text-ivory hover:opacity-90">
                Enregistrer
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
