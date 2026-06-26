"use client";

import { useEffect, useState } from "react";
import { normalizeUiLanguage, uiCopy, type UiCopyKey, type UiLanguage } from "@/lib/ui-i18n";

export function useOffLanguage() {
  const [language, setLanguage] = useState<UiLanguage>("es");

  useEffect(() => {
    function sync(next?: string) {
      setLanguage(normalizeUiLanguage(next ?? window.localStorage.getItem("off-language")));
    }

    sync();
    const listener = (event: Event) => sync((event as CustomEvent<string>).detail);
    const storageListener = () => sync();
    window.addEventListener("off-language-change", listener);
    window.addEventListener("storage", storageListener);
    return () => {
      window.removeEventListener("off-language-change", listener);
      window.removeEventListener("storage", storageListener);
    };
  }, []);

  function t(key: UiCopyKey) {
    return uiCopy[language][key] ?? uiCopy.es[key];
  }

  return { language, t };
}
