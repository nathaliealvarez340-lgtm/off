import type { Article, PrismaClient } from "@prisma/client";
import { parseArticleContent, stripHtml } from "./articles";

const COLLECTION_RULES = [
  { collection: "Dirección", terms: ["carrera", "decisión", "decisiones", "propósito", "dirección", "camino", "futuro"] },
  { collection: "Sueños Ajenos", terms: ["comparación", "compararte", "expectativas", "aprobación", "externas", "culpa"] },
  { collection: "Identidad", terms: ["identidad", "autoconocimiento", "quién eres", "reconocerte", "sentirte"] },
  { collection: "Ambición", terms: ["ambición", "éxito", "productividad", "trabajo", "lograr", "rendimiento"] },
  { collection: "Relaciones", terms: ["relaciones", "vínculos", "familia", "pareja", "amistad"] },
  { collection: "Reconstruirte", terms: ["comenzar", "crisis", "cambio", "reconstruir", "volver", "desconexión"] },
] as const;

function articleText(article: Article) {
  const blocks = parseArticleContent(article.content);
  return [
    stripHtml(article.title),
    stripHtml(article.excerpt),
    article.category,
    ...blocks.flatMap((block) => {
      if ("text" in block) return stripHtml(block.text);
      if ("items" in block) return block.items.map(stripHtml);
      if ("caption" in block && block.caption) return stripHtml(block.caption);
      return [];
    }),
  ].join(" ").replace(/\s+/g, " ").trim();
}

function scoreCollection(text: string) {
  const normalized = text.toLocaleLowerCase("es-MX");
  return COLLECTION_RULES
    .map((rule) => ({ ...rule, score: rule.terms.reduce((score, term) => score + (normalized.includes(term) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score)[0];
}

function paragraphs(article: Article) {
  return parseArticleContent(article.content)
    .flatMap((block) => {
      if (block.type === "paragraph" || block.type === "quote" || block.type === "pullquote" || block.type === "highlight" || block.type === "special") {
        return ["text" in block ? stripHtml(block.text) : ""];
      }
      return [];
    })
    .filter((text) => text.split(/\s+/).length >= 12);
}

function signalDrafts(article: Article) {
  const source = paragraphs(article);
  const drafts: string[] = [];
  for (let start = 0; start < source.length && drafts.length < 3; start += 2) {
    const selected: string[] = [];
    let words = 0;
    for (let index = start; index < source.length && words < 100; index += 1) {
      selected.push(source[index]);
      words = selected.join(" ").split(/\s+/).filter(Boolean).length;
    }
    const draft = selected.join("\n\n").split(/\s+/).slice(0, 300).join(" ");
    if (draft.split(/\s+/).length >= 100 && !drafts.includes(draft)) drafts.push(draft);
  }
  if (!drafts.length) {
    const fallback = articleText(article).split(/\s+/).slice(0, 300).join(" ");
    if (fallback.split(/\s+/).length >= 100) drafts.push(fallback);
  }
  return drafts;
}

function resourceSuggestion(article: Article, text: string) {
  const normalized = text.toLocaleLowerCase("es-MX");
  if (/hábito|rutina|disciplina|productividad/.test(normalized)) {
    return { title: `Habit tracker consciente: ${stripHtml(article.title)}`, description: "Una práctica breve para observar constancia, energía e intención sin convertir tu vida en otra métrica de rendimiento." };
  }
  if (/decisión|dirección|propósito|camino/.test(normalized)) {
    return { title: `Framework de dirección: ${stripHtml(article.title)}`, description: "Una estructura de reflexión para distinguir movimiento, presión externa y decisiones que sí representan lo que quieres construir." };
  }
  if (/identidad|comparación|expectativas|desconexión/.test(normalized)) {
    return { title: `Journaling prompts: ${stripHtml(article.title)}`, description: "Preguntas guía para nombrar la tensión central del capítulo y convertirla en una conversación más honesta contigo." };
  }
  return { title: `Ejercicio de reflexión: ${stripHtml(article.title)}`, description: "Una pausa editorial para traducir la idea central del capítulo en una decisión concreta y personal." };
}

export async function deriveLoungeContentFromArticle(db: PrismaClient, article: Article) {
  const text = articleText(article);
  const collection = scoreCollection(text);
  const articlePath = `/off/${article.slug}`;

  const existingLibrary = await db.loungeContent.findFirst({ where: { type: "LIBRARY", relatedArticle: article.id } });
  if (!existingLibrary) {
    const safeCollection = collection.score > 0;
    await db.loungeContent.create({
      data: {
        type: "LIBRARY",
        title: safeCollection ? collection.collection : "Reconstruirte",
        description: stripHtml(article.excerpt),
        links: [{ label: stripHtml(article.title), url: articlePath }],
        relatedArticle: article.id,
        statusLabel: safeCollection ? "Asignación automática" : "Revisar asignación automática",
        status: "draft",
        publishedAt: null,
      },
    });
  }

  const existingSignals = await db.loungeContent.count({ where: { type: "SIGNAL", relatedArticle: article.id } });
  if (!existingSignals) {
    const lastSignal = await db.loungeContent.findFirst({ where: { type: "SIGNAL" }, orderBy: { createdAt: "desc" } });
    let nextNumber = Number(lastSignal?.number) || 0;
    for (const content of signalDrafts(article)) {
      nextNumber += 1;
      await db.loungeContent.create({
        data: {
          type: "SIGNAL",
          title: `Signal derivado de ${stripHtml(article.title)}`,
          number: String(nextNumber).padStart(3, "0"),
          content,
          relatedArticle: article.id,
          statusLabel: "Generado automáticamente",
          status: "draft",
        },
      });
    }
  }

  const existingResource = await db.loungeContent.findFirst({ where: { type: "RESOURCE", relatedArticle: article.id } });
  if (!existingResource) {
    const suggestion = resourceSuggestion(article, text);
    await db.loungeContent.create({
      data: {
        type: "RESOURCE",
        title: suggestion.title,
        description: suggestion.description,
        links: [{ label: "Artículo origen", url: articlePath }],
        relatedArticle: article.id,
        statusLabel: "Generado automáticamente",
        status: "draft",
      },
    });
  }
}
