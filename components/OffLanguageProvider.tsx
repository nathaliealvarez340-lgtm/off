"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  persistClientLanguage,
  resolveClientLanguage,
} from "@/lib/language-preference";
import {
  normalizeUiLanguage,
  type UiLanguage,
} from "@/lib/ui-i18n";

type OffLanguageContextValue = {
  language: UiLanguage;
  setLanguage: (language: UiLanguage, syncAccount?: boolean) => void;
};

const OffLanguageContext = createContext<OffLanguageContextValue | null>(null);

export function OffLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<UiLanguage>("es");

  const setLanguage = useCallback(
    (nextLanguage: UiLanguage, syncAccount = true) => {
      setLanguageState(nextLanguage);
      persistClientLanguage(nextLanguage, syncAccount);
    },
    [],
  );

  useEffect(() => {
    const resolved = resolveClientLanguage();
    setLanguageState(resolved);
    persistClientLanguage(resolved, false);

    const syncFromEvent = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setLanguageState(
        detail ? normalizeUiLanguage(detail) : resolveClientLanguage(),
      );
    };
    const syncFromStorage = () => setLanguageState(resolveClientLanguage());

    window.addEventListener("off-language-change", syncFromEvent);
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener("off-language-change", syncFromEvent);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage }),
    [language, setLanguage],
  );

  return (
    <OffLanguageContext.Provider value={value}>
      {children}
    </OffLanguageContext.Provider>
  );
}

export function useOffLanguageContext() {
  const context = useContext(OffLanguageContext);
  if (!context) {
    throw new Error("useOffLanguage must be used inside OffLanguageProvider");
  }
  return context;
}
