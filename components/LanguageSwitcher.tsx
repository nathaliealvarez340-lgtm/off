"use client";

import { Globe2 } from "lucide-react";
import { useEffect, useState } from "react";

const languages = [
  { code: "es", label: "ES" },
  { code: "en", label: "EN" },
  { code: "it", label: "IT" },
  { code: "pt", label: "PT" },
] as const;

export function LanguageSwitcher({ compact = false, label }: { compact?: boolean; label?: string }) {
  const [language, setLanguage] = useState("es");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("off-language") || "es";
    setLanguage(saved);
    document.documentElement.lang = saved;
  }, []);

  function choose(nextLanguage: string) {
    window.localStorage.setItem("off-language", nextLanguage);
    document.documentElement.lang = nextLanguage;
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
