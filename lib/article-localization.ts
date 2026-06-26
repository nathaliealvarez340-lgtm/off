export type LocalizedArticleLanguage = "es" | "en" | "it" | "pt";

export type LocalizedArticleFields = {
  title: string;
  excerpt: string;
  content?: string;
  category: string;
  slug?: string;
  readTime?: string;
};

export type ArticleTranslationFields = Partial<Pick<LocalizedArticleFields, "title" | "excerpt" | "content" | "category" | "slug" | "readTime">>;

export type ArticleTranslationMap = Partial<Record<LocalizedArticleLanguage, ArticleTranslationFields>>;

type ArticleTranslationEnvelope = {
  type?: string;
  originalLanguage?: LocalizedArticleLanguage;
  translations?: ArticleTranslationMap;
};

export function normalizeLocalizedArticleLanguage(value?: string | null): LocalizedArticleLanguage {
  return value === "en" || value === "it" || value === "pt" ? value : "es";
}

export function extractArticleTranslations(content?: string | null): {
  originalLanguage: LocalizedArticleLanguage;
  translations: ArticleTranslationMap;
} {
  if (!content) return { originalLanguage: "es", translations: {} };

  try {
    const parsed = JSON.parse(content) as ArticleTranslationEnvelope;
    if (parsed?.type === "off-article-translations" && parsed.translations) {
      return {
        originalLanguage: normalizeLocalizedArticleLanguage(parsed.originalLanguage),
        translations: parsed.translations,
      };
    }
  } catch {
    return { originalLanguage: "es", translations: {} };
  }

  return { originalLanguage: "es", translations: {} };
}

export function getLocalizedArticle<TArticle extends LocalizedArticleFields & { translations?: ArticleTranslationMap }>(
  article: TArticle,
  requestedLanguage?: string | null,
) {
  const language = normalizeLocalizedArticleLanguage(requestedLanguage);
  const translations = article.translations ?? {};
  const spanish = translations.es;
  const requested = translations[language];
  const fallback = {
    title: spanish?.title || article.title,
    excerpt: spanish?.excerpt || article.excerpt,
    content: spanish?.content || article.content,
    category: spanish?.category || article.category,
    slug: spanish?.slug || article.slug || "",
    readTime: spanish?.readTime || article.readTime || "",
  };

  if (!requested) return { ...fallback, language: "es" as const, requestedLanguage: language, hasTranslation: language === "es" };

  return {
    title: requested.title || fallback.title,
    excerpt: requested.excerpt || fallback.excerpt,
    content: requested.content || fallback.content,
    category: requested.category || fallback.category,
    slug: requested.slug || fallback.slug || "",
    readTime: requested.readTime || fallback.readTime || "",
    language,
    requestedLanguage: language,
    hasTranslation: Boolean(requested.title || requested.excerpt || requested.content || requested.category),
  };
}
