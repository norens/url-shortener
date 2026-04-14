import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/links", "/settings"],
    },
    sitemap: "https://qurl.nazarf.dev/sitemap.xml",
  };
}
