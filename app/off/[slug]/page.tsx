import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { commentAction, logoutAction, topicSuggestionAction } from "@/app/actions";
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

function plainText(text: string) {
  return text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function renderInline(text: string) {
  text = text.replace(/^<p>([\s\S]*)<\/p>$/i, "$1");
  text = text.replace(/^<h[1-6][^>]*>([\s\S]*)<\/h[1-6]>$/i, "$1");
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
    return { title: "CapÃ­tulo no encontrado | OFF" };
  }

  return {
    title: `${plainText(article.title)} | OFF`,
    description: plainText(article.excerpt),
    openGraph: {
      title: plainText(article.title),
      description: plainText(article.excerpt),
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
  const isFirstChapter = article.title.trim().toLowerCase().startsWith("cap1:") || firstArticle?.id === article.id;
  const canReadFull = Boolean(user) || isFirstChapter;
  const visibleBlocks = canReadFull ? blocks : blocks.slice(0, 2);
  const comments = user ? await getPublishedComments(article.id) : [];

  return (
    <main className="site-shell">
      <ReadingProgress />
      <nav className="nav">
        <Link href="/" className="brand article-logo-brand">
          <img src="/logo/logo-off.png" alt="OFF" className="article-nav-logo" />
        </Link>
        <div className="nav-links">
          <Link href="/#capitulos">Capítulos</Link>
          <Link href="/#suscripcion">Suscripción</Link>
          {user ? (
            <form action={logoutAction}>
              <button className="nav-logout" type="submit">Cerrar sesión</button>
            </form>
          ) : null}
        </div>
      </nav>

      <header className="article-hero">
        <p className="eyebrow">{article.category}</p>
        <h1>{renderInline(article.title)}</h1>
        <p>{renderInline(article.excerpt)}</p>
        <div className="meta">
          <span>{formatDate(article.publishedAt)}</span>
          <span>{article.author}</span>
          <span>{article.readTime}</span>
        </div>
        <ShareButtons title={plainText(article.title)} />
      </header>

      <div className="article-cover">
        <Image src={article.coverImage} alt={article.title} width={1200} height={720} priority />
      </div>

      <div className="article-reader-layout">
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
                return (
                  <a className={block.caption === "spotify" ? "spotify-card" : "reader-embed"} href={block.url} target="_blank" key={index}>
                    {block.caption === "spotify" ? <span className="spotify-logo">Spotify</span> : null}
                    <strong>{block.caption === "spotify" ? block.label ?? "Contenido de Spotify" : block.url}</strong>
                  </a>
                );
              case "video":
                return (
                <figure className={`reader-video video-${block.label ?? "medium"}`} key={index}>
                    <video src={block.url} controls />
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
              <h2>Hay más detrás de esta historia.</h2>
              <p>Suscríbete para seguir leyendo y descubrir nuevas formas de entender tus 20 y entender lo que pasa cuando dejamos de vivir en automático.</p>
              <Link className="button violet-button" href={`/login?next=${encodeURIComponent(`/off/${article.slug}`)}`}>
                Entrar a OFF
              </Link>
            </aside>
          ) : null}
        </article>

        <aside className="article-side-panel">
          {user ? (
            <section className="topic-suggestion-section">
              <div>
                <p className="eyebrow">OFF escucha</p>
                <h2>¿De qué te gustaría hablar en el próximo capítulo?</h2>
              </div>
              <form action={topicSuggestionAction}>
                <input name="articleId" type="hidden" value={article.id} />
                <input name="articleSlug" type="hidden" value={article.slug} />
                <input name="articlePath" type="hidden" value={`/off/${article.slug}`} />
                <textarea name="content" placeholder="Escribe una idea o tensión..." required minLength={2} />
                <button className="button violet-button" type="submit">Enviar</button>
              </form>
            </section>
          ) : null}

          <section className="comments-section">
            <div className="comments-head">
              <p className="eyebrow">Conversación</p>
              <h2>Comentarios</h2>
            </div>

        {!user ? (
          <div className="comment-login locked-comments">
            <h3><span aria-hidden="true">🔒</span> Comentar</h3>
            <p>Tu historia también importa.<br />Únete a OFF para compartir tus pensamientos, responder y formar parte de la conversación.</p>
            <Link className="button violet-button locked-comment-button" href={`/login?next=${encodeURIComponent(`/off/${article.slug}`)}`}>
              Unirme
            </Link>
          </div>
        ) : (
          <>
            <form action={commentAction} className="comment-form">
              <input name="articleId" type="hidden" value={article.id} />
              <input name="articleSlug" type="hidden" value={article.slug} />
              <input name="articlePath" type="hidden" value={`/off/${article.slug}`} />
              <label className="field">
                Escribe tu comentario
                <textarea name="content" required minLength={2} />
              </label>
              <button className="button" type="submit">Publicar comentario</button>
            </form>

            <div className="comment-list">
              {comments.map((comment) => (
                <article className="comment-card" key={comment.id}>
                  <strong>{comment.user.name}</strong>
                  <span>{formatDate(comment.createdAt)}</span>
                  <p>{comment.content}</p>
                  <form action={commentAction} className="reply-form">
                    <input name="articleId" type="hidden" value={article.id} />
                    <input name="articleSlug" type="hidden" value={article.slug} />
                    <input name="articlePath" type="hidden" value={`/off/${article.slug}`} />
                    <input name="parentId" type="hidden" value={comment.id} />
                    <textarea name="content" placeholder="Responder..." required minLength={2} />
                    <button type="submit">Responder</button>
                  </form>
                  {comment.replies.length > 0 ? (
                    <div className="reply-list">
                      {comment.replies.map((reply) => (
                        <div className="comment-reply" key={reply.id}>
                          <strong>{reply.user.name}</strong>
                          <span>{formatDate(reply.createdAt)}</span>
                          <p>{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        )}
          </section>
        </aside>
      </div>
    </main>
  );
}


