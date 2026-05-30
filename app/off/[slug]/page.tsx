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

function sanitizeInlineHtml(text: string) {
  return text
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/\shref=["']javascript:[^"']*["']/gi, "")
    .replace(/\sstyle=["'][^"']*(url|expression|javascript)[^"']*["']/gi, "")
    .replace(/<(?!\/?(strong|em|u|s|mark|a|br|span)(\s|>|\/))/gi, "&lt;")
    .replace(/<a\s/gi, "<a rel=\"noreferrer\" ");
}

function renderInline(text: string) {
  if (/<(strong|em|u|s|mark|a|br|span)(\s|>|\/)/i.test(text)) {
    return <span dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(text) }} />;
  }

  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|<u>[^<]+<\/u>|==[^=]+==|~~[^~]+~~)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("_") && part.endsWith("_")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("<u>") && part.endsWith("</u>")) return <u key={index}>{part.slice(3, -4)}</u>;
    if (part.startsWith("==") && part.endsWith("==")) return <mark key={index}>{part.slice(2, -2)}</mark>;
    if (part.startsWith("~~") && part.endsWith("~~")) return <s key={index}>{part.slice(2, -2)}</s>;
    return <span key={index}>{part}</span>;
  });
}

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
              return <p className={`align-${block.align ?? "left"}`} style={{ color: block.color, background: block.highlightColor }} key={index}>{renderInline(block.text)}</p>;
            case "h1":
              return <h2 className={`reader-h1 align-${block.align ?? "left"}`} style={{ color: block.color, background: block.highlightColor }} key={index}>{renderInline(block.text)}</h2>;
            case "h2":
              return <h2 className={`align-${block.align ?? "left"}`} style={{ color: block.color, background: block.highlightColor }} key={index}>{renderInline(block.text)}</h2>;
            case "h3":
              return <h3 className={`align-${block.align ?? "left"}`} style={{ color: block.color, background: block.highlightColor }} key={index}>{renderInline(block.text)}</h3>;
            case "highlight":
              return <p className="reader-highlight" style={{ color: block.color, background: block.highlightColor }} key={index}>{renderInline(block.text)}</p>;
            case "code":
              return <pre className="reader-code" key={index}><code>{block.text}</code></pre>;
            case "list":
              return <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ul>;
            case "numbered":
              return <ol key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ol>;
            case "checklist":
              return <ul className="reader-checklist" key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ul>;
            case "quote":
              return <blockquote key={index}>{renderInline(block.text)}</blockquote>;
            case "pullquote":
              return <blockquote className="reader-pullquote" key={index}>{renderInline(block.text)}</blockquote>;
            case "divider":
              return <hr key={index} />;
            case "image":
              return (
                <figure className={`reader-image align-${block.align ?? "center"}`} key={index}>
                  <Image src={block.src} alt={block.alt} width={900} height={560} style={block.width ? { width: block.width.replace(/^width:\s*/i, "").replace(/;$/, ""), height: "auto" } : undefined} />
                  {block.caption ? <figcaption>{block.caption}</figcaption> : null}
                </figure>
              );
            case "gallery":
            case "collage":
              return (
                <div className={`reader-gallery ${block.type}`} key={index}>
                  {block.images.map((image, imageIndex) => (
                    <figure key={`${image.src}-${imageIndex}`}>
                      <Image src={image.src} alt={image.alt ?? "Imagen editorial"} width={700} height={520} />
                      {image.caption ? <figcaption>{image.caption}</figcaption> : null}
                    </figure>
                  ))}
                </div>
              );
            case "embed":
            case "video":
              return (
                <figure className="reader-embed" key={index}>
                  <a href={block.url} target="_blank">{block.url}</a>
                  {block.caption ? <figcaption>{block.caption}</figcaption> : null}
                </figure>
              );
            case "cta":
              return (
                <aside className="reader-cta" key={index}>
                  <p>{block.text}</p>
                  <Link className="button violet-button" href={block.url}>{block.label}</Link>
                </aside>
              );
            case "subscribe":
            case "share":
              return (
                <aside className="reader-cta" key={index}>
                  <p>{block.text}</p>
                </aside>
              );
            case "stat":
              return (
                <aside className="reader-stat" key={index}>
                  <strong>{block.value}</strong>
                  <span>{block.label}</span>
                </aside>
              );
            case "columns":
              return (
                <div className="reader-columns" key={index}>
                  <p>{renderInline(block.left)}</p>
                  <p>{renderInline(block.right)}</p>
                </div>
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
