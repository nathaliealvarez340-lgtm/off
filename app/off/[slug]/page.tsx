import type { Metadata } from "next";
import Image from "next/image";
import type { CSSProperties } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { commentAction, logoutAction, topicSuggestionAction } from "@/app/actions";
import { ArticleActions } from "@/components/ArticleActions";
import { CompleteArticleButton } from "@/components/CompleteArticleButton";
import { MemberActivityTracker } from "@/components/MemberActivityTracker";
import { NotaDeNathalie } from "@/components/NotaDeNathalie";
import { OffEditorialFooter } from "@/components/OffEditorialFooter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ReadingProgress } from "@/components/ReadingProgress";
import {
  formatDate,
  getPlainTextPreview,
  getArticleBySlug,
  getFirstPublishedArticle,
  getPublishedArticles,
  getPublishedComments,
  isInternalContentCategory,
  renderRichContent,
  stripHtml,
} from "@/lib/articles";
import { articleSpeechText, articleUi, normalizeArticleLanguage, resolveArticleTranslation } from "@/lib/article-i18n";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getSiteUrl } from "@/lib/site-url";

function sanitizeInlineHtml(text: string) {
  const withoutUnsafeMarkup = text
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<(?!\/?(strong|b|em|i|u|s|mark|a|br|span|sup|sub)(\s|>|\/))[^>]*>/gi, "");

  return withoutUnsafeMarkup.replace(/<(\/?)(strong|b|em|i|u|s|mark|a|br|span|sup|sub)\b([^>]*)>/gi, (_, closing: string, rawTag: string, rawAttributes: string) => {
    const tag = rawTag.toLowerCase() === "b" ? "strong" : rawTag.toLowerCase() === "i" ? "em" : rawTag.toLowerCase();
    if (closing) return `</${tag}>`;
    if (tag === "br") return "<br>";
    if (tag === "a") {
      const href = rawAttributes.match(/\shref=["']([^"']+)["']/i)?.[1] ?? "";
      const target = rawAttributes.match(/\starget=["'](_blank|_self)["']/i)?.[1];
      const safeHref = /^(https?:\/\/|\/|#|mailto:)/i.test(href) ? href.replace(/"/g, "&quot;") : "#";
      return `<a href="${safeHref}"${target ? ` target="${target}"` : ""} rel="noreferrer">`;
    }
    if (tag === "span" || tag === "mark" || tag === "sup" || tag === "sub") {
      const style = rawAttributes.match(/\sstyle=["']([^"']*)["']/i)?.[1] ?? "";
      const safeStyle = style
        .split(";")
        .map((rule: string) => rule.trim())
        .filter((rule: string) => /^(color|background-color|font-size|line-height|letter-spacing|font-family|font-variation-settings|text-decoration)\s*:/i.test(rule))
        .filter((rule: string) => !/url|expression|javascript|[<>]/i.test(rule))
        .join("; ");
      return `<${tag}${safeStyle ? ` style="${safeStyle.replace(/"/g, "&quot;")}"` : ""}>`;
    }
    return `<${tag}>`;
  });
}

function mediaWidthStyle(width?: string): CSSProperties | undefined {
  if (!width) return undefined;
  const cleanWidth = width.replace(/^width:\s*/i, "").replace(/;$/, "");
  return { width: cleanWidth };
}

function mediaFitStyle(block: { objectFit?: string; objectPosition?: string; aspectRatio?: string }): CSSProperties {
  return {
    objectFit: (block.objectFit ?? "cover") as CSSProperties["objectFit"],
    objectPosition: block.objectPosition ?? "50% 50%",
    aspectRatio: block.aspectRatio || undefined,
  };
}

function renderInline(text: string) {
  text = text.replace(/^<p>([\s\S]*)<\/p>$/i, "$1");
  text = text.replace(/^<h[1-6][^>]*>([\s\S]*)<\/h[1-6]>$/i, "$1");
  if (/<(strong|b|em|i|u|s|mark|a|br|span|sup|sub)(\s|>|\/)/i.test(text)) {
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

  if (!article || article.status !== "published") {
    return {
      title: "Capítulo no encontrado | OFF",
      robots: { index: false, follow: false },
    };
  }

  const title = getPlainTextPreview(article.title, 160);
  const description = getPlainTextPreview(article.excerpt);
  const canonicalUrl = `${getSiteUrl()}/off/${article.slug}`;
  const images = article.coverImage ? [{ url: article.coverImage, alt: title }] : [];

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      siteName: "OFF",
      url: canonicalUrl,
      images,
      type: "article",
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      authors: [article.author],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: article.coverImage ? [article.coverImage] : [],
    },
  };
}

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const { lang } = await searchParams;
  const article = await getArticleBySlug(slug);
  const [user, firstArticle] = await Promise.all([getCurrentUser(), getFirstPublishedArticle()]);

  if (!article || article.status !== "published") {
    notFound();
  }
  if (isInternalContentCategory(article.category) && !user) notFound();

  const cookieLanguage = (await cookies()).get("off-language")?.value;
  const language = normalizeArticleLanguage(user?.preferredLanguage ?? lang ?? cookieLanguage);
  const translatedArticle = resolveArticleTranslation(article, language);
  const blocks = renderRichContent(translatedArticle.content);
  const isFirstChapter = stripHtml(translatedArticle.title).toLowerCase().startsWith("cap1:") || firstArticle?.id === article.id;
  const canReadFull = Boolean(user) || isFirstChapter;
  const visibleBlocks = canReadFull ? blocks : blocks.slice(0, 2);
  const comments = user ? await getPublishedComments(article.id) : [];
  const completion = user ? await getDb().articleCompletion.findUnique({
    where: { userId_articleId: { userId: user.id, articleId: article.id } },
    select: { id: true },
  }) : null;
  const speechBody = visibleBlocks.map((block) => {
    if ("text" in block) return stripHtml(block.text);
    if ("items" in block) return block.items.map(stripHtml).join(". ");
    if ("caption" in block && block.caption !== "spotify") return stripHtml(block.caption ?? "");
    return "";
  }).join(". ");
  const t = articleUi[language];

  return (
    <main className="site-shell">
      {user ? <MemberActivityTracker /> : null}
      <ReadingProgress articleId={article.id} enabled={Boolean(user && user.role === "USER")} />
      <nav className="nav">
        <Link href="/" className="brand article-logo-brand">
          <img src="/logo/logo-off.png" alt="OFF" className="article-nav-logo" />
        </Link>
        <div className="nav-links">
          <LanguageSwitcher compact initialLanguage={language} />
          <Link href="/#capitulos">{t.chapters}</Link>
          <Link href="/#suscripcion">{t.subscription}</Link>
          {user ? (
            <>
              <Link href="/lounge">{t.lounge}</Link>
              <form action={logoutAction}>
                <button className="nav-logout" type="submit">{t.logout}</button>
              </form>
            </>
          ) : null}
        </div>
      </nav>

      <header className="article-hero">
        <p className="eyebrow">{translatedArticle.category || article.category}</p>
        <h1>{renderInline(translatedArticle.title)}</h1>
        <p>{stripHtml(translatedArticle.excerpt)}</p>
        {!translatedArticle.hasTranslation ? <p className="article-translation-notice">{t.unavailable}</p> : null}
        <div className="meta">
          <span>{formatDate(article.publishedAt)}</span>
          <span>{article.author}</span>
          <span>{article.readTime}</span>
        </div>
      </header>

      <div className="article-cover">
        <Image src={article.coverImage} alt={stripHtml(translatedArticle.title)} width={1200} height={720} priority />
      </div>

      <ArticleActions
        isLoggedIn={Boolean(user)}
        language={language}
        loginPath={`/login?next=${encodeURIComponent(`/off/${article.slug}?lang=${language}`)}`}
        slug={article.slug}
        speechText={articleSpeechText(translatedArticle.title, translatedArticle.excerpt, speechBody)}
        title={stripHtml(translatedArticle.title)}
        userKey={user?.id}
      />

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
                  <figure
                    className={`reader-image align-${block.align ?? "center"} wrap-${block.wrapMode ?? "top-bottom"}`}
                    style={mediaWidthStyle(block.width)}
                    key={index}
                  >
                    <img src={block.src} alt={block.alt} style={mediaFitStyle(block)} />
                    {block.caption ? <figcaption>{stripHtml(block.caption)}</figcaption> : null}
                  </figure>
                );
              case "gallery":
              case "collage":
                return (
                  <figure className={`reader-gallery ${block.type} collage-${block.template ?? "two-equal"}`} key={index}>
                    {block.images.filter((image) => image.src).map((image, imageIndex) => (
                      <figure key={`${image.src}-${imageIndex}`}>
                        <img src={image.src} alt={image.alt ?? "Imagen editorial"} />
                        {image.caption ? <figcaption>{stripHtml(image.caption)}</figcaption> : null}
                      </figure>
                    ))}
                    {block.caption ? <figcaption className="collage-caption">{stripHtml(block.caption)}</figcaption> : null}
                  </figure>
                );
              case "embed":
                return (
                  <a className={block.caption === "spotify" ? "spotify-pill" : "reader-embed"} href={block.url} target="_blank" key={index}>
                    {block.caption === "spotify" ? <span className="spotify-pill-logo" aria-hidden="true" /> : null}
                    <span className={block.caption === "spotify" ? "spotify-pill-title" : undefined}>{block.caption === "spotify" ? stripHtml(block.label ?? "Contenido de Spotify") : block.url}</span>
                  </a>
                );
              case "video":
                return (
                  <figure
                    className={`reader-video video-${block.label ?? "medium"} align-${block.align ?? "center"} wrap-${block.wrapMode ?? "top-bottom"}`}
                    style={mediaWidthStyle(block.width)}
                    key={index}
                  >
                    <video src={block.url} style={mediaFitStyle(block)} controls />
                    {block.caption ? <figcaption>{stripHtml(block.caption)}</figcaption> : null}
                  </figure>
                );
              case "cta":
                return (
                  <aside className="reader-cta" key={index}>
                    <p>{renderInline(block.text)}</p>
                    <Link className="button violet-button" href={block.url}>{block.label}</Link>
                  </aside>
                );
              case "subscribe":
              case "share":
                return (
                  <aside className="reader-cta" key={index}>
                    <p>{renderInline(block.text)}</p>
                  </aside>
                );
              case "stat":
                return (
                  <aside className="reader-stat" key={index}>
                    <strong>{stripHtml(block.value)}</strong>
                    <span>{stripHtml(block.label)}</span>
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
                    <p>{renderInline(block.text)}</p>
                  </aside>
                );
            }
          })}

          {!canReadFull ? (
            <aside className="reader-gate">
              <p className="eyebrow">{t.complete}</p>
              <h2>{t.gateTitle}</h2>
              <p>{t.gateCopy}</p>
              <Link className="button violet-button" href={`/login?next=${encodeURIComponent(`/off/${article.slug}`)}`}>
                {t.enterOff}
              </Link>
            </aside>
          ) : null}

          {user ? (
            <section className="member-article-exclusive">
              <p className="eyebrow">{t.privatePortfolio}</p>
              <h2>{t.membersOnly}</h2>
              <div>
                <article><span>{t.exercise}</span><p>{t.exerciseText}</p></article>
                <article><span>{t.journal}</span><p>{t.journalText}</p></article>
                <article><span>{t.framework}</span><p>{t.frameworkText}</p></article>
              </div>
              <NotaDeNathalie>{t.note}</NotaDeNathalie>
            </section>
          ) : null}

          <OffEditorialFooter language={language} sourceContent={translatedArticle.content} />
          {user ? <CompleteArticleButton articleId={article.id} initiallyCompleted={Boolean(completion)} /> : null}
        </article>

        <aside className="article-side-panel">
          {user ? (
            <section className="topic-suggestion-section">
              <div>
                <p className="eyebrow">{t.listens}</p>
                <h2>{t.topicQuestion}</h2>
              </div>
              <form action={topicSuggestionAction}>
                <input name="articleId" type="hidden" value={article.id} />
                <input name="articleSlug" type="hidden" value={article.slug} />
                <input name="articlePath" type="hidden" value={`/off/${article.slug}`} />
                <textarea name="content" placeholder={t.topicPlaceholder} required minLength={2} />
                <button className="button violet-button" type="submit">{t.send}</button>
              </form>
            </section>
          ) : null}

          <section className="comments-section">
            <div className="comments-head">
              <p className="eyebrow">{t.privateRoom}</p>
              <h2>{t.conversation}</h2>
            </div>

        {!user ? (
          <div className="comment-login locked-comments">
            <h3><span aria-hidden="true">🔒</span> {t.shareReflection}</h3>
            <p>{t.story}</p>
            <Link className="button violet-button locked-comment-button" href={`/login?next=${encodeURIComponent(`/off/${article.slug}`)}`}>
              {t.join}
            </Link>
          </div>
        ) : (
          <>
            <form action={commentAction} className="comment-form">
              <input name="articleId" type="hidden" value={article.id} />
              <input name="articleSlug" type="hidden" value={article.slug} />
              <input name="articlePath" type="hidden" value={`/off/${article.slug}`} />
              <label className="field">
                {t.shareReflection}
                <textarea name="content" required minLength={2} />
              </label>
              <button className="button" type="submit">{t.continueConversation}</button>
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
                    <textarea name="content" placeholder={t.replyPlaceholder} required minLength={2} />
                    <button type="submit">{t.reply}</button>
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


