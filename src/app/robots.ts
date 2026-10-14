import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: config.demoMode ? { userAgent: "*", disallow: "/" } : { userAgent: "*", allow: "/", disallow: ["/api/", "/sync"] },
    sitemap: `${config.siteUrl}/sitemap.xml`,
  };
}
