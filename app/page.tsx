import Script from "next/script";
import { LocalizedHome, type PublicArticle } from "@/components/LocalizedHome";
import { getPublishedArticles } from "@/lib/articles";

export default async function Home() {
  const articles = await getPublishedArticles();
  const publicArticles: PublicArticle[] = articles.map((article) => ({
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    coverImage: article.coverImage,
    category: article.category,
    readTime: article.readTime,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    featured: article.featured,
  }));

  return (
    <>
      <Script src="https://platform.linkedin.com/badges/js/profile.js" strategy="afterInteractive" />
      <LocalizedHome articles={publicArticles} />
    </>
  );
}
