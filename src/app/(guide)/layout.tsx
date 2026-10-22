import { ShopHeader } from "@/components/shop/shop-header";

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <ShopHeader />
      {children}
    </div>
  );
}
