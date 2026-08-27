import { getDb } from "@/lib/db";
import { resolveThemeKeys, themeLabel, type OffThemeKey } from "@/lib/off-themes";
import type { UiLanguage } from "@/lib/ui-i18n";

export type MapSignal = { theme: OffThemeKey; label: string; count: number; reasons: string[]; articles: Array<{ title: string; slug: string }>; highlights: Array<{ id: string; text: string; articleSlug: string }>; rituals: Array<{ prompt: string; updatedAt: string }>; conversations: Array<{ id: string; question: string }> };

const reasonCopy = {
  es: { completed: (title: string) => `Completaste “${title}”.`, highlighted: (title: string) => `Guardaste un fragmento de “${title}”.`, ritual: "Participaste en un ritual relacionado.", conversation: (question: string) => `Participaste en “${question}”.` },
  en: { completed: (title: string) => `You completed “${title}”.`, highlighted: (title: string) => `You saved a fragment from “${title}”.`, ritual: "You took part in a related ritual.", conversation: (question: string) => `You took part in “${question}”.` },
  it: { completed: (title: string) => `Hai completato “${title}”.`, highlighted: (title: string) => `Hai salvato un frammento di “${title}”.`, ritual: "Hai partecipato a un rituale correlato.", conversation: (question: string) => `Hai partecipato a “${question}”.` },
  pt: { completed: (title: string) => `Você concluiu “${title}”.`, highlighted: (title: string) => `Você salvou um trecho de “${title}”.`, ritual: "Você participou de um ritual relacionado.", conversation: (question: string) => `Você participou de “${question}”.` },
};

export async function getPersonalMap(userId: string, language: UiLanguage) {
  const db = getDb();
  const [completions, highlights, ritualResponses, conversationReplies] = await Promise.all([
    db.articleCompletion.findMany({ where: { userId }, include: { article: { select: { title: true, slug: true, category: true, keywords: true, themes: true } } }, orderBy: { completedAt: "desc" } }),
    db.articleHighlight.findMany({ where: { userId }, include: { article: { select: { title: true, slug: true, category: true, keywords: true, themes: true } } }, orderBy: { updatedAt: "desc" } }),
    db.ritualResponse.findMany({ where: { userId }, include: { ritual: { select: { prompt: true, themes: true } } }, orderBy: { updatedAt: "desc" } }),
    db.editorialConversationReply.findMany({ where: { userId, status: "PUBLISHED" }, include: { conversation: { select: { question: true, themes: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  const map = new Map<OffThemeKey, MapSignal>();
  const ensure = (theme: OffThemeKey) => {
    if (!map.has(theme)) map.set(theme, { theme, label: themeLabel(theme, language), count: 0, reasons: [], articles: [], highlights: [], rituals: [], conversations: [] });
    return map.get(theme)!;
  };
  const reasons = reasonCopy[language];
  completions.forEach((item) => resolveThemeKeys(item.article.themes, item.article.category, item.article.keywords, item.article.title).forEach((theme) => { const node = ensure(theme); node.count += 2; node.reasons.push(reasons.completed(item.article.title)); if (!node.articles.some((article) => article.slug === item.article.slug)) node.articles.push({ title: item.article.title, slug: item.article.slug }); }));
  highlights.forEach((item) => resolveThemeKeys(item.article.themes, item.article.category, item.article.keywords, item.article.title, item.selectedText).forEach((theme) => { const node = ensure(theme); node.count += 1; node.reasons.push(reasons.highlighted(item.article.title)); node.highlights.push({ id: item.id, text: item.selectedText, articleSlug: item.article.slug }); }));
  ritualResponses.forEach((item) => resolveThemeKeys(item.ritual.themes).forEach((theme) => { const node = ensure(theme); node.count += 1; node.reasons.push(reasons.ritual); node.rituals.push({ prompt: item.ritual.prompt, updatedAt: item.updatedAt.toISOString() }); }));
  conversationReplies.forEach((item) => resolveThemeKeys(item.conversation.themes).forEach((theme) => { const node = ensure(theme); node.count += 1; node.reasons.push(reasons.conversation(item.conversation.question)); if (!node.conversations.some((conversation) => conversation.id === item.conversationId)) node.conversations.push({ id: item.conversationId, question: item.conversation.question }); }));
  const signals = [...map.values()].sort((a, b) => b.count - a.count);
  return { signals, totalSignals: signals.reduce((sum, signal) => sum + signal.count, 0), generatedAt: new Date().toISOString() };
}
