import type { UiLanguage } from "@/lib/ui-i18n";

export const OFF_THEMES = [
  "identity", "career", "money", "relationships", "friendships", "family", "decisions", "comparison",
  "autonomy", "expectations", "change", "fear", "purpose", "boundaries", "selfImage",
] as const;

export type OffThemeKey = (typeof OFF_THEMES)[number];

const labels: Record<UiLanguage, Record<OffThemeKey, string>> = {
  es: { identity: "Identidad", career: "Carrera", money: "Dinero", relationships: "Relaciones", friendships: "Amistades", family: "Familia", decisions: "Decisiones", comparison: "Comparación", autonomy: "Autonomía", expectations: "Expectativas", change: "Cambio", fear: "Miedo", purpose: "Propósito", boundaries: "Límites", selfImage: "Autoimagen" },
  en: { identity: "Identity", career: "Career", money: "Money", relationships: "Relationships", friendships: "Friendships", family: "Family", decisions: "Decisions", comparison: "Comparison", autonomy: "Autonomy", expectations: "Expectations", change: "Change", fear: "Fear", purpose: "Purpose", boundaries: "Boundaries", selfImage: "Self-image" },
  it: { identity: "Identità", career: "Carriera", money: "Denaro", relationships: "Relazioni", friendships: "Amicizie", family: "Famiglia", decisions: "Decisioni", comparison: "Confronto", autonomy: "Autonomia", expectations: "Aspettative", change: "Cambiamento", fear: "Paura", purpose: "Scopo", boundaries: "Limiti", selfImage: "Immagine di sé" },
  pt: { identity: "Identidade", career: "Carreira", money: "Dinheiro", relationships: "Relacionamentos", friendships: "Amizades", family: "Família", decisions: "Decisões", comparison: "Comparação", autonomy: "Autonomia", expectations: "Expectativas", change: "Mudança", fear: "Medo", purpose: "Propósito", boundaries: "Limites", selfImage: "Autoimagem" },
};

const aliases: Record<OffThemeKey, string[]> = {
  identity: ["identidad", "identity", "identità", "identidade"], career: ["carrera", "career", "carriera", "profesional"],
  money: ["dinero", "money", "denaro", "finanzas", "finance"], relationships: ["relaciones", "relationship", "relazioni", "relacionamento"],
  friendships: ["amistad", "friendship", "amicizia", "amizade"], family: ["familia", "family", "famiglia", "família"],
  decisions: ["decisión", "decision", "decisione", "decisão"], comparison: ["comparación", "comparison", "confronto", "comparação"],
  autonomy: ["autonomía", "autonomy", "autonomia"], expectations: ["expectativas", "expectation", "aspettative"],
  change: ["cambio", "change", "cambiamento", "mudança"], fear: ["miedo", "fear", "paura", "medo"],
  purpose: ["propósito", "purpose", "scopo", "propósito"], boundaries: ["límites", "boundaries", "limiti", "limites"],
  selfImage: ["autoimagen", "self-image", "immagine di sé", "autoimagem"],
};

export function themeLabel(theme: string, language: UiLanguage) {
  return labels[language][theme as OffThemeKey] ?? theme;
}

export function resolveThemeKeys(explicit: string[], ...searchable: Array<string | string[] | null | undefined>) {
  const valid = explicit.filter((theme): theme is OffThemeKey => OFF_THEMES.includes(theme as OffThemeKey));
  if (valid.length) return [...new Set(valid)];
  const haystack = searchable.flatMap((value) => Array.isArray(value) ? value : [value ?? ""]).join(" ").toLowerCase();
  return OFF_THEMES.filter((theme) => aliases[theme].some((alias) => haystack.includes(alias)));
}
