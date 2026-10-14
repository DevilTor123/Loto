import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/history", "/statistics", "/random", "/about"].map((p) => ({
    url: `${config.siteUrl}${p}`,
    changeFrequency: "daily",
  }));
}
