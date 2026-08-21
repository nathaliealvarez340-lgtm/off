export type SearchLanguage = "es" | "en" | "it" | "pt";

export type SearchableDocument = {
  title: string;
  keywords?: string[];
  excerpt?: string;
  category?: string;
  body?: string;
  language?: SearchLanguage;
};

export type SearchScore = {
  score: number;
  matchedTerms: string[];
};

const STOP_WORDS: Record<SearchLanguage, Set<string>> = {
  es: new Set(["a", "al", "de", "del", "el", "en", "la", "las", "lo", "los", "por", "que", "un", "una", "y"]),
  en: new Set(["a", "an", "and", "for", "in", "of", "on", "the", "to"]),
  it: new Set(["a", "che", "con", "da", "del", "di", "e", "il", "in", "la", "le", "un", "una"]),
  pt: new Set(["a", "as", "com", "de", "do", "e", "em", "o", "os", "para", "que", "um", "uma"]),
};

export const SEARCH_ALIASES: Record<SearchLanguage, string[][]> = {
  es: [
    ["voy tarde", "estar atrasado", "sentirse atrasado", "no avanzo", "todos avanzan menos yo", "presion por avanzar", "crisis de los 20", "expectativas de vida"],
    ["comparacion", "compararme", "compararse", "compararte", "medirme con los demas", "los demas avanzan"],
    ["amistades", "amigos", "perdi amigos", "perder amigos", "alejarme de personas", "dejar ir amigos", "amistades que terminan", "soltar personas"],
    ["trabajo", "carrera", "empleo", "profesion", "vida profesional", "presion profesional"],
    ["ansiedad", "ansiedad funcional", "estres", "agotamiento", "cansancio mental", "desconexion emocional"],
    ["proposito", "direccion", "sentido", "claridad", "sentirme perdido", "identidad"],
    ["exito", "triunfar", "lograrlo", "crecimiento profesional", "sentirse vacio"],
  ],
  en: [
    ["feeling behind", "falling behind", "running late in life", "not moving forward", "everyone is ahead", "twenties crisis"],
    ["comparison", "compare myself", "comparing yourself", "everyone else is progressing"],
    ["friendships", "friends", "lost friends", "letting friends go", "growing apart", "leaving people behind"],
    ["work", "career", "job", "profession", "professional pressure"],
    ["anxiety", "stress", "burnout", "mental exhaustion", "emotional disconnection"],
    ["purpose", "direction", "meaning", "clarity", "feeling lost", "identity"],
    ["success", "achievement", "professional growth", "feeling empty"],
  ],
  it: [
    ["sentirsi indietro", "essere in ritardo", "non andare avanti", "tutti vanno avanti", "crisi dei vent anni"],
    ["confronto", "paragonarmi", "confrontarsi", "gli altri avanzano"],
    ["amicizie", "amici", "perdere amici", "allontanarsi", "lasciare andare persone"],
    ["lavoro", "carriera", "impiego", "professione", "pressione professionale"],
    ["ansia", "stress", "esaurimento", "stanchezza mentale", "disconnessione emotiva"],
    ["scopo", "direzione", "senso", "chiarezza", "sentirsi persi", "identita"],
  ],
  pt: [
    ["sentir atrasado", "estar atrasado", "nao avancar", "todos avancam", "crise dos vinte"],
    ["comparacao", "me comparar", "comparar se", "os outros avancam"],
    ["amizades", "amigos", "perder amigos", "afastar se", "deixar pessoas irem"],
    ["trabalho", "carreira", "emprego", "profissao", "pressao profissional"],
    ["ansiedade", "estresse", "esgotamento", "cansaco mental", "desconexao emocional"],
    ["proposito", "direcao", "sentido", "clareza", "sentir se perdido", "identidade"],
  ],
};

export function normalizeSearchText(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|#0?39);/gi, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeSearchText(value: string, language: SearchLanguage) {
  return normalizeSearchText(value)
    .split(" ")
    .filter((token) => token.length >= 2 && !STOP_WORDS[language].has(token));
}

function boundedLevenshtein(left: string, right: string) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

export function fuzzySimilarity(left: string, right: string) {
  const a = normalizeSearchText(left);
  const b = normalizeSearchText(right);
  if (!a || !b) return 0;
  return 1 - boundedLevenshtein(a, b) / Math.max(a.length, b.length);
}

function relatedTerms(query: string, language: SearchLanguage) {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = tokenizeSearchText(query, language);
  const related = new Set<string>();
  for (const group of SEARCH_ALIASES[language]) {
    const normalizedGroup = group.map(normalizeSearchText);
    const activated = normalizedGroup.some((alias) => {
      if (normalizedQuery.includes(alias) || alias.includes(normalizedQuery)) return true;
      return queryTokens.some((token) => alias.split(" ").some((part) => part.length >= 5 && fuzzySimilarity(token, part) >= 0.82));
    });
    if (activated) normalizedGroup.forEach((alias) => related.add(alias));
  }
  return [...related];
}

function fieldTokenScore(queryTokens: string[], value: string, language: SearchLanguage, exact: number, partial: number, fuzzy: number) {
  const valueTokens = tokenizeSearchText(value, language);
  let score = 0;
  const matched = new Set<string>();
  for (const queryToken of queryTokens) {
    if (valueTokens.includes(queryToken)) {
      score += exact;
      matched.add(queryToken);
      continue;
    }
    if (queryToken.length >= 4 && valueTokens.some((token) => token.startsWith(queryToken) || queryToken.startsWith(token))) {
      score += partial;
      matched.add(queryToken);
      continue;
    }
    if (queryToken.length >= 5 && valueTokens.some((token) => token.length >= 5 && fuzzySimilarity(queryToken, token) >= 0.78)) {
      score += fuzzy;
      matched.add(queryToken);
    }
  }
  return { score, matched: [...matched] };
}

export function scoreSearchDocument(query: string, document: SearchableDocument, language: SearchLanguage): SearchScore {
  const normalizedQuery = normalizeSearchText(query);
  const directTokens = tokenizeSearchText(query, language);
  if (!normalizedQuery || !directTokens.length) return { score: 0, matchedTerms: [] };

  const title = normalizeSearchText(document.title);
  const excerpt = normalizeSearchText(document.excerpt ?? "");
  const category = normalizeSearchText(document.category ?? "");
  const body = normalizeSearchText(document.body ?? "");
  const keywords = (document.keywords ?? []).map(normalizeSearchText).filter(Boolean);
  const matched = new Set<string>();
  let score = 0;

  if (title === normalizedQuery) { score += 1000; matched.add(normalizedQuery); }
  if (keywords.includes(normalizedQuery)) { score += 900; matched.add(normalizedQuery); }
  if (title !== normalizedQuery && title.includes(normalizedQuery)) { score += 800; matched.add(normalizedQuery); }
  if (!keywords.includes(normalizedQuery) && keywords.some((keyword) => keyword.includes(normalizedQuery))) { score += 700; matched.add(normalizedQuery); }
  if (excerpt.includes(normalizedQuery)) { score += 450; matched.add(normalizedQuery); }
  if (category.includes(normalizedQuery)) { score += 400; matched.add(normalizedQuery); }
  if (body.includes(normalizedQuery)) { score += 250; matched.add(normalizedQuery); }

  const fields = [
    fieldTokenScore(directTokens, title, language, 130, 90, 70),
    fieldTokenScore(directTokens, keywords.join(" "), language, 120, 80, 65),
    fieldTokenScore(directTokens, excerpt, language, 65, 42, 30),
    fieldTokenScore(directTokens, category, language, 55, 36, 25),
    fieldTokenScore(directTokens, body, language, 28, 18, 12),
  ];
  for (const result of fields) {
    score += result.score;
    result.matched.forEach((term) => matched.add(term));
  }

  for (const alias of relatedTerms(query, language)) {
    if (alias === normalizedQuery) continue;
    if (title.includes(alias)) { score += 190; matched.add(alias); }
    else if (keywords.some((keyword) => keyword.includes(alias) || alias.includes(keyword))) { score += 170; matched.add(alias); }
    else if (excerpt.includes(alias)) { score += 110; matched.add(alias); }
    else if (category.includes(alias)) { score += 90; matched.add(alias); }
    else if (body.includes(alias)) { score += 65; matched.add(alias); }
  }

  const coverage = directTokens.filter((token) => matched.has(token)).length / directTokens.length;
  if (coverage === 1) score += 90;
  else if (coverage >= 0.5) score += 35;
  if (document.language === language) score += 45;

  return { score: score >= 75 ? score : 0, matchedTerms: [...matched].sort((a, b) => b.length - a.length) };
}
