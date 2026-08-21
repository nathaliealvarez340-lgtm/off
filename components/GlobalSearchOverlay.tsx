"use client";

import { ArrowLeft, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GalleryCategory } from "@prisma/client";
import { GALLERY_CATEGORIES, GALLERY_CATEGORY_LABELS } from "@/lib/gallery";
import type { OffSearchResult } from "@/lib/off-search";
import type { UiLanguage } from "@/lib/ui-i18n";
import { useMobileCopy } from "@/mobile/mobileCopy";

type SearchResponse = { success: boolean; results?: OffSearchResult[]; error?: string };

const RESULT_LABELS = {
  es: { article: "Artículo", gallery: "Galería", library: "Biblioteca", signal: "Signal", resource: "Recurso", note: "Nota" },
  en: { article: "Article", gallery: "Gallery", library: "Library", signal: "Signal", resource: "Resource", note: "Note" },
  it: { article: "Articolo", gallery: "Galleria", library: "Biblioteca", signal: "Signal", resource: "Risorsa", note: "Nota" },
  pt: { article: "Artigo", gallery: "Galeria", library: "Biblioteca", signal: "Signal", resource: "Recurso", note: "Nota" },
} as const;

export function GlobalSearchOverlay({ initialLanguage = "es" }: { initialLanguage?: UiLanguage }) {
  const { copy, language } = useMobileCopy(initialLanguage);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<GalleryCategory | null>(null);
  const [results, setResults] = useState<OffSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  function close() {
    setOpen(false);
    setQuery("");
    setCategory(null);
    setResults([]);
    window.setTimeout(() => openerRef.current?.focus(), 0);
  }

  useEffect(() => {
    function handleOpen(event: Event) {
      openerRef.current = (event as CustomEvent<{ opener?: HTMLElement }>).detail?.opener ?? document.activeElement as HTMLElement;
      setOpen(true);
    }
    window.addEventListener("off-open-search", handleOpen);
    return () => window.removeEventListener("off-open-search", handleOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => inputRef.current?.focus(), 40);

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") return close();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || category || query.trim().length < 2) {
      if (!category) setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&lang=${language}`, { signal: controller.signal });
        const data = await response.json() as SearchResponse;
        if (!response.ok || !data.success) throw new Error(data.error || copy.searchError);
        setResults(data.results ?? []);
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError") setError(requestError instanceof Error ? requestError.message : copy.searchError);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [category, copy.searchError, language, open, query]);

  async function openCategory(nextCategory: GalleryCategory) {
    setCategory(nextCategory);
    setQuery("");
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/search?category=${nextCategory}`);
      const data = await response.json() as SearchResponse;
      if (!response.ok || !data.success) throw new Error(data.error || copy.searchError);
      setResults(data.results ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.searchError);
    } finally {
      setLoading(false);
    }
  }

  function selectResult(result: OffSearchResult) {
    if (result.galleryId) {
      close();
      window.setTimeout(() => window.dispatchEvent(new CustomEvent("off-open-gallery", { detail: { id: result.galleryId } })), 40);
      return;
    }
    if (result.href) window.location.assign(result.href);
  }

  if (!open) return null;
  const hasSearch = query.trim().length >= 2 || Boolean(category);

  return (
    <div className="off-search-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="off-search-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="off-search-title">
        <header>
          {category ? <button type="button" onClick={() => { setCategory(null); setResults([]); }} aria-label={copy.back}><ArrowLeft /></button> : <Search aria-hidden="true" />}
          <h2 id="off-search-title">{category ? GALLERY_CATEGORY_LABELS[category] : copy.search}</h2>
          <button type="button" onClick={close} aria-label={copy.close}><X /></button>
        </header>

        <div className="off-search-input-wrap">
          <Search aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => { setQuery(event.target.value.slice(0, 120)); setCategory(null); }}
            placeholder={copy.searchInOff}
            aria-label={copy.searchInOff}
          />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label={copy.clear}><X /></button> : null}
        </div>

        {!hasSearch ? (
          <section className="off-search-explore">
            <p>{copy.explore}</p>
            <div>
              {GALLERY_CATEGORIES.map((item) => (
                <button type="button" onClick={() => openCategory(item)} key={item}>{GALLERY_CATEGORY_LABELS[item]}</button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="off-search-results" aria-live="polite" aria-busy={loading}>
          {loading ? <div className="off-search-status">{copy.searching}</div> : null}
          {!loading && error ? <div className="off-search-status error">{error}</div> : null}
          {!loading && !error && hasSearch && !results.length ? (
            <div className="off-search-status"><strong>{copy.noResults}</strong><span>{copy.noResultsHelp}</span></div>
          ) : null}
          {!loading && !error ? results.map((result) => (
            <button className="off-search-result" type="button" onClick={() => selectResult(result)} key={`${result.type}-${result.id}`}>
              {result.thumbnail ? <img src={result.thumbnail} alt="" /> : <span className="off-search-result-mark">OFF</span>}
              <span>
                <small>{RESULT_LABELS[language][result.type]}{result.category ? ` · ${result.category}` : ""}</small>
                <strong>{result.title}</strong>
                {result.excerpt ? <em>{result.excerpt}</em> : null}
              </span>
            </button>
          )) : null}
        </section>
      </div>
    </div>
  );
}
