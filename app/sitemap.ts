import type { MetadataRoute } from "next";
import { getPublishedArticles } from "@/lib/articles";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const articles = await getPublishedArticles();

  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...articles.map((article) => ({
      url: `${siteUrl}/off/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: "monthly" as const,
      priority: article.featured ? 0.9 : 0.7,
    })),
  ];
}
