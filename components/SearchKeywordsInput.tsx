"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { MAX_SEARCH_KEYWORDS, MAX_SEARCH_KEYWORD_LENGTH, normalizeSearchKeywords } from "@/lib/search-keywords";

export function SearchKeywordsInput({ initialKeywords = [], name = "keywords", onChange }: { initialKeywords?: string[]; name?: string; onChange?: (keywords: string[]) => void }) {
  const [keywords, setKeywords] = useState(() => normalizeSearchKeywords(initialKeywords));
  const [draft, setDraft] = useState("");
  const submittedKeywords = normalizeSearchKeywords([...keywords, ...draft.split(",")]);

  useEffect(() => { onChange?.(keywords); }, [keywords, onChange]);

  function commit(value: string) {
    setKeywords((current) => normalizeSearchKeywords([...current, ...value.split(",")]));
    setDraft("");
  }

  return (
    <div className="search-keywords-field">
      <div className="search-keywords-heading"><Search aria-hidden="true" /><span><strong>Búsqueda</strong><small>Palabras clave internas</small></span></div>
      <input name={name} type="hidden" value={JSON.stringify(submittedKeywords)} readOnly />
      <div className="search-keywords-tags">
        {keywords.map((keyword) => (
          <span key={keyword}>{keyword}<button type="button" onClick={() => setKeywords((current) => current.filter((item) => item !== keyword))} aria-label={`Eliminar ${keyword}`}><X /></button></span>
        ))}
        {keywords.length < MAX_SEARCH_KEYWORDS ? (
          <input
            value={draft}
            maxLength={MAX_SEARCH_KEYWORD_LENGTH}
            placeholder={keywords.length ? "Agregar..." : "comparación, presión, voy tarde"}
            onChange={(event) => {
              const value = event.target.value;
              if (value.includes(",")) commit(value);
              else setDraft(value);
            }}
            onBlur={() => { if (draft.trim()) commit(draft); }}
            onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); if (draft.trim()) commit(draft); }
              if (event.key === "Backspace" && !draft && keywords.length) setKeywords((current) => current.slice(0, -1));
            }}
          />
        ) : null}
      </div>
      <small className="search-keywords-help">Enter o coma para agregar · {keywords.length}/{MAX_SEARCH_KEYWORDS}</small>
    </div>
  );
}
