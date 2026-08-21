export const MAX_SEARCH_KEYWORDS = 25;
export const MAX_SEARCH_KEYWORD_LENGTH = 64;

function comparableKeyword(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSearchKeywords(value: unknown) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(value) as unknown;
            return Array.isArray(parsed) ? parsed : value.split(",");
          } catch {
            return value.split(",");
          }
        })()
      : [];

  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const item of source) {
    if (typeof item !== "string") continue;
    const keyword = item.replace(/\s+/g, " ").trim().slice(0, MAX_SEARCH_KEYWORD_LENGTH);
    const comparable = comparableKeyword(keyword);
    if (!comparable || seen.has(comparable)) continue;
    seen.add(comparable);
    keywords.push(keyword);
    if (keywords.length === MAX_SEARCH_KEYWORDS) break;
  }
  return keywords;
}
