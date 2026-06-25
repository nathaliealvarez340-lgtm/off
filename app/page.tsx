import Script from "next/script";
import { redirect } from "next/navigation";
import { LocalizedHome, type PublicArticle } from "@/components/LocalizedHome";
import { getPlainTextPreview, getPublishedArticles } from "@/lib/articles";
import { getCurrentUser } from "@/lib/auth";
import { MobileHome } from "@/mobile/MobileHome";

export default async function Home() {
  const [articles, user] = await Promise.all([getPublishedArticles(), getCurrentUser()]);
  if (user?.role === "USER") redirect("/lounge");
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
      <div className="desktop-experience">
        <LocalizedHome articles={publicArticles} user={null} />
      </div>
      <div className="mobile-experience">
        <MobileHome articles={publicArticles} />
      </div>
    </>
  );
}
