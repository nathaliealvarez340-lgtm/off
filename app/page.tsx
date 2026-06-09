import Script from "next/script";
import { LocalizedHome, type PublicArticle } from "@/components/LocalizedHome";
import { getPlainTextPreview, getPublishedArticles } from "@/lib/articles";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const [articles, user] = await Promise.all([getPublishedArticles(), getCurrentUser()]);
  const publicArticles: PublicArticle[] = articles.map((article) => ({
    id: article.id,
    title: getPlainTextPreview(article.title, 140),
    slug: article.slug,
    excerpt: getPlainTextPreview(article.excerpt),
    coverImage: article.coverImage,
    category: article.category,
    readTime: article.readTime,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    featured: article.featured,
  }));

  return (
    <>
      <Script src="https://platform.linkedin.com/badges/js/profile.js" strategy="afterInteractive" />
      <LocalizedHome articles={publicArticles} user={user ? { name: user.name } : null} />
    </>
  );
}
