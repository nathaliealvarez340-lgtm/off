"use client";

import { Globe2 } from "lucide-react";
import { useState } from "react";
import { useOffLanguage } from "@/components/useOffLanguage";
import { LANGUAGE_OPTIONS, type UiLanguage } from "@/lib/ui-i18n";

export function LanguageSwitcher({ compact = false, label, initialLanguage }: { compact?: boolean; label?: string; initialLanguage?: string | null }) {
  const { language, setLanguage } = useOffLanguage(initialLanguage);
  const [open, setOpen] = useState(false);

  function choose(nextLanguage: UiLanguage) {
    setLanguage(nextLanguage);
    setOpen(false);
  }

  return (
    <div className={`global-language-switcher ${open ? "open" : ""} ${compact ? "compact" : ""}`}>
      <button aria-expanded={open} aria-label="Cambiar idioma" onClick={() => setOpen((value) => !value)} type="button">
        {label ? <span>{label}</span> : <Globe2 aria-hidden="true" />}
      </button>
      <div className="global-language-options">
        {LANGUAGE_OPTIONS.map((item) => (
          <button className={language === item.code ? "active" : ""} key={item.code} onClick={() => choose(item.code)} type="button">
            {item.code.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
