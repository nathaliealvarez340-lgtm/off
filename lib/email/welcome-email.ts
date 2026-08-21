import { readFile } from "node:fs/promises";
import path from "node:path";
import { isUiLanguage, type UiLanguage } from "../ui-i18n";

export const WELCOME_EMAIL_TEMPLATES: Record<UiLanguage, string> = {
  es: "off-welcome-es.html",
  en: "off-welcome-en.html",
  it: "off-welcome-it.html",
  pt: "off-welcome-pt.html",
};

export const WELCOME_EMAIL_SUBJECTS: Record<UiLanguage, string> = {
  es: "Tu acceso a OFF está listo",
  en: "Your OFF access is ready",
  it: "Il tuo accesso a OFF è pronto",
  pt: "Seu acesso ao OFF está pronto",
};

const templateCache = new Map<UiLanguage, Promise<string>>();

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

function normalizeWelcomeLanguage(language?: string | null): UiLanguage {
  return isUiLanguage(language) ? language : "es";
}

function loadWelcomeTemplate(language: UiLanguage) {
  const cachedTemplate = templateCache.get(language);
  if (cachedTemplate) return cachedTemplate;

  const templatePath = path.join(process.cwd(), "lib", "email", WELCOME_EMAIL_TEMPLATES[language]);
  const template = readFile(templatePath, "utf8");
  templateCache.set(language, template);
  return template;
}

export async function renderWelcomeEmail({
  name,
  accessCode,
  language,
}: {
  name: string;
  accessCode: string;
  language?: string | null;
}) {
  if (!/^\d{4}$/.test(accessCode)) {
    throw new Error("WELCOME_EMAIL_INVALID_ACCESS_CODE");
  }

  const normalizedLanguage = normalizeWelcomeLanguage(language);
  const template = await loadWelcomeTemplate(normalizedLanguage);
  const html = template
    .replaceAll("{{name}}", escapeHtml(name))
    .replaceAll("{{off_code}}", accessCode);

  if (html.includes("{{name}}") || html.includes("{{off_code}}")) {
    throw new Error("WELCOME_EMAIL_TEMPLATE_RENDER_FAILED");
  }

  return {
    html,
    language: normalizedLanguage,
    subject: WELCOME_EMAIL_SUBJECTS[normalizedLanguage],
  };
}
