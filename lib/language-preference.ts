import { isUiLanguage, normalizeUiLanguage, uiCopy, type UiLanguage } from "@/lib/ui-i18n";

export const LANGUAGE_STORAGE_KEY = "off-language";
export const LANGUAGE_COOKIE_KEY = "off-language";

function readCookieLanguage(cookieValue: string): UiLanguage | null {
  const entry = cookieValue
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${LANGUAGE_COOKIE_KEY}=`));
  const value = entry?.slice(LANGUAGE_COOKIE_KEY.length + 1);
  return isUiLanguage(value) ? value : null;
}

export function browserLanguage(value?: string | null): UiLanguage {
  const primary = value?.toLowerCase().split("-")[0] ?? null;
  return normalizeUiLanguage(primary);
}

export function resolveClientLanguage(initialLanguage?: string | null): UiLanguage {
  if (isUiLanguage(initialLanguage)) return initialLanguage;
  if (typeof window === "undefined") return "es";

  const cookieLanguage = readCookieLanguage(document.cookie);
  if (cookieLanguage) return cookieLanguage;

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isUiLanguage(storedLanguage)) return storedLanguage;

  return browserLanguage(window.navigator.language);
}

export function translateStaticLabels(language: UiLanguage) {
  if (typeof document === "undefined") return;

  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n as keyof typeof uiCopy.es | undefined;
    if (key && uiCopy[language][key]) element.textContent = uiCopy[language][key];
  });
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder as keyof typeof uiCopy.es | undefined;
    if (key && uiCopy[language][key]) element.placeholder = uiCopy[language][key];
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((element) => {
    const key = element.dataset.i18nTitle as keyof typeof uiCopy.es | undefined;
    if (key && uiCopy[language][key]) element.title = uiCopy[language][key];
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-aria-label]").forEach((element) => {
    const key = element.dataset.i18nAriaLabel as keyof typeof uiCopy.es | undefined;
    if (key && uiCopy[language][key]) element.setAttribute("aria-label", uiCopy[language][key]);
  });
}

export function persistClientLanguage(language: UiLanguage, syncAccount = true) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  document.cookie = `${LANGUAGE_COOKIE_KEY}=${language}; path=/; max-age=31536000; SameSite=Lax`;
  document.documentElement.lang = language;
  translateStaticLabels(language);
  window.dispatchEvent(new CustomEvent("off-language-change", { detail: language }));

  if (syncAccount) {
    void fetch("/api/member/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language }),
    }).catch(() => undefined);
  }
}
