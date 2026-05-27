import type { MetadataRoute } from "next";
import { getPublishedArticles } from "@/lib/articles";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const articles = await getPublishedArticles();

  return [
    { url: siteUrl, lastModified: new Date() },
    ...articles.map((article) => ({
      url: `${siteUrl}/off/${article.slug}`,
      lastModified: article.updatedAt,
    })),
  ];
}
