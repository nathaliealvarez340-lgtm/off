"use client";

import { Globe2 } from "lucide-react";
import { useEffect, useState } from "react";
import { normalizeUiLanguage, uiCopy, type UiLanguage } from "@/lib/ui-i18n";

const languages = [
  { code: "es", label: "ES" },
  { code: "en", label: "EN" },
  { code: "it", label: "IT" },
  { code: "pt", label: "PT" },
] as const;

export function LanguageSwitcher({ compact = false, label }: { compact?: boolean; label?: string }) {
  const [language, setLanguage] = useState<UiLanguage>("es");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = normalizeUiLanguage(window.localStorage.getItem("off-language"));
    setLanguage(saved);
    document.documentElement.lang = saved;
    translateStaticLabels(saved);
  }, []);

  function translateStaticLabels(nextLanguage: UiLanguage) {
    document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n as keyof typeof uiCopy.es | undefined;
      if (key && uiCopy[nextLanguage][key]) element.textContent = uiCopy[nextLanguage][key];
    });
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-i18n-placeholder]").forEach((element) => {
      const key = element.dataset.i18nPlaceholder as keyof typeof uiCopy.es | undefined;
      if (key && uiCopy[nextLanguage][key]) element.placeholder = uiCopy[nextLanguage][key];
    });
    document.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((element) => {
      const key = element.dataset.i18nTitle as keyof typeof uiCopy.es | undefined;
      if (key && uiCopy[nextLanguage][key]) element.title = uiCopy[nextLanguage][key];
    });
    document.querySelectorAll<HTMLElement>("[data-i18n-aria-label]").forEach((element) => {
      const key = element.dataset.i18nAriaLabel as keyof typeof uiCopy.es | undefined;
      if (key && uiCopy[nextLanguage][key]) element.setAttribute("aria-label", uiCopy[nextLanguage][key]);
    });
  }

  function choose(value: string) {
    const nextLanguage = normalizeUiLanguage(value);
    window.localStorage.setItem("off-language", nextLanguage);
    document.cookie = `off-language=${nextLanguage}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = nextLanguage;
    translateStaticLabels(nextLanguage);
    window.dispatchEvent(new CustomEvent("off-language-change", { detail: nextLanguage }));
    setLanguage(nextLanguage);
    setOpen(false);
  }

  return (
    <div className={`global-language-switcher ${open ? "open" : ""} ${compact ? "compact" : ""}`}>
      <button aria-expanded={open} aria-label="Cambiar idioma" onClick={() => setOpen((value) => !value)} type="button">
        {label ? <span>{label}</span> : <Globe2 aria-hidden="true" />}
      </button>
      <div className="global-language-options">
        {languages.map((item) => (
          <button className={language === item.code ? "active" : ""} key={item.code} onClick={() => choose(item.code)} type="button">
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
