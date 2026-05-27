import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { commentAction } from "@/app/actions";
import { ReadingProgress } from "@/components/ReadingProgress";
import { ShareButtons } from "@/components/ShareButtons";
import {
  formatDate,
  getArticleBySlug,
  getFirstPublishedArticle,
  getPublishedArticles,
  getPublishedComments,
  parseArticleContent,
} from "@/lib/articles";
import { getCurrentUser } from "@/lib/auth";

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
  const [user, firstArticle] = await Promise.all([getCurrentUser(), getFirstPublishedArticle()]);

  if (!article || article.status !== "published") {
    notFound();
  }

  const blocks = parseArticleContent(article.content);
  const canReadFull = Boolean(user) || firstArticle?.id === article.id;
  const visibleBlocks = canReadFull ? blocks : blocks.slice(0, 2);
  const comments = await getPublishedComments(article.id);

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
        {visibleBlocks.map((block, index) => {
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
              return (
                <figure className={`reader-image align-${block.align ?? "center"}`} key={index}>
                  <Image src={block.src} alt={block.alt} width={900} height={560} />
                  {block.caption ? <figcaption>{block.caption}</figcaption> : null}
                </figure>
              );
            case "special":
              return (
                <aside className="special-block" key={index}>
                  <strong>{block.label}</strong>
                  <p>{block.text}</p>
                </aside>
              );
          }
        })}

        {!canReadFull ? (
          <aside className="reader-gate">
            <p className="eyebrow">OFF completo</p>
            <h2>Este capítulo continúa adentro.</h2>
            <p>Inicia sesión o crea tu cuenta para leer el artículo completo, recibir ejercicios y comentar.</p>
            <Link className="button violet-button" href={`/login?next=${encodeURIComponent(`/off/${article.slug}`)}`}>
              Entrar a OFF
            </Link>
          </aside>
        ) : null}
      </article>

      <section className="comments-section">
        <div className="comments-head">
          <p className="eyebrow">Conversación</p>
          <h2>Comentarios</h2>
        </div>

        {user ? (
          <form action={commentAction} className="comment-form">
            <input name="articleId" type="hidden" value={article.id} />
            <input name="articleSlug" type="hidden" value={article.slug} />
            <input name="articlePath" type="hidden" value={`/off/${article.slug}`} />
            <label className="field">
              Escribe tu comentario
              <textarea name="content" required minLength={2} />
            </label>
            <button className="button" type="submit">
              Publicar comentario
            </button>
          </form>
        ) : (
          <div className="comment-login">
            <p>Inicia sesión para comentar sin anonimato.</p>
            <Link className="ghost-button" href={`/login?next=${encodeURIComponent(`/off/${article.slug}`)}`}>
              Iniciar sesión
            </Link>
          </div>
        )}

        <div className="comment-list">
          {comments.map((comment) => (
            <article className="comment-card" key={comment.id}>
              <strong>{comment.user.name}</strong>
              <span>{formatDate(comment.createdAt)}</span>
              <p>{comment.content}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
