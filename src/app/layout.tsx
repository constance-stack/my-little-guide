import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "@/components/shop/cart-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Little Guide",
  description: "Guides de voyage numériques premium et carte interactive privée.",
};

// Forces every route in the app to render per-request rather than being
// statically prerendered at build time, and propagates to all nested
// pages/layouts. Two reasons this matters, not just one: (1) with Cache
// Components off, a plain DB read with no dynamic API doesn't by itself
// mark a page dynamic, so `next build` tried to prerender the homepage by
// actually querying Postgres at build time — which fails outright in a
// Docker build with no DATABASE_URL available, and would otherwise bake in
// stale destination/pricing data until the next rebuild; (2) this app
// gates content by purchase entitlement, which must never be cached across
// users regardless.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
