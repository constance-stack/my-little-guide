import { ShopHeader } from "@/components/shop/shop-header";
import { Footer } from "@/components/shop/footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ShopHeader />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
