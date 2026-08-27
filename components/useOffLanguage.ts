"use client";

import { useEffect } from "react";
import { useOffLanguageContext } from "@/components/OffLanguageProvider";
import { normalizeUiLanguage, uiCopy, type UiCopyKey, type UiLanguage } from "@/lib/ui-i18n";

export function useOffLanguage(initialLanguage?: string | null) {
  const { language, setLanguage } = useOffLanguageContext();

  useEffect(() => {
    if (initialLanguage) {
      setLanguage(normalizeUiLanguage(initialLanguage), false);
    }
  }, [initialLanguage, setLanguage]);

  function t(key: UiCopyKey) {
    return uiCopy[language][key] ?? uiCopy.es[key];
  }

  function updateLanguage(nextLanguage: UiLanguage) {
    setLanguage(nextLanguage, true);
  }

  return { language, setLanguage: updateLanguage, t };
}
