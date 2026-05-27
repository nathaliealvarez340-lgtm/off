import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReadingProgress } from "@/components/ReadingProgress";
import { ShareButtons } from "@/components/ShareButtons";
import { formatDate, getArticleBySlug, getPublishedArticles, parseArticleContent } from "@/lib/articles";

export async function generateStaticParams() {
  const articles = await getPublishedArticles();
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return { title: "Capítulo no encontrado | OFF" };
  }

  return {
    title: `${article.title} | OFF`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: [article.coverImage],
      type: "article",
      publishedTime: article.publishedAt?.toISOString(),
      authors: [article.author],
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article || article.status !== "published") {
    notFound();
  }

  const blocks = parseArticleContent(article.content);

  return (
    <main className="site-shell">
      <ReadingProgress />
      <nav className="nav">
        <Link href="/" className="brand">
          <span className="brand-mark">O</span>
          OFF
        </Link>
        <div className="nav-links">
          <Link href="/#capitulos">Capítulos</Link>
          <Link href="/#suscripcion">Suscripción</Link>
        </div>
      </nav>

      <header className="article-hero">
        <p className="eyebrow">{article.category}</p>
        <h1>{article.title}</h1>
        <p>{article.excerpt}</p>
        <div className="meta">
          <span>{formatDate(article.publishedAt)}</span>
          <span>{article.author}</span>
          <span>{article.readTime}</span>
        </div>
        <ShareButtons title={article.title} />
      </header>

      <div className="article-cover">
        <Image src={article.coverImage} alt={article.title} width={1200} height={720} priority />
      </div>

      <article className="reader">
        {blocks.map((block, index) => {
          switch (block.type) {
            case "paragraph":
              return <p key={index}>{block.text}</p>;
            case "h2":
              return <h2 key={index}>{block.text}</h2>;
            case "h3":
              return <h3 key={index}>{block.text}</h3>;
            case "quote":
              return <blockquote key={index}>{block.text}</blockquote>;
            case "divider":
              return <hr key={index} />;
            case "image":
              return <Image key={index} src={block.src} alt={block.alt} width={900} height={560} />;
            case "special":
              return (
                <aside className="special-block" key={index}>
                  <strong>{block.label}</strong>
                  <p>{block.text}</p>
                </aside>
              );
          }
        })}
      </article>
    </main>
  );
}
