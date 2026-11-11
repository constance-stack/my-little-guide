import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Little Guide",
    short_name: "My Little Guide",
    description: "Guides de voyage numériques premium et carte interactive privée.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdfbf5",
    theme_color: "#a8573f",
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
