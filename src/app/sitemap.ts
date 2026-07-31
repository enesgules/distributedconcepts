import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { STEPS } from "@/lib/steps";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, priority: 1 },
    { url: `${SITE_URL}/lessons`, priority: 0.9 },
    ...STEPS.map((step) => ({
      url: `${SITE_URL}/lessons/${step.slug}`,
      priority: 0.8,
    })),
  ];
}
