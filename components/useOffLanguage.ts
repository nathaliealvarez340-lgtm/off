"use client";

import { useEffect, useState } from "react";
import { persistClientLanguage, resolveClientLanguage } from "@/lib/language-preference";
import { normalizeUiLanguage, uiCopy, type UiCopyKey, type UiLanguage } from "@/lib/ui-i18n";

export function useOffLanguage(initialLanguage?: string | null) {
  const [language, setLanguage] = useState<UiLanguage>(() => normalizeUiLanguage(initialLanguage ?? null));

  useEffect(() => {
    function sync(next?: string) {
      setLanguage(next ? normalizeUiLanguage(next) : resolveClientLanguage(initialLanguage));
    }

    sync();
    persistClientLanguage(resolveClientLanguage(initialLanguage), false);
    const listener = (event: Event) => sync((event as CustomEvent<string>).detail);
    const storageListener = () => sync();
    window.addEventListener("off-language-change", listener);
    window.addEventListener("storage", storageListener);
    return () => {
      window.removeEventListener("off-language-change", listener);
      window.removeEventListener("storage", storageListener);
    };
  }, [initialLanguage]);

  function t(key: UiCopyKey) {
    return uiCopy[language][key] ?? uiCopy.es[key];
  }

  function updateLanguage(nextLanguage: UiLanguage) {
    setLanguage(nextLanguage);
    persistClientLanguage(nextLanguage);
  }

  return { language, setLanguage: updateLanguage, t };
}
