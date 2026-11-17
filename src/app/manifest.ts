import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Little Guide",
    short_name: "My Little Guide",
    description: "Guides de voyage numériques premium et carte interactive privée.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f2a4a",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
