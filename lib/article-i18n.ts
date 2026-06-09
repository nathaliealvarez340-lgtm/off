import { stripHtml } from "./articles";

export type ArticleLanguage = "es" | "en" | "it" | "pt";

export type ArticleTranslation = {
  title: string;
  excerpt: string;
  content: string;
};

type ArticleTranslationEnvelope = {
  type: "off-article-translations";
  originalLanguage?: ArticleLanguage;
  translations?: Partial<Record<ArticleLanguage, Partial<ArticleTranslation>>>;
};

export const articleLanguages: Array<{ code: ArticleLanguage; label: string }> = [
  { code: "es", label: "ES" },
  { code: "en", label: "EN" },
  { code: "it", label: "IT" },
  { code: "pt", label: "PT" },
];

export const articleUi = {
  es: {
    unavailable: "Este artículo aún no está disponible en este idioma.",
    save: "Guardar",
    saved: "Guardado",
    reader: "Lector interactivo",
    share: "Compartir",
    play: "Reproducir lectura",
    stop: "Detener lectura",
    speed: "Velocidad",
    voice: "Voz",
    woman: "Mujer",
    man: "Hombre",
    copy: "Copiar link",
    nativeShare: "Compartir desde dispositivo",
  },
  en: {
    unavailable: "This article is not yet available in this language.",
    save: "Save",
    saved: "Saved",
    reader: "Interactive reader",
    share: "Share",
    play: "Play article",
    stop: "Stop reading",
    speed: "Speed",
    voice: "Voice",
    woman: "Woman",
    man: "Man",
    copy: "Copy link",
    nativeShare: "Share from device",
  },
  it: {
    unavailable: "Questo articolo non è ancora disponibile in questa lingua.",
    save: "Salva",
    saved: "Salvato",
    reader: "Lettore interattivo",
    share: "Condividi",
    play: "Riproduci lettura",
    stop: "Interrompi lettura",
    speed: "Velocità",
    voice: "Voce",
    woman: "Donna",
    man: "Uomo",
    copy: "Copia link",
    nativeShare: "Condividi dal dispositivo",
  },
  pt: {
    unavailable: "Este artigo ainda não está disponível neste idioma.",
    save: "Salvar",
    saved: "Salvo",
    reader: "Leitor interativo",
    share: "Compartilhar",
    play: "Reproduzir leitura",
    stop: "Parar leitura",
    speed: "Velocidade",
    voice: "Voz",
    woman: "Mulher",
    man: "Homem",
    copy: "Copiar link",
    nativeShare: "Compartilhar pelo dispositivo",
  },
} as const;

export function normalizeArticleLanguage(value?: string): ArticleLanguage {
  return value === "en" || value === "it" || value === "pt" ? value : "es";
}

export function resolveArticleTranslation(
  article: ArticleTranslation,
  requestedLanguage: ArticleLanguage,
) {
  let envelope: ArticleTranslationEnvelope | null = null;

  try {
    const parsed = JSON.parse(article.content) as ArticleTranslationEnvelope;
    if (parsed?.type === "off-article-translations" && parsed.translations) envelope = parsed;
  } catch {
    envelope = null;
  }

  const originalLanguage = envelope?.originalLanguage ?? "es";
  const original = envelope?.translations?.[originalLanguage];
  const requested = envelope?.translations?.[requestedLanguage];
  const base = {
    title: original?.title || article.title,
    excerpt: original?.excerpt || article.excerpt,
    content: original?.content || article.content,
  };

  if (!requested || !requested.title || !requested.excerpt || !requested.content) {
    return {
      ...base,
      language: originalLanguage,
      requestedLanguage,
      hasTranslation: requestedLanguage === originalLanguage,
    };
  }

  return {
    title: requested.title,
    excerpt: requested.excerpt,
    content: requested.content,
    language: requestedLanguage,
    requestedLanguage,
    hasTranslation: true,
  };
}

export function articleSpeechText(title: string, excerpt: string, contentText: string) {
  return [stripHtml(title), stripHtml(excerpt), stripHtml(contentText)].filter(Boolean).join(". ");
}
