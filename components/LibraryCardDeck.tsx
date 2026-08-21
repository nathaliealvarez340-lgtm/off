"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { UiLanguage } from "@/lib/ui-i18n";

type LibraryItem = {
  id?: string;
  title: string;
  number: string | null;
  description: string | null;
  url?: string;
  image?: string | null;
  category?: string | null;
  date?: string | null;
  readTime?: string | null;
  cta?: string | null;
};

const fallbackImages = ["/images/cap1-off.webp", "/images/cap2-off.webp", "/images/cap3-off.webp"];

function normalizeImageUrl(value?: string | null, index = 0) {
  const clean = value?.trim();
  if (!clean) return fallbackImages[index % fallbackImages.length];
  if (clean.startsWith("public/")) return `/${clean.replace(/^public\//, "")}`;
  if (clean.startsWith("./public/")) return `/${clean.replace(/^\.\/public\//, "")}`;
  if (clean.startsWith("/")) return clean;
  if (/^https?:\/\//i.test(clean)) return clean;
  if (clean.startsWith("images/") || clean.startsWith("uploads/")) return `/${clean}`;
  return fallbackImages[index % fallbackImages.length];
}

function formatDate(value: string, language: UiLanguage) {
  const locales: Record<UiLanguage, string> = { es: "es-MX", en: "en-US", it: "it-IT", pt: "pt-BR" };
  return new Intl.DateTimeFormat(locales[language], { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function LibraryMetadata({ category, date, readTime, language = "es" }: {
  category?: string | null;
  date?: string | null;
  readTime?: string | null;
  language?: UiLanguage;
}) {
  const values = [category, date ? formatDate(date, language) : null, readTime].filter((value): value is string => Boolean(value));
  if (!values.length) return null;
  return <div className="library-carousel-meta">{values.map((value, index) => <span key={`${value}-${index}`}>{value}</span>)}</div>;
}

export function LibraryCardDeck({ items, language = "es" }: { items: LibraryItem[]; language?: UiLanguage }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeItems = useMemo(() => items.filter((item) => item.title), [items]);
  const active = safeItems[activeIndex] ?? safeItems[0];
  const hasMultipleItems = safeItems.length > 1;

  function move(direction: -1 | 1) {
    if (!hasMultipleItems) return;
    setActiveIndex((current) => (current + direction + safeItems.length) % safeItems.length);
  }

  if (!active) {
    return (
      <div className="library-carousel empty-library-carousel">
        <p>Aun no hay capitulos publicados en Biblioteca.</p>
      </div>
    );
  }

  const content = (
    <>
      <div className="library-carousel-image">
        <img src={normalizeImageUrl(active.image, activeIndex)} alt="" />
      </div>
      <div className="library-carousel-copy">
        <LibraryMetadata category={active.category ?? "Biblioteca"} date={active.date} readTime={active.readTime} language={language} />
        <h3>{active.title}</h3>
        {active.description ? <p>{active.description}</p> : null}
        <strong>{active.cta ?? "Abrir volumen"}</strong>
      </div>
    </>
  );

  return (
    <div className="library-carousel" aria-label="Biblioteca OFF">
      <div className="library-carousel-controls">
        <button type="button" onClick={() => move(-1)} aria-label="Anterior" disabled={!hasMultipleItems}>
          <ChevronLeft aria-hidden="true" />
        </button>
        <span>{activeIndex + 1} / {safeItems.length}</span>
        <button type="button" onClick={() => move(1)} aria-label="Siguiente" disabled={!hasMultipleItems}>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      {active.url ? (
        <motion.a
          className="library-carousel-card"
          href={active.url}
          key={active.id ?? active.title}
          initial={{ opacity: 0, transform: "translateY(10px) scale(0.985)" }}
          animate={{ opacity: 1, transform: "translateY(0) scale(1)" }}
          transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
        >
          {content}
        </motion.a>
      ) : (
        <motion.article
          className="library-carousel-card"
          key={active.id ?? active.title}
          initial={{ opacity: 0, transform: "translateY(10px) scale(0.985)" }}
          animate={{ opacity: 1, transform: "translateY(0) scale(1)" }}
          transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
        >
          {content}
        </motion.article>
      )}
    </div>
  );
}
